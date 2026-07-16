/**
 * Utilidades para cálculo de costos de recursos y empleados
 * Centraliza constantes y funciones de conversión PEN/USD
 */

import type { Empleado, RecursoPerfil } from '@/types'

// Valores por defecto (se sobrescriben con configuración de BD)
export const DEFAULTS = {
  TIPO_CAMBIO: 3.75,        // PEN a USD
  HORAS_SEMANALES: 48,      // Jornada laboral peruana
  DIAS_LABORABLES: 5,       // Lunes a Viernes
  SEMANAS_X_MES: 4,         // Semanas por mes
  HORAS_MENSUALES: 192,     // 48h × 4 semanas
}

// Tipo para configuración
export interface ConfiguracionCostos {
  tipoCambio: number
  horasSemanales: number
  diasLaborables: number
  semanasxMes: number
  horasMensuales: number
}

/**
 * Obtiene la configuración desde el API
 */
export async function getConfiguracionCostos(): Promise<ConfiguracionCostos> {
  try {
    const res = await fetch('/api/configuracion/general')
    if (!res.ok) throw new Error('Error al obtener configuración')
    const data = await res.json()
    return {
      tipoCambio: parseFloat(data.tipoCambio) || DEFAULTS.TIPO_CAMBIO,
      horasSemanales: data.horasSemanales || DEFAULTS.HORAS_SEMANALES,
      diasLaborables: data.diasLaborables || DEFAULTS.DIAS_LABORABLES,
      semanasxMes: data.semanasxMes || DEFAULTS.SEMANAS_X_MES,
      horasMensuales: data.horasMensuales || DEFAULTS.HORAS_MENSUALES,
    }
  } catch (error) {
    console.error('Error cargando configuración, usando valores por defecto:', error)
    return {
      tipoCambio: DEFAULTS.TIPO_CAMBIO,
      horasSemanales: DEFAULTS.HORAS_SEMANALES,
      diasLaborables: DEFAULTS.DIAS_LABORABLES,
      semanasxMes: DEFAULTS.SEMANAS_X_MES,
      horasMensuales: DEFAULTS.HORAS_MENSUALES,
    }
  }
}

/**
 * Calcula el sueldo total de un empleado (planilla + honorarios) en PEN
 */
export function getSueldoTotalPEN(empleado?: Empleado | null): number {
  if (!empleado) return 0
  return (empleado.sueldoPlanilla || 0) + (empleado.sueldoHonorarios || 0)
}

/**
 * Calcula el costo por hora de un empleado en PEN
 * Fórmula: sueldoTotal / horasMensuales
 */
export function getCostoHoraPEN(
  empleado?: Empleado | null,
  horasMensuales: number = DEFAULTS.HORAS_MENSUALES
): number {
  const sueldoTotal = getSueldoTotalPEN(empleado)
  if (sueldoTotal === 0) return 0
  return sueldoTotal / horasMensuales
}

/**
 * Calcula el costo por hora de un empleado en USD
 * Fórmula: (sueldoPEN / tipoCambio) / horasMensuales
 */
export function getCostoHoraUSD(
  empleado?: Empleado | null,
  config: Partial<ConfiguracionCostos> = {}
): number {
  const tipoCambio = config.tipoCambio || DEFAULTS.TIPO_CAMBIO
  const horasMensuales = config.horasMensuales || DEFAULTS.HORAS_MENSUALES

  const sueldoTotal = getSueldoTotalPEN(empleado)
  if (sueldoTotal === 0) return 0

  const sueldoUSD = sueldoTotal / tipoCambio
  return sueldoUSD / horasMensuales
}

/**
 * Convierte PEN a USD
 */
export function penToUSD(amountPEN: number, tipoCambio: number = DEFAULTS.TIPO_CAMBIO): number {
  return amountPEN / tipoCambio
}

/**
 * Convierte USD a PEN
 */
export function usdToPEN(amountUSD: number, tipoCambio: number = DEFAULTS.TIPO_CAMBIO): number {
  return amountUSD * tipoCambio
}

/**
 * Formatea moneda en PEN
 */
export function formatPEN(amount: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formatea moneda en USD
 */
export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

/**
 * Calcula el costo real promedio de un recurso individual
 * Promedio simple de los empleados asignados (su composición es un POOL
 * de referencia de costo, no dotación — ver docs/analisis-composicion-recursos.md).
 */
export function calcularCostoRealIndividual(
  composiciones: Array<{ empleado?: Empleado | null }>,
  config: Partial<ConfiguracionCostos> = {}
): number {
  if (composiciones.length === 0) return 0
  const suma = composiciones.reduce((sum, comp) => {
    return sum + getCostoHoraUSD(comp.empleado, config)
  }, 0)
  return suma / composiciones.length
}

/**
 * Calcula el costo real de una cuadrilla a partir de sus PERFILES
 * (recursos individuales × cantidad) — reemplaza el cálculo anterior que
 * sumaba empleados reales de RecursoComposicion (ver
 * docs/analisis-composicion-recursos.md: esos empleados eran solo referencia
 * de costo repetida N veces, nunca personas reales de la cuadrilla).
 *
 * Fórmula: Σ (costo promedio del perfil individual × cantidad).
 * El costo de CADA perfil sale de `calcularCostoRealIndividual` sobre la
 * composición propia de ese recurso individual (su pool de empleados de
 * referencia) — por eso `recursoMiembro` debe venir con sus `composiciones`
 * incluidas (ver GET /api/recurso).
 */
export function calcularCostoRealCuadrillaPorPerfiles(
  perfiles: Array<Pick<RecursoPerfil, 'cantidad'> & { recursoMiembro?: { composiciones?: Array<{ empleado?: Empleado | null }> } | null }>,
  config: Partial<ConfiguracionCostos> = {}
): number {
  return perfiles.reduce((sum, p) => {
    const cant = p.cantidad ?? 1
    const costoPerfil = calcularCostoRealIndividual(p.recursoMiembro?.composiciones ?? [], config)
    return sum + costoPerfil * cant
  }, 0)
}

/**
 * Hook helper para obtener configuración en componentes
 * Uso: const config = useConfiguracionCostos()
 */
export function createConfigState(initial?: Partial<ConfiguracionCostos>): ConfiguracionCostos {
  return {
    tipoCambio: initial?.tipoCambio ?? DEFAULTS.TIPO_CAMBIO,
    horasSemanales: initial?.horasSemanales ?? DEFAULTS.HORAS_SEMANALES,
    diasLaborables: initial?.diasLaborables ?? DEFAULTS.DIAS_LABORABLES,
    semanasxMes: initial?.semanasxMes ?? DEFAULTS.SEMANAS_X_MES,
    horasMensuales: initial?.horasMensuales ?? DEFAULTS.HORAS_MENSUALES,
  }
}
