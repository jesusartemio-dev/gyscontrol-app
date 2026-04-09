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
import logger from '@/lib/logger'

const BASE_URL = '/api/pedido-equipo'

// Interface for advanced filters
export interface PedidoEquipoFilters {
  proyectoId?: string
  estado?: string
  responsableId?: string
  fechaDesde?: string
  fechaHasta?: string
  searchText?: string
  fechaOCDesde?: string
  fechaOCHasta?: string
  soloVencidas?: boolean
}

// ✅ Obtener pedidos filtrados por proyecto
export async function getPedidoEquipos(proyectoId: string): Promise<PedidoEquipo[] | null> {
  try {
    const res = await fetch(`${BASE_URL}?proyectoId=${proyectoId}`)
    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}))
      console.error('❌ getPedidoEquipos - Error response:', res.status, errorData)
      throw new Error(errorData.error || 'Error al obtener pedidos')
    }
    const data = await res.json()
    console.log(`✅ getPedidoEquipos - Proyecto ${proyectoId}: ${data?.length || 0} pedidos encontrados`)
    return data
  } catch (error) {
    console.error('❌ getPedidoEquipos:', error)
    return null
  }
}

// ✅ Obtener todos los pedidos con filtros avanzados
export async function getAllPedidoEquipos(filters?: PedidoEquipoFilters): Promise<PedidoEquipo[] | null> {
  try {
    const params = new URLSearchParams()
    
    if (filters?.proyectoId) params.append('proyectoId', filters.proyectoId)
    if (filters?.estado && filters.estado !== '__ALL__') params.append('estado', filters.estado)
    if (filters?.responsableId && filters.responsableId !== '__ALL__') params.append('responsableId', filters.responsableId)
    if (filters?.fechaDesde) params.append('fechaDesde', filters.fechaDesde)
    if (filters?.fechaHasta) params.append('fechaHasta', filters.fechaHasta)
    if (filters?.searchText) params.append('searchText', filters.searchText)
    if (filters?.fechaOCDesde) params.append('fechaOCDesde', filters.fechaOCDesde)
    if (filters?.fechaOCHasta) params.append('fechaOCHasta', filters.fechaOCHasta)
    if (filters?.soloVencidas) params.append('soloVencidas', filters.soloVencidas.toString())
    
    const url = params.toString() ? `${BASE_URL}?${params.toString()}` : BASE_URL
    const res = await fetch(url)
    if (!res.ok) throw new Error('Error al obtener pedidos')
    return await res.json()
  } catch (error) {
    console.error('❌ getAllPedidoEquipos:', error)
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

// ✅ Servicio específico para crear pedido desde lista contextual
export const createPedidoDesdeListaContextual = async (payload: PedidoEquipoPayload): Promise<PedidoEquipo> => {
  try {
    logger.info('📡 Creando pedido desde lista contextual:', JSON.stringify(payload, null, 2))
    
    const response = await fetch(`${BASE_URL}/desde-lista`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    logger.info('📡 Response status:', response.status)
    logger.info('📡 Response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      logger.error('❌ Error response text:', errorText)
      const errorData = errorText ? JSON.parse(errorText) : {}
      throw new Error(errorData.message || `Error ${response.status}: ${response.statusText}`)
    }

    const pedido = await response.json()
    logger.info('✅ Pedido creado desde lista:', pedido.id)
    return pedido
  } catch (error) {
    logger.error('❌ Error al crear pedido desde lista:', error)
    logger.error('❌ Error stack:', error instanceof Error ? error.stack : 'No stack available')
    throw error
  }
}

// ✅ Reordenar pedidos de equipo
export async function reordenarPedidosEquipo(items: { id: string; orden: number }[]): Promise<void> {
  const res = await fetch('/api/pedido-equipo/reordenar', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ items }),
  })
  if (!res.ok) throw new Error('Error al reordenar pedidos')
}
