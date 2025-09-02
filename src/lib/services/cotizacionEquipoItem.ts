import type { CotizacionEquipoItem } from '@/types'
import type { CotizacionEquipoItemUpdatePayload } from '@/types/payloads'
import { buildApiUrl } from '@/lib/utils'

// ===================================================
// 📁 Archivo: src/lib/services/cotizacionEquipoItem.ts
// 📌 Descripción: Servicios para gestionar items de cotización de equipo
// 🧠 Uso: CRUD completo para items de cotización de equipo
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-25
// ===================================================

// ✅ Crear nuevo item de cotización de equipo
export async function createCotizacionEquipoItem(data: {
  cotizacionEquipoId: string
  catalogoEquipoId: string
  cantidad: number
  precioUnitario: number
  observaciones?: string
}): Promise<CotizacionEquipoItem> {
  try {
    const res = await fetch(buildApiUrl('/api/cotizacion-equipo-item'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al crear item de cotización de equipo')
    return await res.json()
  } catch (error) {
    console.error('Error en createCotizacionEquipoItem:', error)
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
