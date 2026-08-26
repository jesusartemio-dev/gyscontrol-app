import { prisma } from '@/lib/prisma'
import { calcularCostosLaborales } from './costosLaborales'

/**
 * Horas de una jornada completa, usada para convertir la tarifa/día de un
 * tercero en tarifa/hora. Se lee del calendario laboral activo; este valor solo
 * es el respaldo si no hay ninguno configurado.
 */
const HORAS_POR_DIA_FALLBACK = 8

/** Campos mínimos para costear a una persona, sea de planilla o tercero. */
const SELECT_COSTO = {
  userId: true,
  sueldoPlanilla: true,
  sueldoHonorarios: true,
  asignacionFamiliar: true,
  emo: true,
  regimenLaboral: true,
  tipoPersonal: true,
  tarifaDia: true,
  monedaTarifa: true,
} as const

type EmpleadoCosto = {
  sueldoPlanilla: number | null
  sueldoHonorarios: number | null
  asignacionFamiliar: number | null
  emo: number | null
  regimenLaboral: 'mype' | 'general'
  tipoPersonal: 'planilla' | 'tercero'
  tarifaDia: number | null
  monedaTarifa: string
}

/**
 * Costo por hora en PEN de una persona.
 *
 * - **Planilla**: sueldo mensual + aportes de ley (EsSalud, CTS, gratificación,
 *   SCTR, Vida Ley, EMO) dividido entre las horas del mes.
 * - **Tercero**: tarifa por día ÷ horas de la jornada. Sin aportes de ley,
 *   porque a un tercero no se le paga ninguno. Al trabajar la jornada completa
 *   el resultado equivale exactamente a la tarifa pactada; al trabajar menos
 *   horas, resulta proporcional.
 */
function costoHoraPEN(
  emp: EmpleadoCosto,
  horasMes: number,
  horasDia: number,
  tipoCambio: number,
): number {
  if (emp.tipoPersonal === 'tercero') {
    const tarifa = emp.tarifaDia ?? 0
    if (tarifa <= 0 || horasDia <= 0) return 0
    // La tarifa puede estar pactada en USD; el snapshot siempre se guarda en PEN.
    const tarifaPEN = emp.monedaTarifa === 'USD' ? tarifa * tipoCambio : tarifa
    return tarifaPEN / horasDia
  }

  const costos = calcularCostosLaborales({
    sueldoPlanilla: emp.sueldoPlanilla || 0,
    sueldoHonorarios: emp.sueldoHonorarios || 0,
    asignacionFamiliar: emp.asignacionFamiliar || 0,
    emo: emp.emo || 25,
    regimenLaboral: emp.regimenLaboral,
  })
  return horasMes > 0 ? costos.totalMensual / horasMes : 0
}

/** Parámetros compartidos: horas del mes, horas de la jornada y tipo de cambio. */
async function obtenerParametros() {
  const [config, calendario] = await Promise.all([
    prisma.configuracionGeneral.findFirst({ select: { horasMensuales: true, tipoCambio: true } }),
    prisma.calendarioLaboral.findFirst({ where: { activo: true }, select: { horasPorDia: true } }),
  ])
  return {
    horasMes: config?.horasMensuales || 192,
    horasDia: calendario?.horasPorDia || HORAS_POR_DIA_FALLBACK,
    tipoCambio: Number(config?.tipoCambio ?? 3.75),
  }
}

/**
 * Obtiene el costo hora actual en PEN de un empleado.
 * Se usa para hacer snapshot al momento de registrar horas.
 */
export async function obtenerCostoHoraPEN(usuarioId: string): Promise<number> {
  const [empleado, params] = await Promise.all([
    prisma.empleado.findFirst({ where: { userId: usuarioId }, select: SELECT_COSTO }),
    obtenerParametros(),
  ])

  if (!empleado) return 0

  return costoHoraPEN(empleado, params.horasMes, params.horasDia, params.tipoCambio)
}

/**
 * Obtiene el costo hora actual en PEN para múltiples usuarios.
 * Optimizado para operaciones batch (ej: aprobación de campo con cuadrilla).
 */
export async function obtenerCostosHoraPENBatch(usuarioIds: string[]): Promise<Map<string, number>> {
  if (usuarioIds.length === 0) return new Map()

  const [empleados, params] = await Promise.all([
    prisma.empleado.findMany({ where: { userId: { in: usuarioIds } }, select: SELECT_COSTO }),
    obtenerParametros(),
  ])

  const result = new Map<string, number>()
  for (const emp of empleados) {
    result.set(emp.userId, costoHoraPEN(emp, params.horasMes, params.horasDia, params.tipoCambio))
  }

  return result
}
