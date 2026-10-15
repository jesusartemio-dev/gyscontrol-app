// Recalcula las fechas (mínimo inicio / máximo fin) de la actividad, EDT y fase
// de una tarea después de moverla, igual que el rollup del árbol. Solo fechas:
// las horas no cambian al mover.

import { prisma } from '@/lib/prisma'

const minMax = (filas: { inicio: Date | null; fin: Date | null }[]) => {
  const v = filas.filter((f) => f.inicio && f.fin) as { inicio: Date; fin: Date }[]
  if (!v.length) return null
  return {
    fechaInicioPlan: new Date(Math.min(...v.map((f) => f.inicio.getTime()))),
    fechaFinPlan: new Date(Math.max(...v.map((f) => f.fin.getTime()))),
  }
}

export async function recalcularFechasPadresDeTarea(tareaId: string): Promise<void> {
  const tarea = await prisma.proyectoTarea.findUnique({
    where: { id: tareaId },
    select: { proyectoActividadId: true, proyectoEdtId: true },
  })
  if (!tarea) return
  const ahora = new Date()

  if (tarea.proyectoActividadId) {
    const ts = await prisma.proyectoTarea.findMany({
      where: { proyectoActividadId: tarea.proyectoActividadId },
      select: { fechaInicio: true, fechaFin: true },
    })
    const r = minMax(ts.map((t) => ({ inicio: t.fechaInicio, fin: t.fechaFin })))
    if (r) await prisma.proyectoActividad.update({ where: { id: tarea.proyectoActividadId }, data: { ...r, updatedAt: ahora } })
  }

  const as = await prisma.proyectoActividad.findMany({
    where: { proyectoEdtId: tarea.proyectoEdtId },
    select: { fechaInicioPlan: true, fechaFinPlan: true },
  })
  const rEdt = minMax(as.map((a) => ({ inicio: a.fechaInicioPlan, fin: a.fechaFinPlan })))
  if (!rEdt) return
  const edt = await prisma.proyectoEdt.update({
    where: { id: tarea.proyectoEdtId },
    data: { ...rEdt, updatedAt: ahora },
    select: { proyectoFaseId: true },
  })

  if (edt.proyectoFaseId) {
    const es = await prisma.proyectoEdt.findMany({
      where: { proyectoFaseId: edt.proyectoFaseId },
      select: { fechaInicioPlan: true, fechaFinPlan: true },
    })
    const rFase = minMax(es.map((e) => ({ inicio: e.fechaInicioPlan, fin: e.fechaFinPlan })))
    if (rFase) await prisma.proyectoFase.update({ where: { id: edt.proyectoFaseId }, data: { ...rFase, updatedAt: ahora } })
  }
}
