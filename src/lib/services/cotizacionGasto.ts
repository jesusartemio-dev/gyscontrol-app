// ===================================================
// 📁 Archivo: cotizacionGasto.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Funciones para manejar CotizacionGasto desde el cliente
//
// 🧠 Uso: Usado en páginas y componentes que gestionan secciones de gasto
// ✍️ Autor: Jesús Artemio (mejorado por GYS AI Assistant 🧙‍♂️)
// 📅 Última actualización: 2025-06-03
// ===================================================

import type {
  CotizacionGasto,
  CotizacionGastoPayload,
  CotizacionGastoUpdatePayload,
} from '@/types'

const BASE_URL = '/api/cotizacion-gasto'

// ✅ Obtener todas las secciones de gasto
export async function getCotizacionGastos(): Promise<CotizacionGasto[]> {
  try {
    const res = await fetch(BASE_URL)
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error || 'Error al obtener secciones de gasto')
    }
    return await res.json()
  } catch (error) {
    console.error('❌ Error getCotizacionGastos:', error)
    return []
  }
}

// ✅ Obtener secciones filtradas por cotización
export async function getCotizacionGastosByCotizacion(cotizacionId: string): Promise<CotizacionGasto[]> {
  try {
    const res = await fetch(`${BASE_URL}?cotizacionId=${cotizacionId}`)
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error || 'Error al obtener gastos por cotización')
    }
    return await res.json()
  } catch (error) {
    console.error('❌ Error getCotizacionGastosByCotizacion:', error)
    return []
  }
}

// ✅ Obtener sección por ID
export async function getCotizacionGastoById(id: string): Promise<CotizacionGasto | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error || 'Error al obtener sección de gasto por ID')
    }
    return await res.json()
  } catch (error) {
    console.error('❌ Error getCotizacionGastoById:', error)
    return null
  }
}

// ✅ Crear sección
export async function createCotizacionGasto(payload: CotizacionGastoPayload): Promise<CotizacionGasto | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error || 'Error al crear sección de gasto')
    }
    return await res.json()
  } catch (error) {
    console.error('❌ Error createCotizacionGasto:', error)
    return null
  }
}

// ✅ Actualizar sección
export async function updateCotizacionGasto(id: string, payload: CotizacionGastoUpdatePayload): Promise<CotizacionGasto | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error || 'Error al actualizar sección de gasto')
    }
    return await res.json()
  } catch (error) {
    console.error('❌ Error updateCotizacionGasto:', error)
    return null
  }
}

// ✅ Eliminar sección
export async function deleteCotizacionGasto(id: string): Promise<{ status: string; deletedId: string } | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) {
      const { error } = await res.json()
      throw new Error(error || 'Error al eliminar sección de gasto')
    }
    return await res.json()
  } catch (error) {
    console.error('❌ Error deleteCotizacionGasto:', error)
    return null
  }
}
