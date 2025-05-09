// ===================================================
// 📁 Archivo: cotizacionEquipoItem.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Servicio CRUD para CotizacionEquipoItem (Frontend)
// ✨ Métodos:
// - createCotizacionEquipoItem()
// - updateCotizacionEquipoItem()
// - deleteCotizacionEquipoItem()
// 🧠 Usa tipos desde: src/types
// ===================================================

'use client'

import type {
  CotizacionEquipoItem,
  CotizacionEquipoItemPayload,
  CotizacionEquipoItemUpdatePayload
} from '@/types'

// ✅ Crear nuevo ítem de equipo
export async function createCotizacionEquipoItem(
  data: CotizacionEquipoItemPayload
): Promise<CotizacionEquipoItem> {
  try {
    const res = await fetch('/api/cotizacion-equipo-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al agregar ítem de equipo')
    return await res.json()
  } catch (error) {
    console.error('❌ createCotizacionEquipoItem:', error)
    throw error
  }
}

// ✅ Actualizar ítem de equipo
export async function updateCotizacionEquipoItem(
  id: string,
  data: CotizacionEquipoItemUpdatePayload
): Promise<CotizacionEquipoItem> {
  try {
    const res = await fetch(`/api/cotizacion-equipo-item/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al actualizar ítem de equipo')
    return await res.json()
  } catch (error) {
    console.error('❌ updateCotizacionEquipoItem:', error)
    throw error
  }
}

// ✅ Eliminar ítem de equipo
export async function deleteCotizacionEquipoItem(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/cotizacion-equipo-item/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Error al eliminar ítem de equipo')
  } catch (error) {
    console.error('❌ deleteCotizacionEquipoItem:', error)
    throw error
  }
}
