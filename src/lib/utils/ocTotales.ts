// ===================================================
// Archivo: src/lib/utils/ocTotales.ts
// Descripción: Cálculo centralizado de subtotal/igv/total de una OC
// ===================================================

const TASA_IGV = 0.18

export function calcularTotalesOC(subtotal: number, aplicaIgv: boolean) {
  const igv = aplicaIgv ? subtotal * TASA_IGV : 0
  const total = subtotal + igv
  return { subtotal, igv, total }
}
