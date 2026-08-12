import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { recalcularCuentaPorCobrar } from '@/lib/services/pagoCobro'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

const round2 = (n: number) => Math.round(n * 100) / 100

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
    const {
      monto, fechaPago, medioPago, numeroOperacion, cuentaBancariaId, observaciones,
      conDetraccion, detraccionPorcentaje, detraccionCodigo, detraccionFechaPago,
      cuentaBNId, numeroConstanciaBN,
      conRetencion, retencionPorcentaje, retencionFecha, retencionNumeroConstancia,
    } = body

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

    // Calcular splits — la retención y la detracción se calculan sobre el monto bruto del documento (monto recibido)
    // y el resto va al pago neto.
    // SUNAT RS 183-2004 (Quinta Disp. Final): depósito de detracciones sin decimales
    const detraccionMonto = (conDetraccion && detraccionPorcentaje > 0)
      ? Math.round(monto * detraccionPorcentaje / 100)
      : 0
    const retencionMonto = (conRetencion && retencionPorcentaje > 0)
      ? round2(monto * retencionPorcentaje / 100)
      : 0
    const montoNeto = round2(monto - detraccionMonto - retencionMonto)

    if (montoNeto < 0) {
      return NextResponse.json({ error: 'La suma de detracción + retención supera el monto del pago' }, { status: 400 })
    }

    // Construir array de creates en una sola transacción
    const creates: any[] = []

    if (detraccionMonto > 0) {
      creates.push(prisma.pagoCobro.create({
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
      }))
    }

    if (retencionMonto > 0) {
      creates.push(prisma.pagoCobro.create({
        data: {
          cuentaPorCobrarId,
          cuentaBancariaId: null, // las retenciones no salen de banco — son descuentos del cliente
          monto: retencionMonto,
          fechaPago: retencionFecha ? new Date(retencionFecha) : new Date(fechaPago),
          medioPago: 'retencion',
          numeroOperacion: null,
          observaciones: `Retención ${retencionPorcentaje}%${retencionNumeroConstancia ? ` (Constancia ${retencionNumeroConstancia})` : ''}`,
          esRetencion: true,
          retencionPorcentaje,
          retencionMonto,
          retencionNumeroConstancia: retencionNumeroConstancia || null,
          updatedAt: new Date(),
        },
      }))
    }

    if (montoNeto > 0) {
      creates.push(prisma.pagoCobro.create({
        data: {
          cuentaPorCobrarId,
          cuentaBancariaId: cuentaBancariaId || null,
          monto: montoNeto,
          fechaPago: new Date(fechaPago),
          medioPago: medioPago || 'transferencia',
          numeroOperacion: numeroOperacion || null,
          observaciones: observaciones || null,
          updatedAt: new Date(),
        },
      }))
    }

    if (creates.length === 0) {
      return NextResponse.json({ error: 'El pago no genera ningún movimiento' }, { status: 400 })
    }

    const pagos = await prisma.$transaction(creates)

    // Recalcular saldo/estado de la cuenta (y sincronizar su Valorizacion si queda pagada)
    await recalcularCuentaPorCobrar(cuentaPorCobrarId)

    return NextResponse.json(pagos.length === 1 ? pagos[0] : pagos, { status: 201 })
  } catch (error) {
    console.error('Error al registrar pago CxC:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
