// ===================================================
// Single source of truth for ListaEquipo state machine
// Used by: ListaEstadoFlujoBanner, supervision page, logistica page, API route
// ===================================================

export type EstadoListaEquipo =
  | 'borrador'
  | 'enviada'
  | 'por_revisar'
  | 'por_cotizar'
  | 'por_validar'
  | 'por_aprobar'
  | 'aprobada'
  | 'rechazada'
  | 'completada'

export interface FlujoEstado {
  siguiente?: EstadoListaEquipo
  rechazar?: EstadoListaEquipo
  reset?: EstadoListaEquipo
  roles: string[]
}

export const flujoEstados: Record<EstadoListaEquipo, FlujoEstado> = {
  borrador:    { siguiente: 'por_revisar',                              roles: ['proyectos', 'admin'] },
  enviada:     { siguiente: 'por_revisar',                              roles: ['coordinador', 'admin'] },
  por_revisar: { siguiente: 'por_cotizar',  rechazar: 'rechazada',      roles: ['coordinador', 'admin'] },
  por_cotizar: { siguiente: 'por_validar',  rechazar: 'rechazada',      roles: ['logistico', 'admin'] },
  por_validar: { siguiente: 'por_aprobar',  rechazar: 'rechazada',      roles: ['gestor', 'admin'] },
  por_aprobar: { siguiente: 'aprobada',     rechazar: 'rechazada',      roles: ['gerente', 'admin'] },
  aprobada:    { siguiente: 'completada',   rechazar: 'rechazada',      roles: ['logistico', 'admin'] },
  rechazada:   { reset: 'borrador',                                     roles: ['proyectos', 'admin'] },
  completada:  {                                                        roles: [] },
}

export const estadosList: { key: EstadoListaEquipo; label: string }[] = [
  { key: 'borrador',    label: 'Borrador' },
  { key: 'por_revisar', label: 'Por revisar' },
  { key: 'por_cotizar', label: 'Por cotizar' },
  { key: 'por_validar', label: 'Por validar' },
  { key: 'por_aprobar', label: 'Por aprobar' },
  { key: 'aprobada',    label: 'Aprobada' },
  { key: 'rechazada',   label: 'Rechazada' },
  { key: 'enviada',     label: 'Enviada' },
  { key: 'completada',  label: 'Completada' },
]

export const estadoLabels: Record<string, string> = Object.fromEntries(
  estadosList.map(e => [e.key, e.label])
)

/**
 * Validates whether a state transition is allowed for a given role
 */
export function validarTransicion(
  estadoActual: string,
  nuevoEstado: string,
  rol: string
): { valido: boolean; error?: string } {
  const flujo = flujoEstados[estadoActual as EstadoListaEquipo]
  if (!flujo) {
    return { valido: false, error: `Estado actual '${estadoActual}' no reconocido` }
  }

  if (!flujo.roles.includes(rol) && rol !== 'admin') {
    return { valido: false, error: `Rol '${rol}' no tiene permiso para cambiar desde '${estadoActual}'` }
  }

  const esAvance = flujo.siguiente === nuevoEstado
  const esRechazo = flujo.rechazar === nuevoEstado
  const esReset = flujo.reset === nuevoEstado

  if (!esAvance && !esRechazo && !esReset) {
    return { valido: false, error: `Transición de '${estadoActual}' a '${nuevoEstado}' no es válida` }
  }

  return { valido: true }
}

/**
 * Maps state transitions to the corresponding date fields to update
 */
export function getFechasPorTransicion(nuevoEstado: EstadoListaEquipo): Record<string, Date> {
  const now = new Date()
  switch (nuevoEstado) {
    case 'por_revisar':  return { fechaEnvioRevision: now }
    case 'por_cotizar':  return { fechaEnvioLogistica: now, fechaInicioCotizacion: now }
    case 'por_validar':  return { fechaFinCotizacion: now }
    case 'por_aprobar':  return { fechaValidacion: now }
    case 'aprobada':     return { fechaAprobacionRevision: now }
    case 'completada':   return { fechaAprobacionFinal: now }
    case 'rechazada':    return {}
    default:             return {}
  }
}
