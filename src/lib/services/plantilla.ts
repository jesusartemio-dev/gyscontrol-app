import type { Plantilla } from '@/types'
import { buildApiUrl } from '@/lib/utils'

export async function getPlantillaById(id: string): Promise<Plantilla> {
  try {
    const res = await fetch(buildApiUrl(`/api/plantilla/${id}`))
    if (!res.ok) throw new Error('Error al obtener plantilla por ID')
    return await res.json()
  } catch (error) {
    console.error('❌ Error en getPlantillaById:', error)
    throw error
  }
}

export async function getPlantillas(): Promise<Plantilla[]> {
  try {
    const res = await fetch(buildApiUrl('/api/plantilla'))
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
  tipo?: 'completa' | 'equipos' | 'servicios' | 'gastos'
}): Promise<Plantilla> {
  try {
    const res = await fetch(buildApiUrl('/api/plantilla'), {
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
    const res = await fetch(buildApiUrl(`/api/plantilla/${id}`), {
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
    const res = await fetch(buildApiUrl(`/api/plantilla/${id}`), {
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
    const res = await fetch(buildApiUrl(`/api/plantilla/${id}`), {
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
    const res = await fetch(buildApiUrl(`/api/plantilla/${id}/recalcular`), { method: 'POST' })
    if (!res.ok) throw new Error('Error al recalcular totales de plantilla desde API')
    return await res.json()
  } catch (error) {
    console.error('❌ Error en recalcularPlantillaDesdeAPI:', error)
    throw error
  }
}

// ✅ Obtener plantillas de equipos independientes
export async function getPlantillasEquipos() {
  try {
    const res = await fetch(buildApiUrl('/api/plantillas/equipos'))
    if (!res.ok) {
      const errorData = await res.json()
      console.error('❌ Error del API /api/plantillas/equipos:', errorData)
      throw new Error('Error al obtener plantillas de equipos')
    }
    return await res.json()
  } catch (error) {
    console.error('❌ Error en getPlantillasEquipos:', error)
    throw error
  }
}

// ✅ Obtener plantillas de servicios independientes
export async function getPlantillasServicios() {
  try {
    const res = await fetch(buildApiUrl('/api/plantillas/servicios'))
    if (!res.ok) {
      const errorData = await res.json()
      console.error('❌ Error del API /api/plantillas/servicios:', errorData)
      throw new Error('Error al obtener plantillas de servicios')
    }
    return await res.json()
  } catch (error) {
    console.error('❌ Error en getPlantillasServicios:', error)
    throw error
  }
}

// ✅ Obtener plantillas de gastos independientes
export async function getPlantillasGastos() {
  try {
    const res = await fetch(buildApiUrl('/api/plantillas/gastos'))
    if (!res.ok) {
      const errorData = await res.json()
      console.error('❌ Error del API /api/plantillas/gastos:', errorData)
      throw new Error('Error al obtener plantillas de gastos')
    }
    return await res.json()
  } catch (error) {
    console.error('❌ Error en getPlantillasGastos:', error)
    throw error
  }
}

// ✅ Crear plantilla de equipos independiente
export async function createPlantillaEquipos(data: {
  nombre: string
  descripcion?: string
}): Promise<any> {
  try {
    const res = await fetch(buildApiUrl('/api/plantillas/equipos'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al crear plantilla de equipos')
    return await res.json()
  } catch (error) {
    console.error('❌ Error en createPlantillaEquipos:', error)
    throw error
  }
}

// ✅ Crear plantilla de servicios independiente
export async function createPlantillaServicios(data: {
  nombre: string
  descripcion?: string
}): Promise<any> {
  try {
    const res = await fetch(buildApiUrl('/api/plantillas/servicios'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al crear plantilla de servicios')
    return await res.json()
  } catch (error) {
    console.error('❌ Error en createPlantillaServicios:', error)
    throw error
  }
}

// ✅ Crear plantilla de gastos independiente
export async function createPlantillaGastos(data: {
  nombre: string
  descripcion?: string
}): Promise<any> {
  try {
    const res = await fetch(buildApiUrl('/api/plantillas/gastos'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al crear plantilla de gastos')
    return await res.json()
  } catch (error) {
    console.error('❌ Error en createPlantillaGastos:', error)
    throw error
  }
}
