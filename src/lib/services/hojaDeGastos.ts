import type { HojaDeGastos, HojaDeGastosPayload, HojaDeGastosUpdatePayload } from '@/types'

const BASE_URL = '/api/hoja-de-gastos'

export async function getHojasDeGastos(params?: {
  centroCostoId?: string
  proyectoId?: string
  estado?: string
  empleadoId?: string
  scope?: string
  tipoProposito?: string
}): Promise<HojaDeGastos[]> {
  const searchParams = new URLSearchParams()
  if (params?.centroCostoId) searchParams.set('centroCostoId', params.centroCostoId)
  if (params?.proyectoId) searchParams.set('proyectoId', params.proyectoId)
  if (params?.estado) searchParams.set('estado', params.estado)
  if (params?.empleadoId) searchParams.set('empleadoId', params.empleadoId)
  if (params?.scope) searchParams.set('scope', params.scope)
  if (params?.tipoProposito) searchParams.set('tipoProposito', params.tipoProposito)
  const query = searchParams.toString()
  const res = await fetch(`${BASE_URL}${query ? `?${query}` : ''}`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al obtener hojas de gastos')
  }
  return res.json()
}

export async function getHojaDeGastosById(id: string): Promise<HojaDeGastos> {
  const res = await fetch(`${BASE_URL}/${id}`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al obtener hoja de gastos')
  }
  return res.json()
}

export async function createHojaDeGastos(payload: HojaDeGastosPayload): Promise<HojaDeGastos> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al crear hoja de gastos')
  }
  return res.json()
}

export async function updateHojaDeGastos(id: string, payload: HojaDeGastosUpdatePayload): Promise<HojaDeGastos> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al actualizar hoja de gastos')
  }
  return res.json()
}

export async function deleteHojaDeGastos(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al eliminar')
  }
}

// State transitions
async function postAction(id: string, action: string, body?: any): Promise<HojaDeGastos> {
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

// Items de pedidos elegibles para requerimiento de materiales
export interface ItemParaRequerimiento {
  id: string
  codigo: string
  descripcion: string
  unidad: string
  tipoItem: string
  cantidadPedida: number
  cantidadAtendida: number | null
  cantidadDisponible: number
  precioUnitario: number | null
  estadoEntrega: string
  pedidoId: string
  proveedorId: string | null
  proveedorNombre: string | null
  proveedor: { id: string; nombre: string } | null
  pedidoEquipo: {
    id: string
    codigo: string
    estado: string
    fechaNecesaria: string
    proyectoId: string | null
    proyecto: { id: string; codigo: string; nombre: string; estado: string } | null
  }
}

export interface PedidoParaRequerimiento {
  id: string
  codigo: string
  estado: string
  fechaNecesaria: string
  items: ItemParaRequerimiento[]
}

export interface ProyectoParaRequerimiento {
  id: string
  codigo: string
  nombre: string
  estado: string
  pedidos: PedidoParaRequerimiento[]
}

export async function getItemsParaRequerimiento(q?: string): Promise<ProyectoParaRequerimiento[]> {
  const params = q ? `?q=${encodeURIComponent(q)}` : ''
  const res = await fetch(`/api/pedidos/items-para-requerimiento${params}`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al obtener items')
  }
  return res.json()
}

export const enviarHoja = (id: string) => postAction(id, 'enviar')
export const aprobarHoja = (id: string) => postAction(id, 'aprobar')
export const depositarHoja = (id: string, montoDepositado?: number, adjuntoIds?: string[], descripcion?: string) =>
  postAction(id, 'depositar', { montoDepositado, adjuntoIds, descripcion })
export const rendirHoja = (id: string) => postAction(id, 'rendir')
export const marcarSinAnticipoHoja = (id: string) => postAction(id, 'sin-anticipo')
export const revisarHoja = (id: string) => postAction(id, 'revisar')
export const validarHoja = (id: string) => postAction(id, 'validar')
export const cerrarHoja = (id: string) => postAction(id, 'cerrar')
export const rechazarHoja = (id: string, comentario: string) =>
  postAction(id, 'rechazar', { comentario })
export const retrocederHoja = (id: string) => postAction(id, 'retroceder')
