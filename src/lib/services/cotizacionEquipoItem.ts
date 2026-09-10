import type { CotizacionEquipoItem } from '@/types'
import type { CotizacionEquipoItemUpdatePayload, PaginationMeta } from '@/types/payloads'
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
    // 📡 Obtener datos del catálogo de equipos
    const equipoRes = await fetch(buildApiUrl(`/api/catalogo-equipo/${data.catalogoEquipoId}`))
    if (!equipoRes.ok) {
      throw new Error('Error al obtener datos del equipo del catálogo')
    }
    const equipo = await equipoRes.json()

    // 🔁 Transformar datos al formato requerido por la API
    const precioLista = equipo.precioLista ? Number(equipo.precioLista) : undefined
    const precioInterno = Number(equipo.precioInterno) || 0
    const factorCosto = Number(equipo.factorCosto) || 1.00
    const factorVenta = Number(equipo.factorVenta) || 1.15
    const precioCliente = Number(data.precioUnitario) || 0
    const cantidad = Number(data.cantidad) || 1
    // Precio gerencia: usa el precio especial del catálogo si existe, si no cae a precioInterno.
    // precioGerenciaEditado = false porque viene del catálogo, no fue editado manualmente en la cotización.
    const precioGerencia = equipo.precioGerencia != null
      ? Number(equipo.precioGerencia)
      : precioInterno

    const itemPayload = {
      cotizacionEquipoId: data.cotizacionEquipoId,
      catalogoEquipoId: data.catalogoEquipoId,
      codigo: equipo.codigo,
      descripcion: equipo.descripcion,
      categoria: equipo.categoria?.nombre || equipo.categoria || 'Sin categoría',
      unidad: equipo.unidad?.nombre || equipo.unidad || 'Unidad',
      marca: equipo.marca || 'Sin marca',
      precioLista,
      precioInterno,
      factorCosto,
      factorVenta,
      precioCliente,
      cantidad,
      costoInterno: +(precioInterno * cantidad).toFixed(2),
      costoCliente: +(precioCliente * cantidad).toFixed(2),
      precioGerencia,
      precioGerenciaEditado: false,
    }

    // 🐛 Debug: Log payload para debugging
    console.log('📡 Payload enviado a API:', JSON.stringify(itemPayload, null, 2))
    console.log('📡 Datos del equipo obtenidos:', JSON.stringify(equipo, null, 2))

    // 📡 Crear el item en la API
    const res = await fetch(buildApiUrl('/api/cotizacion-equipo-item'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(itemPayload),
    })
    
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      console.error('❌ Error response from API:', errorData)
      throw new Error(errorData.details || errorData.error || 'Error al crear item de cotización de equipo')
    }
    
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

// ✅ Reordenar ítems de equipo
export async function reordenarCotizacionEquipoItems(items: { id: string; orden: number }[]): Promise<void> {
  const res = await fetch('/api/cotizacion-equipo-item/reordenar', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  if (!res.ok) throw new Error('Error al reordenar ítems de equipo')
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

// ===================================================
// Búsqueda de ítems a través de todas las cotizaciones
// ===================================================

export interface CotizacionEquipoItemBusqueda {
  id: string
  codigo: string
  descripcion: string
  categoria: string
  marca: string
  unidad: string
  cantidad: number
  precioCliente: number
  costoCliente: number
  costoInterno: number
  catalogoEquipoId: string | null
  createdAt: string
  cotizacionEquipo: {
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

export interface BuscarCotizacionEquipoItemsParams {
  page?: number
  limit?: number
  search?: string
  cotizacionId?: string
  estado?: string
  soloCatalogo?: boolean
}

export interface BuscarCotizacionEquipoItemsResult {
  data: CotizacionEquipoItemBusqueda[]
  pagination: PaginationMeta
}

// ✅ Buscar ítems de equipo cotizados en todas las cotizaciones (paginado)
export async function buscarCotizacionEquipoItems(
  params: BuscarCotizacionEquipoItemsParams = {}
): Promise<BuscarCotizacionEquipoItemsResult> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', params.page.toString())
  if (params.limit) query.set('limit', params.limit.toString())
  if (params.search) query.set('search', params.search)
  if (params.cotizacionId) query.set('cotizacionId', params.cotizacionId)
  if (params.estado && params.estado !== 'all') query.set('estado', params.estado)
  if (params.soloCatalogo) query.set('soloCatalogo', 'true')

  const res = await fetch(`${buildApiUrl('/api/cotizacion-equipo-item')}?${query.toString()}`, {
    cache: 'no-store',
    credentials: 'include',
  })

  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('No autorizado')
  }
  if (!res.ok) throw new Error('Error al buscar ítems de equipo')

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

// ✅ Ítems de equipo cotizados vinculados al catálogo, sin paginar (para consolidar en el cliente)
export async function obtenerCotizacionEquipoItemsConsolidado(
  params: { estado?: string } = {}
): Promise<CotizacionEquipoItemBusqueda[]> {
  const query = new URLSearchParams()
  if (params.estado && params.estado !== 'all') query.set('estado', params.estado)

  const res = await fetch(`${buildApiUrl('/api/cotizacion-equipo-item/consolidado')}?${query.toString()}`, {
    cache: 'no-store',
    credentials: 'include',
  })

  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('No autorizado')
  }
  if (!res.ok) throw new Error('Error al obtener el consolidado de equipos cotizados')

  return res.json()
}
