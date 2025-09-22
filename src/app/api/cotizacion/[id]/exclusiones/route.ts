// ===================================================
// 📁 Archivo: [id]/exclusiones/route.ts
// 📌 Ubicación: /api/cotizacion/[id]/exclusiones
// 🔧 Descripción: API para gestionar exclusiones de cotización
// ✅ CRUD completo para CotizacionExclusion
// ===================================================

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

// ===================================================
// 📋 GET /api/cotizacion/[id]/exclusiones
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

    // Obtener todas las exclusiones ordenadas
    const exclusiones = await prisma.cotizacionExclusion.findMany({
      where: { cotizacionId: id },
      orderBy: { orden: 'asc' }
    })

    logger.info(`📋 Exclusiones obtenidas: ${exclusiones.length} - Cotización: ${id}`)

    return NextResponse.json({
      success: true,
      data: exclusiones,
      meta: {
        total: exclusiones.length,
        cotizacion: {
          id: cotizacion.id,
          codigo: cotizacion.codigo
        }
      }
    })

  } catch (error) {
    logger.error('❌ Error al obtener exclusiones:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

// ===================================================
// ➕ POST /api/cotizacion/[id]/exclusiones
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
    const { descripcion, orden } = body

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
      const maxOrden = await prisma.cotizacionExclusion.findFirst({
        where: { cotizacionId: id },
        orderBy: { orden: 'desc' },
        select: { orden: true }
      })
      ordenFinal = (maxOrden?.orden || 0) + 1
    }

    // Crear la exclusión
    const nuevaExclusion = await prisma.cotizacionExclusion.create({
      data: {
        cotizacionId: id,
        descripcion: descripcion.trim(),
        orden: ordenFinal
      }
    })

    logger.info(`✅ Exclusión creada: ${nuevaExclusion.id} - Cotización: ${id}`)

    return NextResponse.json({
      success: true,
      data: nuevaExclusion,
      message: 'Exclusión creada exitosamente'
    }, { status: 201 })

  } catch (error) {
    logger.error('❌ Error al crear exclusión:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}