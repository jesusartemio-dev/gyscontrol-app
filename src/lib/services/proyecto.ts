import type { Proyecto, ProyectoPayload } from '@/types'
import { logger } from '@/lib/logger'
import { buildApiUrl } from '@/lib/utils'

// Obtener todos los proyectos
export async function getProyectos(): Promise<Proyecto[]> {
  // ✅ Use absolute URL for server-side requests
  const baseUrl = typeof window === 'undefined' 
    ? process.env.NEXTAUTH_URL || 'http://localhost:3000'
    : ''
  const url = `${baseUrl}/api/proyecto`
  
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error al obtener proyectos')
  return res.json()
}

// Crear un nuevo proyecto manual
export async function createProyecto(data: Record<string, any>): Promise<Proyecto> {
  const res = await fetch(buildApiUrl('/api/proyecto'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error al crear proyecto')
  return res.json()
}

// Actualizar un proyecto existente
export async function updateProyecto(id: string, data: Record<string, any>): Promise<Proyecto> {
  const res = await fetch(`/api/proyecto/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error al actualizar proyecto')
  return res.json()
}

// Eliminar un proyecto
export async function deleteProyecto(id: string): Promise<void> {
  const res = await fetch(`/api/proyecto/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Error al eliminar proyecto')
}

// ✅ Crear proyecto desde cotización (nuevo flujo con payload completo)
export async function crearProyectoDesdeCotizacion(
  cotizacionId: string,
  data: ProyectoPayload
): Promise<Proyecto> {
  const res = await fetch(buildApiUrl('/api/proyecto/from-cotizacion'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cotizacionId, ...data }),
  })
  if (!res.ok) throw new Error('Error al crear proyecto desde cotización')
  return res.json()
}

// Obtener un proyecto por su ID
export async function getProyectoById(id: string): Promise<Proyecto | null> {
  try {
    // ✅ Use absolute URL for server-side requests
    const baseUrl = typeof window === 'undefined' 
      ? process.env.NEXTAUTH_URL || 'http://localhost:3000'
      : ''
    const url = `${baseUrl}/api/proyecto/${id}`
    
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      cache: 'no-store'
    })
    
    if (!res.ok) {
      if (res.status === 404) {
        console.warn(`Proyecto no encontrado: ${id}`)
        return null
      }
      if (res.status === 401) {
        console.warn('No autorizado para obtener proyecto')
        return null
      }
      console.error(`Error ${res.status}: ${res.statusText}`)
      return null
    }
    
    return await res.json()
  } catch (error) {
    console.error('getProyectoById:', error)
    return null
  }
}
