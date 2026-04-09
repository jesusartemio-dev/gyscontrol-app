import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * POST /api/hoja-de-gastos/[id]/depositar
 * Avanza el estado de aprobado → depositado.
 * Requiere que exista al menos un DepositoHoja registrado previamente.
 */
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!['admin', 'gerente', 'administracion'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para avanzar a depositado' }, { status: 403 })
    }

    const { id } = await params
    const hoja = await prisma.hojaDeGastos.findUnique({
      where: { id },
      include: { itemsMateriales: true },
    })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }
    if (hoja.estado !== 'aprobado') {
      return NextResponse.json({ error: 'Solo se puede avanzar a depositado desde estado aprobado' }, { status: 400 })
    }
    if (!hoja.requiereAnticipo) {
      return NextResponse.json({ error: 'Esta hoja no requiere anticipo' }, { status: 400 })
    }

    // Verificar que exista al menos un depósito registrado
    const depositos = await prisma.depositoHoja.findMany({ where: { hojaDeGastosId: id } })
    if (depositos.length === 0) {
      return NextResponse.json({ error: 'Debe registrar al menos un depósito antes de avanzar' }, { status: 400 })
    }

    const montoTotal = depositos.reduce((s, d) => s + d.monto, 0)

    const data = await prisma.$transaction(async (tx) => {
      const updated = await tx.hojaDeGastos.update({
        where: { id },
        data: {
          estado: 'depositado',
          montoDepositado: montoTotal,
          saldo: montoTotal - hoja.montoGastado,
          fechaDeposito: new Date(),
          updatedAt: new Date(),
        },
      })

      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: id,
          tipo: 'depositado',
          descripcion: `Avanzado a Depositado — Total depositado: S/ ${montoTotal.toFixed(2)}`,
          estadoAnterior: 'aprobado',
          estadoNuevo: 'depositado',
          usuarioId: session.user.id,
          metadata: { montoTotal, cantidadDepositos: depositos.length },
        },
      })

      // Crear RecepcionPendiente por cada item de materiales (si no existe ya una activa)
      const esCompra = (hoja as any).tipoPropósito === 'compra_materiales'
      if (esCompra && hoja.itemsMateriales.length > 0) {
        for (const reqItem of hoja.itemsMateriales) {
          const existe = await tx.recepcionPendiente.findFirst({
            where: { requerimientoMaterialItemId: reqItem.id, estado: { notIn: ['rechazado'] } },
          })
          if (existe) continue
          await tx.recepcionPendiente.create({
            data: {
              pedidoEquipoItemId: reqItem.pedidoEquipoItemId,
              requerimientoMaterialItemId: reqItem.id,
              cantidadRecibida: reqItem.cantidadSolicitada,
              estado: 'pendiente',
              observaciones: `Compra por ${hoja.numero} — ${reqItem.descripcion}`,
            },
          })
        }
      }

      return updated
    })

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error al avanzar a depositado:', error)
    return NextResponse.json({ error: 'Error al avanzar a depositado' }, { status: 500 })
  }
}
