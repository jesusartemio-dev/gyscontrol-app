// ===================================================
// 📁 Archivo: plantillaServicio.ts
// 📌 Ubicación: src/lib/services/plantillaServicio.ts
// 🔧 Descripción: Funciones para manejar PlantillaServicio desde el cliente
//
// 🧠 Uso: Consumido por formularios, listas y componentes relacionados a secciones de servicios
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-04-21
// ===================================================

import type { PlantillaServicio, PlantillaServicioPayload, PlantillaServicioUpdatePayload } from '@/types'

const BASE_URL = '/api/plantilla-servicio'

// ✅ Obtener todos los servicios de plantilla
export async function getPlantillaServicios(): Promise<PlantillaServicio[]> {
  const res = await fetch(BASE_URL)
  if (!res.ok) throw new Error('Error al obtener servicios de plantilla')
  return res.json()
}

// ✅ Obtener uno por ID (si lo necesitas)
export async function getPlantillaServicioById(id: string): Promise<PlantillaServicio> {
  const res = await fetch(`${BASE_URL}/${id}`)
  if (!res.ok) throw new Error('Error al obtener plantillaServicio por ID')
  return res.json()
}

// ✅ Crear nueva sección de servicios
export async function createPlantillaServicio(payload: PlantillaServicioPayload): Promise<PlantillaServicio> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Error al crear sección de servicios')
  return res.json()
}

// ✅ Actualizar sección
export async function updatePlantillaServicio(id: string, payload: PlantillaServicioUpdatePayload): Promise<PlantillaServicio> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Error al actualizar sección de servicios')
  return res.json()
}

// ✅ Eliminar sección
export async function deletePlantillaServicio(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Error al eliminar sección de servicios')
}
