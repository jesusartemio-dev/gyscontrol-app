// ===================================================
// 📁 Archivo: recalculoCatalogoEquipo.ts
// 📌 Ubicación: src/lib/utils/
// 🔧 Descripción: Funciones de recalculo específicas para entidades CatalogoEquipo.
// 🧠 Uso: Cálculo de precios basado en precioLista, factorCosto y factorVenta.
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2026-02-12
// ===================================================

/**
 * Calcula el precio interno basado en precio de lista y factor de costo.
 * @param precioLista precio de lista del proveedor
 * @param factorCosto multiplicador de costo (ej. 1.00, 1.10)
 * @returns número redondeado a 2 decimales
 */
export function calcularPrecioInterno(precioLista: number, factorCosto: number): number {
  return +(precioLista * factorCosto).toFixed(2)
}

/**
 * Calcula el precio de venta basado en precio interno y factor de venta.
 * @param precioInterno costo interno del equipo
 * @param factorVenta multiplicador de venta (ej. 1.15 para 15% margen)
 * @returns número redondeado a 2 decimales
 */
export function calcularPrecioVenta(precioInterno: number, factorVenta: number): number {
  return +(precioInterno * factorVenta).toFixed(2)
}

/**
 * Recalcula una lista completa de equipos actualizando precioInterno y precioVenta.
 * @param equipos lista de equipos con precioLista, factorCosto y factorVenta
 * @returns nueva lista con precios recalculados
 */
export function recalcularListaEquipo<T extends { precioLista: number; factorCosto: number; factorVenta: number } & Record<string, any>>(
  equipos: T[]
): T[] {
  return equipos.map(eq => {
    const precioInterno = calcularPrecioInterno(eq.precioLista, eq.factorCosto)
    return {
      ...eq,
      precioInterno,
      precioVenta: calcularPrecioVenta(precioInterno, eq.factorVenta),
    }
  })
}

/**
 * Recalcula un solo equipo actualizando precioInterno y precioVenta.
 * @param equipo objeto individual de equipo
 * @returns equipo con precios recalculados
 */
export function recalcularCatalogoEquipo<T extends { precioLista: number; factorCosto: number; factorVenta: number } & Record<string, any>>(
  equipo: T
): T {
  const precioInterno = calcularPrecioInterno(equipo.precioLista, equipo.factorCosto)
  return {
    ...equipo,
    precioInterno,
    precioVenta: calcularPrecioVenta(precioInterno, equipo.factorVenta),
  }
}
