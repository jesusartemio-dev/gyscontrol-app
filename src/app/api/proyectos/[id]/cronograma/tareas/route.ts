// ===================================================
// 📁 Archivo: route.ts
// 📌 Ubicación: src/app/api/proyectos/[id]/cronograma/tareas/route.ts
// 🔧 Descripción: API para gestión de tareas de cronograma
// 🎯 Funcionalidades: CRUD de tareas (4to nivel)
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { recalcularPadresPostOperacion } from '@/lib/utils/cronogramaRollup'
import { logger } from '@/lib/logger'
import { validarPermisoCronograma } from '@/lib/services/cronogramaPermisos'

// ✅ Schema de validación para crear tarea
const createTareaSchema = z.object({
  proyectoActividadId: z.string().min(1, 'El ID de la actividad es requerido'),
  nombre: z.string().min(1, 'El nombre es requerido'),
  descripcion: z.string().optional(),
  fechaInicio: z.string().optional(), // Opcional si se usa posicionamiento automático
  fechaFin: z.string().optional(), // Opcional si se usa posicionamiento automático
  horasEstimadas: z.number().optional(),
  personasEstimadas: z.number().int().min(1).optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).default('media'),
  dependenciaId: z.string().optional(),
  responsableId: z.string().optional(),
  recursoId: z.string().optional(),
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
  personasEstimadas: z.number().int().min(1).optional(),
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
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
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

    // ✅ Obtener tareas del proyecto (filtradas por cronograma si se especifica)
    const tipo = searchParams.get('tipo')
    const where: any = { proyectoEdt: { proyectoId: id } }
    if (cronogramaId && cronogramaId.trim() !== '') {
      where.proyectoCronogramaId = cronogramaId
    } else if (tipo && tipo.trim() !== '') {
      // Filtrar por tipo de cronograma + tareas extras (sin actividad)
      where.OR = [
        { proyectoCronograma: { tipo } },
        { proyectoActividadId: null }
      ]
    }

    const tareas = await prisma.proyectoTarea.findMany({
      where,
      include: {
        proyectoEdt: {
          include: {
            edt: true,
            proyecto: { select: { id: true, nombre: true } }
          }
        },
        user: true,
        dependenciasComoOrigen: true,
        dependenciasComoDependiente: true,
        registroHoras: true,
        proyectoSubtarea: true,
        _count: {
          select: { proyectoSubtarea: true, registroHoras: true }
        }
      },
      orderBy: { fechaInicio: 'asc' }
    })

    return NextResponse.json({
      success: true,
      data: tareas
    })

  } catch (error) {
    logger.error('Error al obtener tareas:', error)
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
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

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
    let actividad = await prisma.proyectoActividad.findFirst({
      where: {
        id: validatedData.proyectoActividadId
      },
      include: {
        proyectoEdt: true
      }
    })

    // Verificar que pertenece al proyecto
    if (!actividad || actividad.proyectoEdt.proyectoId !== id) {
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

    // ✅ Validar permisos: solo admin/gerente/gestor/coordinador y NO en cronograma comercial
    const permiso = await validarPermisoCronograma(cronogramaId)
    if (!permiso.ok) return permiso.response

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
    const cronogramaExists = await prisma.proyectoCronograma.findUnique({
      where: { id: cronogramaId }
    })

    if (!cronogramaExists) {
      logger.error('❌ [API TAREAS] Cronograma no encontrado:', cronogramaId)
      return NextResponse.json(
        { error: 'Cronograma no encontrado' },
        { status: 404 }
      )
    }

    console.log('✅ [API TAREAS] Cronograma verificado:', cronogramaExists.id)

    // ✅ Crear la tarea
    const tareaData = {
      id: crypto.randomUUID(),
      proyectoEdtId: actividad.proyectoEdtId,
      proyectoCronogramaId: actividad.proyectoCronogramaId,
      proyectoActividadId: validatedData.proyectoActividadId,
      nombre: validatedData.nombre,
      descripcion: validatedData.descripcion,
      fechaInicio: fechaInicio ?? new Date(),
      fechaFin: fechaFin ?? new Date(),
      horasEstimadas: validatedData.horasEstimadas,
      personasEstimadas: validatedData.personasEstimadas || 1,
      prioridad: validatedData.prioridad as 'baja' | 'media' | 'alta' | 'critica',
      dependenciaId: validatedData.dependenciaId,
      responsableId: validatedData.responsableId,
      recursoId: validatedData.recursoId,
      creadoPorId: session.user.id,
      estado: 'pendiente' as const,
      porcentajeCompletado: 0,
      esExtra: cronograma.tipo === 'ejecucion'
    }

    console.log('🔍 [API TAREAS] Datos finales para crear tarea:', tareaData)

    const tarea = await prisma.proyectoTarea.create({
      data: { ...tareaData, updatedAt: new Date() }
    })

    console.log('✅ [API TAREAS] Tarea creada exitosamente:', tarea.id)

    // ✅ GYS-GEN-12: Recalcular fechas y horas de padres después de crear tarea
    await recalcularPadresPostOperacion(id, 'tarea', tarea.id)

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

    logger.error('Error al crear tarea:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}