// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/tareas/route.ts
// 🔧 Descripción: API para gestión de tareas de cronograma
// 🎯 Funcionalidades: CRUD de tareas (4to nivel)
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// ✅ Función auxiliar para extraer ID real de nodeId con prefijo
function extractRealId(nodeId: string): string {
  const parts = nodeId.split('-', 2)
  return parts.length === 2 ? parts[1] : nodeId
}

// ✅ Función auxiliar para construir nodeId con prefijo
function buildNodeId(type: string, id: string): string {
  return `${type}-${id}`
}

// Import rollup functions
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
    console.error(`❌ [ROLLUP] Error recalculando ${parentType} ${fullParentId}:`, error)
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

  // Calcular horas totales (aunque las fases no tienen campo horasPlan, lo calculamos para consistencia)
  const horasTotales = edts.reduce((sum, edt) => sum + Number(edt.horasPlan || 0), 0)

  await prisma.proyectoFase.update({
    where: { id: faseId },
    data: {
      fechaInicioPlan: fechaInicioMin,
      fechaFinPlan: fechaFinMax,
      // Las fases no tienen campo horasPlan en el esquema actual
    }
  })
}

// ✅ Schema de validación para crear tarea
const createTareaSchema = z.object({
  proyectoActividadId: z.string().min(1, 'El ID de la actividad es requerido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  fechaInicio: z.string().optional(), // Opcional si se usa posicionamiento automático
  fechaFin: z.string().optional(), // Opcional si se usa posicionamiento automático
  horasEstimadas: z.number().optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).default('media'),
  dependenciaId: z.string().optional(),
  responsableId: z.string().optional(),
  posicionamiento: z.enum(['inicio_padre', 'despues_ultima']).optional(),
})

// ✅ Schema de validación para actualizar tarea
const updateTareaSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  descripcion: z.string().optional(),
  fechaInicio: z.string().optional(),
  fechaFin: z.string().optional(),
  fechaInicioReal: z.string().optional(),
  fechaFinReal: z.string().optional(),
  horasEstimadas: z.number().optional(),
  estado: z.enum(['pendiente', 'en_progreso', 'completada', 'cancelada', 'pausada']).optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional(),
  porcentajeCompletado: z.number().int().min(0).max(100).optional(),
  dependenciaId: z.string().optional(),
  responsableId: z.string().optional(),
})

// ✅ GET /api/proyectos/[id]/cronograma/tareas - Obtener tareas del proyecto
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

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

    // ✅ Obtener todas las tareas del proyecto
    const tareas = await (prisma as any).proyectoTarea.findMany({
      where: { proyectoEdt: { proyectoId: id } },
      include: {
        proyectoEdt: {
          include: {
            categoriaServicio: true
          }
        },
        responsable: true,
        dependencia: true,
        tareasDependientes: true,
        registrosHoras: true,
        subtareas: true,
        _count: {
          select: { subtareas: true, registrosHoras: true }
        }
      },
      orderBy: { fechaInicio: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: tareas
    })

  } catch (error) {
    console.error('Error al obtener tareas:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ POST /api/proyectos/[id]/cronograma/tareas - Crear nueva tarea
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // ✅ Validar datos de entrada
    const validatedData = createTareaSchema.parse(body)

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

    // ✅ Validar que la actividad existe y pertenece al proyecto
    let actividad = await (prisma as any).proyectoActividad.findFirst({
      where: {
        id: validatedData.proyectoActividadId
      },
      include: {
        proyecto_edt: true
      }
    })

    // Verificar que pertenece al proyecto
    if (!actividad || actividad.proyecto_edt.proyectoId !== id) {
      return NextResponse.json(
        { error: 'Actividad no encontrada o no pertenece al proyecto' },
        { status: 404 }
      )
    }

    if (!actividad) {
      return NextResponse.json(
        { error: 'Actividad no encontrada o no pertenece al proyecto' },
        { status: 404 }
      )
    }

    // ✅ Determinar fechas automáticamente según posicionamiento
    let fechaInicio: Date | null = null
    let fechaFin: Date | null = null

    if (validatedData.fechaInicio && validatedData.fechaFin) {
      // Si se especificaron fechas manualmente, usarlas
      fechaInicio = new Date(validatedData.fechaInicio)
      fechaFin = new Date(validatedData.fechaFin)
      console.log('🔍 [API TAREAS] Usando fechas manuales:', {
        fechaInicio: fechaInicio.toISOString(),
        fechaFin: fechaFin.toISOString()
      })
    } else {
      // Calcular fechas automáticamente según posicionamiento
      const posicionamiento = validatedData.posicionamiento || 'despues_ultima'

      if (posicionamiento === 'inicio_padre') {
        // Al inicio de la actividad padre - usar fechas de la actividad
        fechaInicio = actividad.fechaInicioPlan
        fechaFin = actividad.fechaFinPlan
        console.log('🔍 [API TAREAS] Fechas calculadas al inicio de la actividad:', {
          fechaInicio: fechaInicio?.toISOString(),
          fechaFin: fechaFin?.toISOString()
        })
      } else if (posicionamiento === 'despues_ultima') {
        // Después del último hermano - buscar la última tarea de la actividad
        const ultimaTarea = await prisma.proyectoTarea.findFirst({
          where: { proyectoActividadId: validatedData.proyectoActividadId },
          orderBy: { fechaFin: 'desc' },
          select: { fechaFin: true }
        })

        if (ultimaTarea?.fechaFin) {
          // Calcular fecha de inicio como el día siguiente a la última tarea
          fechaInicio = new Date(ultimaTarea.fechaFin)
          fechaInicio.setDate(fechaInicio.getDate() + 1)

          // Fecha fin por defecto: 3 días después (tareas son más cortas)
          fechaFin = new Date(fechaInicio)
          fechaFin.setDate(fechaFin.getDate() + 3)

          console.log('🔍 [API TAREAS] Fechas calculadas después del último hermano:', {
            fechaInicio: fechaInicio.toISOString(),
            fechaFin: fechaFin.toISOString()
          })
        } else {
          // No hay tareas previas, usar fechas de la actividad
          fechaInicio = actividad.fechaInicioPlan
          fechaFin = actividad.fechaFinPlan
          console.log('🔍 [API TAREAS] Primera tarea de la actividad:', {
            fechaInicio: fechaInicio?.toISOString(),
            fechaFin: fechaFin?.toISOString()
          })
        }
      }
    }

    // ✅ Obtener el cronograma de la actividad para asignarlo a la tarea
    // Nota: Las tareas heredan el cronograma de su actividad padre
    const cronogramaId = actividad.proyectoCronogramaId

    // ✅ Validar que el cronograma sea baseline si es de planificación
    const cronograma = await prisma.proyectoCronograma.findUnique({
      where: { id: cronogramaId }
    })

    if (!cronograma) {
      return NextResponse.json(
        { error: 'Cronograma de la actividad no encontrado' },
        { status: 404 }
      )
    }

    // Si es un cronograma de planificación, debe ser baseline para crear tareas
    if (cronograma.tipo === 'planificacion' && !cronograma.esBaseline) {
      return NextResponse.json(
        { error: 'Solo se pueden crear tareas en cronogramas de planificación marcados como baseline' },
        { status: 400 }
      )
    }

    console.log('🔍 [API TAREAS] Actividad encontrada:', {
      id: actividad.id,
      nombre: actividad.nombre,
      proyectoEdtId: actividad.proyectoEdtId,
      proyectoCronogramaId: actividad.proyectoCronogramaId,
      fechaInicioPlan: actividad.fechaInicioPlan,
      fechaFinPlan: actividad.fechaFinPlan
    })

    console.log('🔍 [API TAREAS] Creando tarea con datos finales:', {
      proyectoActividadId: validatedData.proyectoActividadId,
      proyectoCronogramaId: cronogramaId,
      nombre: validatedData.nombre,
      fechaInicio: fechaInicio?.toISOString(),
      fechaFin: fechaFin?.toISOString(),
      posicionamiento: validatedData.posicionamiento
    })

    // ✅ Verificar que el cronograma existe
    const cronogramaExists = await (prisma as any).proyectoCronograma.findUnique({
      where: { id: cronogramaId }
    })

    if (!cronogramaExists) {
      console.error('❌ [API TAREAS] Cronograma no encontrado:', cronogramaId)
      return NextResponse.json(
        { error: 'Cronograma no encontrado' },
        { status: 404 }
      )
    }

    console.log('✅ [API TAREAS] Cronograma verificado:', cronogramaExists.id)

    // ✅ Crear la tarea
    const tareaData = {
      proyectoEdtId: actividad.proyectoEdtId,
      proyectoCronogramaId: actividad.proyectoCronogramaId,
      proyectoActividadId: validatedData.proyectoActividadId,
      nombre: validatedData.nombre,
      descripcion: validatedData.descripcion,
      fechaInicio: fechaInicio,
      fechaFin: fechaFin,
      horasEstimadas: validatedData.horasEstimadas,
      prioridad: validatedData.prioridad,
      dependenciaId: validatedData.dependenciaId,
      responsableId: validatedData.responsableId,
      estado: 'pendiente',
      porcentajeCompletado: 0
    }

    console.log('🔍 [API TAREAS] Datos finales para crear tarea:', tareaData)

    const tarea = await (prisma as any).proyectoTarea.create({
      data: tareaData
    })

    console.log('✅ [API TAREAS] Tarea creada exitosamente:', tarea.id)

    // ✅ GYS-GEN-12: Recalcular fechas y horas de padres después de crear tarea
    await recalcularPadresPostOperacion(id, 'tarea', `tarea-${tarea.id}`)

    return NextResponse.json({
      success: true,
      data: tarea
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error al crear tarea:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}