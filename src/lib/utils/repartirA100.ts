/**
 * Redondea un set de porcentajes (que en teoría suman 100) a `decimales`, ajustando por el
 * método del RESTO MAYOR para que la suma de los valores mostrados sea EXACTAMENTE 100.
 *
 * Evita el típico "99.9%" por redondeo: reparte el sobrante/faltante de a una unidad del
 * último decimal a las filas con mayor (o menor) parte decimal.
 *
 * Ej: [33.333, 33.333, 33.333] con 2 decimales -> [33.34, 33.33, 33.33] (suma 100.00).
 */
export function repartirA100(valores: number[], decimales = 1): number[] {
  if (valores.length === 0) return []
  const factor = 10 ** decimales
  const escalados = valores.map((v) => v * factor)
  const pisos = escalados.map((e) => Math.floor(e))
  const objetivo = Math.round(100 * factor)
  let resto = objetivo - pisos.reduce((s, p) => s + p, 0) // cuántas unidades faltan repartir

  const out = pisos.slice()
  // índices ordenados por mayor parte decimal (para sumar) — el mismo orden invertido sirve para restar
  const orden = escalados
    .map((e, i) => ({ i, frac: e - pisos[i] }))
    .sort((a, b) => b.frac - a.frac)
    .map((x) => x.i)

  if (resto > 0) {
    for (let k = 0; k < resto && k < orden.length; k++) out[orden[k]] += 1
  } else if (resto < 0) {
    // sobra: quitar de las de menor parte decimal
    for (let k = 0; k < -resto && k < orden.length; k++) out[orden[orden.length - 1 - k]] -= 1
  }

  return out.map((v) => v / factor)
}
