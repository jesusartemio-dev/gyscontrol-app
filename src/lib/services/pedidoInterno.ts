// Servicio cliente para pedidos internos (centros de costo)
import type { PedidoEquipoPayload } from '@/types'

const BASE_URL = '/api/pedido-equipo'

export interface PedidoInterno {
  id: string
  codigo: string
  nombre?: string | null
  estado: string
  prioridad?: string | null
  esUrgente: boolean
  observacion?: string | null
  fechaPedido: string
  fechaNecesaria: string
  createdAt: string
  updatedAt: string
  centroCostoId: string
  centroCosto: { id: string; nombre: string; tipo: string }
  responsableId: string
  user: { id: string; name: string; email: string }
  presupuestoTotal: number
  costoRealTotal: number
  pedidoEquipoItem: PedidoInternoItem[]
}

export interface PedidoInternoItem {
  id: string
  codigo: string
  descripcion: string
  unidad: string
  cantidadPedida: number
  precioUnitario?: number
  costoTotal?: number
  estado: string
  // Override de imputación (ambos null = hereda del pedido)
  proyectoId?: string | null
  centroCostoId?: string | null
  categoriaCosto?: 'equipos' | 'servicios' | 'gastos' | null
}

export async function getMisPedidosInternos(params?: {
  responsableId?: string
  estado?: string
  centroCostoId?: string
}): Promise<PedidoInterno[]> {
  const sp = new URLSearchParams()
  sp.set('soloInternos', 'true')
  if (params?.responsableId) sp.set('responsableId', params.responsableId)
  if (params?.estado) sp.set('estado', params.estado)
  if (params?.centroCostoId) sp.set('centroCostoId', params.centroCostoId)

  const res = await fetch(`${BASE_URL}?${sp.toString()}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Error al obtener pedidos internos')
  }
  return res.json()
}

export async function getPedidoInternoById(id: string): Promise<PedidoInterno> {
  const res = await fetch(`${BASE_URL}/${id}`)
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Error al obtener pedido interno')
  }
  return res.json()
}

export async function createPedidoInterno(payload: PedidoEquipoPayload): Promise<PedidoInterno> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Error al crear pedido interno')
  }
  return res.json()
}

export async function deletePedidoInterno(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err.error || 'Error al eliminar pedido interno')
  }
}
