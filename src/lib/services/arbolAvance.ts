import { prisma } from '@/lib/prisma'
import { calcularPesosFase, pesoNodo, type PesoFaseItem } from './pesoFase'
import { hh } from './horasHombre'

// Árbol jerárquico FASE → EDT → ACTIVIDAD → TAREA con horas, avance y pesos, para que el
// generador de Excel (hoja Avance) y la curva consuman una sola fuente. Reutiliza
// calcularPesosFase (pesoEfectivo por fase) y pesoNodo (reparto por horas). No duplica esa
// lógica.

export type TipoNodo = 'fase' | 'edt' | 'actividad' | 'tarea'

export interface NodoAvance {
  wbs: string // "1", "1.1", "1.1.1", "1.1.1.1"
  tipo: TipoNodo
  nivel: number // 1=fase, 2=edt, 3=actividad, 4=tarea
  nombre: string
  horasEstimadas: number // horas brutas del nodo (para mostrar)
  horasHombre: number    // horasEstimadas × personasEstimadas acumulado (para pesos)
  porcentajeCompletado: number // tarea: su %, nodo: rollup ponderado por horas-hombre
  pesoGlobal: number // peso del nodo en el proyecto (normalizado a Σ=100)
  pesoParcial: number // peso dentro de su padre (por horas-hombre)
  fechaInicio: Date | null // solo tareas
  fechaFin: Date | null // solo tareas
  proyectoTareaId: string | null
  hijos: NodoAvance[]
}

export interface ArbolAvanceResultado {
  proyectoId: string
  avanceGlobal: number // = calcularPesosFase().avanceGlobal
  sumaPesos: number
  pesosFase: PesoFaseItem[]
  ejecucion: NodoAvance[] // fases (nivel 1) del cronograma de ejecución
  baseline: NodoAvance[] // mismo shape, del cronograma planificacion (esBaseline)
}

const round2 = (n: number) => Number(n.toFixed(2))
function normFase(s: string): string {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim()
}
/** Promedio de % ponderado por horas (flat). Fallback a promedio simple si Σhoras = 0. */
function wavg(items: { pct: number; horas: number }[]): number {
  if (items.length === 0) return 0
  const h = items.reduce((s, i) => s + i.horas, 0)
  if (h <= 0) return items.reduce((s, i) => s + i.pct, 0) / items.length
  return items.reduce((s, i) => s + i.pct * i.horas, 0) / h
}

interface FilaTarea {
  id: string; nombre: string; orden: number; horasEstimadas: unknown; personasEstimadas: number; porcentajeCompletado: number
  fechaInicio: Date; fechaFin: Date; proyectoActividadId: string | null; proyectoEdtId: string
}

/**
 * Construye el árbol de UN cronograma. Las horas y el % se calculan bottom-up; el
 * pesoParcial (por horas) en la primera pasada; el pesoGlobal (que necesita horasFase y el
 * pesoEfectivo de la fase) en una segunda pasada.
 */
async function construirArbol(
  cronogramaId: string,
  pesoEfectivoPorFase: Map<string, number>, // normFase → pesoEfectivo (de calcularPesosFase)
  sumaPesos: number,
): Promise<NodoAvance[]> {
  const [fases, edts, acts, tareas] = await Promise.all([
    prisma.proyectoFase.findMany({ where: { proyectoCronogramaId: cronogramaId }, orderBy: { orden: 'asc' }, select: { id: true, nombre: true, orden: true } }),
    prisma.proyectoEdt.findMany({ where: { proyectoCronogramaId: cronogramaId }, orderBy: { orden: 'asc' }, select: { id: true, nombre: true, orden: true, proyectoFaseId: true } }),
    prisma.proyectoActividad.findMany({ where: { proyectoCronogramaId: cronogramaId }, orderBy: { orden: 'asc' }, select: { id: true, nombre: true, orden: true, proyectoEdtId: true } }),
    prisma.proyectoTarea.findMany({ where: { proyectoCronogramaId: cronogramaId }, orderBy: { orden: 'asc' }, select: { id: true, nombre: true, orden: true, horasEstimadas: true, personasEstimadas: true, porcentajeCompletado: true, fechaInicio: true, fechaFin: true, proyectoActividadId: true, proyectoEdtId: true } }),
  ])

  const tareasByAct = new Map<string, FilaTarea[]>()
  const tareasOrphanByEdt = new Map<string, FilaTarea[]>()
  for (const t of tareas as FilaTarea[]) {
    if (t.proyectoActividadId) (tareasByAct.get(t.proyectoActividadId) ?? tareasByAct.set(t.proyectoActividadId, []).get(t.proyectoActividadId)!).push(t)
    else (tareasOrphanByEdt.get(t.proyectoEdtId) ?? tareasOrphanByEdt.set(t.proyectoEdtId, []).get(t.proyectoEdtId)!).push(t)
  }
  const actsByEdt = new Map<string, typeof acts>()
  for (const a of acts) (actsByEdt.get(a.proyectoEdtId) ?? actsByEdt.set(a.proyectoEdtId, []).get(a.proyectoEdtId)!).push(a)
  const edtsByFase = new Map<string, typeof edts>()
  for (const e of edts) { const k = e.proyectoFaseId ?? '__sinfase__'; (edtsByFase.get(k) ?? edtsByFase.set(k, []).get(k)!).push(e) }

  const tareaNodo = (t: FilaTarea, wbs: string): NodoAvance => ({
    wbs, tipo: 'tarea', nivel: 4, nombre: t.nombre,
    horasEstimadas: Number(t.horasEstimadas || 0),
    horasHombre: hh(t),
    porcentajeCompletado: t.porcentajeCompletado, pesoGlobal: 0, pesoParcial: 0,
    fechaInicio: t.fechaInicio, fechaFin: t.fechaFin, proyectoTareaId: t.id, hijos: [],
  })

  // ── Pasada 1: estructura + horas (raw y hh) + % + pesoParcial (por horas-hombre) ──
  const faseNodes: NodoAvance[] = fases.map((f, fi) => {
    const wbsF = String(fi + 1)
    const edtsF = edtsByFase.get(f.id) ?? []
    const edtNodes: NodoAvance[] = edtsF.map((e, ei) => {
      const wbsE = `${wbsF}.${ei + 1}`
      const actsE = [...(actsByEdt.get(e.id) ?? [])]
      // tareas huérfanas (sin actividad) → actividad sintética
      const huerfanas = tareasOrphanByEdt.get(e.id)
      const actNodes: NodoAvance[] = actsE.map((a, ai) => {
        const wbsA = `${wbsE}.${ai + 1}`
        const ts = tareasByAct.get(a.id) ?? []
        const tareaNodes = ts.map((t, ti) => tareaNodo(t, `${wbsA}.${ti + 1}`))
        const horasAct = tareaNodes.reduce((s, n) => s + n.horasEstimadas, 0)
        const hhAct    = tareaNodes.reduce((s, n) => s + n.horasHombre, 0)
        tareaNodes.forEach((n) => { n.pesoParcial = round2(hhAct > 0 ? (n.horasHombre / hhAct) * 100 : 0) })
        return {
          wbs: wbsA, tipo: 'actividad' as const, nivel: 3, nombre: a.nombre,
          horasEstimadas: horasAct, horasHombre: hhAct,
          porcentajeCompletado: round2(wavg(tareaNodes.map((n) => ({ pct: n.porcentajeCompletado, horas: n.horasHombre })))),
          pesoGlobal: 0, pesoParcial: 0, fechaInicio: null, fechaFin: null, proyectoTareaId: null, hijos: tareaNodes,
        }
      })
      if (huerfanas && huerfanas.length) {
        const wbsA = `${wbsE}.${actNodes.length + 1}`
        const tareaNodes = huerfanas.map((t, ti) => tareaNodo(t, `${wbsA}.${ti + 1}`))
        const horasAct = tareaNodes.reduce((s, n) => s + n.horasEstimadas, 0)
        const hhAct    = tareaNodes.reduce((s, n) => s + n.horasHombre, 0)
        tareaNodes.forEach((n) => { n.pesoParcial = round2(hhAct > 0 ? (n.horasHombre / hhAct) * 100 : 0) })
        actNodes.push({
          wbs: wbsA, tipo: 'actividad', nivel: 3, nombre: '(sin actividad)',
          horasEstimadas: horasAct, horasHombre: hhAct,
          porcentajeCompletado: round2(wavg(tareaNodes.map((n) => ({ pct: n.porcentajeCompletado, horas: n.horasHombre })))),
          pesoGlobal: 0, pesoParcial: 0, fechaInicio: null, fechaFin: null, proyectoTareaId: null, hijos: tareaNodes,
        })
      }
      const horasEdt = actNodes.reduce((s, n) => s + n.horasEstimadas, 0)
      const hhEdt    = actNodes.reduce((s, n) => s + n.horasHombre, 0)
      actNodes.forEach((n) => { n.pesoParcial = round2(hhEdt > 0 ? (n.horasHombre / hhEdt) * 100 : 0) })
      return {
        wbs: wbsE, tipo: 'edt' as const, nivel: 2, nombre: e.nombre,
        horasEstimadas: horasEdt, horasHombre: hhEdt,
        porcentajeCompletado: round2(wavg(actNodes.map((n) => ({ pct: n.porcentajeCompletado, horas: n.horasHombre })))),
        pesoGlobal: 0, pesoParcial: 0, fechaInicio: null, fechaFin: null, proyectoTareaId: null, hijos: actNodes,
      }
    })
    const horasFase = edtNodes.reduce((s, n) => s + n.horasEstimadas, 0)
    const hhFase    = edtNodes.reduce((s, n) => s + n.horasHombre, 0)
    edtNodes.forEach((n) => { n.pesoParcial = round2(hhFase > 0 ? (n.horasHombre / hhFase) * 100 : 0) })
    return {
      wbs: wbsF, tipo: 'fase' as const, nivel: 1, nombre: f.nombre,
      horasEstimadas: horasFase, horasHombre: hhFase,
      porcentajeCompletado: round2(wavg(edtNodes.map((n) => ({ pct: n.porcentajeCompletado, horas: n.horasHombre })))),
      pesoGlobal: 0, pesoParcial: 0, fechaInicio: null, fechaFin: null, proyectoTareaId: null, hijos: edtNodes,
    }
  })

  // pesoParcial de fase = por horas-hombre dentro del proyecto
  const hhTotalFases = faseNodes.reduce((s, n) => s + n.horasHombre, 0)
  faseNodes.forEach((n) => { n.pesoParcial = round2(hhTotalFases > 0 ? (n.horasHombre / hhTotalFases) * 100 : 0) })

  // ── Pasada 2: pesoGlobal = pesoNodo(pesoEfectivoFase, hhNodo, hhFase) / Σpesos × 100 ──
  const fijarPesoGlobal = (nodo: NodoAvance, pesoEfFase: number, hhFaseTotal: number) => {
    const bruto = pesoNodo(pesoEfFase, nodo.horasHombre, hhFaseTotal)
    nodo.pesoGlobal = round2(sumaPesos > 0 ? (bruto / sumaPesos) * 100 : 0)
    nodo.hijos.forEach((h) => fijarPesoGlobal(h, pesoEfFase, hhFaseTotal))
  }
  for (const fase of faseNodes) {
    const pesoEfFase = pesoEfectivoPorFase.get(normFase(fase.nombre))
      ?? (hhTotalFases > 0 ? (fase.horasHombre / hhTotalFases) * 100 : 0) // fallback hh (baseline sin match)
    fijarPesoGlobal(fase, pesoEfFase, fase.horasHombre)
  }

  return faseNodes
}

/**
 * Devuelve el árbol de ejecución (con pesos y avance) + el árbol del baseline (planificacion),
 * para un proyecto. Empareja plan↔ejecución por (faseNombre, edtNombre, nombre, orden) vía
 * el wbs/nombre (los árboles comparten estructura por nombre).
 */
export async function obtenerArbolAvanceConPesos(proyectoId: string): Promise<ArbolAvanceResultado> {
  const pesos = await calcularPesosFase(proyectoId) // ejecución
  const pesoEfectivoPorFase = new Map(pesos.fases.map((f) => [normFase(f.nombre), f.pesoEfectivo]))

  const ejecucion = pesos.cronogramaId
    ? await construirArbol(pesos.cronogramaId, pesoEfectivoPorFase, pesos.sumaPesos)
    : []

  const cronoPlan = await prisma.proyectoCronograma.findFirst({
    where: { proyectoId, tipo: 'planificacion', esBaseline: true },
    select: { id: true },
  })
  // El baseline usa el MISMO pesoEfectivo de fase (por nombre) que ejecución, para la línea
  // planeada; si una fase del baseline no existe en ejecución, cae a su peso por horas.
  const baseline = cronoPlan
    ? await construirArbol(cronoPlan.id, pesoEfectivoPorFase, pesos.sumaPesos)
    : []

  return {
    proyectoId,
    avanceGlobal: pesos.avanceGlobal,
    sumaPesos: pesos.sumaPesos,
    pesosFase: pesos.fases,
    ejecucion,
    baseline,
  }
}
