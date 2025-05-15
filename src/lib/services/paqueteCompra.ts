// ===================================================
// 📁 Archivo: paqueteCompra.ts
// 📌 Ubicación: src/lib/services
// 🔧 Descripción: Servicios para gestionar paquetes de compra
//
// 🧠 Uso: Llamadas a la API REST para PaqueteCompra
// ===================================================

import { PaqueteCompra, PaqueteCompraPayload } from '@/types'

const BASE_URL = '/api/paquete-compra'

export async function getPaquetesCompra(): Promise<PaqueteCompra[]> {
  try {
    const res = await fetch(BASE_URL)
    if (!res.ok) throw new Error('Error al obtener paquetes de compra')
    return res.json()
  } catch (error) {
    console.error('getPaquetesCompra:', error)
    return []
  }
}

export async function getPaqueteCompraById(id: string): Promise<PaqueteCompra | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) throw new Error('Error al obtener el paquete de compra')
    return res.json()
  } catch (error) {
    console.error('getPaqueteCompraById:', error)
    return null
  }
}

export async function createPaqueteCompra(payload: PaqueteCompraPayload): Promise<PaqueteCompra | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al crear paquete de compra')
    return res.json()
  } catch (error) {
    console.error('createPaqueteCompra:', error)
    return null
  }
}

export async function updatePaqueteCompra(id: string, payload: Partial<PaqueteCompraPayload>): Promise<PaqueteCompra | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al actualizar paquete de compra')
    return res.json()
  } catch (error) {
    console.error('updatePaqueteCompra:', error)
    return null
  }
}

export async function deletePaqueteCompra(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'DELETE',
    })
    return res.ok
  } catch (error) {
    console.error('deletePaqueteCompra:', error)
    return false
  }
}
