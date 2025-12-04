import type { Cotizacion } from '@/types'
import { buildApiUrl } from '@/lib/utils'

// Obtener todas las cotizaciones
export async function getCotizaciones(): Promise<Cotizacion[]> {
  try {
    const res = await fetch(buildApiUrl('/api/cotizacion'), {
      cache: 'no-store',
      credentials: 'include' // ✅ Incluir cookies de sesión
    })

    if (res.status === 401) {
      // Redirigir al login si no está autorizado
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      throw new Error('No autorizado')
    }

    if (!res.ok) throw new Error('Error al obtener cotizaciones')
    const result = await res.json()
    // ✅ La API devuelve un objeto paginado, extraemos solo los datos
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
    if (!res.ok) throw new Error('Error al actualizar cotización')
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
