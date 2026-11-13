// ===================================================
// 📁 reducirEstructura.ts
// 📌 Qué actividades de la estructura son la misma cosa repetida.
//
// En CJM52 el cronograma trae "Tramo 1 - Filtro D2112 - Sala 320K" y "Tramo 2
// - Filtro D2122 - Sala 320K" con exactamente las mismas cinco tareas. Para
// el cronograma son trabajos distintos —se ejecutan por separado y se avanzan
// por separado— pero para el IPERC son el mismo análisis: los peligros de
// armar un andamio no cambian por el tramo.
//
// Esto ya existía, pero actuaba después de generar, cuando la IA ya había
// escrito —y cobrado— las filas repetidas. Acá se ve antes.
// ===================================================

import { prisma } from '@/lib/prisma'
import { normalizarTarea } from '@/lib/iperc/actividadesSimilares'

/** Debajo de esto no vale la pena proponer nada. */
const MIN_TAREAS = 2

export interface ActividadFusionable {
  proceso: string
  actividad: string
  itemIds: string[]
  tareas: string[]
  filas: number
}

export interface SugerenciaFusion {
  /** Estable, para que la UI no pierda el grupo al refrescar. */
  clave: string
  proceso: string
  actividades: ActividadFusionable[]
  /** Cómo quedarían las tareas al fusionar. */
  tareasResultantes: Array<{ nombre: string; peligrosPrevistos: number }>
  tituloSugerido: string
  filasActuales: number
  filasDespues: number
  ahorro: number
}

/**
 * Junta varios nombres en uno.
 *
 * Los nombres del cronograma vienen por tramos separados por " - ", y casi
 * siempre solo cambia un tramo: "Tramo 1 - Filtro D2112 - Sala 320K" y
 * "Tramo 2 - Filtro D2122 - Sala 320K" dan "Tramo 1 y 2 - Filtro D2112 y
 * D2122 - Sala 320K".
 *
 * Es una propuesta para que la edite quien revisa, no una regla.
 */
export function combinarNombres(nombres: string[]): string {
  const unicos = [...new Set(nombres.map(n => n.trim()).filter(Boolean))]
  if (unicos.length <= 1) return unicos[0] ?? ''

  const partidos = unicos.map(n => n.split(/\s+-\s+/))
  const n = partidos[0].length
  if (!partidos.every(p => p.length === n)) return enumerar(unicos)

  const salida: string[] = []
  for (let i = 0; i < n; i++) {
    const valores = [...new Set(partidos.map(p => p[i].trim()))]
    salida.push(valores.length === 1 ? valores[0] : combinarSegmento(valores))
  }
  return salida.join(' - ')
}

/** Como se enumera en castellano: "a, b y c". */
function enumerar(valores: string[]): string {
  if (valores.length <= 1) return valores[0] ?? ''
  return `${valores.slice(0, -1).join(', ')} y ${valores[valores.length - 1]}`
}

/** "Tramo 1" + "Tramo 2" → "Tramo 1 y 2"; sin prefijo común, se unen enteros. */
function combinarSegmento(valores: string[]): string {
  const palabras = valores.map(v => v.split(/\s+/))
  let comunes = 0
  while (
    comunes < palabras[0].length - 1 &&
    palabras.every(p => p.length > comunes + 1 && p[comunes] === palabras[0][comunes])
  ) {
    comunes++
  }
  if (comunes === 0) return enumerar(valores)
  const prefijo = palabras[0].slice(0, comunes).join(' ')
  const colas = palabras.map(p => p.slice(comunes).join(' '))
  return `${prefijo} ${enumerar(colas)}`
}

/**
 * El nombre de una tarea fusionada.
 *
 * Si lo único que cambia es el tramo del principio, se cae: la actividad
 * fusionada ya dice de qué tramos habla, y "T1-D2112 y T2-D2122 - Armado de
 * Andamios" no aporta nada sobre "Armado de Andamios".
 */
export function combinarNombresTarea(nombres: string[]): string {
  const unicos = [...new Set(nombres.map(n => n.trim()).filter(Boolean))]
  if (unicos.length <= 1) return unicos[0] ?? ''

  const partidos = unicos.map(n => n.split(/\s+-\s+/))
  const n = partidos[0].length
  if (n > 1 && partidos.every(p => p.length === n)) {
    const cola = partidos.map(p => p.slice(1).join(' - '))
    const distintoSoloAlInicio = new Set(cola).size === 1
    if (distintoSoloAlInicio) return cola[0]
  }
  return combinarNombres(unicos)
}

/**
 * Actividades de la estructura que repiten el mismo conjunto de tareas.
 *
 * Solo dentro del mismo proceso, y solo las que vienen del cronograma: las
 * actividades fijas son únicas por definición.
 */
export async function detectarFusiones(ipercId: string): Promise<SugerenciaFusion[]> {
  const items = await prisma.ipercEstructuraItem.findMany({
    where: { ipercId, origen: 'cronograma' },
    orderBy: { orden: 'asc' },
    select: {
      id: true, proceso: true, actividad: true, tarea: true,
      peligrosPrevistos: true, estado: true,
    },
  })

  // Agrupar por actividad, conservando el orden en que aparecen.
  const porActividad = new Map<string, typeof items>()
  for (const i of items) {
    const k = `${i.proceso}||${i.actividad}`
    if (!porActividad.has(k)) porActividad.set(k, [])
    porActividad.get(k)!.push(i)
  }

  // La huella de una actividad son sus tareas normalizadas.
  const porHuella = new Map<string, Array<{ proceso: string; actividad: string; filas: typeof items }>>()
  for (const [k, filas] of porActividad) {
    const [proceso, actividad] = k.split('||')
    const tareas = [...new Set(filas.map(f => normalizarTarea(f.tarea)))].sort()
    if (tareas.length < MIN_TAREAS) continue
    const huella = `${proceso} ⁞ ${tareas.join(' ⁞ ')}`
    if (!porHuella.has(huella)) porHuella.set(huella, [])
    porHuella.get(huella)!.push({ proceso, actividad, filas })
  }

  const sugerencias: SugerenciaFusion[] = []

  for (const [huella, grupo] of porHuella) {
    if (grupo.length < 2) continue
    // Una actividad ya generada no se toca: fusionarla descartaría filas que
    // alguien quizá ya revisó.
    if (grupo.some(g => g.filas.some(f => f.estado === 'generada'))) continue

    // Las tareas resultantes, una por huella de tarea, en el orden de la
    // primera actividad del grupo.
    const orden: string[] = []
    const porTarea = new Map<string, typeof items>()
    for (const g of grupo) {
      for (const f of g.filas) {
        const k = normalizarTarea(f.tarea)
        if (!porTarea.has(k)) { porTarea.set(k, []); orden.push(k) }
        porTarea.get(k)!.push(f)
      }
    }

    const tareasResultantes = orden.map(k => {
      const fs = porTarea.get(k)!
      return {
        nombre: combinarNombresTarea(fs.map(f => f.tarea)),
        // Fusionar dice que comparten los mismos peligros, así que no se
        // suman: queda el mayor de los que había.
        peligrosPrevistos: Math.max(...fs.map(f => f.peligrosPrevistos)),
      }
    })

    const filasActuales = grupo.reduce(
      (n, g) => n + g.filas.reduce((m, f) => m + f.peligrosPrevistos, 0), 0,
    )
    const filasDespues = tareasResultantes.reduce((n, t) => n + t.peligrosPrevistos, 0)

    sugerencias.push({
      clave: huella,
      proceso: grupo[0].proceso,
      actividades: grupo.map(g => ({
        proceso: g.proceso,
        actividad: g.actividad,
        itemIds: g.filas.map(f => f.id),
        tareas: g.filas.map(f => f.tarea),
        filas: g.filas.reduce((m, f) => m + f.peligrosPrevistos, 0),
      })),
      tareasResultantes,
      tituloSugerido: combinarNombres(grupo.map(g => g.actividad)),
      filasActuales,
      filasDespues,
      ahorro: filasActuales - filasDespues,
    })
  }

  return sugerencias.sort((a, b) => b.ahorro - a.ahorro)
}

/**
 * Fusiona las actividades de un grupo en una sola.
 *
 * Se queda la primera por orden, con el título que se haya elegido, y absorbe
 * las tareas de las demás: cada huella de tarea queda en una línea que apunta
 * a todas las tareas del cronograma que cubre, para no perder la trazabilidad
 * de lo que se va a ejecutar.
 */
export async function fusionarActividades(
  ipercId: string,
  itemIds: string[],
  titulo: string,
): Promise<{ eliminadas: number; filasAhorradas: number }> {
  const items = await prisma.ipercEstructuraItem.findMany({
    where: { ipercId, id: { in: itemIds } },
    orderBy: { orden: 'asc' },
  })
  if (items.length < 2) throw new Error('Hacen falta al menos dos actividades')
  if (items.some(i => i.estado === 'generada')) {
    throw new Error('Alguna de estas actividades ya tiene filas generadas')
  }
  if (new Set(items.map(i => i.proceso)).size > 1) {
    throw new Error('Solo se fusionan actividades del mismo proceso')
  }

  const porTarea = new Map<string, typeof items>()
  const orden: string[] = []
  for (const i of items) {
    const k = normalizarTarea(i.tarea)
    if (!porTarea.has(k)) { porTarea.set(k, []); orden.push(k) }
    porTarea.get(k)!.push(i)
  }

  const filasAntes = items.reduce((n, i) => n + i.peligrosPrevistos, 0)
  let filasDespues = 0
  const sobrevivenIds = new Set<string>()
  const updates: ReturnType<typeof prisma.ipercEstructuraItem.update>[] = []

  for (const k of orden) {
    const fs = porTarea.get(k)!
    const principal = fs[0]
    sobrevivenIds.add(principal.id)
    const peligros = Math.max(...fs.map(f => f.peligrosPrevistos))
    filasDespues += peligros

    updates.push(
      prisma.ipercEstructuraItem.update({
        where: { id: principal.id },
        data: {
          actividad: titulo,
          tarea: combinarNombresTarea(fs.map(f => f.tarea)),
          peligrosPrevistos: peligros,
          tareaIds: [...new Set(fs.flatMap(f => f.tareaIds))],
          updatedAt: new Date(),
        },
      }),
    )
  }

  const aBorrar = items.filter(i => !sobrevivenIds.has(i.id)).map(i => i.id)

  await prisma.$transaction([
    ...updates,
    prisma.ipercEstructuraItem.deleteMany({ where: { id: { in: aBorrar } } }),
  ])

  return { eliminadas: aBorrar.length, filasAhorradas: filasAntes - filasDespues }
}
