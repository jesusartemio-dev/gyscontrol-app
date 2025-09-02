// ===================================================
// 📁 Archivo: stock-control.ts
// 📌 Utilidades para control de stock en ListaEquipoItem
// 🧠 Uso: Centralizar lógica de cálculo de cantidades disponibles
// ✍️ Autor: Jesús Artemio + IA GYS
// 🗕️ Fecha: 2025-01-27
// ===================================================

import { ListaEquipoItem } from '@/types'

/**
 * 🔢 Calcula la cantidad disponible de un item de lista
 * @param item - Item de lista de equipos
 * @returns Cantidad disponible (cantidad - cantidadPedida)
 */
export function calcularCantidadDisponible(item: ListaEquipoItem): number {
  const cantidad = item.cantidad || 0
  const cantidadPedida = item.cantidadPedida || 0
  return Math.max(0, cantidad - cantidadPedida)
}

/**
 * ✅ Verifica si un item tiene stock disponible
 * @param item - Item de lista de equipos
 * @returns true si tiene stock disponible, false si no
 */
export function tieneStockDisponible(item: ListaEquipoItem): boolean {
  return calcularCantidadDisponible(item) > 0
}

/**
 * 📊 Calcula el porcentaje de stock utilizado
 * @param item - Item de lista de equipos
 * @returns Porcentaje de stock utilizado (0-100)
 */
export function calcularPorcentajeUtilizado(item: ListaEquipoItem): number {
  const cantidad = item.cantidad || 0
  const cantidadPedida = item.cantidadPedida || 0
  
  if (cantidad === 0) return 0
  return Math.min(100, Math.round((cantidadPedida / cantidad) * 100))
}

/**
 * 🎯 Obtiene el estado del stock de un item
 * @param item - Item de lista de equipos
 * @returns Estado del stock: 'disponible', 'parcial', 'agotado', 'sobrepedido'
 */
export function obtenerEstadoStock(item: ListaEquipoItem): 'disponible' | 'parcial' | 'agotado' | 'sobrepedido' {
  const cantidad = item.cantidad || 0
  const cantidadPedida = item.cantidadPedida || 0
  
  if (cantidadPedida > cantidad) return 'sobrepedido'
  if (cantidadPedida === cantidad) return 'agotado'
  if (cantidadPedida > 0) return 'parcial'
  return 'disponible'
}

/**
 * 🏷️ Obtiene el badge de estado para mostrar en UI
 * @param item - Item de lista de equipos
 * @returns Objeto con texto y variante del badge
 */
export function obtenerBadgeStock(item: ListaEquipoItem): {
  text: string
  variant: 'default' | 'secondary' | 'outline' | 'destructive'
} {
  const estado = obtenerEstadoStock(item)
  const disponible = calcularCantidadDisponible(item)
  
  switch (estado) {
    case 'disponible':
      return { text: `${disponible} disponibles`, variant: 'default' }
    case 'parcial':
      return { text: `${disponible} restantes`, variant: 'outline' }
    case 'agotado':
      return { text: 'Agotado', variant: 'secondary' }
    case 'sobrepedido':
      return { text: 'Sobrepedido', variant: 'destructive' }
  }
}

/**
 * 🔍 Filtra items que tienen stock disponible
 * @param items - Array de items de lista
 * @returns Array filtrado con solo items que tienen stock
 */
export function filtrarItemsConStock(items: ListaEquipoItem[]): ListaEquipoItem[] {
  return items.filter(tieneStockDisponible)
}

/**
 * 📈 Calcula estadísticas de stock para una lista
 * @param items - Array de items de lista
 * @returns Estadísticas de stock
 */
export function calcularEstadisticasStock(items: ListaEquipoItem[]): {
  total: number
  disponibles: number
  parciales: number
  agotados: number
  sobrepedidos: number
  porcentajeDisponible: number
} {
  const total = items.length
  let disponibles = 0
  let parciales = 0
  let agotados = 0
  let sobrepedidos = 0
  
  items.forEach(item => {
    const estado = obtenerEstadoStock(item)
    switch (estado) {
      case 'disponible': disponibles++; break
      case 'parcial': parciales++; break
      case 'agotado': agotados++; break
      case 'sobrepedido': sobrepedidos++; break
    }
  })
  
  const porcentajeDisponible = total > 0 ? Math.round(((disponibles + parciales) / total) * 100) : 0
  
  return {
    total,
    disponibles,
    parciales,
    agotados,
    sobrepedidos,
    porcentajeDisponible,
  }
}

/**
 * ⚠️ Valida si se puede pedir una cantidad específica
 * @param item - Item de lista de equipos
 * @param cantidadSolicitada - Cantidad que se quiere pedir
 * @returns Objeto con validación y mensaje de error si aplica
 */
export function validarCantidadPedido(item: ListaEquipoItem, cantidadSolicitada: number): {
  valido: boolean
  error?: string
  cantidadMaxima: number
} {
  const disponible = calcularCantidadDisponible(item)
  const cantidadMaxima = disponible
  
  if (cantidadSolicitada <= 0) {
    return {
      valido: false,
      error: 'La cantidad debe ser mayor a 0',
      cantidadMaxima,
    }
  }
  
  if (cantidadSolicitada > disponible) {
    return {
      valido: false,
      error: `Solo hay ${disponible} unidades disponibles`,
      cantidadMaxima,
    }
  }
  
  return {
    valido: true,
    cantidadMaxima,
  }
}

/**
 * 🔄 Simula el impacto de un pedido en el stock
 * @param items - Array de items de lista
 * @param pedidoItems - Items del pedido con cantidades
 * @returns Array de items con cantidades actualizadas simuladas
 */
export function simularImpactoPedido(
  items: ListaEquipoItem[],
  pedidoItems: Array<{ listaEquipoItemId: string; cantidad: number }>
): ListaEquipoItem[] {
  return items.map(item => {
    const pedidoItem = pedidoItems.find(p => p.listaEquipoItemId === item.id)
    if (pedidoItem) {
      return {
        ...item,
        cantidadPedida: (item.cantidadPedida || 0) + pedidoItem.cantidad,
      }
    }
    return item
  })
}