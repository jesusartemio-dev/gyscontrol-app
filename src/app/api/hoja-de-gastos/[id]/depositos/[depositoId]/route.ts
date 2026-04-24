import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * DELETE /api/hoja-de-gastos/[id]/depositos/[depositoId]
 * - Anticipos: solo admin/gerente/administracion en estado aprobado/depositado
 * - Devoluciones: solo el empleado dueño en estado rendido
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

    const { id, depositoId } = await params

    const hoja = await prisma.hojaDeGastos.findUnique({ where: { id } })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja no encontrada' }, { status: 404 })
    }

    const deposito = await prisma.depositoHoja.findUnique({ where: { id: depositoId } })
    if (!deposito || deposito.hojaDeGastosId !== id) {
      return NextResponse.json({ error: 'Depósito no encontrado' }, { status: 404 })
    }

    // Validar permisos según tipo
    if (deposito.tipo === 'anticipo') {
      if (!['admin', 'gerente', 'administracion'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Sin permisos para eliminar este anticipo' }, { status: 403 })
      }
      if (!['aprobado', 'depositado', 'rendido', 'validado'].includes(hoja.estado)) {
        return NextResponse.json({
          error: 'Solo se pueden eliminar anticipos cuando la hoja está en estado aprobado, depositado, rendido o validado',
        }, { status: 400 })
      }
      // En estados depositado/rendido/validado no se puede eliminar el único anticipo
      if (['depositado', 'rendido', 'validado'].includes(hoja.estado)) {
        const totalAnticipos = await prisma.depositoHoja.count({
          where: { hojaDeGastosId: id, tipo: 'anticipo' },
        })
        if (totalAnticipos <= 1) {
          return NextResponse.json({
            error: 'No se puede eliminar el único anticipo. Use retroceder estado si desea cancelarlo.',
          }, { status: 400 })
        }
      }
    } else if (deposito.tipo === 'devolucion') {
      if (hoja.empleadoId !== session.user.id && !['admin', 'gerente', 'administracion'].includes(session.user.role)) {
        return NextResponse.json({ error: 'Sin permisos para eliminar esta devolución' }, { status: 403 })
      }
      if (!['depositado', 'rendido', 'validado'].includes(hoja.estado)) {
        return NextResponse.json({
          error: 'Solo se pueden eliminar devoluciones cuando la hoja está en estado depositado, rendido o validado',
        }, { status: 400 })
      }
    }

    await prisma.$transaction(async (tx) => {
      // Desvincular adjuntos
      await tx.hojaDeGastosAdjunto.updateMany({
        where: { depositoHojaId: depositoId },
        data: { depositoHojaId: null },
      })

      await tx.depositoHoja.delete({ where: { id: depositoId } })

      // Recalcular saldo = anticipos - gastos - devoluciones
      const [anticipos, devoluciones] = await Promise.all([
        tx.depositoHoja.findMany({ where: { hojaDeGastosId: id, tipo: 'anticipo' } }),
        tx.depositoHoja.findMany({ where: { hojaDeGastosId: id, tipo: 'devolucion' } }),
      ])
      const totalAnticipos = anticipos.reduce((s, d) => s + d.monto, 0)
      const totalDevoluciones = devoluciones.reduce((s, d) => s + d.monto, 0)
      await tx.hojaDeGastos.update({
        where: { id },
        data: {
          montoDepositado: totalAnticipos,
          saldo: totalAnticipos - hoja.montoGastado - totalDevoluciones,
          updatedAt: new Date(),
        },
      })

      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: id,
          tipo: 'comentario',
          descripcion: deposito.tipo === 'devolucion'
            ? `Devolución eliminada: S/ ${deposito.monto.toFixed(2)}`
            : `Anticipo eliminado: S/ ${deposito.monto.toFixed(2)}`,
          usuarioId: session.user.id,
          metadata: { monto: deposito.monto, depositoId, eliminado: true, tipoDeposito: deposito.tipo },
        },
      })
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Error al eliminar depósito:', error)
    return NextResponse.json({ error: 'Error al eliminar depósito' }, { status: 500 })
  }
}
