import type {
  GastoLinea,
  GastoLineaPayload,
  GastoLineaUpdatePayload,
} from '@/types'

const BASE_URL = '/api/gasto-linea'

export async function getGastoLineas(hojaDeGastosId: string): Promise<GastoLinea[]> {
  try {
    const res = await fetch(`${BASE_URL}?hojaDeGastosId=${hojaDeGastosId}`)
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error || 'Error al obtener líneas de gasto')
    }
    return await res.json()
  } catch (error) {
    console.error('Error getGastoLineas:', error)
    return []
  }
}

export async function createGastoLinea(payload: GastoLineaPayload): Promise<GastoLinea> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Error al crear línea de gasto')
  }
  return await res.json()
}

export async function updateGastoLinea(id: string, payload: GastoLineaUpdatePayload): Promise<GastoLinea> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Error al actualizar línea de gasto')
  }
  return await res.json()
}

export async function deleteGastoLinea(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Error al eliminar línea de gasto')
  }
}

export async function marcarConformidad(
  id: string,
  conformidad: 'conforme' | 'observado',
  comentario?: string
): Promise<GastoLinea> {
  const res = await fetch(`${BASE_URL}/${id}/conformidad`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conformidad, comentario }),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Error al marcar conformidad')
  }
  return await res.json()
}
