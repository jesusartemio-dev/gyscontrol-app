/**
 * 📅 API EDT Individual - Cronograma Comercial
 *
 * Endpoints para gestión de un EDT específico del cronograma comercial.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { actualizarCotizacionEdtSchema } from '@/lib/validators/cronograma'

// ===================================================
// 📋 GET /api/cotizacion/[id]/cronograma/[edtId]
// ===================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; edtId: string }> }
) {
  const { id, edtId } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const edt = await prisma.cotizacionEdt.findFirst({
      where: {
        id: edtId,
        cotizacionId: id // Verificar que pertenece a la cotización
      },
      include: {
        categoriaServicio: {
          select: { id: true, nombre: true }
        },
        responsable: {
          select: { id: true, name: true, email: true }
        },
        tareas: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!edt) {
      return NextResponse.json(
        { error: 'EDT no encontrado' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: edt
    })

  } catch (error) {
    logger.error('❌ Error al obtener EDT comercial:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ===================================================
// 📝 PUT /api/cotizacion/[id]/cronograma/[edtId]
// ===================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; edtId: string }> }
) {
  const { id, edtId } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()

    // Validar datos de entrada
    const validData = actualizarCotizacionEdtSchema.parse(body)

    // Verificar que el EDT existe y pertenece a la cotización
    const edtExistente = await prisma.cotizacionEdt.findFirst({
      where: {
        id: edtId,
        cotizacionId: id
      }
    })

    if (!edtExistente) {
      return NextResponse.json(
        { error: 'EDT no encontrado' },
        { status: 404 }
      )
    }

    // Si se está cambiando la categoría o zona, verificar unicidad
    if (validData.categoriaServicioId || validData.zona !== undefined) {
      const nuevaCategoria = validData.categoriaServicioId || edtExistente.categoriaServicioId
      const nuevaZona = validData.zona !== undefined ? validData.zona : edtExistente.zona

      const conflicto = await prisma.cotizacionEdt.findFirst({
        where: {
          cotizacionId: id,
          categoriaServicioId: nuevaCategoria,
          zona: nuevaZona,
          id: { not: edtId } // Excluir el EDT actual
        }
      })

      if (conflicto) {
        return NextResponse.json(
          { error: 'Ya existe un EDT para esta combinación de categoría y zona' },
          { status: 400 }
        )
      }
    }

    const edtActualizado = await prisma.cotizacionEdt.update({
      where: { id: edtId },
      data: {
        ...(validData.categoriaServicioId && { categoriaServicioId: validData.categoriaServicioId }),
        ...(validData.zona !== undefined && { zona: validData.zona }),
        ...(validData.fechaInicioCom && { fechaInicioComercial: new Date(validData.fechaInicioCom) }),
        ...(validData.fechaFinCom && { fechaFinComercial: new Date(validData.fechaFinCom) }),
        ...(validData.horasCom !== undefined && { horasEstimadas: validData.horasCom }),
        ...(validData.responsableId !== undefined && { responsableId: validData.responsableId }),
        ...(validData.descripcion !== undefined && { descripcion: validData.descripcion }),
        ...(validData.prioridad && { prioridad: validData.prioridad })
      },
      include: {
        categoriaServicio: true,
        responsable: true,
        tareas: true
      }
    })

    logger.info(`✅ EDT comercial actualizado: ${edtId}`)

    return NextResponse.json({
      success: true,
      data: edtActualizado,
      message: 'EDT comercial actualizado exitosamente'
    })

  } catch (error) {
    logger.error('❌ Error al actualizar EDT comercial:', error)

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
// 🗑️ DELETE /api/cotizacion/[id]/cronograma/[edtId]
// ===================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; edtId: string }> }
) {
  const { id, edtId } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que el EDT existe y pertenece a la cotización
    const edt = await prisma.cotizacionEdt.findFirst({
      where: {
        id: edtId,
        cotizacionId: id
      },
      include: {
        tareas: {
          select: { id: true }
        }
      }
    })

    if (!edt) {
      return NextResponse.json(
        { error: 'EDT no encontrado' },
        { status: 404 }
      )
    }

    // Eliminar el EDT (las tareas se eliminan automáticamente por cascade)
    await prisma.cotizacionEdt.delete({
      where: { id: edtId }
    })

    logger.info(`✅ EDT comercial eliminado: ${edtId} - Tareas eliminadas: ${edt.tareas.length}`)

    return NextResponse.json({
      success: true,
      message: 'EDT comercial eliminado exitosamente',
      data: {
        edtId,
        tareasEliminadas: edt.tareas.length
      }
    })

  } catch (error) {
    logger.error('❌ Error al eliminar EDT comercial:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}