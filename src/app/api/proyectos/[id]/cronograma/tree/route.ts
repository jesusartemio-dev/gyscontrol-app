// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/tree/route.ts
// 🔧 Descripción: API para árbol jerárquico del cronograma de proyectos
// 🎯 Funcionalidades: Vista de árbol completa del cronograma
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-10-27
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { contarDiasLaborables } from '@/lib/utils/calendarioLaboral'
import { clasificarRelacion, diferenciaDiasLaborables, inicioDiaUTC } from '@/lib/services/cronogramaDesplazamiento'
import { type CalendarioHoras, formatearDuracion, horasLaborablesEntre, horasPorDiaCalendario } from '@/lib/services/cronogramaHoras'
import { horasIncumplidas, horasHolgura, formatearDesfase, ABREVIATURA_DEPENDENCIA, type TipoDependencia } from '@/lib/services/cronogramaDependencias'
import { calcularHHRealDeTarea } from '@/lib/planTrabajo/calcularDatos'

// ✅ GET /api/proyectos/[id]/cronograma/tree - Obtener árbol jerárquico del cronograma
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const expandedNodes = searchParams.get('expandedNodes')?.split(',') || []
    const includeProgress = searchParams.get('includeProgress') === 'true'
    const maxDepth = parseInt(searchParams.get('maxDepth') || '6')
    const cronogramaId = searchParams.get('cronogramaId')

    console.log('🔍 [TREE API] Expanded nodes received:', expandedNodes)

    // ✅ Validar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, nombre: true, fechaInicio: true, fechaFin: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Calendario laboral real del proyecto (para DUR — nunca Lun-Vie hardcodeado)
    const configCalendario = await prisma.configuracionCalendario.findFirst({
      where: { entidadTipo: 'proyecto', entidadId: id },
      include: { calendarioLaboral: { include: { diaCalendario: true, excepcionCalendario: true } } }
    })
    const calendarioLaboral =
      configCalendario?.calendarioLaboral ||
      (await prisma.calendarioLaboral.findFirst({
        where: { activo: true },
        orderBy: { createdAt: 'asc' },
        include: { diaCalendario: true, excepcionCalendario: true }
      }))

    const duracionDiasReal = (fechaInicio: Date | string | null, fechaFin: Date | string | null): number => {
      if (!fechaInicio || !fechaFin || !calendarioLaboral) return 0
      return contarDiasLaborables(new Date(fechaInicio), new Date(fechaFin), calendarioLaboral)
    }

    // Hito (Milestone de MS Project): duración 0. Con fecha límite, cuántos días
    // laborables la pasa (0 si va a tiempo) — el árbol y el Gantt lo marcan en rojo.
    const datosHito = (tarea: { esHito: boolean; fechaLimite: Date | null; fechaFin: Date }) => {
      if (!tarea.esHito) return { esHito: false }
      const diasPasadoLimite =
        tarea.fechaLimite && calendarioLaboral && inicioDiaUTC(tarea.fechaFin) > inicioDiaUTC(tarea.fechaLimite)
          ? diferenciaDiasLaborables(calendarioLaboral, tarea.fechaLimite, tarea.fechaFin)
          : 0
      return { esHito: true, fechaLimite: tarea.fechaLimite, diasPasadoLimite, duracionDiasReal: 0 }
    }

    // ✅ HH real = horasEstimadas × personas del recurso (nunca personasEstimadas,
    // que es un snapshot manual casi siempre en 1 — ver calcularHHRealDeTarea,
    // misma fuente que usa Plan de Trabajo). "WORK" ya existe (horasEstimadas
    // crudo, sin multiplicar); esto es la columna "HH" nueva.
    // Redondea a 1 decimal — sumar muchas horas con decimales (0.1 + 0.2
    // style) o convertir Decimal de Prisma con Number() deja artefactos de
    // punto flotante tipo 26.599999999999998. Se aplica tanto al leaf
    // (hhDeTarea) como a cada suma agregada hacia arriba en el árbol, porque
    // el error puede reaparecer al sumar varios valores ya redondeados.
    const round1 = (n: number): number => Math.round(n * 10) / 10
    const hhDeTarea = (tarea: any): number =>
      round1(calcularHHRealDeTarea({ horasEstimadas: Number(tarea.horasEstimadas) || 0, recurso: tarea.recurso }))
    const hhDeEdt = (edt: any): number => {
      const tareasDeActividades = (edt.proyectoActividad || []).flatMap((a: any) => a.proyectoTarea || [])
      const tareasExtras = edt.proyectoTarea || []
      return round1([...tareasDeActividades, ...tareasExtras].reduce((s: number, t: any) => s + hhDeTarea(t), 0))
    }

    // ✅ Obtener fases del proyecto según el cronograma especificado

    let fases: any[] = []

    if (cronogramaId) {
      // Si se especifica un cronogramaId, obtener fases solo de ese cronograma
      console.log('🔍 [TREE API] Loading tree for specific cronograma:', cronogramaId)

      // Verificar que el cronograma existe
      const cronogramaExists = await prisma.proyectoCronograma.findUnique({
        where: { id: cronogramaId },
        select: { id: true, tipo: true, nombre: true, esBaseline: true }
      })

      if (!cronogramaExists) {
        console.log('❌ [TREE API] Cronograma not found:', cronogramaId)
        return NextResponse.json(
          { error: 'Cronograma no encontrado' },
          { status: 404 }
        )
      }

      console.log('✅ [TREE API] Cronograma found:', cronogramaExists)

      fases = await prisma.proyectoFase.findMany({
        where: {
          proyectoId: id,
          proyectoCronogramaId: cronogramaId
        },
        include: {
          proyectoEdt: {
            include: {
              user: {
                select: { id: true, name: true, email: true }
              },
              edt: {
                select: { id: true, nombre: true, descripcion: true }
              },
              proyectoActividad: {
                include: {
                  user: {
                    select: { id: true, name: true, email: true }
                  },
                  proyectoTarea: {
                    include: {
                      user: {
                        select: { id: true, name: true, email: true }
                      },
                      recurso: {
                        select: { id: true, nombre: true, tipo: true, costoHoraProyecto: true, perfiles: { where: { activo: true }, select: { cantidad: true } } }
                      },
                      creadoPor: { select: { id: true, name: true } }
                    },
                    orderBy: { orden: 'asc' }
                  }
                },
                orderBy: { orden: 'asc' }
              },
              // Tareas extras (sin actividad) — se agrupan aparte bajo cada EDT
              proyectoTarea: {
                where: { proyectoActividadId: null },
                include: {
                  user: { select: { id: true, name: true, email: true } },
                  recurso: { select: { id: true, nombre: true, tipo: true, costoHoraProyecto: true, perfiles: { where: { activo: true }, select: { cantidad: true } } } },
                  creadoPor: { select: { id: true, name: true } }
                },
                orderBy: { orden: 'asc' }
              }
            },
            orderBy: { orden: 'asc' }
          }
        },
        orderBy: { orden: 'asc' }
      })

      console.log('📊 [TREE API] Fases found for cronograma:', fases.length)
    } else {
      // Fallback: si no hay cronogramaId, elegir por prioridad igual que la UI
      // (ejecucion > planificacion baseline > cualquiera) para que el default
      // coincida con lo que el usuario espera ver.
      console.log('🔍 [TREE API] No cronogramaId specified, picking default by priority (ejecucion > planificacion baseline > any)')

      const fallbackCronograma =
        (await prisma.proyectoCronograma.findFirst({
          where: { proyectoId: id, tipo: 'ejecucion' }
        })) ||
        (await prisma.proyectoCronograma.findFirst({
          where: { proyectoId: id, tipo: 'planificacion', esBaseline: true }
        })) ||
        (await prisma.proyectoCronograma.findFirst({
          where: { proyectoId: id }
        }))

      if (fallbackCronograma) {
        console.log('✅ [TREE API] Fallback cronograma seleccionado:', { id: fallbackCronograma.id, tipo: fallbackCronograma.tipo })
        fases = await prisma.proyectoFase.findMany({
          where: {
            proyectoId: id,
            proyectoCronogramaId: fallbackCronograma.id
          },
          include: {
            proyectoEdt: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                },
                edt: {
                  select: { id: true, nombre: true, descripcion: true }
                },
                proyectoActividad: {
                  include: {
                    user: {
                      select: { id: true, name: true, email: true }
                    },
                    proyectoTarea: {
                      include: {
                        user: {
                          select: { id: true, name: true, email: true }
                        },
                        recurso: {
                          select: { id: true, nombre: true, tipo: true, costoHoraProyecto: true, perfiles: { where: { activo: true }, select: { cantidad: true } } }
                        }
                      },
                      orderBy: { orden: 'asc' }
                    }
                  },
                  orderBy: { orden: 'asc' }
                },
                // Tareas extras (sin actividad) — se agrupan aparte bajo cada EDT
                proyectoTarea: {
                  where: { proyectoActividadId: null },
                  include: {
                    user: { select: { id: true, name: true, email: true } },
                    recurso: { select: { id: true, nombre: true, tipo: true, costoHoraProyecto: true, perfiles: { where: { activo: true }, select: { cantidad: true } } } }
                  },
                  orderBy: { orden: 'asc' }
                }
              },
              orderBy: { orden: 'asc' }
            }
          },
          orderBy: { orden: 'asc' }
        })
      } else {
        // Último fallback: mostrar todas las fases del proyecto
        console.log('🔍 [TREE API] No baseline planificacion found, showing all fases')
        fases = await prisma.proyectoFase.findMany({
          where: { proyectoId: id },
          include: {
            proyectoEdt: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                },
                edt: {
                  select: { id: true, nombre: true, descripcion: true }
                },
                proyectoActividad: {
                  include: {
                    user: {
                      select: { id: true, name: true, email: true }
                    },
                    proyectoTarea: {
                      include: {
                        user: {
                          select: { id: true, name: true, email: true }
                        },
                        recurso: {
                          select: { id: true, nombre: true, tipo: true, costoHoraProyecto: true, perfiles: { where: { activo: true }, select: { cantidad: true } } }
                        }
                      },
                      orderBy: { orden: 'asc' }
                    }
                  },
                  orderBy: { orden: 'asc' }
                },
                // Tareas extras (sin actividad) — se agrupan aparte bajo cada EDT
                proyectoTarea: {
                  where: { proyectoActividadId: null },
                  include: {
                    user: { select: { id: true, name: true, email: true } },
                    recurso: { select: { id: true, nombre: true, tipo: true, costoHoraProyecto: true, perfiles: { where: { activo: true }, select: { cantidad: true } } } }
                  },
                  orderBy: { orden: 'asc' }
                }
              },
              orderBy: { orden: 'asc' }
            }
          },
          orderBy: { orden: 'asc' }
        })
      }
    }

    // ✅ Construir árbol jerárquico de 5 niveles (Proyecto → Fase → EDT → Actividad → Tarea)
    // Calcular horas totales del proyecto
    let proyectoHorasTotales = 0
    let proyectoHorasHombre = 0

    const faseNodes = fases.map(fase => {
      const faseEdts = fase.proyectoEdt || []

      // Calcular horas totales de la fase (suma de horas de todos los EDTs)
      const faseHorasTotales = round1(faseEdts.reduce((sum: number, edt: any) => sum + Number(edt.horasPlan || 0), 0))
      proyectoHorasTotales += faseHorasTotales
      const faseHorasHombre = round1(faseEdts.reduce((sum: number, edt: any) => sum + hhDeEdt(edt), 0))
      proyectoHorasHombre += faseHorasHombre

      return {
        id: `fase-${fase.id}`,
        type: 'fase',
        nombre: fase.nombre,
        level: 1, // ✅ Fases son nivel 1
        expanded: expandedNodes.includes(`fase-${fase.id}`),
        data: {
          descripcion: fase.descripcion,
          fechaInicioComercial: fase.fechaInicioPlan,
          fechaFinComercial: fase.fechaFinPlan,
          fechaInicioReal: fase.fechaInicioReal,
          fechaFinReal: fase.fechaFinReal,
          estado: fase.estado,
          progreso: fase.porcentajeAvance,
          orden: fase.orden,
          horasEstimadas: faseHorasTotales, // ✅ Agregar horas totales calculadas
          horasHombre: faseHorasHombre,
          duracionDiasReal: duracionDiasReal(fase.fechaInicioPlan, fase.fechaFinPlan)
        },
        metadata: {
          hasChildren: faseEdts.length > 0,
          totalChildren: faseEdts.length,
          progressPercentage: fase.porcentajeAvance || 0,
          status: fase.estado || 'pendiente'
        },
        children: faseEdts
          .sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0))
          .map((edt: any) => {
            const edtActividades = edt.proyectoActividad || []
            const edtExtras = edt.proyectoTarea || []
            const edtExtrasGroupCount = edtExtras.length > 0 ? 1 : 0

          return {
            id: `edt-${edt.id}`,
            type: 'edt',
            nombre: edt.nombre,
            level: 2, // ✅ EDTs son nivel 2
            expanded: expandedNodes.includes(`edt-${edt.id}`),
            data: {
              descripcion: edt.descripcion,
              edtId: edt.edtId,
              catalogoEdtCodigo: edt.edt?.nombre || null,
              catalogoEdtDescripcion: edt.edt?.descripcion || null,
              fechaInicioComercial: edt.fechaInicioPlan,
              fechaFinComercial: edt.fechaFinPlan,
              fechaInicioReal: edt.fechaInicioReal,
              fechaFinReal: edt.fechaFinReal,
              estado: edt.estado,
              progreso: edt.porcentajeAvance,
              orden: edt.orden,
              horasEstimadas: edt.horasPlan,
              horasHombre: hhDeEdt(edt),
              responsableId: edt.responsableId,
              responsableNombre: edt.user?.name || null,
              duracionDiasReal: duracionDiasReal(edt.fechaInicioPlan, edt.fechaFinPlan)
            },
            metadata: {
              hasChildren: edtActividades.length > 0 || edtExtras.length > 0,
              totalChildren: edtActividades.length + edtExtrasGroupCount,
              progressPercentage: edt.porcentajeAvance || 0,
              status: edt.estado || 'pendiente'
            },
            children: edtActividades
              .sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0))
              .map((actividad: any) => {
                const actividadTareas = actividad.proyectoTarea || []

              return {
                id: `actividad-${actividad.id}`,
                type: 'actividad',
                nombre: actividad.nombre,
                level: 3, // ✅ Actividades son nivel 3
                expanded: expandedNodes.includes(`actividad-${actividad.id}`),
                data: {
                  descripcion: actividad.descripcion,
                  fechaInicioComercial: actividad.fechaInicioPlan,
                  fechaFinComercial: actividad.fechaFinPlan,
                  fechaInicioReal: actividad.fechaInicioReal,
                  fechaFinReal: actividad.fechaFinReal,
                  estado: actividad.estado,
                  progreso: actividad.porcentajeAvance,
                  horasEstimadas: actividad.horasPlan,
                  horasHombre: round1(actividadTareas.reduce((s: number, t: any) => s + hhDeTarea(t), 0)),
                  horasReales: actividad.horasReales,
                  prioridad: actividad.prioridad,
                  orden: actividad.orden,
                  responsableId: actividad.responsableId,
                  responsableNombre: actividad.user?.name || null,
                  duracionDiasReal: duracionDiasReal(actividad.fechaInicioPlan, actividad.fechaFinPlan)
                },
                metadata: {
                  hasChildren: actividadTareas.length > 0,
                  totalChildren: actividadTareas.length,
                  progressPercentage: actividad.porcentajeAvance || 0,
                  status: actividad.estado || 'pendiente'
                },
                children: actividadTareas
                  .sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0))
                  .map((tarea: any) => ({
                    id: `tarea-${tarea.id}`,
                    type: 'tarea',
                    nombre: tarea.nombre,
                    level: 4, // ✅ Tareas son nivel 4
                    expanded: false,
                    data: {
                      descripcion: tarea.descripcion,
                      fechaInicio: tarea.fechaInicio,
                      fechaFin: tarea.fechaFin,
                      fechaInicioReal: tarea.fechaInicioReal,
                      fechaFinReal: tarea.fechaFinReal,
                      estado: tarea.estado,
                      progreso: tarea.porcentajeCompletado,
                      horasEstimadas: tarea.horasEstimadas,
                      horasHombre: hhDeTarea(tarea),
                      horasReales: tarea.horasReales,
                      personasEstimadas: tarea.personasEstimadas || 1,
                      prioridad: tarea.prioridad,
                      orden: tarea.orden,
                      responsable: tarea.user,
                      responsableId: tarea.responsableId,
                      responsableNombre: tarea.user?.name || null,
                      recursoId: tarea.recursoId,
                      recursoNombre: tarea.recurso?.nombre,
                      recursoTipo: tarea.recurso?.tipo,
                      esExtra: tarea.esExtra || false,
                      esPropuestaIA: tarea.esPropuestaIA || false,
                      justificacionIA: tarea.justificacionIA || null,
                      creadoPorId: tarea.creadoPorId,
                      creadoPorNombre: (tarea as any).creadoPor?.name || null,
                      duracionDiasReal: duracionDiasReal(tarea.fechaInicio, tarea.fechaFin),
                      ...datosHito(tarea),
                    },
                    metadata: {
                      hasChildren: false,
                      totalChildren: 0,
                      progressPercentage: tarea.porcentajeCompletado || 0,
                      status: tarea.estado || 'pendiente',
                      recursosTotales: 1,
                      recursosAsignados: tarea.recursoId ? 1 : 0,
                      recursosExtrasTotales: 0,
                      recursosExtrasAsignados: 0,
                      responsablesTotales: 1,
                      responsablesAsignados: tarea.responsableId ? 1 : 0,
                      responsablesExtrasTotales: 0,
                      responsablesExtrasAsignados: 0
                    },
                    children: []
                  }))
              }
            })
            // 🆕 Agregar pseudo-actividad "Tareas Extras" si el EDT tiene tareas sin actividad
            .concat(
              (edt.proyectoTarea || []).length > 0
                ? [{
                    id: `extras-group-${edt.id}`,
                    type: 'actividad',
                    nombre: 'Tareas Extras',
                    level: 3,
                    expanded: expandedNodes.includes(`extras-group-${edt.id}`),
                    data: {
                      isExtrasGroup: true,
                      orden: 9999,
                      horasEstimadas: round1((edt.proyectoTarea || []).reduce((s: number, t: any) => s + Number(t.horasEstimadas || 0), 0)),
                      horasHombre: round1((edt.proyectoTarea || []).reduce((s: number, t: any) => s + hhDeTarea(t), 0)),
                      horasReales: round1((edt.proyectoTarea || []).reduce((s: number, t: any) => s + Number(t.horasReales || 0), 0)),
                      estado: 'en_progreso',
                    },
                    metadata: {
                      hasChildren: edt.proyectoTarea.length > 0,
                      totalChildren: edt.proyectoTarea.length,
                      // Antes iba fijo en 0: el grupo mostraba 0% aunque sus tareas
                      // estuvieran al 100%. Se pondera por horas-hombre, igual que el resto
                      // del árbol; si no hay horas, promedio simple para no perder la señal.
                      progressPercentage: (() => {
                        const ts = edt.proyectoTarea || []
                        if (ts.length === 0) return 0
                        const h = ts.reduce((s: number, t: any) => s + hhDeTarea(t), 0)
                        if (h > 0) {
                          return Math.round(
                            ts.reduce((s: number, t: any) => s + (t.porcentajeCompletado || 0) * hhDeTarea(t), 0) / h,
                          )
                        }
                        return Math.round(
                          ts.reduce((s: number, t: any) => s + (t.porcentajeCompletado || 0), 0) / ts.length,
                        )
                      })(),
                      status: 'en_progreso',
                    },
                    children: edt.proyectoTarea
                      .sort((a: any, b: any) => (a.orden || 0) - (b.orden || 0))
                      .map((tarea: any) => ({
                        id: `tarea-${tarea.id}`,
                        type: 'tarea',
                        nombre: tarea.nombre,
                        level: 4,
                        expanded: false,
                        data: {
                          descripcion: tarea.descripcion,
                          fechaInicio: tarea.fechaInicio,
                          fechaFin: tarea.fechaFin,
                          fechaInicioReal: tarea.fechaInicioReal,
                          fechaFinReal: tarea.fechaFinReal,
                          estado: tarea.estado,
                          progreso: tarea.porcentajeCompletado,
                          horasEstimadas: tarea.horasEstimadas,
                          horasHombre: hhDeTarea(tarea),
                          horasReales: tarea.horasReales,
                          personasEstimadas: tarea.personasEstimadas || 1,
                          prioridad: tarea.prioridad,
                          orden: tarea.orden,
                          responsable: tarea.user,
                          responsableId: tarea.responsableId,
                          responsableNombre: tarea.user?.name || null,
                          recursoId: tarea.recursoId,
                          recursoNombre: tarea.recurso?.nombre,
                          recursoTipo: tarea.recurso?.tipo,
                          esExtra: true,
                          creadoPorId: tarea.creadoPorId,
                          creadoPorNombre: (tarea as any).creadoPor?.name || null,
                          duracionDiasReal: duracionDiasReal(tarea.fechaInicio, tarea.fechaFin)
                        },
                        metadata: {
                          hasChildren: false,
                          totalChildren: 0,
                          progressPercentage: tarea.porcentajeCompletado || 0,
                          status: tarea.estado || 'pendiente',
                          // Las tareas extras cuentan en el subset de extras, no en el plan
                          recursosTotales: 1,
                          recursosAsignados: tarea.recursoId ? 1 : 0,
                          recursosExtrasTotales: 1,
                          recursosExtrasAsignados: tarea.recursoId ? 1 : 0,
                          responsablesTotales: 1,
                          responsablesAsignados: tarea.responsableId ? 1 : 0,
                          responsablesExtrasTotales: 1,
                          responsablesExtrasAsignados: tarea.responsableId ? 1 : 0
                        },
                        children: []
                      }))
                  }]
                : []
            )
          }
        })
      }
    })

    // ✅ Propagar conteo de recursos de abajo hacia arriba (incluye subset de extras)
    const propagateResources = (node: any): { total: number; assigned: number; extrasTotal: number; extrasAssigned: number } => {
      if (!node.children || node.children.length === 0) {
        return {
          total: node.metadata.recursosTotales || 0,
          assigned: node.metadata.recursosAsignados || 0,
          extrasTotal: node.metadata.recursosExtrasTotales || 0,
          extrasAssigned: node.metadata.recursosExtrasAsignados || 0
        }
      }
      let total = 0, assigned = 0, extrasTotal = 0, extrasAssigned = 0
      for (const child of node.children) {
        const childRes = propagateResources(child)
        total += childRes.total
        assigned += childRes.assigned
        extrasTotal += childRes.extrasTotal
        extrasAssigned += childRes.extrasAssigned
      }
      node.metadata.recursosTotales = total
      node.metadata.recursosAsignados = assigned
      node.metadata.recursosExtrasTotales = extrasTotal
      node.metadata.recursosExtrasAsignados = extrasAssigned
      return { total, assigned, extrasTotal, extrasAssigned }
    }

    for (const fase of faseNodes) {
      propagateResources(fase)
    }

    // ✅ Propagar conteo de responsables de abajo hacia arriba (incluye subset de extras)
    const propagateResponsables = (node: any): { total: number; assigned: number; extrasTotal: number; extrasAssigned: number } => {
      if (!node.children || node.children.length === 0) {
        return {
          total: node.metadata.responsablesTotales || 0,
          assigned: node.metadata.responsablesAsignados || 0,
          extrasTotal: node.metadata.responsablesExtrasTotales || 0,
          extrasAssigned: node.metadata.responsablesExtrasAsignados || 0
        }
      }
      let total = 0, assigned = 0, extrasTotal = 0, extrasAssigned = 0
      for (const child of node.children) {
        const childRes = propagateResponsables(child)
        total += childRes.total
        assigned += childRes.assigned
        extrasTotal += childRes.extrasTotal
        extrasAssigned += childRes.extrasAssigned
      }
      node.metadata.responsablesTotales = total
      node.metadata.responsablesAsignados = assigned
      node.metadata.responsablesExtrasTotales = extrasTotal
      node.metadata.responsablesExtrasAsignados = extrasAssigned
      return { total, assigned, extrasTotal, extrasAssigned }
    }

    for (const fase of faseNodes) {
      propagateResponsables(fase)
    }

    // ✅ Nodo raíz del proyecto (nivel 0) - envuelve todas las fases
    const proyectoRecursos = faseNodes.reduce(
      (acc: any, f: any) => ({
        total: acc.total + (f.metadata.recursosTotales || 0),
        assigned: acc.assigned + (f.metadata.recursosAsignados || 0),
        extrasTotal: acc.extrasTotal + (f.metadata.recursosExtrasTotales || 0),
        extrasAssigned: acc.extrasAssigned + (f.metadata.recursosExtrasAsignados || 0)
      }),
      { total: 0, assigned: 0, extrasTotal: 0, extrasAssigned: 0 }
    )

    const proyectoResponsables = faseNodes.reduce(
      (acc: any, f: any) => ({
        total: acc.total + (f.metadata.responsablesTotales || 0),
        assigned: acc.assigned + (f.metadata.responsablesAsignados || 0),
        extrasTotal: acc.extrasTotal + (f.metadata.responsablesExtrasTotales || 0),
        extrasAssigned: acc.extrasAssigned + (f.metadata.responsablesExtrasAsignados || 0)
      }),
      { total: 0, assigned: 0, extrasTotal: 0, extrasAssigned: 0 }
    )

    // Progreso del proyecto = promedio ponderado por horas del avance de sus fases.
    const totalHorasFases = faseNodes.reduce((s: number, f: any) => s + (Number(f.data?.horasEstimadas) || 0), 0)
    const proyectoProgress = totalHorasFases > 0
      ? Math.round(faseNodes.reduce((s: number, f: any) => s + (f.metadata?.progressPercentage || 0) * (Number(f.data?.horasEstimadas) || 0), 0) / totalHorasFases)
      : (faseNodes.length > 0 ? Math.round(faseNodes.reduce((s: number, f: any) => s + (f.metadata?.progressPercentage || 0), 0) / faseNodes.length) : 0)

    // Fechas del nodo proyecto = las de su cronograma (mín. inicio / máx. fin de
    // las fases), como la tarea resumen del proyecto en MS Project y como el
    // Gantt. Las fechas del registro del proyecto (contractuales) solo si aún no
    // hay fases con fechas.
    const fechasFases = faseNodes
      .map((f: any) => ({
        inicio: f.data?.fechaInicio ?? f.data?.fechaInicioComercial ?? f.data?.fechaInicioPlan,
        fin: f.data?.fechaFin ?? f.data?.fechaFinComercial ?? f.data?.fechaFinPlan,
      }))
      .filter((f: { inicio?: Date | string; fin?: Date | string }) => f.inicio && f.fin)
      .map((f: { inicio: Date | string; fin: Date | string }) => ({ inicio: new Date(f.inicio).getTime(), fin: new Date(f.fin).getTime() }))
    const proyectoInicio = fechasFases.length ? new Date(Math.min(...fechasFases.map((f: { inicio: number }) => f.inicio))) : proyecto.fechaInicio
    const proyectoFin = fechasFases.length ? new Date(Math.max(...fechasFases.map((f: { fin: number }) => f.fin))) : proyecto.fechaFin

    const projectNode = {
      id: `proyecto-${id}`,
      type: 'proyecto',
      nombre: proyecto.nombre,
      level: 0,
      expanded: true, // Siempre expandido por defecto
      data: {
        fechaInicioComercial: proyectoInicio,
        fechaFinComercial: proyectoFin,
        horasEstimadas: round1(proyectoHorasTotales),
        horasHombre: round1(proyectoHorasHombre),
        duracionDiasReal: duracionDiasReal(proyectoInicio, proyectoFin)
      },
      metadata: {
        hasChildren: faseNodes.length > 0,
        totalChildren: faseNodes.length,
        progressPercentage: proyectoProgress,
        status: 'pendiente',
        recursosTotales: proyectoRecursos.total,
        recursosAsignados: proyectoRecursos.assigned,
        recursosExtrasTotales: proyectoRecursos.extrasTotal,
        recursosExtrasAsignados: proyectoRecursos.extrasAssigned,
        responsablesTotales: proyectoResponsables.total,
        responsablesAsignados: proyectoResponsables.assigned,
        responsablesExtrasTotales: proyectoResponsables.extrasTotal,
        responsablesExtrasAsignados: proyectoResponsables.extrasAssigned
      },
      children: faseNodes,
    }

    // Relación de cada EDT/actividad/tarea con el hermano de arriba (→ ∥ ⤚ +Nd),
    // deducida de las fechas con el calendario del proyecto. Solo informativa.
    if (calendarioLaboral) {
      const cal = calendarioLaboral as unknown as CalendarioHoras
      const hpd = horasPorDiaCalendario(cal)
      const fechasDe = (n: any) => {
        const ini = n.data?.fechaInicio ?? n.data?.fechaInicioComercial
        const fin = n.data?.fechaFin ?? n.data?.fechaFinComercial
        return ini && fin ? { inicio: new Date(ini), fin: new Date(fin) } : null
      }
      // Duración por horas laborables (como MS Project): "4h", "1.5d", "0d" (hito).
      const anotarDuracion = (nodo: any) => {
        const f = fechasDe(nodo)
        if (nodo.data && f && !nodo.data.isExtrasGroup) {
          const horas = nodo.data.esHito ? 0 : horasLaborablesEntre(cal, f.inicio, f.fin)
          nodo.data.duracionHoras = Math.round(horas * 100) / 100
          nodo.data.duracionTexto = formatearDuracion(horas, hpd)
        }
        for (const hijo of nodo.children || []) anotarDuracion(hijo)
      }
      anotarDuracion(projectNode)
      // Para mostrar duraciones y ubicar las horas en el Gantt (jornada del calendario).
      ;(projectNode.data as Record<string, unknown>).horasPorDia = hpd
      ;(projectNode.data as Record<string, unknown>).jornada = {
        inicio: cal.horaInicioManana ?? '08:00',
        fin: cal.horaFinTarde ?? '17:00',
      }

      const anotarRelaciones = (nodo: any) => {
        const hijos: any[] = (nodo.children || []).filter((c: any) => !c.data?.isExtrasGroup)
        for (let i = 1; i < hijos.length; i++) {
          const prev = hijos[i - 1]
          const cur = hijos[i]
          if (prev.type !== cur.type || !['edt', 'actividad', 'tarea'].includes(cur.type)) continue
          const fPrev = fechasDe(prev)
          const fCur = fechasDe(cur)
          if (fPrev && fCur) {
            cur.data.relacionAnterior = clasificarRelacion(
              cal,
              { ...fPrev, nombre: prev.nombre },
              { ...fCur, esHito: cur.data?.esHito === true },
            )
          }
        }
        for (const hijo of nodo.children || []) anotarRelaciones(hijo)
      }
      anotarRelaciones(projectNode)

      // Dependencias (predecesoras/sucesoras) de cada tarea, con la ruta
      // Fase › EDT › Actividad de la otra tarea y si la dependencia no se cumple
      // (la sucesora va antes de lo que exige: modo manual, solo se avisa).
      const tareasPorId = new Map<string, { nodo: any; ruta: string }>()
      const indexar = (nodo: any, ruta: string[]) => {
        if (nodo.type === 'tarea') {
          tareasPorId.set(String(nodo.id).replace(/^tarea-/, ''), { nodo, ruta: ruta.join(' › ') })
        }
        const sigRuta = ['fase', 'edt', 'actividad'].includes(nodo.type) ? [...ruta, nodo.nombre] : ruta
        for (const hijo of nodo.children || []) indexar(hijo, sigRuta)
      }
      indexar(projectNode, [])
      if (tareasPorId.size > 0) {
        const deps = await prisma.proyectoDependenciasTarea.findMany({
          where: { tareaDependienteId: { in: [...tareasPorId.keys()] } },
          select: { id: true, tipo: true, lagMinutos: true, tareaOrigenId: true, tareaDependienteId: true },
        })
        for (const dep of deps) {
          const pred = tareasPorId.get(dep.tareaOrigenId)
          const suc = tareasPorId.get(dep.tareaDependienteId)
          if (!pred || !suc) continue
          const fp = fechasDe(pred.nodo)
          const fs = fechasDe(suc.nodo)
          const incumple = fp && fs ? horasIncumplidas(cal, dep, fp, fs) : 0
          const base = {
            id: dep.id, tipo: dep.tipo, lagMinutos: dep.lagMinutos,
            // "FC+2d", como la columna Predecesoras de MS Project (en español)
            tipoTexto: `${ABREVIATURA_DEPENDENCIA[dep.tipo as TipoDependencia] ?? 'FC'}${formatearDesfase(dep.lagMinutos, hpd)}`,
            horasIncumplidas: Math.round(incumple * 100) / 100,
            // Va más tarde de lo que exige (permite "Ajustar" para acercarla).
            horasHolgura: fp && fs && !incumple ? Math.round(horasHolgura(cal, dep, fp, fs) * 100) / 100 : 0,
          }
          ;(suc.nodo.data.predecesoras ??= []).push({ ...base, tareaId: dep.tareaOrigenId, nombre: pred.nodo.nombre, ruta: pred.ruta })
          ;(pred.nodo.data.sucesoras ??= []).push({ ...base, tareaId: dep.tareaDependienteId, nombre: suc.nodo.nombre, ruta: suc.ruta })
          if (incumple > 0) suc.nodo.data.dependenciaIncumplida = true
        }
      }
    }

    const tree = [projectNode]


    return NextResponse.json({
      success: true,
      data: { tree }
    })

  } catch (error) {
    logger.error('Error al obtener árbol del cronograma:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}