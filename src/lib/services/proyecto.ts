import type { Proyecto, ProyectoPayload } from '@/types'

// Obtener todos los proyectos
export async function getProyectos(): Promise<Proyecto[]> {
  const res = await fetch('/api/proyecto')
  if (!res.ok) throw new Error('Error al obtener proyectos')
  return res.json()
}

// Crear un nuevo proyecto manual
export async function createProyecto(data: Record<string, any>): Promise<Proyecto> {
  const res = await fetch('/api/proyecto', {
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
  const res = await fetch('/api/proyecto/from-cotizacion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cotizacionId, ...data }),
  })
  if (!res.ok) throw new Error('Error al crear proyecto desde cotización')
  return res.json()
}

// Obtener un proyecto por su ID
export async function getProyectoById(id: string): Promise<Proyecto> {
  const res = await fetch(`/api/proyecto/${id}`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Error al obtener el proyecto por ID')
  return res.json()
}
