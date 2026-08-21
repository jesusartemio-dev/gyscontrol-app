// Recálculo en cascada cuando cambia la cantidad atendida de un item de pedido.
//
// Cuando el proyecto confirma una recepción parcial (llegó menos de lo despachado)
// o la rechaza, hay que propagar el ajuste hacia arriba: item → lista → pedido.
// Esta misma cascada ya vivía duplicada dentro de las rutas de `confirmar` y
// `retroceder` de recepcion-pendiente; acá queda en un solo lugar para que los
// flujos nuevos de conformidad no agreguen una tercera copia.

import { prisma } from '@/lib/prisma'

type TxClient = Omit<typeof prisma, '$connect' | '$disconnect' | '$on' | '$transaction' | '$use' | '$extends'>

export interface AjusteCantidadResult {
  nuevaCantidadAtendida: number
  nuevoEstadoEntrega: 'pendiente' | 'parcial' | 'entregado'
  nuevoEstadoPedido: string | null
}

/**
 * Aplica un delta a `PedidoEquipoItem.cantidadAtendida` y recalcula en cascada
 * el estado del item, el costo real de la lista y el estado/costo del pedido.
 *
 * @param delta Positivo suma, negativo resta. Nunca deja la cantidad bajo cero.
 */
export async function ajustarCantidadAtendida(
  tx: TxClient,
  pedidoItem: { id: string; cantidadAtendida: number | null; cantidadPedida: number; listaEquipoItemId: string | null },
  pedidoId: string,
  delta: number
): Promise<AjusteCantidadResult> {
  const nuevaCantidadAtendida = Math.max(0, (pedidoItem.cantidadAtendida || 0) + delta)

  let nuevoEstadoEntrega: 'pendiente' | 'parcial' | 'entregado' = 'pendiente'
  if (nuevaCantidadAtendida >= pedidoItem.cantidadPedida) {
    nuevoEstadoEntrega = 'entregado'
  } else if (nuevaCantidadAtendida > 0) {
    nuevoEstadoEntrega = 'parcial'
  }

  // El estado del item sigue al de entrega; 'atendido' es el fallback cuando ya
  // hubo movimiento pero no encaja en entregado/parcial/pendiente.
  const estadoItem =
    nuevoEstadoEntrega === 'entregado' ? 'entregado'
    : nuevoEstadoEntrega === 'parcial' ? 'parcial'
    : 'pendiente'

  await tx.pedidoEquipoItem.update({
    where: { id: pedidoItem.id },
    data: {
      cantidadAtendida: nuevaCantidadAtendida,
      estadoEntrega: nuevoEstadoEntrega as any,
      estado: estadoItem as any,
      updatedAt: new Date(),
    },
  })

  // Lista técnica: costo real y cantidad entregada se recalculan sumando TODOS
  // los items de pedido que apuntan a la misma línea de lista.
  if (pedidoItem.listaEquipoItemId) {
    const linked = await tx.pedidoEquipoItem.findMany({
      where: { listaEquipoItemId: pedidoItem.listaEquipoItemId },
      select: { precioUnitario: true, cantidadAtendida: true },
    })
    const costoReal = linked.reduce(
      (sum, i) => sum + ((i.precioUnitario || 0) * (i.cantidadAtendida || 0)),
      0
    )
    const cantidadEntregada = linked.reduce((sum, i) => sum + (i.cantidadAtendida || 0), 0)

    await tx.listaEquipoItem.update({
      where: { id: pedidoItem.listaEquipoItemId },
      data: { costoReal, cantidadEntregada },
    })
  }

  // Pedido: estado derivado de sus items + costo real total
  const allItems = await tx.pedidoEquipoItem.findMany({
    where: { pedidoId },
    select: { estado: true, precioUnitario: true, cantidadAtendida: true },
  })

  const costoRealTotal = allItems.reduce(
    (sum, i) => sum + ((i.precioUnitario || 0) * (i.cantidadAtendida || 0)),
    0
  )

  const estados = allItems.map(i => i.estado)
  let nuevoEstadoPedido: string | null = null
  if (estados.every(e => e === 'cancelado')) {
    nuevoEstadoPedido = 'cancelado'
  } else if (estados.every(e => e === 'entregado' || e === 'cancelado')) {
    nuevoEstadoPedido = 'entregado'
  } else if (estados.some(e => e === 'entregado' || e === 'parcial')) {
    nuevoEstadoPedido = 'parcial'
  } else if (estados.some(e => e === 'atendido')) {
    nuevoEstadoPedido = 'atendido'
  }

  await tx.pedidoEquipo.update({
    where: { id: pedidoId },
    data: {
      ...(nuevoEstadoPedido ? { estado: nuevoEstadoPedido as any } : {}),
      costoRealTotal,
      updatedAt: new Date(),
    },
  })

  return { nuevaCantidadAtendida, nuevoEstadoEntrega, nuevoEstadoPedido }
}
