import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!['admin', 'gerente', 'administracion'].includes(session.user.role)) {
      return NextResponse.json({ error: 'Sin permisos para registrar depósito' }, { status: 403 })
    }

    const { id } = await params
    const hoja = await prisma.hojaDeGastos.findUnique({
      where: { id },
      include: {
        itemsMateriales: true,
      },
    })
    if (!hoja) {
      return NextResponse.json({ error: 'Hoja de gastos no encontrada' }, { status: 404 })
    }
    if (hoja.estado !== 'aprobado') {
      return NextResponse.json({ error: 'Solo se puede depositar desde estado aprobado' }, { status: 400 })
    }
    if (!hoja.requiereAnticipo) {
      return NextResponse.json({ error: 'Esta hoja no requiere anticipo' }, { status: 400 })
    }

    const payload = await req.json()
    const montoDepositado = payload.montoDepositado || hoja.montoAnticipo
    const descripcion: string | undefined = payload.descripcion
    const adjuntoIds: string[] = payload.adjuntoIds || []

    const data = await prisma.$transaction(async (tx) => {
      // Crear registro de depósito
      const deposito = await tx.depositoHoja.create({
        data: {
          hojaDeGastosId: id,
          monto: montoDepositado,
          fecha: new Date(),
          descripcion: descripcion || null,
          creadoPorId: session.user.id,
          updatedAt: new Date(),
        },
      })

      // Vincular adjuntos al depósito si se enviaron
      if (adjuntoIds.length > 0) {
        await tx.hojaDeGastosAdjunto.updateMany({
          where: { id: { in: adjuntoIds }, hojaDeGastosId: id },
          data: { depositoHojaId: deposito.id },
        })
      }

      const updated = await tx.hojaDeGastos.update({
        where: { id },
        data: {
          estado: 'depositado',
          montoDepositado,
          saldo: montoDepositado - hoja.montoGastado,
          fechaDeposito: new Date(),
          updatedAt: new Date(),
        },
      })

      await tx.hojaDeGastosEvento.create({
        data: {
          hojaDeGastosId: id,
          tipo: 'depositado',
          descripcion: `Deposito registrado: S/ ${montoDepositado.toFixed(2)}`,
          estadoAnterior: 'aprobado',
          estadoNuevo: 'depositado',
          usuarioId: session.user.id,
          metadata: { monto: montoDepositado, montoAnticipo: hoja.montoAnticipo, depositoId: deposito.id },
        },
      })

      // Crear RecepcionPendiente por cada item de materiales (si no existe ya una activa)
      const esCompra = (hoja as any).tipoPropósito === 'compra_materiales'
      if (esCompra && hoja.itemsMateriales.length > 0) {
        for (const reqItem of hoja.itemsMateriales) {
          const existe = await tx.recepcionPendiente.findFirst({
            where: {
              requerimientoMaterialItemId: reqItem.id,
              estado: { notIn: ['rechazado'] },
            },
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
    console.error('Error al depositar:', error)
    return NextResponse.json({ error: 'Error al registrar depósito' }, { status: 500 })
  }
}
