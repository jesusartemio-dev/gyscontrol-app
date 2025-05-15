// ===================================================
// 📁 Archivo: valorizacion.ts
// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para manejar valorizaciones de proyecto
//
// 🧠 Uso: CRUD de valorizaciones por parte del área de gestión
// ===================================================

import type { Valorizacion, ValorizacionPayload } from '@/types'

const BASE_URL = '/api/valorizacion'

export async function getValorizaciones(): Promise<Valorizacion[]> {
  try {
    const res = await fetch(BASE_URL)
    if (!res.ok) throw new Error('Error al obtener valorizaciones')
    return res.json()
  } catch (error) {
    console.error('getValorizaciones:', error)
    return []
  }
}

export async function getValorizacionById(id: string): Promise<Valorizacion | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) throw new Error('Error al obtener valorización')
    return res.json()
  } catch (error) {
    console.error('getValorizacionById:', error)
    return null
  }
}

export async function createValorizacion(payload: ValorizacionPayload): Promise<Valorizacion | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al crear valorización')
    return res.json()
  } catch (error) {
    console.error('createValorizacion:', error)
    return null
  }
}

export async function updateValorizacion(id: string, payload: Partial<ValorizacionPayload>): Promise<Valorizacion | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al actualizar valorización')
    return res.json()
  } catch (error) {
    console.error('updateValorizacion:', error)
    return null
  }
}

export async function deleteValorizacion(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    })
    return res.ok
  } catch (error) {
    console.error('deleteValorizacion:', error)
    return false
  }
}
