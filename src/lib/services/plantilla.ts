import type { Plantilla } from '@/types'

export async function getPlantillaById(id: string): Promise<Plantilla> {
  try {
    const res = await fetch(`/api/plantilla/${id}`)
    if (!res.ok) throw new Error('Error al obtener plantilla por ID')
    return await res.json()
  } catch (error) {
    console.error('❌ Error en getPlantillaById:', error)
    throw error
  }
}

export async function getPlantillas(): Promise<Plantilla[]> {
  try {
    const res = await fetch('/api/plantilla')
    if (!res.ok) {
      const errorData = await res.json()
      console.error('❌ Error del API /api/plantilla:', errorData)
      throw new Error('Error al obtener plantillas')
    }
    return await res.json()
  } catch (error) {
    console.error('❌ Error en getPlantillas:', error)
    throw error
  }
}

export async function createPlantilla(data: {
  nombre: string
  descripcion?: string
}): Promise<Plantilla> {
  try {
    const res = await fetch('/api/plantilla', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al crear plantilla')
    return await res.json()
  } catch (error) {
    console.error('❌ Error en createPlantilla:', error)
    throw error
  }
}

export async function updatePlantilla(id: string, data: Partial<Plantilla>): Promise<Plantilla> {
  try {
    const res = await fetch(`/api/plantilla/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al actualizar plantilla')
    return await res.json()
  } catch (error) {
    console.error('❌ Error en updatePlantilla:', error)
    throw error
  }
}

export async function deletePlantilla(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/plantilla/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Error al eliminar plantilla')
  } catch (error) {
    console.error('❌ Error en deletePlantilla:', error)
    throw error
  }
}

export async function updatePlantillaTotales(
  id: string,
  data: {
    totalEquiposInterno: number
    totalEquiposCliente: number
    totalServiciosInterno: number
    totalServiciosCliente: number
    totalGastosInterno: number
    totalGastosCliente: number
    totalInterno: number
    totalCliente: number
    grandTotal: number
  }
) {
  try {
    const res = await fetch(`/api/plantilla/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })

    if (!res.ok) throw new Error('Error al actualizar totales de plantilla')
    return await res.json()
  } catch (error) {
    console.error('❌ updatePlantillaTotales:', error)
    throw error
  }
}

// ✅ Recalcula totales desde backend
export async function recalcularPlantillaDesdeAPI(id: string) {
  try {
    const res = await fetch(`/api/plantilla/${id}/recalcular`, { method: 'POST' })
    if (!res.ok) throw new Error('Error al recalcular totales de plantilla desde API')
    return await res.json()
  } catch (error) {
    console.error('❌ Error en recalcularPlantillaDesdeAPI:', error)
    throw error
  }
}
