import { buildApiUrl } from '@/lib/utils'

// ===================================================
// 📁 Archivo: src/lib/services/catalogoExclusion.ts
// 📌 Descripción: Servicios para gestionar catálogo de exclusiones
// 🧠 Uso: CRUD completo para catálogo de exclusiones
// ===================================================

export interface CatalogoExclusionItem {
  id?: string
  descripcion: string
  orden?: number
  activo?: boolean
}

export interface CatalogoExclusion {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  categoriaId?: string
  activo: boolean
  orden: number
  createdAt: string
  updatedAt: string
  categoria?: CategoriaExclusion
  items: CatalogoExclusionItem[]
  _count?: { items: number }
}

export interface CategoriaExclusion {
  id: string
  nombre: string
  descripcion?: string
  orden: number
  activo: boolean
  _count?: { catalogoExclusiones: number }
}

export interface CatalogoExclusionPayload {
  codigo?: string
  nombre: string
  descripcion?: string
  categoriaId?: string
  activo?: boolean
  orden?: number
  items?: CatalogoExclusionItem[]
}

// ✅ Obtener todas las categorías de exclusiones
export async function getCategoriasExclusion(): Promise<CategoriaExclusion[]> {
  try {
    const res = await fetch(buildApiUrl('/api/catalogo/categorias-exclusion'))
    if (!res.ok) throw new Error('Error al obtener categorías de exclusiones')
    return await res.json()
  } catch (error) {
    console.error('Error en getCategoriasExclusion:', error)
    throw error
  }
}

// ✅ Crear nueva categoría de exclusiones
export async function createCategoriaExclusion(data: { nombre: string; descripcion?: string }): Promise<CategoriaExclusion> {
  try {
    const res = await fetch(buildApiUrl('/api/catalogo/categorias-exclusion'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || 'Error al crear categoría')
    }
    return await res.json()
  } catch (error) {
    console.error('Error en createCategoriaExclusion:', error)
    throw error
  }
}

// ✅ Obtener todo el catálogo de exclusiones
export async function getCatalogoExclusiones(params?: {
  categoriaId?: string
  activo?: boolean
  search?: string
}): Promise<CatalogoExclusion[]> {
  try {
    const searchParams = new URLSearchParams()
    if (params?.categoriaId) searchParams.set('categoriaId', params.categoriaId)
    if (params?.activo !== undefined) searchParams.set('activo', String(params.activo))
    if (params?.search) searchParams.set('search', params.search)

    const query = searchParams.toString()
    const url = buildApiUrl(`/api/catalogo/exclusiones${query ? `?${query}` : ''}`)

    const res = await fetch(url)
    if (!res.ok) {
      const errorData = await res.json()
      throw new Error(errorData.error || 'Error al obtener catálogo de exclusiones')
    }
    return await res.json()
  } catch (error) {
    console.error('Error en getCatalogoExclusiones:', error)
    throw error
  }
}

// ✅ Obtener exclusión por ID
export async function getCatalogoExclusionById(id: string): Promise<CatalogoExclusion> {
  try {
    const res = await fetch(buildApiUrl(`/api/catalogo/exclusiones/${id}`))
    if (!res.ok) throw new Error('Error al obtener exclusión por ID')
    return await res.json()
  } catch (error) {
    console.error('Error en getCatalogoExclusionById:', error)
    throw error
  }
}

// ✅ Crear nueva exclusión en catálogo
export async function createCatalogoExclusion(data: CatalogoExclusionPayload): Promise<CatalogoExclusion> {
  try {
    const res = await fetch(buildApiUrl('/api/catalogo/exclusiones'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || 'Error al crear exclusión en catálogo')
    }
    return await res.json()
  } catch (error) {
    console.error('Error en createCatalogoExclusion:', error)
    throw error
  }
}

// ✅ Actualizar exclusión en catálogo
export async function updateCatalogoExclusion(id: string, data: Partial<CatalogoExclusionPayload>): Promise<CatalogoExclusion> {
  try {
    const res = await fetch(buildApiUrl(`/api/catalogo/exclusiones/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || 'Error al actualizar exclusión')
    }
    return await res.json()
  } catch (error) {
    console.error('Error en updateCatalogoExclusion:', error)
    throw error
  }
}

// ✅ Eliminar exclusión del catálogo
export async function deleteCatalogoExclusion(id: string): Promise<void> {
  try {
    const res = await fetch(buildApiUrl(`/api/catalogo/exclusiones/${id}`), {
      method: 'DELETE',
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || 'Error al eliminar exclusión')
    }
  } catch (error) {
    console.error('Error en deleteCatalogoExclusion:', error)
    throw error
  }
}
