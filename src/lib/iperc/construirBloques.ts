// ===================================================
// 📁 construirBloques.ts
// 📌 Parte las tareas de los EDTs elegidos en bloques generables.
//
// Generar todo de una vez no cabe en los 5 min de Vercel. En CJM52, con 68
// tareas, solo termino la primera ola de 3 lotes de 10 (30 tareas) a los 3.5
// min; las olas siguientes murieron en el corte y nadie se entero. Un bloque
// es lo que cabe con margen en una peticion.
// ===================================================

import { prisma } from '@/lib/prisma'

/**
 * Tope de tareas por bloque. Una ola son 3 lotes en paralelo de 10 tareas
 * (alto riesgo, que es el caso de EJECUCION), y una ola entera tardo 3.5 min
 * de los 5 disponibles. 24 deja margen sin volver tedioso el proceso.
 */
export const MAX_TAREAS_POR_BLOQUE = 24

export interface BloquePropuesto {
  numero: number
  nombre: string
  edtIds: string[]
  actividadIds: string[]
  tareaIds: string[]
}

/**
 * Arma los bloques respetando dos reglas:
 *
 * 1. Una actividad nunca se parte en dos bloques — sus peligros se evaluan
 *    juntos y partirla daria evaluaciones inconsistentes.
 * 2. Un bloque no mezcla EDTs. Son procesos distintos y el IPERC los lista
 *    por separado; mezclarlos complica leer el resultado y reintentarlo.
 *
 * Una actividad que por si sola pase del tope se queda en su propio bloque:
 * partirla romperia la regla 1, y es mejor un bloque grande que un IPERC
 * incoherente. Si falla, se reintenta sola.
 */
export async function construirBloques(
  proyectoId: string,
  edtIds: string[],
): Promise<BloquePropuesto[]> {
  const cronograma = await prisma.proyectoCronograma.findUnique({
    where: { proyectoId_tipo: { proyectoId, tipo: 'planificacion' } },
    select: { id: true },
  })
  if (!cronograma) return []

  const fases = await prisma.proyectoFase.findMany({
    where: { proyectoCronogramaId: cronograma.id },
    select: { id: true, orden: true },
  })
  const faseOrden = new Map(fases.map(f => [f.id, f.orden]))

  const edts = await prisma.proyectoEdt.findMany({
    where: { proyectoCronogramaId: cronograma.id, id: { in: edtIds } },
    select: { id: true, nombre: true, orden: true, proyectoFaseId: true },
  })
  edts.sort((a, b) => {
    const fa = a.proyectoFaseId ? faseOrden.get(a.proyectoFaseId) ?? 9999 : 9999
    const fb = b.proyectoFaseId ? faseOrden.get(b.proyectoFaseId) ?? 9999 : 9999
    return fa !== fb ? fa - fb : a.orden - b.orden
  })

  const actividades = await prisma.proyectoActividad.findMany({
    where: { proyectoCronogramaId: cronograma.id, proyectoEdtId: { in: edtIds } },
    select: { id: true, nombre: true, orden: true, proyectoEdtId: true },
    orderBy: { orden: 'asc' },
  })

  const tareas = await prisma.proyectoTarea.findMany({
    where: { proyectoCronogramaId: cronograma.id, proyectoEdtId: { in: edtIds } },
    select: { id: true, orden: true, proyectoEdtId: true, proyectoActividadId: true },
    orderBy: { orden: 'asc' },
  })

  const tareasPorActividad = new Map<string, string[]>()
  const tareasSueltasPorEdt = new Map<string, string[]>()
  for (const t of tareas) {
    if (t.proyectoActividadId) {
      const arr = tareasPorActividad.get(t.proyectoActividadId) ?? []
      arr.push(t.id)
      tareasPorActividad.set(t.proyectoActividadId, arr)
    } else {
      const arr = tareasSueltasPorEdt.get(t.proyectoEdtId) ?? []
      arr.push(t.id)
      tareasSueltasPorEdt.set(t.proyectoEdtId, arr)
    }
  }

  const bloques: BloquePropuesto[] = []
  let numero = 1

  for (const edt of edts) {
    const actsDelEdt = actividades.filter(a => a.proyectoEdtId === edt.id)

    // Unidades indivisibles: cada actividad con sus tareas, más las tareas
    // que cuelgan del EDT sin actividad.
    const unidades: Array<{ actividadId: string | null; nombre: string; tareaIds: string[] }> = []
    for (const a of actsDelEdt) {
      const ts = tareasPorActividad.get(a.id) ?? []
      if (ts.length > 0) unidades.push({ actividadId: a.id, nombre: a.nombre, tareaIds: ts })
    }
    const sueltas = tareasSueltasPorEdt.get(edt.id) ?? []
    if (sueltas.length > 0) {
      unidades.push({ actividadId: null, nombre: 'Tareas sin actividad', tareaIds: sueltas })
    }
    if (unidades.length === 0) continue

    let acum: typeof unidades = []
    let acumTareas = 0

    const cerrar = () => {
      if (acum.length === 0) return
      bloques.push({
        numero: numero++,
        nombre: `${edt.nombre} · ${acum[0].nombre}${acum.length > 1 ? ` … ${acum[acum.length - 1].nombre}` : ''}`,
        edtIds: [edt.id],
        actividadIds: acum.map(u => u.actividadId).filter((x): x is string => !!x),
        tareaIds: acum.flatMap(u => u.tareaIds),
      })
      acum = []
      acumTareas = 0
    }

    for (const u of unidades) {
      // Si ya hay algo acumulado y esta unidad no entra, se cierra el bloque.
      if (acumTareas > 0 && acumTareas + u.tareaIds.length > MAX_TAREAS_POR_BLOQUE) cerrar()
      acum.push(u)
      acumTareas += u.tareaIds.length
      // Una actividad sola que ya pasa el tope va en su propio bloque.
      if (acumTareas >= MAX_TAREAS_POR_BLOQUE) cerrar()
    }
    cerrar()
  }

  return bloques
}
