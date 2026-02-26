import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1'))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20')))
    const estado = searchParams.get('estado') || undefined
    const proyectoId = searchParams.get('proyectoId') || undefined
    const search = searchParams.get('search') || undefined

    const where: any = {}

    if (estado && estado !== 'all') {
      where.estado = estado
    }

    if (proyectoId) {
      where.pedidoEquipoItem = {
        pedidoEquipo: { proyectoId }
      }
    }

    if (search) {
      where.OR = [
        { ordenCompraItem: { codigo: { contains: search, mode: 'insensitive' } } },
        { ordenCompraItem: { descripcion: { contains: search, mode: 'insensitive' } } },
        { ordenCompraItem: { ordenCompra: { numero: { contains: search, mode: 'insensitive' } } } },
        { pedidoEquipoItem: { codigo: { contains: search, mode: 'insensitive' } } },
      ]
    }

    const [data, total] = await Promise.all([
      prisma.recepcionPendiente.findMany({
        where,
        include: {
          ordenCompraItem: {
            select: {
              id: true,
              codigo: true,
              descripcion: true,
              cantidad: true,
              unidad: true,
              ordenCompra: {
                select: {
                  id: true,
                  numero: true,
                  proyecto: { select: { id: true, nombre: true, codigo: true } },
                }
              },
            }
          },
          pedidoEquipoItem: {
            select: {
              id: true,
              codigo: true,
              pedidoEquipo: { select: { id: true, codigo: true } },
            }
          },
          confirmadoPor: { select: { name: true } },
          entregadoPor: { select: { name: true } },
          rechazadoPor: { select: { name: true } },
        },
        orderBy: { fechaRecepcion: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.recepcionPendiente.count({ where }),
    ])

    const totalPages = Math.ceil(total / limit)

    // Counts by estado for tab badges
    const counts = await prisma.recepcionPendiente.groupBy({
      by: ['estado'],
      _count: true,
    })
    const countsByEstado: Record<string, number> = {}
    for (const c of counts) {
      countsByEstado[c.estado] = c._count
    }

    return NextResponse.json({
      ok: true,
      data,
      counts: countsByEstado,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      }
    })
  } catch (error) {
    console.error('Error al obtener recepciones:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
