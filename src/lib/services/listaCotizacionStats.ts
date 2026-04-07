// ===================================================
// 📁 Archivo: listaCotizacionStats.ts
// 📌 Descripción: Utilidades para calcular estadísticas de cotización de listas
// 📌 Propósito: Proporcionar métricas de cotización para la tabla de listas
// ✍️ Autor: Sistema GYS
// 📅 Actualizado: 2025-01-27
// ===================================================

import type { ListaEquipo } from '@/types'

export interface ListaCotizacionStats {
  cotizacionesCount: number      // Número de cotizaciones activas
  itemsCotizados: number         // Items que tienen al menos una cotización
  totalItems: number            // Total de items en la lista
  todosCotizados: boolean       // true si todos los items tienen cotización
  porcentajeCotizado: number    // Porcentaje de items cotizados (0-100)
}

/**
 * Calcula las estadísticas de cotización para una lista de equipos
 */
export function calcularStatsCotizacionLista(lista: ListaEquipo): ListaCotizacionStats {
  let totalItems = lista.listaEquipoItem?.length || 0

  // Calcular items que tienen al menos una cotización
  // La relación en Prisma se llama cotizacionProveedorItems
  let itemsCotizados = lista.listaEquipoItem?.filter(item =>
    ((item as any).cotizacionProveedorItems?.length > 0) || (item.cotizaciones && item.cotizaciones.length > 0)
  ).length || 0

  // Incluir cotizaciones directamente en la lista si no hay items
  const listaCotizaciones = (lista as any).cotizaciones || []
  const hasListaCotizaciones = listaCotizaciones.length > 0

  if (totalItems === 0 && hasListaCotizaciones) {
    totalItems = 1
    itemsCotizados = 1
  }

  // Calcular número de cotizaciones activas
  const allCotizaciones = [
    ...(lista.listaEquipoItem?.flatMap(item => (item as any).cotizacionProveedorItems || item.cotizaciones || []) || []),
    ...listaCotizaciones
  ]
  const cotizacionesCount = allCotizaciones.length

  const todosCotizados = itemsCotizados === totalItems
  const porcentajeCotizado = totalItems > 0 ? Math.round((itemsCotizados / totalItems) * 100) : 0

  return {
    cotizacionesCount,
    itemsCotizados,
    totalItems,
    todosCotizados,
    porcentajeCotizado
  }
}

/**
 * Obtiene el texto del badge para el estado de cotización
 */
export function getEstadoCotizacionText(stats: ListaCotizacionStats): string {
  if (stats.totalItems === 0) {
    return 'Sin items'
  }

  if (stats.todosCotizados) {
    return 'Cotizado'
  }

  if (stats.itemsCotizados > 0) {
    return 'Parcialmente cotizado'
  }

  return 'Sin cotizar'
}

/**
 * Obtiene el variant del badge para el estado de cotización
 */
export function getEstadoCotizacionVariant(stats: ListaCotizacionStats): "default" | "secondary" | "destructive" | "outline" {
  if (stats.totalItems === 0) {
    return 'outline'
  }

  if (stats.todosCotizados) {
    return 'default' // Verde
  }

  if (stats.itemsCotizados > 0) {
    return 'secondary' // Amarillo/Orange
  }

  return 'destructive' // Rojo
}
