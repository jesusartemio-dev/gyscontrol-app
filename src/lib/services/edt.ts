import type { Edt } from '@/types'
import type { EdtPayload } from '@/types/payloads'
import { buildApiUrl } from '@/lib/utils'

// ===================================================
// 📁 Archivo: src/lib/services/edt.ts
// 📌 Descripción: Servicios para gestionar EDTs
// 🧠 Uso: CRUD completo para EDTs
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-10-15
// ===================================================

// ✅ Obtener EDT por ID
export async function getEdtById(id: string): Promise<Edt> {
  try {
    const res = await fetch(buildApiUrl(`/api/edt/${id}`))
    if (!res.ok) throw new Error('Error al obtener EDT por ID')
    return await res.json()
  } catch (error) {
    console.error('Error en getEdtById:', error)
    throw error
  }
}

// ✅ Obtener todos los EDTs
export async function getEdts(): Promise<Edt[]> {
  try {
    const res = await fetch(buildApiUrl('/api/edt'))
    if (!res.ok) {
      const errorData = await res.json()
      throw new Error(errorData.error || 'Error al obtener EDTs')
    }
    return await res.json()
  } catch (error) {
    console.error('Error en getEdts:', error)
    throw error
  }
}

// ✅ Crear nuevo EDT
export async function createEdt(data: {
  nombre: string
  descripcion?: string
  faseDefaultId?: string
}): Promise<Edt> {
  try {
    const res = await fetch(buildApiUrl('/api/edt'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al crear EDT')
    return await res.json()
  } catch (error) {
    console.error('Error en createEdt:', error)
    throw error
  }
}

export async function updateEdt(
  id: string,
  payload: EdtPayload
): Promise<Edt> {
  const res = await fetch(buildApiUrl(`/api/edt/${id}`), {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) throw new Error('Error al actualizar EDT')
  return res.json()
}

export async function deleteEdt(id: string): Promise<Edt> {
  const res = await fetch(buildApiUrl(`/api/edt/${id}`), {
    method: 'DELETE',
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({})) // <- si no es JSON válido
    console.error('❌ Backend respondió con error:', errorData)
    throw new Error('Error al eliminar EDT')
  }

  return res.json()
}
