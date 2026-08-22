import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  console.log('=== 1. SNAPSHOTS DE AVANCE (ProyectoAvanceSnapshot) ===')
  const snaps = await prisma.proyectoAvanceSnapshot.count()
  console.log('total snapshots:', snaps)
  if (snaps > 0) {
    const rows = await prisma.proyectoAvanceSnapshot.findMany({
      select: { semanaIso: true, progresoGeneral: true, proyecto: { select: { codigo: true } } },
      orderBy: { semanaIso: 'asc' }, take: 30,
    })
    console.table(rows.map(r => ({ proy: r.proyecto.codigo, semana: r.semanaIso, pct: r.progresoGeneral })))
  }

  console.log('\n=== 2. HISTORICO DIARIO (ProyectoTareaAvance) ===')
  const av = await prisma.proyectoTareaAvance.count()
  console.log('total filas:', av)
  if (av > 0) {
    const porProy = await prisma.proyectoTareaAvance.groupBy({
      by: ['proyectoId', 'origen'], _count: { _all: true }, _min: { fecha: true }, _max: { fecha: true },
    })
    const proys = await prisma.proyecto.findMany({
      where: { id: { in: porProy.map(p => p.proyectoId) } }, select: { id: true, codigo: true },
    })
    const m = new Map(proys.map(p => [p.id, p.codigo]))
    console.table(porProy.map(p => ({
      proy: m.get(p.proyectoId), origen: p.origen, filas: p._count._all,
      desde: p._min.fecha?.toISOString().slice(0, 10), hasta: p._max.fecha?.toISOString().slice(0, 10),
    })))
  }

  console.log('\n=== 3. CRONOGRAMAS por proyecto activo ===')
  const cronos = await prisma.proyectoCronograma.groupBy({
    by: ['proyectoId', 'tipo', 'esBaseline'], _count: { _all: true },
  })
  const proyIds = [...new Set(cronos.map(c => c.proyectoId))]
  const proys2 = await prisma.proyecto.findMany({
    where: { id: { in: proyIds } }, select: { id: true, codigo: true, estado: true },
  })
  const pm = new Map(proys2.map(p => [p.id, p]))
  const resumen = new Map<string, { codigo: string; estado: string; plan: number; planBase: number; ejec: number }>()
  for (const c of cronos) {
    const p = pm.get(c.proyectoId)!
    const r = resumen.get(c.proyectoId) ?? { codigo: p.codigo, estado: p.estado, plan: 0, planBase: 0, ejec: 0 }
    if (c.tipo === 'ejecucion') r.ejec += c._count._all
    else { r.plan += c._count._all; if (c.esBaseline) r.planBase += c._count._all }
    resumen.set(c.proyectoId, r)
  }
  console.table([...resumen.values()])

  console.log('\n=== 4. TAREAS DE EJECUCION CON AVANCE > 0 ===')
  const cronoEjec = await prisma.proyectoCronograma.findMany({
    where: { tipo: 'ejecucion' }, select: { id: true, proyectoId: true },
  })
  const byProy: Record<string, { total: number; conAvance: number; suma: number; horas: number }> = {}
  for (const ce of cronoEjec) {
    const tareas = await prisma.proyectoTarea.findMany({
      where: { proyectoCronogramaId: ce.id },
      select: { porcentajeCompletado: true, horasEstimadas: true },
    })
    const cod = pm.get(ce.proyectoId)?.codigo ?? ce.proyectoId
    const b = byProy[cod] ?? { total: 0, conAvance: 0, suma: 0, horas: 0 }
    for (const t of tareas) {
      b.total++
      if (t.porcentajeCompletado > 0) b.conAvance++
      b.suma += t.porcentajeCompletado
      b.horas += Number(t.horasEstimadas ?? 0)
    }
    byProy[cod] = b
  }
  console.table(Object.entries(byProy).map(([cod, b]) => ({
    proy: cod, tareas: b.total, conAvance: b.conAvance,
    pctProm: b.total ? (b.suma / b.total).toFixed(1) : '0', horasEst: b.horas.toFixed(0),
  })))

  console.log('\n=== 5. JORNADAS DE CAMPO ===')
  const j = await prisma.registroHorasCampo.groupBy({ by: ['estado'], _count: { _all: true } })
  console.table(j.map(x => ({ estado: x.estado, n: x._count._all })))
  const jt = await prisma.registroHorasCampoTarea.count()
  const jtLink = await prisma.registroHorasCampoTarea.count({ where: { proyectoTareaId: { not: null } } })
  const jtPct = await prisma.registroHorasCampoTarea.count({ where: { porcentajeFinal: { not: null } } })
  console.log(`tareas de jornada: ${jt} | ligadas a ProyectoTarea: ${jtLink} | con porcentajeFinal: ${jtPct}`)

  console.log('\n=== 6. PESOS DE FASE (pesoManual) ===')
  const fases = await prisma.proyectoFase.groupBy({ by: ['proyectoCronogramaId'], _count: { _all: true } })
  const conPeso = await prisma.proyectoFase.count({ where: { pesoManual: { not: null } } })
  console.log('total fases:', fases.reduce((s, f) => s + f._count._all, 0), '| con pesoManual:', conPeso)
}

main().finally(() => prisma.$disconnect())
