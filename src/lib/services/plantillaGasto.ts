// ===================================================
// 📁 Archivo: plantillaGasto.ts
// 📌 Ubicación: src/lib/services/plantillaGasto.ts
// 🔧 Descripción: Funciones para manejar PlantillaGasto desde el cliente
//
// 🧠 Uso: Usado en páginas y componentes que gestionan secciones de gastos
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-05-05
// ===================================================

import type { PlantillaGasto, PlantillaGastoPayload, PlantillaGastoUpdatePayload } from '@/types'

const BASE_URL = '/api/plantilla-gasto'

// ✅ Obtener todas las secciones de gasto
export async function getPlantillaGastos(): Promise<PlantillaGasto[]> {
  try {
    const res = await fetch(BASE_URL)
    if (!res.ok) throw new Error('Error al obtener secciones de gasto')
    return await res.json()
  } catch (error) {
    console.error(error)
    return []
  }
}

// ✅ Obtener sección por ID
export async function getPlantillaGastoById(id: string): Promise<PlantillaGasto | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) throw new Error('Error al obtener sección de gasto por ID')
    return await res.json()
  } catch (error) {
    console.error(error)
    return null
  }
}

// ✅ Crear sección
export async function createPlantillaGasto(payload: PlantillaGastoPayload): Promise<PlantillaGasto | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error('Error al crear sección de gasto')
    return await res.json()
  } catch (error) {
    console.error(error)
    return null
  }
}

// ✅ Actualizar sección
export async function updatePlantillaGasto(id: string, payload: PlantillaGastoUpdatePayload): Promise<PlantillaGasto | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    if (!res.ok) throw new Error('Error al actualizar sección de gasto')
    return await res.json()
  } catch (error) {
    console.error(error)
    return null
  }
}

// ✅ Eliminar sección
export async function deletePlantillaGasto(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Error al eliminar sección de gasto')
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}
