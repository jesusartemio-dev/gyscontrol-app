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
import { claveLinea } from '@/lib/iperc/construirEstructura'

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
/**
 * Tope de filas por bloque. Es la medida que importa: lo que tarda una
 * generacion son las filas que la IA escribe, no las tareas que lee. El
 * bloque #1 de CJM52 tardo 205 s de los 300 disponibles para 51 filas.
 *
 * Contando tareas, dos bloques de 22 tareas podian pesar muy distinto: una
 * tarea puede llevar 1 peligro o 7, y una tarea unida a otras tres pesa lo
 * mismo que una sola.
 */
export const MAX_FILAS_POR_BLOQUE = 45

/**
 * Arma los bloques desde la estructura revisada, que es lo que de verdad se
 * va a generar: sin las tareas que se quitaron, con las unidas contando una
 * sola vez y con los peligros que fijo el ingeniero de seguridad.
 *
 * Devuelve null si todavia no hay estructura, para seguir con el reparto por
 * cronograma de siempre.
 */
async function construirDesdeEstructura(
  proyectoId: string,
  edtIds: string[],
): Promise<BloquePropuesto[] | null> {
  const iperc = await prisma.iperc.findUnique({
    where: { proyectoId },
    select: { id: true },
  })
  if (!iperc) return null

  const items = await prisma.ipercEstructuraItem.findMany({
    where: { ipercId: iperc.id, origen: { not: 'fija' } },
    orderBy: { orden: 'asc' },
    select: {
      proceso: true, actividad: true, tarea: true,
      peligrosPrevistos: true, tareaIds: true, actividadCronogramaRefId: true,
    },
  })
  if (items.length === 0) return null

  const tareas = await prisma.proyectoTarea.findMany({
    where: { id: { in: items.flatMap(i => i.tareaIds) } },
    select: { id: true, proyectoEdtId: true },
  })
  const edtDeTarea = new Map(tareas.map(t => [t.id, t.proyectoEdtId]))

  // Unidades indivisibles: una actividad con todas sus tareas. Partirla daria
  // evaluaciones inconsistentes entre peligros que se miran juntos.
  interface Unidad {
    nombre: string
    filas: number
    tareaIds: string[]
    actividadIds: string[]
    edtIds: string[]
  }
  const unidades: Unidad[] = []
  for (const item of items) {
    const clave = `${item.proceso.trim()}||${item.actividad.trim()}`
    let u = unidades.find(x => x.nombre === clave)
    if (!u) {
      u = { nombre: clave, filas: 0, tareaIds: [], actividadIds: [], edtIds: [] }
      unidades.push(u)
    }
    u.filas += item.peligrosPrevistos
    u.tareaIds.push(...item.tareaIds.filter(t => edtIds.includes(edtDeTarea.get(t) ?? '')))
    if (item.actividadCronogramaRefId && !u.actividadIds.includes(item.actividadCronogramaRefId)) {
      u.actividadIds.push(item.actividadCronogramaRefId)
    }
    for (const t of item.tareaIds) {
      const e = edtDeTarea.get(t)
      if (e && edtIds.includes(e) && !u.edtIds.includes(e)) u.edtIds.push(e)
    }
  }

  const utiles = unidades.filter(u => u.tareaIds.length > 0)
  if (utiles.length === 0) return null

  const bloques: BloquePropuesto[] = []
  let acum: Unidad[] = []
  let numero = 1

  const cerrar = () => {
    if (acum.length === 0) return
    const nombres = acum.map(u => u.nombre.split('||')[1])
    bloques.push({
      numero: numero++,
      nombre: nombres.length > 1 ? `${nombres[0]} … ${nombres[nombres.length - 1]}` : nombres[0],
      edtIds: [...new Set(acum.flatMap(u => u.edtIds))],
      actividadIds: [...new Set(acum.flatMap(u => u.actividadIds))],
      tareaIds: [...new Set(acum.flatMap(u => u.tareaIds))],
    })
    acum = []
  }

  for (const u of utiles) {
    const filasAcum = acum.reduce((n, x) => n + x.filas, 0)
    const tareasAcum = acum.reduce((n, x) => n + x.tareaIds.length, 0)
    const noEntra =
      filasAcum > 0 &&
      (filasAcum + u.filas > MAX_FILAS_POR_BLOQUE ||
        tareasAcum + u.tareaIds.length > MAX_TAREAS_POR_BLOQUE)
    if (noEntra) cerrar()
    acum.push(u)
    // Una actividad que sola pasa el tope va en su propio bloque: partirla
    // seria peor que un bloque grande, y si falla se reintenta sola.
    if (acum.reduce((n, x) => n + x.filas, 0) >= MAX_FILAS_POR_BLOQUE) cerrar()
  }
  cerrar()

  return bloques
}

/**
 * Rehace los bloques para que sigan a la estructura.
 *
 * Hace falta porque la estructura se edita despues de definirlos: al unir dos
 * tareas o fusionar dos actividades, el reparto de antes queda contando
 * trabajo que ya no existe. Asi quedo el IPERC de CJM52 con cuatro bloques de
 * 22, 22, 21 y 3 tareas cuando ya solo habia 63 lineas que evaluar.
 *
 * Lo que ya se genero no se pierde: un bloque cuyas lineas ya tienen filas
 * arranca como listo.
 */
export async function sincronizarBloques(proyectoId: string, ipercId: string): Promise<void> {
  const bloques = await prisma.ipercBloque.findMany({
    where: { ipercId },
    select: { edtIds: true },
  })
  const edtIds = [...new Set(bloques.flatMap(b => b.edtIds))]
  if (edtIds.length === 0) return

  const propuestos = await construirDesdeEstructura(proyectoId, edtIds)
  if (!propuestos || propuestos.length === 0) return

  const [items, filas] = await Promise.all([
    prisma.ipercEstructuraItem.findMany({
      where: { ipercId, origen: { not: 'fija' } },
      select: { proceso: true, actividad: true, tarea: true, tareaIds: true },
    }),
    prisma.ipercFila.findMany({
      where: { ipercId },
      select: { proceso: true, actividad: true, tarea: true },
    }),
  ])
  const conFila = new Set(filas.map(claveLinea))

  await prisma.$transaction([
    prisma.ipercBloque.deleteMany({ where: { ipercId } }),
    ...propuestos.map(b => {
      const suyos = items.filter(i => i.tareaIds.some(t => b.tareaIds.includes(t)))
      const hechos = suyos.filter(i => conFila.has(claveLinea(i))).length
      return prisma.ipercBloque.create({
        data: {
          ipercId,
          numero: b.numero,
          nombre: b.nombre,
          edtIds: b.edtIds,
          actividadIds: b.actividadIds,
          tareaIds: b.tareaIds,
          estado: suyos.length > 0 && hechos === suyos.length ? 'listo' : 'pendiente',
          filasGeneradas: hechos,
          updatedAt: new Date(),
        },
      })
    }),
  ])
}

export async function construirBloques(
  proyectoId: string,
  edtIds: string[],
): Promise<BloquePropuesto[]> {
  const desdeEstructura = await construirDesdeEstructura(proyectoId, edtIds)
  if (desdeEstructura && desdeEstructura.length > 0) return desdeEstructura

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
