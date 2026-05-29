import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const clienteId = searchParams.get('clienteId')
    const estado = searchParams.get('estado')
    const searchText = searchParams.get('searchText')
    const fechaDesde = searchParams.get('fechaDesde')
    const fechaHasta = searchParams.get('fechaHasta')

    const where: any = {}

    if (clienteId) where.clienteId = clienteId
    if (estado) where.estado = estado

    if (fechaDesde || fechaHasta) {
      where.createdAt = {
        ...(fechaDesde && { gte: new Date(fechaDesde) }),
        ...(fechaHasta && { lte: new Date(fechaHasta + 'T23:59:59.999Z') }),
      }
    }

    if (searchText) {
      where.OR = [
        { codigo: { contains: searchText, mode: 'insensitive' } },
        { nombre: { contains: searchText, mode: 'insensitive' } },
        { cliente: { nombre: { contains: searchText, mode: 'insensitive' } } },
      ]
    }

    const ventas = await prisma.ventaEquipo.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        cliente: { select: { id: true, nombre: true, codigo: true } },
        comercial: { select: { id: true, name: true } },
        cotizacion: { select: { id: true, codigo: true, nombre: true } },
        _count: { select: { items: true, pedidos: true } },
      },
    })

    return NextResponse.json(ventas)
  } catch (error) {
    console.error('[GET /api/venta-equipo]', error)
    return NextResponse.json({ error: 'Error al obtener ventas de equipos' }, { status: 500 })
  }
}
