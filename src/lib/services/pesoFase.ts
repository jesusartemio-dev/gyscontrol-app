import { prisma } from '@/lib/prisma'

// Peso por fase del cronograma de EJECUCIÓN.
//  - Cada fase puede tener un `pesoManual` (escrito a mano). Si es null, su peso por defecto
//    es su participación por horas.
//  - El peso efectivo se NORMALIZA a 100% sobre todas las fases (auto: el usuario no tiene
//    que cuadrar la suma).
//  - Debajo de la fase, todo se reparte por horas: peso(nodo) = pesoEfectivo(fase) × horasNodo/horasFase.
//  - avanceGlobal = Σ pesoEfectivo × avanceFase (avanceFase = % ponderado por horas).

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
  if (!cronograma) {
    return { cronogramaId: null, horasTotal: 0, fases: [], avanceGlobal: 0, sumaPesos: 0 }
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
        horasEstimadas: true,
        porcentajeCompletado: true,
        proyectoEdt: { select: { proyectoFaseId: true } },
      },
    }),
  ])

  // Horas y avance ponderado por fase (avance nested == flat cuando el peso son horas).
  const horasPorFase = new Map<string, number>()
  const pondPorFase = new Map<string, number>() // Σ(% × horas)
  for (const t of tareas) {
    const faseId = t.proyectoEdt?.proyectoFaseId
    if (!faseId) continue // tarea de un EDT sin fase: no se atribuye
    const h = Number(t.horasEstimadas ?? 0)
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

  return { cronogramaId: cronograma.id, horasTotal, fases, avanceGlobal, sumaPesos }
}
