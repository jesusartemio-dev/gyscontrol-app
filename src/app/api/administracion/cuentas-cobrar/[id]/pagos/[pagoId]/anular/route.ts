import { tieneRol } from '@/lib/auth/roles'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { recalcularCuentaPorCobrar } from '@/lib/services/pagoCobro'

const ROLES_ALLOWED = ['admin', 'gerente', 'administracion']

// POST /api/administracion/cuentas-cobrar/:id/pagos/:pagoId/anular
// Anula (no borra) un PagoCobro registrado por error — ej. un monto de
// detracción/retención mal calculado. El pago queda marcado 'anulado' con
// rastro (motivo, fecha), recalcularCuentaPorCobrar lo excluye de la suma
// y recalcula saldo/estado, y luego se vuelve a registrar el pago correcto.
export async function POST(req: Request, { params }: { params: Promise<{ id: string; pagoId: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }
    if (!tieneRol(session, ROLES_ALLOWED)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id: cuentaPorCobrarId, pagoId } = await params
    const body = await req.json()
    const motivo = typeof body.motivo === 'string' ? body.motivo.trim() : ''
    if (motivo.length < 10) {
      return NextResponse.json({ error: 'El motivo debe tener al menos 10 caracteres' }, { status: 400 })
    }

    const pago = await prisma.pagoCobro.findUnique({
      where: { id: pagoId },
      include: { abonoValorizacion: { select: { id: true } } },
    })
    if (!pago || pago.cuentaPorCobrarId !== cuentaPorCobrarId) {
      return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 })
    }
    if (pago.anulado) {
      return NextResponse.json({ error: 'El pago ya está anulado' }, { status: 400 })
    }
    // Un pago ligado a un evento del Cronograma de Cobro (factoring) debe
    // revertirse desde ahí (revertirAbonoFactoringRecibido) — esa función
    // también resetea el AbonoValorizacion a 'pendiente'; este endpoint no
    // sabe nada de eso y lo dejaría desincronizado.
    if (pago.abonoValorizacion) {
      return NextResponse.json(
        { error: 'Este pago pertenece a un evento del Cronograma de Cobro — revierte desde el ícono de esa fila, no desde acá.' },
        { status: 400 }
      )
    }

    const cuenta = await prisma.$transaction(async (tx) => {
      await tx.pagoCobro.update({
        where: { id: pagoId },
        data: { anulado: true, motivoAnulacion: motivo, fechaAnulacion: new Date(), updatedAt: new Date() },
      })
      return recalcularCuentaPorCobrar(cuentaPorCobrarId, tx)
    })

    const tipo = pago.esDetraccion ? 'Detracción' : pago.esRetencion ? 'Retención' : 'Cobro'
    await prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        entidadTipo: 'PAGO_COBRO',
        entidadId: pagoId,
        accion: 'pago_cobro.anular',
        usuarioId: session.user.id,
        descripcion: `Pago (${tipo}, ${pago.monto}) anulado — ${motivo}`,
      },
    })

    return NextResponse.json(cuenta)
  } catch (error) {
    console.error('Error al anular pago CxC:', error)
    return NextResponse.json({ error: 'Error del servidor' }, { status: 500 })
  }
}
