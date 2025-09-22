// ===================================================
// 📁 Archivo: [condicionId]/route.ts
// 📌 Ubicación: /api/cotizacion/[id]/condiciones/[condicionId]
// 🔧 Descripción: API para gestionar condición individual
// ✅ PUT y DELETE para CotizacionCondicion
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// ===================================================
// ✏️ PUT /api/cotizacion/[id]/condiciones/[condicionId]
// ===================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; condicionId: string }> }
) {
  const { id, condicionId } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { descripcion, tipo, orden } = body

    // Validar datos
    if (!descripcion || descripcion.trim() === '') {
      return NextResponse.json(
        { error: 'La descripción es requerida' },
        { status: 400 }
      )
    }

    // Verificar que la condición existe y pertenece a la cotización
    const condicionExistente = await prisma.cotizacionCondicion.findFirst({
      where: {
        id: condicionId,
        cotizacionId: id
      }
    })

    if (!condicionExistente) {
      return NextResponse.json(
        { error: 'Condición no encontrada' },
        { status: 404 }
      )
    }

    // Actualizar la condición
    const condicionActualizada = await prisma.cotizacionCondicion.update({
      where: { id: condicionId },
      data: {
        descripcion: descripcion.trim(),
        ...(tipo !== undefined && { tipo: tipo?.trim() || null }),
        ...(orden !== undefined && { orden })
      }
    })

    logger.info(`✅ Condición actualizada: ${condicionId} - Cotización: ${id}`)

    return NextResponse.json({
      success: true,
      data: condicionActualizada,
      message: 'Condición actualizada exitosamente'
    })

  } catch (error) {
    logger.error('❌ Error al actualizar condición:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ===================================================
// 🗑️ DELETE /api/cotizacion/[id]/condiciones/[condicionId]
// ===================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; condicionId: string }> }
) {
  const { id, condicionId } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que la condición existe y pertenece a la cotización
    const condicionExistente = await prisma.cotizacionCondicion.findFirst({
      where: {
        id: condicionId,
        cotizacionId: id
      }
    })

    if (!condicionExistente) {
      return NextResponse.json(
        { error: 'Condición no encontrada' },
        { status: 404 }
      )
    }

    // Eliminar la condición
    await prisma.cotizacionCondicion.delete({
      where: { id: condicionId }
    })

    logger.info(`✅ Condición eliminada: ${condicionId} - Cotización: ${id}`)

    return NextResponse.json({
      success: true,
      message: 'Condición eliminada exitosamente'
    })

  } catch (error) {
    logger.error('❌ Error al eliminar condición:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}