import type { CotizacionEquipo } from '@/types'
import { buildApiUrl } from '@/lib/utils'

// ===================================================
// 📁 Archivo: src/lib/services/cotizacionEquipo.ts
// 📌 Descripción: Servicios para gestionar cotizaciones de equipo
// 🧠 Uso: CRUD completo para cotizaciones de equipo
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-25
// ===================================================

export async function getCotizacionEquipoById(id: string): Promise<CotizacionEquipo> {
  try {
    const res = await fetch(`/api/cotizacion-equipo/${id}`)
    if (!res.ok) throw new Error('Error al obtener sección de equipos')
    return await res.json()
  } catch (error) {
    console.error('❌ getCotizacionEquipoById:', error)
    throw error
  }
}

// ✅ Crear nueva cotización de equipo
export async function createCotizacionEquipo(data: {
  cotizacionId: string
  equipoId: string
  cantidad: number
  precioUnitario: number
  observaciones?: string
}): Promise<CotizacionEquipo> {
  try {
    const res = await fetch(buildApiUrl('/api/cotizacion-equipo'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al crear cotización de equipo')
    return await res.json()
  } catch (error) {
    console.error('Error en createCotizacionEquipo:', error)
    throw error
  }
}

export async function updateCotizacionEquipo(id: string, data: Partial<CotizacionEquipo>): Promise<CotizacionEquipo> {
  try {
    const res = await fetch(`/api/cotizacion-equipo/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) throw new Error('Error al actualizar sección de equipos')
    return await res.json()
  } catch (error) {
    console.error('❌ updateCotizacionEquipo:', error)
    throw error
  }
}

export async function deleteCotizacionEquipo(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/cotizacion-equipo/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Error al eliminar sección de equipos')
  } catch (error) {
    console.error('❌ deleteCotizacionEquipo:', error)
    throw error
  }
}

export async function updateCotizacionEquipoSubtotales(id: string, data: {
  subtotalCliente: number
  subtotalInterno: number
}) {
  const res = await fetch(`/api/cotizacion-equipo/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  })
  if (!res.ok) throw new Error('Error al actualizar subtotales de equipo')
  return await res.json()
}
