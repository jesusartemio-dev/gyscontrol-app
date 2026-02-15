import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!ROLES_ALLOWED.includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id: cuentaPorPagarId } = await params
    const body = await req.json()
    const { monto, fechaPago, medioPago, numeroOperacion, cuentaBancariaId, observaciones } = body

    if (!monto || !fechaPago) {
      return NextResponse.json({ error: 'monto y fechaPago son requeridos' }, { status: 400 })
    }

    const cuenta = await prisma.cuentaPorPagar.findUnique({ where: { id: cuentaPorPagarId } })
    if (!cuenta) {
      return NextResponse.json({ error: 'Cuenta por pagar no encontrada' }, { status: 404 })
    }
    if (cuenta.estado === 'anulada') {
      return NextResponse.json({ error: 'No se puede registrar pago en cuenta anulada' }, { status: 400 })
    }

    const pago = await prisma.pagoPagar.create({
      data: {
        cuentaPorPagarId,
        cuentaBancariaId: cuentaBancariaId || null,
        monto,
        fechaPago: new Date(fechaPago),
        medioPago: medioPago || 'transferencia',
        numeroOperacion: numeroOperacion || null,
        observaciones: observaciones || null,
        updatedAt: new Date(),
      },
      include: {
        cuentaBancaria: { select: { id: true, nombreBanco: true, numeroCuenta: true } },
      },
    })

    // Recalcular saldo
    const totalPagado = await prisma.pagoPagar.aggregate({
      where: { cuentaPorPagarId },
      _sum: { monto: true },
    })

    const montoPagado = totalPagado._sum.monto || 0
    const saldoPendiente = Math.round((cuenta.monto - montoPagado) * 100) / 100

    const nuevoEstado = saldoPendiente <= 0 ? 'pagada' as const
      : montoPagado > 0 ? 'parcial' as const
      : cuenta.estado

    await prisma.cuentaPorPagar.update({
      where: { id: cuentaPorPagarId },
      data: {
        montoPagado: Math.round(montoPagado * 100) / 100,
        saldoPendiente: Math.max(0, saldoPendiente),
        estado: nuevoEstado,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(pago, { status: 201 })
  } catch (error) {
    console.error('Error al registrar pago CxP:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
