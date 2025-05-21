// ===================================================
// 📁 Archivo: pedidoEquipoItem.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Servicios para gestionar los ítems dentro de un PedidoEquipo
//
// 🧠 Uso: Proyectos agrega pedidos; logística registra atención y costos.
// ✍️ Autor: Jesús Artemio (GYS)
// 📅 Última actualización: 2025-05-21
// ===================================================

import {
  PedidoEquipoItem,
  PedidoEquipoItemPayload,
  PedidoEquipoItemUpdatePayload,
} from '@/types'

const BASE_URL = '/api/pedido-equipo-item'

// ✅ Obtener todos los ítems de pedido
export async function getPedidoEquipoItems(): Promise<PedidoEquipoItem[] | null> {
  try {
    const res = await fetch(BASE_URL)
    if (!res.ok) throw new Error('Error al obtener ítems de pedido')
    return await res.json()
  } catch (error) {
    console.error('❌ getPedidoEquipoItems:', error)
    return null
  }
}

// ✅ Obtener ítem por ID
export async function getPedidoEquipoItemById(id: string): Promise<PedidoEquipoItem | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) throw new Error('Error al obtener ítem de pedido')
    return await res.json()
  } catch (error) {
    console.error('❌ getPedidoEquipoItemById:', error)
    return null
  }
}

// ✅ Crear ítem
export async function createPedidoEquipoItem(
  payload: PedidoEquipoItemPayload
): Promise<PedidoEquipoItem | null> {
  try {
    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al crear ítem de pedido')
    return await res.json()
  } catch (error) {
    console.error('❌ createPedidoEquipoItem:', error)
    return null
  }
}

// ✅ Actualizar ítem
export async function updatePedidoEquipoItem(
  id: string,
  payload: PedidoEquipoItemUpdatePayload
): Promise<PedidoEquipoItem | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al actualizar ítem de pedido')
    return await res.json()
  } catch (error) {
    console.error('❌ updatePedidoEquipoItem:', error)
    return null
  }
}

// ✅ Eliminar ítem
export async function deletePedidoEquipoItem(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
    return res.ok
  } catch (error) {
    console.error('❌ deletePedidoEquipoItem:', error)
    return false
  }
}
