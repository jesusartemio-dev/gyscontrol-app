// ===================================================
// 📁 Archivo: [exclusionId]/route.ts
// 📌 Ubicación: /api/cotizacion/[id]/exclusiones/[exclusionId]
// 🔧 Descripción: API para gestionar exclusión individual
// ✅ PUT y DELETE para CotizacionExclusion
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// ===================================================
// ✏️ PUT /api/cotizacion/[id]/exclusiones/[exclusionId]
// ===================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; exclusionId: string }> }
) {
  const { id, exclusionId } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { descripcion, orden } = body

    // Validar datos
    if (!descripcion || descripcion.trim() === '') {
      return NextResponse.json(
        { error: 'La descripción es requerida' },
        { status: 400 }
      )
    }

    // Verificar que la exclusión existe y pertenece a la cotización
    const exclusionExistente = await prisma.cotizacionExclusion.findFirst({
      where: {
        id: exclusionId,
        cotizacionId: id
      }
    })

    if (!exclusionExistente) {
      return NextResponse.json(
        { error: 'Exclusión no encontrada' },
        { status: 404 }
      )
    }

    // Actualizar la exclusión
    const exclusionActualizada = await prisma.cotizacionExclusion.update({
      where: { id: exclusionId },
      data: {
        descripcion: descripcion.trim(),
        ...(orden !== undefined && { orden })
      }
    })

    logger.info(`✅ Exclusión actualizada: ${exclusionId} - Cotización: ${id}`)

    return NextResponse.json({
      success: true,
      data: exclusionActualizada,
      message: 'Exclusión actualizada exitosamente'
    })

  } catch (error) {
    logger.error('❌ Error al actualizar exclusión:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ===================================================
// 🗑️ DELETE /api/cotizacion/[id]/exclusiones/[exclusionId]
// ===================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; exclusionId: string }> }
) {
  const { id, exclusionId } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que la exclusión existe y pertenece a la cotización
    const exclusionExistente = await prisma.cotizacionExclusion.findFirst({
      where: {
        id: exclusionId,
        cotizacionId: id
      }
    })

    if (!exclusionExistente) {
      return NextResponse.json(
        { error: 'Exclusión no encontrada' },
        { status: 404 }
      )
    }

    // Eliminar la exclusión
    await prisma.cotizacionExclusion.delete({
      where: { id: exclusionId }
    })

    logger.info(`✅ Exclusión eliminada: ${exclusionId} - Cotización: ${id}`)

    return NextResponse.json({
      success: true,
      message: 'Exclusión eliminada exitosamente'
    })

  } catch (error) {
    logger.error('❌ Error al eliminar exclusión:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}