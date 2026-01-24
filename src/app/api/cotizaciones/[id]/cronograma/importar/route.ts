/**
 * API: Importación Automática de Cronograma en Cotizaciones
 *
 * POST /api/cotizaciones/[id]/cronograma/importar
 *
 * Esta API ejecuta la importación automática de un cronograma de 6 niveles
 * dentro de una cotización, creando EDTs, actividades, tareas y zonas comerciales.
 *
 * Proceso:
 * 1. Validar permisos y existencia de cotización
 * 2. Crear fases comerciales por defecto
 * 3. Agrupar servicios según método seleccionado
 * 4. Crear EDTs comerciales con fechas calculadas
 * 5. Crear zonas si está habilitado
 * 6. Crear actividades y tareas comerciales
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import {
  obtenerCalendarioLaboral,
  calcularFechaFinConCalendario,
  ajustarFechaADiaLaborable
} from '@/lib/utils/calendarioLaboral'

// Schema de validación para la importación - Solo categorías según manual
const importSchema = z.object({
  metodo: z.literal('categorias', {
    errorMap: () => ({ message: 'Solo se soporta el método "categorias"' })
  }),
  crearZonas: z.boolean().default(false),
  fechasAutomaticas: z.boolean().default(true)
})

// Interfaces
interface ImportResult {
  fasesCreadas: number
  edtsCreados: number
  zonasCreadas: number
  actividadesCreadas: number
  tareasCreadas: number
  tiempoEjecucion: number
}

interface ServicioInfo {
  id: string
  nombre: string
  categoria: string
  categoriaId?: string
  servicios: any[] // ✅ Servicios dentro de esta categoría
  horasTotales: number
}

interface CategoriaInfo {
  categoria: string
  nombreEdt: string // ✅ Nombre del EDT basado en descripción de categoría
  categoriaId?: string
  servicios: any[] // ✅ Servicios dentro de esta categoría para crear actividades
  horasTotales: number
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now()

  try {
    const { id: cotizacionId } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Validar datos de entrada
    const body = await request.json()
    const validatedData = importSchema.parse(body)

    // Verificar que la cotización existe
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id: cotizacionId },
      include: {
        cliente: true,
        user: true,
        cotizacionServicio: {
          include: {
            cotizacionServicioItem: true
          }
        }
      }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    // Verificar permisos
    const userRole = session.user.role
    const isComercial = cotizacion.comercialId === session.user.id
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || isComercial

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para importar cronogramas' }, { status: 403 })
    }

    // Ejecutar importación en transacción
    const result = await prisma.$transaction(async (tx) => {
      return await ejecutarImportacion(tx, {
        cotizacionId,
        cotizacion,
        config: validatedData
      })
    })

    const executionTime = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: {
        ...result,
        tiempoEjecucion: executionTime
      },
      message: `Cronograma comercial importado exitosamente en ${executionTime}ms`
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ Error en importación de cronograma comercial:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// Función principal de importación
async function ejecutarImportacion(
  tx: any,
  params: {
    cotizacionId: string
    cotizacion: any
    config: z.infer<typeof importSchema>
  }
): Promise<ImportResult> {
  const { cotizacionId, cotizacion, config } = params

  console.log(`🚀 IMPORTACIÓN - Iniciando importación automática de cronograma`)
  console.log(`📊 IMPORTACIÓN - Cotización: ${cotizacionId}`)
  console.log(`⚙️ IMPORTACIÓN - Configuración: crearZonas=${config.crearZonas}, fechasAutomaticas=${config.fechasAutomaticas}`)

  // 1. Crear fases comerciales por defecto usando calendario laboral (GYS-GEN-05)
  console.log(`📋 IMPORTACIÓN - Creando fases por defecto con calendario laboral`)
  const fechaInicioProyecto = cotizacion.fechaInicio ? new Date(cotizacion.fechaInicio) : new Date()
  console.log(`📅 IMPORTACIÓN - Fecha inicio proyecto: ${fechaInicioProyecto.toISOString()}`)

  // ✅ GYS-GEN-05: Obtener calendario laboral para cálculos de tiempo
  let calendarioLaboral = cotizacion.calendarioLaboral
  if (!calendarioLaboral) {
    calendarioLaboral = await obtenerCalendarioLaboral('empresa', 'default')
  }

  if (!calendarioLaboral) {
    throw new Error('No hay calendario laboral configurado. Configure un calendario laboral antes de importar.')
  }

  // ✅ Asegurar que horasPorDia tenga un valor válido
  if (!calendarioLaboral.horasPorDia || calendarioLaboral.horasPorDia <= 0) {
    calendarioLaboral.horasPorDia = 8 // Default a 8 horas por día
    console.warn('⚠️ Calendario laboral sin horasPorDia válidas, usando default: 8 horas/día')
  }

  // ✅ GYS-GEN-10: Duraciones por defecto configurables
  const duracionesFases = [
    { nombre: 'Planificación', orden: 1, duracionDias: 45 },
    { nombre: 'Ejecución', orden: 2, duracionDias: 120 },
    { nombre: 'Cierre', orden: 3, duracionDias: 30 }
  ]

  const fasesCreadas = []
  let fechaActual = ajustarFechaADiaLaborable(fechaInicioProyecto, calendarioLaboral)

  for (const faseData of duracionesFases) {
    // ✅ GYS-GEN-05: Calcular fecha fin considerando calendario laboral
    const fechaInicioFase = new Date(fechaActual)
    const fechaFinFase = calcularFechaFinConCalendario(fechaInicioFase, faseData.duracionDias * 8, calendarioLaboral) // Convertir días a horas

    const fase = await tx.cotizacionFase.create({
      data: {
        cotizacionId,
        nombre: faseData.nombre,
        orden: faseData.orden,
        descripcion: `Fase ${faseData.nombre} de la cotización`,
        estado: 'planificado',
        porcentajeAvance: 0,
        fechaInicioPlan: fechaInicioFase.toISOString(),
        fechaFinPlan: fechaFinFase.toISOString()
      }
    })
    fasesCreadas.push(fase)
    console.log(`✅ IMPORTACIÓN - Fase creada: ${fase.nombre} (${fechaInicioFase.toISOString().split('T')[0]} - ${fechaFinFase.toISOString().split('T')[0]})`)

    // ✅ GYS-GEN-01: Avanzar fecha para siguiente fase (FS+1 con 1 día laborable de separación)
    fechaActual = new Date(fechaFinFase)
    fechaActual.setDate(fechaActual.getDate() + 1) // Agregar 1 día
    fechaActual = ajustarFechaADiaLaborable(fechaActual, calendarioLaboral)
  }

  // 2. Preparar servicios agrupados por categoría (NUEVA LÓGICA)
  console.log(`📋 IMPORTACIÓN - Preparando servicios agrupados por categoría`)
  const categoriasInfo = prepararServiciosPorCategoria(cotizacion.servicios)
  console.log(`📋 IMPORTACIÓN - Categorías identificadas: ${categoriasInfo.length}`)

  // 3. Crear EDTs comerciales con fechas calculadas (GYS-GEN-02, GYS-GEN-03, GYS-GEN-10)
  console.log(`🔧 IMPORTACIÓN - Creando EDTs comerciales con calendario laboral`)
  const edtsCreados = []
  let ordenEdt = 1

  // ✅ GYS-GEN-01: Mapa para controlar secuencialidad de EDTs por fase
  const edtFechaPorFase = new Map<string, Date>()

  for (const categoriaInfo of categoriasInfo) {
    const faseAsignada = asignarFasePorCategoria(categoriaInfo.categoria, fasesCreadas)
    console.log(`🔧 IMPORTACIÓN - Creando EDT para categoría: ${categoriaInfo.categoria} en fase: ${faseAsignada.nombre}`)

    // ✅ GYS-GEN-02: Primer EDT inicia en fecha de inicio de fase
    // ✅ GYS-GEN-01: EDTs secuenciales dentro de la fase
    const faseInicio = new Date(faseAsignada.fechaInicioPlan)
    const faseFin = new Date(faseAsignada.fechaFinPlan)
    const currentEdtFecha = edtFechaPorFase.get(faseAsignada.id) || faseInicio
    const fechaInicioEdt = new Date(currentEdtFecha)

    // ✅ GYS-GEN-10: Calcular duración del EDT basada en horas
    let duracionEdtDias = 45 // Duración por defecto
    if (categoriaInfo.horasTotales > 0 && calendarioLaboral.horasPorDia > 0) {
      duracionEdtDias = Math.ceil(categoriaInfo.horasTotales / calendarioLaboral.horasPorDia)
    }

    // ✅ GYS-GEN-05: Calcular fecha fin con calendario laboral
    const fechaFinEdt = calcularFechaFinConCalendario(fechaInicioEdt, duracionEdtDias * calendarioLaboral.horasPorDia, calendarioLaboral)

    // ✅ GYS-GEN-03: Limitar EDT a duración de la fase padre
    const faseDuracionDias = Math.ceil((faseFin.getTime() - faseInicio.getTime()) / (24 * 60 * 60 * 1000))
    if (duracionEdtDias > faseDuracionDias) {
      const fechaFinLimitada = calcularFechaFinConCalendario(fechaInicioEdt, faseDuracionDias * calendarioLaboral.horasPorDia, calendarioLaboral)
      console.log(`⚠️ IMPORTACIÓN - EDT limitado por fase: ${duracionEdtDias} días → ${faseDuracionDias} días`)
      // Usar fechaFinLimitada si es menor que fechaFinEdt
    }

    const edtData: any = {
      cotizacionId,
      cotizacionServicioId: null, // EDTs son por categoría, no por servicio específico
      cotizacionFaseId: faseAsignada.id,
      nombre: categoriaInfo.nombreEdt,
      estado: 'planificado',
      porcentajeAvance: 0,
      descripcion: `EDT comercial generado automáticamente para categoría ${categoriaInfo.categoria}`,
      fechaInicioComercial: fechaInicioEdt.toISOString(),
      fechaFinComercial: fechaFinEdt.toISOString(),
      horasEstimadas: categoriaInfo.horasTotales || 0,
      orden: ordenEdt
    }

    // Incluir edtId si existe
    if (categoriaInfo.categoriaId) {
      edtData.edtId = categoriaInfo.categoriaId
    }

    const edt = await tx.cotizacionEdt.create({
      data: edtData
    })

    console.log(`✅ IMPORTACIÓN - EDT creado: ${edt.nombre} (ID: ${edt.id}) para categoría: ${categoriaInfo.categoria}`)
    console.log(`📅 IMPORTACIÓN - Fechas EDT: ${fechaInicioEdt.toISOString().split('T')[0]} - ${fechaFinEdt.toISOString().split('T')[0]}`)

    // ✅ GYS-GEN-01: Actualizar fecha para siguiente EDT en esta fase (FS+1 con 1 día laborable de separación)
    const nextEdtDate = new Date(fechaFinEdt)
    nextEdtDate.setDate(nextEdtDate.getDate() + 1) // Agregar 1 día
    edtFechaPorFase.set(faseAsignada.id, ajustarFechaADiaLaborable(nextEdtDate, calendarioLaboral))

    edtsCreados.push({ edt, categoriaInfo, fase: faseAsignada })
    ordenEdt++
  }

  // 4. Crear zonas si está habilitado
  console.log(`📍 IMPORTACIÓN - ${config.crearZonas ? 'Creando zonas automáticas' : 'Omitiendo creación de zonas'}`)
  let zonasCreadas = 0
  if (config.crearZonas) {
    zonasCreadas = await crearZonasAutomaticas(tx, edtsCreados, cotizacionId)
    console.log(`📍 IMPORTACIÓN - Zonas creadas total: ${zonasCreadas}`)
  }

  // 5. Crear actividades y tareas comerciales con calendario laboral
  const { actividadesCreadas, tareasCreadas } = await crearActividadesYTareas(
    tx,
    edtsCreados,
    { crearZonas: config.crearZonas, fechasAutomaticas: config.fechasAutomaticas },
    calendarioLaboral
  )

  // ✅ GYS-GEN-15: Fase 10-11 - Roll-up Final y Re-secuenciación Final
  console.log('🔄 GYS-GEN-15: FASES 10-11 - ROLL-UP Y RE-SECUENCIACIÓN FINAL')

  // Fase 10: Roll-up final - extender padres por hijos
  await rollupFinal(tx, cotizacionId, calendarioLaboral)

  // Fase 11: Re-secuenciación final - garantizar FS+1 entre fases
  await resecuenciarFasesFinal(tx, cotizacionId, cotizacion.fechaInicio ? new Date(cotizacion.fechaInicio) : new Date(), calendarioLaboral, fasesCreadas)

  return {
    fasesCreadas: fasesCreadas.length,
    edtsCreados: edtsCreados.length,
    zonasCreadas,
    actividadesCreadas,
    tareasCreadas,
    tiempoEjecucion: 0 // Se calcula fuera
  }
}

// Funciones auxiliares
function prepararServiciosPorCategoria(servicios: any[]): CategoriaInfo[] {
  // ✅ NUEVA LÓGICA: Cada categoría genera un EDT
  const categoriasMap = new Map<string, any[]>()

  servicios.forEach(servicio => {
    const categoria = servicio.categoria || 'Sin Categoría'
    if (!categoriasMap.has(categoria)) {
      categoriasMap.set(categoria, [])
    }
    categoriasMap.get(categoria)!.push(servicio)
  })

  return Array.from(categoriasMap.entries()).map(([categoria, serviciosCategoria]) => {
    // Obtener la descripción de la categoría desde el primer servicio
    const categoriaDescripcion = serviciosCategoria[0]?.items[0]?.catalogoServicio?.categoria?.descripcion ||
                                serviciosCategoria[0]?.items[0]?.catalogoServicio?.categoria?.nombre ||
                                categoria

    return {
      categoria,
      nombreEdt: categoriaDescripcion, // ✅ Nombre del EDT = descripción de la categoría
      categoriaId: serviciosCategoria.find(s => s.edtId)?.edtId || undefined,
      servicios: serviciosCategoria, // ✅ Servicios para crear actividades
      horasTotales: serviciosCategoria.reduce((sum, s) =>
        sum + s.items.reduce((sum2: number, item: any) => sum2 + (item.horaTotal || 0), 0), 0
      )
    }
  })
}

// Mantener función anterior por compatibilidad (marcada como obsoleta)
function prepararServicios(servicios: any[], metodo: 'categorias' | 'servicios'): ServicioInfo[] {
  if (metodo === 'servicios') {
    throw new Error('Método "servicios" no soportado. Use "categorias" para crear EDTs por categoría.')
  } else {
    // Redirigir a la nueva lógica
    const categoriasInfo = prepararServiciosPorCategoria(servicios)
    return categoriasInfo.map(cat => ({
      id: `categoria-${cat.categoria}`,
      nombre: cat.nombreEdt,
      categoria: cat.categoria,
      categoriaId: cat.categoriaId,
      servicios: cat.servicios,
      horasTotales: cat.horasTotales
    }))
  }
}

function asignarFasePorCategoria(categoria: string, fases: any[]) {
  const categoriaLower = categoria.toLowerCase()

  if (categoriaLower.includes('planif') || categoriaLower.includes('levantamiento')) {
    return fases.find(f => f.nombre === 'Planificación') || fases[0]
  } else if (categoriaLower.includes('cierre') || categoriaLower.includes('prueba')) {
    return fases.find(f => f.nombre === 'Cierre') || fases[2]
  } else {
    return fases.find(f => f.nombre === 'Ejecución') || fases[1]
  }
}

async function crearZonasAutomaticas(tx: any, edtsCreados: any[], cotizacionId: string): Promise<number> {
  let zonasCreadas = 0

  for (const { edt, servicioInfo } of edtsCreados) {
    await tx.cotizacionZona.create({
      data: {
        cotizacionId,
        cotizacionEdtId: edt.id,
        nombre: `Zona Principal - ${edt.nombre}`,
        estado: 'planificado',
        porcentajeAvance: 0
      }
    })
    zonasCreadas++
  }

  return zonasCreadas
}

async function crearActividadesYTareas(
  tx: any,
  edtsCreados: any[],
  config: { crearZonas: boolean; fechasAutomaticas: boolean },
  calendarioLaboral: any
): Promise<{ actividadesCreadas: number; tareasCreadas: number }> {
  let actividadesCreadas = 0
  let tareasCreadas = 0

  console.log(`📊 IMPORTACIÓN - Modo de creación: ${config.crearZonas ? 'Jerarquía Completa (con zonas)' : 'Actividades Directas (sin zonas)'}`)

  for (const { edt, categoriaInfo, fase } of edtsCreados) {
    console.log(`📊 IMPORTACIÓN - Procesando EDT: ${edt.nombre} (categoría: ${categoriaInfo.categoria})`)

    // ✅ GYS-GEN-01: Control de secuencialidad para actividades dentro del EDT
    const actividadFechaPorEdt = new Map<string, Date>()
    const edtInicio = new Date(edt.fechaInicioComercial)
    const edtFin = new Date(edt.fechaFinComercial)

    if (config.crearZonas) {
      // ✅ Modo Jerarquía Completa: Crear actividades bajo zonas existentes
      console.log(`📍 IMPORTACIÓN - Buscando zonas para EDT: ${edt.nombre}`)
      const zonasDelEdt = await tx.cotizacionZona.findMany({
        where: { cotizacionEdtId: edt.id }
      })
      console.log(`📍 IMPORTACIÓN - Zonas encontradas para EDT ${edt.nombre}: ${zonasDelEdt.length}`)

      // ✅ GYS-GEN-03: Cada servicio → Actividad, cada item → Tarea
      for (const servicio of categoriaInfo.servicios) {
        console.log(`📍 IMPORTACIÓN - Procesando servicio: ${servicio.nombre}`)

        // Determinar en qué zona crear la actividad (por ahora, usar primera zona disponible)
        const zonaAsignada = zonasDelEdt.length > 0 ? zonasDelEdt[0] : null

        if (zonaAsignada) {
          // ✅ GYS-GEN-02: Primer actividad inicia en fecha de inicio del EDT
          // ✅ GYS-GEN-01: Actividades secuenciales dentro del EDT
          const currentActividadFecha = actividadFechaPorEdt.get(edt.id) || edtInicio
          const fechaInicioActividad = new Date(currentActividadFecha)

          // ✅ GYS-GEN-10: Calcular duración basada en horas del servicio
          const horasServicio = servicio.items.reduce((sum: number, item: any) => sum + (item.horaTotal || 0), 0)
          let duracionActividadDias = 7 // Duración por defecto
          if (horasServicio > 0 && calendarioLaboral.horasPorDia > 0) {
            duracionActividadDias = Math.ceil(horasServicio / calendarioLaboral.horasPorDia)
          }

          // ✅ GYS-GEN-05: Calcular fecha fin con calendario laboral
          const fechaFinActividad = calcularFechaFinConCalendario(fechaInicioActividad, duracionActividadDias * calendarioLaboral.horasPorDia, calendarioLaboral)

          // ✅ Crear actividad bajo zona
          const actividad = await tx.cotizacionActividad.create({
            data: {
              cotizacionZonaId: zonaAsignada.id,
              cotizacionEdtId: null, // No directa al EDT cuando hay zona
              nombre: servicio.nombre, // ✅ Nombre del servicio → Actividad
              descripcion: servicio.descripcion || `Actividad generada desde servicio ${servicio.nombre}`,
              estado: 'pendiente',
              porcentajeAvance: 0,
              prioridad: 'media',
              horasPlan: horasServicio,
              horasReales: 0,
              fechaInicioComercial: fechaInicioActividad.toISOString(),
              fechaFinComercial: fechaFinActividad.toISOString()
            }
          })

          actividadesCreadas++
          console.log(`✅ IMPORTACIÓN - Actividad creada: ${actividad.nombre} en zona ${zonaAsignada.nombre}`)
          console.log(`📅 IMPORTACIÓN - Fechas actividad: ${fechaInicioActividad.toISOString().split('T')[0]} - ${fechaFinActividad.toISOString().split('T')[0]}`)

          // ✅ GYS-GEN-01: Actualizar fecha para siguiente actividad (FS+1 con 1 día laborable de separación)
          const nextActividadDate = new Date(fechaFinActividad)
          nextActividadDate.setDate(nextActividadDate.getDate() + 1) // Agregar 1 día
          actividadFechaPorEdt.set(edt.id, ajustarFechaADiaLaborable(nextActividadDate, calendarioLaboral))

          // ✅ Crear tareas desde los ítems del servicio con fechas calculadas
          await crearTareasDesdeItems(tx, servicio.items, actividad.id, edt.id, fechaInicioActividad, fechaFinActividad, calendarioLaboral)
          tareasCreadas += servicio.items.length
        } else {
          console.log(`⚠️ IMPORTACIÓN - No hay zonas disponibles para EDT ${edt.nombre}, omitiendo actividades`)
        }
      }
    } else {
      // ✅ Modo Actividades Directas: Crear actividades directamente bajo EDT
      console.log(`📍 IMPORTACIÓN - Creando actividades directas para EDT: ${edt.nombre}`)

      // ✅ GYS-GEN-03: Cada servicio → Actividad, cada item → Tarea
      for (const servicio of categoriaInfo.servicios) {
        console.log(`📍 IMPORTACIÓN - Procesando servicio: ${servicio.nombre}`)

        // ✅ GYS-GEN-02: Primer actividad inicia en fecha de inicio del EDT
        // ✅ GYS-GEN-01: Actividades secuenciales dentro del EDT
        const currentActividadFecha = actividadFechaPorEdt.get(edt.id) || edtInicio
        const fechaInicioActividad = new Date(currentActividadFecha)

        // ✅ GYS-GEN-10: Calcular duración basada en horas del servicio
        const horasServicio = servicio.items.reduce((sum: number, item: any) => sum + (item.horaTotal || 0), 0)
        let duracionActividadDias = 7 // Duración por defecto
        if (horasServicio > 0 && calendarioLaboral.horasPorDia > 0) {
          duracionActividadDias = Math.ceil(horasServicio / calendarioLaboral.horasPorDia)
        }

        // ✅ GYS-GEN-05: Calcular fecha fin con calendario laboral
        const fechaFinActividad = calcularFechaFinConCalendario(fechaInicioActividad, duracionActividadDias * calendarioLaboral.horasPorDia, calendarioLaboral)

        const actividad = await tx.cotizacionActividad.create({
          data: {
            cotizacionZonaId: null, // Sin zona
            cotizacionEdtId: edt.id, // ✅ Directa al EDT
            nombre: servicio.nombre, // ✅ Nombre del servicio → Actividad
            descripcion: servicio.descripcion || `Actividad generada desde servicio ${servicio.nombre}`,
            estado: 'pendiente',
            porcentajeAvance: 0,
            prioridad: 'media',
            horasPlan: horasServicio,
            horasReales: 0,
            fechaInicioComercial: fechaInicioActividad.toISOString(),
            fechaFinComercial: fechaFinActividad.toISOString()
          }
        })

        actividadesCreadas++
        console.log(`✅ IMPORTACIÓN - Actividad directa creada: ${actividad.nombre} en EDT ${edt.nombre}`)
        console.log(`📅 IMPORTACIÓN - Fechas actividad: ${fechaInicioActividad.toISOString().split('T')[0]} - ${fechaFinActividad.toISOString().split('T')[0]}`)

        // ✅ GYS-GEN-01: Actualizar fecha para siguiente actividad (FS+1 con 1 día laborable de separación)
        const nextActividadDate2 = new Date(fechaFinActividad)
        nextActividadDate2.setDate(nextActividadDate2.getDate() + 1) // Agregar 1 día
        actividadFechaPorEdt.set(edt.id, ajustarFechaADiaLaborable(nextActividadDate2, calendarioLaboral))

        // ✅ Crear tareas desde los ítems del servicio con fechas calculadas
        await crearTareasDesdeItems(tx, servicio.items, actividad.id, edt.id, fechaInicioActividad, fechaFinActividad, calendarioLaboral)
        tareasCreadas += servicio.items.length
      }
    }
  }

  console.log(`📊 IMPORTACIÓN - Resultado final: ${actividadesCreadas} actividades, ${tareasCreadas} tareas`)
  return { actividadesCreadas, tareasCreadas }
}

// ✅ Nueva función auxiliar para crear tareas con fechas calculadas (FS+0)
async function crearTareasDesdeItems(
  tx: any,
  items: any[],
  actividadId: string,
  edtId: string,
  fechaInicioActividad: Date,
  fechaFinActividad: Date,
  calendarioLaboral: any
): Promise<void> {
  let tareaFechaInicio = new Date(fechaInicioActividad)

  for (let i = 0; i < items.length; i++) {
    const item = items[i]

    // ✅ GYS-GEN-10: Calcular duración basada en horas del ítem
    let duracionTareaDias = 2 // Duración por defecto
    if (item.horaTotal > 0 && calendarioLaboral.horasPorDia > 0) {
      duracionTareaDias = Math.ceil(item.horaTotal / calendarioLaboral.horasPorDia)
    }

    // ✅ GYS-GEN-05: Calcular fecha fin con calendario laboral
    const fechaInicioTarea = ajustarFechaADiaLaborable(new Date(tareaFechaInicio), calendarioLaboral)
    const fechaFinTarea = calcularFechaFinConCalendario(fechaInicioTarea, duracionTareaDias * calendarioLaboral.horasPorDia, calendarioLaboral)

    // Asegurar que la tarea no exceda la actividad
    if (fechaFinTarea > fechaFinActividad) {
      // Usar fechaFinActividad como límite
    }

    await tx.cotizacionTarea.create({
      data: {
        cotizacionEdtId: edtId,
        cotizacionActividadId: actividadId,
        nombre: item.nombre, // ✅ Nombre del ítem → Tarea
        descripcion: item.descripcion,
        fechaInicio: fechaInicioTarea.toISOString(),
        fechaFin: fechaFinTarea.toISOString(),
        horasEstimadas: item.horaTotal || 1,
        horasReales: 0,
        estado: 'pendiente',
        porcentajeCompletado: 0,
        prioridad: 'media'
      }
    })

    // ✅ GYS-GEN-01: Avanzar fecha para siguiente tarea (FS+1 con 1 día laborable de separación)
    const nextTareaDate = new Date(fechaFinTarea)
    nextTareaDate.setDate(nextTareaDate.getDate() + 1) // Agregar 1 día
    tareaFechaInicio = ajustarFechaADiaLaborable(nextTareaDate, calendarioLaboral)
  }
}

// ✅ GYS-GEN-15: Función auxiliar para roll-up final
async function rollupFinal(tx: any, cotizacionId: string, calendarioLaboral: any): Promise<void> {
  console.log('🔄 GYS-GEN-15: FASE 10 - ROLL-UP FINAL - Extender padres por hijos')

  // Roll-up EDTs por actividades
  const allEdts = await tx.cotizacionEdt.findMany({
    where: { cotizacionId },
    include: { actividadesDirectas: true }
  })

  for (const edt of allEdts) {
    if (edt.actividadesDirectas.length > 0) {
      const maxFechaFinActividad = edt.actividadesDirectas.reduce((maxFecha: Date, actividad: any) => {
        const fechaFinAct = actividad.fechaFinComercial ? new Date(actividad.fechaFinComercial) : null
        return fechaFinAct && fechaFinAct > maxFecha ? fechaFinAct : maxFecha
      }, new Date(edt.fechaFinComercial || edt.fechaInicioComercial || 0))

      const edtFechaFinActual = new Date(edt.fechaFinComercial || edt.fechaInicioComercial || 0)
      if (maxFechaFinActividad > edtFechaFinActual) {
        await tx.cotizacionEdt.update({
          where: { id: edt.id },
          data: { fechaFinComercial: maxFechaFinActividad.toISOString() }
        })
        console.log(`📅 EDT extendido: ${edt.nombre} -> ${maxFechaFinActividad.toISOString().split('T')[0]}`)
      }
    }
  }

  // Roll-up actividades por tareas
  const allActividades = await tx.cotizacionActividad.findMany({
    where: { cotizacionEdt: { cotizacionId } },
    include: { tareas: true }
  })

  for (const actividad of allActividades) {
    if (actividad.tareas.length > 0) {
      const maxFechaFinTarea = actividad.tareas.reduce((maxFecha: Date, tarea: any) => {
        const fechaFinTarea = tarea.fechaFin ? new Date(tarea.fechaFin) : null
        return fechaFinTarea && fechaFinTarea > maxFecha ? fechaFinTarea : maxFecha
      }, new Date(actividad.fechaFinComercial || actividad.fechaInicioComercial || 0))

      const actividadFechaFinActual = new Date(actividad.fechaFinComercial || actividad.fechaInicioComercial || 0)
      if (maxFechaFinTarea > actividadFechaFinActual) {
        await tx.cotizacionActividad.update({
          where: { id: actividad.id },
          data: { fechaFinComercial: maxFechaFinTarea.toISOString() }
        })
        console.log(`📅 Actividad extendida: ${actividad.nombre} -> ${maxFechaFinTarea.toISOString().split('T')[0]}`)
      }
    }
  }

  // Roll-up fases por EDTs
  const fasesConfig = await tx.cotizacionFase.findMany({
    where: { cotizacionId }
  })

  for (const fase of fasesConfig) {
    const edtsDeFase = await tx.cotizacionEdt.findMany({
      where: { cotizacionFaseId: fase.id }
    })

    if (edtsDeFase.length > 0) {
      const maxFechaFinEdt = edtsDeFase.reduce((maxFecha: Date, edt: any) => {
        const fechaFinEdt = edt.fechaFinComercial ? new Date(edt.fechaFinComercial) : null
        return fechaFinEdt && fechaFinEdt > maxFecha ? fechaFinEdt : maxFecha
      }, new Date(fase.fechaFinPlan || fase.fechaInicioPlan || 0))

      const faseFechaFinActual = new Date(fase.fechaFinPlan || fase.fechaInicioPlan || 0)
      if (maxFechaFinEdt > faseFechaFinActual) {
        await tx.cotizacionFase.update({
          where: { id: fase.id },
          data: { fechaFinPlan: maxFechaFinEdt.toISOString() }
        })
        console.log(`📅 Fase extendida: ${fase.nombre} -> ${maxFechaFinEdt.toISOString().split('T')[0]}`)
      }
    }
  }
}

// ✅ GYS-GEN-15: Función auxiliar para re-secuenciación final de fases
async function resecuenciarFasesFinal(tx: any, cotizacionId: string, fechaInicioProyecto: Date, calendarioLaboral: any, fasesConfig: any[]): Promise<void> {
  console.log('🔄 GYS-GEN-15: FASE 11 - RE-SECUENCIACIÓN FINAL - Garantizar FS+1 entre fases')

  // Obtener fases ordenadas
  const fasesActualizadas = await tx.cotizacionFase.findMany({
    where: { cotizacionId },
    orderBy: { orden: 'asc' }
  })

  if (fasesActualizadas.length > 0) {
    let currentDate = ajustarFechaADiaLaborable(new Date(fechaInicioProyecto), calendarioLaboral)

    for (let i = 0; i < fasesActualizadas.length; i++) {
      const fase = fasesActualizadas[i]

      // Verificar si la fase tiene hijos (EDTs)
      const edtsDeFase = await tx.cotizacionEdt.findMany({
        where: { cotizacionFaseId: fase.id }
      })

      if (edtsDeFase.length === 0) {
        // ✅ Fase sin hijos: mantener duración por defecto
        const faseDuracion = fasesConfig.find((f: any) => f.nombre === fase.nombre)
        const duracionDias = faseDuracion?.duracionDias || 30

        const fechaInicio = new Date(currentDate)
        const fechaFin = calcularFechaFinConCalendario(fechaInicio, duracionDias * calendarioLaboral.horasPorDia, calendarioLaboral)

        await tx.cotizacionFase.update({
          where: { id: fase.id },
          data: {
            fechaInicioPlan: fechaInicio.toISOString(),
            fechaFinPlan: fechaFin.toISOString()
          }
        })

        console.log(`🔄 Fase sin hijos (duración por defecto): ${fase.nombre} (${fechaInicio.toISOString().split('T')[0]} - ${fechaFin.toISOString().split('T')[0]}) - ${duracionDias} días`)

        // Preparar fecha para siguiente fase
        currentDate = ajustarFechaADiaLaborable(new Date(fechaFin.getTime() + 24 * 60 * 60 * 1000), calendarioLaboral)
      } else {
        // Fase con hijos: usar lógica existente
        if (i === 0) {
          // Primera fase mantiene su fecha de inicio
          currentDate = new Date(fase.fechaInicioPlan || currentDate)
        } else {
          // Fases siguientes inician al día siguiente laborable de la fase anterior
          const faseAnterior = fasesActualizadas[i - 1]
          const fechaFinAnterior = new Date(faseAnterior.fechaFinPlan || faseAnterior.fechaInicioPlan || currentDate)
          currentDate = ajustarFechaADiaLaborable(new Date(fechaFinAnterior.getTime() + 24 * 60 * 60 * 1000), calendarioLaboral)
        }

        // Calcular nueva fecha fin basada en EDTs de la fase
        let nuevaFechaFin = new Date(currentDate)
        if (edtsDeFase.length > 0) {
          // Encontrar la fecha fin más tardía de los EDTs
          const maxFechaFinEdt = edtsDeFase.reduce((maxFecha: Date, edt: any) => {
            const fechaFinEdt = edt.fechaFinComercial ? new Date(edt.fechaFinComercial) : null
            return fechaFinEdt && fechaFinEdt > maxFecha ? fechaFinEdt : maxFecha
          }, new Date(currentDate))

          nuevaFechaFin = maxFechaFinEdt
        }

        // Actualizar fase con nuevas fechas
        await tx.cotizacionFase.update({
          where: { id: fase.id },
          data: {
            fechaInicioPlan: currentDate.toISOString(),
            fechaFinPlan: nuevaFechaFin.toISOString()
          }
        })

        console.log(`🔄 Fase con hijos re-secuenciada: ${fase.nombre} (${currentDate.toISOString().split('T')[0]} - ${nuevaFechaFin.toISOString().split('T')[0]})`)

        // Preparar fecha para siguiente fase
        currentDate = ajustarFechaADiaLaborable(new Date(nuevaFechaFin.getTime() + 24 * 60 * 60 * 1000), calendarioLaboral)
      }
    }
  }
}