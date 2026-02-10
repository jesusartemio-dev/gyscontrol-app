// ===================================================
// Single source of truth for PedidoEquipo state machine
// Used by: PedidoEstadoFlujoBanner, supervision page, logistica page, API route
// ===================================================

export type EstadoPedidoEquipo =
  | 'borrador'
  | 'enviado'
  | 'atendido'
  | 'parcial'
  | 'entregado'
  | 'cancelado'

export interface FlujoPedidoEstado {
  siguiente?: EstadoPedidoEquipo
  cancelar?: EstadoPedidoEquipo
  roles: string[]
}

export const flujoEstadosPedido: Record<EstadoPedidoEquipo, FlujoPedidoEstado> = {
  borrador:   { siguiente: 'enviado',    cancelar: 'cancelado', roles: ['proyectos', 'admin'] },
  enviado:    { siguiente: 'atendido',   cancelar: 'cancelado', roles: ['logistico', 'admin'] },
  atendido:   { siguiente: 'parcial',    cancelar: 'cancelado', roles: ['logistico', 'admin'] },
  parcial:    { siguiente: 'entregado',  cancelar: 'cancelado', roles: ['logistico', 'admin'] },
  entregado:  {                                                  roles: [] },
  cancelado:  {                                                  roles: [] },
}

export const estadosPedidoList: { key: EstadoPedidoEquipo; label: string }[] = [
  { key: 'borrador',   label: 'Borrador' },
  { key: 'enviado',    label: 'Enviado' },
  { key: 'atendido',   label: 'Atendido' },
  { key: 'parcial',    label: 'Parcial' },
  { key: 'entregado',  label: 'Entregado' },
  { key: 'cancelado',  label: 'Cancelado' },
]

export const estadoPedidoLabels: Record<string, string> = Object.fromEntries(
  estadosPedidoList.map(({ key, label }) => [key, label])
)

/**
 * Validates whether a state transition is allowed for the given role.
 * Returns `{ valido: true }` if the transition is permitted,
 * or `{ valido: false, error: '...' }` otherwise.
 */
export function validarTransicionPedido(
  estadoActual: string,
  nuevoEstado: string,
  rol: string
): { valido: boolean; error?: string } {
  const flujo = flujoEstadosPedido[estadoActual as EstadoPedidoEquipo]

  if (!flujo) {
    return { valido: false, error: `Estado actual "${estadoActual}" no reconocido` }
  }

  // Check if the transition target matches any allowed path
  const esTransicionValida =
    flujo.siguiente === nuevoEstado || flujo.cancelar === nuevoEstado

  if (!esTransicionValida) {
    return {
      valido: false,
      error: `No se puede pasar de "${estadoPedidoLabels[estadoActual]}" a "${estadoPedidoLabels[nuevoEstado]}"`,
    }
  }

  // Check role permission
  if (!flujo.roles.includes(rol)) {
    return {
      valido: false,
      error: `El rol "${rol}" no tiene permiso para cambiar el estado desde "${estadoPedidoLabels[estadoActual]}"`,
    }
  }

  return { valido: true }
}

/**
 * Returns the date fields that should be updated when transitioning to the given state.
 * The returned object can be spread directly into a Prisma update call.
 */
export function getFechasPorTransicionPedido(
  nuevoEstado: EstadoPedidoEquipo
): Record<string, Date> {
  const now = new Date()

  switch (nuevoEstado) {
    case 'enviado':
      return { fechaPedido: now }
    case 'entregado':
      return { fechaEntregaReal: now }
    default:
      return {}
  }
}
