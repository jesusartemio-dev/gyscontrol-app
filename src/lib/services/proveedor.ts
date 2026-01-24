// ===================================================
// 📁 Archivo: proveedor.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Servicios para gestión de proveedores
//
// 🧠 Uso: CRUD de proveedores desde UI logística
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-21
// ===================================================

import { Proveedor, ProveedorPayload, ProveedorUpdatePayload } from '@/types'

const BASE_URL = '/api/proveedores'

export async function getProveedores(): Promise<Proveedor[]> {
  try {
    const res = await fetch(BASE_URL)
    if (!res.ok) {
      console.error('❌ Error HTTP al obtener proveedores:', res.status, res.statusText)
      throw new Error('Error al obtener proveedores')
    }
    const response = await res.json()
    console.log('📦 Respuesta de proveedores:', response)
    if (!response.ok) throw new Error(response.error)
    return response.data || []
  } catch (error) {
    console.error('❌ Error en getProveedores:', error)
    return []
  }
}

export async function createProveedor(payload: ProveedorPayload): Promise<Proveedor | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al crear proveedor')
    return await res.json()
  } catch {
    return null
  }
}

export async function updateProveedor(id: string, payload: ProveedorUpdatePayload): Promise<Proveedor | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al actualizar proveedor')
    return await res.json()
  } catch {
    return null
  }
}

export async function deleteProveedor(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Error al eliminar proveedor')
    return true
  } catch {
    return false
  }
}

// ===================================================
// 🔄 Alias para compatibilidad
// ===================================================

/**
 * Alias para getProveedores (compatibilidad con imports en español)
 */
export const obtenerProveedores = getProveedores
