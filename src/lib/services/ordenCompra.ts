import type { OrdenCompra, OrdenCompraPayload, OrdenCompraUpdatePayload } from '@/types'

const BASE_URL = '/api/orden-compra'

export async function getOrdenesCompra(params?: {
  proveedorId?: string
  centroCostoId?: string
  proyectoId?: string
  estado?: string
  busqueda?: string
}): Promise<OrdenCompra[]> {
  const searchParams = new URLSearchParams()
  if (params?.proveedorId) searchParams.set('proveedorId', params.proveedorId)
  if (params?.centroCostoId) searchParams.set('centroCostoId', params.centroCostoId)
  if (params?.proyectoId) searchParams.set('proyectoId', params.proyectoId)
  if (params?.estado) searchParams.set('estado', params.estado)
  if (params?.busqueda) searchParams.set('busqueda', params.busqueda)
  const query = searchParams.toString()
  const res = await fetch(`${BASE_URL}${query ? `?${query}` : ''}`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al obtener órdenes de compra')
  }
  return res.json()
}

export async function getOrdenCompraById(id: string): Promise<OrdenCompra> {
  const res = await fetch(`${BASE_URL}/${id}`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al obtener orden de compra')
  }
  return res.json()
}

export async function createOrdenCompra(payload: OrdenCompraPayload): Promise<OrdenCompra> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al crear orden de compra')
  }
  return res.json()
}

export async function updateOrdenCompra(id: string, payload: OrdenCompraUpdatePayload): Promise<OrdenCompra> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al actualizar orden de compra')
  }
  return res.json()
}

export async function deleteOrdenCompra(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al eliminar')
  }
}

async function postAction(id: string, action: string, body?: any): Promise<OrdenCompra> {
  const res = await fetch(`${BASE_URL}/${id}/${action}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : '{}',
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || `Error al ${action}`)
  }
  return res.json()
}

export const aprobarOC = (id: string) => postAction(id, 'aprobar')
export const enviarOC = (id: string) => postAction(id, 'enviar')
export const confirmarOC = (id: string, fechaEntregaEstimada?: string) =>
  postAction(id, 'confirmar', { fechaEntregaEstimada })
export const cancelarOC = (id: string, motivo?: string) =>
  postAction(id, 'cancelar', { motivo })
export const registrarRecepcionOC = (id: string, items: { itemId: string; cantidadRecibida: number }[]) =>
  postAction(id, 'recepcion', { items })
