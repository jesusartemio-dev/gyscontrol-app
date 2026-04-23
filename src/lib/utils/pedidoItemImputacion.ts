/**
 * Utilidad para resolver la imputación efectiva de un PedidoEquipoItem.
 *
 * Regla: un ítem puede tener override a un Proyecto o CentroCosto distinto del
 * pedido padre (campos mutuamente excluyentes). Si ambos son null, hereda del
 * pedido padre.
 */

export interface ItemConImputacion {
  proyectoId?: string | null
  centroCostoId?: string | null
}

export interface PedidoPadreImputacion {
  proyectoId?: string | null
  centroCostoId?: string | null
}

/**
 * Devuelve el destino efectivo del ítem (resuelve override o hereda del pedido padre).
 */
export function imputacionEfectiva(
  item: ItemConImputacion,
  padre: PedidoPadreImputacion
): { proyectoId: string | null; centroCostoId: string | null } {
  if (item.proyectoId) {
    return { proyectoId: item.proyectoId, centroCostoId: null }
  }
  if (item.centroCostoId) {
    return { proyectoId: null, centroCostoId: item.centroCostoId }
  }
  return {
    proyectoId: padre.proyectoId ?? null,
    centroCostoId: padre.centroCostoId ?? null,
  }
}

/**
 * True si el ítem (considerando override + herencia) pertenece contablemente al proyecto dado.
 */
export function itemPerteneceAlProyecto(
  item: ItemConImputacion,
  padre: PedidoPadreImputacion,
  proyectoId: string
): boolean {
  return imputacionEfectiva(item, padre).proyectoId === proyectoId
}

/**
 * True si el ítem pertenece al centro de costo dado.
 */
export function itemPerteneceAlCentroCosto(
  item: ItemConImputacion,
  padre: PedidoPadreImputacion,
  centroCostoId: string
): boolean {
  return imputacionEfectiva(item, padre).centroCostoId === centroCostoId
}
