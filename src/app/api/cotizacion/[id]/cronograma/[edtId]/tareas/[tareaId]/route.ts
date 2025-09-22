/**
 * 📝 API Tarea Individual - Cronograma Comercial
 *
 * Endpoints para gestión de una tarea específica dentro de un EDT comercial.
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

// ✅ Función para recalcular horas totales del EDT
async function recalcularHorasEdt(edtId: string) {
  const tareas = await prisma.cotizacionTarea.findMany({
    where: { cotizacionEdtId: edtId },
    select: { horasEstimadas: true }
  })

  const totalHoras = tareas.reduce((sum, tarea) => {
    return sum + (tarea.horasEstimadas?.toNumber() || 0)
  }, 0)

  await prisma.cotizacionEdt.update({
    where: { id: edtId },
    data: { horasEstimadas: totalHoras }
  })
}

// ===================================================
// ✏️ PUT /api/cotizacion/[id]/cronograma/[edtId]/tareas/[tareaId]
// ===================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; edtId: string; tareaId: string }> }
) {
  const { id, edtId, tareaId } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    // Validar datos de entrada
    const validData = crearCotizacionTareaSchema.parse(body)

    // Verificar que la tarea existe y pertenece al EDT
    const tareaExistente = await prisma.cotizacionTarea.findFirst({
      where: {
        id: tareaId,
        cotizacionEdtId: edtId,
        cotizacionEdt: {
          cotizacionId: id
        }
      }
    })

    if (!tareaExistente) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      )
    }

    // Verificar que la dependencia existe si se especifica
    if (validData.dependenciaDeId) {
      const dependencia = await prisma.cotizacionTarea.findFirst({
        where: {
          id: validData.dependenciaDeId,
          cotizacionEdtId: edtId
        }
      })

      if (!dependencia) {
        return NextResponse.json(
          { error: 'Tarea de dependencia no encontrada' },
          { status: 400 }
        )
      }
    }

    const tareaActualizada = await prisma.cotizacionTarea.update({
      where: { id: tareaId },
      data: {
        nombre: validData.nombre,
        fechaInicio: validData.fechaInicioCom ? new Date(validData.fechaInicioCom) : tareaExistente.fechaInicio,
        fechaFin: validData.fechaFinCom ? new Date(validData.fechaFinCom) : tareaExistente.fechaFin,
        horasEstimadas: validData.horasCom,
        dependenciaId: validData.dependenciaDeId,
        descripcion: validData.descripcion,
        prioridad: validData.prioridad,
        responsableId: validData.responsableId,
        // cotizacionServicioItemId: validData.cotizacionServicioItemId // ✅ Nueva relación - pendiente regenerar Prisma
      },
      include: {
        responsable: {
          select: { id: true, name: true, email: true }
        }
      }
    })

    // ✅ Recalcular horas totales del EDT
    await recalcularHorasEdt(edtId)

    logger.info(`✅ Tarea comercial actualizada: ${tareaId} - EDT: ${edtId}`)

    return NextResponse.json({
      success: true,
      data: tareaActualizada,
      message: 'Tarea comercial actualizada exitosamente'
    })

  } catch (error) {
    logger.error('❌ Error al actualizar tarea comercial:', error)

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

// ===================================================
// 🗑️ DELETE /api/cotizacion/[id]/cronograma/[edtId]/tareas/[tareaId]
// ===================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; edtId: string; tareaId: string }> }
) {
  const { id, edtId, tareaId } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que la tarea existe y pertenece al EDT
    const tareaExistente = await prisma.cotizacionTarea.findFirst({
      where: {
        id: tareaId,
        cotizacionEdtId: edtId,
        cotizacionEdt: {
          cotizacionId: id
        }
      }
    })

    if (!tareaExistente) {
      return NextResponse.json(
        { error: 'Tarea no encontrada' },
        { status: 404 }
      )
    }

    await prisma.cotizacionTarea.delete({
      where: { id: tareaId }
    })

    // ✅ Recalcular horas totales del EDT
    await recalcularHorasEdt(edtId)

    logger.info(`✅ Tarea comercial eliminada: ${tareaId} - EDT: ${edtId}`)

    return NextResponse.json({
      success: true,
      message: 'Tarea comercial eliminada exitosamente'
    })

  } catch (error) {
    logger.error('❌ Error al eliminar tarea comercial:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}