// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para ProyectoServicioCotizadoItem (ítems de servicios)
// ===================================================

import type {
  ProyectoServicioCotizadoItem,
  ProyectoServicioCotizadoItemPayload,
  ProyectoServicioCotizadoItemUpdatePayload,
} from '@/types'

// ✅ Obtener ítems de servicios del proyecto, con opción de filtrar solo disponibles
export async function getProyectoServicioItems(
  proyectoId: string,
  soloDisponibles: boolean = false
): Promise<ProyectoServicioCotizadoItem[]> {
  try {
    const url = soloDisponibles
      ? `/api/proyecto-servicio-item/disponibles/proyecto/${proyectoId}`
      : `/api/proyecto-servicio-item/from-proyecto/${proyectoId}`

    const response = await fetch(url)
    if (!response.ok) throw new Error('Error al obtener ítems de servicios')
    return response.json()
  } catch (error) {
    console.error('❌ getProyectoServicioItems:', error)
    return []
  }
}

// 🔁 Alias por compatibilidad: obtiene ítems sin registro de horas asignado
export async function getProyectoServicioItemsDisponibles(proyectoId: string): Promise<ProyectoServicioCotizadoItem[]> {
  return getProyectoServicioItems(proyectoId, true)
}

// ✅ Obtener un ítem por ID
export async function getProyectoServicioItemById(id: string): Promise<ProyectoServicioCotizadoItem | null> {
  try {
    const response = await fetch(`/api/proyecto-servicio-item/${id}`)
    if (!response.ok) throw new Error('Error al obtener ítem de servicio')
    return response.json()
  } catch (error) {
    console.error('❌ getProyectoServicioItemById:', error)
    return null
  }
}

// ✅ Crear ítem (puede derivarse de un ítem anterior mediante listaServicioSeleccionadoId)
export async function createProyectoServicioItem(
  data: ProyectoServicioCotizadoItemPayload
): Promise<ProyectoServicioCotizadoItem> {
  try {
    const response = await fetch('/api/proyecto-servicio-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Error al crear ítem de servicio')
    return response.json()
  } catch (error) {
    console.error('❌ createProyectoServicioItem:', error)
    throw error
  }
}

// ✅ Actualizar ítem (incluye campo listaServicioSeleccionadoId para trazabilidad)
export async function updateProyectoServicioItem(
  id: string,
  data: ProyectoServicioCotizadoItemUpdatePayload
): Promise<ProyectoServicioCotizadoItem> {
  try {
    const response = await fetch(`/api/proyecto-servicio-item/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Error al actualizar ítem de servicio')
    return response.json()
  } catch (error) {
    console.error('❌ updateProyectoServicioItem:', error)
    throw error
  }
}

// ✅ Eliminar ítem
export async function deleteProyectoServicioItem(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/proyecto-servicio-item/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Error al eliminar ítem de servicio')
  } catch (error) {
    console.error('❌ deleteProyectoServicioItem:', error)
    throw error
  }
}