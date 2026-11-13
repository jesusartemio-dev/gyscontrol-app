// ===================================================
// 📁 construirEstructura.ts
// 📌 La lista de actividades y tareas del IPERC, antes de analizar nada.
//
// Es como trabaja el SSOMA. En el Excel de CJM50 tiene una hoja aparte con dos
// columnas —actividad y tarea— donde saca lo que no va, une lo repetido y
// decide cuántos peligros va a tener cada tarea. La cuenta de peligros está en
// el alto de cada celda combinada: previó 57 filas para 18 tareas, de 1 a 7
// según el trabajo, y en el IPERC final acertó en 17 de las 18.
//
// Recién con esa lista cerrada empieza a analizar. Hasta ahora nosotros
// hacíamos lo contrario: generábamos todo y después buscábamos qué unir.
// ===================================================

import { prisma } from '@/lib/prisma'

/** El orden de los procesos en el IPERC: lo del cronograma va en el medio. */
const PROCESOS_ANTES = ['ACTIVIDADES GENERALES', 'SISTEMA DE CONTROL DE ENERGIAS']
const PROCESOS_DESPUES = ['CIERRE']

/**
 * Peligros que se proponen para una tarea del cronograma.
 *
 * Tres es la mediana de lo que pone el SSOMA, y es un punto de partida para
 * que lo corrija, no un criterio. Dejándoselo a la IA, de 143 tareas le puso
 * exactamente 3 a 97 y 2 a 39: eso no es criterio, es un tic del modelo.
 */
export const PELIGROS_SUGERIDOS = 3

export interface ItemEstructuraPropuesto {
  orden: number
  proceso: string
  actividad: string
  tarea: string
  peligrosPrevistos: number
  origen: 'cronograma' | 'fija'
  catalogoActividadFijaId: string | null
  tareaIds: string[]
  actividadCronogramaRefId: string | null
}

/**
 * Las actividades fijas, agrupadas por tarea.
 *
 * Cada fila del catálogo es un peligro, así que una tarea con dos filas entra
 * con dos peligros previstos. `catalogoActividadFijaId` apunta a la primera
 * del grupo, solo para poder rastrear de dónde salió: al generar, las filas se
 * buscan por proceso + actividad + tarea, que es lo que identifica al grupo.
 */
async function itemsFijos(procesos: string[]): Promise<Omit<ItemEstructuraPropuesto, 'orden'>[]> {
  const filas = await prisma.ipercCatalogoActividadFija.findMany({
    where: { activo: true, proceso: { in: procesos } },
    orderBy: { orden: 'asc' },
    select: { id: true, proceso: true, actividad: true, tarea: true },
  })

  const grupos = new Map<string, Omit<ItemEstructuraPropuesto, 'orden'>>()
  for (const f of filas) {
    const clave = claveLinea(f)
    const existente = grupos.get(clave)
    if (existente) {
      existente.peligrosPrevistos++
      continue
    }
    grupos.set(clave, {
      proceso: f.proceso,
      actividad: f.actividad,
      tarea: f.tarea,
      peligrosPrevistos: 1,
      origen: 'fija',
      catalogoActividadFijaId: f.id,
      tareaIds: [],
      actividadCronogramaRefId: null,
    })
  }

  // El orden de los procesos lo decide quien llama, no el catálogo.
  return procesos.flatMap(p => [...grupos.values()].filter(g => g.proceso === p))
}

/**
 * Arma la estructura propuesta: las actividades fijas, las tareas de los EDTs
 * elegidos y el cierre, en el orden en que van en el IPERC.
 *
 * El proceso de cada tarea del cronograma es el nombre del EDT. Se limpia el
 * numeral del principio porque venía entrando tal cual: CJM39 quedó con el
 * proceso "4.2. Construcción", y CJM50 con "Construcción" y "Construccion"
 * conviviendo, según el bloque en el que se generó cada fila.
 */
export async function construirEstructura(
  proyectoId: string,
  edtIds: string[],
): Promise<ItemEstructuraPropuesto[]> {
  const items: Omit<ItemEstructuraPropuesto, 'orden'>[] = []

  items.push(...(await itemsFijos(PROCESOS_ANTES)))
  items.push(...(await itemsDelCronograma(proyectoId, edtIds)))
  items.push(...(await itemsFijos(PROCESOS_DESPUES)))

  return items.map((item, i) => ({ ...item, orden: i + 1 }))
}

async function itemsDelCronograma(
  proyectoId: string,
  edtIds: string[],
): Promise<Omit<ItemEstructuraPropuesto, 'orden'>[]> {
  if (edtIds.length === 0) return []

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
    select: { id: true, nombre: true, orden: true, proyectoEdtId: true, proyectoActividadId: true },
    orderBy: { orden: 'asc' },
  })

  const salida: Omit<ItemEstructuraPropuesto, 'orden'>[] = []

  for (const edt of edts) {
    const proceso = limpiarNombreProceso(edt.nombre)
    const actsDelEdt = actividades.filter(a => a.proyectoEdtId === edt.id)

    for (const act of actsDelEdt) {
      for (const t of tareas.filter(x => x.proyectoActividadId === act.id)) {
        salida.push({
          proceso,
          actividad: limpiarNombre(act.nombre),
          tarea: limpiarNombre(t.nombre),
          peligrosPrevistos: PELIGROS_SUGERIDOS,
          origen: 'cronograma',
          catalogoActividadFijaId: null,
          tareaIds: [t.id],
          actividadCronogramaRefId: act.id,
        })
      }
    }

    // Tareas que cuelgan del EDT sin actividad: la actividad es el EDT.
    for (const t of tareas.filter(x => x.proyectoEdtId === edt.id && !x.proyectoActividadId)) {
      salida.push({
        proceso,
        actividad: proceso,
        tarea: limpiarNombre(t.nombre),
        peligrosPrevistos: PELIGROS_SUGERIDOS,
        origen: 'cronograma',
        catalogoActividadFijaId: null,
        tareaIds: [t.id],
        actividadCronogramaRefId: null,
      })
    }
  }

  return salida
}

/** Quita el numeral del cronograma: "4.2. Construcción" → "Construcción". */
export function limpiarNombreProceso(nombre: string): string {
  return nombre.replace(/^\s*[\d.]+[.)]?\s*/, '').trim() || nombre.trim()
}

/** Los espacios de más del cronograma no distinguen nada. */
export const limpiarNombre = (s: string) => s.replace(/\s+/g, ' ').trim()

/**
 * La clave con la que una fila del IPERC se reconoce como de una línea de la
 * estructura.
 *
 * Normaliza los espacios a propósito: varias actividades del cronograma de
 * CJM52 terminan en espacio ("Previos - Movilización y Trabajos preliminares
 * "), la estructura las guardaba tal cual y la IA devolvía el nombre
 * recortado. Las claves no coincidían, y por eso un bloque ya generado seguía
 * figurando como pendiente.
 */
export function claveLinea(x: { proceso: string; actividad: string; tarea: string }): string {
  return `${limpiarNombre(x.proceso)}||${limpiarNombre(x.actividad)}||${limpiarNombre(x.tarea)}`
}

/** Las filas que saldrán, para avisar antes de generar. */
export function totalFilasPrevistas(items: Array<{ peligrosPrevistos: number }>): number {
  return items.reduce((n, i) => n + i.peligrosPrevistos, 0)
}

/**
 * Pone al día qué líneas de la estructura ya tienen filas y cuántas.
 *
 * Se cuenta contra las filas reales en vez de ir anotando a medida que se
 * generan: si una generación se corta a la mitad, el estado sigue siendo el
 * que se puede comprobar.
 */
export async function sincronizarEstadoEstructura(ipercId: string): Promise<void> {
  const [items, filas] = await Promise.all([
    prisma.ipercEstructuraItem.findMany({
      where: { ipercId },
      select: { id: true, proceso: true, actividad: true, tarea: true, estado: true, filasGeneradas: true },
    }),
    prisma.ipercFila.findMany({
      where: { ipercId },
      select: { proceso: true, actividad: true, tarea: true },
    }),
  ])
  if (items.length === 0) return

  const cuenta = new Map<string, number>()
  for (const f of filas) {
    const k = claveLinea(f)
    cuenta.set(k, (cuenta.get(k) ?? 0) + 1)
  }

  const cambios = items
    .map(i => ({ i, n: cuenta.get(claveLinea(i)) ?? 0 }))
    .filter(({ i, n }) => i.filasGeneradas !== n || i.estado !== (n > 0 ? 'generada' : 'pendiente'))

  if (cambios.length === 0) return

  await prisma.$transaction(
    cambios.map(({ i, n }) =>
      prisma.ipercEstructuraItem.update({
        where: { id: i.id },
        data: { filasGeneradas: n, estado: n > 0 ? 'generada' : 'pendiente' },
      }),
    ),
  )
}
