// ===================================================
// 📁 Archivo: cotizacionServicio.ts
// 📌 Ubicación: src/lib/services/cotizacionServicio.ts
// 🔧 Descripción: Funciones para manejar CotizacionServicio desde el cliente
//
// 🧠 Uso: Consumido por formularios, listas y componentes relacionados a secciones de servicios
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-04-23
// ===================================================

import type { CotizacionServicio, CotizacionServicioPayload, CotizacionServicioUpdatePayload } from '@/types'

const BASE_URL = '/api/cotizacion-servicio'

// ✅ Obtener todos los servicios de cotización (opcionalmente filtrado por cotizacionId)
export async function getCotizacionServicios(cotizacionId?: string): Promise<CotizacionServicio[]> {
  const url = cotizacionId ? `${BASE_URL}?cotizacionId=${cotizacionId}` : BASE_URL
  const res = await fetch(url)
  if (!res.ok) throw new Error('Error al obtener servicios de cotización')
  return res.json()
}

// ✅ Obtener uno por ID (si lo necesitas)
export async function getCotizacionServicioById(id: string): Promise<CotizacionServicio> {
  const res = await fetch(`${BASE_URL}/${id}`)
  if (!res.ok) throw new Error('Error al obtener sección de servicio de cotización por ID')
  return res.json()
}

// ✅ Crear nueva sección de servicios
export async function createCotizacionServicio(payload: CotizacionServicioPayload): Promise<CotizacionServicio> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Error al crear sección de servicios (cotización)')
  return res.json()
}

// ✅ Actualizar sección
export async function updateCotizacionServicio(id: string, payload: CotizacionServicioUpdatePayload): Promise<CotizacionServicio> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Error al actualizar sección de servicios (cotización)')
  return res.json()
}

// ✅ Eliminar sección
export async function deleteCotizacionServicio(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Error al eliminar sección de servicios (cotización)')
}
