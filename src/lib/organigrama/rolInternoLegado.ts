import type { RolPersonalProyecto } from '@prisma/client'

/**
 * `PersonalProyecto.rol` quedó obsoleto cuando llegó el catálogo de puestos: el
 * puesto dice el nombre real ("Técnico Electrotecnia") y es lo que ven el cliente,
 * el organigrama y los reportes. La columna sigue existiendo porque es NOT NULL y
 * quitarla es otra migración, pero ya nadie la lee.
 *
 * Se deriva del puesto para no pedirle al usuario un dato que no decide nada.
 * Si algún día se elimina la columna, este módulo se borra con ella.
 */
export function rolInternoDesdePuesto(puesto: {
  nombre: string
  rolFuncional: string | null
  categoria: string | null
}): RolPersonalProyecto {
  const nombre = puesto.nombre.toLowerCase()

  if (puesto.rolFuncional === 'cadista' || nombre.includes('cadista')) return 'cadista'
  if (nombre.includes('programador')) return 'programador'

  switch (puesto.categoria) {
    case 'campo':
      return nombre.includes('supervisor') ? 'lider' : 'tecnico'
    case 'seguridad':
      return 'ingeniero'
    case 'ingenieria':
      return 'ingeniero'
    case 'gestion':
    case 'direccion':
      return 'coordinador'
    case 'soporte':
      return 'asistente'
    default:
      return 'tecnico'
  }
}
