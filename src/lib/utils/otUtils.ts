/**
 * Utilidades para cálculo de horas extra (OT) y descuentos por volumen HH
 *
 * Fórmulas replicadas del Excel de Deneen:
 *   ESTÁNDAR: =IF(WEEKDAY(fecha)<>1, IF(hrs<9.5, hrs, 9.5), 0)
 *   OT1.25:   =IF(WEEKDAY(fecha)<>1, IF(hrs>9.5, IF(hrs<11.5, hrs-STD, 2), 0), 0)
 *   OT1.35:   =IF(WEEKDAY(fecha)<>1, IF(hrs>11.5, hrs-11.5, 0), 0)
 *   OT2.0:    =IF(WEEKDAY(fecha)=1, hrs, 0)   ← domingos completo
 *   EQUIV:    =STD + OT1.25×1.25 + OT1.35×1.35 + OT2.0×2.0
 *
 * WEEKDAY en Excel (type=1): 1=Domingo ... 7=Sábado
 * getDay() en JS:           0=Domingo ... 6=Sábado
 * → Excel WEEKDAY=1 equivale a JS getDay()=0
 */

export interface HorasOTResult {
  horasStd: number
  horasOT125: number
  horasOT135: number
  horasOT200: number
  horasEquivalente: number
}

export function calcularHorasOT(fecha: Date, horasReportadas: number): HorasOTResult {
  // Usar getUTCDay() porque fechaTrabajo se almacena en UTC (midnight)
  // getDay() causaría shift de día por timezone local
  const esDomingo = fecha.getUTCDay() === 0

  if (esDomingo) {
    return {
      horasStd: 0,
      horasOT125: 0,
      horasOT135: 0,
      horasOT200: horasReportadas,
      horasEquivalente: +(horasReportadas * 2.0).toFixed(4),
    }
  }

  // Día hábil (lunes a sábado)
  const horasStd = Math.min(horasReportadas, 9.5)
  const horasOT125 = horasReportadas > 9.5
    ? Math.min(horasReportadas - 9.5, 2.0)
    : 0
  const horasOT135 = horasReportadas > 11.5
    ? horasReportadas - 11.5
    : 0

  const horasEquivalente =
    horasStd +
    horasOT125 * 1.25 +
    horasOT135 * 1.35

  return {
    horasStd: +horasStd.toFixed(4),
    horasOT125: +horasOT125.toFixed(4),
    horasOT135: +horasOT135.toFixed(4),
    horasOT200: 0,
    horasEquivalente: +horasEquivalente.toFixed(4),
  }
}

export interface DescuentoVolumenResult {
  descuentoMonto: number
  descuentoPct: number // total acumulado, fracción: 0.18 = 18%
  aplicados: Array<{ desdeHoras: number; descuentoPct: number }>
}

export function calcularDescuentoVolumen(
  subtotal: number,
  totalHorasEquivalentes: number,
  descuentos: Array<{ desdeHoras: number; descuentoPct: number; orden: number }>
): DescuentoVolumenResult {
  const aplicados = descuentos
    .filter(d => totalHorasEquivalentes >= d.desdeHoras)
    .sort((a, b) => a.orden - b.orden)

  const descuentoPct = aplicados.reduce((sum, d) => sum + d.descuentoPct, 0)
  const descuentoMonto = +(subtotal * descuentoPct).toFixed(2)

  return {
    descuentoMonto,
    descuentoPct,
    aplicados: aplicados.map(d => ({ desdeHoras: d.desdeHoras, descuentoPct: d.descuentoPct })),
  }
}
