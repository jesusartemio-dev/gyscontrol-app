/**
 * Draft liviano del Paso 1 del wizard de cronograma, guardado en
 * localStorage antes de que exista un borrador en BD (generacionId aún
 * null) — sobrevive a un cierre accidental del modal.
 */
export interface BorradorLocalPaso1 {
  schemaVersion: number
  edtsSeleccionados: string[]
  brownfield: boolean
  ingenieriaDetalle: boolean
  tableros: { nombre: string }[]
  plcs: { nombre: string }[]
  hmiCantidad: number
  scada: boolean
  nValorizaciones: number
  duracionSemanas: number
  nPersonas: number
  nPets: number
  alcanceLibre: string
}

// Se incrementa cada vez que cambia la forma de BorradorLocalPaso1 — un
// draft guardado con una versión distinta se descarta en vez de restaurarse
// a medias (hubo varios cambios estructurales y va a seguir habiendo más).
export const BORRADOR_LOCAL_PASO1_VERSION = 1

export function claveBorradorLocalPaso1(proyectoId: string) {
  return `cronograma-wizard-paso1:${proyectoId}`
}

/**
 * Descarta cualquier draft corrupto, de un schemaVersion viejo, o vacío
 * (cero EDTs marcados) — nunca se restaura "nada" como si fuera una
 * decisión real del usuario.
 */
export function esBorradorLocalValido(valor: unknown): valor is BorradorLocalPaso1 {
  if (!valor || typeof valor !== 'object') return false
  const b = valor as Partial<BorradorLocalPaso1>
  return (
    b.schemaVersion === BORRADOR_LOCAL_PASO1_VERSION &&
    Array.isArray(b.edtsSeleccionados) &&
    b.edtsSeleccionados.length > 0
  )
}
