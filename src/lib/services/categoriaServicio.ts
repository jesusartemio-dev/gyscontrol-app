import type { CategoriaServicio } from '@/types'
import type { CategoriaServicioUpdatePayload } from '@/types/payloads'
import { buildApiUrl } from '@/lib/utils'

// ===================================================
// 📁 Archivo: src/lib/services/categoriaServicio.ts
// 📌 Descripción: Servicios para gestionar categorías de servicio
// 🧠 Uso: CRUD completo para categorías de servicio
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-25
// ===================================================

// ✅ Obtener categoría por ID
export async function getCategoriaServicioById(id: string): Promise<CategoriaServicio> {
  try {
    const res = await fetch(buildApiUrl(`/api/categoria-servicio/${id}`))
    if (!res.ok) throw new Error('Error al obtener categoría de servicio por ID')
    return await res.json()
  } catch (error) {
    console.error('Error en getCategoriaServicioById:', error)
    throw error
  }
}

// ✅ Obtener todas las categorías de servicio
export async function getCategoriasServicio(): Promise<CategoriaServicio[]> {
  try {
    const res = await fetch(buildApiUrl('/api/categoria-servicio'))
    if (!res.ok) {
      const errorData = await res.json()
      throw new Error(errorData.error || 'Error al obtener categorías de servicio')
    }
    return await res.json()
  } catch (error) {
    console.error('Error en getCategoriasServicio:', error)
    throw error
  }
}

// ✅ Crear nueva categoría de servicio
export async function createCategoriaServicio(data: {
  nombre: string
  descripcion?: string
}): Promise<CategoriaServicio> {
  try {
    const res = await fetch(buildApiUrl('/api/categoria-servicio'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al crear categoría de servicio')
    return await res.json()
  } catch (error) {
    console.error('Error en createCategoriaServicio:', error)
    throw error
  }
}

export async function updateCategoriaServicio(
  id: string,
  payload: CategoriaServicioUpdatePayload
): Promise<CategoriaServicio> {
  const res = await fetch(`/api/categoria-servicio/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) throw new Error('Error al actualizar categoría')
  return res.json()
}

export async function deleteCategoriaServicio(id: string): Promise<CategoriaServicio> {
  const res = await fetch(`/api/categoria-servicio/${id}`, {
    method: 'DELETE',
  })

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({})) // <- si no es JSON válido
    console.error('❌ Backend respondió con error:', errorData)
    throw new Error('Error al eliminar categoría')
  }

  return res.json()
}
