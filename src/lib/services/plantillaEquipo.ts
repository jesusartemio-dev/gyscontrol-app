import type { PlantillaEquipo, PlantillaEquipoPayload } from '@/types'

export async function getPlantillaEquipoById(id: string): Promise<PlantillaEquipo> {
  try {
    const res = await fetch(`/api/plantilla-equipo/${id}`)
    if (!res.ok) throw new Error('Error al obtener la sección del equipo')
    return await res.json()
  } catch (error) {
    console.error('❌ getPlantillaEquipoById:', error)
    throw error
  }
}

export async function createPlantillaEquipo(data: PlantillaEquipoPayload): Promise<PlantillaEquipo> {
  try {
    const res = await fetch('/api/plantilla-equipo', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al crear sección de equipos')
    return await res.json()
  } catch (error) {
    console.error('❌ createPlantillaEquipo:', error)
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

