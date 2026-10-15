// Lectura de un cronograma devuelto por MS Project (XML/MSPDI o Excel) a una
// lista plana de filas, para sincronizar con el cronograma de GYS.
//
// Cada fila trae su "GYS ID" (Text1, lo escribe nuestra exportación) cuando el
// elemento viene de GYS; las filas nuevas creadas en MS Project no lo tienen.
// Fechas en "hora de obra": la hora tal cual del archivo, guardada en UTC.

import * as XLSX from 'xlsx'
import { parseDuration, parseMSProjectDate, parseWork } from '@/lib/utils/msProjectExcelParser'

export type TipoVinculo = 'finish_to_start' | 'start_to_start' | 'finish_to_finish' | 'start_to_finish'

export interface PredecesoraImportada {
  /** Fila (ID/UID del archivo) de la predecesora. */
  fila: number
  tipo: TipoVinculo
  lagMinutos: number
}

export interface FilaImportada {
  /** ID de fila en el archivo (UID en XML, ID en Excel). */
  fila: number
  /** "tarea-<uuid>", "actividad-<uuid>"… si viene de GYS; null si es nueva. */
  gysId: string | null
  nombre: string
  /** Nivel de esquema tal cual el archivo. */
  nivel: number
  esResumen: boolean
  /** ISO en hora de obra (UTC = hora del archivo). */
  inicio: string | null
  fin: string | null
  esHito: boolean
  /** Fecha límite (solo día, YYYY-MM-DD). */
  fechaLimite: string | null
  /** Trabajo total (HH) de la fila; null si el archivo no lo trae. */
  trabajoHoras: number | null
  notas: string | null
  recursoNombre: string | null
  predecesoras: PredecesoraImportada[]
}

const TIPO_XML: Record<string, TipoVinculo> = {
  '0': 'finish_to_finish', '1': 'finish_to_start', '2': 'start_to_finish', '3': 'start_to_start',
}
// Columna Predecessors en inglés (FS, SS…) y en español (FC, CC, FF, CF).
const TIPO_TEXTO: Record<string, TipoVinculo> = {
  FS: 'finish_to_start', FC: 'finish_to_start',
  SS: 'start_to_start', CC: 'start_to_start',
  FF: 'finish_to_finish',
  SF: 'start_to_finish', CF: 'start_to_finish',
}

const esGysId = (v: string | null | undefined) =>
  !!v && /^(fase|edt|actividad|tarea)-[0-9a-f-]{8,}$/i.test(v.trim())

// ── XML (MSPDI) ─────────────────────────────────────────────────────────────

const desescapar = (s: string) =>
  s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')

/** Contenido de la primera etiqueta `tag` directa (sin entrar a bloques anidados ya quitados). */
const etiqueta = (bloque: string, tag: string): string | null => {
  const m = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(bloque)
  return m ? desescapar(m[1].trim()) : null
}
const bloques = (texto: string, tag: string): string[] =>
  [...texto.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1])

/** "PT9H30M0S" → horas. */
const horasIso = (v: string | null): number | null => {
  if (!v) return null
  const m = /^PT(?:(\d+(?:\.\d+)?)H)?(?:(\d+(?:\.\d+)?)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(v.trim())
  if (!m) return null
  return (Number(m[1] || 0)) + Number(m[2] || 0) / 60 + Number(m[3] || 0) / 3600
}

/** "2026-10-28T08:00:00" (sin zona, hora de obra) → ISO UTC. */
const fechaXml = (v: string | null): string | null => {
  if (!v) return null
  const m = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})(?::\d{2})?/.exec(v.trim())
  return m ? `${m[1]}T${m[2]}:00.000Z` : null
}

export function leerMspdi(xml: string): FilaImportada[] {
  // Text1 (GYS ID): su FieldID en MS Project es 188743731.
  const FIELD_TEXT1 = '188743731'
  const seccionTareas = /<Tasks>([\s\S]*?)<\/Tasks>/.exec(xml)?.[1] ?? ''
  const recursos = new Map<string, string>()
  for (const r of bloques(/<Resources>([\s\S]*?)<\/Resources>/.exec(xml)?.[1] ?? '', 'Resource')) {
    const uid = etiqueta(r, 'UID'); const nombre = etiqueta(r, 'Name')
    if (uid && nombre) recursos.set(uid, nombre)
  }
  // Recurso principal y trabajo por tarea, según las asignaciones.
  const asignacion = new Map<string, { recurso: string | null; trabajo: number }>()
  for (const a of bloques(/<Assignments>([\s\S]*?)<\/Assignments>/.exec(xml)?.[1] ?? '', 'Assignment')) {
    const t = etiqueta(a, 'TaskUID'); if (!t) continue
    const trabajo = horasIso(etiqueta(a, 'Work')) ?? 0
    const previo = asignacion.get(t)
    const recurso = recursos.get(etiqueta(a, 'ResourceUID') ?? '') ?? null
    if (!previo) asignacion.set(t, { recurso, trabajo })
    else asignacion.set(t, { recurso: previo.trabajo >= trabajo ? previo.recurso : recurso, trabajo: previo.trabajo + trabajo })
  }

  const filas: FilaImportada[] = []
  for (const b of bloques(seccionTareas, 'Task')) {
    // Quitar bloques anidados que repiten etiquetas (Start, Finish, Work…).
    const preds = bloques(b, 'PredecessorLink')
    const extendidos = bloques(b, 'ExtendedAttribute')
    const directo = b
      .replace(/<PredecessorLink>[\s\S]*?<\/PredecessorLink>/g, '')
      .replace(/<ExtendedAttribute>[\s\S]*?<\/ExtendedAttribute>/g, '')
      .replace(/<Baseline>[\s\S]*?<\/Baseline>/g, '')
      .replace(/<TimephasedData>[\s\S]*?<\/TimephasedData>/g, '')
    const uid = Number(etiqueta(directo, 'UID'))
    const nivel = Number(etiqueta(directo, 'OutlineLevel') ?? 0)
    // UID 0 / nivel 0 es la tarea resumen del proyecto que agrega MS Project.
    if (!uid || nivel === 0 || etiqueta(directo, 'IsNull') === '1') continue
    const nombre = etiqueta(directo, 'Name') ?? ''
    if (!nombre) continue

    const text1 = extendidos.map((e) => ({ id: etiqueta(e, 'FieldID'), v: etiqueta(e, 'Value') })).find((e) => e.id === FIELD_TEXT1)?.v ?? null
    const duracion = horasIso(etiqueta(directo, 'Duration'))
    // El hito lo dice el campo Milestone (MS Project lo marca solo al escribir 0d).
    // No se deduce de la duración: una tarea que cae entera en día no laborable
    // también tiene 0 horas y no es un hito.
    const esHito = etiqueta(directo, 'Milestone') === '1'
    void duracion
    const asig = asignacion.get(String(uid))
    const trabajoTarea = horasIso(etiqueta(directo, 'Work'))
    const deadline = etiqueta(directo, 'Deadline')

    filas.push({
      fila: uid,
      gysId: esGysId(text1) ? text1!.trim() : null,
      nombre,
      nivel,
      esResumen: etiqueta(directo, 'Summary') === '1',
      inicio: fechaXml(etiqueta(directo, 'Start')),
      fin: fechaXml(etiqueta(directo, 'Finish')),
      esHito,
      fechaLimite: deadline ? deadline.slice(0, 10) : null,
      trabajoHoras: asig ? asig.trabajo : trabajoTarea,
      notas: etiqueta(directo, 'Notes'),
      recursoNombre: asig?.recurso ?? null,
      predecesoras: preds.map((p) => ({
        fila: Number(etiqueta(p, 'PredecessorUID')),
        tipo: TIPO_XML[etiqueta(p, 'Type') ?? '1'] ?? 'finish_to_start',
        // LinkLag viene en décimas de minuto.
        lagMinutos: Math.round(Number(etiqueta(p, 'LinkLag') ?? 0) / 10),
      })).filter((p) => p.fila > 0),
    })
  }
  return filas
}

// ── Excel (Task_Table + Assignment_Table) ───────────────────────────────────

const normalizar = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()

/** "5", "5SS", "7FS+2 hrs", "12CC-1 día", "3FF+30 mins" → predecesoras. */
export function leerPredecesorasTexto(texto: string, horasPorDia: number): PredecesoraImportada[] {
  if (!texto) return []
  return String(texto).split(/[;,]/).map((p) => {
    const m = /^\s*(\d+)\s*(FS|SS|FF|SF|FC|CC|CF)?\s*([+-])?\s*(\d+(?:[.,]\d+)?)?\s*([a-záéíóúñ]+)?\s*$/i.exec(p)
    if (!m) return null
    const tipo = TIPO_TEXTO[(m[2] || 'FS').toUpperCase()] ?? 'finish_to_start'
    let lag = 0
    if (m[4]) {
      const n = Number(m[4].replace(',', '.')) * (m[3] === '-' ? -1 : 1)
      const u = normalizar(m[5] || 'd')
      const minutos = u.startsWith('m') && !u.startsWith('mes') && !u.startsWith('mo') ? n
        : u.startsWith('h') ? n * 60
        : u.startsWith('w') || u.startsWith('s') ? n * 5 * horasPorDia * 60
        : n * horasPorDia * 60 // días
      lag = Math.round(minutos)
    }
    return { fila: Number(m[1]), tipo, lagMinutos: lag }
  }).filter((x): x is PredecesoraImportada => !!x && x.fila > 0)
}

export function leerExcelMsProject(workbook: XLSX.WorkBook, horasPorDia: number): FilaImportada[] {
  const hoja = workbook.SheetNames.find((n) => n.toLowerCase().includes('task') || n.toLowerCase().includes('tarea')) || workbook.SheetNames[0]
  const filasCrudas = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[hoja], { defval: '', raw: true })
  if (filasCrudas.length === 0) return []
  const cabeceras = Object.keys(filasCrudas[0])
  const col = (...nombres: string[]) => cabeceras.find((h) => nombres.some((n) => normalizar(h) === normalizar(n)))

  const cId = col('ID', 'Id')
  const cNombre = col('Name', 'Nombre', 'Task Name', 'Nombre de tarea')
  const cDur = col('Duration', 'Duración')
  const cTrabajo = col('Work', 'Trabajo')
  const cInicio = col('Start', 'Comienzo', 'Inicio')
  const cFin = col('Finish', 'Fin')
  const cPred = col('Predecessors', 'Predecesoras')
  const cNivel = col('Outline Level', 'Nivel de esquema')
  const cNotas = col('Notes', 'Notas')
  const cHito = col('Milestone', 'Hito')
  const cLimite = col('Deadline', 'Fecha límite', 'Fecha limite')
  const cTexto1 = col('Text1', 'Texto1', 'GYS ID')
  if (!cId || !cNombre || !cNivel) throw new Error('El Excel no tiene las columnas ID, Name y Outline Level de MS Project')

  // Recurso principal por nombre de tarea (Assignment_Table).
  const recursoPorTarea = new Map<string, { recurso: string; trabajo: number }>()
  const hojaAsig = workbook.SheetNames.find((n) => n.toLowerCase().includes('assignment') || n.toLowerCase().includes('asignaci'))
  if (hojaAsig) {
    const asig = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[hojaAsig], { defval: '' })
    const ca = Object.keys(asig[0] ?? {})
    const ac = (...n: string[]) => ca.find((h) => n.some((x) => normalizar(h) === normalizar(x)))
    const cT = ac('Task Name', 'Nombre de tarea'); const cR = ac('Resource Name', 'Nombre del recurso'); const cW = ac('Work', 'Trabajo')
    for (const a of asig) {
      const t = String(cT ? a[cT] : '').trim(); const r = String(cR ? a[cR] : '').trim()
      if (!t || !r) continue
      const w = parseWork(String(cW ? a[cW] : ''), horasPorDia)
      const previo = recursoPorTarea.get(t)
      if (!previo || w > previo.trabajo) recursoPorTarea.set(t, { recurso: r, trabajo: w })
    }
  }

  // Nombres repetidos: la hoja de asignaciones enlaza por nombre, así que para
  // esas tareas el recurso es ambiguo y no se toma del Excel.
  const repetidos = new Set<string>()
  const vistos = new Set<string>()
  for (const r of filasCrudas) {
    const n = String(r[cNombre] ?? '').trim()
    if (vistos.has(n)) repetidos.add(n); else vistos.add(n)
  }

  const filas: FilaImportada[] = []
  filasCrudas.forEach((r) => {
    const nombre = String(r[cNombre] ?? '').trim()
    const fila = Number(r[cId]) || 0
    const nivel = Number(r[cNivel]) || 0
    // ID 0 / fila del proyecto: es el resumen del proyecto, no un elemento a sincronizar.
    const t1 = String(cTexto1 ? r[cTexto1] : '').trim()
    if (!nombre || nivel <= 0 || fila === 0 || t1.startsWith('proyecto-')) return
    const inicio = parseMSProjectDate(cInicio ? (r[cInicio] as string | number) : null)
    const fin = parseMSProjectDate(cFin ? (r[cFin] as string | number) : null)
    const dur = parseDuration(String(cDur ? r[cDur] : ''), horasPorDia)
    const hitoTxt = normalizar(String(cHito ? r[cHito] : ''))
    const esHito = hitoTxt === 'yes' || hitoTxt === 'si' || hitoTxt === 'true' || dur.isMilestone
    const limite = cLimite ? parseMSProjectDate(r[cLimite] as string | number) : null
    const trabajoTxt = String(cTrabajo ? r[cTrabajo] : '').trim()
    const text1 = String(cTexto1 ? r[cTexto1] : '').trim()
    filas.push({
      fila,
      gysId: esGysId(text1) ? text1 : null,
      nombre,
      nivel,
      esResumen: false, // se deduce después por la jerarquía
      inicio: inicio ? inicio.toISOString() : null,
      fin: esHito && inicio ? inicio.toISOString() : fin ? fin.toISOString() : null,
      esHito,
      fechaLimite: limite ? limite.toISOString().slice(0, 10) : null,
      trabajoHoras: trabajoTxt ? parseWork(trabajoTxt, horasPorDia) : null,
      notas: String(cNotas ? r[cNotas] : '').trim() || null,
      recursoNombre: repetidos.has(nombre) ? null : recursoPorTarea.get(nombre)?.recurso ?? null,
      predecesoras: leerPredecesorasTexto(String(cPred ? r[cPred] : ''), horasPorDia),
    })
  })
  // Resumen = tiene hijos (la siguiente fila está un nivel más adentro).
  filas.forEach((f, i) => { f.esResumen = (filas[i + 1]?.nivel ?? 0) > f.nivel })
  return filas
}
