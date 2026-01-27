// ===================================================
// 📁 Archivo: [id]/condiciones/route.ts
// 📌 Ubicación: /api/cotizacion/[id]/condiciones
// 🔧 Descripción: API para gestionar condiciones de cotización
// ✅ CRUD completo para CotizacionCondicion
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// ===================================================
// 📋 GET /api/cotizacion/[id]/condiciones
// ===================================================

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verificar que la cotización existe
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      select: { id: true, codigo: true }
    })

    if (!cotizacion) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      )
    }

    // Obtener todas las condiciones ordenadas
    const condiciones = await prisma.cotizacionCondicion.findMany({
      where: { cotizacionId: id },
      orderBy: { orden: 'asc' }
    })

    logger.info(`📋 Condiciones obtenidas: ${condiciones.length} - Cotización: ${id}`)

    return NextResponse.json({
      success: true,
      data: condiciones,
      meta: {
        total: condiciones.length,
        cotizacion: {
          id: cotizacion.id,
          codigo: cotizacion.codigo
        }
      }
    })

  } catch (error) {
    logger.error('❌ Error al obtener condiciones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ===================================================
// ➕ POST /api/cotizacion/[id]/condiciones
// ===================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { descripcion, tipo, orden } = body

    // Validar datos requeridos
    if (!descripcion || descripcion.trim() === '') {
      return NextResponse.json(
        { error: 'La descripción es requerida' },
        { status: 400 }
      )
    }

    // Verificar que la cotización existe
    const cotizacion = await prisma.cotizacion.findUnique({
      where: { id },
      select: { id: true, codigo: true }
    })

    if (!cotizacion) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      )
    }

    // Determinar el orden si no se proporciona
    let ordenFinal = orden
    if (ordenFinal === undefined || ordenFinal === null) {
      const maxOrden = await prisma.cotizacionCondicion.findFirst({
        where: { cotizacionId: id },
        orderBy: { orden: 'desc' },
        select: { orden: true }
      })
      ordenFinal = (maxOrden?.orden || 0) + 1
    }

    // Crear la condición
    const nuevaCondicion = await prisma.cotizacionCondicion.create({
      data: {
        id: `cot-cond-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        cotizacionId: id,
        descripcion: descripcion.trim(),
        tipo: tipo?.trim() || null,
        orden: ordenFinal,
        updatedAt: new Date()
      }
    })

    logger.info(`✅ Condición creada: ${nuevaCondicion.id} - Cotización: ${id}`)

    return NextResponse.json({
      success: true,
      data: nuevaCondicion,
      message: 'Condición creada exitosamente'
    }, { status: 201 })

  } catch (error) {
    logger.error('❌ Error al crear condición:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}