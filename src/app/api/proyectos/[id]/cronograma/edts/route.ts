// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/edts/route.ts
// 🔧 Descripción: API para gestión de EDTs de proyecto
// 🎯 Funcionalidades: CRUD de EDTs (Estructura de Desglose de Trabajo)
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

// Import rollup functions
async function recalcularPadresPostOperacion(
  proyectoId: string,
  nodeType: string,
  nodeId: string
): Promise<void> {
  console.log(`🔄 GYS-GEN-12: Recalculando padres después de operación en ${nodeType} ${nodeId}`)

  let parentId: string | null = null
  let parentType: string | null = null

  // Determinar el padre según el tipo de nodo
  switch (nodeType) {
    case 'tarea':
      // Buscar la actividad padre de la tarea
      const tarea = await prisma.proyectoTarea.findUnique({
        where: { id: nodeId },
        select: { proyectoActividadId: true }
      })
      if (tarea?.proyectoActividadId) {
        parentId = tarea.proyectoActividadId
        parentType = 'actividad'
      }
      break

    case 'actividad':
      // Buscar el EDT padre de la actividad
      const actividad = await prisma.proyectoActividad.findUnique({
        where: { id: nodeId },
        select: { proyectoEdtId: true }
      })
      if (actividad?.proyectoEdtId) {
        parentId = actividad.proyectoEdtId
        parentType = 'edt'
      }
      break

    case 'edt':
      // Buscar la fase padre del EDT
      const edt = await prisma.proyectoEdt.findUnique({
        where: { id: nodeId },
        select: { proyectoFaseId: true }
      })
      if (edt?.proyectoFaseId) {
        parentId = edt.proyectoFaseId
        parentType = 'fase'
      }
      break

    case 'fase':
      // Las fases no tienen padre en el árbol jerárquico
      return
  }

  // Si encontramos un padre, recalcularlo
  if (parentId && parentType) {
    await recalcularNodoPadre(parentType, parentId)

    // Recalcular recursivamente hacia arriba
    await recalcularPadresPostOperacion(proyectoId, parentType, parentId)
  }
}

// ✅ Función auxiliar para recalcular un nodo padre específico
async function recalcularNodoPadre(parentType: string, parentId: string): Promise<void> {
  console.log(`🔄 Recalculando ${parentType} ${parentId}`)

  switch (parentType) {
    case 'actividad':
      await recalcularActividadPadre(parentId)
      break
    case 'edt':
      await recalcularEdtPadre(parentId)
      break
    case 'fase':
      await recalcularFasePadre(parentId)
      break
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
      fechaFinPlan: fechaFinMax
      // Las fases no tienen campo horasPlan en el esquema actual
    }
  })
}

// ✅ Schema de validación para crear EDT
const createEdtSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido'),
  categoriaServicioId: z.string().min(1, 'La categoría de servicio es requerida'),
  proyectoFaseId: z.string().optional(),
  zona: z.string().optional(),
  fechaInicioPlan: z.string().optional(),
  fechaFinPlan: z.string().optional(),
  horasPlan: z.number().min(0).default(0),
  responsableId: z.string().optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).default('media'),
  descripcion: z.string().optional(),
})

// ✅ Schema de validación para actualizar EDT
const updateEdtSchema = z.object({
  nombre: z.string().min(1, 'El nombre es requerido').optional(),
  categoriaServicioId: z.string().min(1, 'La categoría de servicio es requerida').optional(),
  proyectoFaseId: z.string().optional(),
  zona: z.string().optional(),
  fechaInicioPlan: z.string().optional(),
  fechaFinPlan: z.string().optional(),
  fechaInicioReal: z.string().optional(),
  fechaFinReal: z.string().optional(),
  horasPlan: z.number().min(0).optional(),
  porcentajeAvance: z.number().int().min(0).max(100).optional(),
  estado: z.enum(['planificado', 'en_progreso', 'detenido', 'completado', 'cancelado']).optional(),
  responsableId: z.string().optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).optional(),
  descripcion: z.string().optional(),
})

// ✅ GET /api/proyectos/[id]/cronograma/edts - Obtener EDTs del proyecto
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)
    const faseId = searchParams.get('faseId')
    const cronogramaId = searchParams.get('cronogramaId')

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

    // ✅ Construir filtros
    const where: any = { proyectoId: id }
    if (faseId) where.proyectoFaseId = faseId
    if (cronogramaId) where.proyectoCronogramaId = cronogramaId

    // ✅ Obtener todos los EDTs del proyecto
    const edts = await (prisma as any).proyectoEdt.findMany({
      where,
      include: {
        proyecto: {
          select: { id: true, nombre: true, codigo: true, estado: true }
        },
        categoriaServicio: {
          select: { id: true, nombre: true }
        },
        responsable: {
          select: { id: true, name: true, email: true }
        },
        proyectoFase: {
          select: { id: true, nombre: true }
        },
        proyectoCronograma: {
          select: { id: true, tipo: true, nombre: true }
        },
        _count: {
          select: { ProyectoTarea: true }
        }
      },
      orderBy: [
        { proyectoFase: { orden: 'asc' } },
        { prioridad: 'desc' },
        { fechaInicioPlan: 'asc' }
      ]
    })

    return NextResponse.json({
      success: true,
      data: edts
    })

  } catch (error) {
    console.error('Error al obtener EDTs:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ✅ POST /api/proyectos/[id]/cronograma/edts - Crear nuevo EDT
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    // ✅ Validar datos de entrada
    const validatedData = createEdtSchema.parse(body)

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

    // ✅ Validar que el EDT existe (cambio de categoriaServicio a edt según refactoring)
    const edtValidation = await (prisma as any).edt.findUnique({
      where: { id: validatedData.categoriaServicioId }
    })

    if (!edtValidation) {
      return NextResponse.json(
        { error: 'EDT no encontrado' },
        { status: 404 }
      )
    }

    // ✅ Determinar el cronograma (por defecto el comercial si existe)
    let cronogramaId = null
    if (validatedData.proyectoFaseId) {
      // Si se especifica una fase, obtener el cronograma de esa fase
      const fase = await (prisma as any).proyectoFase.findUnique({
        where: { id: validatedData.proyectoFaseId },
        select: { proyectoCronogramaId: true }
      })
      cronogramaId = fase?.proyectoCronogramaId
    } else {
      // Buscar cronograma comercial por defecto
      const cronogramaComercial = await (prisma as any).proyectoCronograma.findFirst({
        where: {
          proyectoId: id,
          tipo: 'comercial'
        }
      })
      cronogramaId = cronogramaComercial?.id
    }

    if (!cronogramaId) {
      return NextResponse.json(
        { error: 'No se encontró un cronograma válido para el proyecto' },
        { status: 404 }
      )
    }

    // ✅ Crear el EDT
    const edt = await (prisma as any).proyectoEdt.create({
      data: {
        proyectoId: id,
        proyectoCronogramaId: cronogramaId,
        proyectoFaseId: validatedData.proyectoFaseId,
        nombre: validatedData.nombre,
        categoriaServicioId: validatedData.categoriaServicioId,
        zona: validatedData.zona,
        fechaInicioPlan: validatedData.fechaInicioPlan ? new Date(validatedData.fechaInicioPlan) : null,
        fechaFinPlan: validatedData.fechaFinPlan ? new Date(validatedData.fechaFinPlan) : null,
        horasPlan: validatedData.horasPlan,
        responsableId: validatedData.responsableId,
        prioridad: validatedData.prioridad,
        descripcion: validatedData.descripcion,
        estado: 'planificado',
        porcentajeAvance: 0
      },
      include: {
        proyecto: {
          select: { id: true, nombre: true, codigo: true, estado: true }
        },
        categoriaServicio: {
          select: { id: true, nombre: true }
        },
        responsable: {
          select: { id: true, name: true, email: true }
        },
        proyectoFase: {
          select: { id: true, nombre: true }
        },
        proyectoCronograma: {
          select: { id: true, tipo: true, nombre: true }
        }
      }
    })

    // ✅ SISTEMA DE ZONAS VIRTUALES: Crear zona virtual automáticamente
    // Si no se especifica zona, crear una zona virtual por defecto
    if (!validatedData.zona) {
      try {
        await (prisma as any).proyectoZona.create({
          data: {
            proyectoId: id,
            proyectoEdtId: edt.id,
            nombre: `Zona General - ${validatedData.nombre}`,
            esVirtual: true,
            nombreVirtual: 'zona_general_edt',
            fechaInicioPlan: validatedData.fechaInicioPlan ? new Date(validatedData.fechaInicioPlan) : null,
            fechaFinPlan: validatedData.fechaFinPlan ? new Date(validatedData.fechaFinPlan) : null,
            estado: 'planificado',
            porcentajeAvance: 0,
            horasPlan: validatedData.horasPlan
          }
        })
        console.log('✅ Zona virtual creada automáticamente para EDT:', edt.nombre)
      } catch (zonaError) {
        console.warn('⚠️ Error creando zona virtual, continuando sin ella:', zonaError)
        // No fallar la creación del EDT por error en zona virtual
      }
    }

    // ✅ GYS-GEN-12: Recalcular fechas y horas de padres después de crear EDT
    await recalcularPadresPostOperacion(id, 'edt', `edt-${edt.id}`)

    return NextResponse.json({
      success: true,
      data: edt
    }, { status: 201 })

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Datos inválidos', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Error al crear EDT:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}