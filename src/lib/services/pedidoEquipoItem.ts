// ===================================================
// 📁 Archivo: pedidoEquipoItem.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Servicios CRUD simples para ítems de PedidoEquipo
// 🧠 Lógica extra como actualizar cantidadPedida se gestiona en la API
// ===================================================

import {
  PedidoEquipoItem,
  PedidoEquipoItemPayload,
  PedidoEquipoItemUpdatePayload,
} from '@/types'

const BASE_URL = '/api/pedido-equipo-item'

// ✅ Obtener todos los ítems (no se usa comúnmente)
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

// ✅ Crear ítem de pedido (la API ya actualiza cantidadPedida)
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

// ✅ Actualizar ítem de pedido (la API ajusta la cantidadPedida según diferencia)
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

// ✅ Eliminar ítem de pedido (la API descuenta la cantidadPedida)
export async function deletePedidoEquipoItem(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
    return res.ok
  } catch (error) {
    console.error('❌ deletePedidoEquipoItem:', error)
    return false
  }
}
