// ===================================================
// 📁 Archivo: paqueteCompraItem.ts
// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para manejar ítems de paquetes de compra
//
// 🧠 Uso: Operaciones CRUD para PaqueteCompraItem desde el frontend
// ===================================================

import { PaqueteCompraItem, PaqueteCompraItemPayload } from '@/types'

const BASE_URL = '/api/paquete-compra-item'

export async function getPaqueteCompraItems(): Promise<PaqueteCompraItem[]> {
  try {
    const res = await fetch(BASE_URL)
    if (!res.ok) throw new Error('Error al obtener ítems de paquete')
    return res.json()
  } catch (error) {
    console.error('getPaqueteCompraItems:', error)
    return []
  }
}

export async function getPaqueteCompraItemById(id: string): Promise<PaqueteCompraItem | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) throw new Error('Error al obtener ítem de paquete')
    return res.json()
  } catch (error) {
    console.error('getPaqueteCompraItemById:', error)
    return null
  }
}

export async function createPaqueteCompraItem(payload: PaqueteCompraItemPayload): Promise<PaqueteCompraItem | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al crear ítem de paquete')
    return res.json()
  } catch (error) {
    console.error('createPaqueteCompraItem:', error)
    return null
  }
}

export async function updatePaqueteCompraItem(id: string, payload: Partial<PaqueteCompraItemPayload>): Promise<PaqueteCompraItem | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al actualizar ítem de paquete')
    return res.json()
  } catch (error) {
    console.error('updatePaqueteCompraItem:', error)
    return null
  }
}

export async function deletePaqueteCompraItem(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    })
    return res.ok
  } catch (error) {
    console.error('deletePaqueteCompraItem:', error)
    return false
  }
}
