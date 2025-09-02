// ===================================================
// 📁 Archivo: costoCalculations.ts
// 📌 Ubicación: src/lib/utils/
// 🔧 Descripción: Utilidades para cálculos de costos unificados
// ===================================================

import type { ListaEquipoItem } from '@/types'

/**
 * ✅ Calculates the cost of an item using a unified approach
 * Priority: costoElegido > cotizacionSeleccionada.precioUnitario * cantidad
 * 
 * @param item - The ListaEquipoItem to calculate cost for
 * @returns The calculated cost or 0 if no cost data available
 */
export function calcularCostoItem(item: ListaEquipoItem): number {
  // 🔁 Priority 1: Use costoElegido if available
  if (item.costoElegido !== null && item.costoElegido !== undefined) {
    return item.costoElegido
  }
  
  // 🔁 Priority 2: Calculate from cotizacionSeleccionada
  if (item.cotizacionSeleccionada?.precioUnitario && item.cantidad) {
    return item.cotizacionSeleccionada.precioUnitario * item.cantidad
  }
  
  // 🔁 Fallback: return 0
  return 0
}

/**
 * ✅ Formats currency amount to USD display format
 * 
 * @param amount - The amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * ✅ Calculates total cost for an array of items
 * 
 * @param items - Array of ListaEquipoItem to sum costs for
 * @returns Total cost sum
 */
export function calcularCostoTotal(items: ListaEquipoItem[]): number {
  return items.reduce((sum, item) => sum + calcularCostoItem(item), 0)
}