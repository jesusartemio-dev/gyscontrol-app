import { prisma } from '@/lib/prisma'

// ═══════════════════════════════════════════════════════════════
// Helper centralizado: canDelete()
// Solo lectura — nunca escribe. Verifica dependientes activos
// antes de permitir la eliminación de una entidad.
// ═══════════════════════════════════════════════════════════════

export type DeletableEntity =
  | 'listaEquipo'
  | 'listaEquipoItem'
  | 'cotizacionProveedor'
  | 'pedidoEquipo'
  | 'ordenCompra'
  | 'valorizacion'
  | 'cuentaPorCobrar'
  | 'cuentaPorPagar'
  | 'recepcionPendiente'

export interface DeleteBlocker {
  entity: string
  count: number
  message: string
}

export interface CanDeleteResult {
  allowed: boolean
  blockers: DeleteBlocker[]
  message: string
}

const ENTITY_LABELS: Record<DeletableEntity, string> = {
  listaEquipo: 'Lista de Equipo',
  listaEquipoItem: 'Ítem de Lista',
  cotizacionProveedor: 'Cotización de Proveedor',
  pedidoEquipo: 'Pedido de Equipo',
  ordenCompra: 'Orden de Compra',
  valorizacion: 'Valorización',
  cuentaPorCobrar: 'Cuenta por Cobrar',
  cuentaPorPagar: 'Cuenta por Pagar',
  recepcionPendiente: 'Recepción Pendiente',
}

// ─── Dispatcher ─────────────────────────────────────────────

export async function canDelete(
  entity: DeletableEntity,
  id: string
): Promise<CanDeleteResult> {
  const checkers: Record<DeletableEntity, (id: string) => Promise<DeleteBlocker[]>> = {
    listaEquipo: checkListaEquipo,
    listaEquipoItem: checkListaEquipoItem,
    cotizacionProveedor: checkCotizacionProveedor,
    pedidoEquipo: checkPedidoEquipo,
    ordenCompra: checkOrdenCompra,
    valorizacion: checkValorizacion,
    cuentaPorCobrar: checkCuentaPorCobrar,
    cuentaPorPagar: checkCuentaPorPagar,
    recepcionPendiente: checkRecepcionPendiente,
  }

  const checker = checkers[entity]
  if (!checker) {
    return {
      allowed: false,
      blockers: [],
      message: `Entidad "${entity}" no soportada para validación de eliminación.`,
    }
  }

  const blockers = await checker(id)
  const allowed = blockers.length === 0
  const label = ENTITY_LABELS[entity]

  const message = allowed
    ? `Se puede eliminar de forma segura.`
    : `No se puede eliminar ${label.toLowerCase()}:\n${blockers.map(b => `· ${b.message}`).join('\n')}\nElimínalos primero o cancélalos.`

  return { allowed, blockers, message }
}

// ─── Checkers individuales ──────────────────────────────────

async function checkListaEquipo(id: string): Promise<DeleteBlocker[]> {
  const blockers: DeleteBlocker[] = []

  const lista = await prisma.listaEquipo.findUnique({
    where: { id },
    select: {
      estado: true,
      codigo: true,
      _count: {
        select: {
          pedidoEquipo: true,
        },
      },
    },
  })

  if (!lista) return blockers

  if (lista.estado !== 'borrador') {
    blockers.push({
      entity: 'ListaEquipo',
      count: 1,
      message: `La lista no está en estado borrador (estado actual: ${lista.estado})`,
    })
  }

  if (lista._count.pedidoEquipo > 0) {
    blockers.push({
      entity: 'PedidoEquipo',
      count: lista._count.pedidoEquipo,
      message: `Tiene ${lista._count.pedidoEquipo} pedido(s) de equipo asociado(s)`,
    })
  }

  // OCs vinculadas via pedidos de esta lista
  const ocCount = await prisma.ordenCompra.count({
    where: {
      pedidoEquipo: { listaId: id },
    },
  })
  if (ocCount > 0) {
    blockers.push({
      entity: 'OrdenCompra',
      count: ocCount,
      message: `Tiene ${ocCount} orden(es) de compra asociada(s)`,
    })
  }

  return blockers
}

async function checkListaEquipoItem(id: string): Promise<DeleteBlocker[]> {
  const blockers: DeleteBlocker[] = []

  const item = await prisma.listaEquipoItem.findUnique({
    where: { id },
    select: {
      codigo: true,
      _count: {
        select: {
          pedidoEquipoItem: true,
          ordenCompraItems: true,
        },
      },
    },
  })

  if (!item) return blockers

  if (item._count.pedidoEquipoItem > 0) {
    blockers.push({
      entity: 'PedidoEquipoItem',
      count: item._count.pedidoEquipoItem,
      message: `Este ítem tiene ${item._count.pedidoEquipoItem} pedido(s) asociado(s)`,
    })
  }

  if (item._count.ordenCompraItems > 0) {
    blockers.push({
      entity: 'OrdenCompraItem',
      count: item._count.ordenCompraItems,
      message: `Este ítem tiene ${item._count.ordenCompraItems} orden(es) de compra asociada(s)`,
    })
  }

  return blockers
}

async function checkCotizacionProveedor(id: string): Promise<DeleteBlocker[]> {
  const blockers: DeleteBlocker[] = []

  // Items seleccionados que ya están en pedidos
  const itemsEnPedidos = await prisma.cotizacionProveedorItem.count({
    where: {
      cotizacionId: id,
      esSeleccionada: true,
      listaEquipoItem: {
        pedidoEquipoItem: { some: {} },
      },
    },
  })

  if (itemsEnPedidos > 0) {
    blockers.push({
      entity: 'CotizacionProveedorItem',
      count: itemsEnPedidos,
      message: `Tiene ${itemsEnPedidos} ítem(s) seleccionado(s) que ya están en pedidos`,
    })
  }

  return blockers
}

async function checkPedidoEquipo(id: string): Promise<DeleteBlocker[]> {
  const blockers: DeleteBlocker[] = []

  const pedido = await prisma.pedidoEquipo.findUnique({
    where: { id },
    select: {
      codigo: true,
      estado: true,
      _count: {
        select: {
          ordenesCompra: true,
        },
      },
    },
  })

  if (!pedido) return blockers

  if (pedido.estado !== 'borrador') {
    blockers.push({
      entity: 'PedidoEquipo',
      count: 1,
      message: `El pedido no está en estado borrador (estado actual: ${pedido.estado})`,
    })
  }

  if (pedido._count.ordenesCompra > 0) {
    blockers.push({
      entity: 'OrdenCompra',
      count: pedido._count.ordenesCompra,
      message: `Tiene ${pedido._count.ordenesCompra} orden(es) de compra asociada(s)`,
    })
  }

  const cxpCount = await prisma.cuentaPorPagar.count({
    where: {
      pedidoEquipoId: id,
      estado: { not: 'anulada' },
    },
  })
  if (cxpCount > 0) {
    blockers.push({
      entity: 'CuentaPorPagar',
      count: cxpCount,
      message: `Tiene ${cxpCount} cuenta(s) por pagar activa(s)`,
    })
  }

  return blockers
}

async function checkOrdenCompra(id: string): Promise<DeleteBlocker[]> {
  const blockers: DeleteBlocker[] = []

  const oc = await prisma.ordenCompra.findUnique({
    where: { id },
    select: {
      numero: true,
      estado: true,
    },
  })

  if (!oc) return blockers

  if (oc.estado !== 'borrador') {
    blockers.push({
      entity: 'OrdenCompra',
      count: 1,
      message: `La OC no está en estado borrador (estado actual: ${oc.estado})`,
    })
  }

  const cxpCount = await prisma.cuentaPorPagar.count({
    where: {
      ordenCompraId: id,
      estado: { not: 'anulada' },
    },
  })
  if (cxpCount > 0) {
    blockers.push({
      entity: 'CuentaPorPagar',
      count: cxpCount,
      message: `Tiene ${cxpCount} cuenta(s) por pagar activa(s)`,
    })
  }

  const recepcionCount = await prisma.recepcionPendiente.count({
    where: {
      ordenCompraItem: { ordenCompraId: id },
      estado: { not: 'rechazado' },
    },
  })
  if (recepcionCount > 0) {
    blockers.push({
      entity: 'RecepcionPendiente',
      count: recepcionCount,
      message: `Tiene ${recepcionCount} recepcion(es) pendiente(s) o confirmada(s)`,
    })
  }

  return blockers
}

async function checkValorizacion(id: string): Promise<DeleteBlocker[]> {
  const blockers: DeleteBlocker[] = []

  const valorizacion = await prisma.valorizacion.findUnique({
    where: { id },
    select: {
      codigo: true,
      estado: true,
    },
  })

  if (!valorizacion) return blockers

  const estadosPermitidos = ['borrador', 'anulada']
  if (!estadosPermitidos.includes(valorizacion.estado)) {
    blockers.push({
      entity: 'Valorizacion',
      count: 1,
      message: `La valorización no está en estado borrador ni anulada (estado actual: ${valorizacion.estado})`,
    })
  }

  const cxcConPagos = await prisma.cuentaPorCobrar.count({
    where: {
      valorizacionId: id,
      montoPagado: { gt: 0 },
      estado: { not: 'anulada' },
    },
  })
  if (cxcConPagos > 0) {
    blockers.push({
      entity: 'CuentaPorCobrar',
      count: cxcConPagos,
      message: `Tiene ${cxcConPagos} cuenta(s) por cobrar con pagos registrados`,
    })
  }

  return blockers
}

async function checkCuentaPorCobrar(id: string): Promise<DeleteBlocker[]> {
  const blockers: DeleteBlocker[] = []

  const cxc = await prisma.cuentaPorCobrar.findUnique({
    where: { id },
    select: {
      estado: true,
      montoPagado: true,
      _count: {
        select: {
          pagos: true,
        },
      },
    },
  })

  if (!cxc) return blockers

  if ((cxc.montoPagado > 0 || cxc._count.pagos > 0) && cxc.estado !== 'anulada') {
    blockers.push({
      entity: 'PagoCobro',
      count: cxc._count.pagos,
      message: `Tiene ${cxc._count.pagos} pago(s) registrado(s) — anule la CxC en lugar de eliminarla`,
    })
  }

  return blockers
}

async function checkRecepcionPendiente(id: string): Promise<DeleteBlocker[]> {
  const blockers: DeleteBlocker[] = []

  const recepcion = await prisma.recepcionPendiente.findUnique({
    where: { id },
    select: { estado: true },
  })

  if (!recepcion) return blockers

  if (recepcion.estado === 'entregado_proyecto') {
    blockers.push({
      entity: 'RecepcionPendiente',
      count: 1,
      message: 'Esta recepción ya fue entregada al proyecto. Retrocede primero la entrega, luego elimina.',
    })
  }

  return blockers
}

async function checkCuentaPorPagar(id: string): Promise<DeleteBlocker[]> {
  const blockers: DeleteBlocker[] = []

  const cxp = await prisma.cuentaPorPagar.findUnique({
    where: { id },
    select: {
      estado: true,
      montoPagado: true,
      _count: {
        select: {
          pagos: true,
        },
      },
    },
  })

  if (!cxp) return blockers

  if ((cxp.montoPagado > 0 || cxp._count.pagos > 0) && cxp.estado !== 'anulada') {
    blockers.push({
      entity: 'PagoPagar',
      count: cxp._count.pagos,
      message: `Tiene ${cxp._count.pagos} pago(s) registrado(s) — anule la CxP en lugar de eliminarla`,
    })
  }

  return blockers
}
