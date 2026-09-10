// ===================================================
// 📁 Archivo: cotizacionServicioItem.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Servicio Fetch para CotizacionServicioItem
//
// 🧠 Uso: Operaciones CRUD de los ítems de servicio en una cotización
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-04-23
// ===================================================

'use client'

import {
  CotizacionServicioItem,
  CotizacionServicioItemPayload,
  CotizacionServicioItemUpdatePayload
} from '@/types'
import type { PaginationMeta } from '@/types/payloads'

const BASE_URL = '/api/cotizacion-servicio-item'

// ✅ Crear nuevo ítem de servicio
export async function createCotizacionServicioItem(
  payload: CotizacionServicioItemPayload
): Promise<CotizacionServicioItem> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Error al crear ítem de servicio (cotización)')
  return res.json()
}

// ✅ Actualizar ítem de servicio
export async function updateCotizacionServicioItem(
  id: string,
  payload: CotizacionServicioItemUpdatePayload
): Promise<CotizacionServicioItem> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  if (!res.ok) throw new Error('Error al actualizar ítem de servicio (cotización)')
  return res.json()
}

// ✅ Eliminar ítem de servicio
export async function deleteCotizacionServicioItem(id: string): Promise<void> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE'
  })
  if (!res.ok) throw new Error('Error al eliminar ítem de servicio (cotización)')
}

// ===================================================
// Búsqueda de ítems a través de todas las cotizaciones
// ===================================================

export interface CotizacionServicioItemBusqueda {
  id: string
  nombre: string
  descripcion: string
  recursoNombre: string
  unidadServicioNombre: string
  cantidad: number
  horaTotal: number
  costoHora: number
  costoInterno: number
  costoCliente: number
  catalogoServicioId: string | null
  createdAt: string
  cotizacionServicio: {
    id: string
    nombre: string
    cotizacion: {
      id: string
      codigo: string
      nombre: string
      estado: string
      cliente: { id: string; nombre: string } | null
    }
  }
}

export interface BuscarCotizacionServicioItemsParams {
  page?: number
  limit?: number
  search?: string
  cotizacionId?: string
  estado?: string
  soloCatalogo?: boolean
}

export interface BuscarCotizacionServicioItemsResult {
  data: CotizacionServicioItemBusqueda[]
  pagination: PaginationMeta
}

// ✅ Buscar ítems de servicio cotizados en todas las cotizaciones (paginado)
export async function buscarCotizacionServicioItems(
  params: BuscarCotizacionServicioItemsParams = {}
): Promise<BuscarCotizacionServicioItemsResult> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', params.page.toString())
  if (params.limit) query.set('limit', params.limit.toString())
  if (params.search) query.set('search', params.search)
  if (params.cotizacionId) query.set('cotizacionId', params.cotizacionId)
  if (params.estado && params.estado !== 'all') query.set('estado', params.estado)
  if (params.soloCatalogo) query.set('soloCatalogo', 'true')

  const res = await fetch(`${BASE_URL}?${query.toString()}`, {
    cache: 'no-store',
    credentials: 'include',
  })

  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('No autorizado')
  }
  if (!res.ok) throw new Error('Error al buscar ítems de servicio')

  const result = await res.json()
  const apiPagination = result.pagination || {}
  const pagination: PaginationMeta = {
    page: apiPagination.page || 1,
    limit: apiPagination.limit || 25,
    total: apiPagination.total || 0,
    totalPages: apiPagination.totalPages || 1,
    hasNextPage: apiPagination.hasNext ?? false,
    hasPrevPage: apiPagination.hasPrev ?? false,
  }

  return { data: result.data || [], pagination }
}

// ✅ Ítems de servicio cotizados vinculados al catálogo, sin paginar (para consolidar en el cliente)
export async function obtenerCotizacionServicioItemsConsolidado(
  params: { estado?: string } = {}
): Promise<CotizacionServicioItemBusqueda[]> {
  const query = new URLSearchParams()
  if (params.estado && params.estado !== 'all') query.set('estado', params.estado)

  const res = await fetch(`${BASE_URL}/consolidado?${query.toString()}`, {
    cache: 'no-store',
    credentials: 'include',
  })

  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('No autorizado')
  }
  if (!res.ok) throw new Error('Error al obtener el consolidado de servicios cotizados')

  return res.json()
}
