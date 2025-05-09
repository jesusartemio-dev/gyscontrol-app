// ===================================================
// 📁 Archivo: catalogoEquipo.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Servicios para interactuar con el catálogo de equipos.
// 🧠 Uso: GET, POST, PUT, DELETE para CatalogoEquipo
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-04-25
// ===================================================

import type {
  CatalogoEquipo,
  CatalogoEquipoPayload,
  CatalogoEquipoUpdatePayload
} from '@/types'

export async function getCatalogoEquipos(): Promise<CatalogoEquipo[]> {
  const res = await fetch('/api/catalogo-equipo')
  if (!res.ok) {
    throw new Error('Error al obtener equipos')
  }
  return res.json()
}

export async function createEquipo(data: CatalogoEquipoPayload): Promise<CatalogoEquipo> {
  const res = await fetch('/api/catalogo-equipo', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })

  if (!res.ok) {
    const errorText = await res.text()
    console.error('❌ Detalle del error al crear equipo:', errorText)
    throw new Error('Error al crear equipo')
  }

  return res.json()
}

export async function updateEquipo(id: string, data: CatalogoEquipoUpdatePayload): Promise<CatalogoEquipo> {
  const res = await fetch(`/api/catalogo-equipo/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error('Error al actualizar equipo')
  return res.json()
}

export async function deleteEquipo(id: string): Promise<void> {
  const res = await fetch(`/api/catalogo-equipo/${id}`, {
    method: 'DELETE',
  })
  if (!res.ok) throw new Error('Error al eliminar equipo')
}
