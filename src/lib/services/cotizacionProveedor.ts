// ===================================================
// 📁 Archivo: cotizacionProveedor.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Funciones para consumir API de cotizaciones de proveedores
//
// 🧠 Uso: Se utiliza en vistas de logística para registrar y consultar cotizaciones.
// ✍️ Autor: Jesús Artemio (GYS)
// 📅 Última actualización: 2025-05-26
// ===================================================

import {
  CotizacionProveedor,
  CotizacionProveedorPayload,
  CotizacionProveedorUpdatePayload,
  CotizacionProveedorItemPayload,
} from '@/types'
import { buildApiUrl } from '@/lib/utils'

const BASE_URL = '/api/cotizacion-proveedor'

// ✅ Obtener todas las cotizaciones
export async function getCotizacionesProveedor(): Promise<CotizacionProveedor[] | null> {
  try {
    const res = await fetch(BASE_URL)
    if (!res.ok) throw new Error('Error al obtener cotizaciones')
    return await res.json()
  } catch (error) {
    console.error('❌ getCotizacionesProveedor:', error)
    return null
  }
}

// ✅ Obtener una cotización por ID
export async function getCotizacionProveedorById(id: string): Promise<CotizacionProveedor | null> {
  try {
    const url = buildApiUrl(`${BASE_URL}/${id}`)
    const res = await fetch(url)
    if (!res.ok) throw new Error('Error al obtener la cotización')
    return await res.json()
  } catch (error) {
    console.error('❌ getCotizacionProveedorById:', error)
    return null
  }
}

// ✅ Crear nueva cotización
export async function createCotizacionProveedor(
  payload: CotizacionProveedorPayload
): Promise<CotizacionProveedor | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al crear cotización')
    return await res.json()
  } catch (error) {
    console.error('❌ createCotizacionProveedor:', error)
    return null
  }
}

// ✅ Crear ítem para cotización proveedor (nuevo)
export async function createCotizacionProveedorItem(
  payload: CotizacionProveedorItemPayload
): Promise<boolean> {
  try {
    const url = buildApiUrl(`${BASE_URL}/item`)
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    return res.ok
  } catch (error) {
    console.error('❌ createCotizacionProveedorItem:', error)
    return false
  }
}

// ✅ Actualizar cotización
export async function updateCotizacionProveedor(
  id: string,
  payload: CotizacionProveedorUpdatePayload
): Promise<CotizacionProveedor | null> {
  try {
    const url = buildApiUrl(`${BASE_URL}/${id}`)
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al actualizar cotización')
    return await res.json()
  } catch (error) {
    console.error('❌ updateCotizacionProveedor:', error)
    return null
  }
}

// ✅ Eliminar cotización
export async function deleteCotizacionProveedor(id: string): Promise<boolean> {
  try {
    const url = buildApiUrl(`${BASE_URL}/${id}`)
    const res = await fetch(url, {
      method: 'DELETE',
    })
    return res.ok
  } catch (error) {
    console.error('❌ deleteCotizacionProveedor:', error)
    return false
  }
}
