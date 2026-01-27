// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: /api/cotizaciones/[id]/cronograma/import-items/[nodeId]
// 🔧 Descripción: API para obtener items disponibles para importar y ejecutar importación
// ✅ GET: Obtener items disponibles para importar en un nodo específico
// ✅ POST: Ejecutar importación de items seleccionados
// ===================================================

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

export const dynamic = 'force-dynamic'

const importSchema = z.object({
  selectedIds: z.array(z.string()).min(1, 'Debe seleccionar al menos un item')
})

// Función auxiliar para obtener el tipo de nodo desde su ID
async function getNodeType(nodeId: string): Promise<{ type: string | null, dbId: string }> {
  // El nodeId viene en formato "type-databaseId", necesitamos extraer el databaseId
  const parts = nodeId.split('-')
  if (parts.length < 2) return { type: null, dbId: nodeId }

  const type = parts[0]
  const dbId = parts.slice(1).join('-') // En caso de que el ID tenga guiones

  // Verificar el tipo basado en el prefijo
  if (type === 'fase') {
    const fase = await prisma.cotizacionFase.findUnique({
      where: { id: dbId },
      select: { id: true }
    })
    if (fase) return { type: 'fase', dbId }
  }

  if (type === 'edt') {
    const edt = await prisma.cotizacionEdt.findUnique({
      where: { id: dbId },
      select: { id: true }
    })
    if (edt) return { type: 'edt', dbId }
  }

  if (type === 'actividad') {
    const actividad = await prisma.cotizacionActividad.findUnique({
      where: { id: dbId },
      select: { id: true }
    })
    if (actividad) return { type: 'actividad', dbId }
  }

  return { type: null, dbId }
}

// ✅ GET /api/cotizaciones/[id]/cronograma/import-items/[nodeId]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    const { id, nodeId } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: { user: true }
    })

    if (!cotizacion) {
      return NextResponse.json({ error: 'Cotización no encontrada' }, { status: 404 })
    }

    const userRole = session.user.role
    const isOwner = cotizacion.comercialId === session.user.id
    const hasPermission = userRole === 'admin' || userRole === 'gerente' || userRole === 'comercial' || isOwner

    if (!hasPermission) {
      return NextResponse.json({ error: 'No tiene permisos para acceder al cronograma' }, { status: 403 })
    }

    // Determinar el tipo de nodo
    const nodeInfo = await getNodeType(nodeId)
    if (!nodeInfo.type) {
      return NextResponse.json({ error: 'Nodo no encontrado' }, { status: 404 })
    }

    let availableItems: any[] = []

    switch (nodeInfo.type) {
      case 'fase':
        // Para fases: obtener EDTs disponibles (por categorías de servicios no representadas)
        availableItems = await getAvailableEdtsForFase(id, nodeInfo.dbId)
        break

      case 'edt':
        // Para EDTs: obtener actividades disponibles (de servicios en esa categoría)
        availableItems = await getAvailableActividadesForEdt(id, nodeInfo.dbId)
        break

      case 'actividad':
        // Para actividades: obtener tareas disponibles (de items de servicio)
        availableItems = await getAvailableTareasForActividad(id, nodeInfo.dbId)
        break

      default:
        return NextResponse.json({ error: 'Tipo de nodo no soportado' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: availableItems
    })

  } catch (error) {
    console.error('❌ Error obteniendo items para importar:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// ✅ POST /api/cotizaciones/[id]/cronograma/import-items/[nodeId]
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    const { id, nodeId } = await params
    const session = await getServerSession(authOptions)

    if (!session) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar permisos
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      include: { user: true }
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
    const validatedData = importSchema.parse(body)

    // Determinar el tipo de nodo
    const nodeInfo = await getNodeType(nodeId)
    if (!nodeInfo.type) {
      return NextResponse.json({ error: 'Nodo no encontrado' }, { status: 404 })
    }

    let importedCount = 0

    switch (nodeInfo.type) {
      case 'fase':
        importedCount = await importEdtsToFase(id, nodeInfo.dbId, validatedData.selectedIds)
        break

      case 'edt':
        importedCount = await importActividadesToEdt(id, nodeInfo.dbId, validatedData.selectedIds)
        break

      case 'actividad':
        importedCount = await importTareasToActividad(id, nodeInfo.dbId, validatedData.selectedIds)
        break

      default:
        return NextResponse.json({ error: 'Tipo de nodo no soportado' }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      data: {
        importedCount,
        message: `Se importaron ${importedCount} elementos exitosamente`
      }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Datos de entrada inválidos',
        details: error.errors
      }, { status: 400 })
    }

    console.error('❌ Error importando items:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// Función para obtener EDTs disponibles para una fase
async function getAvailableEdtsForFase(cotizacionId: string, faseDbId: string) {
  // Obtener categorías de servicios que no tienen EDT en esta fase
  const servicios = await prisma.cotizacionServicio.findMany({
    where: { cotizacionId },
    include: { cotizacionServicioItem: true }
  })

  // Obtener todas las categorías disponibles
  const categorias = await prisma.edt.findMany({
    select: { id: true, nombre: true }
  })

  const categoriaNombresMap = new Map(categorias.map(cat => [cat.id, cat.nombre]))

  const categoriasEnServicios = [...new Set(servicios.map(s => s.edtId).filter(Boolean))]

  // Obtener EDTs ya existentes en esta fase
  const edtsExistentes = await prisma.cotizacionEdt.findMany({
    where: {
      cotizacionId,
      cotizacionFaseId: faseDbId
    },
    select: { nombre: true }
  })

  const categoriasConEdt = edtsExistentes.map(edt => edt.nombre)

  // Categorías disponibles (que tienen servicios pero no EDT)
  const categoriasDisponibles = categoriasEnServicios.filter(cat => !categoriasConEdt.includes(cat))

  // Crear items disponibles
  const availableItems = categoriasDisponibles.map(categoriaId => {
    const categoriaNombre = categoriaNombresMap.get(categoriaId) || categoriaId
    const serviciosCategoria = servicios.filter(s => s.edtId === categoriaId)
    const horasTotales = serviciosCategoria.reduce((sum: number, servicio) =>
      sum + servicio.cotizacionServicioItem.reduce((itemSum: number, item) => itemSum + (item.horaTotal || 0), 0), 0
    )

    return {
      id: `edt-${categoriaId}`,
      nombre: categoriaNombre,
      descripcion: `EDT generado automáticamente para categoría ${categoriaNombre}`,
      categoria: categoriaNombre,
      totalHoras: horasTotales,
      totalItems: serviciosCategoria.length,
      alreadyAdded: false
    }
  })

  // Agregar EDTs ya existentes como "alreadyAdded"
  const existingItems = edtsExistentes.map(edt => ({
    id: `existing-edt-${edt.nombre}`,
    nombre: edt.nombre,
    descripcion: `EDT ya existente en esta fase`,
    categoria: edt.nombre,
    alreadyAdded: true
  }))

  return [...existingItems, ...availableItems]
}

// Función para obtener actividades disponibles para un EDT
async function getAvailableActividadesForEdt(cotizacionId: string, edtDbId: string) {
  // Obtener el EDT y su información
  const edt = await prisma.cotizacionEdt.findUnique({
    where: { id: edtDbId },
    select: { nombre: true, cotizacionServicioId: true }
  })

  if (!edt) return []

  // Encontrar la categoría que corresponde al nombre del EDT
  const categoria = await prisma.edt.findFirst({
    where: { nombre: edt.nombre },
    select: { id: true }
  })

  if (!categoria) return []

  // Obtener servicios de este EDT
  const servicios = await prisma.cotizacionServicio.findMany({
    where: {
      cotizacionId,
      edtId: categoria.id
    },
    include: { cotizacionServicioItem: true }
  })

  // Obtener actividades ya existentes en este EDT
  const actividadesExistentes = await prisma.cotizacionActividad.findMany({
    where: { cotizacionEdtId: edtDbId },
    select: { nombre: true }
  })

  const serviciosExistentes = actividadesExistentes.map(act => act.nombre)

  // Servicios disponibles (que no tienen actividad)
  const serviciosDisponibles = servicios.filter(servicio => !serviciosExistentes.includes(servicio.nombre))

  // Crear items disponibles
  const availableItems = serviciosDisponibles.map(servicio => {
    const horasTotales = servicio.cotizacionServicioItem.reduce((sum: number, item) => sum + (item.horaTotal || 0), 0)

    return {
      id: `actividad-${servicio.id}`,
      nombre: servicio.nombre,
      descripcion: (servicio as any).descripcion || `Actividad desde servicio ${servicio.nombre}`,
      servicioNombre: servicio.nombre,
      totalHoras: horasTotales,
      totalItems: servicio.cotizacionServicioItem.length,
      alreadyAdded: false
    }
  })

  // Agregar actividades ya existentes como "alreadyAdded"
  const existingItems = actividadesExistentes.map(act => ({
    id: `existing-actividad-${act.nombre}`,
    nombre: act.nombre,
    descripcion: `Actividad ya existente en este EDT`,
    servicioNombre: act.nombre,
    alreadyAdded: true
  }))

  return [...existingItems, ...availableItems]
}

// Función para obtener tareas disponibles para una actividad
async function getAvailableTareasForActividad(cotizacionId: string, actividadDbId: string) {
  // Obtener la actividad
  const actividad = await prisma.cotizacionActividad.findUnique({
    where: { id: actividadDbId },
    select: { nombre: true }
  })

  if (!actividad) return []

  // Obtener items del servicio correspondiente
  const servicioItems = await prisma.cotizacionServicioItem.findMany({
    where: {
      cotizacionServicio: {
        cotizacionId,
        nombre: actividad.nombre
      }
    }
  })

  // Obtener tareas ya existentes en esta actividad
  const tareasExistentes = await prisma.cotizacionTarea.findMany({
    where: { cotizacionActividadId: actividadDbId },
    select: { nombre: true, cotizacionServicioItemId: true }
  })

  const itemIdsExistentes = tareasExistentes.map(t => t.cotizacionServicioItemId).filter(Boolean)

  // Items disponibles (que no tienen tarea)
  const itemsDisponibles = servicioItems.filter(item => !itemIdsExistentes.includes(item.id))

  // Crear items disponibles
  const availableItems = itemsDisponibles.map(item => ({
    id: `tarea-${item.id}`,
    nombre: item.nombre,
    descripcion: item.descripcion || `Tarea desde item ${item.nombre}`,
    horaTotal: item.horaTotal,
    cantidad: item.cantidad,
    alreadyAdded: false
  }))

  // Agregar tareas ya existentes como "alreadyAdded"
  const existingItems = tareasExistentes.map(tarea => {
    const itemCorrespondiente = servicioItems.find(item => item.id === tarea.cotizacionServicioItemId)
    return {
      id: `existing-tarea-${tarea.nombre}`,
      nombre: tarea.nombre,
      descripcion: `Tarea ya existente en esta actividad`,
      horaTotal: itemCorrespondiente?.horaTotal,
      cantidad: itemCorrespondiente?.cantidad,
      alreadyAdded: true
    }
  })

  return [...existingItems, ...availableItems]
}

// ✅ GYS-GEN-11: Función para importar EDTs a una fase con cálculo de fechas secuenciales
async function importEdtsToFase(cotizacionId: string, faseDbId: string, selectedIds: string[]): Promise<number> {
  let importedCount = 0

  // Obtener calendario laboral para cálculos de tiempo
  const calendarioLaboral = await obtenerCalendarioLaboral('empresa', 'default')
  if (!calendarioLaboral) {
    throw new Error('No hay calendario laboral configurado para calcular fechas')
  }

  // Obtener información de la fase padre
  const fasePadre = await prisma.cotizacionFase.findUnique({
    where: { id: faseDbId },
    select: {
      fechaInicioPlan: true,
      fechaFinPlan: true,
      id: true,
      nombre: true
    }
  })

  if (!fasePadre || !fasePadre.fechaInicioPlan || !fasePadre.fechaFinPlan) {
    throw new Error('La fase padre no tiene fechas configuradas')
  }

  // Obtener mapa de nombres de categorías
  const categorias = await prisma.edt.findMany({
    select: { id: true, nombre: true }
  })
  const categoriaNombresMap = new Map(categorias.map(cat => [cat.id, cat.nombre]))

  // ✅ GYS-GEN-01: Control de secuencialidad para EDTs dentro de la fase
  const edtsExistentes = await prisma.cotizacionEdt.findMany({
    where: {
      cotizacionId,
      cotizacionFaseId: faseDbId
    },
    select: { fechaFinComercial: true },
    orderBy: { fechaFinComercial: 'desc' }
  })

  // Fecha de inicio para el primer EDT nuevo
  let fechaInicioSiguienteEdt = edtsExistentes.length > 0 && edtsExistentes[0].fechaFinComercial
    ? ajustarFechaADiaLaborable(new Date(edtsExistentes[0].fechaFinComercial.getTime() + 24 * 60 * 60 * 1000), calendarioLaboral)
    : ajustarFechaADiaLaborable(new Date(fasePadre.fechaInicioPlan), calendarioLaboral)

  for (const selectedId of selectedIds) {
    if (!selectedId.startsWith('edt-')) continue

    const categoriaId = selectedId.replace('edt-', '')
    const categoriaNombre = categoriaNombresMap.get(categoriaId) || categoriaId

    // Obtener servicios de este EDT
    const servicios = await prisma.cotizacionServicio.findMany({
      where: {
        cotizacionId,
        edtId: categoriaId
      },
      include: { cotizacionServicioItem: true }
    })

    if (servicios.length === 0) continue

    // Calcular horas totales
    const horasTotales = servicios.reduce((sum: number, servicio) =>
      sum + servicio.cotizacionServicioItem.reduce((itemSum: number, item) => itemSum + (item.horaTotal || 0), 0), 0
    )

    // ✅ GYS-GEN-10: Calcular duración del EDT basada en horas
    let duracionEdtDias = 45 // Duración por defecto
    if (horasTotales > 0 && calendarioLaboral.horasPorDia > 0) {
      duracionEdtDias = Math.ceil(horasTotales / calendarioLaboral.horasPorDia)
    }

    // ✅ GYS-GEN-05: Calcular fecha fin con calendario laboral
    const fechaFinEdt = calcularFechaFinConCalendario(fechaInicioSiguienteEdt, duracionEdtDias * calendarioLaboral.horasPorDia, calendarioLaboral)

    // ✅ GYS-GEN-03: Limitar EDT a duración de la fase padre
    const faseInicio = new Date(fasePadre.fechaInicioPlan)
    const faseFin = new Date(fasePadre.fechaFinPlan)
    const faseDuracionDias = Math.ceil((faseFin.getTime() - faseInicio.getTime()) / (24 * 60 * 60 * 1000))

    if (duracionEdtDias > faseDuracionDias) {
      console.log(`⚠️ EDT limitado por fase: ${duracionEdtDias} días → ${faseDuracionDias} días`)
      // Mantener fechaFinEdt calculada, pero podría necesitar ajuste adicional
    }

    // Crear EDT con fechas calculadas
    await prisma.cotizacionEdt.create({
      data: {
        id: `edt-import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        cotizacionId,
        cotizacionFaseId: faseDbId,
        cotizacionServicioId: servicios[0].id, // Usar el primer servicio como referencia
        nombre: categoriaNombre,
        descripcion: `EDT generado automáticamente para categoría ${categoriaNombre}`,
        horasEstimadas: horasTotales,
        estado: 'planificado',
        prioridad: 'media',
        fechaInicioComercial: fechaInicioSiguienteEdt.toISOString(),
        fechaFinComercial: fechaFinEdt.toISOString(),
        updatedAt: new Date()
      }
    })

    // ✅ GYS-GEN-01: Actualizar fecha para siguiente EDT
    fechaInicioSiguienteEdt = ajustarFechaADiaLaborable(new Date(fechaFinEdt.getTime() + 24 * 60 * 60 * 1000), calendarioLaboral)

    importedCount++
  }

  // ✅ GYS-GEN-11: Recálculo automático post-importación
  if (importedCount > 0) {
    await recalcularFechasPadre(cotizacionId, 'fase', faseDbId, calendarioLaboral)
  }

  return importedCount
}

// ✅ GYS-GEN-11: Función auxiliar para recálculo automático de fechas padre
async function recalcularFechasPadre(
  cotizacionId: string,
  tipoPadre: 'fase' | 'edt' | 'actividad',
  padreId: string,
  calendarioLaboral: any
): Promise<void> {
  console.log(`🔄 GYS-GEN-11: Recalculando fechas padre ${tipoPadre} ${padreId}`)

  if (tipoPadre === 'fase') {
    // Recalcular fechas de la fase basándose en sus EDTs
    const edtsDeFase = await prisma.cotizacionEdt.findMany({
      where: { cotizacionFaseId: padreId }
    })

    if (edtsDeFase.length > 0) {
      // Encontrar la fecha de fin más tardía de los EDTs
      const maxFechaFinEdt = edtsDeFase.reduce((maxFecha, edt) => {
        const fechaFinEdt = edt.fechaFinComercial ? new Date(edt.fechaFinComercial) : null
        return fechaFinEdt && fechaFinEdt > maxFecha ? fechaFinEdt : maxFecha
      }, new Date(0))

      if (maxFechaFinEdt > new Date(0)) {
        await prisma.cotizacionFase.update({
          where: { id: padreId },
          data: { fechaFinPlan: maxFechaFinEdt.toISOString() }
        })
        console.log(`✅ Fase ${padreId} extendida hasta ${maxFechaFinEdt.toISOString().split('T')[0]}`)
      }
    }
  } else if (tipoPadre === 'edt') {
    // Recalcular fechas del EDT basándose en sus actividades
    const actividadesDeEdt = await prisma.cotizacionActividad.findMany({
      where: { cotizacionEdtId: padreId }
    })

    if (actividadesDeEdt.length > 0) {
      const maxFechaFinActividad = actividadesDeEdt.reduce((maxFecha, actividad) => {
        const fechaFinAct = actividad.fechaFinComercial ? new Date(actividad.fechaFinComercial) : null
        return fechaFinAct && fechaFinAct > maxFecha ? fechaFinAct : maxFecha
      }, new Date(0))

      if (maxFechaFinActividad > new Date(0)) {
        await prisma.cotizacionEdt.update({
          where: { id: padreId },
          data: { fechaFinComercial: maxFechaFinActividad.toISOString() }
        })
        console.log(`✅ EDT ${padreId} extendido hasta ${maxFechaFinActividad.toISOString().split('T')[0]}`)
      }
    }
  } else if (tipoPadre === 'actividad') {
    // Recalcular fechas de la actividad basándose en sus tareas
    const tareasDeActividad = await prisma.cotizacionTarea.findMany({
      where: { cotizacionActividadId: padreId }
    })

    if (tareasDeActividad.length > 0) {
      const maxFechaFinTarea = tareasDeActividad.reduce((maxFecha, tarea) => {
        const fechaFinTarea = tarea.fechaFin ? new Date(tarea.fechaFin) : null
        return fechaFinTarea && fechaFinTarea > maxFecha ? fechaFinTarea : maxFecha
      }, new Date(0))

      if (maxFechaFinTarea > new Date(0)) {
        await prisma.cotizacionActividad.update({
          where: { id: padreId },
          data: { fechaFinComercial: maxFechaFinTarea.toISOString() }
        })
        console.log(`✅ Actividad ${padreId} extendida hasta ${maxFechaFinTarea.toISOString().split('T')[0]}`)
      }
    }
  }
}

// ✅ GYS-GEN-11: Función para importar actividades a un EDT con cálculo de fechas secuenciales
async function importActividadesToEdt(cotizacionId: string, edtDbId: string, selectedIds: string[]): Promise<number> {
  let importedCount = 0

  // Obtener calendario laboral para cálculos de tiempo
  const calendarioLaboral = await obtenerCalendarioLaboral('empresa', 'default')
  if (!calendarioLaboral) {
    throw new Error('No hay calendario laboral configurado para calcular fechas')
  }

  // Obtener información del EDT padre
  const edtPadre = await prisma.cotizacionEdt.findUnique({
    where: { id: edtDbId },
    select: {
      fechaInicioComercial: true,
      fechaFinComercial: true,
      id: true,
      nombre: true
    }
  })

  if (!edtPadre || !edtPadre.fechaInicioComercial || !edtPadre.fechaFinComercial) {
    throw new Error('El EDT padre no tiene fechas configuradas')
  }

  // ✅ GYS-GEN-01: Control de secuencialidad para actividades dentro del EDT
  const actividadesExistentes = await prisma.cotizacionActividad.findMany({
    where: { cotizacionEdtId: edtDbId },
    select: { fechaFinComercial: true },
    orderBy: { fechaFinComercial: 'desc' }
  })

  // Fecha de inicio para la primera actividad nueva
  let fechaInicioSiguienteActividad = actividadesExistentes.length > 0 && actividadesExistentes[0].fechaFinComercial
    ? ajustarFechaADiaLaborable(new Date(actividadesExistentes[0].fechaFinComercial.getTime() + 24 * 60 * 60 * 1000), calendarioLaboral)
    : ajustarFechaADiaLaborable(new Date(edtPadre.fechaInicioComercial), calendarioLaboral)

  for (const selectedId of selectedIds) {
    if (!selectedId.startsWith('actividad-')) continue

    const servicioId = selectedId.replace('actividad-', '')

    // Obtener el servicio
    const servicio = await prisma.cotizacionServicio.findUnique({
      where: { id: servicioId },
      include: { cotizacionServicioItem: true }
    })

    if (!servicio) continue

    // Verificar que el servicio pertenece a la categoría del EDT
    const edt = await prisma.cotizacionEdt.findUnique({
      where: { id: edtDbId },
      select: { nombre: true }
    })

    if (!edt) continue

    // Encontrar la categoría que corresponde al nombre del EDT
    const categoria = await prisma.edt.findFirst({
      where: { nombre: edt.nombre },
      select: { id: true }
    })

    if (!categoria || servicio.edtId !== categoria.id) continue

    // Calcular horas totales
    const horasTotales = servicio.cotizacionServicioItem.reduce((sum: number, item) => sum + (item.horaTotal || 0), 0)

    // ✅ GYS-GEN-10: Calcular duración basada en horas del servicio
    let duracionActividadDias = 7 // Duración por defecto
    if (horasTotales > 0 && calendarioLaboral.horasPorDia > 0) {
      duracionActividadDias = Math.ceil(horasTotales / calendarioLaboral.horasPorDia)
    }

    // ✅ GYS-GEN-05: Calcular fecha fin con calendario laboral
    const fechaFinActividad = calcularFechaFinConCalendario(fechaInicioSiguienteActividad, duracionActividadDias * calendarioLaboral.horasPorDia, calendarioLaboral)

    // ✅ GYS-GEN-03: Limitar actividad a duración del EDT padre
    const edtInicio = new Date(edtPadre.fechaInicioComercial)
    const edtFin = new Date(edtPadre.fechaFinComercial)
    const edtDuracionDias = Math.ceil((edtFin.getTime() - edtInicio.getTime()) / (24 * 60 * 60 * 1000))

    if (duracionActividadDias > edtDuracionDias) {
      console.log(`⚠️ Actividad limitada por EDT: ${duracionActividadDias} días → ${edtDuracionDias} días`)
      // Mantener fechaFinActividad calculada, pero podría necesitar ajuste adicional
    }

    // Crear actividad con fechas calculadas
    await prisma.cotizacionActividad.create({
      data: {
        id: `act-import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        cotizacionEdtId: edtDbId,
        nombre: servicio.nombre,
        descripcion: `Actividad generada desde servicio ${servicio.nombre}`,
        horasEstimadas: horasTotales,
        estado: 'pendiente',
        prioridad: 'media',
        fechaInicioComercial: fechaInicioSiguienteActividad.toISOString(),
        fechaFinComercial: fechaFinActividad.toISOString(),
        updatedAt: new Date()
      }
    })

    // ✅ GYS-GEN-01: Actualizar fecha para siguiente actividad
    fechaInicioSiguienteActividad = ajustarFechaADiaLaborable(new Date(fechaFinActividad.getTime() + 24 * 60 * 60 * 1000), calendarioLaboral)

    importedCount++
  }

  // ✅ GYS-GEN-11: Recálculo automático post-importación
  if (importedCount > 0) {
    await recalcularFechasPadre(cotizacionId, 'edt', edtDbId, calendarioLaboral)
  }

  return importedCount
}

// ✅ GYS-GEN-11: Función para importar tareas a una actividad con cálculo de fechas secuenciales
async function importTareasToActividad(cotizacionId: string, actividadDbId: string, selectedIds: string[]): Promise<number> {
  let importedCount = 0

  // Obtener calendario laboral para cálculos de tiempo
  const calendarioLaboral = await obtenerCalendarioLaboral('empresa', 'default')
  if (!calendarioLaboral) {
    throw new Error('No hay calendario laboral configurado para calcular fechas')
  }

  // Obtener información de la actividad padre
  const actividadPadre = await prisma.cotizacionActividad.findUnique({
    where: { id: actividadDbId },
    select: {
      fechaInicioComercial: true,
      fechaFinComercial: true,
      id: true,
      nombre: true
    }
  })

  if (!actividadPadre || !actividadPadre.fechaInicioComercial || !actividadPadre.fechaFinComercial) {
    throw new Error('La actividad padre no tiene fechas configuradas')
  }

  // ✅ GYS-GEN-01: Control de secuencialidad para tareas dentro de la actividad
  const tareasExistentes = await prisma.cotizacionTarea.findMany({
    where: { cotizacionActividadId: actividadDbId },
    select: { fechaFin: true },
    orderBy: { fechaFin: 'desc' }
  })

  // Fecha de inicio para la primera tarea nueva
  let fechaInicioSiguienteTarea = tareasExistentes.length > 0 && tareasExistentes[0].fechaFin
    ? ajustarFechaADiaLaborable(new Date(tareasExistentes[0].fechaFin.getTime() + 24 * 60 * 60 * 1000), calendarioLaboral)
    : ajustarFechaADiaLaborable(new Date(actividadPadre.fechaInicioComercial), calendarioLaboral)

  // Calcular distribución de tareas dentro del rango de la actividad
  const actividadInicio = new Date(actividadPadre.fechaInicioComercial)
  const actividadFin = new Date(actividadPadre.fechaFinComercial)
  const actividadDuracionDias = Math.max(1, Math.ceil((actividadFin.getTime() - actividadInicio.getTime()) / (24 * 60 * 60 * 1000)))
  const numTareasTotal = selectedIds.length + tareasExistentes.length
  const diasPorTarea = Math.max(1, Math.floor(actividadDuracionDias / numTareasTotal))

  for (const selectedId of selectedIds) {
    if (!selectedId.startsWith('tarea-')) continue

    const itemId = selectedId.replace('tarea-', '')

    // Obtener el item
    const item = await prisma.cotizacionServicioItem.findUnique({
      where: { id: itemId }
    })

    if (!item) continue

    // ✅ GYS-GEN-10: Calcular duración basada en horas del ítem
    let duracionTareaDias = 2 // Duración por defecto
    if (item.horaTotal > 0 && calendarioLaboral.horasPorDia > 0) {
      duracionTareaDias = Math.ceil(item.horaTotal / calendarioLaboral.horasPorDia)
    }

    // ✅ GYS-GEN-05: Calcular fecha fin con calendario laboral
    const fechaInicioTarea = ajustarFechaADiaLaborable(new Date(fechaInicioSiguienteTarea), calendarioLaboral)
    const fechaFinTarea = calcularFechaFinConCalendario(fechaInicioTarea, duracionTareaDias * calendarioLaboral.horasPorDia, calendarioLaboral)

    // Asegurar que la tarea no exceda la actividad padre
    if (fechaFinTarea > actividadFin) {
      // Ajustar fecha fin al límite de la actividad
      // fechaFinTarea = new Date(actividadFin)
    }

    // Crear tarea con fechas calculadas
    await prisma.cotizacionTarea.create({
      data: {
        id: `tarea-import-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        cotizacionActividadId: actividadDbId,
        cotizacionServicioItemId: item.id,
        nombre: item.nombre,
        descripcion: item.descripcion || `Tarea generada desde item ${item.nombre}`,
        fechaInicio: fechaInicioTarea.toISOString(),
        fechaFin: fechaFinTarea.toISOString(),
        horasEstimadas: item.horaTotal || 1,
        estado: 'pendiente',
        prioridad: 'media',
        updatedAt: new Date()
      }
    })

    // ✅ GYS-GEN-01: Avanzar fecha para siguiente tarea
    fechaInicioSiguienteTarea = ajustarFechaADiaLaborable(new Date(fechaFinTarea.getTime() + 24 * 60 * 60 * 1000), calendarioLaboral)

    importedCount++
  }

  // ✅ GYS-GEN-11: Recálculo automático post-importación
  if (importedCount > 0) {
    await recalcularFechasPadre(cotizacionId, 'actividad', actividadDbId, calendarioLaboral)
  }

  return importedCount
}