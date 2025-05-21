// ===================================================
// 📁 Archivo: listaEquipoItem.ts
// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para los ítems de la ListaEquipo
// 🧠 Uso: Consumido por formularios, listas y vistas de detalle
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-19
// ===================================================

import {
  ListaEquipoItem,
  ListaEquipoItemPayload,
  ListaEquipoItemUpdatePayload,
} from '@/types'

const BASE_URL = '/api/lista-equipo-item'

// ✅ Obtener todos los ítems
export async function getListaEquipoItems(): Promise<ListaEquipoItem[]> {
  try {
    const res = await fetch(BASE_URL)
    if (!res.ok) throw new Error('Error al obtener ítems de lista de equipos')
    return await res.json()
  } catch (error) {
    console.error('getListaEquipoItems:', error)
    return []
  }
}

// ✅ Obtener ítem por ID
export async function getListaEquipoItemById(id: string): Promise<ListaEquipoItem | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) throw new Error('Error al obtener ítem de lista de equipos')
    return await res.json()
  } catch (error) {
    console.error('getListaEquipoItemById:', error)
    return null
  }
}

// ✅ Crear nuevo ítem manualmente
export async function createListaEquipoItem(
  payload: ListaEquipoItemPayload
): Promise<ListaEquipoItem | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al crear ítem de lista de equipos')
    return await res.json()
  } catch (error) {
    console.error('createListaEquipoItem:', error)
    return null
  }
}

// ✅ Actualizar ítem (edición inline o cambios desde revisión)
export async function updateListaEquipoItem(
  id: string,
  payload: ListaEquipoItemUpdatePayload
): Promise<ListaEquipoItem | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al actualizar ítem de lista de equipos')
    return await res.json()
  } catch (error) {
    console.error('updateListaEquipoItem:', error)
    return null
  }
}

// ✅ Eliminar ítem de lista por ID
export async function deleteListaEquipoItem(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
    return res.ok
  } catch (error) {
    console.error('deleteListaEquipoItem:', error)
    return false
  }
}

// 🔁 Crear ítem a partir de un ProyectoEquipoItem
export async function createListaEquipoItemFromProyecto(
  listaId: string,
  proyectoEquipoItemId: string
): Promise<void> {
  try {
    const res = await fetch(`/api/lista-equipo/item-from-proyecto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listaId, proyectoEquipoItemId }),
    })
    if (!res.ok) throw new Error('Error al crear ítem desde ProyectoEquipoItem')
  } catch (error) {
    console.error('createListaEquipoItemFromProyecto:', error)
    throw error
  }
}

// 🔁 Eliminar ítem de lista por ID de ProyectoEquipoItem (especial para reemplazos)
export async function deleteListaEquipoItemByProyectoItemId(
  proyectoEquipoItemId: string
): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/by-proyecto/${proyectoEquipoItemId}`, {
      method: 'DELETE',
    })
    return res.ok
  } catch (error) {
    console.error('deleteListaEquipoItemByProyectoItemId:', error)
    return false
  }
}
