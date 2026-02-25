import type { Cotizacion } from '@/types'
import type { PaginationMeta } from '@/types/payloads'
import { buildApiUrl } from '@/lib/utils'

// Parámetros para consulta paginada de cotizaciones
export interface CotizacionesParams {
  page?: number
  limit?: number
  search?: string
  estado?: string
  anio?: string
}

// Resultado paginado de cotizaciones
export interface CotizacionesPaginatedResult {
  data: Cotizacion[]
  pagination: PaginationMeta
}

// Obtener cotizaciones con paginación server-side
export async function getCotizacionesPaginated(
  params: CotizacionesParams = {}
): Promise<CotizacionesPaginatedResult> {
  try {
    const query = new URLSearchParams()
    if (params.page) query.set('page', params.page.toString())
    if (params.limit) query.set('limit', params.limit.toString())
    if (params.search) query.set('search', params.search)
    if (params.estado && params.estado !== 'all') query.set('estado', params.estado)
    if (params.anio && params.anio !== 'todos') query.set('anio', params.anio)

    const url = `${buildApiUrl('/api/cotizacion')}?${query.toString()}`
    const res = await fetch(url, {
      cache: 'no-store',
      credentials: 'include'
    })

    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      throw new Error('No autorizado')
    }

    if (!res.ok) throw new Error('Error al obtener cotizaciones')
    const result = await res.json()

    // Mapear campos de paginación: API usa hasNext/hasPrev → PaginationMeta usa hasNextPage/hasPrevPage
    const apiPagination = result.pagination || {}
    const pagination: PaginationMeta = {
      page: apiPagination.page || 1,
      limit: apiPagination.limit || 20,
      total: apiPagination.total || 0,
      totalPages: apiPagination.totalPages || 1,
      hasNextPage: apiPagination.hasNext ?? false,
      hasPrevPage: apiPagination.hasPrev ?? false,
    }

    return { data: result.data || [], pagination }
  } catch (error) {
    console.error('❌ getCotizacionesPaginated error:', error)
    throw error
  }
}

// Obtener todas las cotizaciones (legacy, sin paginación explícita)
export async function getCotizaciones(): Promise<Cotizacion[]> {
  try {
    const res = await fetch(buildApiUrl('/api/cotizacion'), {
      cache: 'no-store',
      credentials: 'include'
    })

    if (res.status === 401) {
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      throw new Error('No autorizado')
    }

    if (!res.ok) throw new Error('Error al obtener cotizaciones')
    const result = await res.json()
    return result.data || result
  } catch (error) {
    console.error('❌ getCotizaciones error:', error)
    throw error
  }
}

// Obtener cotización por ID
export async function getCotizacionById(id: string): Promise<Cotizacion> {
  try {
    const res = await fetch(buildApiUrl(`/api/cotizacion/${id}`), { 
      cache: 'no-store',
      credentials: 'include' // ✅ Incluir cookies de sesión
    })
    if (!res.ok) throw new Error('Error al obtener cotización por ID')
    return await res.json()
  } catch (error) {
    console.error('❌ Error en getCotizacionById:', error)
    throw error
  }
}

// Crear cotización desde plantilla con clienteId
export async function createCotizacionFromPlantilla(data: {
  plantillaId: string
  clienteId: string
  fecha?: string
}): Promise<Cotizacion> {
  try {
    console.log('🚀 Enviando datos al backend:', data)

    const response = await fetch(buildApiUrl('/api/cotizacion/from-plantilla'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // ✅ Incluir cookies de sesión para autenticación
      body: JSON.stringify(data),
    })

    const responseText = await response.text()

    if (!response.ok) {
      console.error('❌ Error en respuesta del backend:', responseText)
      throw new Error(`Error al crear cotización desde plantilla: ${responseText}`)
    }

    return JSON.parse(responseText)
  } catch (error) {
    console.error('❌ createCotizacionFromPlantilla:', error)
    throw error
  }
}

// Crear cotización manual
export async function createCotizacion(data: {
  clienteId: string
  comercialId: string
  nombre: string
  fecha?: string
}): Promise<Cotizacion> {
  try {
    const res = await fetch(buildApiUrl('/api/cotizacion'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // ✅ Incluir cookies de sesión
      body: JSON.stringify(data),
    })

    if (!res.ok) {
      // Try to get error message from response
      let errorMessage = 'Error al crear cotización'
      try {
        const errorData = await res.json()
        errorMessage = errorData.error || errorMessage
      } catch {
        // If we can't parse JSON, use default message
      }
      throw new Error(errorMessage)
    }

    return await res.json()
  } catch (error) {
    console.error('❌ createCotizacion:', error)
    throw error
  }
}

// ✅ Actualizar parcial de cotización
export async function updateCotizacion(
  id: string,
  data: Partial<Cotizacion>
): Promise<Cotizacion> {
  try {
    const res = await fetch(buildApiUrl(`/api/cotizacion/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // ✅ Incluir cookies de sesión
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.error || 'Error al actualizar cotización')
    }
    return await res.json()
  } catch (error) {
    console.error('❌ updateCotizacion:', error)
    throw error
  }
}

// Eliminar cotización
export async function deleteCotizacion(id: string): Promise<void> {
  try {
    const res = await fetch(buildApiUrl(`/api/cotizacion/${id}`), {
      method: 'DELETE',
      credentials: 'include', // ✅ Incluir cookies de sesión
    })
    if (!res.ok) throw new Error('Error al eliminar cotización')
  } catch (error) {
    console.error('❌ deleteCotizacion:', error)
    throw error
  }
}

// Acciones de descuento (proponer, aprobar, rechazar, eliminar)
export async function descuentoAction(
  cotizacionId: string,
  data: { action: string; porcentaje?: number; monto?: number; motivo?: string; comentario?: string }
) {
  try {
    const res = await fetch(buildApiUrl(`/api/cotizacion/${cotizacionId}/descuento`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error || 'Error en acción de descuento')
    }
    return res.json()
  } catch (error) {
    console.error('descuentoAction:', error)
    throw error
  }
}

// Recalcular cotización
export async function recalcularCotizacionDesdeAPI(id: string) {
  try {
    const res = await fetch(buildApiUrl(`/api/cotizacion/${id}/recalcular`), { 
      method: 'POST',
      credentials: 'include' // ✅ Incluir cookies de sesión
    })
    if (!res.ok) throw new Error('Error al recalcular totales de cotización desde API')
    return await res.json()
  } catch (error) {
    console.error('❌ Error en recalcularCotizacionDesdeAPI:', error)
    throw error
  }
}
