// ===================================================
// 📁 Archivo: cotizacionProveedor.ts
// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para cotizaciones por proveedor
//
// 🧠 Uso: Llamadas a la API REST para gestionar CotizacionProveedor
// ===================================================

import { CotizacionProveedor, CotizacionProveedorPayload } from '@/types'

const BASE_URL = '/api/cotizacion-proveedor'

// ✅ Nueva versión que permite pasar un proyectoId como filtro
export async function getCotizacionesProveedor(proyectoId?: string): Promise<CotizacionProveedor[]> {
  try {
    const url = proyectoId ? `${BASE_URL}?proyectoId=${proyectoId}` : BASE_URL
    const res = await fetch(url)
    if (!res.ok) throw new Error('Error al obtener cotizaciones de proveedor')
    return res.json()
  } catch (error) {
    console.error('getCotizacionesProveedor:', error)
    return []
  }
}

export async function getCotizacionProveedorById(id: string): Promise<CotizacionProveedor | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) throw new Error('Error al obtener cotización de proveedor')
    return res.json()
  } catch (error) {
    console.error('getCotizacionProveedorById:', error)
    return null
  }
}

export async function createCotizacionProveedor(payload: CotizacionProveedorPayload): Promise<CotizacionProveedor | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al crear cotización de proveedor')
    return res.json()
  } catch (error) {
    console.error('createCotizacionProveedor:', error)
    return null
  }
}

export async function updateCotizacionProveedor(id: string, payload: Partial<CotizacionProveedorPayload>): Promise<CotizacionProveedor | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al actualizar cotización de proveedor')
    return res.json()
  } catch (error) {
    console.error('updateCotizacionProveedor:', error)
    return null
  }
}

export async function deleteCotizacionProveedor(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
    return res.ok
  } catch (error) {
    console.error('deleteCotizacionProveedor:', error)
    return false
  }
}
