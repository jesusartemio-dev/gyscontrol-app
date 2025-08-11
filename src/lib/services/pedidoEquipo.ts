// ===================================================
// 📁 Archivo: pedidoEquipo.ts
// 📌 Ubicación: src/lib/services/
// 🔧 Descripción: Servicios para gestionar pedidos de equipos vinculados a listas técnicas
//
// 🧠 Uso: Proyectos crea pedidos; Logística y Gestión visualizan y actualizan.
// ✍️ Autor: Jesús Artemio (GYS) + IA GYS
// 📅 Última actualización: 2025-07-17
// ===================================================

import {
  PedidoEquipo,
  PedidoEquipoPayload,
  PedidoEquipoUpdatePayload,
} from '@/types'

const BASE_URL = '/api/pedido-equipo'

// ✅ Obtener pedidos filtrados por proyecto
export async function getPedidoEquipos(proyectoId: string): Promise<PedidoEquipo[] | null> {
  try {
    const res = await fetch(`${BASE_URL}?proyectoId=${proyectoId}`)
    if (!res.ok) throw new Error('Error al obtener pedidos')
    return await res.json()
  } catch (error) {
    console.error('❌ getPedidoEquipos:', error)
    return null
  }
}

// ✅ Obtener un pedido por ID
export async function getPedidoEquipoById(id: string): Promise<PedidoEquipo | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`)
    if (!res.ok) throw new Error('Error al obtener pedido')
    return await res.json()
  } catch (error) {
    console.error('❌ getPedidoEquipoById:', error)
    return null
  }
}

// ✅ Crear nuevo pedido
export async function createPedidoEquipo(
  payload: PedidoEquipoPayload
): Promise<PedidoEquipo | null> {
  try {
    if (!payload.fechaNecesaria) throw new Error('⚠️ fechaNecesaria es obligatoria')

    console.log('📦 Payload recibido para crear pedido:', payload)

    const res = await fetch(BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const result = await res.json()

    if (!res.ok) {
      console.error('❌ Error al crear pedido (response not ok):', result)
      throw new Error(result?.error || 'Error al crear pedido')
    }

    console.log('✅ Pedido creado correctamente:', result)
    return result
  } catch (error) {
    console.error('❌ createPedidoEquipo - error:', error)
    return null
  }
}

// ✅ Actualizar pedido
export async function updatePedidoEquipo(
  id: string,
  payload: PedidoEquipoUpdatePayload
): Promise<PedidoEquipo | null> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) throw new Error('Error al actualizar pedido')
    return await res.json()
  } catch (error) {
    console.error('❌ updatePedidoEquipo:', error)
    return null
  }
}

// ✅ Eliminar pedido
export async function deletePedidoEquipo(id: string): Promise<boolean> {
  try {
    const res = await fetch(`${BASE_URL}/${id}`, { method: 'DELETE' })
    return res.ok
  } catch (error) {
    console.error('❌ deletePedidoEquipo:', error)
    return false
  }
}
