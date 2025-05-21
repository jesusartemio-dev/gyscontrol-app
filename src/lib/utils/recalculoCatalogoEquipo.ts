// ===================================================
// 📁 Archivo: recalculoCatalogoEquipo.ts
// 📌 Ubicación: src/lib/utils/
// 🔧 Descripción: Funciones de recalculo específicas para entidades CatalogoEquipo.
// 🧠 Uso: Cálculo de precio de venta basado en precio interno y margen; recálculo de listas completas.
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-04-25
// ===================================================

/**
 * Calcula el precio de venta basado en precio interno y margen.
 * @param precioInterno número base del costo interno del equipo
 * @param margen decimal (ej. 0.25 para 25%)
 * @returns número redondeado a 2 decimales
 */
export function calcularPrecioVenta(precioInterno: number, margen: number): number {
  return +(precioInterno * (1 + margen)).toFixed(2)
}

/**
 * Recalcula una lista completa de equipos actualizando su precio de venta.
 * @param equipos lista de equipos con precioInterno y margen
 * @returns nueva lista con precios de venta recalculados
 */
export function recalcularListaEquipo<T extends { precioInterno: number; margen: number } & Record<string, any>>(
  equipos: T[]
): T[] {
  return equipos.map(eq => ({
    ...eq,
    precioVenta: calcularPrecioVenta(eq.precioInterno, eq.margen),
  }))
}

/**
 * Recalcula un solo equipo actualizando su precio de venta.
 * @param equipo objeto individual de equipo
 * @returns equipo con precioVenta actualizado
 */
export function recalcularCatalogoEquipo<T extends { precioInterno: number; margen: number } & Record<string, any>>(
  equipo: T
): T {
  return {
    ...equipo,
    precioVenta: calcularPrecioVenta(equipo.precioInterno, equipo.margen),
  }
}
