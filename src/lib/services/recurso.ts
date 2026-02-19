'use client'

import { Recurso, RecursoPayload } from '@/types'

const BASE_URL = '/api/recurso'

export async function getRecursos(soloActivos?: boolean): Promise<Recurso[]> {
  const url = soloActivos ? `${BASE_URL}?activos=true` : BASE_URL
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error al listar recursos')
  return res.json()
}

export async function createRecurso(payload: RecursoPayload): Promise<Recurso> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Error al crear recurso')
  return res.json()
}

export async function updateRecurso(id: string, payload: RecursoPayload): Promise<Recurso> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Error al actualizar recurso')
  return res.json()
}

export async function deleteRecurso(id: string): Promise<Recurso> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error || 'Error al eliminar recurso')
  }
  return res.json()
}

export async function toggleRecursoActivo(id: string, activo: boolean): Promise<Recurso> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ activo }),
  })
  if (!res.ok) throw new Error('Error al cambiar estado del recurso')
  return res.json()
}

export async function reordenarRecursos(items: { id: string; orden: number }[]): Promise<void> {
  const res = await fetch(`${BASE_URL}/reordenar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  if (!res.ok) throw new Error('Error al reordenar recursos')
}
