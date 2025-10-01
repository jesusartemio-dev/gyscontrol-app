// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para ProyectoGastoCotizadoItem (ítems de gastos)
// ===================================================

import type {
  ProyectoGastoCotizadoItem,
  ProyectoGastoCotizadoItemPayload,
  ProyectoGastoCotizadoItemUpdatePayload,
} from '@/types'

// ✅ Obtener ítems de gastos del proyecto
export async function getProyectoGastoItems(proyectoId: string): Promise<ProyectoGastoCotizadoItem[]> {
  try {
    const response = await fetch(`/api/proyecto-gasto-item/from-proyecto/${proyectoId}`)
    if (!response.ok) throw new Error('Error al obtener ítems de gastos')
    return response.json()
  } catch (error) {
    console.error('❌ getProyectoGastoItems:', error)
    return []
  }
}

// ✅ Obtener un ítem por ID
export async function getProyectoGastoItemById(id: string): Promise<ProyectoGastoCotizadoItem | null> {
  try {
    const response = await fetch(`/api/proyecto-gasto-item/${id}`)
    if (!response.ok) throw new Error('Error al obtener ítem de gasto')
    return response.json()
  } catch (error) {
    console.error('❌ getProyectoGastoItemById:', error)
    return null
  }
}

// ✅ Crear ítem
export async function createProyectoGastoItem(
  data: ProyectoGastoCotizadoItemPayload
): Promise<ProyectoGastoCotizadoItem> {
  try {
    const response = await fetch('/api/proyecto-gasto-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Error al crear ítem de gasto')
    return response.json()
  } catch (error) {
    console.error('❌ createProyectoGastoItem:', error)
    throw error
  }
}

// ✅ Actualizar ítem
export async function updateProyectoGastoItem(
  id: string,
  data: ProyectoGastoCotizadoItemUpdatePayload
): Promise<ProyectoGastoCotizadoItem> {
  try {
    const response = await fetch(`/api/proyecto-gasto-item/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Error al actualizar ítem de gasto')
    return response.json()
  } catch (error) {
    console.error('❌ updateProyectoGastoItem:', error)
    throw error
  }
}

// ✅ Eliminar ítem
export async function deleteProyectoGastoItem(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/proyecto-gasto-item/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Error al eliminar ítem de gasto')
  } catch (error) {
    console.error('❌ deleteProyectoGastoItem:', error)
    throw error
  }
}
