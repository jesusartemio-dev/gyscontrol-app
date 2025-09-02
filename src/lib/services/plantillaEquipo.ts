import type { PlantillaEquipo } from '@/types'
import { buildApiUrl } from '@/lib/utils'

// ===================================================
// 📁 Archivo: src/lib/services/plantillaEquipo.ts
// 📌 Descripción: Servicios para gestionar plantillas de equipo
// 🧠 Uso: CRUD completo para plantillas de equipo
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-25
// ===================================================

// ✅ Crear nueva plantilla de equipo
// ✅ Obtener plantilla de equipo por ID
export async function getPlantillaEquipoById(id: string): Promise<PlantillaEquipo> {
  try {
    const res = await fetch(buildApiUrl(`/api/plantilla-equipo/${id}`), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    })
    if (!res.ok) throw new Error('Error al obtener plantilla de equipo')
    return await res.json()
  } catch (error) {
    console.error('Error en getPlantillaEquipoById:', error)
    throw error
  }
}

export async function createPlantillaEquipo(data: {
  plantillaId: string
  nombre: string
  descripcion?: string
}): Promise<PlantillaEquipo> {
  try {
    const res = await fetch(buildApiUrl('/api/plantilla-equipo'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al crear plantilla de equipo')
    return await res.json()
  } catch (error) {
    console.error('Error en createPlantillaEquipo:', error)
    throw error
  }
}

export async function updatePlantillaEquipo(
  id: string,
  data: Partial<PlantillaEquipo>
): Promise<PlantillaEquipo> {
  try {
    const res = await fetch(`/api/plantilla-equipo/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al actualizar sección de equipos')
    return await res.json()
  } catch (error) {
    console.error('❌ updatePlantillaEquipo:', error)
    throw error
  }
}

export async function deletePlantillaEquipo(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/plantilla-equipo/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Error al eliminar sección de equipos')
  } catch (error) {
    console.error('❌ deletePlantillaEquipo:', error)
    throw error
  }
}

// src/lib/services/plantillaEquipo.ts

export async function updatePlantillaEquipoSubtotales(id: string, data: {
  subtotalCliente: number
  subtotalInterno: number
}) {
  const res = await fetch(`/api/plantilla-equipo/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Error al actualizar subtotales de equipo')
  return await res.json()
}

