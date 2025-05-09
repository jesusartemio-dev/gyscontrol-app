// ===================================================
// 📁 Archivo: categoriaServicio.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Servicio CRUD para CategoriaServicio usando Fetch API
//
// ✨ Métodos:
// - getCategoriasServicio(): Lista todas las categorías
// - getCategoriaServicioById(id): Busca una categoría por ID
// - createCategoriaServicio(payload): Crea nueva categoría
// - updateCategoriaServicio(id, payload): Actualiza categoría
// - deleteCategoriaServicio(id): Elimina categoría por ID
//
// 🧠 Tipado desde src/types/modelos.ts y payloads.ts
// 🌐 Conectado con las rutas: /api/categoria-servicio y /api/categoria-servicio/[id]
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-04-20
// ===================================================

import { CategoriaServicio } from '@/types'
import {
  CategoriaServicioPayload,
  CategoriaServicioUpdatePayload,
} from '@/types'

export async function getCategoriasServicio(): Promise<CategoriaServicio[]> {
  const res = await fetch('/api/categoria-servicio')
  if (!res.ok) throw new Error('Error al obtener categorías')
  return res.json()
}

export async function getCategoriaServicioById(id: string): Promise<CategoriaServicio> {
  const res = await fetch(`/api/categoria-servicio/${id}`)
  if (!res.ok) throw new Error('Error al obtener categoría')
  return res.json()
}

export async function createCategoriaServicio(
  payload: CategoriaServicioPayload
): Promise<CategoriaServicio> {
  const res = await fetch('/api/categoria-servicio', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  })

  if (!res.ok) throw new Error('Error al crear categoría')
  return res.json()
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
