// Recalcula las fechas guardadas de actividades, EDTs y fases de un proyecto a
// partir de sus tareas (mínimo inicio / máximo fin), de abajo hacia arriba.
// Arregla lo que dejó el error de "eliminar tarea" (no recalculaba el padre:
// la actividad seguía terminando en la fecha de la tarea borrada).
//   npx tsx scripts/recalcular-fechas-cronograma.ts CJM52            (muestra)
//   npx tsx scripts/recalcular-fechas-cronograma.ts CJM52 --apply    (guarda)
import { prisma } from '../src/lib/prisma'

const codigo = process.argv[2]
const APLICAR = process.argv.includes('--apply')
const f = (d?: Date | null) => (d ? d.toISOString().slice(0, 16).replace('T', ' ') : '-')
type Rango = { inicio: Date; fin: Date }
const rango = (xs: { inicio: Date | null; fin: Date | null }[]): Rango | null => {
  const v = xs.filter((x): x is Rango => !!x.inicio && !!x.fin)
  if (!v.length) return null
  return { inicio: new Date(Math.min(...v.map(x => x.inicio.getTime()))), fin: new Date(Math.max(...v.map(x => x.fin.getTime()))) }
}
const distinto = (a: { inicio: Date | null; fin: Date | null }, b: Rango) =>
  a.inicio?.getTime() !== b.inicio.getTime() || a.fin?.getTime() !== b.fin.getTime()

async function main() {
  if (!codigo) throw new Error('Uso: npx tsx scripts/recalcular-fechas-cronograma.ts <codigo> [--apply]')
  const proyecto = await prisma.proyecto.findFirst({ where: { codigo }, select: { id: true } })
  if (!proyecto) throw new Error(`No existe ${codigo}`)
  const crons = await prisma.proyectoCronograma.findMany({ where: { proyectoId: proyecto.id }, select: { id: true, tipo: true } })
  console.log(`${APLICAR ? 'APLICANDO' : 'VISTA PREVIA'} — ${codigo}\n`)
  const ahora = new Date()
  let cambios = 0

  for (const c of crons) {
    // Actividades ← tareas
    const acts = await prisma.proyectoActividad.findMany({
      where: { proyectoCronogramaId: c.id },
      select: { id: true, nombre: true, proyectoEdtId: true, fechaInicioPlan: true, fechaFinPlan: true, proyectoTarea: { select: { fechaInicio: true, fechaFin: true } } },
    })
    const fechaAct = new Map<string, Rango>()
    for (const a of acts) {
      const r = rango(a.proyectoTarea.map(t => ({ inicio: t.fechaInicio, fin: t.fechaFin })))
      const actual = { inicio: a.fechaInicioPlan, fin: a.fechaFinPlan }
      fechaAct.set(a.id, r ?? actual)
      if (r && distinto(actual, r)) {
        cambios++
        console.log(`[${c.tipo}] ACT ${a.nombre}: ${f(actual.inicio)}→${f(actual.fin)}  ⇒  ${f(r.inicio)}→${f(r.fin)}`)
        if (APLICAR) await prisma.proyectoActividad.update({ where: { id: a.id }, data: { fechaInicioPlan: r.inicio, fechaFinPlan: r.fin, updatedAt: ahora } })
      }
    }
    // EDTs ← actividades (y tareas sueltas del EDT)
    const edts = await prisma.proyectoEdt.findMany({
      where: { proyectoCronogramaId: c.id },
      select: { id: true, nombre: true, proyectoFaseId: true, fechaInicioPlan: true, fechaFinPlan: true, proyectoTarea: { where: { proyectoActividadId: null }, select: { fechaInicio: true, fechaFin: true } } },
    })
    const fechaEdt = new Map<string, Rango>()
    for (const e of edts) {
      const r = rango([
        ...acts.filter(a => a.proyectoEdtId === e.id).map(a => fechaAct.get(a.id)!),
        ...e.proyectoTarea.map(t => ({ inicio: t.fechaInicio, fin: t.fechaFin })),
      ])
      const actual = { inicio: e.fechaInicioPlan, fin: e.fechaFinPlan }
      if (r) fechaEdt.set(e.id, r)
      if (r && distinto(actual, r)) {
        cambios++
        console.log(`[${c.tipo}] EDT ${e.nombre}: ${f(actual.inicio)}→${f(actual.fin)}  ⇒  ${f(r.inicio)}→${f(r.fin)}`)
        if (APLICAR) await prisma.proyectoEdt.update({ where: { id: e.id }, data: { fechaInicioPlan: r.inicio, fechaFinPlan: r.fin, updatedAt: ahora } })
      }
    }
    // Fases ← EDTs
    const fases = await prisma.proyectoFase.findMany({ where: { proyectoCronogramaId: c.id }, select: { id: true, nombre: true, fechaInicioPlan: true, fechaFinPlan: true } })
    for (const fa of fases) {
      const r = rango(edts.filter(e => e.proyectoFaseId === fa.id).map(e => fechaEdt.get(e.id) ?? { inicio: e.fechaInicioPlan, fin: e.fechaFinPlan }))
      const actual = { inicio: fa.fechaInicioPlan, fin: fa.fechaFinPlan }
      if (r && distinto(actual, r)) {
        cambios++
        console.log(`[${c.tipo}] FASE ${fa.nombre}: ${f(actual.inicio)}→${f(actual.fin)}  ⇒  ${f(r.inicio)}→${f(r.fin)}`)
        if (APLICAR) await prisma.proyectoFase.update({ where: { id: fa.id }, data: { fechaInicioPlan: r.inicio, fechaFinPlan: r.fin, updatedAt: ahora } })
      }
    }
  }
  console.log(cambios ? `\n${cambios} cambio(s)${APLICAR ? ' guardado(s)' : '. Correr con --apply para aplicar.'}` : '\nTodo coincide con sus tareas.')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
