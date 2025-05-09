// ===================================================
// 📁 Archivo: plantillaEquipoItem.ts
// 📌 Servicios para CRUD de ítems de equipo en plantilla
// 🧠 Usa tipos: PlantillaEquipoItem, PlantillaEquipoItemPayload
// ===================================================

import type {
  PlantillaEquipoItem,
  PlantillaEquipoItemPayload
} from '@/types'

// ✅ Crear ítem
export async function createPlantillaEquipoItem(
  data: PlantillaEquipoItemPayload
): Promise<PlantillaEquipoItem> {
  try {
    const res = await fetch('/api/plantilla-equipo-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al agregar ítem')
    return await res.json()
  } catch (error) {
    console.error('❌ createPlantillaEquipoItem:', error)
    throw error
  }
}

// ✅ Actualizar ítem
export async function updatePlantillaEquipoItem(
  id: string,
  data: Partial<PlantillaEquipoItemPayload>
): Promise<PlantillaEquipoItem> {
  try {
    const res = await fetch(`/api/plantilla-equipo-item/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al actualizar ítem')
    return await res.json()
  } catch (error) {
    console.error('❌ updatePlantillaEquipoItem:', error)
    throw error
  }
}

// ✅ Eliminar ítem
export async function deletePlantillaEquipoItem(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/plantilla-equipo-item/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Error al eliminar ítem')
  } catch (error) {
    console.error('❌ deletePlantillaEquipoItem:', error)
    throw error
  }
}
