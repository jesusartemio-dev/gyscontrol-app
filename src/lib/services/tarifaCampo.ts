import { buildApiUrl } from '@/lib/utils'

export interface TarifaCampoPersonal {
  id: string
  clienteId: string
  userId: string
  costoAlmuerzo: number
  costoMovilidad: number
  activo: boolean
  createdAt: string
  updatedAt: string
  cliente: { id: string; nombre: string }
  usuario: { id: string; name: string | null; email: string }
}

export interface TarifaCampoPersonalPayload {
  clienteId: string
  userId: string
  costoAlmuerzo: number
  costoMovilidad: number
  activo?: boolean
}

export interface TarifaCampoPersonalUpdatePayload {
  costoAlmuerzo?: number
  costoMovilidad?: number
  activo?: boolean
}

const BASE_URL = '/api/tarifa-campo'

export async function getTarifasCampo(clienteId?: string): Promise<TarifaCampoPersonal[]> {
  const query = clienteId ? `?clienteId=${encodeURIComponent(clienteId)}` : ''
  const res = await fetch(buildApiUrl(`${BASE_URL}${query}`))
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al obtener tarifas de campo')
  }
  return res.json()
}

export async function createTarifaCampo(payload: TarifaCampoPersonalPayload): Promise<TarifaCampoPersonal> {
  const res = await fetch(buildApiUrl(BASE_URL), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al crear tarifa de campo')
  }
  return res.json()
}

export async function updateTarifaCampo(id: string, payload: TarifaCampoPersonalUpdatePayload): Promise<TarifaCampoPersonal> {
  const res = await fetch(buildApiUrl(`${BASE_URL}/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al actualizar tarifa de campo')
  }
  return res.json()
}

export async function deleteTarifaCampo(id: string): Promise<void> {
  const res = await fetch(buildApiUrl(`${BASE_URL}/${id}`), { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al eliminar tarifa de campo')
  }
}
