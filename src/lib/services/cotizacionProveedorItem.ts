// ===================================================
// 📁 Archivo: cotizacionProveedorItem.ts
// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para los ítems de cotización por proveedor
//
// 🧠 Uso: Llamadas a la API REST para gestionar CotizacionProveedorItem
// ===================================================

import {
  CotizacionProveedorItem,
  CotizacionProveedorItemPayload
} from '@/types'

const BASE_URL = '/api/cotizacion-proveedor-item'

export async function getCotizacionProveedorItems(): Promise<CotizacionProveedorItem[]> {
  try {
    const res = await fetch(BASE_URL)
    if (!res.ok) throw new Error('Error al obtener ítems de cotización por proveedor')
    return res.json()
  } catch (error) {
    console.error('getCotizacionProveedorItems:', error)
    return []
  }
}

export async function getCotizacionProveedorItemById(id: string): Promise<CotizacionProveedorItem | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) throw new Error('Error al obtener ítem de cotización por proveedor')
    return res.json()
  } catch (error) {
    console.error('getCotizacionProveedorItemById:', error)
    return null
  }
}

export async function createCotizacionProveedorItem(payload: CotizacionProveedorItemPayload): Promise<CotizacionProveedorItem | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al crear ítem de cotización por proveedor')
    return res.json()
  } catch (error) {
    console.error('createCotizacionProveedorItem:', error)
    return null
  }
}

export async function updateCotizacionProveedorItem(id: string, payload: Partial<CotizacionProveedorItemPayload>): Promise<CotizacionProveedorItem | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al actualizar ítem de cotización por proveedor')
    return res.json()
  } catch (error) {
    console.error('updateCotizacionProveedorItem:', error)
    return null
  }
}

export async function deleteCotizacionProveedorItem(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    })
    return res.ok
  } catch (error) {
    console.error('deleteCotizacionProveedorItem:', error)
    return false
  }
}
