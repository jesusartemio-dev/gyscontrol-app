// "Generar dependencias desde las fechas": deduce, de cómo están hoy las fechas,
// las dependencias que el usuario armó con "Después de…" / "En paralelo con…"
// antes de que esas acciones las guardaran. Solo entre tareas, sin mover nada:
// cada propuesta se cumple exactamente con las fechas actuales.
//
// Por cada tarea (en el orden de su actividad), mirando a las de arriba:
//  1. empieza justo cuando termina otra          → FC con esa
//  2. empieza a la vez que otra                   → CC con esa
//  3. empieza un tiempo después de que termina    → FC + desfase (la que termina más tarde antes)
//  4. empieza mientras la anterior está en curso  → CC + desfase
//  5. empieza antes que todas las de arriba       → nada (aviso: está desordenada)
// La primera tarea de una actividad se enlaza con la tarea de la actividad
// anterior (mismo EDT) que termina justo cuando ella empieza.
// No toca tareas que ya tienen predecesoras ni crea ciclos.

import { prisma } from '@/lib/prisma'
import { type CalendarioHoras, horasLaborablesEntre } from './cronogramaHoras'
import { creaCiclo, horasIncumplidas, type TipoDependencia } from './cronogramaDependencias'

export interface PropuestaDependencia {
  clave: string // "origenId>dependienteId"
  origenId: string
  origenNombre: string
  dependienteId: string
  dependienteNombre: string
  tipo: TipoDependencia
  lagMinutos: number
  /** Actividad de la sucesora (para agrupar en la vista previa). */
  grupo: string
  motivo: string
}

export interface ResultadoInferencia {
  propuestas: PropuestaDependencia[]
  avisos: string[]
  /** Tareas que se saltaron porque ya tienen predecesoras. */
  conPredecesoras: number
}

interface T { id: string; nombre: string; inicio: Date; fin: Date; esHito: boolean }

export async function inferirDependencias(
  cal: CalendarioHoras,
  cronogramaId: string,
  alcance: { tipo: 'fase' | 'edt' | 'actividad'; id: string },
): Promise<ResultadoInferencia> {
  const whereEdt =
    alcance.tipo === 'fase' ? { proyectoFaseId: alcance.id }
    : alcance.tipo === 'edt' ? { id: alcance.id }
    : { proyectoActividad: { some: { id: alcance.id } } }

  const edts = await prisma.proyectoEdt.findMany({
    where: { proyectoCronogramaId: cronogramaId, ...whereEdt },
    orderBy: { orden: 'asc' },
    select: {
      proyectoActividad: {
        orderBy: { orden: 'asc' },
        select: {
          id: true,
          nombre: true,
          proyectoTarea: {
            where: { esExtra: false },
            orderBy: [{ orden: 'asc' }, { fechaInicio: 'asc' }],
            select: { id: true, nombre: true, fechaInicio: true, fechaFin: true, esHito: true },
          },
        },
      },
    },
  })

  const deps = await prisma.proyectoDependenciasTarea.findMany({
    where: { tareaOrigen: { proyectoCronogramaId: cronogramaId } },
    select: { tareaOrigenId: true, tareaDependienteId: true },
  })
  const conPred = new Set(deps.map((d) => d.tareaDependienteId))
  const grafo = [...deps]

  const res: ResultadoInferencia = { propuestas: [], avisos: [], conPredecesoras: 0 }
  const h = (a: Date, b: Date) => horasLaborablesEntre(cal, a, b)
  const r2 = (n: number) => Math.round(n * 100) / 100
  const mismoMomento = (a: Date, b: Date) => h(a, b) === 0 && h(b, a) === 0

  const proponer = (
    pred: T, suc: T, tipo: TipoDependencia, lagHoras: number, grupo: string, motivo: string,
  ) => {
    const lagMinutos = Math.round(lagHoras * 60)
    // Tiene que cumplirse tal cual con las fechas de hoy (no mueve nada).
    if (horasIncumplidas(cal, { tipo, lagMinutos }, { inicio: pred.inicio, fin: pred.fin }, { inicio: suc.inicio, fin: suc.fin }) > 0) return
    if (creaCiclo(grafo, pred.id, suc.id)) return
    grafo.push({ tareaOrigenId: pred.id, tareaDependienteId: suc.id })
    res.propuestas.push({
      clave: `${pred.id}>${suc.id}`,
      origenId: pred.id, origenNombre: pred.nombre,
      dependienteId: suc.id, dependienteNombre: suc.nombre,
      tipo, lagMinutos, grupo, motivo,
    })
  }

  for (const edt of edts) {
    let anteriores: T[] = [] // tareas de la actividad anterior del mismo EDT
    for (const act of edt.proyectoActividad) {
      // Fin antes que el inicio: dato inválido, no se usa para deducir nada.
      const tareas: T[] = []
      for (const t of act.proyectoTarea) {
        if (t.fechaFin < t.fechaInicio) {
          res.avisos.push(`"${t.nombre}" (${act.nombre}) tiene el fin antes del inicio: corrige sus fechas.`)
          continue
        }
        tareas.push({ id: t.id, nombre: t.nombre, inicio: t.fechaInicio, fin: t.fechaFin, esHito: t.esHito })
      }
      tareas.forEach((t, i) => {
        if (conPred.has(t.id)) { res.conPredecesoras++; return }
        const arriba = tareas.slice(0, i)

        // 1. Justo después de otra (la más cercana arriba)
        const fc = [...arriba].reverse().find((s) => s.fin <= t.inicio && h(s.fin, t.inicio) === 0)
        if (fc) return proponer(fc, t, 'finish_to_start', 0, act.nombre, 'empieza cuando termina')
        // 2. A la vez que otra
        const cc = [...arriba].reverse().find((s) => mismoMomento(s.inicio, t.inicio))
        if (cc) return proponer(cc, t, 'start_to_start', 0, act.nombre, 'empieza junto con')

        if (arriba.length === 0) {
          // Primera de la actividad: con la actividad anterior, solo si va justo después.
          const prev = [...anteriores].reverse().find((s) => s.fin <= t.inicio && h(s.fin, t.inicio) === 0)
          if (prev) proponer(prev, t, 'finish_to_start', 0, act.nombre, 'sigue a la actividad anterior')
          return
        }
        // 3. Después de un hueco: desde la que termina más tarde antes de que empiece
        const terminadas = arriba.filter((s) => s.fin <= t.inicio)
        if (terminadas.length) {
          const ref = terminadas.reduce((a, b) => (b.fin > a.fin ? b : a))
          return proponer(ref, t, 'finish_to_start', r2(h(ref.fin, t.inicio)), act.nombre, 'empieza después de un intervalo')
        }
        // 4. Empieza mientras otra está en curso: CC con desfase desde su inicio
        const enCurso = [...arriba].reverse().find((s) => s.inicio <= t.inicio && s.fin > t.inicio)
        if (enCurso) return proponer(enCurso, t, 'start_to_start', r2(h(enCurso.inicio, t.inicio)), act.nombre, 'empieza mientras otra está en curso')
        // 5. Empieza antes que todas las de arriba
        res.avisos.push(`"${t.nombre}" (${act.nombre}) empieza antes que las tareas de arriba: revisa el orden o asígnale la predecesora a mano.`)
      })
      if (tareas.length) anteriores = tareas
    }
  }
  return res
}
