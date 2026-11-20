/**
 * El precio de una cotización de proveedor se guarda en la moneda en que el
 * proveedor cotizó. Las listas y los pedidos, en cambio, llevan todo en USD.
 *
 * Toda ruta que copie un precio de una cotización hacia una lista o un pedido
 * tiene que pasar por acá. Cuando no se hacía, el número en soles terminaba
 * guardado como si fueran dólares: la lista mostraba 3.5 veces el precio real.
 */

/** Lo mínimo que hace falta saber de la cotización para convertir. */
export interface MonedaCotizacion {
  moneda?: string | null
  tipoCambio?: number | null
}

export class FaltaTipoCambioError extends Error {
  constructor(public readonly moneda: string) {
    super(
      `La cotización está en ${moneda} pero no tiene tipo de cambio definido. ` +
      `Define el tipo de cambio en la cotización antes de seleccionarla.`,
    )
    this.name = 'FaltaTipoCambioError'
  }
}

/** Redondea a 4 decimales, que es la precisión con que se guardan los precios. */
const redondear = (n: number) => Math.round(n * 10000) / 10000

/**
 * Pasa un monto de la moneda de la cotización a USD.
 *
 * Lanza `FaltaTipoCambioError` si la cotización no está en USD y no trae tipo
 * de cambio: sin él no hay forma de convertir, y guardar el monto tal cual
 * sería guardar soles diciendo que son dólares.
 */
export function aUsd(monto: number | null | undefined, cot: MonedaCotizacion | null | undefined): number {
  const valor = monto ?? 0
  const moneda = cot?.moneda ?? 'USD'
  if (moneda === 'USD') return valor
  if (valor === 0) return 0

  const tc = cot?.tipoCambio ?? null
  if (!tc || tc <= 0) throw new FaltaTipoCambioError(moneda)

  // PEN → USD divide (3.5 soles por dólar); EUR → USD multiplica (1.08 dólares por euro).
  return redondear(moneda === 'EUR' ? valor * tc : valor / tc)
}

/** `true` si el monto guardado quedó sin convertir (está en la moneda original). */
export function quedoSinConvertir(
  guardado: number | null | undefined,
  original: number | null | undefined,
  cot: MonedaCotizacion | null | undefined,
): boolean {
  const moneda = cot?.moneda ?? 'USD'
  if (moneda === 'USD') return false
  if (!guardado || !original) return false
  return Math.abs(guardado - original) < 0.01
}
