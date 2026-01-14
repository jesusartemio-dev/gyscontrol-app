/**
 * 📋 API Batch Tasks - Cronograma Comercial
 *
 * Endpoint para creación masiva de tareas desde ítems de servicio.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { crearCotizacionTareaSchema } from '@/lib/validators/cronograma'

interface BatchTaskData {
  nombre: string
  descripcion?: string
  fechaInicioCom?: string
  fechaFinCom?: string
  horasCom: number
  dependenciaDeId?: string
  prioridad: string
  responsableId?: string
  cotizacionServicioItemId?: string
}

interface BatchDependencyData {
  fromTaskIndex: number
  toTaskIndex: number
  type: 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'
}

interface BatchRequestData {
  tasks: BatchTaskData[]
  dependencies?: BatchDependencyData[]
  extendEdtEnd?: string | null // Nueva propiedad para extender fecha fin del EDT
}

// ===================================================
// 📝 POST /api/cotizacion/[id]/cronograma/[edtId]/tareas/batch
// ===================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; edtId: string }> }
) {
  const { id, edtId } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body: BatchRequestData = await request.json()

    // Validar estructura básica
    if (!body.tasks || !Array.isArray(body.tasks) || body.tasks.length === 0) {
      return NextResponse.json(
        { error: 'Debe proporcionar al menos una tarea' },
        { status: 400 }
      )
    }

    if (body.tasks.length > 50) {
      return NextResponse.json(
        { error: 'No se pueden crear más de 50 tareas en una sola operación' },
        { status: 400 }
      )
    }

    // Verificar que el EDT existe y pertenece a la cotización
    const edt = await prisma.cotizacionEdt.findFirst({
      where: {
        id: edtId,
        cotizacionId: id
      }
    })

    if (!edt) {
      return NextResponse.json(
        { error: 'EDT no encontrado' },
        { status: 404 }
      )
    }

    // Validar cada tarea individualmente
    const validatedTasks: BatchTaskData[] = []
    for (const task of body.tasks) {
      try {
        const validatedTask = crearCotizacionTareaSchema.parse(task)
        validatedTasks.push(validatedTask)
      } catch (validationError) {
        logger.error('Error de validación en tarea:', validationError)
        return NextResponse.json(
          { error: 'Datos de tarea inválidos', details: validationError },
          { status: 400 }
        )
      }
    }

    // Verificar dependencias si se proporcionan
    if (body.dependencies && body.dependencies.length > 0) {
      for (const dep of body.dependencies) {
        if (dep.fromTaskIndex >= validatedTasks.length || dep.toTaskIndex >= validatedTasks.length) {
          return NextResponse.json(
            { error: 'Índice de dependencia fuera de rango' },
            { status: 400 }
          )
        }
      }
    }

    // Crear tareas en una transacción para asegurar consistencia
    const result = await prisma.$transaction(async (tx) => {
      const createdTasks = []

      // Crear todas las tareas primero
      for (let i = 0; i < validatedTasks.length; i++) {
        const taskData = validatedTasks[i]
        // Verificar que la dependencia existe si se especifica
        if (taskData.dependenciaDeId) {
          const dependencia = await tx.cotizacionTarea.findFirst({
            where: {
              id: taskData.dependenciaDeId,
              cotizacionActividad: {
                cotizacionEdtId: edtId
              }
            }
          })

          if (!dependencia) {
            throw new Error(`Tarea de dependencia no encontrada: ${taskData.dependenciaDeId}`)
          }
        }

        const nuevaTarea = await tx.cotizacionTarea.create({
          data: {
            nombre: taskData.nombre,
            descripcion: taskData.descripcion,
            fechaInicio: taskData.fechaInicioCom ? new Date(taskData.fechaInicioCom) : new Date(),
            fechaFin: taskData.fechaFinCom ? new Date(taskData.fechaFinCom) : new Date(),
            horasEstimadas: taskData.horasCom,
            orden: i, // Guardar el orden personalizado definido por el usuario
            prioridad: taskData.prioridad as any, // Cast to match Prisma enum
            responsableId: taskData.responsableId ?? null,
            cotizacionActividadId: '' // TODO: Fix to use proper activity ID
          } as any,
          include: {
            responsable: {
              select: { id: true, name: true, email: true }
            }
          }
        })

        createdTasks.push(nuevaTarea)
      }

      // Procesar dependencias si se proporcionaron
      if (body.dependencies && body.dependencies.length > 0) {
        for (const dep of body.dependencies) {
          const fromTask = createdTasks[dep.fromTaskIndex]
          const toTask = createdTasks[dep.toTaskIndex]

          if (fromTask && toTask) {
            // Nota: Dependencias no implementadas en el schema actual
            // await tx.cotizacionTarea.update({
            //   where: { id: toTask.id },
            //   data: { dependenciaId: fromTask.id }
            // })
          }
        }
      }

      // Recalcular horas totales del EDT
      const totalHoras = createdTasks.reduce((sum, tarea) => {
        return sum + (tarea.horasEstimadas?.toNumber() || 0)
      }, 0)

      // Preparar actualización del EDT
      const edtUpdateData: any = { horasEstimadas: totalHoras }

      // Extender fecha fin del EDT si es necesario
      if (body.extendEdtEnd) {
        edtUpdateData.fechaFinComercial = new Date(body.extendEdtEnd)
        logger.info(`📅 Extendiendo fecha fin del EDT ${edtId} a: ${body.extendEdtEnd}`)
      }

      await tx.cotizacionEdt.update({
        where: { id: edtId },
        data: edtUpdateData
      })

      return createdTasks
    })

    logger.info(`✅ Batch creation completed: ${result.length} tasks created for EDT: ${edtId}`)

    return NextResponse.json({
      success: true,
      data: {
        createdTasks: result,
        totalCreated: result.length
      },
      message: `Se crearon ${result.length} tareas exitosamente`
    }, { status: 201 })

  } catch (error) {
    logger.error('❌ Error en creación masiva de tareas:', error)

    if (error instanceof Error && error.message.includes('dependencia')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Datos de entrada inválidos', details: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}