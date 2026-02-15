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

    // CxC totales
    const [cxcPendiente, cxcVencido, cxpPendiente, cxpVencido, cxpProximaVencer, cuentasBancarias] = await Promise.all([
      // Total CxC pendiente
      prisma.cuentaPorCobrar.aggregate({
        where: { estado: { in: ['pendiente', 'parcial'] } },
        _sum: { saldoPendiente: true },
        _count: true,
      }),

      // CxC vencidas
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

      // Total CxP pendiente
      prisma.cuentaPorPagar.aggregate({
        where: { estado: { in: ['pendiente', 'parcial'] } },
        _sum: { saldoPendiente: true },
        _count: true,
      }),

      // CxP vencidas
      prisma.cuentaPorPagar.aggregate({
        where: {
          estado: { in: ['pendiente', 'parcial'] },
          fechaVencimiento: { lt: now },
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

      // Saldos por cuenta bancaria (solo activas)
      prisma.cuentaBancaria.findMany({
        where: { activa: true },
        orderBy: [{ moneda: 'asc' }, { nombreBanco: 'asc' }],
      }),
    ])

    return NextResponse.json({
      cuentasPorCobrar: {
        totalPendiente: Math.round((cxcPendiente._sum.saldoPendiente || 0) * 100) / 100,
        countPendiente: cxcPendiente._count,
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
        totalPendiente: Math.round((cxpPendiente._sum.saldoPendiente || 0) * 100) / 100,
        countPendiente: cxpPendiente._count,
        totalVencido: Math.round((cxpVencido._sum.saldoPendiente || 0) * 100) / 100,
        countVencido: cxpVencido._count,
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
