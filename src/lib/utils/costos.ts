// ===================================================
// 📁 Archivo: costos.ts
// 📌 Ubicación: src/lib/utils/costos.ts
// 🔧 Descripción: Funciones utilitarias para cálculo de subtotales y totales
//
// 🧠 Uso: Reutilizado en recalculo de plantillas y cotizaciones
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-06-03
// ===================================================

/**
 * Calcula los subtotales interno y cliente de un arreglo de ítems.
 * Si los ítems tienen precioInterno, margen y cantidad, calcula sin redondeo intermedio (como Excel).
 * De lo contrario, suma los costoInterno y costoCliente ya calculados.
 *
 * @param items Lista de ítems
 * @returns Subtotales: subtotalInterno y subtotalCliente
 */
export function calcularSubtotal(
  items: {
    costoInterno: number
    costoCliente: number
    precioInterno?: number
    margen?: number | null
    cantidad?: number
  }[]
): { subtotalInterno: number; subtotalCliente: number } {
  // Si los items tienen los campos necesarios, calcular sin redondeo intermedio (como Excel)
  const tieneFieldsParaCalculo = items.length > 0 && items.every(
    item => item.precioInterno !== undefined && item.cantidad !== undefined
  )

  if (tieneFieldsParaCalculo) {
    const subtotalInterno = Math.round(
      items.reduce((sum, item) => sum + (item.precioInterno ?? 0) * (item.cantidad ?? 0), 0) * 100
    ) / 100

    const subtotalCliente = Math.round(
      items.reduce((sum, item) => {
        const margen = item.margen ?? 0.15
        return sum + (item.precioInterno ?? 0) * (1 + margen) * (item.cantidad ?? 0)
      }, 0) * 100
    ) / 100

    return { subtotalInterno, subtotalCliente }
  }

  // Fallback: sumar valores ya redondeados
  return {
    subtotalInterno: items.reduce((sum, item) => sum + item.costoInterno, 0),
    subtotalCliente: items.reduce((sum, item) => sum + item.costoCliente, 0),
  }
}

/**
 * Calcula los totales generales de una plantilla o cotización combinando equipos, servicios y gastos.
 * Cada grupo debe tener los campos `subtotalInterno` y `subtotalCliente`.
 *
 * @param param0 Objeto con listas de equipos, servicios y gastos
 * @returns Totales: totalInterno y totalCliente
 */
export function calcularTotal({
  equipos = [],
  servicios = [],
  gastos = [],
}: {
  equipos?: { subtotalCliente: number; subtotalInterno: number }[]
  servicios?: { subtotalCliente: number; subtotalInterno: number }[]
  gastos?: { subtotalCliente: number; subtotalInterno: number }[]
}): { totalInterno: number; totalCliente: number } {
  const totalInterno =
    equipos.reduce((acc, eq) => acc + eq.subtotalInterno, 0) +
    servicios.reduce((acc, sv) => acc + sv.subtotalInterno, 0) +
    gastos.reduce((acc, gs) => acc + gs.subtotalInterno, 0)

  const totalCliente =
    equipos.reduce((acc, eq) => acc + eq.subtotalCliente, 0) +
    servicios.reduce((acc, sv) => acc + sv.subtotalCliente, 0) +
    gastos.reduce((acc, gs) => acc + gs.subtotalCliente, 0)

  return { totalInterno, totalCliente }
}

/**
 * Calcula el total cliente a partir de un arreglo de equipos.
 */
export function calcularTotalEquipos(
  equipos: { subtotalCliente?: number }[]
): number {
  return equipos.reduce((acc, eq) => acc + (eq.subtotalCliente || 0), 0)
}

/**
 * Calcula el total cliente a partir de un arreglo de servicios.
 */
export function calcularTotalServicios(
  servicios: { subtotalCliente?: number }[]
): number {
  return servicios.reduce((acc, sv) => acc + (sv.subtotalCliente || 0), 0)
}

/**
 * Calcula el total cliente a partir de un arreglo de gastos.
 */
export function calcularTotalGastos(
  gastos: { subtotalCliente?: number }[]
): number {
  return gastos.reduce((acc, g) => acc + (g.subtotalCliente || 0), 0)
}
