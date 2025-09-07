import type { CatalogoEquipo } from '@/types'
import { buildApiUrl } from '@/lib/utils'

// ===================================================
// 📁 Archivo: src/lib/services/catalogoEquipo.ts
// 📌 Descripción: Servicios para gestionar catálogo de equipos
// 🧠 Uso: CRUD completo para catálogo de equipos
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-25
// ===================================================

// ✅ Obtener catálogo por ID
export async function getCatalogoEquipoById(id: string): Promise<CatalogoEquipo> {
  try {
    const res = await fetch(buildApiUrl(`/api/catalogo-equipo/${id}`))
    if (!res.ok) throw new Error('Error al obtener catálogo de equipo por ID')
    return await res.json()
  } catch (error) {
    console.error('Error en getCatalogoEquipoById:', error)
    throw error
  }
}

// ✅ Obtener todo el catálogo de equipos
export async function getCatalogoEquipos(): Promise<CatalogoEquipo[]> {
  try {
    const res = await fetch(buildApiUrl('/api/catalogo-equipo'))
    if (!res.ok) {
      const errorData = await res.json()
      throw new Error(errorData.error || 'Error al obtener catálogo de equipos')
    }
    return await res.json()
  } catch (error) {
    console.error('Error en getCatalogoEquipos:', error)
    throw error
  }
}

// ✅ Crear nuevo equipo en catálogo
export async function createCatalogoEquipo(data: {
  codigo: string
  descripcion: string
  marca: string
  precioInterno: number
  margen: number
  precioVenta: number
  categoriaId: string
  unidadId: string
  estado: string
}): Promise<CatalogoEquipo> {
  try {
    const res = await fetch(buildApiUrl('/api/catalogo-equipo'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al crear equipo en catálogo')
    return await res.json()
  } catch (error) {
    console.error('Error en createCatalogoEquipo:', error)
    throw error
  }
}

// ✅ Actualizar equipo en catálogo
export async function updateCatalogoEquipo(id: string, data: {
  nombre?: string
  descripcion?: string
  categoriaEquipoId?: string
  unidadId?: string
  precio?: number
  precioInterno?: number
  margen?: number
  precioVenta?: number
}): Promise<CatalogoEquipo> {
  try {
    const res = await fetch(buildApiUrl(`/api/catalogo-equipo/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al actualizar equipo en catálogo')
    return await res.json()
  } catch (error) {
    console.error('Error en updateCatalogoEquipo:', error)
    throw error
  }
}

// ✅ Eliminar equipo del catálogo
export async function deleteCatalogoEquipo(id: string): Promise<void> {
  try {
    const res = await fetch(buildApiUrl(`/api/catalogo-equipo/${id}`), {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Error al eliminar equipo del catálogo')
  } catch (error) {
    console.error('Error en deleteCatalogoEquipo:', error)
    throw error
  }
}
