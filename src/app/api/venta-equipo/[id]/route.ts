import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params

    const venta = await prisma.ventaEquipo.findUnique({
      where: { id },
      include: {
        cliente: { select: { id: true, nombre: true, codigo: true } },
        comercial: { select: { id: true, name: true } },
        cotizacion: { select: { id: true, codigo: true, nombre: true, estado: true } },
        items: {
          orderBy: { createdAt: 'asc' },
          include: {
            catalogoEquipo: {
              select: { id: true, codigo: true, precioLogistica: true, fechaActualizacion: true },
            },
          },
        },
        pedidos: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            codigo: true,
            nombre: true,
            estado: true,
            fechaPedido: true,
            fechaNecesaria: true,
            fechaEntregaEstimada: true,
            esUrgente: true,
            prioridad: true,
            _count: { select: { pedidoEquipoItem: true } },
          },
        },
        ordenesCompra: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            numero: true,
            estado: true,
            total: true,
            moneda: true,
            proveedor: { select: { id: true, nombre: true } },
          },
        },
      },
    })

    if (!venta) {
      return NextResponse.json({ error: 'Venta de equipos no encontrada' }, { status: 404 })
    }

    return NextResponse.json(venta)
  } catch (error) {
    console.error('[GET /api/venta-equipo/[id]]', error)
    return NextResponse.json({ error: 'Error al obtener venta de equipos' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { id } = await context.params
    const body = await request.json()
    const { estado, nombre, fechaEntregaEstimada, observacion } = body

    const venta = await prisma.ventaEquipo.findUnique({ where: { id } })
    if (!venta) {
      return NextResponse.json({ error: 'Venta de equipos no encontrada' }, { status: 404 })
    }

    const updated = await prisma.ventaEquipo.update({
      where: { id },
      data: {
        ...(estado && { estado }),
        ...(nombre && { nombre }),
        ...(fechaEntregaEstimada !== undefined && {
          fechaEntregaEstimada: fechaEntregaEstimada ? new Date(fechaEntregaEstimada) : null,
        }),
        ...(observacion !== undefined && { observacion }),
      },
      include: {
        cliente: { select: { id: true, nombre: true, codigo: true } },
        comercial: { select: { id: true, name: true } },
        cotizacion: { select: { id: true, codigo: true, nombre: true } },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PATCH /api/venta-equipo/[id]]', error)
    return NextResponse.json({ error: 'Error al actualizar venta de equipos' }, { status: 500 })
  }
}
