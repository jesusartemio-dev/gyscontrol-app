// ===================================================
// 📁 Archivo: cotizacionGasto.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Funciones para manejar CotizacionGasto desde el cliente
//
// 🧠 Uso: Usado en páginas y componentes que gestionan secciones de gasto
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-05-06
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
      if (!res.ok) throw new Error('Error al obtener secciones de gasto')
      return await res.json()
    } catch (error) {
      console.error(error)
      return []
    }
  }
  
  // ✅ Obtener sección por ID
  export async function getCotizacionGastoById(id: string): Promise<CotizacionGasto | null> {
    try {
      const res = await fetch(`${BASE_URL}/${id}`)
      if (!res.ok) throw new Error('Error al obtener sección de gasto por ID')
      return await res.json()
    } catch (error) {
      console.error(error)
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
      if (!res.ok) throw new Error('Error al crear sección de gasto')
      return await res.json()
    } catch (error) {
      console.error(error)
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
      if (!res.ok) throw new Error('Error al actualizar sección de gasto')
      return await res.json()
    } catch (error) {
      console.error(error)
      return null
    }
  }
  
  // ✅ Eliminar sección
  export async function deleteCotizacionGasto(id: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE_URL}/${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Error al eliminar sección de gasto')
      return true
    } catch (error) {
      console.error(error)
      return false
    }
  }
  