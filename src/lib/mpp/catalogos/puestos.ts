export const PUESTOS_MPP = [
  'Supervisor SSOMA',
  'Ingeniero de Proyectos',
  'Técnico Electricista',
  'Técnico Mecánico',
  'Operador de Equipos',
  'Soldador',
  'Rigger / Aparejador',
  'Ayudante de Obra',
  'Almacenero',
  'Conductor / Chofer',
] as const

export type PuestoMpp = (typeof PUESTOS_MPP)[number]
