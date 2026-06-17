// ===================================================
// 📁 cronogramaFechasDefault.ts
// 🔧 Fechas por defecto al crear/importar nodos del cronograma de proyectos.
//
// Regla pedida por el usuario:
//  - FASE: inicia en la "Vigencia del Proyecto" (proyecto.fechaInicio).
//  - EDT : inicia después del último EDT hermano (misma fase); si no hay,
//          al inicio de su fase (fallback: vigencia del proyecto).
//  - Actividad / Tarea: ya resuelto por el parámetro `posicionamiento` en sus
//    propios endpoints (inicio del padre / después del hermano).
// ===================================================

import { prisma } from '@/lib/prisma'

const DIA_MS = 24 * 60 * 60 * 1000

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DIA_MS)
}

// Duraciones por defecto (en días) si no hay config activa en PlantillaDuracionCronograma.
// Coinciden con las del generador de cronograma (api/.../cronograma/generar).
type NivelDuracion = 'fase' | 'edt' | 'actividad' | 'tarea'
const DURACION_DEFAULT: Record<NivelDuracion, number> = {
  fase: 60,
  edt: 45,
  actividad: 7,
  tarea: 2,
}

/**
 * Lee la duración configurada (días) para un nivel desde
 * "Configuración → Duraciones de Cronograma" (PlantillaDuracionCronograma).
 * Fallback a DURACION_DEFAULT si no hay registro activo o falla la consulta.
 */
export async function obtenerDuracionDias(nivel: NivelDuracion): Promise<number> {
  try {
    const config = await prisma.plantillaDuracionCronograma.findFirst({
      where: { nivel, activo: true },
      select: { duracionDias: true },
    })
    return config?.duracionDias ?? DURACION_DEFAULT[nivel]
  } catch {
    return DURACION_DEFAULT[nivel]
  }
}

/**
 * Fechas por defecto para una FASE nueva: inicia en la fecha de inicio del proyecto.
 * @param proyectoFechaInicio Vigencia del proyecto (proyecto.fechaInicio).
 * @param duracionDias Duración tentativa (el usuario la ajusta luego).
 */
export async function fechasFaseDefault(
  proyectoFechaInicio: Date | null
): Promise<{ fechaInicioPlan: Date | null; fechaFinPlan: Date | null }> {
  if (!proyectoFechaInicio) return { fechaInicioPlan: null, fechaFinPlan: null }
  // Duración configurable en "Duraciones de Cronograma" (nivel fase; default 60 días)
  const duracionDias = await obtenerDuracionDias('fase')
  return {
    fechaInicioPlan: proyectoFechaInicio,
    fechaFinPlan: addDays(proyectoFechaInicio, duracionDias),
  }
}

/**
 * Fechas por defecto para un EDT nuevo: después del último EDT hermano (misma fase)
 * con fecha fin; si no hay, al inicio de su fase (fallback: vigencia del proyecto).
 * Como cada EDT creado queda persistido, llamar esta función en un bucle de
 * importación escalona los EDT secuencialmente.
 */
export async function fechasEdtDefault(
  proyectoFaseId: string | null | undefined,
  faseFechaInicio: Date | null,
  proyectoFechaInicio: Date | null
): Promise<{ fechaInicioPlan: Date | null; fechaFinPlan: Date | null }> {
  let inicio: Date | null = null

  if (proyectoFaseId) {
    const ultimoHermano = await prisma.proyectoEdt.findFirst({
      where: { proyectoFaseId, fechaFinPlan: { not: null } },
      orderBy: { fechaFinPlan: 'desc' },
      select: { fechaFinPlan: true },
    })
    if (ultimoHermano?.fechaFinPlan) inicio = addDays(ultimoHermano.fechaFinPlan, 1)
  }

  if (!inicio) inicio = faseFechaInicio ?? proyectoFechaInicio ?? null
  if (!inicio) return { fechaInicioPlan: null, fechaFinPlan: null }

  // Duración configurable en "Duraciones de Cronograma" (nivel edt; default 45 días)
  const duracionDias = await obtenerDuracionDias('edt')
  return { fechaInicioPlan: inicio, fechaFinPlan: addDays(inicio, duracionDias) }
}
