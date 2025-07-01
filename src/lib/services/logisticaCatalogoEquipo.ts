// ===================================================
// 📁 Archivo: logisticaCatalogoEquipo.ts
// 📌 Ubicación: /lib/services/
// 🔧 Descripción: Servicios para Catálogo de Equipos en Logística
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-28
// ===================================================

import { CatalogoEquipo, CatalogoEquipoPayload } from '@/types'

const BASE_URL = '/api/logistica-catalogo-equipo' // ✅ corregido al nuevo endpoint

export async function getCatalogoEquiposLogistica(): Promise<CatalogoEquipo[]> {
  try {
    const res = await fetch(`${BASE_URL}`, { cache: 'no-store' })
    if (!res.ok) throw new Error('Error al obtener equipos')
    return res.json()
  } catch (err) {
    console.error('❌ Error getCatalogoEquiposLogistica:', err)
    return []
  }
}

export async function createEquipoLogistica(
  data: CatalogoEquipoPayload
): Promise<CatalogoEquipo | null> {
  try {
    const res = await fetch(`${BASE_URL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al crear equipo')
    return res.json()
  } catch (err) {
    console.error('❌ Error createEquipoLogistica:', err)
    return null
  }
}

export async function updateEquipoLogistica(
  id: string,
  data: Partial<CatalogoEquipoPayload>
): Promise<CatalogoEquipo | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al actualizar equipo')
    return res.json()
  } catch (err) {
    console.error('❌ Error updateEquipoLogistica:', err)
    return null
  }
}

export async function deleteEquipoLogistica(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Error al eliminar equipo')
    return true
  } catch (err) {
    console.error('❌ Error deleteEquipoLogistica:', err)
    return false
  }
}
