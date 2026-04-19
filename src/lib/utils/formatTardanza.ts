/**
 * Formatea minutos a "Xh YYmin" o "YY min" según corresponda.
 */
export function formatearTardanza(minutos: number): string {
  if (minutos < 60) return `${minutos} min`
  const h = Math.floor(minutos / 60)
  const m = minutos % 60
  if (m === 0) return `${h}h`
  return `${h}h ${String(m).padStart(2, '0')}min`
}
