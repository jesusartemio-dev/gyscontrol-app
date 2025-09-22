// ===================================================
// 📁 Archivo: [servicioId]/route.ts
// 📌 Ubicación: /api/cotizacion/[id]/servicios/[servicioId]
// 🔧 Descripción: API para actualizar tiempo de entrega de servicio
// ✅ PUT para actualizar plazoEntregaSemanas
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// ===================================================
// ✏️ PUT /api/cotizacion/[id]/servicios/[servicioId]
// ===================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; servicioId: string }> }
) {
  const { id, servicioId } = await params

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

    // Verificar que el servicio existe y pertenece a la cotización
    const servicioExistente = await prisma.cotizacionServicio.findFirst({
      where: {
        id: servicioId,
        cotizacionId: id
      }
    })

    if (!servicioExistente) {
      return NextResponse.json(
        { error: 'Servicio no encontrado en esta cotización' },
        { status: 404 }
      )
    }

    // Actualizar el tiempo de entrega
    const servicioActualizado = await prisma.cotizacionServicio.update({
      where: { id: servicioId },
      data: { plazoEntregaSemanas }
    })

    logger.info(`✅ Plazo de entrega actualizado para servicio: ${servicioId} - ${plazoEntregaSemanas} semanas`)

    return NextResponse.json({
      success: true,
      data: servicioActualizado,
      message: 'Plazo de entrega actualizado exitosamente'
    })

  } catch (error) {
    logger.error('❌ Error al actualizar plazo de entrega del servicio:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}