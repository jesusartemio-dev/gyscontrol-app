import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const now = new Date()
    const en7Dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const [cxcPendientePEN, cxcPendienteUSD, cxcVencido, cxpPendientePEN, cxpPendienteUSD, cxpVencidoPEN, cxpVencidoUSD, cxpProximaVencer, cuentasBancarias] = await Promise.all([
      // CxC pendiente PEN
      prisma.cuentaPorCobrar.aggregate({
        where: { estado: { in: ['pendiente', 'parcial'] }, moneda: 'PEN' },
        _sum: { saldoPendiente: true },
        _count: true,
      }),

      // CxC pendiente USD
      prisma.cuentaPorCobrar.aggregate({
        where: { estado: { in: ['pendiente', 'parcial'] }, moneda: 'USD' },
        _sum: { saldoPendiente: true },
        _count: true,
      }),

      // CxC vencidas (all currencies)
      prisma.cuentaPorCobrar.findMany({
        where: {
          estado: { in: ['pendiente', 'parcial'] },
          fechaVencimiento: { lt: now },
        },
        include: {
          cliente: { select: { id: true, nombre: true } },
          proyecto: { select: { id: true, codigo: true, nombre: true } },
        },
        orderBy: { fechaVencimiento: 'asc' },
        take: 10,
      }),

      // CxP pendiente PEN
      prisma.cuentaPorPagar.aggregate({
        where: { estado: { in: ['pendiente', 'parcial'] }, moneda: 'PEN' },
        _sum: { saldoPendiente: true },
        _count: true,
      }),

      // CxP pendiente USD
      prisma.cuentaPorPagar.aggregate({
        where: { estado: { in: ['pendiente', 'parcial'] }, moneda: 'USD' },
        _sum: { saldoPendiente: true },
        _count: true,
      }),

      // CxP vencidas PEN
      prisma.cuentaPorPagar.aggregate({
        where: {
          estado: { in: ['pendiente', 'parcial'] },
          fechaVencimiento: { lt: now },
          moneda: 'PEN',
        },
        _sum: { saldoPendiente: true },
        _count: true,
      }),

      // CxP vencidas USD
      prisma.cuentaPorPagar.aggregate({
        where: {
          estado: { in: ['pendiente', 'parcial'] },
          fechaVencimiento: { lt: now },
          moneda: 'USD',
        },
        _sum: { saldoPendiente: true },
        _count: true,
      }),

      // CxP próximas a vencer (7 días)
      prisma.cuentaPorPagar.findMany({
        where: {
          estado: { in: ['pendiente', 'parcial'] },
          fechaVencimiento: { gte: now, lte: en7Dias },
        },
        include: {
          proveedor: { select: { id: true, nombre: true } },
          proyecto: { select: { id: true, codigo: true, nombre: true } },
        },
        orderBy: { fechaVencimiento: 'asc' },
        take: 10,
      }),

      // Cuentas bancarias activas
      prisma.cuentaBancaria.findMany({
        where: { activa: true },
        orderBy: [{ moneda: 'asc' }, { nombreBanco: 'asc' }],
      }),
    ])

    const round = (n: number) => Math.round((n || 0) * 100) / 100

    return NextResponse.json({
      cuentasPorCobrar: {
        pendientePEN: round(cxcPendientePEN._sum.saldoPendiente || 0),
        pendienteUSD: round(cxcPendienteUSD._sum.saldoPendiente || 0),
        totalPendiente: round((cxcPendientePEN._sum.saldoPendiente || 0) + (cxcPendienteUSD._sum.saldoPendiente || 0)),
        countPendiente: cxcPendientePEN._count + cxcPendienteUSD._count,
        vencidas: cxcVencido.map(c => ({
          id: c.id,
          monto: c.saldoPendiente,
          moneda: c.moneda,
          fechaVencimiento: c.fechaVencimiento,
          cliente: c.cliente,
          proyecto: c.proyecto,
          numeroDocumento: c.numeroDocumento,
        })),
      },
      cuentasPorPagar: {
        pendientePEN: round(cxpPendientePEN._sum.saldoPendiente || 0),
        pendienteUSD: round(cxpPendienteUSD._sum.saldoPendiente || 0),
        totalPendiente: round((cxpPendientePEN._sum.saldoPendiente || 0) + (cxpPendienteUSD._sum.saldoPendiente || 0)),
        countPendiente: cxpPendientePEN._count + cxpPendienteUSD._count,
        vencidoPEN: round(cxpVencidoPEN._sum.saldoPendiente || 0),
        vencidoUSD: round(cxpVencidoUSD._sum.saldoPendiente || 0),
        totalVencido: round((cxpVencidoPEN._sum.saldoPendiente || 0) + (cxpVencidoUSD._sum.saldoPendiente || 0)),
        countVencido: cxpVencidoPEN._count + cxpVencidoUSD._count,
        proximasVencer: cxpProximaVencer.map(c => ({
          id: c.id,
          monto: c.saldoPendiente,
          moneda: c.moneda,
          fechaVencimiento: c.fechaVencimiento,
          proveedor: c.proveedor,
          proyecto: c.proyecto,
          numeroFactura: c.numeroFactura,
          condicionPago: c.condicionPago,
        })),
      },
      cuentasBancarias,
    })
  } catch (error) {
    console.error('Error al obtener dashboard:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
