// ===================================================
// 📁 Archivo: cotizacionGastoItem.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Funciones para manejar ítems de gasto dentro de CotizacionGasto
//
// 🧠 Uso: Usado en páginas y componentes que gestionan ítems de gasto de cotización
// ✍️ Autor: GYS AI Assistant
// 📅 Última actualización: 2025-05-06
// ===================================================

import type {
    CotizacionGastoItem,
    CotizacionGastoItemPayload,
    CotizacionGastoItemUpdatePayload,
  } from '@/types'
  
  const BASE_URL = '/api/cotizacion-gasto-item'
  
  // ✅ Obtener todos los ítems de gasto
  export async function getCotizacionGastoItems(): Promise<CotizacionGastoItem[]> {
    try {
      const res = await fetch(BASE_URL)
      if (!res.ok) throw new Error('Error al obtener ítems de gasto')
      return await res.json()
    } catch (error) {
      console.error(error)
      return []
    }
  }
  
  // ✅ Obtener ítem por ID
  export async function getCotizacionGastoItemById(id: string): Promise<CotizacionGastoItem | null> {
    try {
      const res = await fetch(`${BASE_URL}/${id}`)
      if (!res.ok) throw new Error('Error al obtener ítem de gasto por ID')
      return await res.json()
    } catch (error) {
      console.error(error)
      return null
    }
  }
  
  // ✅ Crear ítem
  export async function createCotizacionGastoItem(payload: CotizacionGastoItemPayload): Promise<CotizacionGastoItem | null> {
    try {
      const res = await fetch(BASE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Error al crear ítem de gasto')
      return await res.json()
    } catch (error) {
      console.error(error)
      return null
    }
  }
  
  // ✅ Actualizar ítem
  export async function updateCotizacionGastoItem(id: string, payload: CotizacionGastoItemUpdatePayload): Promise<CotizacionGastoItem | null> {
    try {
      const res = await fetch(`${BASE_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Error al actualizar ítem de gasto')
      return await res.json()
    } catch (error) {
      console.error(error)
      return null
    }
  }
  
  // ✅ Eliminar ítem
  export async function deleteCotizacionGastoItem(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Error al eliminar ítem de gasto')
      return true
    } catch (error) {
      console.error(error)
      return false
    }
  }
  