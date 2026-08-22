import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Reconstruye la curva de avance REAL semana a semana a partir de ProyectoTareaAvance
// (histórico diario que hoy nadie lee) y la compara con los snapshots existentes.

function semanaIso(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
  const day = t.getUTCDay() || 7
  t.setUTCDate(t.getUTCDate() + 4 - day)
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1))
  const w = Math.ceil(((t.getTime() - y0.getTime()) / 86400000 + 1) / 7)
  return `${t.getUTCFullYear()}-W${String(w).padStart(2, '0')}`
}

async function main() {
  console.log('=== REPORTES SEMANALES DE AVANCE (contenedor del botón "tomar snapshot") ===')
  const rs = await prisma.reporteSemanalAvance.groupBy({ by: ['estado'], _count: { _all: true } })
  console.table(rs.map(r => ({ estado: r.estado, n: r._count._all })))

  const codigos = ['CJM47', 'CJM45', 'QRM16', 'CJM48', 'CJM44']
  for (const codigo of codigos) {
    const p = await prisma.proyecto.findFirst({ where: { codigo }, select: { id: true, codigo: true } })
    if (!p) continue
    const crono = await prisma.proyectoCronograma.findFirst({
      where: { proyectoId: p.id, tipo: 'ejecucion' }, select: { id: true },
    })
    if (!crono) { console.log(`\n${codigo}: sin cronograma de ejecución`); continue }

    const tareas = await prisma.proyectoTarea.findMany({
      where: { proyectoCronogramaId: crono.id },
      select: {
        id: true, horasEstimadas: true, personasEstimadas: true, porcentajeCompletado: true,
        proyectoEdt: { select: { proyectoFaseId: true } },
      },
    })
    const fases = await prisma.proyectoFase.findMany({
      where: { proyectoCronogramaId: crono.id }, select: { id: true, pesoManual: true },
    })
    const hhT = (t: typeof tareas[number]) => Number(t.horasEstimadas ?? 0) * (t.personasEstimadas ?? 1)

    const avances = await prisma.proyectoTareaAvance.findMany({
      where: { proyectoId: p.id }, orderBy: { fecha: 'asc' },
      select: { proyectoTareaId: true, fecha: true, porcentaje: true, origen: true },
    })

    // Estado por tarea acumulado en el tiempo; % global ponderado por peso de fase, por semana.
    const horasPorFase = new Map<string, number>()
    for (const t of tareas) {
      const f = t.proyectoEdt?.proyectoFaseId; if (!f) continue
      horasPorFase.set(f, (horasPorFase.get(f) ?? 0) + hhT(t))
    }
    const horasTotal = [...horasPorFase.values()].reduce((s, h) => s + h, 0)
    const pesoEfec = new Map<string, number>()
    for (const f of fases) {
      pesoEfec.set(f.id, f.pesoManual ?? (horasTotal > 0 ? ((horasPorFase.get(f.id) ?? 0) / horasTotal) * 100 : 0))
    }
    const tareaMap = new Map(tareas.map(t => [t.id, t]))

    const estado = new Map<string, number>() // tareaId → % vigente
    const semanas = new Map<string, number>()
    for (const a of avances) {
      if (!tareaMap.has(a.proyectoTareaId)) continue // avance de tarea que ya no está en ejecución
      estado.set(a.proyectoTareaId, a.porcentaje)
      // recalcular global con el estado vigente
      const pond = new Map<string, number>()
      for (const [tid, pct] of estado) {
        const t = tareaMap.get(tid)!; const f = t.proyectoEdt?.proyectoFaseId; if (!f) continue
        pond.set(f, (pond.get(f) ?? 0) + pct * hhT(t))
      }
      let global = 0
      for (const f of fases) {
        const hf = horasPorFase.get(f.id) ?? 0
        const avF = hf > 0 ? (pond.get(f.id) ?? 0) / hf : 0
        global += ((pesoEfec.get(f.id) ?? 0) / 100) * avF
      }
      semanas.set(semanaIso(a.fecha), Number(global.toFixed(2)))
    }

    const snaps = await prisma.proyectoAvanceSnapshot.findMany({
      where: { proyectoId: p.id }, select: { semanaIso: true, progresoGeneral: true },
    })
    const snapMap = new Map(snaps.map(s => [s.semanaIso, s.progresoGeneral]))

    // Avance actual (lo que el sistema muestra hoy)
    const pondAhora = new Map<string, number>()
    for (const t of tareas) {
      const f = t.proyectoEdt?.proyectoFaseId; if (!f) continue
      pondAhora.set(f, (pondAhora.get(f) ?? 0) + t.porcentajeCompletado * hhT(t))
    }
    let globalAhora = 0
    for (const f of fases) {
      const hf = horasPorFase.get(f.id) ?? 0
      const avF = hf > 0 ? (pondAhora.get(f.id) ?? 0) / hf : 0
      globalAhora += ((pesoEfec.get(f.id) ?? 0) / 100) * avF
    }

    console.log(`\n===== ${codigo} — curva REAL derivable de ProyectoTareaAvance =====`)
    console.log(`tareas ejec: ${tareas.length} | filas de avance: ${avances.length} | Σpesos: ${[...pesoEfec.values()].reduce((s, v) => s + v, 0).toFixed(2)}%`)
    console.log(`avance global HOY (fórmula del snapshot): ${globalAhora.toFixed(2)}%`)
    const filas = [...semanas.entries()].sort().map(([s, v]) => ({
      semana: s, derivadoDeHistorico: v, snapshotExistente: snapMap.get(s) ?? '—',
    }))
    console.table(filas)
  }
}

main().finally(() => prisma.$disconnect())
