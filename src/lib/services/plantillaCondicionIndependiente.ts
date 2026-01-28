import { buildApiUrl } from '@/lib/utils'

// ===================================================
// Archivo: src/lib/services/plantillaCondicionIndependiente.ts
// Descripcion: Servicios para gestionar plantillas de condiciones independientes
// ===================================================

export interface PlantillaCondicionItem {
  id?: string
  catalogoCondicionId?: string
  descripcion: string
  tipo?: string
  orden: number
  catalogoCondicion?: {
    id: string
    codigo: string
    descripcion: string
    tipo?: string
    categoria?: { id: string; nombre: string }
  }
}

export interface PlantillaCondicionIndependiente {
  id: string
  nombre: string
  descripcion?: string
  activo: boolean
  createdAt: string
  updatedAt: string
  plantillaCondicionItemIndependiente?: PlantillaCondicionItem[]
  _count?: { plantillaCondicionItemIndependiente: number }
}

export interface PlantillaCondicionPayload {
  nombre: string
  descripcion?: string
  activo?: boolean
  items?: Array<{
    catalogoCondicionId?: string
    descripcion: string
    tipo?: string
    orden?: number
  }>
}

// Obtener todas las plantillas de condiciones
export async function getPlantillasCondicionIndependiente(): Promise<PlantillaCondicionIndependiente[]> {
  try {
    const res = await fetch(buildApiUrl('/api/plantillas/condiciones-independiente'))
    if (!res.ok) throw new Error('Error al obtener plantillas de condiciones')
    return await res.json()
  } catch (error) {
    console.error('Error en getPlantillasCondicionIndependiente:', error)
    throw error
  }
}

// Obtener plantilla por ID
export async function getPlantillaCondicionIndependienteById(id: string): Promise<PlantillaCondicionIndependiente> {
  try {
    const res = await fetch(buildApiUrl(`/api/plantillas/condiciones-independiente/${id}`))
    if (!res.ok) throw new Error('Error al obtener plantilla de condiciones')
    return await res.json()
  } catch (error) {
    console.error('Error en getPlantillaCondicionIndependienteById:', error)
    throw error
  }
}

// Crear nueva plantilla
export async function createPlantillaCondicionIndependiente(data: PlantillaCondicionPayload): Promise<PlantillaCondicionIndependiente> {
  try {
    const res = await fetch(buildApiUrl('/api/plantillas/condiciones-independiente'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }))
      throw new Error(errorData.error || 'Error al crear plantilla de condiciones')
    }
    return await res.json()
  } catch (error) {
    console.error('Error en createPlantillaCondicionIndependiente:', error)
    throw error
  }
}

// Actualizar plantilla
export async function updatePlantillaCondicionIndependiente(
  id: string,
  data: Partial<PlantillaCondicionPayload>
): Promise<PlantillaCondicionIndependiente> {
  try {
    const res = await fetch(buildApiUrl(`/api/plantillas/condiciones-independiente/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }))
      throw new Error(errorData.error || 'Error al actualizar plantilla de condiciones')
    }
    return await res.json()
  } catch (error) {
    console.error('Error en updatePlantillaCondicionIndependiente:', error)
    throw error
  }
}

// Eliminar plantilla
export async function deletePlantillaCondicionIndependiente(id: string): Promise<void> {
  try {
    const res = await fetch(buildApiUrl(`/api/plantillas/condiciones-independiente/${id}`), {
      method: 'DELETE'
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Error desconocido' }))
      throw new Error(errorData.error || 'Error al eliminar plantilla de condiciones')
    }
  } catch (error) {
    console.error('Error en deletePlantillaCondicionIndependiente:', error)
    throw error
  }
}
