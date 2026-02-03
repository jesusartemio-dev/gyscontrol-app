// ===============================
// 📊 costosLaborales.ts
// 🔧 Utilidades para calcular costos laborales según ley peruana (Régimen Mype)
// ===============================

import type { Empleado } from '@/types/modelos'

// Constantes de porcentajes según ley peruana
export const COSTOS_LABORALES = {
  // Aportes del empleador
  ESSALUD_PCT: 0.09,           // 9% sobre remuneración total

  // Gratificación (Julio y Diciembre) - Régimen Mype
  GRATIFICACION_MYPE_PCT: 0.50, // 50% (medio sueldo)
  GRATIFICACION_RG_PCT: 1.00,   // 100% (régimen general)

  // Bonificación Extraordinaria (sobre gratificación)
  BONIF_EXTRA_PCT: 0.09,        // 9%

  // Seguros obligatorios
  SCTR_PCT: 0.009,              // 0.9% sobre remuneración base
  VIDA_LEY_PCT: 0.002,          // 0.2% sobre remuneración base

  // CTS - Compensación por Tiempo de Servicios
  // Se calcula: (Rem + 1/6 Gratif) / 2 / 12 para Mype
  // O: (Rem + 1/6 Gratif) / 12 para RG
}

export interface CostosLaboralesResult {
  // Datos de entrada
  remuneracion: number
  asignacionFamiliar: number
  honorarios: number
  emo: number

  // Totales base
  totalRemuneracion: number

  // Beneficios calculados
  essalud: number
  gratificacion: number
  gratificacionMensual: number
  bonifExtraordinaria: number
  bonifExtraordinariaMensual: number
  cts: number
  ctsMensual: number

  // Seguros
  sctr: number
  vidaLey: number

  // Totales
  costoMensualPlanilla: number
  totalMensual: number

  // Costo hora (si se proporciona configuración)
  costoHoraUSD?: number
}

/**
 * Calcula todos los costos laborales de un empleado según régimen Mype
 * @param empleado - Datos del empleado
 * @param config - Configuración opcional (tipo de cambio, horas mensuales)
 * @returns Objeto con todos los costos calculados
 */
export function calcularCostosLaborales(
  empleado: Pick<Empleado, 'sueldoPlanilla' | 'sueldoHonorarios' | 'asignacionFamiliar' | 'emo'>,
  config?: { tipoCambio?: number; horasMensuales?: number }
): CostosLaboralesResult {
  const remuneracion = empleado.sueldoPlanilla || 0
  const asignacionFamiliar = empleado.asignacionFamiliar || 0
  const honorarios = empleado.sueldoHonorarios || 0
  const emo = empleado.emo || 25

  // Total Remuneración = Sueldo base + Asignación Familiar
  const totalRemuneracion = remuneracion + asignacionFamiliar

  // Essalud = 9% del total de remuneración
  const essalud = totalRemuneracion * COSTOS_LABORALES.ESSALUD_PCT

  // Gratificación (Mype = 50% del sueldo, 2 veces al año)
  const gratificacion = totalRemuneracion * COSTOS_LABORALES.GRATIFICACION_MYPE_PCT
  const gratificacionMensual = gratificacion / 6 // Provisión mensual (gratif/6 meses)

  // Bonificación Extraordinaria = 9% de la gratificación
  const bonifExtraordinaria = gratificacion * COSTOS_LABORALES.BONIF_EXTRA_PCT
  const bonifExtraordinariaMensual = bonifExtraordinaria / 6

  // CTS (Compensación por Tiempo de Servicios)
  // Base CTS = (Remuneración + 1/6 de Gratificación) / 2
  const sextoGratificacion = gratificacion / 6
  const baseCTS = (totalRemuneracion + sextoGratificacion) / 2
  const cts = baseCTS // CTS semestral
  const ctsMensual = baseCTS / 6 // Provisión mensual

  // SCTR = 0.9% sobre remuneración base (no incluye asignación familiar)
  const sctr = remuneracion * COSTOS_LABORALES.SCTR_PCT

  // Vida Ley = 0.2% sobre remuneración base
  const vidaLey = remuneracion * COSTOS_LABORALES.VIDA_LEY_PCT

  // Costo Mensual Planilla = Remuneración Total + Essalud + CTS mensual + Gratif mensual + Bonif mensual
  const costoMensualPlanilla = totalRemuneracion + essalud + ctsMensual + gratificacionMensual + bonifExtraordinariaMensual

  // Total Mensual = Costo Planilla + SCTR + Vida Ley + EMO + Honorarios
  const totalMensual = costoMensualPlanilla + sctr + vidaLey + emo + honorarios

  const result: CostosLaboralesResult = {
    remuneracion,
    asignacionFamiliar,
    honorarios,
    emo,
    totalRemuneracion,
    essalud,
    gratificacion,
    gratificacionMensual,
    bonifExtraordinaria,
    bonifExtraordinariaMensual,
    cts,
    ctsMensual,
    sctr,
    vidaLey,
    costoMensualPlanilla,
    totalMensual,
  }

  // Calcular costo hora en USD si hay configuración
  if (config?.tipoCambio && config?.horasMensuales) {
    const totalUSD = totalMensual / config.tipoCambio
    result.costoHoraUSD = totalUSD / config.horasMensuales
  }

  return result
}

/**
 * Formatea un monto en soles peruanos
 */
export function formatPEN(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Calcula el resumen de costos para una lista de empleados
 */
export function calcularResumenCostos(
  empleados: Pick<Empleado, 'sueldoPlanilla' | 'sueldoHonorarios' | 'asignacionFamiliar' | 'emo'>[]
): {
  totalRemuneracion: number
  totalEssalud: number
  totalCTS: number
  totalGratificacion: number
  totalBonifExtra: number
  totalSCTR: number
  totalVidaLey: number
  totalEMO: number
  totalHonorarios: number
  totalMensual: number
  cantidadEmpleados: number
} {
  const resumen = empleados.reduce((acc, emp) => {
    const costos = calcularCostosLaborales(emp)
    return {
      totalRemuneracion: acc.totalRemuneracion + costos.totalRemuneracion,
      totalEssalud: acc.totalEssalud + costos.essalud,
      totalCTS: acc.totalCTS + costos.ctsMensual,
      totalGratificacion: acc.totalGratificacion + costos.gratificacionMensual,
      totalBonifExtra: acc.totalBonifExtra + costos.bonifExtraordinariaMensual,
      totalSCTR: acc.totalSCTR + costos.sctr,
      totalVidaLey: acc.totalVidaLey + costos.vidaLey,
      totalEMO: acc.totalEMO + costos.emo,
      totalHonorarios: acc.totalHonorarios + costos.honorarios,
      totalMensual: acc.totalMensual + costos.totalMensual,
    }
  }, {
    totalRemuneracion: 0,
    totalEssalud: 0,
    totalCTS: 0,
    totalGratificacion: 0,
    totalBonifExtra: 0,
    totalSCTR: 0,
    totalVidaLey: 0,
    totalEMO: 0,
    totalHonorarios: 0,
    totalMensual: 0,
  })

  return {
    ...resumen,
    cantidadEmpleados: empleados.length,
  }
}
