// ===================================================
// 📁 actividadesSimilares.ts
// 📌 Detecta actividades del IPERC que son el mismo trabajo sobre equipos
//    distintos, y permite unificarlas o fusionarlas.
//
// Caso real (CJM52): "Filtro D2112", "Filtro D2122" y "Filtro D2088" tienen
// las mismas 4 tareas, pero cayeron en bloques distintos — o sea en llamadas
// separadas a la IA, que no se ven entre sí — y quedaron evaluadas diferente:
// a D2088 le faltaba el peligro de "Trabajo en altura" en el tendido de cable,
// y valoraba el contacto eléctrico directo una severidad por debajo.
//
// La unidad es la ACTIVIDAD, nunca la tarea suelta: las tareas pertenecen a
// una actividad y tienen un orden dentro de ella; juntar tareas parecidas de
// actividades distintas romperia esa estructura.
// ===================================================

import { prisma } from '@/lib/prisma'

/** Campos que definen la evaluación de riesgo de una fila. */
const CAMPOS_EVALUACION = [
  'puestoTrabajo', 'factorRiesgo', 'condicionActividad', 'peligro', 'riesgo',
  'consecuencia', 'severidad', 'probabilidad', 'eliminar', 'sustituir',
  'controlIngenieria', 'controlAdministrativo', 'controlReceptor',
  'severidadResidual', 'probabilidadResidual', 'accionesMejora', 'responsables',
] as const

type CampoEvaluacion = (typeof CAMPOS_EVALUACION)[number]

export interface FilaMin {
  id: string
  numero: number
  proceso: string
  actividad: string
  tarea: string
  puestoTrabajo: string
  factorRiesgo: string
  condicionActividad: string
  peligro: string
  riesgo: string
  consecuencia: string
  severidad: number
  probabilidad: string
  eliminar: string
  sustituir: string
  controlIngenieria: string
  controlAdministrativo: string
  controlReceptor: string
  severidadResidual: number
  probabilidadResidual: string
  accionesMejora: string
  responsables: string
  tareaCronogramaRefId: string | null
  actividadCronogramaRefId: string | null
}

/**
 * Quita del texto lo que identifica al equipo o tramo, para comparar la FORMA
 * de la tarea y no el equipo sobre el que se hace.
 *
 * "D2112 - Conexionado en Tablero" y "D2088 - Conexionado en Tablero" son la
 * misma tarea sobre equipos distintos.
 */
export function normalizarTarea(txt: string): string {
  return txt
    .toUpperCase()
    .replace(/\bD\d{3,4}\b/g, '#')          // D2112, D2122, D2088
    .replace(/\bT\d+(?:-\d+)?\b/g, '#')     // T1, T2, T1-2
    .replace(/\bTRAMO\s*\d+(?:-\d+)?\b/g, '#')
    .replace(/\b\d+\s*K\b/g, '#')           // 320K, 160K
    .replace(/\b\d+\s*P\b/g, '#')           // 2P, 3P
    .replace(/[^A-ZÁÉÍÓÚÑÜ#]+/g, ' ')
    .replace(/#(?:\s*#)+/g, '#')
    .trim()
}

export interface DiferenciaTarea {
  tarea: string
  /** Peligros que la actividad de referencia tiene y esta no. */
  faltan: string[]
  /** Peligros que esta tiene y la referencia no. */
  sobran: string[]
  /** Mismo peligro, distinta valoración o distintos controles. */
  distintos: string[]
}

export interface ActividadDelGrupo {
  actividad: string
  filas: number
  tareas: number
  /** Diferencias contra la actividad de referencia. Vacío = idénticas. */
  diferencias: DiferenciaTarea[]
}

export interface GrupoSimilar {
  /** Clave estable del grupo: las tareas normalizadas. */
  clave: string
  proceso: string
  /** Tareas normalizadas que comparten, para mostrar de qué trabajo se trata. */
  tareasComunes: string[]
  /** La primera por número de fila; es la referencia sugerida. */
  referenciaSugerida: string
  actividades: ActividadDelGrupo[]
  /** true si todas evalúan exactamente igual (solo cambia el equipo). */
  identicas: boolean
  /** Filas que desaparecerían al fusionar. */
  filasQueSobran: number
}

const firmaPeligro = (f: FilaMin) => `${f.factorRiesgo} · ${f.peligro} / ${f.riesgo}`

function compararContraReferencia(
  ref: FilaMin[],
  otra: FilaMin[],
): DiferenciaTarea[] {
  const porTareaRef = new Map<string, FilaMin[]>()
  for (const f of ref) {
    const k = normalizarTarea(f.tarea)
    if (!porTareaRef.has(k)) porTareaRef.set(k, [])
    porTareaRef.get(k)!.push(f)
  }
  const porTareaOtra = new Map<string, FilaMin[]>()
  for (const f of otra) {
    const k = normalizarTarea(f.tarea)
    if (!porTareaOtra.has(k)) porTareaOtra.set(k, [])
    porTareaOtra.get(k)!.push(f)
  }

  const difs: DiferenciaTarea[] = []
  for (const [k, filasRef] of porTareaRef) {
    const filasOtra = porTareaOtra.get(k) ?? []
    const mapaRef = new Map(filasRef.map(f => [firmaPeligro(f), f]))
    const mapaOtra = new Map(filasOtra.map(f => [firmaPeligro(f), f]))

    const faltan = [...mapaRef.keys()].filter(x => !mapaOtra.has(x))
    const sobran = [...mapaOtra.keys()].filter(x => !mapaRef.has(x))
    const distintos: string[] = []
    for (const [firma, fRef] of mapaRef) {
      const fOtra = mapaOtra.get(firma)
      if (!fOtra) continue
      const campos = CAMPOS_EVALUACION.filter(
        c => String(fRef[c as CampoEvaluacion]) !== String(fOtra[c as CampoEvaluacion]),
      )
      if (campos.length > 0) distintos.push(`${firma} (${campos.join(', ')})`)
    }
    if (faltan.length || sobran.length || distintos.length) {
      difs.push({ tarea: filasOtra[0]?.tarea ?? filasRef[0].tarea, faltan, sobran, distintos })
    }
  }
  return difs
}

/** Agrupa las actividades del IPERC que comparten las mismas tareas. */
export async function detectarGrupos(ipercId: string): Promise<GrupoSimilar[]> {
  const filas = (await prisma.ipercFila.findMany({
    where: { ipercId },
    orderBy: { numero: 'asc' },
  })) as unknown as FilaMin[]

  const porActividad = new Map<string, FilaMin[]>()
  for (const f of filas) {
    if (!porActividad.has(f.actividad)) porActividad.set(f.actividad, [])
    porActividad.get(f.actividad)!.push(f)
  }

  const porClave = new Map<string, string[]>()
  for (const [act, fs] of porActividad) {
    const clave = [...new Set(fs.map(f => normalizarTarea(f.tarea)))].sort().join(' ⁞ ')
    if (!porClave.has(clave)) porClave.set(clave, [])
    porClave.get(clave)!.push(act)
  }

  const grupos: GrupoSimilar[] = []
  for (const [clave, actividades] of porClave) {
    if (actividades.length < 2) continue
    // Una sola tarea en común es coincidencia, no el mismo trabajo.
    const tareasComunes = clave.split(' ⁞ ')
    if (tareasComunes.length < 2) continue

    const referencia = actividades[0]
    const filasRef = porActividad.get(referencia)!
    const detalle: ActividadDelGrupo[] = actividades.map(act => {
      const fs = porActividad.get(act)!
      return {
        actividad: act,
        filas: fs.length,
        tareas: new Set(fs.map(f => f.tarea)).size,
        diferencias: act === referencia ? [] : compararContraReferencia(filasRef, fs),
      }
    })

    const totalFilas = detalle.reduce((s, d) => s + d.filas, 0)
    grupos.push({
      clave,
      proceso: filasRef[0].proceso,
      tareasComunes,
      referenciaSugerida: referencia,
      actividades: detalle,
      identicas: detalle.every(d => d.diferencias.length === 0),
      filasQueSobran: totalFilas - filasRef.length,
    })
  }
  return grupos
}

export interface PreviaCambio {
  accion: 'unificar' | 'fusionar'
  referencia: string
  /** Resumen por actividad afectada. */
  afectadas: Array<{
    actividad: string
    filasAntes: number
    filasDespues: number
    /** Qué se le agrega al unificar. */
    peligrosQueSeAgregan: string[]
    /** Qué se le corrige al unificar. */
    peligrosQueSeCorrigen: string[]
    /** Qué se le quita (evaluaciones que la referencia no tiene). */
    peligrosQueSeQuitan: string[]
  }>
  filasAntes: number
  filasDespues: number
}

/**
 * Calcula qué pasaría, sin escribir nada.
 *
 * - unificar: cada actividad conserva sus tareas y su nombre, pero su
 *   evaluación pasa a ser la de la referencia. El IPERC sigue listando los
 *   tres filtros; lo que se va es la incoherencia.
 * - fusionar: se conservan solo las filas de la referencia y se borran las de
 *   las demás. Menos filas, pero el IPERC deja de listar cada equipo.
 */
export async function calcularPrevia(
  ipercId: string,
  accion: 'unificar' | 'fusionar',
  referencia: string,
  actividades: string[],
): Promise<PreviaCambio> {
  const filas = (await prisma.ipercFila.findMany({
    where: { ipercId, actividad: { in: actividades } },
    orderBy: { numero: 'asc' },
  })) as unknown as FilaMin[]

  const porActividad = new Map<string, FilaMin[]>()
  for (const f of filas) {
    if (!porActividad.has(f.actividad)) porActividad.set(f.actividad, [])
    porActividad.get(f.actividad)!.push(f)
  }
  const filasRef = porActividad.get(referencia) ?? []

  const afectadas: PreviaCambio['afectadas'] = []
  for (const act of actividades) {
    if (act === referencia) continue
    const fs = porActividad.get(act) ?? []
    if (accion === 'fusionar') {
      afectadas.push({
        actividad: act,
        filasAntes: fs.length,
        filasDespues: 0,
        peligrosQueSeAgregan: [],
        peligrosQueSeCorrigen: [],
        peligrosQueSeQuitan: [],
      })
      continue
    }
    const difs = compararContraReferencia(filasRef, fs)
    afectadas.push({
      actividad: act,
      filasAntes: fs.length,
      // Al unificar, cada tarea queda con los mismos peligros que la referencia.
      filasDespues: contarFilasTrasUnificar(filasRef, fs),
      peligrosQueSeAgregan: difs.flatMap(d => d.faltan.map(x => `${d.tarea}: ${x}`)),
      peligrosQueSeCorrigen: difs.flatMap(d => d.distintos.map(x => `${d.tarea}: ${x}`)),
      peligrosQueSeQuitan: difs.flatMap(d => d.sobran.map(x => `${d.tarea}: ${x}`)),
    })
  }

  const filasAntes = filas.length
  const filasDespues =
    accion === 'fusionar'
      ? filasRef.length
      : filasRef.length + afectadas.reduce((s, a) => s + a.filasDespues, 0)

  return { accion, referencia, afectadas, filasAntes, filasDespues }
}

function contarFilasTrasUnificar(filasRef: FilaMin[], fs: FilaMin[]): number {
  const tareasOtra = new Set(fs.map(f => normalizarTarea(f.tarea)))
  // Por cada tarea que la actividad tiene, quedan tantas filas como peligros
  // tenga esa tarea en la referencia.
  let total = 0
  for (const t of tareasOtra) {
    const enRef = filasRef.filter(f => normalizarTarea(f.tarea) === t).length
    total += enRef > 0 ? enRef : fs.filter(f => normalizarTarea(f.tarea) === t).length
  }
  return total
}

/** Aplica el cambio. Devuelve cuántas filas quedaron. */
export async function aplicar(
  ipercId: string,
  accion: 'unificar' | 'fusionar',
  referencia: string,
  actividades: string[],
): Promise<{ filasFinales: number }> {
  const filas = (await prisma.ipercFila.findMany({
    where: { ipercId, actividad: { in: actividades } },
    orderBy: { numero: 'asc' },
  })) as unknown as FilaMin[]

  const porActividad = new Map<string, FilaMin[]>()
  for (const f of filas) {
    if (!porActividad.has(f.actividad)) porActividad.set(f.actividad, [])
    porActividad.get(f.actividad)!.push(f)
  }
  const filasRef = porActividad.get(referencia) ?? []
  if (filasRef.length === 0) throw new Error('La actividad de referencia no tiene filas')

  const otras = actividades.filter(a => a !== referencia)

  if (accion === 'fusionar') {
    await prisma.ipercFila.deleteMany({
      where: { ipercId, actividad: { in: otras } },
    })
    return { filasFinales: await prisma.ipercFila.count({ where: { ipercId } }) }
  }

  // Unificar: se reemplaza la evaluación conservando tarea, actividad y los
  // vínculos al cronograma, que son lo que ubica la fila en el documento.
  for (const act of otras) {
    const fs = porActividad.get(act) ?? []
    const porTarea = new Map<string, FilaMin[]>()
    for (const f of fs) {
      const k = normalizarTarea(f.tarea)
      if (!porTarea.has(k)) porTarea.set(k, [])
      porTarea.get(k)!.push(f)
    }

    for (const [k, filasTarea] of porTarea) {
      const plantilla = filasRef.filter(f => normalizarTarea(f.tarea) === k)
      if (plantilla.length === 0) continue

      const base = filasTarea[0]
      const operaciones: Array<Promise<unknown>> = []

      // Reusar las filas existentes para no perder sus ids, y crear o borrar
      // solo la diferencia.
      plantilla.forEach((p, i) => {
        const datos = Object.fromEntries(
          CAMPOS_EVALUACION.map(c => [c, p[c as CampoEvaluacion]]),
        )
        const existente = filasTarea[i]
        if (existente) {
          operaciones.push(
            prisma.ipercFila.update({ where: { id: existente.id }, data: datos }),
          )
        } else {
          operaciones.push(
            prisma.ipercFila.create({
              data: {
                ...datos,
                ipercId,
                numero: base.numero,
                proceso: base.proceso,
                actividad: base.actividad,
                tarea: base.tarea,
                tareaCronogramaRefId: base.tareaCronogramaRefId,
                actividadCronogramaRefId: base.actividadCronogramaRefId,
              } as never,
            }),
          )
        }
      })
      // Filas de más en esta tarea: la referencia evalúa menos peligros.
      for (const sobrante of filasTarea.slice(plantilla.length)) {
        operaciones.push(prisma.ipercFila.delete({ where: { id: sobrante.id } }))
      }
      await Promise.all(operaciones)
    }
  }

  return { filasFinales: await prisma.ipercFila.count({ where: { ipercId } }) }
}
