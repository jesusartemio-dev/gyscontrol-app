// ===================================================
// 📁 Archivo: proyectoEquipoItem.ts
// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para gestionar los ítems de equipos en proyectos
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-07-01
// ===================================================

import type {
  ProyectoEquipoItem,
  ProyectoEquipoItemPayload,
  ProyectoEquipoItemUpdatePayload,
} from '@/types'

// ✅ Obtener ítems de equipos del proyecto, con opción de filtrar solo disponibles
export async function getProyectoEquipoItems(
  proyectoId: string,
  soloDisponibles: boolean = false
): Promise<ProyectoEquipoItem[]> {
  try {
    const url = soloDisponibles
      ? `/api/proyecto-equipo-item/from-proyecto/${proyectoId}?soloDisponibles=true`
      : `/api/proyecto-equipo-item/from-proyecto/${proyectoId}`

    const res = await fetch(url, { cache: 'no-store' })
    if (!res.ok) throw new Error('Error al obtener ítems de equipos del proyecto')
    return await res.json()
  } catch (error) {
    console.error('❌ getProyectoEquipoItems:', error)
    return []
  }
}

// 🔁 Alias por compatibilidad: obtiene ítems sin lista técnica asignada
export async function getProyectoEquipoItemsDisponibles(proyectoId: string): Promise<ProyectoEquipoItem[]> {
  return getProyectoEquipoItems(proyectoId, true)
}

// ✅ Obtener un ítem por ID
export async function getProyectoEquipoItemById(id: string): Promise<ProyectoEquipoItem | null> {
  try {
    const res = await fetch(`/api/proyecto-equipo-item/${id}`, { cache: 'no-store' })
    if (!res.ok) throw new Error('Error al obtener ítem de equipo por ID')
    return await res.json()
  } catch (error) {
    console.error('❌ getProyectoEquipoItemById:', error)
    return null
  }
}

// ✅ Crear ítem (puede derivarse de un ítem anterior mediante listaEquipoSeleccionadoId)
export async function createProyectoEquipoItem(
  data: ProyectoEquipoItemPayload
): Promise<ProyectoEquipoItem> {
  try {
    const res = await fetch('/api/proyecto-equipo-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al crear ítem de equipo del proyecto')
    return await res.json()
  } catch (error) {
    console.error('❌ createProyectoEquipoItem:', error)
    throw error
  }
}

// ✅ Actualizar ítem (incluye campo listaEquipoSeleccionadoId para trazabilidad)
export async function updateProyectoEquipoItem(
  id: string,
  data: ProyectoEquipoItemUpdatePayload
): Promise<ProyectoEquipoItem> {
  try {
    const res = await fetch(`/api/proyecto-equipo-item/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (!res.ok) throw new Error('Error al actualizar ítem de equipo del proyecto')
    return await res.json()
  } catch (error) {
    console.error('❌ updateProyectoEquipoItem:', error)
    throw error
  }
}

// ✅ Eliminar ítem
export async function deleteProyectoEquipoItem(id: string): Promise<void> {
  try {
    const res = await fetch(`/api/proyecto-equipo-item/${id}`, {
      method: 'DELETE',
    })
    if (!res.ok) throw new Error('Error al eliminar ítem de equipo del proyecto')
  } catch (error) {
    console.error('❌ deleteProyectoEquipoItem:', error)
    throw error
  }
}
