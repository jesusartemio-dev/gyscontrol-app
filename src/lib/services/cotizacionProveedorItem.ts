// ===================================================
// 📁 Archivo: cotizacionProveedorItem.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Funciones para gestionar ítems de cotizaciones de proveedor
//
// 🧠 Uso: Logística registra cotizaciones por ítem técnico de lista
// ✍️ Autor: Jesús Artemio (GYS)
// 📅 Última actualización: 2025-05-26
// ===================================================

import {
  CotizacionProveedorItem,
  CotizacionProveedorItemPayload,
  CotizacionProveedorItemUpdatePayload,
} from '@/types'

const BASE_URL = '/api/cotizacion-proveedor-item'

// ✅ Obtener todos los ítems de cotizaciones
export async function getCotizacionProveedorItems(): Promise<CotizacionProveedorItem[] | null> {
  try {
    const res = await fetch(BASE_URL)
    if (!res.ok) throw new Error('Error al obtener ítems de cotización')
    return await res.json()
  } catch (error) {
    console.error('❌ getCotizacionProveedorItems:', error)
    return null
  }
}

// ✅ Obtener ítem por ID
export async function getCotizacionProveedorItemById(
  id: string
): Promise<CotizacionProveedorItem | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) throw new Error('Error al obtener ítem de cotización')
    return await res.json()
  } catch (error) {
    console.error('❌ getCotizacionProveedorItemById:', error)
    return null
  }
}

// ✅ Crear nuevo ítem
export async function createCotizacionProveedorItem(
  payload: CotizacionProveedorItemPayload
): Promise<CotizacionProveedorItem | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al crear ítem de cotización')
    return await res.json()
  } catch (error) {
    console.error('❌ createCotizacionProveedorItem:', error)
    return null
  }
}

// ✅ Crear múltiples ítems de forma masiva (nuevo)
export async function createMultipleCotizacionProveedorItems(
  items: CotizacionProveedorItemPayload[]
): Promise<{ success: boolean; message?: string }> {
  try {
    const res = await fetch(`${BASE_URL}/bulk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items }),
    })
    if (!res.ok) throw new Error('Error al crear ítems de forma masiva')
    return { success: true }
  } catch (error) {
    console.error('❌ createMultipleCotizacionProveedorItems:', error)
    return { success: false, message: String(error) }
  }
}

// ✅ Actualizar ítem
export async function updateCotizacionProveedorItem(
  id: string,
  payload: CotizacionProveedorItemUpdatePayload
): Promise<CotizacionProveedorItem | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al actualizar ítem de cotización')
    return await res.json()
  } catch (error) {
    console.error('❌ updateCotizacionProveedorItem:', error)
    return null
  }
}

// ✅ Eliminar ítem
export async function deleteCotizacionProveedorItem(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    })
    return res.ok
  } catch (error) {
    console.error('❌ deleteCotizacionProveedorItem:', error)
    return false
  }
}
