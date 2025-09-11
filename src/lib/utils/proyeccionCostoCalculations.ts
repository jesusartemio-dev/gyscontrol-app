// ===================================================
// 📁 Archivo: proyeccionCostoCalculations.ts
// 📌 Ubicación: src/lib/utils/
// 🔧 Descripción: Utilidades para cálculos de costos de proyección
// ===================================================

/**
 * Interface for ListaProyeccionItem cost calculation
 */
export interface ListaProyeccionItem {
  id: string
  codigo: string
  descripcion: string
  cantidad: number
  unidad: string
  costoElegido?: number
  cotizacionSeleccionada?: {
    precioUnitario: number
  }
  catalogoEquipo?: {
    precioVenta: number
  }
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  fechaNecesaria?: Date
  estado: 'borrador' | 'cotizado' | 'aprobado'
}

/**
 * ✅ Calculates the cost of a projection item using a unified approach
 * Priority: costoElegido > cotizacionSeleccionada.precioUnitario * cantidad > catalogoEquipo.precioVenta * cantidad
 * 
 * @param item - The ListaProyeccionItem to calculate cost for
 * @returns The calculated cost or 0 if no cost data available
 */
export function calcularCostoProyeccionItem(item: ListaProyeccionItem): number {
  // 🔁 Priority 1: Use costoElegido if available
  if (item.costoElegido !== null && item.costoElegido !== undefined) {
    return item.costoElegido
  }
  
  // 🔁 Priority 2: Calculate from cotizacionSeleccionada
  if (item.cotizacionSeleccionada?.precioUnitario && item.cantidad) {
    return item.cotizacionSeleccionada.precioUnitario * item.cantidad
  }
  
  // 🔁 Priority 3: Use catalogoEquipo price
  if (item.catalogoEquipo?.precioVenta && item.cantidad) {
    return item.catalogoEquipo.precioVenta * item.cantidad
  }
  
  // 🔁 Fallback: return 0
  return 0
}

/**
 * ✅ Calculates the unit cost of a projection item
 * 
 * @param item - The ListaProyeccionItem to calculate unit cost for
 * @returns The calculated unit cost or 0 if no cost data available or quantity is zero
 */
export function calcularCostoUnitarioProyeccion(item: ListaProyeccionItem): number {
  if (item.cantidad <= 0) return 0
  
  const costoTotal = calcularCostoProyeccionItem(item)
  return costoTotal / item.cantidad
}

/**
 * ✅ Calculates total cost for an array of projection items
 * 
 * @param items - Array of ListaProyeccionItem to sum costs for
 * @returns Total cost sum
 */
export function calcularCostoTotalProyeccion(items: ListaProyeccionItem[]): number {
  return items.reduce((sum, item) => sum + calcularCostoProyeccionItem(item), 0)
}

/**
 * ✅ Gets the cost source for a projection item (for debugging/display purposes)
 * 
 * @param item - The ListaProyeccionItem to analyze
 * @returns String indicating the cost source
 */
export function obtenerFuenteCosto(item: ListaProyeccionItem): string {
  if (item.costoElegido !== null && item.costoElegido !== undefined) {
    return 'costoElegido'
  }
  
  if (item.cotizacionSeleccionada?.precioUnitario && item.cantidad) {
    return 'cotizacionSeleccionada'
  }
  
  if (item.catalogoEquipo?.precioVenta && item.cantidad) {
    return 'catalogoEquipo'
  }
  
  return 'sin_costo'
}

/**
 * ✅ Validates if a projection item has valid cost data
 * 
 * @param item - The ListaProyeccionItem to validate
 * @returns Boolean indicating if the item has valid cost data
 */
export function tieneDataCostoValida(item: ListaProyeccionItem): boolean {
  return calcularCostoProyeccionItem(item) > 0
}
