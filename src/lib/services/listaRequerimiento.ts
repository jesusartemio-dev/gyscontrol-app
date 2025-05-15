// ===================================================
// 📁 Archivo: listaRequerimiento.ts
// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para manejar listas de requerimiento por proyecto
//
// 🧠 Uso: Llamadas a la API REST para gestionar ListaRequerimiento
// ===================================================

import { ListaRequerimiento, ListaRequerimientoPayload } from '@/types'

const BASE_URL = '/api/lista-requerimiento'

export async function getListaRequerimientos(): Promise<ListaRequerimiento[]> {
  try {
    const res = await fetch(BASE_URL)
    if (!res.ok) throw new Error('Error al obtener las listas de requerimiento')
    return res.json()
  } catch (error) {
    console.error('getListaRequerimientos:', error)
    return []
  }
}

export async function getListaRequerimientoById(id: string): Promise<ListaRequerimiento | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) throw new Error('Error al obtener la lista de requerimiento')
    return res.json()
  } catch (error) {
    console.error('getListaRequerimientoById:', error)
    return null
  }
}

export async function createListaRequerimiento(payload: ListaRequerimientoPayload): Promise<ListaRequerimiento | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al crear lista de requerimiento')
    return res.json()
  } catch (error) {
    console.error('createListaRequerimiento:', error)
    return null
  }
}

export async function updateListaRequerimiento(id: string, payload: Partial<ListaRequerimientoPayload>): Promise<ListaRequerimiento | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al actualizar lista de requerimiento')
    return res.json()
  } catch (error) {
    console.error('updateListaRequerimiento:', error)
    return null
  }
}

export async function deleteListaRequerimiento(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    })
    return res.ok
  } catch (error) {
    console.error('deleteListaRequerimiento:', error)
    return false
  }
}
