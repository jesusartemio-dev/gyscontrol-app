// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para ProyectoCotizadoGasto (grupos técnicos de gastos) e ítems
// ===================================================

import type { ProyectoCotizadoGasto, ProyectoGastoCotizadoItem } from '@/types'

// ✅ Obtener grupos de gastos por proyecto (secciones técnicas)
export async function getProyectoGastos(proyectoId: string): Promise<ProyectoCotizadoGasto[]> {
  try {
    const response = await fetch(`/api/proyecto-gasto/from-proyecto/${proyectoId}`)
    if (!response.ok) throw new Error('Error al obtener gastos del proyecto')
    return response.json()
  } catch (error) {
    console.error('❌ getProyectoGastos:', error)
    return []
  }
}

// ✅ Obtener un grupo de gasto por ID
export async function getProyectoGastoById(gastoId: string): Promise<ProyectoCotizadoGasto | null> {
  try {
    const response = await fetch(`/api/proyecto-gasto/${gastoId}`)
    if (!response.ok) throw new Error('Error al obtener gasto')
    return response.json()
  } catch (error) {
    console.error('❌ getProyectoGastoById:', error)
    return null
  }
}

// ✅ Obtener todos los ítems de gastos del proyecto
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

// ✅ Crear un grupo de gastos
export async function createProyectoGasto(data: {
  proyectoId: string
  nombre: string
  descripcion?: string
}): Promise<ProyectoCotizadoGasto> {
  try {
    const response = await fetch('/api/proyecto-gasto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Error al crear gasto')
    return response.json()
  } catch (error) {
    console.error('❌ createProyectoGasto:', error)
    throw error
  }
}

// ✅ Actualizar un grupo de gastos
export async function updateProyectoGasto(
  id: string,
  data: Partial<{
    nombre: string
    descripcion: string
  }>
): Promise<ProyectoCotizadoGasto> {
  try {
    const response = await fetch(`/api/proyecto-gasto/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!response.ok) throw new Error('Error al actualizar gasto')
    return response.json()
  } catch (error) {
    console.error('❌ updateProyectoGasto:', error)
    throw error
  }
}

// ✅ Eliminar un grupo de gastos
export async function deleteProyectoGasto(id: string): Promise<void> {
  try {
    const response = await fetch(`/api/proyecto-gasto/${id}`, {
      method: 'DELETE'
    })
    if (!response.ok) throw new Error('Error al eliminar gasto')
  } catch (error) {
    console.error('❌ deleteProyectoGasto:', error)
    throw error
  }
}