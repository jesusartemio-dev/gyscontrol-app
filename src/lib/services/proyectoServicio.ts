// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para ProyectoServicioCotizado (grupos técnicos de servicios) e ítems
// ===================================================

import type { ProyectoServicioCotizado, ProyectoServicioCotizadoItem } from '@/types'

// ✅ Obtener grupos de servicios por proyecto (secciones técnicas)
export async function getProyectoServicios(proyectoId: string): Promise<ProyectoServicioCotizado[]> {
  try {
    const response = await fetch(`/api/proyecto-servicio/from-proyecto/${proyectoId}`)
    if (!response.ok) throw new Error('Error al obtener servicios del proyecto')
    return response.json()
  } catch (error) {
    console.error('❌ getProyectoServicios:', error)
    return []
  }
}

// ✅ Obtener un grupo de servicio por ID
export async function getProyectoServicioById(servicioId: string): Promise<ProyectoServicioCotizado | null> {
  try {
    const response = await fetch(`/api/proyecto-servicio/${servicioId}`)
    if (!response.ok) throw new Error('Error al obtener servicio')
    return response.json()
  } catch (error) {
    console.error('❌ getProyectoServicioById:', error)
    return null
  }
}

// ✅ Obtener todos los ítems de servicios del proyecto
export async function getProyectoServicioItems(proyectoId: string): Promise<ProyectoServicioCotizadoItem[]> {
  try {
    const response = await fetch(`/api/proyecto-servicio-item/from-proyecto/${proyectoId}`)
    if (!response.ok) throw new Error('Error al obtener ítems de servicios')
    return response.json()
  } catch (error) {
    console.error('❌ getProyectoServicioItems:', error)
    return []
  }
}

// ✅ Crear un grupo de servicios
export async function createProyectoServicio(data: {
  proyectoId: string
  responsableId: string
  nombre: string
  descripcion?: string
  categoria: string
}): Promise<ProyectoServicioCotizado> {
  try {
    const response = await fetch('/api/proyecto-servicio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Error al crear servicio')
    return response.json()
  } catch (error) {
    console.error('❌ createProyectoServicio:', error)
    throw error
  }
}

// ✅ Actualizar un grupo de servicios
export async function updateProyectoServicio(
  id: string,
  data: Partial<{
    nombre: string
    descripcion: string
    categoria: string
    responsableId: string
  }>
): Promise<ProyectoServicioCotizado> {
  try {
    const response = await fetch(`/api/proyecto-servicio/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Error al actualizar servicio')
    return response.json()
  } catch (error) {
    console.error('❌ updateProyectoServicio:', error)
    throw error
  }
}

// ✅ Eliminar un grupo de servicios
export async function deleteProyectoServicio(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/proyecto-servicio/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Error al eliminar servicio')
  } catch (error) {
    console.error('❌ deleteProyectoServicio:', error)
    throw error
  }
}
