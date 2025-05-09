// ===================================================
// 📁 Archivo: catalogoServicio.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Servicio CRUD para CatalogoServicio usando Fetch API
//
// ✨ Métodos:
// - getCatalogoServicios(): Lista todos los servicios
// - getCatalogoServiciosByCategoriaId(id): Lista servicios por ID de categoría
// - getCatalogoServicioById(id): Trae uno por ID
// - createCatalogoServicio(payload): Crea nuevo servicio
// - updateCatalogoServicio(id, payload): Actualiza
// - deleteCatalogoServicio(id): Elimina
//
// 📦 Usa: src/types/payloads.ts y src/types/modelos.ts
// ===================================================

'use client'

import {
  CatalogoServicio,
  CatalogoServicioPayload,
  CatalogoServicioUpdatePayload,
} from '@/types'

const BASE_URL = '/api/catalogo-servicio'

// ✅ Lista todos los servicios
export async function getCatalogoServicios(): Promise<CatalogoServicio[]> {
  const res = await fetch(BASE_URL)
  if (!res.ok) throw new Error('Error al obtener servicios')
  return res.json()
}

// ✅ Lista servicios por ID de categoría
export async function getCatalogoServiciosByCategoriaId(id: string): Promise<CatalogoServicio[]> {
  const res = await fetch(`${BASE_URL}/categoria/${id}`)
  if (!res.ok) throw new Error('Error al obtener servicios por ID de categoría')
  return res.json()
}

// ✅ Obtiene un servicio por su ID
export async function getCatalogoServicioById(id: string): Promise<CatalogoServicio> {
  const res = await fetch(`${BASE_URL}/${id}`)
  if (!res.ok) throw new Error('Error al obtener servicio')
  return res.json()
}

// ✅ Crea un nuevo servicio
export async function createCatalogoServicio(
  payload: CatalogoServicioPayload
): Promise<CatalogoServicio> {
  const res = await fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Error al crear servicio')
  return res.json()
}

// ✅ Actualiza un servicio existente
export async function updateCatalogoServicio(
  id: string,
  payload: CatalogoServicioUpdatePayload
): Promise<CatalogoServicio> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Error al actualizar servicio')
  return res.json()
}

// ✅ Elimina un servicio
export async function deleteCatalogoServicio(id: string): Promise<CatalogoServicio> {
  const res = await fetch(`${BASE_URL}/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Error al eliminar servicio')
  return res.json()
}
