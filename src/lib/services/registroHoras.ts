// ===================================================
// 📁 Archivo: registroHoras.ts
// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para manejar los registros de horas trabajadas por técnicos
//
// 🧠 Uso: CRUD desde gestión de servicios, dashboard de ejecución técnica
// ===================================================

import type { RegistroHoras, RegistroHorasPayload } from '@/types'

const BASE_URL = '/api/registro-horas'

export async function getRegistrosHoras(): Promise<RegistroHoras[]> {
  try {
    const res = await fetch(BASE_URL)
    if (!res.ok) throw new Error('Error al obtener registros de horas')
    return res.json()
  } catch (error) {
    console.error('getRegistrosHoras:', error)
    return []
  }
}

export async function getRegistroHorasById(id: string): Promise<RegistroHoras | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) throw new Error('Error al obtener registro de horas')
    return res.json()
  } catch (error) {
    console.error('getRegistroHorasById:', error)
    return null
  }
}

export async function createRegistroHoras(payload: RegistroHorasPayload): Promise<RegistroHoras | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al crear registro de horas')
    return res.json()
  } catch (error) {
    console.error('createRegistroHoras:', error)
    return null
  }
}

export async function updateRegistroHoras(id: string, payload: Partial<RegistroHorasPayload>): Promise<RegistroHoras | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al actualizar registro de horas')
    return res.json()
  } catch (error) {
    console.error('updateRegistroHoras:', error)
    return null
  }
}

export async function deleteRegistroHoras(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    })
    return res.ok
  } catch (error) {
    console.error('deleteRegistroHoras:', error)
    return false
  }
}
