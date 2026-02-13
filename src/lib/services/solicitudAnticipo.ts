import type {
  SolicitudAnticipo,
  SolicitudAnticipoPayload,
  SolicitudAnticipoUpdatePayload,
} from '@/types'

const BASE_URL = '/api/solicitud-anticipo'

export async function getSolicitudesAnticipo(proyectoId?: string): Promise<SolicitudAnticipo[]> {
  try {
    const url = proyectoId ? `${BASE_URL}?proyectoId=${proyectoId}` : BASE_URL
    const res = await fetch(url)
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error || 'Error al obtener anticipos')
    }
    return await res.json()
  } catch (error) {
    console.error('Error getSolicitudesAnticipo:', error)
    return []
  }
}

export async function getSolicitudAnticipoById(id: string): Promise<SolicitudAnticipo | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error || 'Error al obtener anticipo')
    }
    return await res.json()
  } catch (error) {
    console.error('Error getSolicitudAnticipoById:', error)
    return null
  }
}

export async function createSolicitudAnticipo(payload: SolicitudAnticipoPayload): Promise<SolicitudAnticipo> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Error al crear anticipo')
  }
  return await res.json()
}

export async function updateSolicitudAnticipo(id: string, payload: SolicitudAnticipoUpdatePayload): Promise<SolicitudAnticipo> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Error al actualizar anticipo')
  }
  return await res.json()
}

export async function deleteSolicitudAnticipo(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Error al eliminar anticipo')
  }
}

// Acciones de estado
export async function enviarSolicitudAnticipo(id: string): Promise<SolicitudAnticipo> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ estado: 'enviado' }),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Error al enviar anticipo')
  }
  return await res.json()
}

export async function aprobarSolicitudAnticipo(id: string): Promise<SolicitudAnticipo> {
  const res = await fetch(`${BASE_URL}/${id}/aprobar`, { method: 'POST' })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Error al aprobar anticipo')
  }
  return await res.json()
}

export async function rechazarSolicitudAnticipo(id: string, comentario: string): Promise<SolicitudAnticipo> {
  const res = await fetch(`${BASE_URL}/${id}/rechazar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ comentario }),
  })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Error al rechazar anticipo')
  }
  return await res.json()
}

export async function pagarSolicitudAnticipo(id: string): Promise<SolicitudAnticipo> {
  const res = await fetch(`${BASE_URL}/${id}/pagar`, { method: 'POST' })
  if (!res.ok) {
    const { error } = await res.json()
    throw new Error(error || 'Error al marcar como pagado')
  }
  return await res.json()
}
