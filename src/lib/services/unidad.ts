// ===================================================
// 📁 Archivo: unidad.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Servicios para gestionar unidades
// ===================================================

import type { Unidad, UnidadPayload, UnidadUpdatePayload } from '@/types'

// ✅ Obtener todas las unidades
export async function getUnidades(): Promise<Unidad[]> {
  const res = await fetch('/api/unidad', { cache: 'no-store' })
  if (!res.ok) throw new Error('Error al obtener unidades')
  return res.json()
}

// ✅ Crear nueva unidad
export async function createUnidad(data: UnidadPayload): Promise<Unidad> {
  const res = await fetch('/api/unidad', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) throw new Error('Error al crear unidad')
  return res.json()
}

// ✅ Actualizar unidad existente
export async function updateUnidad(id: string, data: UnidadUpdatePayload): Promise<Unidad> {
  const res = await fetch(`/api/unidad/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) throw new Error('Error al actualizar unidad')
  return res.json()
}

// ✅ Eliminar unidad
export async function deleteUnidad(id: string): Promise<void> {
  const res = await fetch(`/api/unidad/${id}`, {
    method: 'DELETE',
  })

  if (!res.ok) throw new Error('Error al eliminar unidad')
}
