import { prisma } from '@/lib/prisma'
import { hh } from '@/lib/services/horasHombre'

/**
 * ¿Cuánto % de avance le quitan las tareas extra al cronograma?
 * Compara el avance actual (con extras) contra el que habría si el % midiera solo el
 * alcance planificado (sin extras). Read-only.
 */

interface T {
  esExtra: boolean
  horasEstimadas: unknown
  personasEstimadas: number | null
  porcentajeCompletado: number
  faseId: string | null
}

function avanceGlobal(tareas: T[], fases: { id: string; pesoManual: number | null }[]): number {
  const horasPorFase = new Map<string, number>()
  const pondPorFase = new Map<string, number>()
  for (const t of tareas) {
    if (!t.faseId) continue
    const h = hh(t)
    horasPorFase.set(t.faseId, (horasPorFase.get(t.faseId) ?? 0) + h)
    pondPorFase.set(t.faseId, (pondPorFase.get(t.faseId) ?? 0) + t.porcentajeCompletado * h)
  }
  const horasTotal = [...horasPorFase.values()].reduce((s, h) => s + h, 0)
  if (horasTotal === 0) return 0
  let global = 0
  for (const f of fases) {
    const hf = horasPorFase.get(f.id) ?? 0
    const avanceFase = hf > 0 ? (pondPorFase.get(f.id) ?? 0) / hf : 0
    const peso = f.pesoManual ?? (hf / horasTotal) * 100
    global += (peso / 100) * avanceFase
  }
  return global
}

async function main() {
  const codigos = process.argv.slice(2)
  const cronos = await prisma.proyectoCronograma.findMany({
    where: { tipo: 'ejecucion', ...(codigos.length ? { proyecto: { codigo: { in: codigos } } } : {}) },
    select: { id: true, proyecto: { select: { codigo: true } } },
  })

  const resumen = []
  for (const c of cronos) {
    const raw = await prisma.proyectoTarea.findMany({
      where: { proyectoCronogramaId: c.id },
      select: {
        esExtra: true, descripcion: true, horasEstimadas: true, personasEstimadas: true,
        porcentajeCompletado: true, proyectoEdt: { select: { proyectoFaseId: true } },
      },
    })
    const fases = await prisma.proyectoFase.findMany({
      where: { proyectoCronogramaId: c.id },
      select: { id: true, nombre: true, pesoManual: true },
      orderBy: { orden: 'asc' },
    })
    if (raw.length === 0 || fases.length === 0) continue

    const tareas: T[] = raw.map((t) => ({
      esExtra: t.esExtra || (t.descripcion?.startsWith('[EXTRA]') ?? false),
      horasEstimadas: t.horasEstimadas,
      personasEstimadas: t.personasEstimadas,
      porcentajeCompletado: t.porcentajeCompletado,
      faseId: t.proyectoEdt?.proyectoFaseId ?? null,
    }))
    const extras = tareas.filter((t) => t.esExtra)
    if (extras.length === 0) continue

    const conExtras = avanceGlobal(tareas, fases)
    const sinExtras = avanceGlobal(tareas.filter((t) => !t.esExtra), fases)

    // Detalle por fase: sólo donde hay extras
    const detalleFases = fases.map((f) => {
      const dentro = tareas.filter((t) => t.faseId === f.id)
      const ext = dentro.filter((t) => t.esExtra)
      if (ext.length === 0) return null
      const av = (arr: T[]) => {
        const h = arr.reduce((s, t) => s + hh(t), 0)
        return h > 0 ? arr.reduce((s, t) => s + t.porcentajeCompletado * hh(t), 0) / h : 0
      }
      return {
        fase: f.nombre,
        extras: ext.length,
        'hh extras': Math.round(ext.reduce((s, t) => s + hh(t), 0)),
        'hh plan': Math.round(dentro.filter((t) => !t.esExtra).reduce((s, t) => s + hh(t), 0)),
        'avance con extras': `${av(dentro).toFixed(1)}%`,
        'avance solo plan': `${av(dentro.filter((t) => !t.esExtra)).toFixed(1)}%`,
        'avance de las extras': `${av(ext).toFixed(1)}%`,
      }
    }).filter(Boolean)

    resumen.push({
      proyecto: c.proyecto.codigo,
      extras: extras.length,
      'avance HOY': `${conExtras.toFixed(1)}%`,
      'avance solo plan': `${sinExtras.toFixed(1)}%`,
      'le quitan': `${(sinExtras - conExtras).toFixed(1)} pts`,
      'avance de las extras': extras.reduce((s, t) => s + hh(t), 0) > 0
        ? `${(extras.reduce((s, t) => s + t.porcentajeCompletado * hh(t), 0) / extras.reduce((s, t) => s + hh(t), 0)).toFixed(1)}%`
        : '—',
      _detalle: detalleFases,
    })
  }

  console.log('=== CUÁNTO % LE QUITAN LAS TAREAS EXTRA AL CRONOGRAMA ===\n')
  console.table(resumen.map(({ _detalle, ...r }) => r))

  console.log('\n=== DETALLE POR FASE (solo fases con extras) ===')
  for (const r of resumen) {
    if (!r._detalle?.length) continue
    console.log(`\n── ${r.proyecto} ──`)
    console.table(r._detalle)
  }
}

main()
  .catch((e) => { console.error(e); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
