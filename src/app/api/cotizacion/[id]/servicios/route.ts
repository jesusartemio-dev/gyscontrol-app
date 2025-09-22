/**
 * 📋 API Servicios de Cotización
 *
 * Endpoints para obtener los servicios asociados a una cotización específica.
 *
 * @author GYS Team
 * @version 1.0.0
 */

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// ===================================================
// 📋 GET /api/cotizacion/[id]/servicios
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

    // Obtener servicios de la cotización
    const servicios = await prisma.cotizacionServicio.findMany({
      where: { cotizacionId: id },
      include: {
        items: {
          include: {
            catalogoServicio: {
              include: {
                categoria: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'asc' }
    })

    // Agregar categoriaServicioId a cada servicio
    const serviciosConCategoriaId = servicios.map(servicio => ({
      ...servicio,
      categoriaServicioId: servicio.items[0]?.catalogoServicio?.categoria?.id || null
    }))

    return NextResponse.json({
      success: true,
      data: serviciosConCategoriaId,
      meta: {
        totalServicios: servicios.length,
        cotizacion: {
          id: cotizacion.id,
          codigo: cotizacion.codigo
        }
      }
    })

  } catch (error) {
    console.error('❌ Error al obtener servicios de cotización:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}