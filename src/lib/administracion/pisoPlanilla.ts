// Piso de Planilla — pieza del tablero Situación Financiera.
//
// Suma calcularCostosLaborales(empleado).totalMensual sobre los empleados
// activos. No es una fuente de datos nueva: reutiliza la misma fórmula ya
// usada en /rrhh/personal y en costoHoraSnapshot.ts (el "costo-empresa
// completo" ya existía, solo nunca se sumó como KPI de empresa).
//
// El hueco de datos (empleados activos sin sueldoPlanilla) se reporta
// explícito — nunca se esconde detrás de un total que parece completo sin
// serlo. Ver project_piso_planilla.md.

import { prisma } from '@/lib/prisma'
import { calcularCostosLaborales } from '@/lib/utils/costosLaborales'

export interface PisoPlanilla {
  totalMensual: number
  empleadosActivos: number
  empleadosConSueldo: number
  empleadosSinSueldo: number
}

export async function calcularPisoPlanilla(): Promise<PisoPlanilla> {
  const activos = await prisma.empleado.findMany({
    where: { activo: true },
    select: {
      sueldoPlanilla: true,
      sueldoHonorarios: true,
      asignacionFamiliar: true,
      emo: true,
      regimenLaboral: true,
    },
  })

  const conSueldo = activos.filter(e => e.sueldoPlanilla != null && e.sueldoPlanilla > 0)

  const totalMensual = conSueldo.reduce((sum, emp) => {
    const costos = calcularCostosLaborales({
      sueldoPlanilla: emp.sueldoPlanilla ?? 0,
      sueldoHonorarios: emp.sueldoHonorarios ?? 0,
      asignacionFamiliar: emp.asignacionFamiliar,
      emo: emp.emo,
      regimenLaboral: emp.regimenLaboral,
    })
    return sum + costos.totalMensual
  }, 0)

  return {
    totalMensual,
    empleadosActivos: activos.length,
    empleadosConSueldo: conSueldo.length,
    empleadosSinSueldo: activos.length - conSueldo.length,
  }
}
