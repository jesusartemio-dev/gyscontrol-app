// ===================================================
// 📁 Archivo: [gastoId]/route.ts
// 📌 Ubicación: /api/cotizacion/[id]/gastos/[gastoId]
// 🔧 Descripción: API para actualizar tiempo de entrega de gasto
// ✅ PUT para actualizar plazoEntregaSemanas
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// ===================================================
// ✏️ PUT /api/cotizacion/[id]/gastos/[gastoId]
// ===================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; gastoId: string }> }
) {
  const { id, gastoId } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { plazoEntregaSemanas } = body

    // Validar que el plazo sea un número positivo o null
    if (plazoEntregaSemanas !== null && (typeof plazoEntregaSemanas !== 'number' || plazoEntregaSemanas < 0)) {
      return NextResponse.json(
        { error: 'El plazo de entrega debe ser un número positivo o null' },
        { status: 400 }
      )
    }

    // Verificar que el gasto existe y pertenece a la cotización
    const gastoExistente = await prisma.cotizacionGasto.findFirst({
      where: {
        id: gastoId,
        cotizacionId: id
      }
    })

    if (!gastoExistente) {
      return NextResponse.json(
        { error: 'Gasto no encontrado en esta cotización' },
        { status: 404 }
      )
    }

    // Actualizar el tiempo de entrega
    const gastoActualizado = await prisma.cotizacionGasto.update({
      where: { id: gastoId },
      data: { plazoEntregaSemanas }
    })

    logger.info(`✅ Plazo de entrega actualizado para gasto: ${gastoId} - ${plazoEntregaSemanas} semanas`)

    return NextResponse.json({
      success: true,
      data: gastoActualizado,
      message: 'Plazo de entrega actualizado exitosamente'
    })

  } catch (error) {
    logger.error('❌ Error al actualizar plazo de entrega del gasto:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}