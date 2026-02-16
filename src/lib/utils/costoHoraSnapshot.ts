import { prisma } from '@/lib/prisma'
import { calcularCostosLaborales } from './costosLaborales'

/**
 * Obtiene el costo hora actual en PEN de un empleado.
 * Se usa para hacer snapshot al momento de registrar horas.
 */
export async function obtenerCostoHoraPEN(usuarioId: string): Promise<number> {
  const [empleado, config] = await Promise.all([
    prisma.empleado.findFirst({
      where: { userId: usuarioId },
      select: { sueldoPlanilla: true, sueldoHonorarios: true, asignacionFamiliar: true, emo: true }
    }),
    prisma.configuracionGeneral.findFirst({ select: { horasMensuales: true } })
  ])

  if (!empleado) return 0

  const horasMes = config?.horasMensuales || 192
  const costos = calcularCostosLaborales({
    sueldoPlanilla: empleado.sueldoPlanilla || 0,
    sueldoHonorarios: empleado.sueldoHonorarios || 0,
    asignacionFamiliar: empleado.asignacionFamiliar || 0,
    emo: empleado.emo || 25,
  })

  return horasMes > 0 ? costos.totalMensual / horasMes : 0
}

/**
 * Obtiene el costo hora actual en PEN para múltiples usuarios.
 * Optimizado para operaciones batch (ej: aprobación de campo con cuadrilla).
 */
export async function obtenerCostosHoraPENBatch(usuarioIds: string[]): Promise<Map<string, number>> {
  if (usuarioIds.length === 0) return new Map()

  const [empleados, config] = await Promise.all([
    prisma.empleado.findMany({
      where: { userId: { in: usuarioIds } },
      select: { userId: true, sueldoPlanilla: true, sueldoHonorarios: true, asignacionFamiliar: true, emo: true }
    }),
    prisma.configuracionGeneral.findFirst({ select: { horasMensuales: true } })
  ])

  const horasMes = config?.horasMensuales || 192
  const result = new Map<string, number>()

  for (const emp of empleados) {
    const costos = calcularCostosLaborales({
      sueldoPlanilla: emp.sueldoPlanilla || 0,
      sueldoHonorarios: emp.sueldoHonorarios || 0,
      asignacionFamiliar: emp.asignacionFamiliar || 0,
      emo: emp.emo || 25,
    })
    result.set(emp.userId, horasMes > 0 ? costos.totalMensual / horasMes : 0)
  }

  return result
}
