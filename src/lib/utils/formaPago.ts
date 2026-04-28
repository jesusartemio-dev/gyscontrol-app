/**
 * Helpers y constantes para los 3 campos de pago:
 *   - condicionPago: cuándo se paga
 *   - formaPago: cómo se paga
 *   - diasCredito: cuántos días (solo si condicionPago = 'credito')
 */

export const CONDICIONES_PAGO = [
  { value: 'contado', label: 'Contado' },
  { value: 'credito', label: 'Crédito' },
  { value: 'adelanto', label: 'Adelanto' },
] as const

export const FORMAS_PAGO = [
  { value: 'transferencia', label: 'Transferencia bancaria' },
  { value: 'factura', label: 'Factura' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'letra', label: 'Letra' },
  { value: 'factura_negociable', label: 'Factura negociable' },
  { value: 'otro', label: 'Otro' },
] as const

export const DIAS_CREDITO_PRESETS = [7, 15, 30, 45, 60, 90] as const

export type CondicionPago = typeof CONDICIONES_PAGO[number]['value']
export type FormaPago = typeof FORMAS_PAGO[number]['value']

/**
 * Indica si la forma de pago seleccionada normalmente requiere días de crédito.
 */
export function formaRequiereDias(forma: string | null | undefined): boolean {
  return ['factura', 'cheque', 'letra', 'factura_negociable'].includes(forma ?? '')
}

/**
 * Etiquetas legibles para los valores guardados.
 */
export function labelCondicion(value: string | null | undefined): string {
  return CONDICIONES_PAGO.find(c => c.value === value)?.label ?? value ?? '—'
}

export function labelForma(value: string | null | undefined): string {
  return FORMAS_PAGO.find(f => f.value === value)?.label ?? value ?? ''
}

/**
 * Texto completo para mostrar en UI/PDFs/exportes:
 *   formatPago('contado', 'transferencia') → "Contado vía Transferencia bancaria"
 *   formatPago('credito', 'factura', 30)   → "Crédito 30 días vía Factura"
 *   formatPago('adelanto', 'transferencia') → "Adelanto vía Transferencia bancaria"
 *   formatPago('contado', null) → "Contado"
 */
export function formatPago(
  condicion: string | null | undefined,
  forma: string | null | undefined,
  diasCredito: number | null | undefined
): string {
  const cond = labelCondicion(condicion)
  const fma = forma ? labelForma(forma) : ''

  if (condicion === 'credito' && diasCredito && diasCredito > 0) {
    return fma ? `Crédito ${diasCredito} días vía ${fma}` : `Crédito ${diasCredito} días`
  }
  return fma ? `${cond} vía ${fma}` : cond
}

/**
 * Migración: parsea valores legacy del campo condicionPago (string libre)
 * a los 3 campos nuevos. Casos cubiertos:
 *   "Contado"         → { condicion:'contado',  forma: null,             dias: null }
 *   "Adelanto"        → { condicion:'adelanto', forma: 'transferencia',  dias: null }
 *   "credito_30"      → { condicion:'credito',  forma: 'factura',        dias: 30 }
 *   "Factura 30 días" → { condicion:'credito',  forma: 'factura',        dias: 30 }
 *   "Cheque 15 días"  → { condicion:'credito',  forma: 'cheque',         dias: 15 }
 *   "Letra 60 días"   → { condicion:'credito',  forma: 'letra',          dias: 60 }
 *   <otro>            → mantiene condicion='contado', forma=null
 */
export function parsePagoLegacy(legacyCondicion: string | null | undefined, legacyDias: number | null | undefined): {
  condicion: string
  forma: string | null
  dias: number | null
} {
  if (!legacyCondicion) {
    return { condicion: 'contado', forma: null, dias: legacyDias ?? null }
  }
  const lower = legacyCondicion.toLowerCase().trim()

  if (lower === 'contado') {
    return { condicion: 'contado', forma: null, dias: null }
  }
  if (lower === 'adelanto' || lower.startsWith('adelanto')) {
    return { condicion: 'adelanto', forma: 'transferencia', dias: null }
  }
  // credito_NN
  const matchCreditoNN = lower.match(/^credito_(\d+)$/)
  if (matchCreditoNN) {
    return { condicion: 'credito', forma: 'factura', dias: Number(matchCreditoNN[1]) }
  }
  if (lower === 'credito') {
    return { condicion: 'credito', forma: 'factura', dias: legacyDias ?? null }
  }
  // "Factura 30 días", "Cheque 15 días", "Letra 60 días"
  const matchPattern = lower.match(/^(factura|cheque|letra)\s+(\d+)\s+d[ií]as?$/i)
  if (matchPattern) {
    return { condicion: 'credito', forma: matchPattern[1].toLowerCase(), dias: Number(matchPattern[2]) }
  }
  // Solo nombre de forma sin días
  if (['factura', 'cheque', 'letra', 'transferencia', 'factura_negociable'].includes(lower)) {
    return { condicion: 'credito', forma: lower, dias: legacyDias ?? null }
  }

  // Caso desconocido: lo dejamos como contado y guardamos el original como forma 'otro'
  return { condicion: 'contado', forma: 'otro', dias: null }
}
