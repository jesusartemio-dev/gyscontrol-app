import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * DELETE /api/hoja-de-gastos/[id]/depositos/[depositoId]
 * Elimina un depósito adicional y recalcula montoDepositado.
 * No se puede eliminar el primer depósito (el que cambió estado a depositado).
 */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; depositoId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!['admin', 'gerente', 'administracion'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 })
    }

    const { id, depositoId } = await params

    const hoja = await prisma.hojaDeGastos.findUnique({ where: { id } })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja no encontrada' }, { status: 404 })
    }
    if (hoja.estado !== 'depositado') {
      return NextResponse.json({ error: 'Solo se pueden eliminar depósitos cuando la hoja está en estado depositado' }, { status: 400 })
    }

    const deposito = await prisma.depositoHoja.findUnique({ where: { id: depositoId } })
    if (!deposito || deposito.hojaDeGastosId !== id) {
      return NextResponse.json({ error: 'Depósito no encontrado' }, { status: 404 })
    }

    // Verificar que no sea el único depósito
    const totalDepositos = await prisma.depositoHoja.count({ where: { hojaDeGastosId: id } })
    if (totalDepositos <= 1) {
      return NextResponse.json({ error: 'No se puede eliminar el único depósito. Use retroceder estado si desea cancelarlo.' }, { status: 400 })
    }

    await prisma.$transaction(async (tx) => {
      // Desvincular adjuntos del depósito
      await tx.hojaDeGastosAdjunto.updateMany({
        where: { depositoHojaId: depositoId },
        data: { depositoHojaId: null },
      })

      await tx.depositoHoja.delete({ where: { id: depositoId } })

      // Recalcular montoDepositado
      const restantes = await tx.depositoHoja.findMany({ where: { hojaDeGastosId: id } })
      const nuevoTotal = restantes.reduce((s, d) => s + d.monto, 0)

      await tx.hojaDeGastos.update({
        where: { id },
        data: {
          montoDepositado: nuevoTotal,
          saldo: nuevoTotal - hoja.montoGastado,
          updatedAt: new Date(),
        },
      })

      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: id,
          tipo: 'depositado',
          descripcion: `Depósito eliminado: S/ ${deposito.monto.toFixed(2)}`,
          usuarioId: session.user.id,
          metadata: { monto: deposito.monto, depositoId, eliminado: true },
        },
      })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al eliminar depósito:', error)
    return NextResponse.json({ error: 'Error al eliminar depósito' }, { status: 500 })
  }
}
