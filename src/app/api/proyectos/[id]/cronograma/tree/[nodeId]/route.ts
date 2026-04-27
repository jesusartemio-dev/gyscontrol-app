// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/tree/[nodeId]/route.ts
// 🔧 Descripción: API para operaciones CRUD en nodos individuales del árbol jerárquico
// 🎯 Funcionalidades: Actualizar y eliminar nodos específicos del cronograma
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-11-03
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { logger } from '@/lib/logger'
import {
  validarPermisoCronogramaPorEdt,
  validarPermisoCronogramaPorTarea,
  validarPermisoCronogramaPorFase,
  validarPermisoCronogramaPorActividad,
} from '@/lib/services/cronogramaPermisos'

async function validarPorTipoNodo(nodeType: string, realId: string) {
  switch (nodeType) {
    case 'fase':       return validarPermisoCronogramaPorFase(realId)
    case 'edt':        return validarPermisoCronogramaPorEdt(realId)
    case 'actividad':  return validarPermisoCronogramaPorActividad(realId)
    case 'tarea':      return validarPermisoCronogramaPorTarea(realId)
    default:           return null
  }
}

// Schema de validación para actualizar nodos
const updateNodeSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  descripcion: z.string().optional(),
  fechaInicioComercial: z.string().optional(),
  fechaFinComercial: z.string().optional(),
  fechaInicioPlan: z.string().optional(),
  fechaFinPlan: z.string().optional(),
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  horasEstimadas: z.number().optional(),
  horasPlan: z.number().optional(),
  orden: z.number().optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional(),
  estado: z.enum(['pendiente', 'planificado', 'en_progreso', 'completada', 'cancelada', 'pausada']).optional(),
  personasEstimadas: z.number().int().min(1).optional(),
  recursoId: z.string().nullable().optional(),
  responsableId: z.string().nullable().optional(),
})

// ✅ PUT /api/proyectos/[id]/cronograma/tree/[nodeId] - Actualizar nodo específico
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  const resolvedParams = await params
  console.log(`🚀 [API TREE PUT] Iniciando actualización de`, resolvedParams)
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id, nodeId } = resolvedParams
    console.log(`🔍 [API TREE PUT] Proyecto ID: ${id}, Node ID: ${nodeId}`)
    const body = await request.json()
    console.log(`📥 [API TREE PUT] Body recibido:`, body)

    // ✅ Validar datos de entrada
    const validatedData = updateNodeSchema.parse(body)
    console.log(`✅ [API TREE PUT] Datos validados:`, validatedData)

    // ✅ Validar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Determinar el tipo de nodo y su ID real
    let nodeType: string
    let realId: string

    if (nodeId.startsWith('fase-')) {
      nodeType = 'fase'
      realId = nodeId.replace('fase-', '')
    } else if (nodeId.startsWith('edt-')) {
      nodeType = 'edt'
      realId = nodeId.replace('edt-', '')
    } else if (nodeId.startsWith('actividad-')) {
      nodeType = 'actividad'
      realId = nodeId.replace('actividad-', '')
    } else if (nodeId.startsWith('tarea-')) {
      nodeType = 'tarea'
      realId = nodeId.replace('tarea-', '')
    } else {
      return NextResponse.json(
        { error: 'Tipo de nodo no reconocido' },
        { status: 400 }
      )
    }

    // ✅ Validar permisos: solo admin/gerente/gestor/coordinador y NO en cronograma comercial
    const permiso = await validarPorTipoNodo(nodeType, realId)
    if (permiso && !permiso.ok) return permiso.response

    console.log('🔍 [API TREE UPDATE] Actualizando:', { nodeType, realId, validatedData })
    console.log('🔍 [API TREE UPDATE] Orden value:', validatedData.orden)

    // ✅ Obtener fechas actuales antes de actualizar (para detectar cambios reales)
    const currentDates = await fetchCurrentNodeDates(nodeType, realId)

    // ✅ Actualizar según el tipo de nodo
    let updateData: any = {}

    switch (nodeType) {
      case 'fase':
        updateData = {
          nombre: validatedData.nombre,
          descripcion: validatedData.descripcion,
          orden: validatedData.orden,
          fechaInicioPlan: validatedData.fechaInicioPlan ? new Date(validatedData.fechaInicioPlan) : undefined,
          fechaFinPlan: validatedData.fechaFinPlan ? new Date(validatedData.fechaFinPlan) : undefined,
        }
        await prisma.proyectoFase.update({
          where: { id: realId },
          data: updateData
        })
        break

      case 'edt':
        updateData = {
          nombre: validatedData.nombre,
          descripcion: validatedData.descripcion,
          orden: validatedData.orden,
          fechaInicioPlan: validatedData.fechaInicioComercial ? new Date(validatedData.fechaInicioComercial) : undefined,
          fechaFinPlan: validatedData.fechaFinComercial ? new Date(validatedData.fechaFinComercial) : undefined,
          horasPlan: validatedData.horasEstimadas,
          prioridad: validatedData.prioridad,
          estado: validatedData.estado,
        }
        await prisma.proyectoEdt.update({
          where: { id: realId },
          data: updateData
        })
        break

      case 'actividad':
        updateData = {
          nombre: validatedData.nombre,
          descripcion: validatedData.descripcion,
          orden: validatedData.orden,
          fechaInicioPlan: validatedData.fechaInicioComercial ? new Date(validatedData.fechaInicioComercial) : undefined,
          fechaFinPlan: validatedData.fechaFinComercial ? new Date(validatedData.fechaFinComercial) : undefined,
          horasPlan: validatedData.horasEstimadas,
          prioridad: validatedData.prioridad,
          estado: validatedData.estado,
        }
        await prisma.proyectoActividad.update({
          where: { id: realId },
          data: updateData
        })
        break

      case 'tarea':
        updateData = {
          nombre: validatedData.nombre,
          descripcion: validatedData.descripcion,
          orden: validatedData.orden,
          fechaInicio: validatedData.fechaInicioComercial ? new Date(validatedData.fechaInicioComercial) : (validatedData.fechaInicio ? new Date(validatedData.fechaInicio) : undefined),
          fechaFin: validatedData.fechaFinComercial ? new Date(validatedData.fechaFinComercial) : (validatedData.fechaFin ? new Date(validatedData.fechaFin) : undefined),
          horasEstimadas: validatedData.horasEstimadas || validatedData.horasPlan,
          prioridad: validatedData.prioridad,
          estado: validatedData.estado,
          personasEstimadas: validatedData.personasEstimadas,
          recursoId: validatedData.recursoId,
          responsableId: validatedData.responsableId,
        }
        console.log('🔍 [API TREE UPDATE] Tarea updateData:', updateData)
        console.log('🔍 [API TREE UPDATE] validatedData:', validatedData)
        await prisma.proyectoTarea.update({
          where: { id: realId },
          data: updateData
        })
        break

      default:
        return NextResponse.json(
          { error: 'Tipo de nodo no soportado' },
          { status: 400 }
        )
    }

    console.log('✅ [API TREE UPDATE] Nodo actualizado exitosamente:', { nodeType, realId })

    // ✅ GYS-GEN-12: Solo recalcular padres si fechas/horas realmente cambiaron
    const datesChanged = didDatesChange(nodeType, updateData, currentDates)
    console.log('🔄 [API TREE UPDATE] ¿Fechas cambiaron?', datesChanged)

    if (datesChanged) {
      console.log('🔄 [API TREE UPDATE] Iniciando recálculo de padres para', { nodeType, nodeId, proyectoId: id })
      try {
        await recalcularPadresPostOperacion(id, nodeType, nodeId)
        console.log('✅ [API TREE UPDATE] Recálculo de padres completado exitosamente')
      } catch (error) {
        logger.error('❌ [API TREE UPDATE] Error en recálculo de padres:', error)
      }
    } else {
      console.log('⏭️ [API TREE UPDATE] Sin cambios en fechas/horas, omitiendo recálculo de padres')
    }

    return NextResponse.json({
      success: true,
      data: { id: realId, type: nodeType, ...updateData }
    })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    logger.error('Error al actualizar nodo:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ DELETE /api/proyectos/[id]/cronograma/tree/[nodeId] - Eliminar nodo específico
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; nodeId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id, nodeId } = await params

    // ✅ Validar que el proyecto existe
    const proyecto = await prisma.proyecto.findUnique({
      where: { id },
      select: { id: true, nombre: true }
    })

    if (!proyecto) {
      return NextResponse.json(
        { error: 'Proyecto no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Determinar el tipo de nodo y su ID real
    let nodeType: string
    let realId: string

    if (nodeId.startsWith('fase-')) {
      nodeType = 'fase'
      realId = nodeId.replace('fase-', '')
    } else if (nodeId.startsWith('edt-')) {
      nodeType = 'edt'
      realId = nodeId.replace('edt-', '')
    } else if (nodeId.startsWith('actividad-')) {
      nodeType = 'actividad'
      realId = nodeId.replace('actividad-', '')
    } else if (nodeId.startsWith('tarea-')) {
      nodeType = 'tarea'
      realId = nodeId.replace('tarea-', '')
    } else {
      return NextResponse.json(
        { error: 'Tipo de nodo no reconocido' },
        { status: 400 }
      )
    }

    // ✅ Validar permisos: solo admin/gerente/gestor/coordinador y NO en cronograma comercial
    const permiso = await validarPorTipoNodo(nodeType, realId)
    if (permiso && !permiso.ok) return permiso.response

    console.log('🔍 [API TREE DELETE] Eliminando:', { nodeType, realId })

    // ✅ Eliminar según el tipo de nodo (el orden importa por las restricciones de clave foránea)
    switch (nodeType) {
      case 'fase':
        // Eliminar fase (las cascadas se encargarán de EDTs, actividades y tareas)
        await prisma.proyectoFase.delete({
          where: { id: realId }
        })
        break

      case 'edt':
        // Eliminar EDT (las cascadas se encargarán de actividades y tareas)
        await prisma.proyectoEdt.delete({
          where: { id: realId }
        })
        break

      case 'actividad':
        // Eliminar actividad (las cascadas se encargarán de tareas)
        await prisma.proyectoActividad.delete({
          where: { id: realId }
        })
        break

      case 'tarea':
        // Eliminar tarea directamente
        await prisma.proyectoTarea.delete({
          where: { id: realId }
        })
        break

      default:
        return NextResponse.json(
          { error: 'Tipo de nodo no soportado' },
          { status: 400 }
        )
    }

    console.log('✅ [API TREE DELETE] Nodo eliminado exitosamente:', { nodeType, realId })

    // ✅ GYS-GEN-12: Recalcular fechas y horas de padres después de la eliminación
    await recalcularPadresPostOperacion(id, nodeType, nodeId)

    return NextResponse.json({
      success: true,
      data: { id: realId, type: nodeType }
    })

  } catch (error) {
    logger.error('Error al eliminar nodo:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ Función auxiliar para extraer ID real de nodeId con prefijo
function extractRealId(nodeId: string): string {
  // Para nodeIds con prefijo como "actividad-41f86334-9f9b-4271-b988-895c4eccf0e5"
  // queremos extraer "41f86334-9f9b-4271-b988-895c4eccf0e5"
  const firstDashIndex = nodeId.indexOf('-')
  if (firstDashIndex === -1) {
    return nodeId
  }
  return nodeId.substring(firstDashIndex + 1)
}

// ✅ Función auxiliar para construir nodeId con prefijo
function buildNodeId(type: string, id: string): string {
  return `${type}-${id}`
}

// ✅ GYS-GEN-12: Función para recalcular fechas y horas de padres después de operaciones CRUD
async function recalcularPadresPostOperacion(
  proyectoId: string,
  nodeType: string,
  nodeId: string
): Promise<void> {
  console.log(`🔄 GYS-GEN-12: Recalculando padres después de operación en ${nodeType} ${nodeId}`)

  let parentId: string | null = null
  let parentType: string | null = null

  // Extraer ID real para consultas a BD
  const realId = extractRealId(nodeId)

  // Determinar el padre según el tipo de nodo
  switch (nodeType) {
    case 'tarea':
      // Buscar la actividad padre de la tarea
      try {
        console.log(`🔍 [ROLLUP] Buscando tarea ${realId} para encontrar su actividad padre`)
        const tarea = await prisma.proyectoTarea.findUnique({
          where: { id: realId },
          select: { proyectoActividadId: true, nombre: true }
        })
        console.log(`🔍 [ROLLUP] Tarea encontrada:`, { id: realId, nombre: tarea?.nombre, proyectoActividadId: tarea?.proyectoActividadId })
        if (tarea?.proyectoActividadId) {
          parentId = buildNodeId('actividad', tarea.proyectoActividadId)
          parentType = 'actividad'
          console.log(`✅ [ROLLUP] Tarea ${realId} pertenece a actividad ${tarea.proyectoActividadId} (nodeId: ${parentId})`)
        } else {
          console.log(`⚠️ [ROLLUP] Tarea ${realId} no tiene actividad padre asignada`)
        }
      } catch (error) {
        console.log(`❌ [ROLLUP] Error buscando tarea ${realId}:`, error)
      }
      break

    case 'actividad':
      // Buscar el EDT padre de la actividad
      try {
        console.log(`🔍 [ROLLUP] Buscando actividad ${realId} para encontrar su EDT padre`)
        const actividad = await prisma.proyectoActividad.findUnique({
          where: { id: realId },
          select: { proyectoEdtId: true, nombre: true }
        })
        console.log(`🔍 [ROLLUP] Actividad encontrada:`, { id: realId, nombre: actividad?.nombre, proyectoEdtId: actividad?.proyectoEdtId })
        if (actividad?.proyectoEdtId) {
          parentId = buildNodeId('edt', actividad.proyectoEdtId)
          parentType = 'edt'
          console.log(`✅ [ROLLUP] Actividad ${realId} pertenece a EDT ${actividad.proyectoEdtId} (nodeId: ${parentId})`)
        } else {
          console.log(`⚠️ [ROLLUP] Actividad ${realId} no tiene EDT padre asignado`)
        }
      } catch (error) {
        console.log(`❌ [ROLLUP] Error buscando actividad ${realId}:`, error)
      }
      break

    case 'edt':
      // Buscar la fase padre del EDT
      try {
        const edt = await prisma.proyectoEdt.findUnique({
          where: { id: realId },
          select: { proyectoFaseId: true, nombre: true }
        })
        console.log(`🔍 [ROLLUP] Buscando padre de EDT ${realId} (${edt?.nombre}): proyectoFaseId = ${edt?.proyectoFaseId}`)
        if (edt?.proyectoFaseId) {
          parentId = buildNodeId('fase', edt.proyectoFaseId)
          parentType = 'fase'
          console.log(`✅ [ROLLUP] EDT ${realId} pertenece a fase ${edt.proyectoFaseId} (nodeId: ${parentId})`)
        } else {
          console.log(`⚠️ [ROLLUP] EDT ${realId} no tiene fase padre asignada`)
        }
      } catch (error) {
        console.log(`❌ [ROLLUP] Error buscando EDT ${realId}:`, error)
      }
      break

    case 'fase':
      // Las fases no tienen padre en el árbol jerárquico
      console.log(`🔍 [ROLLUP] Fase ${realId} no tiene padre (es raíz)`)
      return
  }

  // Si encontramos un padre, recalcularlo
  if (parentId && parentType) {
    console.log(`🔄 [ROLLUP] Recalculando padre ${parentType} ${parentId}`)
    await recalcularNodoPadre(parentType, parentId)

    // Recalcular recursivamente hacia arriba
    console.log(`🔄 [ROLLUP] Continuando recursión hacia arriba desde ${parentType} ${parentId}`)
    await recalcularPadresPostOperacion(proyectoId, parentType, parentId)
  } else {
    console.log(`⚠️ [ROLLUP] No se encontró padre para ${nodeType} ${nodeId}`)
  }
}

// ✅ Función auxiliar para recalcular un nodo padre específico
async function recalcularNodoPadre(parentType: string, parentId: string): Promise<void> {
  console.log(`🔄 Recalculando ${parentType} ${parentId}`)

  // Para las funciones de recálculo, usamos el ID completo (con guiones) ya que así están almacenados en la BD
  const fullParentId = parentId.startsWith(`${parentType}-`) ? extractRealId(parentId) : parentId

  try {
    switch (parentType) {
      case 'actividad':
        await recalcularActividadPadre(fullParentId)
        console.log(`✅ [ROLLUP] Actividad ${fullParentId} recalculada`)
        break
      case 'edt':
        await recalcularEdtPadre(fullParentId)
        console.log(`✅ [ROLLUP] EDT ${fullParentId} recalculado`)
        break
      case 'fase':
        await recalcularFasePadre(fullParentId)
        console.log(`✅ [ROLLUP] Fase ${fullParentId} recalculada`)
        break
    }
  } catch (error) {
    logger.error(`❌ [ROLLUP] Error recalculando ${parentType} ${fullParentId}:`, error)
  }
}

// ✅ Recalcular actividad padre (suma horas de tareas, fechas min/max)
async function recalcularActividadPadre(actividadId: string): Promise<void> {
  const tareas = await prisma.proyectoTarea.findMany({
    where: { proyectoActividadId: actividadId },
    select: {
      fechaInicio: true,
      fechaFin: true,
      horasEstimadas: true
    }
  })

  if (tareas.length === 0) return

  // Calcular fechas: min fechaInicio, max fechaFin
  const fechasInicio = tareas.map(t => t.fechaInicio).filter(f => f !== null) as Date[]
  const fechasFin = tareas.map(t => t.fechaFin).filter(f => f !== null) as Date[]

  const fechaInicioMin = fechasInicio.length > 0 ? new Date(Math.min(...fechasInicio.map(d => d.getTime()))) : undefined
  const fechaFinMax = fechasFin.length > 0 ? new Date(Math.max(...fechasFin.map(d => d.getTime()))) : undefined

  // Calcular horas totales
  const horasTotales = tareas.reduce((sum, tarea) => sum + Number(tarea.horasEstimadas || 0), 0)

  await prisma.proyectoActividad.update({
    where: { id: actividadId },
    data: {
      fechaInicioPlan: fechaInicioMin,
      fechaFinPlan: fechaFinMax,
      horasPlan: horasTotales
    }
  })
}

// ✅ Recalcular EDT padre (suma horas de actividades, fechas min/max)
async function recalcularEdtPadre(edtId: string): Promise<void> {
  const actividades = await prisma.proyectoActividad.findMany({
    where: { proyectoEdtId: edtId },
    select: {
      fechaInicioPlan: true,
      fechaFinPlan: true,
      horasPlan: true
    }
  })

  if (actividades.length === 0) return

  // Calcular fechas: min fechaInicio, max fechaFin
  const fechasInicio = actividades.map(a => a.fechaInicioPlan).filter(f => f !== null) as Date[]
  const fechasFin = actividades.map(a => a.fechaFinPlan).filter(f => f !== null) as Date[]

  const fechaInicioMin = fechasInicio.length > 0 ? new Date(Math.min(...fechasInicio.map(d => d.getTime()))) : undefined
  const fechaFinMax = fechasFin.length > 0 ? new Date(Math.max(...fechasFin.map(d => d.getTime()))) : undefined

  // Calcular horas totales
  const horasTotales = actividades.reduce((sum, actividad) => sum + Number(actividad.horasPlan || 0), 0)

  await prisma.proyectoEdt.update({
    where: { id: edtId },
    data: {
      fechaInicioPlan: fechaInicioMin,
      fechaFinPlan: fechaFinMax,
      horasPlan: horasTotales
    }
  })
}

// ✅ Recalcular fase padre (suma horas de EDTs, fechas min/max)
async function recalcularFasePadre(faseId: string): Promise<void> {
  const edts = await prisma.proyectoEdt.findMany({
    where: { proyectoFaseId: faseId },
    select: {
      fechaInicioPlan: true,
      fechaFinPlan: true,
      horasPlan: true
    }
  })

  if (edts.length === 0) return

  // Calcular fechas: min fechaInicio, max fechaFin
  const fechasInicio = edts.map(e => e.fechaInicioPlan).filter(f => f !== null) as Date[]
  const fechasFin = edts.map(e => e.fechaFinPlan).filter(f => f !== null) as Date[]

  const fechaInicioMin = fechasInicio.length > 0 ? new Date(Math.min(...fechasInicio.map(d => d.getTime()))) : undefined
  const fechaFinMax = fechasFin.length > 0 ? new Date(Math.max(...fechasFin.map(d => d.getTime()))) : undefined

  // Calcular horas totales
  const horasTotales = edts.reduce((sum, edt) => sum + Number(edt.horasPlan || 0), 0)

  await prisma.proyectoFase.update({
    where: { id: faseId },
    data: {
      fechaInicioPlan: fechaInicioMin,
      fechaFinPlan: fechaFinMax
      // Las fases no tienen campo horasPlan en el esquema actual
    }
  })
}

// ✅ Obtener fechas actuales del nodo antes de actualizar
async function fetchCurrentNodeDates(nodeType: string, id: string) {
  switch (nodeType) {
    case 'tarea': {
      const t = await prisma.proyectoTarea.findUnique({ where: { id }, select: { fechaInicio: true, fechaFin: true, horasEstimadas: true } })
      return { fechaInicio: t?.fechaInicio, fechaFin: t?.fechaFin, horas: t?.horasEstimadas ? Number(t.horasEstimadas) : null }
    }
    case 'actividad': {
      const a = await prisma.proyectoActividad.findUnique({ where: { id }, select: { fechaInicioPlan: true, fechaFinPlan: true, horasPlan: true } })
      return { fechaInicio: a?.fechaInicioPlan, fechaFin: a?.fechaFinPlan, horas: a?.horasPlan ? Number(a.horasPlan) : null }
    }
    case 'edt': {
      const e = await prisma.proyectoEdt.findUnique({ where: { id }, select: { fechaInicioPlan: true, fechaFinPlan: true, horasPlan: true } })
      return { fechaInicio: e?.fechaInicioPlan, fechaFin: e?.fechaFinPlan, horas: e?.horasPlan ? Number(e.horasPlan) : null }
    }
    case 'fase': {
      const f = await prisma.proyectoFase.findUnique({ where: { id }, select: { fechaInicioPlan: true, fechaFinPlan: true } })
      return { fechaInicio: f?.fechaInicioPlan, fechaFin: f?.fechaFinPlan, horas: null }
    }
    default:
      return { fechaInicio: null, fechaFin: null, horas: null }
  }
}

// ✅ Detectar si fechas/horas realmente cambiaron
function didDatesChange(
  nodeType: string,
  updateData: any,
  currentDates: { fechaInicio?: Date | null, fechaFin?: Date | null, horas?: number | null }
): boolean {
  let newInicio: Date | undefined
  let newFin: Date | undefined
  let newHoras: number | undefined

  switch (nodeType) {
    case 'tarea':
      newInicio = updateData.fechaInicio
      newFin = updateData.fechaFin
      newHoras = updateData.horasEstimadas
      break
    case 'actividad':
    case 'edt':
      newInicio = updateData.fechaInicioPlan
      newFin = updateData.fechaFinPlan
      newHoras = updateData.horasPlan
      break
    case 'fase':
      newInicio = updateData.fechaInicioPlan
      newFin = updateData.fechaFinPlan
      break
  }

  if (newInicio !== undefined && currentDates.fechaInicio?.getTime() !== newInicio.getTime()) return true
  if (newFin !== undefined && currentDates.fechaFin?.getTime() !== newFin.getTime()) return true
  if (newHoras !== undefined && currentDates.horas !== newHoras) return true

  return false
}