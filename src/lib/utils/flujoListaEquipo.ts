// ===================================================
// Single source of truth for ListaEquipo state machine
// Used by: ListaEstadoFlujoBanner, supervision page, logistica page, API route
// ===================================================

export type EstadoListaEquipo =
  | 'borrador'
  | 'por_revisar'
  | 'por_cotizar'
  | 'por_aprobar'
  | 'aprobada'
  | 'anulada'

export interface FlujoEstado {
  siguiente?: EstadoListaEquipo
  retroceder?: EstadoListaEquipo
  roles: string[]
}

export const flujoEstados: Record<EstadoListaEquipo, FlujoEstado> = {
  borrador:    { siguiente: 'por_revisar',                                roles: ['proyectos', 'admin'] },
  por_revisar: { siguiente: 'por_cotizar',  retroceder: 'borrador',      roles: ['coordinador', 'admin'] },
  por_cotizar: { siguiente: 'por_aprobar',  retroceder: 'por_revisar',   roles: ['logistico', 'coordinador_logistico', 'admin'] },
  por_aprobar: { siguiente: 'aprobada',     retroceder: 'por_cotizar',   roles: ['gestor', 'admin'] },
  aprobada:    {                                                          roles: [] },
  anulada:     {                                                          roles: [] },
}

// Roles que pueden anular una lista (desde cualquier estado excepto aprobada)
export const anulacionRoles = ['coordinador', 'coordinador_logistico', 'admin']

export const estadosList: { key: EstadoListaEquipo; label: string }[] = [
  { key: 'borrador',    label: 'Borrador' },
  { key: 'por_revisar', label: 'Por Revisar' },
  { key: 'por_cotizar', label: 'Por Cotizar' },
  { key: 'por_aprobar', label: 'Por Aprobar' },
  { key: 'aprobada',    label: 'Aprobada' },
  { key: 'anulada',     label: 'Anulada' },
]

// Solo los estados del flujo principal (sin anulada) para el stepper UI
export const estadosFlujoPrincipal: EstadoListaEquipo[] = [
  'borrador', 'por_revisar', 'por_cotizar', 'por_aprobar', 'aprobada'
]

export const estadoLabels: Record<string, string> = Object.fromEntries(
  estadosList.map(e => [e.key, e.label])
)

/**
 * Validates whether a state transition is allowed for a given role.
 * Supports: forward (siguiente), backward (retroceder), and annulation (anulada).
 */
export function validarTransicion(
  estadoActual: string,
  nuevoEstado: string,
  rol: string
): { valido: boolean; error?: string } {
  // Anulación: desde cualquier estado excepto aprobada y anulada
  if (nuevoEstado === 'anulada') {
    if (estadoActual === 'aprobada' || estadoActual === 'anulada') {
      return { valido: false, error: `No se puede anular una lista en estado '${estadoActual}'` }
    }
    if (!anulacionRoles.includes(rol) && rol !== 'admin') {
      return { valido: false, error: `Rol '${rol}' no tiene permiso para anular listas` }
    }
    return { valido: true }
  }

  const flujo = flujoEstados[estadoActual as EstadoListaEquipo]
  if (!flujo) {
    return { valido: false, error: `Estado actual '${estadoActual}' no reconocido` }
  }

  if (!flujo.roles.includes(rol) && rol !== 'admin') {
    return { valido: false, error: `Rol '${rol}' no tiene permiso para cambiar desde '${estadoActual}'` }
  }

  const esAvance = flujo.siguiente === nuevoEstado
  const esRetroceso = flujo.retroceder === nuevoEstado

  if (!esAvance && !esRetroceso) {
    return { valido: false, error: `Transición de '${estadoActual}' a '${nuevoEstado}' no es válida` }
  }

  return { valido: true }
}

/**
 * Check if a list can be annulled from its current state
 */
export function canAnular(estadoActual: string, rol: string): boolean {
  if (estadoActual === 'aprobada' || estadoActual === 'anulada') return false
  return anulacionRoles.includes(rol) || rol === 'admin'
}

/**
 * Returns what item editing operations are allowed based on lista estado
 */
export function getItemEditPermissions(listaEstado: EstadoListaEquipo) {
  switch (listaEstado) {
    case 'borrador':
      return { canAddItems: true, canDeleteItems: true, canEditItems: true, canReplaceItems: true, canVerify: false, canQuote: false }
    case 'por_revisar':
      return { canAddItems: false, canDeleteItems: false, canEditItems: false, canReplaceItems: false, canVerify: true, canQuote: false }
    case 'por_cotizar':
      return { canAddItems: false, canDeleteItems: false, canEditItems: false, canReplaceItems: false, canVerify: false, canQuote: true }
    default: // por_aprobar, aprobada, anulada
      return { canAddItems: false, canDeleteItems: false, canEditItems: false, canReplaceItems: false, canVerify: false, canQuote: false }
  }
}

/**
 * Maps state transitions to the corresponding date fields to update
 */
export function getFechasPorTransicion(nuevoEstado: EstadoListaEquipo): Record<string, Date> {
  const now = new Date()
  switch (nuevoEstado) {
    case 'por_revisar':  return { fechaEnvioRevision: now }
    case 'por_cotizar':  return { fechaEnvioLogistica: now, fechaInicioCotizacion: now }
    case 'por_aprobar':  return { fechaFinCotizacion: now }
    case 'aprobada':     return { fechaAprobacionFinal: now }
    case 'anulada':      return { fechaAnulacion: now }
    default:             return {}
  }
}
