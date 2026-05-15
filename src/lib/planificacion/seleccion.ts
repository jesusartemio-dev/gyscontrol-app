export interface CeldaSimple {
  tipo: 'proyecto' | 'ausencia'
}

export type SeleccionToggleResult =
  | { type: 'idle' }
  | { type: 'selected'; celdas: Set<string>; anchorUserId: string; anchorFecha: string }

/**
 * Pure toggle for Ctrl/Cmd+click multi-select.
 * Adds the key "userId|fecha" if absent; removes it if present.
 * Returns { type: 'idle' } when removing the last key empties the set.
 */
export function toggleCeldaEnSeleccion(
  prev: { type: string; celdas?: Set<string>; anchorUserId?: string; anchorFecha?: string },
  userId: string,
  fecha: string,
): SeleccionToggleResult {
  const key = `${userId}|${fecha}`
  if (prev.type === 'selected' && prev.celdas) {
    const next = new Set(prev.celdas)
    if (next.has(key)) next.delete(key)
    else next.add(key)
    return next.size > 0
      ? { type: 'selected', celdas: next, anchorUserId: prev.anchorUserId ?? userId, anchorFecha: prev.anchorFecha ?? fecha }
      : { type: 'idle' }
  }
  return { type: 'selected', celdas: new Set([key]), anchorUserId: userId, anchorFecha: fecha }
}

/**
 * Computes the set of selectable (empty) cell keys within a rectangular drag selection.
 * Keys are "userId|fecha". Only cells where getCeldasDia returns [] are included.
 *
 * The rectangle is defined by the two corners (origen/actual) — order does not matter.
 * orderedUserIds must match the visual row order in the grid.
 * fechas must match the visual column order in the grid (dateKeys).
 */
export function computeSeleccionRectangulo(
  origenUserId: string,
  origenFecha: string,
  actualUserId: string,
  actualFecha: string,
  orderedUserIds: string[],
  fechas: string[],
  getCeldasDia: (userId: string, fecha: string) => CeldaSimple[],
): Set<string> {
  const userIdxA = orderedUserIds.indexOf(origenUserId)
  const userIdxB = orderedUserIds.indexOf(actualUserId)
  const fechaIdxA = fechas.indexOf(origenFecha)
  const fechaIdxB = fechas.indexOf(actualFecha)

  if (userIdxA === -1 || userIdxB === -1 || fechaIdxA === -1 || fechaIdxB === -1) {
    return new Set()
  }

  const minUser = Math.min(userIdxA, userIdxB)
  const maxUser = Math.max(userIdxA, userIdxB)
  const minFecha = Math.min(fechaIdxA, fechaIdxB)
  const maxFecha = Math.max(fechaIdxA, fechaIdxB)

  const keys = new Set<string>()
  for (let ui = minUser; ui <= maxUser; ui++) {
    const userId = orderedUserIds[ui]
    for (let fi = minFecha; fi <= maxFecha; fi++) {
      const fecha = fechas[fi]
      if (getCeldasDia(userId, fecha).length === 0) {
        keys.add(`${userId}|${fecha}`)
      }
    }
  }
  return keys
}
