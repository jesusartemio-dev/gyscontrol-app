// ===================================================
// 📁 Archivo: costos.ts
// 📌 Ubicación: src/lib/utils/costos.ts
// 🔧 Descripción: Funciones utilitarias para cálculo de subtotales y totales
//
// 🧠 Uso: Reutilizado en recalculo de plantillas y cotizaciones
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-04-23
// ===================================================

/**
 * Calcula los subtotales interno y cliente de un arreglo de ítems.
 * Cada ítem debe tener los campos: `costoInterno` y `costoCliente`.
 *
 * @param items Lista de ítems
 * @returns Subtotales: subtotalInterno y subtotalCliente
 */
export function calcularSubtotal(
  items: { costoInterno: number; costoCliente: number }[]
): { subtotalInterno: number; subtotalCliente: number } {
  return {
    subtotalInterno: items.reduce((sum, item) => sum + item.costoInterno, 0),
    subtotalCliente: items.reduce((sum, item) => sum + item.costoCliente, 0),
  }
}

/**
 * Calcula los totales generales de una plantilla o cotización combinando equipos y servicios.
 * Cada grupo debe tener los campos `subtotalInterno` y `subtotalCliente`.
 *
 * @param param0 Objeto con listas de equipos y servicios
 * @returns Totales: totalInterno y totalCliente
 */
export function calcularTotal({
  equipos = [],
  servicios = [],
  gastos = [], // ✅ añadido aquí
}: {
  equipos?: { subtotalCliente: number; subtotalInterno: number }[]
  servicios?: { subtotalCliente: number; subtotalInterno: number }[]
  gastos?: { subtotalCliente: number; subtotalInterno: number }[] // ✅ añadido aquí
}): { totalInterno: number; totalCliente: number } {
  const totalInterno =
    equipos.reduce((acc, eq) => acc + eq.subtotalInterno, 0) +
    servicios.reduce((acc, sv) => acc + sv.subtotalInterno, 0) +
    gastos.reduce((acc, gs) => acc + gs.subtotalInterno, 0) // ✅ suma de gastos

  const totalCliente =
    equipos.reduce((acc, eq) => acc + eq.subtotalCliente, 0) +
    servicios.reduce((acc, sv) => acc + sv.subtotalCliente, 0) +
    gastos.reduce((acc, gs) => acc + gs.subtotalCliente, 0) // ✅ suma de gastos

  return { totalInterno, totalCliente }
}


/**
 * Calcula el total solo para cliente a partir de un arreglo de equipos.
 */
export function calcularTotalEquipos(
  equipos: { subtotalCliente?: number }[]
): number {
  return equipos.reduce((acc, eq) => acc + (eq.subtotalCliente || 0), 0)
}

/**
 * Calcula el total solo para cliente a partir de un arreglo de servicios.
 */
export function calcularTotalServicios(
  servicios: { subtotalCliente?: number }[]
): number {
  return servicios.reduce((acc, sv) => acc + (sv.subtotalCliente || 0), 0)
}

export function calcularTotalGastos(
  gastos: { subtotalCliente?: number }[]
): number {
  return gastos.reduce((acc, g) => acc + (g.subtotalCliente || 0), 0)
}
