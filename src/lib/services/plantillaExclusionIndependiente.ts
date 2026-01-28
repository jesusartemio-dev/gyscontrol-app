import { buildApiUrl } from '@/lib/utils'

// ===================================================
// Archivo: src/lib/services/plantillaExclusionIndependiente.ts
// Descripcion: Servicios para gestionar plantillas de exclusiones independientes
// ===================================================

export interface PlantillaExclusionItem {
  id?: string
  catalogoExclusionId?: string
  descripcion: string
  orden: number
  catalogoExclusion?: {
    id: string
    codigo: string
    descripcion: string
    categoria?: { id: string; nombre: string }
  }
}

export interface PlantillaExclusionIndependiente {
  id: string
  nombre: string
  descripcion?: string
  activo: boolean
  createdAt: string
  updatedAt: string
  plantillaExclusionItemIndependiente?: PlantillaExclusionItem[]
  _count?: { plantillaExclusionItemIndependiente: number }
}

export interface PlantillaExclusionPayload {
  nombre: string
  descripcion?: string
  activo?: boolean
  items?: Array<{
    catalogoExclusionId?: string
    descripcion: string
    orden?: number
  }>
}

// Obtener todas las plantillas de exclusiones
export async function getPlantillasExclusionIndependiente(): Promise<PlantillaExclusionIndependiente[]> {
  try {
    const res = await fetch(buildApiUrl('/api/plantillas/exclusiones-independiente'))
    if (!res.ok) throw new Error('Error al obtener plantillas de exclusiones')
    return await res.json()
  } catch (error) {
    console.error('Error en getPlantillasExclusionIndependiente:', error)
    throw error
  }
}

// Obtener plantilla por ID
export async function getPlantillaExclusionIndependienteById(id: string): Promise<PlantillaExclusionIndependiente> {
  try {
    const res = await fetch(buildApiUrl(`/api/plantillas/exclusiones-independiente/${id}`))
    if (!res.ok) throw new Error('Error al obtener plantilla de exclusiones')
    return await res.json()
  } catch (error) {
    console.error('Error en getPlantillaExclusionIndependienteById:', error)
    throw error
  }
}

// Crear nueva plantilla
export async function createPlantillaExclusionIndependiente(data: PlantillaExclusionPayload): Promise<PlantillaExclusionIndependiente> {
  try {
    const res = await fetch(buildApiUrl('/api/plantillas/exclusiones-independiente'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }))
      throw new Error(errorData.error || 'Error al crear plantilla de exclusiones')
    }
    return await res.json()
  } catch (error) {
    console.error('Error en createPlantillaExclusionIndependiente:', error)
    throw error
  }
}

// Actualizar plantilla
export async function updatePlantillaExclusionIndependiente(
  id: string,
  data: Partial<PlantillaExclusionPayload>
): Promise<PlantillaExclusionIndependiente> {
  try {
    const res = await fetch(buildApiUrl(`/api/plantillas/exclusiones-independiente/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }))
      throw new Error(errorData.error || 'Error al actualizar plantilla de exclusiones')
    }
    return await res.json()
  } catch (error) {
    console.error('Error en updatePlantillaExclusionIndependiente:', error)
    throw error
  }
}

// Eliminar plantilla
export async function deletePlantillaExclusionIndependiente(id: string): Promise<void> {
  try {
    const res = await fetch(buildApiUrl(`/api/plantillas/exclusiones-independiente/${id}`), {
      method: 'DELETE'
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }))
      throw new Error(errorData.error || 'Error al eliminar plantilla de exclusiones')
    }
  } catch (error) {
    console.error('Error en deletePlantillaExclusionIndependiente:', error)
    throw error
  }
}
