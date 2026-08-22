import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// ¿Qué proporción del avance global aportó cada origen, medida en PUNTOS de avance
// (no en número de filas)? Atribuye cada delta (%nuevo - %anterior) de una tarea al
// origen de la fila que lo produjo, ponderado por el peso de esa tarea en el global.

async function main() {
  const cronos = await prisma.proyectoCronograma.findMany({
    where: { tipo: 'ejecucion' },
    select: { id: true, proyectoId: true, proyecto: { select: { codigo: true } } },
  })

  const totalPorOrigen: Record<string, number> = {}
  const filas = []

  for (const c of cronos) {
    const tareas = await prisma.proyectoTarea.findMany({
      where: { proyectoCronogramaId: c.id },
      select: {
        id: true, horasEstimadas: true, personasEstimadas: true, porcentajeCompletado: true,
        proyectoEdt: { select: { proyectoFaseId: true } },
      },
    })
    if (tareas.length === 0) continue
    const fases = await prisma.proyectoFase.findMany({
      where: { proyectoCronogramaId: c.id }, select: { id: true, pesoManual: true },
    })
    const hh = (t: typeof tareas[number]) => Number(t.horasEstimadas ?? 0) * (t.personasEstimadas ?? 1)

    const horasPorFase = new Map<string, number>()
    for (const t of tareas) {
      const f = t.proyectoEdt?.proyectoFaseId; if (!f) continue
      horasPorFase.set(f, (horasPorFase.get(f) ?? 0) + hh(t))
    }
    const horasTotal = [...horasPorFase.values()].reduce((s, h) => s + h, 0)
    if (horasTotal === 0) continue
    const pesoEfec = new Map<string, number>()
    for (const f of fases) {
      pesoEfec.set(f.id, f.pesoManual ?? ((horasPorFase.get(f.id) ?? 0) / horasTotal) * 100)
    }
    // peso de cada tarea en el % global: pesoFase/100 * hh(t)/horasFase
    const pesoTarea = new Map<string, number>()
    for (const t of tareas) {
      const f = t.proyectoEdt?.proyectoFaseId; if (!f) continue
      const hf = horasPorFase.get(f) ?? 0
      pesoTarea.set(t.id, hf > 0 ? ((pesoEfec.get(f) ?? 0) / 100) * (hh(t) / hf) : 0)
    }

    const av = await prisma.proyectoTareaAvance.findMany({
      where: { proyectoId: c.proyectoId },
      orderBy: [{ fecha: 'asc' }, { createdAt: 'asc' }],
      select: { proyectoTareaId: true, porcentaje: true, origen: true },
    })

    const prev = new Map<string, number>()
    const porOrigen: Record<string, number> = {}
    for (const a of av) {
      const w = pesoTarea.get(a.proyectoTareaId)
      if (w === undefined) continue
      const antes = prev.get(a.proyectoTareaId) ?? 0
      const delta = (a.porcentaje - antes) * w // puntos de avance global
      prev.set(a.proyectoTareaId, a.porcentaje)
      porOrigen[a.origen] = (porOrigen[a.origen] ?? 0) + delta
      totalPorOrigen[a.origen] = (totalPorOrigen[a.origen] ?? 0) + delta
    }

    // avance global actual, para saber qué fracción del total cubre el histórico
    let globalHoy = 0
    for (const t of tareas) globalHoy += t.porcentajeCompletado * (pesoTarea.get(t.id) ?? 0)

    const campo = porOrigen['campo'] ?? 0
    const oficina = porOrigen['oficina'] ?? 0
    const suma = campo + oficina
    if (suma <= 0.01 && globalHoy <= 0.01) continue
    filas.push({
      proy: c.proyecto.codigo,
      'global hoy %': globalHoy.toFixed(1),
      'ptos campo': campo.toFixed(1),
      'ptos oficina': oficina.toFixed(1),
      '% del histórico que es campo': suma > 0 ? `${((campo / suma) * 100).toFixed(0)}%` : '—',
      'sin rastro (ptos)': (globalHoy - suma).toFixed(1),
    })
  }

  console.log('=== APORTE AL AVANCE GLOBAL POR ORIGEN (en puntos de %) ===')
  console.table(filas)

  const c = totalPorOrigen['campo'] ?? 0
  const o = totalPorOrigen['oficina'] ?? 0
  console.log(`\nTOTAL sumando proyectos: campo ${c.toFixed(1)} ptos | oficina ${o.toFixed(1)} ptos`)
  console.log(`→ el histórico existente es ${((c / (c + o)) * 100).toFixed(0)}% campo / ${((o / (c + o)) * 100).toFixed(0)}% oficina`)
}

main().finally(() => prisma.$disconnect())
