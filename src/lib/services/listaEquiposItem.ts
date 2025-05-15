// ===================================================
// 📁 Archivo: listaEquiposItem.ts
// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para los ítems de la ListaEquipos
// ===================================================

import { ListaEquiposItem, ListaEquiposItemPayload } from '@/types'

const BASE_URL = '/api/lista-equipos-item'

// 🟡 Obtener todos los ítems
export async function getListaEquiposItems(): Promise<ListaEquiposItem[]> {
  try {
    const res = await fetch(BASE_URL)
    if (!res.ok) throw new Error('Error al obtener ítems de lista de equipos')
    return res.json()
  } catch (error) {
    console.error('❌ getListaEquiposItems:', error)
    return []
  }
}

// 🟡 Obtener un ítem por ID
export async function getListaEquiposItemById(id: string): Promise<ListaEquiposItem | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) throw new Error('Error al obtener ítem de lista de equipos')
    return res.json()
  } catch (error) {
    console.error('❌ getListaEquiposItemById:', error)
    return null
  }
}

// 🟢 Crear ítem manualmente
export async function createListaEquiposItem(
  payload: ListaEquiposItemPayload
): Promise<ListaEquiposItem | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al crear ítem de lista de equipos')
    return res.json()
  } catch (error) {
    console.error('❌ createListaEquiposItem:', error)
    return null
  }
}

// 🟢 Actualizar ítem (edición inline)
export async function updateListaEquiposItem(
  id: string,
  payload: Partial<ListaEquiposItemPayload>
): Promise<ListaEquiposItem | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al actualizar ítem de lista de equipos')
    return res.json()
  } catch (error) {
    console.error('❌ updateListaEquiposItem:', error)
    return null
  }
}

// 🔴 Eliminar ítem
export async function deleteListaEquiposItem(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
    return res.ok
  } catch (error) {
    console.error('❌ deleteListaEquiposItem:', error)
    return false
  }
}

// 🔁 Crear ítem desde ProyectoEquipoItem
export async function createListaEquiposItemFromProyecto(
  listaId: string,
  proyectoEquipoItemId: string
): Promise<void> {
  try {
    const res = await fetch(`/api/lista-equipos/item-from-proyecto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ listaId, proyectoEquipoItemId }),
    })
    if (!res.ok) throw new Error('Error al crear ítem desde ProyectoEquipoItem')
  } catch (error) {
    console.error('❌ createListaEquiposItemFromProyecto:', error)
    throw error
  }
}
