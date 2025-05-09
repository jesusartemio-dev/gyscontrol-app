// ===================================================
// 📁 Archivo: cotizacionServicioItem.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Servicio Fetch para CotizacionServicioItem
//
// 🧠 Uso: Operaciones CRUD de los ítems de servicio en una cotización
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-04-23
// ===================================================

'use client'

import {
  CotizacionServicioItem,
  CotizacionServicioItemPayload,
  CotizacionServicioItemUpdatePayload
} from '@/types'

const BASE_URL = '/api/cotizacion-servicio-item'

// ✅ Crear nuevo ítem de servicio
export async function createCotizacionServicioItem(
  payload: CotizacionServicioItemPayload
): Promise<CotizacionServicioItem> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Error al crear ítem de servicio (cotización)')
  return res.json()
}

// ✅ Actualizar ítem de servicio
export async function updateCotizacionServicioItem(
  id: string,
  payload: CotizacionServicioItemUpdatePayload
): Promise<CotizacionServicioItem> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Error al actualizar ítem de servicio (cotización)')
  return res.json()
}

// ✅ Eliminar ítem de servicio
export async function deleteCotizacionServicioItem(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Error al eliminar ítem de servicio (cotización)')
}
