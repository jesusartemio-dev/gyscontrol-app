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
import { registrarAvanceTarea, propagarRollup } from '@/lib/services/avanceTarea'
import {
  obtenerCalendarioProyecto,
  desplazarDescendientes,
  calcularInicioPosicion,
  deltaHorasEntre,
} from '@/lib/services/cronogramaDesplazamiento'
import {
  desplazarHorasLaborables,
  fechaDeFormulario,
  siguienteMomentoLaborable,
} from '@/lib/services/cronogramaHoras'
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
  // Solo aplica a tarea — actividad/EDT/fase derivan su % de sus tareas (ProgresoService)
  // y no se pueden editar directamente.
  porcentajeCompletado: z.number().min(0).max(100).optional(),
  // Solo tarea: hito (Milestone de MS Project) y su fecha comprometida (Deadline).
  esHito: z.boolean().optional(),
  fechaLimite: z.string().nullable().optional(),
  // EDT, actividad o tarea: ubicarla respecto a su padre o a un hermano. El
  // servidor calcula el nuevo inicio con el calendario del proyecto y el nodo
  // se mueve en bloque con todo lo que contiene, conservando su duración.
  posicion: z.object({
    modo: z.enum(['inicio_padre', 'despues_anterior', 'despues_ultimo', 'despues_de', 'en_paralelo']),
    referenciaId: z.string().optional(),
  }).optional(),
  // Alias anterior de `posicion` (solo actividades), se mantiene por compatibilidad.
  programarRespecto: z.object({
    modo: z.enum(['despues_de', 'en_paralelo']),
    actividadId: z.string().min(1),
  }).optional(),
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

    // Solo se consulta si hay que mover fechas (reordenar o renombrar no lo necesitan).
    let calendarioCache: Awaited<ReturnType<typeof obtenerCalendarioProyecto>> | undefined
    const getCalendario = async () => (calendarioCache ??= await obtenerCalendarioProyecto(id))

    // Posicionar respecto al padre o a un hermano: se traduce a un nuevo inicio
    // y sigue por el mismo camino que editar la fecha de inicio a mano.
    const posicion = validatedData.posicion ?? (validatedData.programarRespecto
      ? { modo: validatedData.programarRespecto.modo, referenciaId: validatedData.programarRespecto.actividadId }
      : undefined)
    if (posicion) {
      if (posicion.referenciaId === realId) {
        return NextResponse.json({ error: 'Elige otro elemento como referencia' }, { status: 400 })
      }
      const resultado = await calcularInicioPosicion(await getCalendario(), nodeType, realId, posicion.modo, posicion.referenciaId)
      if ('error' in resultado) {
        return NextResponse.json({ error: resultado.error }, { status: 400 })
      }
      validatedData.fechaInicioComercial = resultado.inicio.toISOString()
      // El fin lo calcula el desplazamiento en bloque, conservando la duración.
      validatedData.fechaFinComercial = undefined
      validatedData.fechaInicio = undefined
      validatedData.fechaFin = undefined
      validatedData.fechaInicioPlan = undefined
      validatedData.fechaFinPlan = undefined
    }

    // Fechas recibidas → hora de obra. "YYYY-MM-DD" (solo día, p. ej. el
    // formulario) va al inicio/fin de la jornada de ese día; si es el mismo día
    // que ya tenía, se conserva la hora guardada (no se pierde un 13:00 por
    // reenviar el mismo día). Con hora, se respeta tal cual.
    const leerFecha = async (valor: string | undefined, extremo: 'inicio' | 'fin', actual: Date | null | undefined) => {
      if (!valor) return undefined
      const soloDia = /^\d{4}-\d{2}-\d{2}$/.test(valor.trim())
      if (soloDia && actual && actual.toISOString().slice(0, 10) === valor.trim()) return actual
      return fechaDeFormulario(await getCalendario(), valor, extremo)
    }
    const inicioRecibido = await leerFecha(
      validatedData.fechaInicioComercial ?? validatedData.fechaInicio ?? validatedData.fechaInicioPlan, 'inicio', currentDates.fechaInicio)
    const finRecibido = await leerFecha(
      validatedData.fechaFinComercial ?? validatedData.fechaFin ?? validatedData.fechaFinPlan, 'fin', currentDates.fechaFin)

    // ✅ Actualizar según el tipo de nodo
    let updateData: any = {}
    // Solo tareas: si queda como hito (se calcula en el case 'tarea').
    let esHitoFinal = false

    switch (nodeType) {
      case 'fase':
        updateData = {
          nombre: validatedData.nombre,
          descripcion: validatedData.descripcion,
          orden: validatedData.orden,
          fechaInicioPlan: inicioRecibido,
          fechaFinPlan: finRecibido,
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
          fechaInicioPlan: inicioRecibido,
          fechaFinPlan: finRecibido,
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
          fechaInicioPlan: inicioRecibido,
          fechaFinPlan: finRecibido,
          horasPlan: validatedData.horasEstimadas,
          prioridad: validatedData.prioridad,
          estado: validatedData.estado,
        }
        await prisma.proyectoActividad.update({
          where: { id: realId },
          data: updateData
        })
        break

      case 'tarea': {
        updateData = {
          nombre: validatedData.nombre,
          descripcion: validatedData.descripcion,
          orden: validatedData.orden,
          fechaInicio: inicioRecibido,
          fechaFin: finRecibido,
          // `??` y no `||`: 0 horas es un valor válido (tarea de duración con trabajo 0,
          // p. ej. una revisión del cliente); con `||` el 0 se ignoraba.
          horasEstimadas: validatedData.horasEstimadas ?? validatedData.horasPlan,
          prioridad: validatedData.prioridad,
          personasEstimadas: validatedData.personasEstimadas,
          recursoId: validatedData.recursoId,
          responsableId: validatedData.responsableId,
        }

        // Hito: un solo día (fin = inicio) y sin horas. Al dejar de ser hito
        // pierde la fecha límite (solo aplica a hitos).
        const tareaActual = await prisma.proyectoTarea.findUnique({
          where: { id: realId },
          select: { esHito: true, fechaInicio: true },
        })
        esHitoFinal = validatedData.esHito ?? tareaActual?.esHito ?? false
        if (validatedData.esHito !== undefined) updateData.esHito = validatedData.esHito
        if (esHitoFinal) {
          updateData.horasEstimadas = 0
          updateData.fechaFin = updateData.fechaInicio ?? tareaActual?.fechaInicio
          if (validatedData.fechaLimite !== undefined) {
            updateData.fechaLimite = validatedData.fechaLimite ? new Date(validatedData.fechaLimite) : null
          }
        } else if (validatedData.esHito === false) {
          updateData.fechaLimite = null
        }
        console.log('🔍 [API TREE UPDATE] Tarea updateData:', updateData)
        console.log('🔍 [API TREE UPDATE] validatedData:', validatedData)
        await prisma.proyectoTarea.update({
          where: { id: realId },
          data: updateData
        })

        // El % manda sobre el estado (ver src/lib/services/avanceTarea.ts): tanto marcar la
        // tarea como "completada" como editar directamente el % (columna "Avance %" de la
        // vista Tabla) van por el libro mayor para no desincronizar porcentajeCompletado,
        // igual que en /api/tareas/mis-asignadas. El resto de estados (pausada, cancelada,
        // planificado...) no tienen % asociado y se aplican tal cual.
        const nuevoProgreso =
          validatedData.estado === 'completada' ? 100 :
          validatedData.porcentajeCompletado !== undefined ? validatedData.porcentajeCompletado :
          undefined

        if (nuevoProgreso !== undefined) {
          await registrarAvanceTarea(prisma, {
            proyectoTareaId: realId,
            porcentaje: nuevoProgreso,
            fechaEfecto: new Date(),
            origen: 'oficina',
            usuarioId: session.user.id,
          })
          await propagarRollup(realId)
          updateData.estado = nuevoProgreso >= 100 ? 'completada' : nuevoProgreso > 0 ? 'en_progreso' : 'pendiente'
          updateData.porcentajeCompletado = nuevoProgreso
        } else if (validatedData.estado) {
          // Nota: el enum EstadoTarea de Prisma no incluye 'planificado' (solo EstadoEdt lo
          // tiene), pero STATUS_OPTIONS en TreeNodeForm lo ofrece igual para tareas — bug
          // preexistente y ajeno a este fix. `as any` preserva el comportamiento previo
          // (antes bypaseado porque `updateData` era `any`) en vez de romper el build.
          await prisma.proyectoTarea.update({
            where: { id: realId },
            data: { estado: validatedData.estado as any, updatedAt: new Date() }
          })
          updateData.estado = validatedData.estado
        }
        break
      }

      default:
        return NextResponse.json(
          { error: 'Tipo de nodo no soportado' },
          { status: 400 }
        )
    }

    console.log('✅ [API TREE UPDATE] Nodo actualizado exitosamente:', { nodeType, realId })

    // ✅ Mover en bloque cuando cambia el inicio de una fase/EDT/actividad/tarea:
    // todo lo de adentro se corre las mismas horas laborables (calendario del
    // proyecto), conservando cada duración. Si no se cambió también el fin, se
    // corre igual para conservar la duración del propio nodo (como MS Project).
    const campoInicio = nodeType === 'tarea' ? 'fechaInicio' : 'fechaInicioPlan'
    const campoFin = nodeType === 'tarea' ? 'fechaFin' : 'fechaFinPlan'
    const newFechaInicioRaw: Date | undefined = updateData[campoInicio]
    if (currentDates.fechaInicio && newFechaInicioRaw
        && newFechaInicioRaw.getTime() !== currentDates.fechaInicio.getTime()) {
      const calendario = await getCalendario()
      // Un inicio fuera de jornada (p. ej. soltar la barra del Gantt en sábado)
      // pasa al siguiente momento laborable. Un hito es un instante y se respeta.
      const inicioLaborable = esHitoFinal ? newFechaInicioRaw : siguienteMomentoLaborable(calendario, newFechaInicioRaw)
      const deltaHoras = deltaHorasEntre(calendario, currentDates.fechaInicio, inicioLaborable)
      const newFechaFinRaw: Date | undefined = updateData[campoFin]
      const finSinCambio = !newFechaFinRaw || (currentDates.fechaFin && newFechaFinRaw.getTime() === currentDates.fechaFin.getTime())
      const fechas: { inicio?: Date; fin?: Date } = {}
      if (inicioLaborable.getTime() !== newFechaInicioRaw.getTime()) fechas.inicio = inicioLaborable
      if (esHitoFinal) {
        // Un hito es un instante: su fin es su inicio.
        if (!newFechaFinRaw || newFechaFinRaw.getTime() !== inicioLaborable.getTime()) fechas.fin = inicioLaborable
      } else if (finSinCambio && currentDates.fechaFin) {
        fechas.fin = desplazarHorasLaborables(calendario, currentDates.fechaFin, deltaHoras, 'fin')
      }
      if (fechas.inicio || fechas.fin) {
        await actualizarFechasNodo(nodeType, realId, fechas)
        if (fechas.inicio) updateData[campoInicio] = fechas.inicio
        if (fechas.fin) updateData[campoFin] = fechas.fin
      }
      await desplazarDescendientes(calendario, nodeType, realId, deltaHoras)
      // Con los hijos ya movidos, el propio nodo toma sus fechas reales.
      if (nodeType !== 'tarea') await recalcularNodoPadre(nodeType, realId)
    }

    // ✅ GYS-GEN-12: Solo recalcular padres si fechas/horas realmente cambiaron
    const datesChanged = didDatesChange(nodeType, updateData, currentDates)
    if (datesChanged) {
      try {
        await recalcularPadresPostOperacion(id, nodeType, nodeId)
      } catch (error) {
        logger.error('❌ [API TREE UPDATE] Error en recálculo de padres:', error)
      }
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

// Fechas del propio nodo al moverlo en bloque: inicio llevado a día laborable
// y/o fin corrido para conservar la duración.
// (El desplazamiento de los hijos vive en cronogramaDesplazamiento.ts.)
async function actualizarFechasNodo(nodeType: string, realId: string, fechas: { inicio?: Date; fin?: Date }): Promise<void> {
  if (nodeType === 'tarea') {
    await prisma.proyectoTarea.update({
      where: { id: realId },
      data: { fechaInicio: fechas.inicio, fechaFin: fechas.fin, updatedAt: new Date() },
    })
    return
  }
  const data = { fechaInicioPlan: fechas.inicio, fechaFinPlan: fechas.fin, updatedAt: new Date() }
  if (nodeType === 'fase') await prisma.proyectoFase.update({ where: { id: realId }, data })
  else if (nodeType === 'edt') await prisma.proyectoEdt.update({ where: { id: realId }, data })
  else if (nodeType === 'actividad') await prisma.proyectoActividad.update({ where: { id: realId }, data })
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