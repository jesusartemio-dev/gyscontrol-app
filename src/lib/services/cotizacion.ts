import type { Cotizacion } from '@/types'

// Obtener todas las cotizaciones
export async function getCotizaciones(): Promise<Cotizacion[]> {
  try {
    const res = await fetch('/api/cotizacion', { cache: 'no-store' })
    if (!res.ok) throw new Error('Error al obtener cotizaciones')
    return await res.json()
  } catch (error) {
    console.error('❌ getCotizaciones error:', error)
    throw error
  }
}

// Obtener cotización por ID
export async function getCotizacionById(id: string): Promise<Cotizacion> {
  try {
    const res = await fetch(`/api/cotizacion/${id}`, { cache: 'no-store' })
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

    const res = await fetch('/api/cotizacion/from-plantilla', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    const responseText = await res.text()

    if (!res.ok) {
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
    const res = await fetch('/api/cotizacion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al crear cotización')
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
    const res = await fetch(`/api/cotizacion/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`/api/cotizacion/${id}`, {
      method: 'DELETE',
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
    const res = await fetch(`/api/cotizacion/${id}/recalcular`, { method: 'POST' })
    if (!res.ok) throw new Error('Error al recalcular totales de cotización desde API')
    return await res.json()
  } catch (error) {
    console.error('❌ Error en recalcularCotizacionDesdeAPI:', error)
    throw error
  }
}
