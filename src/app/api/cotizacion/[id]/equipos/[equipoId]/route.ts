// ===================================================
// 📁 Archivo: [equipoId]/route.ts
// 📌 Ubicación: /api/cotizacion/[id]/equipos/[equipoId]
// 🔧 Descripción: API para actualizar tiempo de entrega de equipo
// ✅ PUT para actualizar plazoEntregaSemanas
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// ===================================================
// ✏️ PUT /api/cotizacion/[id]/equipos/[equipoId]
// ===================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; equipoId: string }> }
) {
  const { id, equipoId } = await params

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

    // Verificar que el equipo existe y pertenece a la cotización
    const equipoExistente = await prisma.cotizacionEquipo.findFirst({
      where: {
        id: equipoId,
        cotizacionId: id
      }
    })

    if (!equipoExistente) {
      return NextResponse.json(
        { error: 'Equipo no encontrado en esta cotización' },
        { status: 404 }
      )
    }

    // Actualizar el tiempo de entrega
    const equipoActualizado = await prisma.cotizacionEquipo.update({
      where: { id: equipoId },
      data: { plazoEntregaSemanas }
    })

    logger.info(`✅ Plazo de entrega actualizado para equipo: ${equipoId} - ${plazoEntregaSemanas} semanas`)

    return NextResponse.json({
      success: true,
      data: equipoActualizado,
      message: 'Plazo de entrega actualizado exitosamente'
    })

  } catch (error) {
    logger.error('❌ Error al actualizar plazo de entrega del equipo:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}