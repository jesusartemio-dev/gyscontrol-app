// ===================================================
// Archivo: src/lib/utils/ocValidation.ts
// Descripción: Helpers para validar estado de OCs vinculadas
//              antes de permitir cambios en cotizaciones
// ===================================================

// Estados que BLOQUEAN el cambio de cotización
const ESTADOS_BLOQUEANTES = ['aprobada', 'enviada', 'confirmada', 'parcial']
// Estados que permiten cambio + actualización de OC
const ESTADOS_EDITABLES = ['borrador']

export interface OCVinculada {
  ocId: string
  ocNumero: string
  ocEstado: string
  ocProveedorId: string
  ocMoneda: string
  items: { id: string; cantidad: number }[]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type PrismaLike = any

/**
 * Busca la OC activa más restrictiva vinculada a un ListaEquipoItem
 * y/o sus PedidoEquipoItems.
 * Prioridad: bloqueante > editable > ignorable.
 */
export async function checkOCVinculada(
  listaEquipoItemId: string,
  pedidoEquipoItemIds?: string[],
  tx?: PrismaLike
): Promise<OCVinculada | null> {
  const db = tx as any

  const orConditions: any[] = [{ listaEquipoItemId }]
  if (pedidoEquipoItemIds && pedidoEquipoItemIds.length > 0) {
    orConditions.push({ pedidoEquipoItemId: { in: pedidoEquipoItemIds } })
  }

  // Buscar todos los OC items vinculados con su OC padre
  const ocItems = await db.ordenCompraItem.findMany({
    where: { OR: orConditions },
    include: {
      ordenCompra: {
        select: { id: true, numero: true, estado: true, proveedorId: true, moneda: true }
      }
    }
  })

  if (ocItems.length === 0) return null

  // Agrupar por OC y encontrar la más restrictiva
  const ocsMap = new Map<string, { oc: any; items: { id: string; cantidad: number }[] }>()
  for (const ocItem of ocItems) {
    const ocId = ocItem.ordenCompra.id
    if (!ocsMap.has(ocId)) {
      ocsMap.set(ocId, { oc: ocItem.ordenCompra, items: [] })
    }
    ocsMap.get(ocId)!.items.push({ id: ocItem.id, cantidad: ocItem.cantidad })
  }

  // Priorizar: bloqueante > editable > ignorable
  let bloqueante: OCVinculada | null = null
  let editable: OCVinculada | null = null

  for (const [, { oc, items }] of ocsMap) {
    const vinculada: OCVinculada = {
      ocId: oc.id,
      ocNumero: oc.numero,
      ocEstado: oc.estado,
      ocProveedorId: oc.proveedorId,
      ocMoneda: oc.moneda,
      items,
    }

    if (ESTADOS_BLOQUEANTES.includes(oc.estado)) {
      bloqueante = vinculada
      break // No hay nada más restrictivo
    }
    if (ESTADOS_EDITABLES.includes(oc.estado)) {
      editable = vinculada
    }
    // cancelada/completada → ignorable, no se guarda
  }

  return bloqueante ?? editable ?? null
}

/**
 * Clasifica una OC vinculada:
 * - 'bloqueada' → no se puede cambiar cotización
 * - 'editable'  → se puede cambiar, actualizar OC en borrador
 * - 'libre'     → sin OC activa, cambiar libremente
 */
export function clasificarOC(oc: OCVinculada | null): 'bloqueada' | 'editable' | 'libre' {
  if (!oc) return 'libre'
  if (ESTADOS_BLOQUEANTES.includes(oc.ocEstado)) return 'bloqueada'
  if (ESTADOS_EDITABLES.includes(oc.ocEstado)) return 'editable'
  return 'libre'
}

/**
 * Actualiza los items y totales de una OC en borrador cuando cambia el precio.
 * Recalcula subtotal, igv (18% PEN / 0% USD), total.
 * Retorna si hubo cambio de proveedor (para warning).
 */
export async function actualizarOCBorrador(
  oc: OCVinculada,
  nuevoPrecioUnitario: number,
  nuevoProveedorId: string | null,
  tx?: PrismaLike
): Promise<{ warningProveedor: boolean; ocNumero: string }> {
  const db = tx as any

  // Actualizar cada OC item vinculado con el nuevo precio
  for (const item of oc.items) {
    await db.ordenCompraItem.update({
      where: { id: item.id },
      data: {
        precioUnitario: nuevoPrecioUnitario,
        costoTotal: item.cantidad * nuevoPrecioUnitario,
        updatedAt: new Date(),
      }
    })
  }

  // Recalcular totales de la OC completa
  const todosItems = await db.ordenCompraItem.findMany({
    where: { ordenCompraId: oc.ocId },
    select: { costoTotal: true }
  })

  const subtotal = todosItems.reduce((sum: number, i: any) => sum + (i.costoTotal || 0), 0)
  const igv = oc.ocMoneda === 'PEN' ? subtotal * 0.18 : 0
  const total = subtotal + igv

  await db.ordenCompra.update({
    where: { id: oc.ocId },
    data: { subtotal, igv, total, updatedAt: new Date() }
  })

  const warningProveedor = nuevoProveedorId !== null && nuevoProveedorId !== oc.ocProveedorId

  return { warningProveedor, ocNumero: oc.ocNumero }
}
