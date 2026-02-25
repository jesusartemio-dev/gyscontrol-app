import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (session.user.role !== 'admin') {
      return NextResponse.json({ error: 'Solo administradores' }, { status: 403 })
    }

    const { id: proyectoId } = await params

    const proyecto = await prisma.proyecto.findUnique({
      where: { id: proyectoId },
      select: { id: true, nombre: true, codigo: true },
    })
    if (!proyecto) {
      return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
    }

    // Listas de equipo
    const listas = await prisma.listaEquipo.findMany({
      where: { proyectoId },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        estado: true,
        _count: {
          select: {
            listaEquipoItem: true,
            pedidoEquipo: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Pedidos de equipo
    const pedidos = await prisma.pedidoEquipo.findMany({
      where: { proyectoId },
      select: {
        id: true,
        codigo: true,
        estado: true,
        listaId: true,
        _count: {
          select: {
            ordenesCompra: true,
            pedidoEquipoItem: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Ordenes de compra (via pedidos del proyecto)
    const pedidoIds = pedidos.map(p => p.id)
    const ordenesCompra = await prisma.ordenCompra.findMany({
      where: { pedidoEquipoId: { in: pedidoIds } },
      select: {
        id: true,
        numero: true,
        estado: true,
        pedidoEquipoId: true,
        _count: {
          select: {
            items: true,
            cuentasPorPagar: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Cuentas por pagar
    const ocIds = ordenesCompra.map(oc => oc.id)
    const cuentasPorPagar = await prisma.cuentaPorPagar.findMany({
      where: {
        OR: [
          { pedidoEquipoId: { in: pedidoIds } },
          { ordenCompraId: { in: ocIds } },
        ],
      },
      select: {
        id: true,
        numeroFactura: true,
        monto: true,
        saldoPendiente: true,
        estado: true,
        pedidoEquipoId: true,
        ordenCompraId: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Valorizaciones
    const valorizaciones = await prisma.valorizacion.findMany({
      where: { proyectoId },
      select: {
        id: true,
        codigo: true,
        estado: true,
        montoValorizacion: true,
        _count: {
          select: {
            cuentasPorCobrar: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Cuentas por cobrar
    const valIds = valorizaciones.map(v => v.id)
    const cuentasPorCobrar = await prisma.cuentaPorCobrar.findMany({
      where: { valorizacionId: { in: valIds } },
      select: {
        id: true,
        descripcion: true,
        monto: true,
        montoPagado: true,
        estado: true,
        valorizacionId: true,
        _count: {
          select: {
            pagos: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({
      proyecto,
      listas,
      pedidos,
      ordenesCompra,
      cuentasPorPagar,
      valorizaciones,
      cuentasPorCobrar,
      resumen: {
        totalListas: listas.length,
        totalPedidos: pedidos.length,
        totalOCs: ordenesCompra.length,
        totalCxP: cuentasPorPagar.length,
        totalValorizaciones: valorizaciones.length,
        totalCxC: cuentasPorCobrar.length,
      },
    })
  } catch (error) {
    console.error('Error al obtener dependency tree:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
