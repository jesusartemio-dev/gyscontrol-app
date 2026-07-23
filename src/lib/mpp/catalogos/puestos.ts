export const PUESTOS_MPP = [
  'Ing. Supervisor de Proyecto',
  'Ingeniero de seguridad',
  'Ing. Programador',
  'Técnico instrumentista',
  'Técnico Electrónico',
  'Sup. De Andamio',
  'Técnico Andamiero',
  'Operador de manlift',
  'Soldador',
  'Técnico Auxiliar',
] as const

export type PuestoMpp = (typeof PUESTOS_MPP)[number]

/**
 * `Mpp.puestos` vacío (MPPs creadas antes de esta migración) cae al catálogo
 * fijo — único punto de esta regla, reusado por la tabla, la IA y el export.
 */
export function resolverPuestosMpp(puestos: string[]): string[] {
  return puestos.length > 0 ? puestos : [...PUESTOS_MPP]
}
