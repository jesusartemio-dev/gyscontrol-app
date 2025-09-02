import { PlantillaEquipoItem } from '@/types'
import { PlantillaEquipoItemPayload, PlantillaEquipoItemUpdatePayload } from '@/types/payloads'
import { buildApiUrl } from '@/lib/utils'

// ===================================================
// 📁 Archivo: src/lib/services/plantillaEquipoItem.ts
// 📌 Descripción: Servicios para gestionar items de plantilla de equipo
// 🧠 Uso: CRUD completo para items de plantilla de equipo
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-25
// ===================================================

// ✅ Crear nuevo item de plantilla de equipo
export async function createPlantillaEquipoItem(data: {
  plantillaEquipoId: string
  catalogoEquipoId: string
  cantidad: number
  observaciones?: string
}): Promise<PlantillaEquipoItem> {
  try {
    const res = await fetch(buildApiUrl('/api/plantilla-equipo-item'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al crear item de plantilla de equipo')
    return await res.json()
  } catch (error) {
    console.error('Error en createPlantillaEquipoItem:', error)
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
