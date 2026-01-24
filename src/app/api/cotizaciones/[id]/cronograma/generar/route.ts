// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizaciones/[id]/cronograma/generar
// 🔧 Descripción: Generación automática de cronograma desde servicios
// ✅ POST: Generar jerarquía completa desde servicios de cotización
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
import { ejecutarRollupHoras } from '@/lib/validators/cronogramaRules'

export const dynamic = 'force-dynamic'

const generateSchema = z.object({
  generarFases: z.boolean().optional().default(true),
  generarEdts: z.boolean().optional().default(true),
  generarActividades: z.boolean().optional().default(true),
  generarTareas: z.boolean().optional().default(true),
  fechaInicioProyecto: z.string().optional(),
  // Nuevos campos para el modal
  modo: z.enum(['basica', 'dependencias', 'personalizada']).optional().default('basica'),
  opciones: z.object({
    fechaInicio: z.string().optional(),
    calendarioId: z.string().optional(),
    aplicarDependencias: z.boolean().optional().default(false),
    identificarHitos: z.boolean().optional().default(false),
    dependenciasPersonalizadas: z.array(z.object({
      tareaOrigenId: z.string(),
      tareaDependienteId: z.string(),
      tipo: z.enum(['finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish']).default('finish_to_start'),
      lagMinutos: z.number().optional().default(0)
    })).optional()
  }).optional()
})

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

    // Valores por defecto si no hay configuración en BD
    return {
      edt: config.edt || { duracionDias: 45, horasPorDia: 8, bufferPorcentaje: 10 },
      actividad: config.actividad || { duracionDias: 7, horasPorDia: 8, bufferPorcentaje: 10 },
      tarea: config.tarea || { duracionDias: 2, horasPorDia: 8, bufferPorcentaje: 10 },
      horasPorDia: 8,
      diasHabiles: ['lunes', 'martes', 'miercoles', 'jueves', 'viernes'],
      bufferPorcentaje: 10
    }
  } catch (error) {
    // Fallback a valores por defecto
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

// Función auxiliar para calcular fecha fin evitando fines de semana
function calcularFechaFinEvitandoFinesDeSemana(fechaInicio: Date, diasHabiles: number): Date {
  let fechaActual = new Date(fechaInicio)
  let diasAgregados = 0

  while (diasAgregados < diasHabiles) {
    fechaActual.setDate(fechaActual.getDate() + 1)

    // Si no es sábado (6) ni domingo (0), contar como día hábil
    if (fechaActual.getDay() !== 0 && fechaActual.getDay() !== 6) {
      diasAgregados++
    }
  }

  return fechaActual
}

// ✅ POST /api/cotizaciones/[id]/cronograma/generar
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: {
        user: true,
        calendarioLaboral: {
          include: {
            diaCalendario: true,
            excepcionCalendario: true
          }
        }
      }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    const userRole = session.user.role
    const isOwner = cotizacion.comercialId === session.user.id
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || userRole === 'comercial' || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para modificar el cronograma' }, { status: 403 })
    }

    // Validar datos de entrada
    const body = await request.json()
    const validatedData = generateSchema.parse(body)

    // Obtener servicios de la cotización con su EDT relacionado
    const servicios = await prisma.cotizacionServicio.findMany({
      where: { cotizacionId: id },
      include: {
        cotizacionServicioItem: true,
        edt: true
      }
    })

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

    if (servicios.length === 0) {
      return NextResponse.json({
        error: 'No hay servicios en esta cotización para generar el cronograma'
      }, { status: 400 })
    }

    // Obtener configuración de fases si se requieren
    let fasesConfig: any[] = []
    if (validatedData.generarFases) {
      // Buscar fases desde la configuración global (faseDefault)
      const fasesDefault = await prisma.faseDefault.findMany({
        where: { activo: true },
        orderBy: { orden: 'asc' }
      })

      // Si hay fases de configuración, usarlas como base
      if (fasesDefault.length > 0) {
        // Verificar si ya existen fases en la cotización
        const fasesExistentes = await prisma.cotizacionFase.findMany({
          where: { cotizacionId: id },
          orderBy: { orden: 'asc' }
        })

        // Si no hay fases en la cotización, crearlas desde la configuración
        if (fasesExistentes.length === 0) {
          for (const faseDefault of fasesDefault) {
            await prisma.cotizacionFase.create({
              data: {
                id: crypto.randomUUID(),
                cotizacionId: id,
                nombre: faseDefault.nombre,
                descripcion: faseDefault.descripcion,
                orden: faseDefault.orden,
                estado: 'planificado',
                updatedAt: new Date()
              }
            })
          }
        }

        // Usar las fases de la cotización (ya existentes o recién creadas)
        fasesConfig = await prisma.cotizacionFase.findMany({
          where: { cotizacionId: id },
          orderBy: { orden: 'asc' }
        })
      } else {
        // Fallback: fases por defecto si no hay configuración
        const fasesPorDefecto = [
          { nombre: 'Ingeniería Básica', descripcion: 'Fase de diseño e ingeniería', orden: 1 },
          { nombre: 'Construcción', descripcion: 'Fase de construcción y montaje', orden: 2 },
          { nombre: 'Pruebas y Puesta en Marcha', descripcion: 'Fase de pruebas y commissioning', orden: 3 }
        ]

        // Verificar si ya existen fases en la cotización
        const fasesExistentes = await prisma.cotizacionFase.findMany({
          where: { cotizacionId: id },
          orderBy: { orden: 'asc' }
        })

        // Si no hay fases, crear las por defecto
        if (fasesExistentes.length === 0) {
          for (const faseData of fasesPorDefecto) {
            await prisma.cotizacionFase.create({
              data: {
                id: crypto.randomUUID(),
                cotizacionId: id,
                nombre: faseData.nombre,
                descripcion: faseData.descripcion,
                orden: faseData.orden,
                estado: 'planificado',
                updatedAt: new Date()
              }
            })
          }
        }

        // Usar las fases de la cotización
        fasesConfig = await prisma.cotizacionFase.findMany({
          where: { cotizacionId: id },
          orderBy: { orden: 'asc' }
        })
      }
    }

    // Obtener fecha de inicio del proyecto desde la cotización o desde opciones del modal
    const fechaInicioProyecto = validatedData.opciones?.fechaInicio
      ? new Date(validatedData.opciones.fechaInicio)
      : validatedData.fechaInicioProyecto
        ? new Date(validatedData.fechaInicioProyecto)
        : cotizacion.fechaInicio
          ? new Date(cotizacion.fechaInicio)
          : new Date()

    // Obtener configuración de duraciones desde BD
    const duracionesConfig = await obtenerDuracionesConfig()

    // Obtener configuración de fases con duraciones
    const fasesConfigConDuraciones = await obtenerFasesConfigConDuraciones()

    // Obtener calendario laboral configurado para la cotización
    let calendarioLaboral = null

    // Prioridad: calendario seleccionado en el modal > calendario de cotización > calendario por defecto
    if (validatedData.opciones?.calendarioId && validatedData.opciones.calendarioId !== 'default') {
      calendarioLaboral = await obtenerCalendarioLaboralPorId(validatedData.opciones.calendarioId)
    }

    // Si no hay calendario del modal, usar el de la cotización
    if (!calendarioLaboral) {
      calendarioLaboral = cotizacion.calendarioLaboralId ? cotizacion.calendarioLaboral : null
    }

    // Si no hay calendario configurado para la cotización, buscar uno activo por defecto
    if (!calendarioLaboral) {
      calendarioLaboral = await obtenerCalendarioLaboral('empresa', 'default')
    }

    if (!calendarioLaboral) {
      return NextResponse.json({
        error: 'No hay calendario laboral configurado. Configure un calendario laboral en la pestaña "Configuración" del cronograma.'
      }, { status: 400 })
    }

    // ✅ Asegurar que horasPorDia tenga un valor válido
    if (!calendarioLaboral.horasPorDia || calendarioLaboral.horasPorDia <= 0) {
      calendarioLaboral.horasPorDia = 8 // Default a 8 horas por día
      console.warn('⚠️ Calendario laboral sin horasPorDia válidas, usando default: 8 horas/día')
    }

    // Determinar opciones según el modo seleccionado
    const opcionesGeneracion = {
      ...validatedData,
      aplicarDependencias: validatedData.modo === 'dependencias' || validatedData.opciones?.aplicarDependencias || false,
      identificarHitos: validatedData.modo === 'dependencias' || validatedData.opciones?.identificarHitos || false
    }

    const result = await generarCronogramaDesdeServicios({
      cotizacionId: id,
      servicios,
      fasesConfig,
      duracionesConfig,
      fasesConfigConDuraciones,
      fechaInicioProyecto,
      categoriaNombresMap,
      categorias: categorias,
      calendarioLaboral,
      options: opcionesGeneracion
    })

    return NextResponse.json({
      success: true,
      data: result,
      message: `Cronograma generado exitosamente con ${result.totalElements} elementos`
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ Error generando cronograma:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// Función principal para generar cronograma
async function generarCronogramaDesdeServicios({
  cotizacionId,
  servicios,
  fasesConfig,
  duracionesConfig,
  fasesConfigConDuraciones,
  fechaInicioProyecto,
  categoriaNombresMap,
  categorias, // ✅ Agregar categorías con faseDefault
  calendarioLaboral,
  options
}: {
  cotizacionId: string
  servicios: any[]
  fasesConfig: any[]
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

  console.log('🚀 INICIANDO GENERACIÓN CRONOGRAMA - GYS-GEN-01 (FS+1 obligatorio)')

  // 1. Preparar fases con fechas secuenciales FS+0
  if (options.generarFases && fasesConfig.length > 0) {
    console.log(`📋 GENERACIÓN FASES - FS+0 entre fases`)
    let currentDate = ajustarFechaADiaLaborable(new Date(fechaInicioProyecto), calendarioLaboral)

    for (const faseConfig of fasesConfig) {
      const faseDuracion = fasesConfigConDuraciones.find(f => f.nombre === faseConfig.nombre)
      const duracionDias = faseDuracion?.duracionDias || 30

      const fechaInicio = new Date(currentDate)
      const fechaFin = calcularFechaFinConCalendario(fechaInicio, duracionDias * calendarioLaboral.horasPorDia, calendarioLaboral)

      const existingFase = await prisma.cotizacionFase.findFirst({
        where: { cotizacionId, nombre: faseConfig.nombre }
      })

      if (existingFase) {
        await prisma.cotizacionFase.update({
          where: { id: existingFase.id },
          data: {
            fechaInicioPlan: fechaInicio.toISOString(),
            fechaFinPlan: fechaFin.toISOString()
          }
        })
        console.log(`📅 Fase actualizada: ${faseConfig.nombre} (${fechaInicio.toISOString().split('T')[0]} - ${fechaFin.toISOString().split('T')[0]})`)
      } else {
        await prisma.cotizacionFase.create({
          data: {
            id: crypto.randomUUID(),
            cotizacionId,
            nombre: faseConfig.nombre,
            descripcion: faseConfig.descripcion,
            orden: faseConfig.orden,
            fechaInicioPlan: fechaInicio.toISOString(),
            fechaFinPlan: fechaFin.toISOString(),
            estado: 'planificado',
            updatedAt: new Date()
          }
        })
        result.fasesGeneradas++
        console.log(`📅 Fase creada: ${faseConfig.nombre} (${fechaInicio.toISOString().split('T')[0]} - ${fechaFin.toISOString().split('T')[0]})`)
      }

      // ✅ GYS-GEN-01: FS+1 - siguiente fase inicia al día siguiente laborable
      currentDate = new Date(fechaFin)
      currentDate.setDate(currentDate.getDate() + 1) // Agregar 1 día
      currentDate = ajustarFechaADiaLaborable(currentDate, calendarioLaboral)
    }

    fasesConfig = await prisma.cotizacionFase.findMany({
      where: { cotizacionId },
      orderBy: { orden: 'asc' }
    })
  }

  // 2. Generar EDTs con FS+0 y roll-up correcto de horas
  if (options.generarEdts) {
    console.log('🏗️ GENERACIÓN EDTS - FS+0 entre EDTs hermanos, roll-up de horas desde hijos')

    // Agrupar servicios por EDT
    const serviciosPorCategoria = new Map()
    servicios.forEach(servicio => {
      const edtId = servicio.edtId || 'Sin EDT'
      if (!serviciosPorCategoria.has(edtId)) {
        serviciosPorCategoria.set(edtId, [])
      }
      serviciosPorCategoria.get(edtId).push(servicio)
    })

    // Determinar fase por categoría
    const determinarFasePorCategoria = (categoria: any, fasesDisponibles: any[]): string | null => {
      if (categoria?.faseDefault) {
        const faseAsignada = fasesDisponibles.find(f =>
          f.nombre.toLowerCase() === categoria.faseDefault.nombre.toLowerCase()
        )
        if (faseAsignada) return faseAsignada.id
      }
      // Balanceo simple por defecto
      if (fasesDisponibles.length > 0) return fasesDisponibles[0].id
      return null
    }

    // ✅ Crear EDTs usando asignación pre-configurada por faseDefault de categorías
    console.log('🏗️ GENERACIÓN EDTS - Usando faseDefault pre-configurada de categorías')

    // Crear mapa de EDTs por fase para FS+0
    const edtsPorFase = new Map<string, Array<{categoriaId: string, categoriaNombre: string, horasTotales: number, servicios: any[]}>>()

    // Agrupar categorías por fase asignada
    for (const [categoriaId, serviciosCategoria] of serviciosPorCategoria.entries()) {
      const categoriaObj = categorias.find((cat: any) => cat.id === categoriaId)
      const categoriaInfo = categoriaNombresMap.get(categoriaId)
      const categoriaNombre = categoriaInfo?.nombre || categoriaId

      // Calcular horas totales
      const horasTotales = serviciosCategoria.reduce((sum: number, servicio: any) =>
        sum + servicio.cotizacionServicioItem.reduce((itemSum: number, item: any) => itemSum + (item.horaTotal || 0), 0), 0
      )

      // ✅ Determinar fase usando faseDefault pre-configurada
      let faseAsignadaId: string | null = null

      if (categoriaObj?.faseDefault) {
        // Buscar la fase de cotización que corresponde a la faseDefault del sistema
        const faseCotizacion = fasesConfig.find(f =>
          f.nombre.toLowerCase() === categoriaObj.faseDefault.nombre.toLowerCase()
        )
        if (faseCotizacion) {
          faseAsignadaId = faseCotizacion.id
          console.log(`🎯 EDT "${categoriaNombre}" asignado a fase "${faseCotizacion.nombre}" (por faseDefault)`)
        }
      }

      // Si no hay faseDefault, asignar a la primera fase disponible (fallback)
      if (!faseAsignadaId && fasesConfig.length > 0) {
        faseAsignadaId = fasesConfig[0].id
        console.log(`⚠️ EDT "${categoriaNombre}" asignado a primera fase disponible (sin faseDefault)`)
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

    // ✅ Generar EDTs por fase con FS+0 entre EDTs hermanos
    for (const fase of fasesConfig) {
      const edtsDeFase = edtsPorFase.get(fase.id) || []
      if (edtsDeFase.length === 0) continue

      console.log(`🏗️ Generando ${edtsDeFase.length} EDTs para fase: ${fase.nombre}`)

      const faseInicio = new Date(fase.fechaInicioPlan)
      let currentEdtStart = ajustarFechaADiaLaborable(new Date(faseInicio), calendarioLaboral)

      for (const edtInfo of edtsDeFase) {
        // Calcular duración basada en horas
        const duracionDias = edtInfo.horasTotales > 0
          ? Math.ceil(edtInfo.horasTotales / calendarioLaboral.horasPorDia)
          : duracionesConfig.edt.duracionDias

        // Calcular fechas con calendario
        const fechaInicioEdt = new Date(currentEdtStart)
        const fechaFinEdt = calcularFechaFinConCalendario(fechaInicioEdt, duracionDias * calendarioLaboral.horasPorDia, calendarioLaboral)

        // ✅ No limitar inicialmente - dejar que el roll-up extienda la fase
        const fechaFinLimitada = fechaFinEdt

        const servicioReferencia = edtInfo.servicios[0]

        const existingEdt = await prisma.cotizacionEdt.findFirst({
          where: { cotizacionId, nombre: edtInfo.categoriaNombre }
        })

        if (existingEdt) {
          await prisma.cotizacionEdt.update({
            where: { id: existingEdt.id },
            data: {
              cotizacionFaseId: fase.id,
              horasEstimadas: edtInfo.horasTotales,
              fechaInicioComercial: fechaInicioEdt.toISOString(),
              fechaFinComercial: fechaFinLimitada.toISOString()
            }
          })
          console.log(`📅 EDT actualizado: ${edtInfo.categoriaNombre} (${fechaInicioEdt.toISOString().split('T')[0]} - ${fechaFinLimitada.toISOString().split('T')[0]}) - ${edtInfo.horasTotales}h`)
        } else {
          await prisma.cotizacionEdt.create({
            data: {
              id: crypto.randomUUID(),
              cotizacionId,
              cotizacionServicioId: servicioReferencia.id,
              cotizacionFaseId: fase.id,
              nombre: edtInfo.categoriaNombre,
              descripcion: `EDT generado automáticamente para categoría ${edtInfo.categoriaNombre}`,
              horasEstimadas: edtInfo.horasTotales,
              fechaInicioComercial: fechaInicioEdt.toISOString(),
              fechaFinComercial: fechaFinLimitada.toISOString(),
              estado: 'planificado',
              prioridad: 'media',
              updatedAt: new Date()
            }
          })
          result.edtsGenerados++
          console.log(`📅 EDT creado: ${edtInfo.categoriaNombre} (${fechaInicioEdt.toISOString().split('T')[0]} - ${fechaFinLimitada.toISOString().split('T')[0]}) - ${edtInfo.horasTotales}h`)
        }

        // ✅ GYS-GEN-01: FS+1 - siguiente EDT inicia al día siguiente laborable
        currentEdtStart = new Date(fechaFinLimitada)
        currentEdtStart.setDate(currentEdtStart.getDate() + 1) // Agregar 1 día
        currentEdtStart = ajustarFechaADiaLaborable(currentEdtStart, calendarioLaboral)
      }
    }
  }

  // 3. Generar Actividades con FS+0 y roll-up de horas exacto
  if (options.generarActividades) {
    console.log('⚙️ GENERACIÓN ACTIVIDADES - FS+0 entre actividades hermanas, horas = suma de tareas')

    // Obtener EDTs existentes con sus fechas actualizadas
    const edts = await prisma.cotizacionEdt.findMany({
      where: { cotizacionId }
    })

    for (const edt of edts) {
      console.log(`⚙️ Generando actividades para EDT: ${edt.nombre}`)

      // Obtener servicios que pertenecen a este EDT
      const serviciosDeEdt = servicios.filter(servicio => {
        const edtId = servicio.edtId
        const edtInfo = categoriaNombresMap.get(edtId)
        const edtNombre = edtInfo?.nombre || servicio.edt?.nombre
        return edtNombre === edt.nombre
      })

      if (serviciosDeEdt.length === 0) continue

      // ✅ GYS-GEN-02: Las actividades deben iniciar cuando inicia el EDT padre
      const edtInicio = new Date(edt.fechaInicioComercial || fechaInicioProyecto)
      let currentActividadStart = ajustarFechaADiaLaborable(new Date(edtInicio), calendarioLaboral)

      console.log(`⚙️ EDT ${edt.nombre} inicia: ${edtInicio.toISOString().split('T')[0]}, actividades iniciarán: ${currentActividadStart.toISOString().split('T')[0]}`)

      // ✅ Ordenar servicios por el campo 'orden' antes de generar actividades
      const serviciosOrdenados = serviciosDeEdt.sort((a: any, b: any) => {
        const ordenA = a.items?.[0]?.orden ?? 0
        const ordenB = b.items?.[0]?.orden ?? 0
        return ordenA - ordenB
      })

      for (const servicio of serviciosOrdenados) {
        const horasServicio = servicio.cotizacionServicioItem.reduce((sum: number, item: any) => sum + (item.horaTotal || 0), 0)

        // Calcular duración basada en horas del servicio
        const duracionDias = horasServicio > 0
          ? Math.ceil(horasServicio / calendarioLaboral.horasPorDia)
          : duracionesConfig.actividad.duracionDias

        // Calcular fechas con calendario
        const fechaInicioActividad = new Date(currentActividadStart)
        const fechaFinActividad = calcularFechaFinConCalendario(fechaInicioActividad, duracionDias * calendarioLaboral.horasPorDia, calendarioLaboral)

        // ✅ No limitar inicialmente - dejar que el roll-up extienda el EDT
        const fechaFinLimitada = fechaFinActividad

        const existingActividad = await prisma.cotizacionActividad.findFirst({
          where: {
            cotizacionEdtId: edt.id,
            nombre: servicio.nombre
          }
        })

        if (existingActividad) {
          await prisma.cotizacionActividad.update({
            where: { id: existingActividad.id },
            data: {
              horasEstimadas: horasServicio,
              fechaInicioComercial: fechaInicioActividad.toISOString(),
              fechaFinComercial: fechaFinLimitada.toISOString()
            }
          })
          console.log(`📅 Actividad actualizada: ${servicio.nombre} (${fechaInicioActividad.toISOString().split('T')[0]} - ${fechaFinLimitada.toISOString().split('T')[0]}) - ${horasServicio}h`)
        } else {
          await prisma.cotizacionActividad.create({
            data: {
              id: crypto.randomUUID(),
              cotizacionEdtId: edt.id,
              nombre: servicio.nombre,
              descripcion: `Actividad generada desde servicio ${servicio.nombre}`,
              horasEstimadas: horasServicio,
              fechaInicioComercial: fechaInicioActividad.toISOString(),
              fechaFinComercial: fechaFinLimitada.toISOString(),
              estado: 'pendiente',
              prioridad: 'media',
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
          result.actividadesGeneradas++
          console.log(`📅 Actividad creada: ${servicio.nombre} (${fechaInicioActividad.toISOString().split('T')[0]} - ${fechaFinLimitada.toISOString().split('T')[0]}) - ${horasServicio}h`)
        }

        // ✅ GYS-GEN-01: FS+0 entre actividades hermanas (mismo día)
        // Para actividades del mismo EDT, inician el mismo día (FS+0)
        // Esto permite paralelismo dentro del EDT
        currentActividadStart = new Date(fechaFinLimitada)
      }

      // ✅ Roll-up: Asegurar que EDT.horasEstimadas = suma de actividades.horasEstimadas
      const actividadesDeEdt = await prisma.cotizacionActividad.findMany({
        where: { cotizacionEdtId: edt.id }
      })

      const horasTotalesActividades = actividadesDeEdt.reduce((sum, act) => sum + Number(act.horasEstimadas || 0), 0)
      const horasEdtActuales = Number(edt.horasEstimadas || 0)

      if (horasTotalesActividades !== horasEdtActuales) {
        await prisma.cotizacionEdt.update({
          where: { id: edt.id },
          data: { horasEstimadas: horasTotalesActividades }
        })
        console.log(`🔄 Roll-up EDT: ${edt.nombre} horas ajustadas de ${horasEdtActuales}h a ${horasTotalesActividades}h`)
      }
    }
  }

  // 4. Generar Tareas con FS+0 y roll-up de horas exacto
  if (options.generarTareas) {
    console.log('🔧 GENERACIÓN TAREAS - FS+0 entre tareas hermanas, horas = suma exacta de items')

    // Obtener actividades existentes con sus fechas actualizadas
    const actividades = await prisma.cotizacionActividad.findMany({
      where: {
        cotizacionEdt: {
          cotizacionId
        }
      }
    })

    for (const actividad of actividades) {
      console.log(`🔧 Generando tareas para actividad: ${actividad.nombre}`)

      // Obtener items del servicio correspondiente a esta actividad
      const servicioCorrespondiente = servicios.find(s => s.nombre === actividad.nombre)
      if (!servicioCorrespondiente || !servicioCorrespondiente.cotizacionServicioItem) continue

      // ✅ GYS-GEN-02: Las tareas deben iniciar cuando inicia la actividad padre
      const actividadInicio = new Date(actividad.fechaInicioComercial || fechaInicioProyecto)
      let currentTareaStart = ajustarFechaADiaLaborable(new Date(actividadInicio), calendarioLaboral)

      console.log(`🔧 Actividad ${actividad.nombre} inicia: ${actividadInicio.toISOString().split('T')[0]}, tareas iniciarán: ${currentTareaStart.toISOString().split('T')[0]}`)

      // ✅ Ordenar items por el campo 'orden' antes de generar tareas
      const itemsOrdenados = servicioCorrespondiente.cotizacionServicioItem.sort((a: any, b: any) => {
        const ordenA = a.orden ?? 0
        const ordenB = b.orden ?? 0
        return ordenA - ordenB
      })

      for (const item of itemsOrdenados) {
        // Calcular duración basada en horas del item
        const duracionDias = item.horaTotal > 0
          ? Math.ceil(item.horaTotal / calendarioLaboral.horasPorDia)
          : duracionesConfig.tarea.duracionDias

        // Calcular fechas con calendario
        const fechaInicioTarea = new Date(currentTareaStart)
        const fechaFinTarea = calcularFechaFinConCalendario(fechaInicioTarea, duracionDias * calendarioLaboral.horasPorDia, calendarioLaboral)

        // ✅ No limitar inicialmente - dejar que el roll-up extienda la actividad
        const fechaFinLimitada = fechaFinTarea

        const existingTarea = await prisma.cotizacionTarea.findFirst({
          where: {
            cotizacionActividadId: actividad.id,
            nombre: item.nombre
          }
        })

        if (existingTarea) {
          await prisma.cotizacionTarea.update({
            where: { id: existingTarea.id },
            data: {
              fechaInicio: fechaInicioTarea.toISOString(),
              fechaFin: fechaFinLimitada.toISOString(),
              horasEstimadas: item.horaTotal
            }
          })
          console.log(`📅 Tarea actualizada: ${item.nombre} (${fechaInicioTarea.toISOString().split('T')[0]} - ${fechaFinLimitada.toISOString().split('T')[0]}) - ${item.horaTotal}h`)
        } else {
          await prisma.cotizacionTarea.create({
            data: {
              id: crypto.randomUUID(),
              cotizacionActividadId: actividad.id,
              cotizacionServicioItemId: item.id,
              nombre: item.nombre,
              descripcion: item.descripcion || `Tarea generada desde item ${item.nombre}`,
              fechaInicio: fechaInicioTarea.toISOString(),
              fechaFin: fechaFinLimitada.toISOString(),
              horasEstimadas: item.horaTotal,
              estado: 'pendiente',
              prioridad: 'media',
              updatedAt: new Date()
            }
          })
          result.tareasGeneradas++
          console.log(`📅 Tarea creada: ${item.nombre} (${fechaInicioTarea.toISOString().split('T')[0]} - ${fechaFinLimitada.toISOString().split('T')[0]}) - ${item.horaTotal}h`)
        }

        // ✅ GYS-GEN-01: FS+0 entre tareas hermanas (mismo día para paralelismo)
        // Para tareas de la misma actividad, inician el mismo día (FS+0)
        // Esto permite paralelismo dentro de la actividad
        currentTareaStart = new Date(fechaFinLimitada)
      }

      // ✅ Roll-up: Asegurar que Actividad.horasEstimadas = suma de tareas.horasEstimadas
      const tareasDeActividad = await prisma.cotizacionTarea.findMany({
        where: { cotizacionActividadId: actividad.id }
      })

      const horasTotalesTareas = tareasDeActividad.reduce((sum, tarea) => sum + Number(tarea.horasEstimadas || 0), 0)
      const horasActividadActuales = Number(actividad.horasEstimadas || 0)

      if (horasTotalesTareas !== horasActividadActuales) {
        await prisma.cotizacionActividad.update({
          where: { id: actividad.id },
          data: { horasEstimadas: horasTotalesTareas }
        })
        console.log(`🔄 Roll-up Actividad: ${actividad.nombre} horas ajustadas de ${horasActividadActuales}h a ${horasTotalesTareas}h`)
      }
    }
  }

  // ✅ GYS-GEN-15: Fase 10 - Roll-up Final con logs detallados
  console.log('🔄 GYS-GEN-15: FASE 10 - ROLL-UP FINAL - Extender padres por hijos re-secuenciados')

  // Roll-up EDTs por actividades
  const allEdts = await prisma.cotizacionEdt.findMany({
    where: { cotizacionId },
    include: { cotizacionActividad: true }
  })

  console.log('🔄 GYS-GEN-15: Roll-up EDTs por actividades')
  for (const edt of allEdts) {
    if (edt.cotizacionActividad.length > 0) {
      const fechasActividades = edt.cotizacionActividad.map(act => ({
        nombre: act.nombre,
        fin: act.fechaFinComercial ? new Date(act.fechaFinComercial) : null
      })).filter(f => f.fin)

      if (fechasActividades.length > 0) {
        const maxFechaFinActividad = fechasActividades.reduce((max, act) =>
          act.fin! > max ? act.fin! : max, fechasActividades[0].fin!
        )

        const edtFechaFinActual = new Date(edt.fechaFinComercial || edt.fechaInicioComercial || fechaInicioProyecto)
        console.log(`🔄 EDT ${edt.nombre}: fecha actual ${edtFechaFinActual.toISOString().split('T')[0]}, actividades terminan hasta ${maxFechaFinActividad.toISOString().split('T')[0]}`)

        if (maxFechaFinActividad > edtFechaFinActual) {
          await prisma.cotizacionEdt.update({
            where: { id: edt.id },
            data: { fechaFinComercial: maxFechaFinActividad.toISOString() }
          })
          console.log(`📅 EDT extendido: ${edt.nombre} -> ${maxFechaFinActividad.toISOString().split('T')[0]}`)
        } else {
          console.log(`✅ EDT ${edt.nombre} ya está extendido correctamente`)
        }
      }
    } else {
      console.log(`⚠️ EDT ${edt.nombre} no tiene actividades`)
    }
  }

  // Roll-up actividades por tareas
  const allActividades = await prisma.cotizacionActividad.findMany({
    where: { cotizacionEdt: { cotizacionId } },
    include: { cotizacionTarea: true }
  })

  console.log('🔄 GYS-GEN-15: Roll-up actividades por tareas')
  for (const actividad of allActividades) {
    if (actividad.cotizacionTarea.length > 0) {
      const fechasTareas = actividad.cotizacionTarea.map(tarea => ({
        nombre: tarea.nombre,
        fin: tarea.fechaFin ? new Date(tarea.fechaFin) : null
      })).filter(f => f.fin)

      if (fechasTareas.length > 0) {
        const maxFechaFinTarea = fechasTareas.reduce((max, tarea) =>
          tarea.fin! > max ? tarea.fin! : max, fechasTareas[0].fin!
        )

        const actividadFechaFinActual = new Date(actividad.fechaFinComercial || actividad.fechaInicioComercial || fechaInicioProyecto)
        console.log(`🔄 Actividad ${actividad.nombre}: fecha actual ${actividadFechaFinActual.toISOString().split('T')[0]}, tareas terminan hasta ${maxFechaFinTarea.toISOString().split('T')[0]}`)

        if (maxFechaFinTarea > actividadFechaFinActual) {
          await prisma.cotizacionActividad.update({
            where: { id: actividad.id },
            data: { fechaFinComercial: maxFechaFinTarea.toISOString() }
          })
          console.log(`📅 Actividad extendida: ${actividad.nombre} -> ${maxFechaFinTarea.toISOString().split('T')[0]}`)
        } else {
          console.log(`✅ Actividad ${actividad.nombre} ya está extendida correctamente`)
        }
      }
    } else {
      console.log(`⚠️ Actividad ${actividad.nombre} no tiene tareas`)
    }
  }

  // Roll-up fases por EDTs
  console.log('🔄 GYS-GEN-15: Roll-up fases por EDTs')
  for (const fase of fasesConfig) {
    const edtsDeFase = await prisma.cotizacionEdt.findMany({
      where: { cotizacionFaseId: fase.id }
    })

    if (edtsDeFase.length > 0) {
      const fechasEdts = edtsDeFase.map(edt => ({
        nombre: edt.nombre,
        fin: edt.fechaFinComercial ? new Date(edt.fechaFinComercial) : null
      })).filter(f => f.fin)

      if (fechasEdts.length > 0) {
        const maxFechaFinEdt = fechasEdts.reduce((max, edt) =>
          edt.fin! > max ? edt.fin! : max, fechasEdts[0].fin!
        )

        const faseFechaFinActual = new Date(fase.fechaFinPlan || fase.fechaInicioPlan || fechaInicioProyecto)
        console.log(`🔄 Fase ${fase.nombre}: fecha actual ${faseFechaFinActual.toISOString().split('T')[0]}, EDTs terminan hasta ${maxFechaFinEdt.toISOString().split('T')[0]}`)

        if (maxFechaFinEdt > faseFechaFinActual) {
          await prisma.cotizacionFase.update({
            where: { id: fase.id },
            data: { fechaFinPlan: maxFechaFinEdt.toISOString() }
          })
          console.log(`📅 Fase extendida: ${fase.nombre} -> ${maxFechaFinEdt.toISOString().split('T')[0]}`)
        } else {
          console.log(`✅ Fase ${fase.nombre} ya está extendida correctamente`)
        }
      }
    } else {
      console.log(`⚠️ Fase ${fase.nombre} no tiene EDTs`)
    }
  }

  // ✅ GYS-GEN-15: Fase 11 - Re-secuenciación Final con FS+1 Obligatorio
  console.log('🔄 GYS-GEN-15: FASE 11 - RE-SECUENCIACIÓN FINAL - Garantizar FS+1 después del roll-up final')

  // Obtener todas las fases con sus EDTs después del roll-up
  const fasesConEdts = await prisma.cotizacionFase.findMany({
    where: { cotizacionId },
    include: {
      cotizacionEdt: {
        orderBy: { fechaInicioComercial: 'asc' }
      }
    },
    orderBy: { orden: 'asc' }
  })

  if (fasesConEdts.length > 0) {
    console.log('🔄 GYS-GEN-01: Aplicando FS+1 obligatorio entre fases después del roll-up final')

    let currentStartDate = ajustarFechaADiaLaborable(new Date(fechaInicioProyecto), calendarioLaboral)

    for (let i = 0; i < fasesConEdts.length; i++) {
      const fase = fasesConEdts[i]
      const edtsDeFase = fase.cotizacionEdt

      // ✅ GYS-GEN-01: Calcular nueva fecha de inicio con FS+1
      const nuevaFechaInicioFase = new Date(currentStartDate)

      if (edtsDeFase.length === 0) {
        // Fase sin EDTs: usar duración por defecto
        const faseDuracion = fasesConfigConDuraciones.find(f => f.nombre === fase.nombre)
        const duracionDias = faseDuracion?.duracionDias || 30
        const nuevaFechaFinFase = calcularFechaFinConCalendario(nuevaFechaInicioFase, duracionDias * calendarioLaboral.horasPorDia, calendarioLaboral)

        await prisma.cotizacionFase.update({
          where: { id: fase.id },
          data: {
            fechaInicioPlan: nuevaFechaInicioFase.toISOString(),
            fechaFinPlan: nuevaFechaFinFase.toISOString()
          }
        })

        console.log(`🔄 GYS-GEN-01: Fase sin hijos re-secuenciada: ${fase.nombre} (${nuevaFechaInicioFase.toISOString().split('T')[0]} - ${nuevaFechaFinFase.toISOString().split('T')[0]}) - ${duracionDias} días`)

        // Preparar fecha para siguiente fase (FS+1)
        currentStartDate = ajustarFechaADiaLaborable(new Date(nuevaFechaFinFase.getTime() + 24 * 60 * 60 * 1000), calendarioLaboral)
      } else {
        // Fase con EDTs: desplazar todos los EDTs para mantener FS+1
        const primeraFechaEdt = edtsDeFase[0]?.fechaInicioComercial
        if (primeraFechaEdt) {
          const fechaActualEdt = new Date(primeraFechaEdt)
          const diferenciaMs = nuevaFechaInicioFase.getTime() - fechaActualEdt.getTime()
          const diasDesplazamiento = Math.round(diferenciaMs / (24 * 60 * 60 * 1000))

          if (Math.abs(diferenciaMs) > 1000) { // Solo desplazar si hay diferencia significativa
            console.log(`🔄 GYS-GEN-01: Desplazando EDTs de fase ${fase.nombre} por ${diasDesplazamiento} días para mantener FS+1`)

            // Desplazar todos los EDTs de esta fase y sus actividades/tareas hijas
            for (const edt of edtsDeFase) {
              if (edt.fechaInicioComercial && edt.fechaFinComercial) {
                const nuevaFechaInicioEdt = new Date(new Date(edt.fechaInicioComercial).getTime() + diferenciaMs)
                const nuevaFechaFinEdt = new Date(new Date(edt.fechaFinComercial).getTime() + diferenciaMs)

                await prisma.cotizacionEdt.update({
                  where: { id: edt.id },
                  data: {
                    fechaInicioComercial: nuevaFechaInicioEdt.toISOString(),
                    fechaFinComercial: nuevaFechaFinEdt.toISOString()
                  }
                })

                console.log(`🔄 EDT re-secuenciado: ${edt.nombre} (${nuevaFechaInicioEdt.toISOString().split('T')[0]} - ${nuevaFechaFinEdt.toISOString().split('T')[0]})`)

                // ✅ Desplazar también las actividades hijas del EDT
                const actividadesDeEdt = await prisma.cotizacionActividad.findMany({
                  where: { cotizacionEdtId: edt.id }
                })

                for (const actividad of actividadesDeEdt) {
                  if (actividad.fechaInicioComercial && actividad.fechaFinComercial) {
                    const nuevaFechaInicioAct = new Date(new Date(actividad.fechaInicioComercial).getTime() + diferenciaMs)
                    const nuevaFechaFinAct = new Date(new Date(actividad.fechaFinComercial).getTime() + diferenciaMs)

                    await prisma.cotizacionActividad.update({
                      where: { id: actividad.id },
                      data: {
                        fechaInicioComercial: nuevaFechaInicioAct.toISOString(),
                        fechaFinComercial: nuevaFechaFinAct.toISOString()
                      }
                    })

                    console.log(`🔄 Actividad re-secuenciada: ${actividad.nombre} (${nuevaFechaInicioAct.toISOString().split('T')[0]} - ${nuevaFechaFinAct.toISOString().split('T')[0]})`)

                    // ✅ Desplazar también las tareas hijas de la actividad
                    const tareasDeActividad = await prisma.cotizacionTarea.findMany({
                      where: { cotizacionActividadId: actividad.id }
                    })

                    for (const tarea of tareasDeActividad) {
                      if (tarea.fechaInicio && tarea.fechaFin) {
                        const nuevaFechaInicioTarea = new Date(new Date(tarea.fechaInicio).getTime() + diferenciaMs)
                        const nuevaFechaFinTarea = new Date(new Date(tarea.fechaFin).getTime() + diferenciaMs)

                        await prisma.cotizacionTarea.update({
                          where: { id: tarea.id },
                          data: {
                            fechaInicio: nuevaFechaInicioTarea.toISOString(),
                            fechaFin: nuevaFechaFinTarea.toISOString()
                          }
                        })

                        console.log(`🔄 Tarea re-secuenciada: ${tarea.nombre} (${nuevaFechaInicioTarea.toISOString().split('T')[0]} - ${nuevaFechaFinTarea.toISOString().split('T')[0]})`)
                      }
                    }
                  }
                }
              }
            }

            // Calcular nueva fecha fin de la fase (fecha fin del último EDT)
            const ultimoEdt = edtsDeFase[edtsDeFase.length - 1]
            const nuevaFechaFinFase = ultimoEdt?.fechaFinComercial
              ? new Date(new Date(ultimoEdt.fechaFinComercial).getTime() + diferenciaMs)
              : nuevaFechaInicioFase

            await prisma.cotizacionFase.update({
              where: { id: fase.id },
              data: {
                fechaInicioPlan: nuevaFechaInicioFase.toISOString(),
                fechaFinPlan: nuevaFechaFinFase.toISOString()
              }
            })

            console.log(`🔄 GYS-GEN-01: Fase con hijos re-secuenciada: ${fase.nombre} (${nuevaFechaInicioFase.toISOString().split('T')[0]} - ${nuevaFechaFinFase.toISOString().split('T')[0]})`)

            // Preparar fecha para siguiente fase (FS+1)
            currentStartDate = ajustarFechaADiaLaborable(new Date(nuevaFechaFinFase.getTime() + 24 * 60 * 60 * 1000), calendarioLaboral)
          } else {
            // Las fechas ya están correctas
            const maxFechaFinEdt = edtsDeFase.reduce((max, edt) =>
              edt.fechaFinComercial && new Date(edt.fechaFinComercial) > max ? new Date(edt.fechaFinComercial) : max,
              new Date(edtsDeFase[0]?.fechaFinComercial || nuevaFechaInicioFase)
            )

            await prisma.cotizacionFase.update({
              where: { id: fase.id },
              data: {
                fechaInicioPlan: nuevaFechaInicioFase.toISOString(),
                fechaFinPlan: maxFechaFinEdt.toISOString()
              }
            })

            console.log(`🔄 GYS-GEN-01: Fase con hijos ya correcta: ${fase.nombre} (${nuevaFechaInicioFase.toISOString().split('T')[0]} - ${maxFechaFinEdt.toISOString().split('T')[0]})`)

            // Preparar fecha para siguiente fase (FS+1)
            currentStartDate = ajustarFechaADiaLaborable(new Date(maxFechaFinEdt.getTime() + 24 * 60 * 60 * 1000), calendarioLaboral)
          }
        } else {
          // Fallback si no hay fechas en EDTs
          const faseDuracion = fasesConfigConDuraciones.find(f => f.nombre === fase.nombre)
          const duracionDias = faseDuracion?.duracionDias || 30
          const nuevaFechaFinFase = calcularFechaFinConCalendario(nuevaFechaInicioFase, duracionDias * calendarioLaboral.horasPorDia, calendarioLaboral)

          await prisma.cotizacionFase.update({
            where: { id: fase.id },
            data: {
              fechaInicioPlan: nuevaFechaInicioFase.toISOString(),
              fechaFinPlan: nuevaFechaFinFase.toISOString()
            }
          })

          console.log(`🔄 GYS-GEN-01: Fase con hijos (fallback): ${fase.nombre} (${nuevaFechaInicioFase.toISOString().split('T')[0]} - ${nuevaFechaFinFase.toISOString().split('T')[0]}) - ${duracionDias} días`)

          // Preparar fecha para siguiente fase (FS+1)
          currentStartDate = ajustarFechaADiaLaborable(new Date(nuevaFechaFinFase.getTime() + 24 * 60 * 60 * 1000), calendarioLaboral)
        }
      }
    }

    console.log('✅ GYS-GEN-01: Re-secuenciación FS+1 completada para todas las fases')
  }

  // ✅ GYS-GEN-16: Ejecutar roll-up final de horas para asegurar consistencia
  console.log('🔄 GYS-GEN-16: Ejecutando roll-up final de horas')
  const rollupResult = await ejecutarRollupHoras(cotizacionId)
  if (rollupResult.correcciones.length > 0) {
    console.log('✅ Roll-up completado:', rollupResult.correcciones)
  }

  // 🔗 Aplicar dependencias avanzadas definidas por usuario después del roll-up final (solo si está habilitado)
  if (options.aplicarDependencias) {
    console.log('🔗 Aplicando dependencias avanzadas definidas por usuario')
    try {
      const { aplicarDependenciasAFechas } = await import('@/lib/services/cotizacionDependencias')

      // Aplicar dependencias a fechas calculadas
      const correccionesDependencias = await aplicarDependenciasAFechas(cotizacionId, calendarioLaboral)
      if (correccionesDependencias.length > 0) {
        console.log('✅ Dependencias aplicadas:', correccionesDependencias)
      }
    } catch (error) {
      console.warn('⚠️ Error aplicando dependencias avanzadas:', error)
      // No fallar la generación si las dependencias fallan
    }
  }

  // 🔗 Aplicar dependencias personalizadas del editor visual (React Flow)
  if (options.opciones?.dependenciasPersonalizadas && options.opciones.dependenciasPersonalizadas.length > 0) {
    console.log('🔗 Aplicando dependencias personalizadas del editor visual')
    try {
      // Crear dependencias en BD desde las definidas en React Flow
      for (const dep of options.opciones.dependenciasPersonalizadas) {
        const existingDep = await prisma.cotizacionDependenciasTarea.findFirst({
          where: {
            tareaOrigenId: dep.tareaOrigenId,
            tareaDependienteId: dep.tareaDependienteId
          }
        })

        if (!existingDep) {
          await prisma.cotizacionDependenciasTarea.create({
            data: {
              id: crypto.randomUUID(),
              tareaOrigenId: dep.tareaOrigenId,
              tareaDependienteId: dep.tareaDependienteId,
              tipo: dep.tipo as any,
              lagMinutos: dep.lagMinutos || 0,
              createdAt: new Date(),
              updatedAt: new Date()
            }
          })
          console.log(`🔗 Dependencia creada: ${dep.tareaOrigenId} → ${dep.tareaDependienteId} (${dep.tipo})`)
        } else {
          console.log(`⚠️ Dependencia ya existe: ${dep.tareaOrigenId} → ${dep.tareaDependienteId}`)
        }
      }

      // Aplicar las dependencias recién creadas
      const { aplicarDependenciasAFechas } = await import('@/lib/services/cotizacionDependencias')
      const correccionesDependencias = await aplicarDependenciasAFechas(cotizacionId, calendarioLaboral)
      if (correccionesDependencias.length > 0) {
        console.log('✅ Dependencias visuales aplicadas:', correccionesDependencias)
      }

      // Verificar que las dependencias se guardaron en BD
      const dependenciasGuardadas = await prisma.cotizacionDependenciasTarea.findMany({
        where: { tareaOrigenId: { in: options.opciones.dependenciasPersonalizadas.map((d: any) => d.tareaOrigenId) } },
        include: {
          tareaOrigen: { select: { nombre: true } },
          tareaDependiente: { select: { nombre: true } }
        }
      })
      console.log(`📊 DEPENDENCIAS GUARDADAS EN BD: ${dependenciasGuardadas.length}`)
    } catch (error) {
      console.warn('⚠️ Error aplicando dependencias visuales:', error)
      // No fallar la generación si las dependencias fallan
    }
  }

  // 🎯 Identificar hitos automáticamente (solo si está habilitado)
  if (options.identificarHitos) {
    console.log('🎯 Identificando hitos automáticamente')
    try {
      const { identificarHitosAutomaticamente } = await import('@/lib/services/cotizacionDependencias')

      const hitosIdentificados = await identificarHitosAutomaticamente(cotizacionId)
      if (hitosIdentificados.length > 0) {
        console.log('🎯 Hitos identificados:', hitosIdentificados)
      }
    } catch (error) {
      console.warn('⚠️ Error identificando hitos:', error)
      // No fallar la generación si la identificación de hitos falla
    }
  }

  result.totalElements = result.fasesGeneradas + result.edtsGenerados + result.actividadesGeneradas + result.tareasGeneradas

  return result
}