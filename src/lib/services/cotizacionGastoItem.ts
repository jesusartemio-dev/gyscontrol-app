// ===================================================
// 📁 Archivo: cotizacionGastoItem.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Funciones para manejar ítems de gasto dentro de CotizacionGasto
//
// 🧠 Uso: Usado en páginas y componentes que gestionan ítems de gasto de cotización
// ✍️ Autor: Jesús Artemio (mejorado por GYS AI Assistant 🧙‍♂️)
// 📅 Última actualización: 2025-06-03
// ===================================================

import type {
  CotizacionGastoItem,
  CotizacionGastoItemPayload,
  CotizacionGastoItemUpdatePayload,
} from '@/types'

const BASE_URL = '/api/cotizacion-gasto-item'

/**
 * ✅ Obtener todos los ítems de gasto (filtrado opcional por gastoId)
 */
export async function getCotizacionGastoItems(gastoId?: string): Promise<CotizacionGastoItem[]> {
  try {
    const url = gastoId ? `${BASE_URL}?gastoId=${gastoId}` : BASE_URL
    const res = await fetch(url)
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error || 'Error al obtener ítems de gasto')
    }
    return await res.json()
  } catch (error) {
    console.error('❌ Error getCotizacionGastoItems:', error)
    return []
  }
}

/**
 * ✅ Obtener ítem de gasto por ID
 */
export async function getCotizacionGastoItemById(id: string): Promise<CotizacionGastoItem | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error || 'Error al obtener ítem de gasto por ID')
    }
    return await res.json()
  } catch (error) {
    console.error('❌ Error getCotizacionGastoItemById:', error)
    return null
  }
}

/**
 * ✅ Crear ítem de gasto
 */
export async function createCotizacionGastoItem(
  payload: CotizacionGastoItemPayload
): Promise<CotizacionGastoItem | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error || 'Error al crear ítem de gasto')
    }
    return await res.json()
  } catch (error) {
    console.error('❌ Error createCotizacionGastoItem:', error)
    return null
  }
}

/**
 * ✅ Actualizar ítem de gasto
 */
export async function updateCotizacionGastoItem(
  id: string,
  payload: CotizacionGastoItemUpdatePayload
): Promise<CotizacionGastoItem | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error || 'Error al actualizar ítem de gasto')
    }
    return await res.json()
  } catch (error) {
    console.error('❌ Error updateCotizacionGastoItem:', error)
    return null
  }
}

/**
 * ✅ Eliminar ítem de gasto
 */
export async function deleteCotizacionGastoItem(
  id: string
): Promise<{ status: string; deletedId: string } | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error || 'Error al eliminar ítem de gasto')
    }
    return await res.json()
  } catch (error) {
    console.error('❌ Error deleteCotizacionGastoItem:', error)
    return null
  }
}
