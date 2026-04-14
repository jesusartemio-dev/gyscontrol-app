import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

/**
 * POST /api/pedido-equipo-item/[id]/revertir-entrega
 *
 * Revierte una entrega directa (sin OC) para permitir regularización.
 * Solo disponible para admin y gerente.
 *
 * - Resetea estado del PedidoEquipoItem a 'pendiente'
 * - Elimina los EntregaItem asociados
 * - Limpia campos de entrega (cantidadAtendida, costos, motivo, etc.)
 * - Recalcula agregados de ListaEquipoItem y PedidoEquipo
 * - Registra evento de trazabilidad
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const role = (session.user as any).role as string
    if (!['admin', 'gerente'].includes(role)) {
      return NextResponse.json({ error: 'Solo admin o gerente pueden revertir entregas' }, { status: 403 })
    }

    const userId = (session.user as any).id as string
    const { id } = await params
    const body = await req.json().catch(() => ({}))
    const motivo: string = body.motivo || 'Reversión para regularización con OC'

    const item = await prisma.pedidoEquipoItem.findUnique({
      where: { id },
      include: {
        pedidoEquipo: {
          select: { id: true, codigo: true, proyectoId: true, proyecto: { select: { nombre: true } } },
        },
        entregaItem: { select: { id: true } },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item no encontrado' }, { status: 404 })
    }

    const estadosRevertibles = ['atendido', 'parcial', 'entregado']
    if (!estadosRevertibles.includes(item.estado)) {
      return NextResponse.json(
        { error: `No se puede revertir un item en estado "${item.estado}"` },
        { status: 409 }
      )
    }

    // Verificar que es entrega directa (sin recepción de OC vinculada)
    const tieneRecepcionOC = await prisma.recepcionPendiente.findFirst({
      where: { pedidoEquipoItemId: id, estado: { in: ['en_almacen', 'entregado_proyecto'] } },
    })
    if (tieneRecepcionOC) {
      return NextResponse.json(
        { error: 'Este item tiene una recepción de OC activa. Use el flujo de retroceder recepción.' },
        { status: 409 }
      )
    }

    const estadoAnterior = item.estadoEntrega
    const pedido = item.pedidoEquipo

    await prisma.$transaction(async (tx) => {
      // 1. Eliminar EntregaItem asociados
      await tx.entregaItem.deleteMany({ where: { pedidoEquipoItemId: id } })

      // 2. Resetear PedidoEquipoItem
      await tx.pedidoEquipoItem.update({
        where: { id },
        data: {
          estado: 'pendiente',
          estadoEntrega: 'pendiente',
          cantidadAtendida: null,
          fechaEntregaReal: null,
          observacionesEntrega: null,
          comentarioLogistica: null,
          motivoAtencionDirecta: null,
          costoRealUnitario: null,
          costoRealMoneda: null,
          costoTotal: null,
          precioUnitario: null,
          precioUnitarioMoneda: null,
          tipoCambioEntrega: null,
          tiempoEntregaDias: null,
          tiempoEntrega: null,
          updatedAt: new Date(),
        },
      })

      // 3. Recalcular ListaEquipoItem
      if (item.listaEquipoItemId) {
        const sumResult = await tx.pedidoEquipoItem.aggregate({
          where: { listaEquipoItemId: item.listaEquipoItemId },
          _sum: { cantidadAtendida: true },
        })
        const allLinked = await tx.pedidoEquipoItem.findMany({
          where: { listaEquipoItemId: item.listaEquipoItemId },
          select: { precioUnitario: true, cantidadAtendida: true },
        })
        const costoReal = allLinked.reduce(
          (s, i) => s + (i.precioUnitario || 0) * (i.cantidadAtendida || 0),
          0
        )
        await tx.listaEquipoItem.update({
          where: { id: item.listaEquipoItemId },
          data: { costoReal, cantidadEntregada: sumResult._sum.cantidadAtendida || 0 },
        })
      }

      // 4. Recalcular PedidoEquipo costoRealTotal y estado
      const allItems = await tx.pedidoEquipoItem.findMany({
        where: { pedidoId: pedido.id },
        select: { estado: true, precioUnitario: true, cantidadAtendida: true },
      })
      const costoRealTotal = allItems.reduce(
        (s, i) => s + (i.precioUnitario || 0) * (i.cantidadAtendida || 0),
        0
      )
      const estadosPedido = allItems.map(i => i.estado)
      let nuevoPedidoEstado: string
      if (estadosPedido.every(e => e === 'cancelado')) {
        nuevoPedidoEstado = 'cancelado'
      } else if (estadosPedido.every(e => ['entregado', 'cancelado'].includes(e))) {
        nuevoPedidoEstado = 'entregado'
      } else if (estadosPedido.some(e => ['atendido', 'parcial', 'entregado'].includes(e))) {
        nuevoPedidoEstado = 'parcial'
      } else {
        nuevoPedidoEstado = 'enviado'
      }
      await tx.pedidoEquipo.update({
        where: { id: pedido.id },
        data: { costoRealTotal, estado: nuevoPedidoEstado as any, updatedAt: new Date() },
      })

      // 5. Registrar evento de trazabilidad
      await tx.eventoTrazabilidad.create({
        data: {
          id: `evt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          proyectoId: pedido.proyectoId,
          pedidoEquipoId: pedido.id,
          tipo: 'REVERSION_ENTREGA',
          descripcion: `Entrega directa revertida para regularización. ${motivo}`,
          estadoAnterior: estadoAnterior as any,
          estadoNuevo: 'pendiente' as any,
          usuarioId: userId,
          metadata: {
            motivoReversion: motivo,
            pedidoCodigo: pedido.codigo,
            proyectoNombre: pedido.proyecto?.nombre ?? '',
            estadoAnterior,
            entregasEliminadas: item.entregaItem.length,
          },
          updatedAt: new Date(),
        },
      })
    })

    return NextResponse.json({ ok: true, mensaje: 'Entrega revertida correctamente' })
  } catch (error) {
    console.error('Error al revertir entrega:', error)
    return NextResponse.json({ error: 'Error al revertir entrega: ' + String(error) }, { status: 500 })
  }
}
