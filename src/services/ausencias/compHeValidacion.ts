/**
 * Lógica pura para COMP_HE (Compensación de Horas Extras).
 * COMP_HE opera en HORAS, no en días. Los campos diasXxx del modelo
 * SaldoAusencia almacenan horas cuando tipoAusencia.codigo === 'COMP_HE'.
 */

export const HORAS_POR_DIA_COMP_HE = 9.5

export function calcularHorasRequeridas(diasHabiles: number): number {
  return diasHabiles * HORAS_POR_DIA_COMP_HE
}

export interface ValidacionCompHeResult {
  ok: boolean
  horasRequeridas: number
  mensaje?: string
}

/**
 * Valida si hay suficiente saldo en horas para una solicitud COMP_HE.
 * @param saldoHorasDisponibles - diasDisponibles del SaldoAusencia (interpretado como horas)
 * @param diasHabiles - días hábiles calculados de la solicitud
 */
export function validarSaldoCompHe(
  saldoHorasDisponibles: number,
  diasHabiles: number,
): ValidacionCompHeResult {
  const horasRequeridas = calcularHorasRequeridas(diasHabiles)
  if (saldoHorasDisponibles < horasRequeridas) {
    return {
      ok: false,
      horasRequeridas,
      mensaje: `Saldo insuficiente: tienes ${saldoHorasDisponibles}h, necesitas ${horasRequeridas}h (${diasHabiles} día${diasHabiles !== 1 ? 's' : ''})`,
    }
  }
  return { ok: true, horasRequeridas }
}

/**
 * Formatea un valor de saldo según si es COMP_HE (horas) o un tipo normal (días).
 */
export function formatearSaldo(valor: number, codigo: string): string {
  return codigo === 'COMP_HE' ? `${valor}h` : `${valor}d`
}

/**
 * Calcula cuántos días compensables completos tiene disponibles un empleado.
 * floor porque solo se permiten bloques de día completo.
 */
export function diasCompensablesDisponibles(horasDisponibles: number): number {
  return Math.floor(horasDisponibles / HORAS_POR_DIA_COMP_HE)
}
