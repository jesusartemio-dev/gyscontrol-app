import { prisma } from '@/lib/prisma'
import { hh } from './horasHombre'
import { esTareaExtra, SELECT_ES_EXTRA, type ResumenFueraDePlan } from './tareaExtra'

// Peso por fase del cronograma de EJECUCIÓN.
//  - Cada fase puede tener un `pesoManual` (escrito a mano). Si es null, su peso por defecto
//    es su participación por horas.
//  - El peso efectivo se NORMALIZA a 100% sobre todas las fases (auto: el usuario no tiene
//    que cuadrar la suma).
//  - Debajo de la fase, todo se reparte por horas: peso(nodo) = pesoEfectivo(fase) × horasNodo/horasFase.
//  - avanceGlobal = Σ pesoEfectivo × avanceFase (avanceFase = % ponderado por horas).
//  - Las tareas EXTRA quedan fuera de todo el cálculo: el % mide el alcance planificado.
//    Su volumen se devuelve aparte en `fueraDePlan` (crecimiento de alcance).

export interface PesoFaseItem {
  faseId: string
  nombre: string
  orden: number
  horasFase: number
  avanceFase: number // % 0-100, ponderado por horas de sus tareas
  pesoHorasDefault: number // % 0-100, participación por horas
  pesoManual: number | null // valor crudo guardado (null = usar el default)
  pesoEfectivo: number // % 0-100, normalizado a 100% entre fases
}

export interface PesosFaseResultado {
  cronogramaId: string | null
  horasTotal: number
  fases: PesoFaseItem[]
  avanceGlobal: number // % 0-100, ponderado por pesoEfectivo
  sumaPesos: number // Σ pesoEfectivo (puede no dar 100; el UI lo indica)
  /** Trabajo ejecutado fuera del alcance planificado. No entra en avanceGlobal. */
  fueraDePlan: ResumenFueraDePlan
}

/** Peso de un nodo (EDT/actividad/tarea) dentro de su fase: reparto lineal por horas. */
export function pesoNodo(pesoEfectivoFase: number, horasNodo: number, horasFase: number): number {
  if (horasFase <= 0) return 0
  return (pesoEfectivoFase * horasNodo) / horasFase
}

/**
 * Calcula el peso (sugerido por horas, manual y efectivo normalizado) y el avance por fase
 * del cronograma de ejecución del proyecto, más el avance global ponderado.
 */
export async function calcularPesosFase(proyectoId: string): Promise<PesosFaseResultado> {
  const cronograma = await prisma.proyectoCronograma.findFirst({
    where: { proyectoId, tipo: 'ejecucion' },
    select: { id: true },
  })
  const SIN_EXTRAS: ResumenFueraDePlan = { tareas: 0, horasHombre: 0, horasReales: 0, porcentajeSobrePlan: 0 }
  if (!cronograma) {
    return { cronogramaId: null, horasTotal: 0, fases: [], avanceGlobal: 0, sumaPesos: 0, fueraDePlan: SIN_EXTRAS }
  }

  const [fasesRaw, tareas] = await Promise.all([
    prisma.proyectoFase.findMany({
      where: { proyectoCronogramaId: cronograma.id },
      select: { id: true, nombre: true, orden: true, pesoManual: true },
      orderBy: { orden: 'asc' },
    }),
    prisma.proyectoTarea.findMany({
      where: { proyectoCronogramaId: cronograma.id },
      select: {
        ...SELECT_ES_EXTRA,
        horasEstimadas: true,
        personasEstimadas: true,
        porcentajeCompletado: true,
        horasReales: true,
        proyectoEdt: { select: { proyectoFaseId: true } },
      },
    }),
  ])

  // Las extras se apartan ANTES de cualquier ponderación: no diluyen el avance del plan.
  const extras = tareas.filter(esTareaExtra)
  const planificadas = tareas.filter((t) => !esTareaExtra(t))

  // Horas-hombre y avance ponderado por fase. horasPorFase acumula hh = horasEstimadas × personasEstimadas.
  const horasPorFase = new Map<string, number>()
  const pondPorFase = new Map<string, number>() // Σ(% × hh)
  for (const t of planificadas) {
    const faseId = t.proyectoEdt?.proyectoFaseId
    if (!faseId) continue // tarea de un EDT sin fase: no se atribuye
    const h = hh(t)
    horasPorFase.set(faseId, (horasPorFase.get(faseId) ?? 0) + h)
    pondPorFase.set(faseId, (pondPorFase.get(faseId) ?? 0) + t.porcentajeCompletado * h)
  }

  const horasTotal = [...horasPorFase.values()].reduce((s, h) => s + h, 0)
  const n = fasesRaw.length
  const repartoEquitativo = n > 0 ? 100 / n : 0

  // Paso 1: horasFase, avanceFase, pesoHorasDefault, y "raw" (manual ?? default).
  const base = fasesRaw.map((f) => {
    const horasFase = horasPorFase.get(f.id) ?? 0
    const avanceFase = horasFase > 0 ? (pondPorFase.get(f.id) ?? 0) / horasFase : 0
    const pesoHorasDefault = horasTotal > 0 ? (horasFase / horasTotal) * 100 : repartoEquitativo
    const raw = f.pesoManual ?? pesoHorasDefault
    return { f, horasFase, avanceFase, pesoHorasDefault, raw }
  })

  // Paso 2: pesoEfectivo = peso usado SIN normalizar (lo que el usuario asignó, o el
  // sugerido por horas si está vacío). La suma puede no dar 100% → el UI lo indica y
  // ofrece normalizar a mano; nunca se modifica el valor que el usuario escribió.
  const fases: PesoFaseItem[] = base.map((b) => ({
    faseId: b.f.id,
    nombre: b.f.nombre,
    orden: b.f.orden,
    horasFase: b.horasFase,
    avanceFase: Number(b.avanceFase.toFixed(2)),
    pesoHorasDefault: Number(b.pesoHorasDefault.toFixed(2)),
    pesoManual: b.f.pesoManual,
    pesoEfectivo: Number(b.raw.toFixed(2)),
  }))

  const sumaPesos = Number(fases.reduce((s, f) => s + f.pesoEfectivo, 0).toFixed(2))
  const avanceGlobal = Number(
    fases.reduce((s, f) => s + (f.pesoEfectivo / 100) * f.avanceFase, 0).toFixed(2),
  )

  const hhExtras = extras.reduce((s, t) => s + hh(t), 0)
  const fueraDePlan: ResumenFueraDePlan = {
    tareas: extras.length,
    horasHombre: Number(hhExtras.toFixed(1)),
    horasReales: Number(extras.reduce((s, t) => s + Number(t.horasReales ?? 0), 0).toFixed(1)),
    porcentajeSobrePlan: horasTotal > 0 ? Number(((hhExtras / horasTotal) * 100).toFixed(1)) : 0,
  }

  return { cronogramaId: cronograma.id, horasTotal, fases, avanceGlobal, sumaPesos, fueraDePlan }
}
