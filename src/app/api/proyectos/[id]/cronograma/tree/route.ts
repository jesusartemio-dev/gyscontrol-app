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
                        select: { id: true, nombre: true, tipo: true, costoHoraProyecto: true }
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
                  recurso: { select: { id: true, nombre: true, tipo: true, costoHoraProyecto: true } }
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
                          select: { id: true, nombre: true, tipo: true, costoHoraProyecto: true }
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
                    recurso: { select: { id: true, nombre: true, tipo: true, costoHoraProyecto: true } }
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
                          select: { id: true, nombre: true, tipo: true, costoHoraProyecto: true }
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
                    recurso: { select: { id: true, nombre: true, tipo: true, costoHoraProyecto: true } }
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

    const faseNodes = fases.map(fase => {
      const faseEdts = fase.proyectoEdt || []

      // Calcular horas totales de la fase (suma de horas de todos los EDTs)
      const faseHorasTotales = faseEdts.reduce((sum: number, edt: any) => sum + Number(edt.horasPlan || 0), 0)
      proyectoHorasTotales += faseHorasTotales

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
          horasEstimadas: faseHorasTotales // ✅ Agregar horas totales calculadas
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
              fechaInicioComercial: edt.fechaInicioPlan,
              fechaFinComercial: edt.fechaFinPlan,
              fechaInicioReal: edt.fechaInicioReal,
              fechaFinReal: edt.fechaFinReal,
              estado: edt.estado,
              progreso: edt.porcentajeAvance,
              orden: edt.orden,
              horasEstimadas: edt.horasPlan,
              responsableId: edt.responsableId,
              responsableNombre: edt.user?.name || null
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
                  horasReales: actividad.horasReales,
                  prioridad: actividad.prioridad,
                  orden: actividad.orden,
                  responsableId: actividad.responsableId,
                  responsableNombre: actividad.user?.name || null
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
                      esExtra: tarea.esExtra || false
                    },
                    metadata: {
                      hasChildren: false,
                      totalChildren: 0,
                      progressPercentage: tarea.porcentajeCompletado || 0,
                      status: tarea.estado || 'pendiente',
                      recursosTotales: 1,
                      recursosAsignados: tarea.recursoId ? 1 : 0,
                      responsablesTotales: 1,
                      responsablesAsignados: tarea.responsableId ? 1 : 0
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
                      horasEstimadas: (edt.proyectoTarea || []).reduce((s: number, t: any) => s + Number(t.horasEstimadas || 0), 0),
                      horasReales: (edt.proyectoTarea || []).reduce((s: number, t: any) => s + Number(t.horasReales || 0), 0),
                      estado: 'en_progreso',
                    },
                    metadata: {
                      hasChildren: edt.proyectoTarea.length > 0,
                      totalChildren: edt.proyectoTarea.length,
                      progressPercentage: 0,
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
                          esExtra: true
                        },
                        metadata: {
                          hasChildren: false,
                          totalChildren: 0,
                          progressPercentage: tarea.porcentajeCompletado || 0,
                          status: tarea.estado || 'pendiente',
                          recursosTotales: 1,
                          recursosAsignados: tarea.recursoId ? 1 : 0,
                          responsablesTotales: 1,
                          responsablesAsignados: tarea.responsableId ? 1 : 0
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

    // ✅ Propagar conteo de recursos de abajo hacia arriba
    const propagateResources = (node: any): { total: number; assigned: number } => {
      if (!node.children || node.children.length === 0) {
        return {
          total: node.metadata.recursosTotales || 0,
          assigned: node.metadata.recursosAsignados || 0
        }
      }
      let total = 0
      let assigned = 0
      for (const child of node.children) {
        const childRes = propagateResources(child)
        total += childRes.total
        assigned += childRes.assigned
      }
      node.metadata.recursosTotales = total
      node.metadata.recursosAsignados = assigned
      return { total, assigned }
    }

    for (const fase of faseNodes) {
      propagateResources(fase)
    }

    // ✅ Propagar conteo de responsables de abajo hacia arriba
    const propagateResponsables = (node: any): { total: number; assigned: number } => {
      if (!node.children || node.children.length === 0) {
        return {
          total: node.metadata.responsablesTotales || 0,
          assigned: node.metadata.responsablesAsignados || 0
        }
      }
      let total = 0
      let assigned = 0
      for (const child of node.children) {
        const childRes = propagateResponsables(child)
        total += childRes.total
        assigned += childRes.assigned
      }
      node.metadata.responsablesTotales = total
      node.metadata.responsablesAsignados = assigned
      return { total, assigned }
    }

    for (const fase of faseNodes) {
      propagateResponsables(fase)
    }

    // ✅ Nodo raíz del proyecto (nivel 0) - envuelve todas las fases
    const proyectoRecursos = faseNodes.reduce(
      (acc: any, f: any) => ({
        total: acc.total + (f.metadata.recursosTotales || 0),
        assigned: acc.assigned + (f.metadata.recursosAsignados || 0)
      }),
      { total: 0, assigned: 0 }
    )

    const proyectoResponsables = faseNodes.reduce(
      (acc: any, f: any) => ({
        total: acc.total + (f.metadata.responsablesTotales || 0),
        assigned: acc.assigned + (f.metadata.responsablesAsignados || 0)
      }),
      { total: 0, assigned: 0 }
    )

    const projectNode = {
      id: `proyecto-${id}`,
      type: 'proyecto',
      nombre: proyecto.nombre,
      level: 0,
      expanded: true, // Siempre expandido por defecto
      data: {
        fechaInicioComercial: proyecto.fechaInicio,
        fechaFinComercial: proyecto.fechaFin,
        horasEstimadas: proyectoHorasTotales,
      },
      metadata: {
        hasChildren: faseNodes.length > 0,
        totalChildren: faseNodes.length,
        progressPercentage: 0,
        status: 'pendiente',
        recursosTotales: proyectoRecursos.total,
        recursosAsignados: proyectoRecursos.assigned,
        responsablesTotales: proyectoResponsables.total,
        responsablesAsignados: proyectoResponsables.assigned
      },
      children: faseNodes,
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