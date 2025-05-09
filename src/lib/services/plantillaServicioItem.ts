// ===================================================
// 📁 Archivo: plantillaServicioItem.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Servicio Fetch para PlantillaServicioItem
//
// 🧠 Uso: Operaciones CRUD de los ítems de servicio en una plantilla
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-04-22
// ===================================================

'use client'

import {
  PlantillaServicioItem,
  PlantillaServicioItemPayload,
  PlantillaServicioItemUpdatePayload
} from '@/types'

const BASE_URL = '/api/plantilla-servicio-item'

// ✅ Crear nuevo ítem de servicio
export async function createPlantillaServicioItem(
  payload: PlantillaServicioItemPayload
): Promise<PlantillaServicioItem> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Error al crear ítem de servicio')
  return res.json()
}

// ✅ Actualizar ítem de servicio
export async function updatePlantillaServicioItem(
  id: string,
  payload: PlantillaServicioItemUpdatePayload
): Promise<PlantillaServicioItem> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Error al actualizar ítem de servicio')
  return res.json()
}

// ✅ Eliminar ítem de servicio
export async function deletePlantillaServicioItem(id: string): Promise<void> {
  
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Error al eliminar ítem de servicio')
}