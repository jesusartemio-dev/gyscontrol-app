import { buildApiUrl } from '@/lib/utils'

// ===================================================
// 📁 Archivo: src/lib/services/catalogoCondicion.ts
// 📌 Descripción: Servicios para gestionar catálogo de condiciones
// 🧠 Uso: CRUD completo para catálogo de condiciones
// ===================================================

export interface CatalogoCondicionItem {
  id?: string
  descripcion: string
  tipo?: string
  orden?: number
  activo?: boolean
}

export interface CatalogoCondicion {
  id: string
  codigo: string
  nombre: string
  descripcion?: string
  categoriaId?: string
  tipo?: string
  activo: boolean
  orden: number
  createdAt: string
  updatedAt: string
  categoria?: CategoriaCondicion
  items: CatalogoCondicionItem[]
  _count?: { items: number }
}

export interface CategoriaCondicion {
  id: string
  nombre: string
  descripcion?: string
  orden: number
  activo: boolean
  _count?: { catalogoCondiciones: number }
}

export interface CatalogoCondicionPayload {
  codigo?: string
  nombre: string
  descripcion?: string
  categoriaId?: string
  tipo?: string
  activo?: boolean
  orden?: number
  items?: CatalogoCondicionItem[]
}

// ✅ Obtener todas las categorías de condiciones
export async function getCategoriasCondicion(): Promise<CategoriaCondicion[]> {
  try {
    const res = await fetch(buildApiUrl('/api/catalogo/categorias-condicion'))
    if (!res.ok) throw new Error('Error al obtener categorías de condiciones')
    return await res.json()
  } catch (error) {
    console.error('Error en getCategoriasCondicion:', error)
    throw error
  }
}

// ✅ Crear nueva categoría de condiciones
export async function createCategoriaCondicion(data: { nombre: string; descripcion?: string }): Promise<CategoriaCondicion> {
  try {
    const res = await fetch(buildApiUrl('/api/catalogo/categorias-condicion'), {
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
    console.error('Error en createCategoriaCondicion:', error)
    throw error
  }
}

// ✅ Obtener todo el catálogo de condiciones
export async function getCatalogoCondiciones(params?: {
  categoriaId?: string
  activo?: boolean
  tipo?: string
  search?: string
}): Promise<CatalogoCondicion[]> {
  try {
    const searchParams = new URLSearchParams()
    if (params?.categoriaId) searchParams.set('categoriaId', params.categoriaId)
    if (params?.activo !== undefined) searchParams.set('activo', String(params.activo))
    if (params?.tipo) searchParams.set('tipo', params.tipo)
    if (params?.search) searchParams.set('search', params.search)

    const query = searchParams.toString()
    const url = buildApiUrl(`/api/catalogo/condiciones${query ? `?${query}` : ''}`)

    const res = await fetch(url)
    if (!res.ok) {
      const errorData = await res.json()
      throw new Error(errorData.error || 'Error al obtener catálogo de condiciones')
    }
    return await res.json()
  } catch (error) {
    console.error('Error en getCatalogoCondiciones:', error)
    throw error
  }
}

// ✅ Obtener condición por ID
export async function getCatalogoCondicionById(id: string): Promise<CatalogoCondicion> {
  try {
    const res = await fetch(buildApiUrl(`/api/catalogo/condiciones/${id}`))
    if (!res.ok) throw new Error('Error al obtener condición por ID')
    return await res.json()
  } catch (error) {
    console.error('Error en getCatalogoCondicionById:', error)
    throw error
  }
}

// ✅ Crear nueva condición en catálogo
export async function createCatalogoCondicion(data: CatalogoCondicionPayload): Promise<CatalogoCondicion> {
  try {
    const res = await fetch(buildApiUrl('/api/catalogo/condiciones'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || 'Error al crear condición en catálogo')
    }
    return await res.json()
  } catch (error) {
    console.error('Error en createCatalogoCondicion:', error)
    throw error
  }
}

// ✅ Actualizar condición en catálogo
export async function updateCatalogoCondicion(id: string, data: Partial<CatalogoCondicionPayload>): Promise<CatalogoCondicion> {
  try {
    const res = await fetch(buildApiUrl(`/api/catalogo/condiciones/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || 'Error al actualizar condición')
    }
    return await res.json()
  } catch (error) {
    console.error('Error en updateCatalogoCondicion:', error)
    throw error
  }
}

// ✅ Eliminar condición del catálogo
export async function deleteCatalogoCondicion(id: string): Promise<void> {
  try {
    const res = await fetch(buildApiUrl(`/api/catalogo/condiciones/${id}`), {
      method: 'DELETE',
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || 'Error al eliminar condición')
    }
  } catch (error) {
    console.error('Error en deleteCatalogoCondicion:', error)
    throw error
  }
}
