/** hh(t): horas-hombre = horasEstimadas × personasEstimadas (default 1 si no está definido).
 *  Acepta any para compatibilidad con Prisma Decimal y campos tipados como unknown. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function hh(t: { horasEstimadas?: any; personasEstimadas?: any }): number {
  return (Number(t.horasEstimadas) || 0) * (Number(t.personasEstimadas) || 1)
}
