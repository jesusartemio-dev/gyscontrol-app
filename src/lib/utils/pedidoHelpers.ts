// ===================================================
// 📁 Archivo: pedidoHelpers.ts
// 📌 Ubicación: src/lib/utils/
// 🔧 Descripción: Funciones helper para calcular estados de pedidos de items
// 🧠 Uso: Determinar si un item está en pedidos y su estado
// ✍️ Autor: IA GYS
// 📅 Última actualización: 2025-01-27
// ===================================================

import { ListaEquipoItem, PedidoEquipoItem, EstadoPedidoItem } from '@/types'

// ✅ Tipos para el estado de pedidos de un item
export type EstadoPedidoItemResumen = 
  | 'sin_pedidos'        // No tiene pedidos asociados
  | 'pendiente'          // Tiene pedidos pero todos pendientes
  | 'parcial'            // Algunos items atendidos, otros pendientes
  | 'atendido'           // Todos los pedidos atendidos
  | 'entregado'          // Todos los pedidos entregados

export interface PedidoItemResumen {
  estado: EstadoPedidoItemResumen
  totalPedidos: number
  cantidadTotalPedida: number
  cantidadTotalAtendida: number
  cantidadDisponible: number
  pedidosActivos: PedidoEquipoItem[]
  ultimoPedido?: PedidoEquipoItem
}

/**
 * 📊 Calcula el resumen de pedidos para un ListaEquipoItem
 * @param item - El item de lista de equipos
 * @returns Resumen completo del estado de pedidos
 */
export function calcularResumenPedidos(item: ListaEquipoItem): PedidoItemResumen {
  const pedidos = item.pedidos || []
  
  if (pedidos.length === 0) {
    return {
      estado: 'sin_pedidos',
      totalPedidos: 0,
      cantidadTotalPedida: 0,
      cantidadTotalAtendida: 0,
      cantidadDisponible: item.cantidad,
      pedidosActivos: [],
    }
  }

  // 🔁 Calcular totales
  const cantidadTotalPedida = pedidos.reduce((sum, pedido) => sum + pedido.cantidadPedida, 0)
  const cantidadTotalAtendida = pedidos.reduce((sum, pedido) => sum + (pedido.cantidadAtendida || 0), 0)
  const cantidadDisponible = Math.max(0, item.cantidad - cantidadTotalPedida)

  // 📡 Filtrar pedidos activos (no entregados)
  const pedidosActivos = pedidos.filter(pedido => pedido.estado !== 'entregado')
  
  // 🎯 Determinar estado general
  let estado: EstadoPedidoItemResumen
  
  const todosPendientes = pedidos.every(pedido => pedido.estado === 'pendiente')
  const todosEntregados = pedidos.every(pedido => pedido.estado === 'entregado')
  const todosAtendidos = pedidos.every(pedido => pedido.estado === 'atendido' || pedido.estado === 'entregado')
  
  if (todosEntregados) {
    estado = 'entregado'
  } else if (todosAtendidos) {
    estado = 'atendido'
  } else if (todosPendientes) {
    estado = 'pendiente'
  } else {
    estado = 'parcial'
  }

  // 📅 Obtener último pedido (más reciente)
  const ultimoPedido = pedidos.length > 0 
    ? pedidos.reduce((ultimo, actual) => 
        new Date(actual.createdAt || '') > new Date(ultimo.createdAt || '') ? actual : ultimo
      )
    : undefined

  return {
    estado,
    totalPedidos: pedidos.length,
    cantidadTotalPedida,
    cantidadTotalAtendida,
    cantidadDisponible,
    pedidosActivos,
    ultimoPedido,
  }
}

/**
 * 🎨 Obtiene el color del badge según el estado del pedido
 * @param estado - Estado del pedido del item
 * @returns Variant del badge para shadcn/ui
 */
export function getBadgeVariantPorEstado(estado: EstadoPedidoItemResumen): 'default' | 'secondary' | 'outline' {
  switch (estado) {
    case 'sin_pedidos':
      return 'outline'
    case 'pendiente':
      return 'secondary'
    case 'parcial':
      return 'default'
    case 'atendido':
      return 'default'
    case 'entregado':
      return 'secondary'
    default:
      return 'outline'
  }
}

/**
 * 🎨 Obtiene el texto del badge según el estado del pedido
 * @param estado - Estado del pedido del item
 * @returns Texto a mostrar en el badge
 */
export function getTextoPorEstado(estado: EstadoPedidoItemResumen): string {
  switch (estado) {
    case 'sin_pedidos':
      return 'Sin pedidos'
    case 'pendiente':
      return 'Pendiente'
    case 'parcial':
      return 'Parcial'
    case 'atendido':
      return 'Atendido'
    case 'entregado':
      return 'Entregado'
    default:
      return 'Desconocido'
  }
}

/**
 * 🎨 Obtiene las clases CSS para el indicador visual de fila
 * @param estado - Estado del pedido del item
 * @returns Clases CSS para aplicar a la fila
 */
export function getClasesFilaPorEstado(estado: EstadoPedidoItemResumen): string {
  switch (estado) {
    case 'sin_pedidos':
      return '' // Sin indicador visual
    case 'pendiente':
      return 'border-l-4 border-l-yellow-400 bg-yellow-50/50'
    case 'parcial':
      return 'border-l-4 border-l-blue-400 bg-blue-50/50'
    case 'atendido':
      return 'border-l-4 border-l-green-400 bg-green-50/50'
    case 'entregado':
      return 'border-l-4 border-l-gray-400 bg-gray-50/50'
    default:
      return ''
  }
}

/**
 * 📊 Verifica si un item tiene pedidos activos (no entregados)
 * @param item - El item de lista de equipos
 * @returns true si tiene pedidos activos
 */
export function tienePedidosActivos(item: ListaEquipoItem): boolean {
  const pedidos = item.pedidos || []
  return pedidos.some(pedido => pedido.estado !== 'entregado')
}

/**
 * 📊 Verifica si un item está completamente disponible (sin pedidos)
 * @param item - El item de lista de equipos
 * @returns true si está completamente disponible
 */
export function estaDisponible(item: ListaEquipoItem): boolean {
  const resumen = calcularResumenPedidos(item)
  return resumen.cantidadDisponible > 0
}

/**
 * 🏷️ Obtiene el código del pedido más relevante
 * Prioriza pedidos activos, luego el último pedido
 * @param resumen - Resumen de pedidos del item
 * @returns Código del pedido más relevante o undefined
 */
export function getCodigoPedidoRelevante(resumen: PedidoItemResumen): string | undefined {
  if (!resumen || resumen.totalPedidos === 0) return undefined
  
  // 🎯 Si hay pedidos activos, usar el primero
  if (resumen.pedidosActivos.length > 0) {
    return resumen.pedidosActivos[0].pedido?.codigo
  }
  
  // 📋 Si no hay activos, usar el último pedido
  return resumen.ultimoPedido?.pedido?.codigo
}

/**
 * 🔗 Obtiene el ID del pedido más relevante para navegación
 * Prioriza pedidos activos, luego el último pedido
 * @param resumen - Resumen de pedidos del item
 * @returns ID del pedido más relevante o undefined
 */
export function getIdPedidoRelevante(resumen: PedidoItemResumen): string | undefined {
  if (!resumen || resumen.totalPedidos === 0) return undefined
  
  // 🎯 Si hay pedidos activos, usar el primero
  if (resumen.pedidosActivos.length > 0) {
    return resumen.pedidosActivos[0].pedido?.id
  }
  
  // 📋 Si no hay activos, usar el último pedido
  return resumen.ultimoPedido?.pedido?.id
}

/**
 * 🏷️ Obtiene el texto para mostrar en el badge, priorizando el código del pedido
 * @param estado - Estado del pedido
 * @param resumen - Resumen de pedidos del item
 * @returns Código del pedido con cantidad o texto del estado
 */
export function getTextoPorEstadoConCodigo(estado: EstadoPedidoItemResumen, resumen?: PedidoItemResumen): string {
  if (resumen && resumen.totalPedidos > 0) {
    const codigo = getCodigoPedidoRelevante(resumen)
    if (codigo) {
      // 📊 Mostrar código del pedido con cantidad pedida vs disponible en formato "1/4"
      return `${codigo}\n${resumen.cantidadTotalPedida}/${resumen.cantidadDisponible}`
    }
  }
  
  // 🔄 Fallback al texto original del estado
  return getTextoPorEstado(estado)
}

/**
 * 📊 Obtiene información detallada de pedidos para mostrar en tooltip
 * @param item - El item de lista de equipos
 * @returns Texto formateado para tooltip
 */
export function getInfoPedidosParaTooltip(item: ListaEquipoItem): string {
  const resumen = calcularResumenPedidos(item)
  
  if (resumen.estado === 'sin_pedidos') {
    return `Cantidad disponible: ${item.cantidad}`
  }

  const lineas = [
    `Total pedidos: ${resumen.totalPedidos}`,
    `Cantidad pedida: ${resumen.cantidadTotalPedida}`,
    `Cantidad atendida: ${resumen.cantidadTotalAtendida}`,
    `Disponible: ${resumen.cantidadDisponible}`,
  ]

  if (resumen.ultimoPedido) {
    lineas.push(`Último pedido: ${resumen.ultimoPedido.estado}`)
  }

  return lineas.join('\n')
}
