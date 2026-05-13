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
