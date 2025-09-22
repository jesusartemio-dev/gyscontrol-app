/**
 * 📋 API Servicio Items Disponibles - Cronograma Comercial
 *
 * Endpoints para obtener ítems de servicio disponibles para crear tareas.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ===================================================
// 📋 GET /api/cotizacion/[id]/cronograma/[edtId]/servicio-items
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

    // Verificar que el EDT existe y pertenece a la cotización
    const edt = await prisma.cotizacionEdt.findFirst({
      where: {
        id: edtId,
        cotizacionId: id
      },
      select: {
        id: true,
        cotizacionServicioId: true
      }
    })

    if (!edt) {
      return NextResponse.json(
        { error: 'EDT no encontrado' },
        { status: 404 }
      )
    }

    if (!edt.cotizacionServicioId) {
      return NextResponse.json(
        { error: 'EDT no tiene servicio asociado' },
        { status: 400 }
      )
    }

    // Obtener ítems del servicio con información de tareas existentes
    const itemsDisponibles = await prisma.cotizacionServicioItem.findMany({
      where: {
        cotizacionServicioId: edt.cotizacionServicioId
      },
      include: {
        cotizacionTareas: {
          where: {
            cotizacionEdtId: edtId
          },
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: {
        orden: 'asc'
      }
    })

    // Marcar ítems que ya tienen tareas asociadas
    const itemsConEstado = itemsDisponibles.map(item => ({
      ...item,
      yaImportado: (item as any).cotizacionTareas?.length > 0,
      tareaExistente: (item as any).cotizacionTareas?.length > 0 ? (item as any).cotizacionTareas[0] : null,
      cotizacionTareas: undefined // Remover del response
    }))

    return NextResponse.json({
      success: true,
      data: itemsConEstado,
      meta: {
        totalItems: itemsDisponibles.length,
        edtId,
        cotizacionId: id
      }
    })

  } catch (error) {
    console.error('❌ Error al obtener ítems de servicio disponibles:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}