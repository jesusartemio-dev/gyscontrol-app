// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/proyectos/[id]/cronograma/generar
// 🔧 Descripción: Generación automática de cronograma desde servicios del proyecto
// ✅ POST: Generar estructura jerárquica (Fases > EDTs > Actividades > Tareas)
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import {
  obtenerCalendarioLaboral,
  obtenerCalendarioLaboralPorId,
  calcularFechaFinConCalendario,
  ajustarFechaADiaLaborable
} from '@/lib/utils/calendarioLaboral'
import { logger } from '@/lib/logger'

const generateSchema = z.object({
  generarFases: z.boolean().optional().default(true),
  generarEdts: z.boolean().optional().default(true),
  generarActividades: z.boolean().optional().default(true),
  generarTareas: z.boolean().optional().default(true),
  fechaInicioProyecto: z.string().optional(),
  cronogramaId: z.string().optional(),
  calendarioId: z.string().optional()
})

// Función auxiliar para parsear fecha a mediodía UTC (evita offset de timezone)
function parseDateAtNoonUTC(dateString: string): Date {
  const datePart = dateString.split('T')[0]
  const [year, month, day] = datePart.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0))
}

// Función auxiliar para obtener configuración de duraciones
async function obtenerDuracionesConfig() {
  try {
    const duraciones = await prisma.plantillaDuracionCronograma.findMany({
      where: { activo: true }
    })

    const config: { [key: string]: { duracionDias: number; horasPorDia: number; bufferPorcentaje: number } } = {}

    duraciones.forEach(duracion => {
      config[duracion.nivel] = {
        duracionDias: duracion.duracionDias,
        horasPorDia: duracion.horasPorDia,
        bufferPorcentaje: duracion.bufferPorcentaje
      }
    })

    return {
      edt: config.edt || { duracionDias: 45, horasPorDia: 8, bufferPorcentaje: 10 },
      actividad: config.actividad || { duracionDias: 7, horasPorDia: 8, bufferPorcentaje: 10 },
      tarea: config.tarea || { duracionDias: 2, horasPorDia: 8, bufferPorcentaje: 10 },
      horasPorDia: 8,
      diasHabiles: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
      bufferPorcentaje: 10
    }
  } catch (error) {
    return {
      edt: { duracionDias: 45, horasPorDia: 8, bufferPorcentaje: 10 },
      actividad: { duracionDias: 7, horasPorDia: 8, bufferPorcentaje: 10 },
      tarea: { duracionDias: 2, horasPorDia: 8, bufferPorcentaje: 10 },
      horasPorDia: 8,
      diasHabiles: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
      bufferPorcentaje: 10
    }
  }
}

// Función auxiliar para obtener configuración de fases con duraciones
async function obtenerFasesConfigConDuraciones() {
  const fasesDefault = await prisma.faseDefault.findMany({
    where: { activo: true },
    orderBy: { orden: 'asc' }
  })

  return fasesDefault.map(fase => ({
    id: fase.id,
    nombre: fase.nombre,
    descripcion: fase.descripcion,
    orden: fase.orden,
    duracionDias: fase.duracionDias,
    color: fase.color
  }))
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: proyectoId } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Validar datos de entrada
    const body = await request.json()
    const validatedData = generateSchema.parse(body)

    console.log('🚀 [GENERAR CRONOGRAMA PROYECTO] Iniciando para proyecto:', proyectoId)
    console.log('📋 [GENERAR CRONOGRAMA PROYECTO] Opciones:', validatedData)

    // Verificar que el proyecto existe con su cotización y servicios
    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      include: {
        cotizacion: {
          include: {
            calendarioLaboral: {
              include: {
                diaCalendario: true,
                excepcionCalendario: true
              }
            },
            cotizacionServicio: {
              include: {
                cotizacionServicioItem: true,
                edt: true
              }
            }
          }
        }
      }
    })

    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Verificar permisos
    const userRole = session.user.role
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || userRole === 'proyectos'

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para generar cronograma' }, { status: 403 })
    }

    // ✅ Obtener el cronograma especificado o buscar uno existente
    let cronograma = null

    if (validatedData.cronogramaId) {
      cronograma = await prisma.proyectoCronograma.findUnique({
        where: { id: validatedData.cronogramaId }
      })

      if (!cronograma) {
        return NextResponse.json({ error: 'Cronograma no encontrado' }, { status: 404 })
      }

      if (cronograma.tipo === 'comercial') {
        return NextResponse.json({
          error: 'No se puede generar contenido en un cronograma comercial (solo lectura)'
        }, { status: 400 })
      }

      console.log(`✅ [GENERAR] Usando cronograma existente: ${cronograma.nombre} (${cronograma.tipo})`)
    } else {
      cronograma = await prisma.proyectoCronograma.findFirst({
        where: { proyectoId, tipo: 'planificacion' }
      })

      if (!cronograma) {
        cronograma = await prisma.proyectoCronograma.create({
          data: {
            id: crypto.randomUUID(),
            proyectoId,
            tipo: 'planificacion',
            nombre: 'Línea Base',
            esBaseline: true,
            version: 1,
            updatedAt: new Date()
          }
        })
        console.log('✅ [GENERAR] Cronograma Línea Base creado:', cronograma.id)
      }
    }

    // Obtener servicios de la cotización
    const servicios = proyecto.cotizacion?.cotizacionServicio || []

    if (servicios.length === 0) {
      return NextResponse.json({
        error: 'No hay servicios en la cotización del proyecto para generar el cronograma'
      }, { status: 400 })
    }

    console.log(`📊 [GENERAR] Servicios encontrados: ${servicios.length}`)

    // Obtener todas las categorías EDT con su fase por defecto
    const categorias = await prisma.edt.findMany({
      include: {
        catalogoServicio: true,
        faseDefault: true
      }
    })
    const categoriasMap = new Map(categorias.map(cat => [cat.id, cat.nombre]))

    // Crear mapa de nombres de EDTs por servicio
    const categoriaNombresMap = new Map()
    servicios.forEach(servicio => {
      if (servicio.edtId && !categoriaNombresMap.has(servicio.edtId)) {
        categoriaNombresMap.set(servicio.edtId, {
          id: servicio.edtId,
          nombre: servicio.edt?.nombre || categoriasMap.get(servicio.edtId) || 'Sin EDT'
        })
      }
    })

    // Obtener fecha de inicio
    const fechaInicioProyecto = validatedData.fechaInicioProyecto
      ? parseDateAtNoonUTC(validatedData.fechaInicioProyecto)
      : proyecto.fechaInicio
        ? parseDateAtNoonUTC(proyecto.fechaInicio.toISOString())
        : new Date()

    // Obtener configuraciones
    const duracionesConfig = await obtenerDuracionesConfig()
    const fasesConfigConDuraciones = await obtenerFasesConfigConDuraciones()

    // Obtener calendario laboral
    let calendarioLaboral = null

    if (validatedData.calendarioId && validatedData.calendarioId !== 'default') {
      calendarioLaboral = await obtenerCalendarioLaboralPorId(validatedData.calendarioId)
    }

    // Obtener calendario desde la cotización del proyecto
    if (!calendarioLaboral && proyecto.cotizacion?.calendarioLaboral) {
      calendarioLaboral = proyecto.cotizacion.calendarioLaboral
    }

    // Fallback a calendario por defecto
    if (!calendarioLaboral) {
      calendarioLaboral = await obtenerCalendarioLaboral('empresa', 'default')
    }

    if (!calendarioLaboral) {
      return NextResponse.json({
        error: 'No hay calendario laboral configurado para el proyecto.'
      }, { status: 400 })
    }

    if (!calendarioLaboral.horasPorDia || calendarioLaboral.horasPorDia <= 0) {
      calendarioLaboral.horasPorDia = 8
    }

    // Generar estructura del cronograma
    const result = await generarCronogramaDesdeServicios({
      proyectoId,
      cronogramaId: cronograma.id,
      servicios,
      duracionesConfig,
      fasesConfigConDuraciones,
      fechaInicioProyecto,
      categoriaNombresMap,
      categorias,
      calendarioLaboral,
      options: validatedData
    })

    return NextResponse.json({
      success: true,
      data: {
        cronograma,
        ...result,
        message: `Cronograma generado exitosamente con ${result.totalElements} elementos`
      }
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    logger.error('❌ [GENERAR CRONOGRAMA] Error:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// Función principal para generar cronograma
async function generarCronogramaDesdeServicios({
  proyectoId,
  cronogramaId,
  servicios,
  duracionesConfig,
  fasesConfigConDuraciones,
  fechaInicioProyecto,
  categoriaNombresMap,
  categorias,
  calendarioLaboral,
  options
}: {
  proyectoId: string
  cronogramaId: string
  servicios: any[]
  duracionesConfig: any
  fasesConfigConDuraciones: any[]
  fechaInicioProyecto: Date
  categoriaNombresMap: Map<string, any>
  categorias: any[]
  calendarioLaboral: any
  options: any
}) {
  const result = {
    fasesGeneradas: 0,
    edtsGenerados: 0,
    actividadesGeneradas: 0,
    tareasGeneradas: 0,
    totalElements: 0
  }

  console.log('🚀 [PROYECTO] INICIANDO GENERACIÓN CRONOGRAMA')

  // 1. Preparar fases con fechas secuenciales
  let fasesConfig: any[] = []

  if (options.generarFases) {
    console.log(`📋 [PROYECTO] GENERACIÓN FASES`)
    let currentDate = ajustarFechaADiaLaborable(new Date(fechaInicioProyecto), calendarioLaboral)

    // Buscar fases existentes o crearlas desde configuración
    const fasesExistentes = await prisma.proyectoFase.findMany({
      where: { proyectoId, proyectoCronogramaId: cronogramaId },
      orderBy: { orden: 'asc' }
    })

    if (fasesExistentes.length === 0 && fasesConfigConDuraciones.length > 0) {
      // Crear fases desde configuración
      for (const faseDefault of fasesConfigConDuraciones) {
        const duracionDias = faseDefault.duracionDias || 30

        const fechaInicio = new Date(currentDate)
        const fechaFin = calcularFechaFinConCalendario(fechaInicio, duracionDias * calendarioLaboral.horasPorDia, calendarioLaboral)

        await prisma.proyectoFase.create({
          data: {
            id: crypto.randomUUID(),
            proyectoId,
            proyectoCronogramaId: cronogramaId,
            nombre: faseDefault.nombre,
            descripcion: faseDefault.descripcion,
            orden: faseDefault.orden,
            fechaInicioPlan: fechaInicio,
            fechaFinPlan: fechaFin,
            estado: 'planificado',
            updatedAt: new Date()
          }
        })
        result.fasesGeneradas++
        console.log(`📅 Fase creada: ${faseDefault.nombre} (${fechaInicio.toISOString().split('T')[0]} - ${fechaFin.toISOString().split('T')[0]})`)

        currentDate = new Date(fechaFin)
        currentDate.setDate(currentDate.getDate() + 1)
        currentDate = ajustarFechaADiaLaborable(currentDate, calendarioLaboral)
      }
    }

    fasesConfig = await prisma.proyectoFase.findMany({
      where: { proyectoId, proyectoCronogramaId: cronogramaId },
      orderBy: { orden: 'asc' }
    })
  }

  // 2. Generar EDTs
  if (options.generarEdts) {
    console.log('🏗️ [PROYECTO] GENERACIÓN EDTS')

    // Agrupar servicios por EDT
    const serviciosPorCategoria = new Map()
    servicios.forEach(servicio => {
      const edtId = servicio.edtId || 'Sin EDT'
      if (!serviciosPorCategoria.has(edtId)) {
        serviciosPorCategoria.set(edtId, [])
      }
      serviciosPorCategoria.get(edtId).push(servicio)
    })

    // Crear mapa de EDTs por fase
    const edtsPorFase = new Map<string, Array<{categoriaId: string, categoriaNombre: string, horasTotales: number, servicios: any[]}>>()

    for (const [categoriaId, serviciosCategoria] of serviciosPorCategoria.entries()) {
      const categoriaObj = categorias.find((cat: any) => cat.id === categoriaId)
      const categoriaInfo = categoriaNombresMap.get(categoriaId)
      const categoriaNombre = categoriaInfo?.nombre || categoriaId

      const horasTotales = serviciosCategoria.reduce((sum: number, servicio: any) =>
        sum + servicio.cotizacionServicioItem.reduce((itemSum: number, item: any) => itemSum + (item.horaTotal || 0), 0), 0
      )

      let faseAsignadaId: string | null = null

      if (categoriaObj?.faseDefault) {
        const faseCronograma = fasesConfig.find(f =>
          f.nombre.toLowerCase() === categoriaObj.faseDefault.nombre.toLowerCase()
        )
        if (faseCronograma) {
          faseAsignadaId = faseCronograma.id
          console.log(`🎯 EDT "${categoriaNombre}" asignado a fase "${faseCronograma.nombre}"`)
        }
      }

      if (!faseAsignadaId && fasesConfig.length > 0) {
        faseAsignadaId = fasesConfig[0].id
      }

      if (faseAsignadaId) {
        if (!edtsPorFase.has(faseAsignadaId)) {
          edtsPorFase.set(faseAsignadaId, [])
        }
        edtsPorFase.get(faseAsignadaId)!.push({
          categoriaId,
          categoriaNombre,
          horasTotales,
          servicios: serviciosCategoria
        })
      }
    }

    // Generar EDTs por fase
    for (const fase of fasesConfig) {
      const edtsDeFase = edtsPorFase.get(fase.id) || []
      if (edtsDeFase.length === 0) continue

      console.log(`🏗️ Generando ${edtsDeFase.length} EDTs para fase: ${fase.nombre}`)

      const faseInicio = new Date(fase.fechaInicioPlan)
      let currentEdtStart = ajustarFechaADiaLaborable(new Date(faseInicio), calendarioLaboral)

      for (const edtInfo of edtsDeFase) {
        const duracionDias = edtInfo.horasTotales > 0
          ? Math.ceil(edtInfo.horasTotales / calendarioLaboral.horasPorDia)
          : duracionesConfig.edt.duracionDias

        const fechaInicioEdt = new Date(currentEdtStart)
        const fechaFinEdt = calcularFechaFinConCalendario(fechaInicioEdt, duracionDias * calendarioLaboral.horasPorDia, calendarioLaboral)

        const existingEdt = await prisma.proyectoEdt.findFirst({
          where: { proyectoId, proyectoCronogramaId: cronogramaId, nombre: edtInfo.categoriaNombre }
        })

        let edtId: string

        if (existingEdt) {
          await prisma.proyectoEdt.update({
            where: { id: existingEdt.id },
            data: {
              proyectoFaseId: fase.id,
              horasPlan: edtInfo.horasTotales,
              fechaInicioPlan: fechaInicioEdt,
              fechaFinPlan: fechaFinEdt
            }
          })
          edtId = existingEdt.id
          console.log(`📅 EDT actualizado: ${edtInfo.categoriaNombre}`)
        } else {
          const newEdt = await prisma.proyectoEdt.create({
            data: {
              id: crypto.randomUUID(),
              proyectoId,
              proyectoCronogramaId: cronogramaId,
              proyectoFaseId: fase.id,
              nombre: edtInfo.categoriaNombre,
              edtId: edtInfo.categoriaId,
              descripcion: `EDT generado automáticamente`,
              horasPlan: edtInfo.horasTotales,
              fechaInicioPlan: fechaInicioEdt,
              fechaFinPlan: fechaFinEdt,
              estado: 'planificado',
              updatedAt: new Date()
            }
          })
          edtId = newEdt.id
          result.edtsGenerados++
          console.log(`📅 EDT creado: ${edtInfo.categoriaNombre} (${fechaInicioEdt.toISOString().split('T')[0]} - ${fechaFinEdt.toISOString().split('T')[0]}) - ${edtInfo.horasTotales}h`)
        }

        // 3. Generar Actividades para este EDT
        if (options.generarActividades) {
          let currentActividadStart = new Date(fechaInicioEdt)

          for (const servicio of edtInfo.servicios) {
            const horasServicio = servicio.cotizacionServicioItem.reduce((sum: number, item: any) => sum + (item.horaTotal || 0), 0)

            const duracionDiasAct = horasServicio > 0
              ? Math.ceil(horasServicio / calendarioLaboral.horasPorDia)
              : duracionesConfig.actividad.duracionDias

            const fechaInicioActividad = new Date(currentActividadStart)
            const fechaFinActividad = calcularFechaFinConCalendario(fechaInicioActividad, duracionDiasAct * calendarioLaboral.horasPorDia, calendarioLaboral)

            const existingActividad = await prisma.proyectoActividad.findFirst({
              where: { proyectoEdtId: edtId, nombre: servicio.nombre }
            })

            let actividadId: string

            if (existingActividad) {
              await prisma.proyectoActividad.update({
                where: { id: existingActividad.id },
                data: {
                  horasPlan: horasServicio,
                  fechaInicioPlan: fechaInicioActividad,
                  fechaFinPlan: fechaFinActividad
                }
              })
              actividadId = existingActividad.id
              console.log(`📅 Actividad actualizada: ${servicio.nombre}`)
            } else {
              const newActividad = await prisma.proyectoActividad.create({
                data: {
                  id: crypto.randomUUID(),
                  proyectoEdtId: edtId,
                  proyectoCronogramaId: cronogramaId,
                  nombre: servicio.nombre,
                  descripcion: `Actividad generada desde servicio ${servicio.nombre}`,
                  horasPlan: horasServicio,
                  fechaInicioPlan: fechaInicioActividad,
                  fechaFinPlan: fechaFinActividad,
                  estado: 'pendiente',
                  prioridad: 'media',
                  createdAt: new Date(),
                  updatedAt: new Date()
                }
              })
              actividadId = newActividad.id
              result.actividadesGeneradas++
              console.log(`📅 Actividad creada: ${servicio.nombre} (${fechaInicioActividad.toISOString().split('T')[0]} - ${fechaFinActividad.toISOString().split('T')[0]}) - ${horasServicio}h`)
            }

            // 4. Generar Tareas para esta Actividad
            if (options.generarTareas && servicio.cotizacionServicioItem.length > 0) {
              // Eliminar tareas existentes para regenerar
              await prisma.proyectoTarea.deleteMany({
                where: { proyectoActividadId: actividadId }
              })

              let currentTareaStart = new Date(fechaInicioActividad)

              const itemsOrdenados = servicio.cotizacionServicioItem.sort((a: any, b: any) => (a.orden ?? 0) - (b.orden ?? 0))

              for (const item of itemsOrdenados) {
                const duracionDiasTarea = item.horaTotal > 0
                  ? Math.ceil(item.horaTotal / calendarioLaboral.horasPorDia)
                  : duracionesConfig.tarea.duracionDias

                const fechaInicioTarea = new Date(currentTareaStart)
                const fechaFinTarea = calcularFechaFinConCalendario(fechaInicioTarea, duracionDiasTarea * calendarioLaboral.horasPorDia, calendarioLaboral)

                await prisma.proyectoTarea.create({
                  data: {
                    id: crypto.randomUUID(),
                    proyectoEdtId: edtId,
                    proyectoActividadId: actividadId,
                    proyectoCronogramaId: cronogramaId,
                    nombre: item.nombre,
                    descripcion: item.descripcion || `Tarea generada desde item ${item.nombre}`,
                    fechaInicio: fechaInicioTarea,
                    fechaFin: fechaFinTarea,
                    horasEstimadas: item.horaTotal,
                    estado: 'pendiente',
                    prioridad: 'media',
                    updatedAt: new Date()
                  }
                })
                result.tareasGeneradas++
                console.log(`📅 Tarea creada: ${item.nombre} (${fechaInicioTarea.toISOString().split('T')[0]} - ${fechaFinTarea.toISOString().split('T')[0]}) - ${item.horaTotal}h`)

                currentTareaStart = new Date(fechaFinTarea)
              }
            }

            currentActividadStart = new Date(fechaFinActividad)
          }
        }

        currentEdtStart = new Date(fechaFinEdt)
        currentEdtStart.setDate(currentEdtStart.getDate() + 1)
        currentEdtStart = ajustarFechaADiaLaborable(currentEdtStart, calendarioLaboral)
      }
    }
  }

  // 5. Roll-up final: Actualizar fechas de padres basado en hijos
  console.log('🔄 [PROYECTO] ROLL-UP FINAL')

  // Roll-up EDTs por actividades
  const allEdts = await prisma.proyectoEdt.findMany({
    where: { proyectoId, proyectoCronogramaId: cronogramaId },
    include: { proyectoActividad: true }
  })

  for (const edt of allEdts) {
    if (edt.proyectoActividad.length > 0) {
      const fechasActividades = edt.proyectoActividad
        .map(act => act.fechaFinPlan)
        .filter(f => f) as Date[]

      if (fechasActividades.length > 0) {
        const maxFechaFin = new Date(Math.max(...fechasActividades.map(f => f.getTime())))
        const edtFechaFinActual = edt.fechaFinPlan ? new Date(edt.fechaFinPlan) : new Date()

        if (maxFechaFin > edtFechaFinActual) {
          await prisma.proyectoEdt.update({
            where: { id: edt.id },
            data: { fechaFinPlan: maxFechaFin }
          })
          console.log(`📅 EDT extendido: ${edt.nombre} -> ${maxFechaFin.toISOString().split('T')[0]}`)
        }
      }
    }
  }

  // Roll-up fases por EDTs
  for (const fase of fasesConfig) {
    const edtsDeFase = await prisma.proyectoEdt.findMany({
      where: { proyectoFaseId: fase.id }
    })

    if (edtsDeFase.length > 0) {
      const fechasEdts = edtsDeFase
        .map(edt => edt.fechaFinPlan)
        .filter(f => f) as Date[]

      if (fechasEdts.length > 0) {
        const maxFechaFin = new Date(Math.max(...fechasEdts.map(f => f.getTime())))
        const faseFechaFinActual = fase.fechaFinPlan ? new Date(fase.fechaFinPlan) : new Date()

        if (maxFechaFin > faseFechaFinActual) {
          await prisma.proyectoFase.update({
            where: { id: fase.id },
            data: { fechaFinPlan: maxFechaFin }
          })
          console.log(`📅 Fase extendida: ${fase.nombre} -> ${maxFechaFin.toISOString().split('T')[0]}`)
        }
      }
    }
  }

  result.totalElements = result.fasesGeneradas + result.edtsGenerados + result.actividadesGeneradas + result.tareasGeneradas

  console.log('✅ [PROYECTO] Generación completada:', result)

  return result
}
