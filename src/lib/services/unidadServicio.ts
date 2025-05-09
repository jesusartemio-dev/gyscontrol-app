'use client'

// ===================================================
// 📁 Archivo: unidadServicio.ts
// 📌 Servicio CRUD para UnidadServicio (Frontend)
// ✨ Métodos:
// - getUnidadesServicio()
// - getUnidadServicioById()
// - createUnidadServicio()
// - updateUnidadServicio()
// - deleteUnidadServicio()
// 🧠 Usa tipos desde: src/types
// ===================================================

import type {
  UnidadServicio,
  UnidadServicioPayload,
  UnidadServicioUpdatePayload
} from '@/types'

const BASE_URL = '/api/unidad-servicio'

// ✅ Listar todas las unidades de servicio
export async function getUnidadesServicio(): Promise<UnidadServicio[]> {
  const res = await fetch(BASE_URL, { cache: 'no-store' })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Error al obtener unidades de servicio: ${msg}`)
  }
  return res.json()
}

// ✅ Obtener unidad por ID
export async function getUnidadServicioById(id: string): Promise<UnidadServicio> {
  if (!id) throw new Error('ID de unidad no proporcionado')
  const res = await fetch(`${BASE_URL}/${id}`, { cache: 'no-store' })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Error al obtener unidad de servicio: ${msg}`)
  }
  return res.json()
}

// ✅ Crear nueva unidad
export async function createUnidadServicio(payload: UnidadServicioPayload): Promise<UnidadServicio> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Error al crear unidad de servicio: ${msg}`)
  }
  return res.json()
}

// ✅ Actualizar unidad existente
export async function updateUnidadServicio(id: string, payload: UnidadServicioUpdatePayload): Promise<UnidadServicio> {
  if (!id) throw new Error('ID de unidad no proporcionado')
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Error al actualizar unidad de servicio: ${msg}`)
  }
  return res.json()
}

// ✅ Eliminar unidad
export async function deleteUnidadServicio(id: string): Promise<UnidadServicio> {
  if (!id) throw new Error('ID de unidad no proporcionado')
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) {
    const msg = await res.text()
    throw new Error(`Error al eliminar unidad de servicio: ${msg}`)
  }
  return res.json()
}
