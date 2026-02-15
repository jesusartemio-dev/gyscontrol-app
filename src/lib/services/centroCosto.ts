import type { CentroCosto, CentroCostoPayload, CentroCostoUpdatePayload } from '@/types'

const BASE_URL = '/api/centro-costo'

export async function getCentrosCosto(params?: { tipo?: string; activo?: boolean }): Promise<CentroCosto[]> {
  const searchParams = new URLSearchParams()
  if (params?.tipo) searchParams.set('tipo', params.tipo)
  if (params?.activo !== undefined) searchParams.set('activo', String(params.activo))
  const query = searchParams.toString()
  const res = await fetch(`${BASE_URL}${query ? `?${query}` : ''}`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al obtener centros de costo')
  }
  return res.json()
}

export async function getCentroCostoById(id: string): Promise<CentroCosto> {
  const res = await fetch(`${BASE_URL}/${id}`)
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al obtener centro de costo')
  }
  return res.json()
}

export async function createCentroCosto(payload: CentroCostoPayload): Promise<CentroCosto> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al crear centro de costo')
  }
  return res.json()
}

export async function updateCentroCosto(id: string, payload: CentroCostoUpdatePayload): Promise<CentroCosto> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al actualizar centro de costo')
  }
  return res.json()
}

export async function deleteCentroCosto(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const err = await res.json()
    throw new Error(err.error || 'Error al eliminar centro de costo')
  }
}
