import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// ¿Cuántas tareas tienen hoy un % que NO coincide con el último avance fechado?
// Si difieren, algo escribió el % por una vía que no deja rastro (supervision/tareas,
// proyecto-edt, o ProgresoService recalculando desde horas).

async function main() {
  const av = await prisma.proyectoTareaAvance.findMany({
    orderBy: [{ fecha: 'asc' }, { createdAt: 'asc' }],
    select: { proyectoTareaId: true, porcentaje: true, fecha: true, origen: true },
  })
  const ultimo = new Map<string, { pct: number; fecha: Date; origen: string }>()
  for (const a of av) ultimo.set(a.proyectoTareaId, { pct: a.porcentaje, fecha: a.fecha, origen: a.origen })

  const tareas = await prisma.proyectoTarea.findMany({
    where: { id: { in: [...ultimo.keys()] } },
    select: {
      id: true, nombre: true, porcentajeCompletado: true, horasEstimadas: true, horasReales: true,
      proyectoEdt: { select: { proyectoCronograma: { select: { proyecto: { select: { codigo: true } } } } } },
    },
  })

  const desviadas = []
  for (const t of tareas) {
    const u = ultimo.get(t.id)!
    if (t.porcentajeCompletado === u.pct) continue
    const he = Number(t.horasEstimadas ?? 0)
    const hr = Number(t.horasReales ?? 0)
    const pctHoras = he > 0 ? Math.min(100, Math.round((hr / he) * 100)) : null
    desviadas.push({
      proy: t.proyectoEdt?.proyectoCronograma?.proyecto?.codigo ?? '?',
      tarea: t.nombre.slice(0, 34),
      histFecha: u.fecha.toISOString().slice(0, 10),
      histPct: u.pct,
      pctHoy: t.porcentajeCompletado,
      pctSegunHoras: pctHoras,
      '=horas?': pctHoras !== null && pctHoras === t.porcentajeCompletado ? 'SI' : '',
    })
  }
  console.log(`tareas con histórico: ${tareas.length}`)
  console.log(`tareas cuyo % de HOY difiere del último avance fechado: ${desviadas.length}`)
  const porHoras = desviadas.filter(d => d['=horas?'] === 'SI').length
  console.log(`  de esas, el % de hoy coincide EXACTO con horasReales/horasEstimadas: ${porHoras}  <-- ProgresoService las pisó`)
  console.table(desviadas.slice(0, 30))

  console.log('\n=== ¿Cuántas tareas del cronograma de ejecución NO tienen ninguna fila de histórico? ===')
  const cronos = await prisma.proyectoCronograma.findMany({ where: { tipo: 'ejecucion' }, select: { id: true, proyecto: { select: { codigo: true } } } })
  const filas = []
  for (const c of cronos) {
    const total = await prisma.proyectoTarea.count({ where: { proyectoCronogramaId: c.id, porcentajeCompletado: { gt: 0 } } })
    if (total === 0) continue
    const ids = await prisma.proyectoTarea.findMany({ where: { proyectoCronogramaId: c.id, porcentajeCompletado: { gt: 0 } }, select: { id: true } })
    const conHist = ids.filter(t => ultimo.has(t.id)).length
    filas.push({ proy: c.proyecto.codigo, 'tareas con avance>0': total, 'con histórico': conHist, 'SIN histórico': total - conHist })
  }
  console.table(filas)
}

main().finally(() => prisma.$disconnect())
