// ===================================================
// 📁 Archivo: listaRequerimientoItem.ts
// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para gestionar ítems de lista de requerimientos
//
// 🧠 Uso: Llamadas a la API REST para ListaRequerimientoItem
// ===================================================

import {
  ListaRequerimientoItem,
  ListaRequerimientoItemPayload,
} from '@/types'

const BASE_URL = '/api/lista-requerimiento-item'

export async function getListaRequerimientoItems(): Promise<ListaRequerimientoItem[]> {
  try {
    const res = await fetch(BASE_URL)
    if (!res.ok) throw new Error('Error al obtener los ítems de requerimiento')
    return res.json()
  } catch (error) {
    console.error('getListaRequerimientoItems:', error)
    return []
  }
}

export async function getListaRequerimientoItemById(id: string): Promise<ListaRequerimientoItem | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) throw new Error('Error al obtener ítem de requerimiento')
    return res.json()
  } catch (error) {
    console.error('getListaRequerimientoItemById:', error)
    return null
  }
}

export async function createListaRequerimientoItem(payload: ListaRequerimientoItemPayload): Promise<ListaRequerimientoItem | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al crear ítem de requerimiento')
    return res.json()
  } catch (error) {
    console.error('createListaRequerimientoItem:', error)
    return null
  }
}

export async function updateListaRequerimientoItem(id: string, payload: Partial<ListaRequerimientoItemPayload>): Promise<ListaRequerimientoItem | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al actualizar ítem de requerimiento')
    return res.json()
  } catch (error) {
    console.error('updateListaRequerimientoItem:', error)
    return null
  }
}

export async function deleteListaRequerimientoItem(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    })
    return res.ok
  } catch (error) {
    console.error('deleteListaRequerimientoItem:', error)
    return false
  }
}
