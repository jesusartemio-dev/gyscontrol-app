import type {
  RendicionGasto,
  RendicionGastoPayload,
  RendicionGastoUpdatePayload,
} from '@/types'

const BASE_URL = '/api/rendicion-gasto'

export async function getRendicionesGasto(params?: {
  proyectoId?: string
  solicitudAnticipoId?: string
}): Promise<RendicionGasto[]> {
  try {
    const searchParams = new URLSearchParams()
    if (params?.proyectoId) searchParams.set('proyectoId', params.proyectoId)
    if (params?.solicitudAnticipoId) searchParams.set('solicitudAnticipoId', params.solicitudAnticipoId)
    const qs = searchParams.toString()
    const url = qs ? `${BASE_URL}?${qs}` : BASE_URL
    const res = await fetch(url)
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error || 'Error al obtener rendiciones')
    }
    return await res.json()
  } catch (error) {
    console.error('Error getRendicionesGasto:', error)
    return []
  }
}

export async function getRendicionGastoById(id: string): Promise<RendicionGasto | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error || 'Error al obtener rendición')
    }
    return await res.json()
  } catch (error) {
    console.error('Error getRendicionGastoById:', error)
    return null
  }
}

export async function createRendicionGasto(payload: RendicionGastoPayload): Promise<RendicionGasto> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Error al crear rendición')
  }
  return await res.json()
}

export async function updateRendicionGasto(id: string, payload: RendicionGastoUpdatePayload): Promise<RendicionGasto> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Error al actualizar rendición')
  }
  return await res.json()
}

export async function deleteRendicionGasto(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Error al eliminar rendición')
  }
}

// Acciones de estado
export async function enviarRendicionGasto(id: string): Promise<RendicionGasto> {
  const res = await fetch(`${BASE_URL}/${id}/enviar`, { method: 'POST' })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Error al enviar rendición')
  }
  return await res.json()
}

export async function aprobarRendicionGasto(id: string): Promise<RendicionGasto> {
  const res = await fetch(`${BASE_URL}/${id}/aprobar`, { method: 'POST' })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Error al aprobar rendición')
  }
  return await res.json()
}

export async function rechazarRendicionGasto(id: string, comentario: string): Promise<RendicionGasto> {
  const res = await fetch(`${BASE_URL}/${id}/rechazar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comentario }),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Error al rechazar rendición')
  }
  return await res.json()
}
