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

    const { id: cuentaPorCobrarId } = await params
    const body = await req.json()
    const { monto, fechaPago, medioPago, numeroOperacion, cuentaBancariaId, observaciones,
      conDetraccion, detraccionPorcentaje, detraccionCodigo, detraccionFechaPago, cuentaBNId, numeroConstanciaBN } = body

    if (!monto || !fechaPago) {
      return NextResponse.json({ error: 'monto y fechaPago son requeridos' }, { status: 400 })
    }

    const cuenta = await prisma.cuentaPorCobrar.findUnique({ where: { id: cuentaPorCobrarId } })
    if (!cuenta) {
      return NextResponse.json({ error: 'Cuenta por cobrar no encontrada' }, { status: 404 })
    }
    if (cuenta.estado === 'anulada') {
      return NextResponse.json({ error: 'No se puede registrar pago en cuenta anulada' }, { status: 400 })
    }

    let pagos: any[]

    if (conDetraccion && detraccionPorcentaje > 0) {
      // Split: detracción + neto
      const detraccionMonto = Math.round(monto * detraccionPorcentaje / 100 * 100) / 100
      const montoNeto = Math.round((monto - detraccionMonto) * 100) / 100

      pagos = await prisma.$transaction([
        prisma.pagoCobro.create({
          data: {
            cuentaPorCobrarId,
            cuentaBancariaId: cuentaBNId || null,
            monto: detraccionMonto,
            fechaPago: detraccionFechaPago ? new Date(detraccionFechaPago) : new Date(fechaPago),
            medioPago: 'detraccion',
            numeroOperacion: numeroOperacion || null,
            observaciones: `Detracción ${detraccionPorcentaje}%${detraccionCodigo ? ` (${detraccionCodigo})` : ''}`,
            esDetraccion: true,
            detraccionPorcentaje,
            detraccionCodigo: detraccionCodigo || null,
            detraccionMonto,
            detraccionFechaPago: detraccionFechaPago ? new Date(detraccionFechaPago) : null,
            numeroConstanciaBN: numeroConstanciaBN || null,
            updatedAt: new Date(),
          },
        }),
        prisma.pagoCobro.create({
          data: {
            cuentaPorCobrarId,
            cuentaBancariaId: cuentaBancariaId || null,
            monto: montoNeto,
            fechaPago: new Date(fechaPago),
            medioPago: medioPago || 'transferencia',
            numeroOperacion: numeroOperacion || null,
            observaciones: observaciones || null,
            esDetraccion: false,
            updatedAt: new Date(),
          },
        }),
      ])
    } else {
      // Pago normal (sin detracción)
      const pago = await prisma.pagoCobro.create({
        data: {
          cuentaPorCobrarId,
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
      pagos = [pago]
    }

    // Recalcular saldo de la cuenta
    const totalPagado = await prisma.pagoCobro.aggregate({
      where: { cuentaPorCobrarId },
      _sum: { monto: true },
    })

    const montoPagado = totalPagado._sum.monto || 0
    const saldoPendiente = Math.round((cuenta.monto - montoPagado) * 100) / 100

    const nuevoEstado: typeof cuenta.estado = saldoPendiente <= 0 ? 'pagada'
      : montoPagado > 0 ? 'parcial'
      : cuenta.estado

    await prisma.cuentaPorCobrar.update({
      where: { id: cuentaPorCobrarId },
      data: {
        montoPagado: Math.round(montoPagado * 100) / 100,
        saldoPendiente: Math.max(0, saldoPendiente),
        estado: nuevoEstado,
        updatedAt: new Date(),
      },
    })

    return NextResponse.json(pagos.length === 1 ? pagos[0] : pagos, { status: 201 })
  } catch (error) {
    console.error('Error al registrar pago CxC:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
