/**
 * Calcula la amortización de adelanto para una valorización.
 *
 * El adelanto es un monto que el cliente pagó por anticipado y se descuenta
 * progresivamente de cada valorización hasta agotarse.
 */
export function calcularAdelantoValorizacion(
  proyecto: {
    adelantoPorcentaje: number
    adelantoMonto: number
    adelantoAmortizado: number
  },
  montoValorizacion: number,
  adelantoManualOverride?: number
): {
  adelantoMonto: number
  adelantoPorcentaje: number
  saldoDisponible: number
  saldoRestante: number
  tieneAdelanto: boolean
} {
  const saldoDisponible = proyecto.adelantoMonto - proyecto.adelantoAmortizado

  if (proyecto.adelantoMonto <= 0 || saldoDisponible <= 0) {
    return {
      adelantoMonto: 0,
      adelantoPorcentaje: 0,
      saldoDisponible: 0,
      saldoRestante: 0,
      tieneAdelanto: false,
    }
  }

  let adelantoCalculado = montoValorizacion * (proyecto.adelantoPorcentaje / 100)

  if (adelantoManualOverride !== undefined) {
    adelantoCalculado = adelantoManualOverride
  }

  // Nunca amortizar más del saldo disponible
  const adelantoFinal = Math.round(Math.min(Math.max(adelantoCalculado, 0), saldoDisponible) * 100) / 100

  return {
    adelantoMonto: adelantoFinal,
    adelantoPorcentaje: montoValorizacion > 0
      ? Math.round((adelantoFinal / montoValorizacion) * 100 * 100) / 100
      : 0,
    saldoDisponible: Math.round(saldoDisponible * 100) / 100,
    saldoRestante: Math.round((saldoDisponible - adelantoFinal) * 100) / 100,
    tieneAdelanto: true,
  }
}
