'use client'

import { Recurso, RecursoPayload } from '@/types'

const BASE_URL = '/api/recurso'

export async function getRecursos(): Promise<Recurso[]> {
  const res = await fetch(BASE_URL)
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
  if (!res.ok) throw new Error('Error al eliminar recurso')
  return res.json()
}
