import type { CatalogoGasto, CatalogoGastoPayload, CatalogoGastoUpdatePayload } from '@/types'
import { buildApiUrl } from '@/lib/utils'

// ===================================================
// 📁 Archivo: src/lib/services/catalogoGasto.ts
// 📌 Descripción: Servicios para gestionar catálogo de gastos
// 🧠 Uso: CRUD completo para catálogo de gastos
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-01-27
// ===================================================

// ✅ Obtener catálogo por ID
export async function getCatalogoGastoById(id: string): Promise<CatalogoGasto> {
  try {
    const res = await fetch(buildApiUrl(`/api/catalogo-gasto/${id}`))
    if (!res.ok) throw new Error('Error al obtener catálogo de gasto por ID')
    return await res.json()
  } catch (error) {
    console.error('Error en getCatalogoGastoById:', error)
    throw error
  }
}

// ✅ Obtener todo el catálogo de gastos
export async function getCatalogoGastos(): Promise<CatalogoGasto[]> {
  try {
    const res = await fetch(buildApiUrl('/api/catalogo-gasto'))
    if (!res.ok) {
      const errorData = await res.json()
      throw new Error(errorData.error || 'Error al obtener catálogo de gastos')
    }
    return await res.json()
  } catch (error) {
    console.error('Error en getCatalogoGastos:', error)
    throw error
  }
}

// ✅ Crear nuevo gasto en catálogo
export async function createCatalogoGasto(data: CatalogoGastoPayload): Promise<CatalogoGasto> {
  try {
    const res = await fetch(buildApiUrl('/api/catalogo-gasto'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: 'Unknown error' }))
      throw new Error(errorData.error || 'Error al crear gasto en catálogo')
    }
    return await res.json()
  } catch (error) {
    console.error('Error en createCatalogoGasto:', error)
    throw error
  }
}

// ✅ Actualizar gasto en catálogo
export async function updateCatalogoGasto(id: string, data: CatalogoGastoUpdatePayload): Promise<CatalogoGasto> {
  try {
    const res = await fetch(buildApiUrl(`/api/catalogo-gasto/${id}`), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al actualizar gasto en catálogo')
    return await res.json()
  } catch (error) {
    console.error('Error en updateCatalogoGasto:', error)
    throw error
  }
}

// ✅ Eliminar gasto del catálogo
export async function deleteCatalogoGasto(id: string): Promise<void> {
  try {
    const res = await fetch(buildApiUrl(`/api/catalogo-gasto/${id}`), {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Error al eliminar gasto del catálogo')
  } catch (error) {
    console.error('Error en deleteCatalogoGasto:', error)
    throw error
  }
}
