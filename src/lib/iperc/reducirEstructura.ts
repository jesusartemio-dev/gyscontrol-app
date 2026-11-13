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

  const partidos = unicos.map(n => n.split(SEPARADOR))
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

/**
 * Los separadores que usa el cronograma entre los tramos de un nombre.
 *
 * No es solo el guion: "T2 Fusionado FO 12H – Filtro D2122 → Gabinete COM
 * 320K" trae guion largo y flecha en la misma línea. Partiendo solo por el
 * guion ASCII, esa tarea quedaba de una pieza mientras su gemela quedaba en
 * dos, los nombres no se podían alinear y la propuesta salía pegando los tres
 * nombres enteros.
 */
const SEPARADOR = /\s+[-–—→>]+\s+/

/**
 * Una palabra que numera en vez de nombrar: T1, T2, D2112, 3, 2).
 *
 * Tiene que llevar dígitos y ser corta. Así se distingue el "T1" que solo
 * dice de qué tramo se habla de un "Armado" o un "Desmontaje", que es lo que
 * la tarea hace.
 */
function esNumerador(palabra: string): boolean {
  return palabra.length <= 7 && /\d/.test(palabra) && /^[A-Za-zÁÉÍÓÚÑ]{0,3}[-\d]+[.)A-Za-z]?$/.test(palabra)
}

/** "Tramo 1" + "Tramo 2" → "Tramo 1 y 2"; sin prefijo común, se unen enteros. */
function combinarSegmento(valores: string[]): string {
  const palabras = valores.map(v => v.split(/\s+/))

  // Si lo único que cambia es el T1, T2, T3 que numera el tramo, se cae:
  // "T1 Fusionado FO 12H" y "T2 Fusionado FO 12H" son "Fusionado FO 12H".
  //
  // Solo si esa primera palabra es un numerador. "Armado de Andamios" y
  // "Desmontaje de Andamios" también difieren solo en la primera, y ahí la
  // primera es justamente lo que distingue una tarea de la otra.
  if (palabras.every(p => p.length > 1 && esNumerador(p[0]))) {
    const colas = palabras.map(p => p.slice(1).join(' '))
    if (new Set(colas).size === 1) return colas[0]
  }

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

  const partidos = unicos.map(n => n.split(SEPARADOR))
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
    const k = `${i.proceso.trim()}||${i.actividad.trim()}`
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

export interface SugerenciaTareas {
  clave: string
  proceso: string
  actividad: string
  tareas: Array<{ itemId: string; nombre: string; peligrosPrevistos: number }>
  nombreSugerido: string
  filasActuales: number
  filasDespues: number
  ahorro: number
}

/**
 * Tareas repetidas DENTRO de una misma actividad.
 *
 * Es el otro caso: en "Fusionado y Certificación de FO" el cronograma lista
 * el fusionado tramo por tramo —T1 al filtro D2112, T2 al D2122, T3 al
 * D2088— porque cada uno se ejecuta y se avanza aparte. Fusionar fibra es
 * fusionar fibra: el peligro es el mismo en los tres.
 *
 * No se mezclan tareas de actividades distintas: una tarea pertenece a su
 * actividad y juntarlas perdería ese orden.
 */
export async function detectarTareasRepetidas(ipercId: string): Promise<SugerenciaTareas[]> {
  const items = await prisma.ipercEstructuraItem.findMany({
    where: { ipercId, origen: 'cronograma', estado: { not: 'generada' } },
    orderBy: { orden: 'asc' },
    select: { id: true, proceso: true, actividad: true, tarea: true, peligrosPrevistos: true },
  })

  const grupos = new Map<string, typeof items>()
  for (const i of items) {
    const k = `${i.proceso.trim()}||${i.actividad.trim()}||${normalizarTarea(i.tarea)}`
    if (!grupos.has(k)) grupos.set(k, [])
    grupos.get(k)!.push(i)
  }

  const salida: SugerenciaTareas[] = []
  for (const [clave, fs] of grupos) {
    if (fs.length < 2) continue

    const filasActuales = fs.reduce((n, f) => n + f.peligrosPrevistos, 0)
    const filasDespues = Math.max(...fs.map(f => f.peligrosPrevistos))

    salida.push({
      clave,
      proceso: fs[0].proceso,
      actividad: fs[0].actividad,
      tareas: fs.map(f => ({ itemId: f.id, nombre: f.tarea, peligrosPrevistos: f.peligrosPrevistos })),
      nombreSugerido: combinarNombresTarea(fs.map(f => f.tarea)),
      filasActuales,
      filasDespues,
      ahorro: filasActuales - filasDespues,
    })
  }

  return salida.sort((a, b) => b.ahorro - a.ahorro)
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
