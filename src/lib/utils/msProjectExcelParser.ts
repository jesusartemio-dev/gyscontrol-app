// ===================================================
// Parser de Excel exportado desde MS Project
// Convierte filas planas con Outline Level en jerarquía de 5 niveles
// ===================================================

import * as XLSX from 'xlsx'

// Fila parseada del Excel
export interface MSProjectRow {
  id: number
  name: string
  duration: string
  work: string
  start: Date | null
  finish: Date | null
  predecessors: number[]
  outlineLevel: number
  notes: string
}

// Jerarquía de 5 niveles
export interface MSProjectTarea {
  row: MSProjectRow
}

export interface MSProjectActividad {
  row: MSProjectRow
  tareas: MSProjectTarea[]
}

export interface MSProjectEdt {
  row: MSProjectRow
  actividades: MSProjectActividad[]
}

export interface MSProjectFase {
  row: MSProjectRow
  edts: MSProjectEdt[]
}

export interface MSProjectTree {
  project: string
  fases: MSProjectFase[]
  stats: {
    fases: number
    edts: number
    actividades: number
    tareas: number
    ignored: number
    hasWork: boolean
  }
  dateRange: {
    start: Date | null
    finish: Date | null
  }
}

// Duración parseada
export interface ParsedDuration {
  days: number
  hours: number
  isMilestone: boolean
}

// Parsear Work de MS Project: "475 hrs", "40 hours", "0 hrs" → horas totales (persona-horas)
// Work usa el mismo formato que Duration pero representa esfuerzo total, no tiempo calendario
export function parseWork(work: string, horasPorDia: number = 8): number {
  if (!work) return 0
  const parsed = parseDuration(work, horasPorDia)
  return parsed.hours
}

// Parsear duración de MS Project: "107 days", "2 hours", "4.63 days", "0 days"
// horasPorDia: horas laborables por día (default 8, configurable desde calendario laboral)
export function parseDuration(duration: string, horasPorDia: number = 8): ParsedDuration {
  if (!duration) return { days: 0, hours: 0, isMilestone: false }

  const str = String(duration).trim().toLowerCase()
  const hpd = horasPorDia || 8
  const diasPorSemana = 5
  const diasPorMes = 20

  // Milestone
  if (str === '0 days' || str === '0 day' || str === '0 hrs' || str === '0 hours') {
    return { days: 0, hours: 0, isMilestone: true }
  }

  // "X days" or "X day"
  const dayMatch = str.match(/^([\d.]+)\s*days?$/i)
  if (dayMatch) {
    const days = parseFloat(dayMatch[1])
    return { days, hours: days * hpd, isMilestone: false }
  }

  // "X hours" or "X hrs"
  const hourMatch = str.match(/^([\d.]+)\s*(hours?|hrs?)$/i)
  if (hourMatch) {
    const hours = parseFloat(hourMatch[1])
    return { days: hours / hpd, hours, isMilestone: false }
  }

  // "X mins" or "X minutes"
  const minMatch = str.match(/^([\d.]+)\s*(mins?|minutes?)$/i)
  if (minMatch) {
    const mins = parseFloat(minMatch[1])
    return { days: mins / (hpd * 60), hours: mins / 60, isMilestone: false }
  }

  // "X wks" or "X weeks"
  const weekMatch = str.match(/^([\d.]+)\s*(wks?|weeks?)$/i)
  if (weekMatch) {
    const weeks = parseFloat(weekMatch[1])
    return { days: weeks * diasPorSemana, hours: weeks * diasPorSemana * hpd, isMilestone: false }
  }

  // "X mons" or "X months"
  const monthMatch = str.match(/^([\d.]+)\s*(mons?|months?)$/i)
  if (monthMatch) {
    const months = parseFloat(monthMatch[1])
    return { days: months * diasPorMes, hours: months * diasPorMes * hpd, isMilestone: false }
  }

  return { days: 0, hours: 0, isMilestone: false }
}

// Parsear fecha de MS Project: "29 December 2025 08:00 a.m.", "08 January 2026 10:00 a.m."
export function parseMSProjectDate(dateStr: string | number | null | undefined): Date | null {
  if (!dateStr) return null

  // Si XLSX ya lo convirtió a número serial de Excel
  if (typeof dateStr === 'number') {
    try {
      const parsed = XLSX.SSF.parse_date_code(dateStr)
      if (parsed) {
        return new Date(parsed.y, parsed.m - 1, parsed.d, parsed.H || 0, parsed.M || 0, parsed.S || 0)
      }
    } catch {
      return null
    }
  }

  const str = String(dateStr).trim()
  if (!str) return null

  // Intentar Date.parse directo
  const directParse = new Date(str)
  if (!isNaN(directParse.getTime())) {
    return directParse
  }

  // Formato MS Project: "29 December 2025 08:00 a.m." o "29 December 2025 08:00 a. m."
  const msMatch = str.match(
    /^(\d{1,2})\s+(\w+)\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(a\.?\s*m\.?|p\.?\s*m\.?)$/i
  )
  if (msMatch) {
    const [, day, monthName, year, hourStr, minute, ampm] = msMatch
    const months: Record<string, number> = {
      january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
      july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
      enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
      julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
    }
    const month = months[monthName.toLowerCase()]
    if (month === undefined) return null

    let hour = parseInt(hourStr)
    const isPM = /p\.?\s*m\.?/i.test(ampm)
    if (isPM && hour < 12) hour += 12
    if (!isPM && hour === 12) hour = 0

    return new Date(parseInt(year), month, parseInt(day), hour, parseInt(minute))
  }

  return null
}

// Parsear predecessors: "4" → [4], "9,19" → [9,19], "31,15" → [31,15], "" → []
export function parsePredecessors(predStr: string | null | undefined): number[] {
  if (!predStr) return []

  const str = String(predStr).trim()
  if (!str) return []

  return str
    .split(',')
    .map(p => {
      // Extraer solo el número (ignorar FS, SS, FF, SF y lag como "+2d")
      const numMatch = p.trim().match(/^(\d+)/)
      return numMatch ? parseInt(numMatch[1]) : NaN
    })
    .filter(n => !isNaN(n))
}

// Leer Excel de MS Project y retornar filas planas
export function parseMSProjectExcel(file: File): Promise<MSProjectRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array', cellDates: false })
        const worksheet = workbook.Sheets[workbook.SheetNames[0]]
        const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: '' })

        if (rawRows.length === 0) {
          reject(new Error('El archivo Excel está vacío'))
          return
        }

        // Detectar columnas por nombre de header
        const firstRow = rawRows[0]
        const headers = Object.keys(firstRow)

        // Buscar columnas por nombre (flexible)
        const findCol = (patterns: string[]) =>
          headers.find(h => patterns.some(p => h.toLowerCase().includes(p.toLowerCase())))

        const colId = findCol(['ID']) || headers[0]
        const colName = findCol(['Name', 'Nombre', 'Task Name']) || headers[3]
        const colDuration = findCol(['Duration', 'Duración']) || headers[4]
        const colStart = findCol(['Start', 'Inicio']) || headers[5]
        const colFinish = findCol(['Finish', 'Fin']) || headers[6]
        const colPredecessors = findCol(['Predecessors', 'Predecesoras']) || headers[7]
        const colOutlineLevel = findCol(['Outline Level', 'Nivel de esquema', 'Outline']) || headers[8]
        const colNotes = findCol(['Notes', 'Notas']) || headers[9]
        const colWork = findCol(['Work', 'Trabajo'])

        const rows: MSProjectRow[] = rawRows
          .map((raw) => ({
            id: parseInt(String(raw[colId])) || 0,
            name: String(raw[colName] || '').trim(),
            duration: String(raw[colDuration] || '').trim(),
            work: colWork ? String(raw[colWork] || '').trim() : '',
            start: parseMSProjectDate(raw[colStart] as string | number),
            finish: parseMSProjectDate(raw[colFinish] as string | number),
            predecessors: parsePredecessors(raw[colPredecessors] as string),
            outlineLevel: parseInt(String(raw[colOutlineLevel])) || 0,
            notes: String(raw[colNotes] || '').trim(),
          }))
          .filter(row => row.name && row.id > 0)

        resolve(rows)
      } catch (error) {
        reject(new Error(`Error al parsear el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`))
      }
    }

    reader.onerror = () => reject(new Error('Error al leer el archivo'))
    reader.readAsArrayBuffer(file)
  })
}

// Construir jerarquía desde filas planas usando Outline Level
export function buildHierarchy(rows: MSProjectRow[]): MSProjectTree {
  let projectName = ''
  const fases: MSProjectFase[] = []
  let ignored = 0
  let currentFase: MSProjectFase | null = null
  let currentEdt: MSProjectEdt | null = null
  let currentActividad: MSProjectActividad | null = null

  for (const row of rows) {
    // Filtrar filas inactivas (si existieran)
    if (row.outlineLevel < 1) continue

    switch (row.outlineLevel) {
      case 1:
        // Nivel 1 = Proyecto (skip, solo capturar nombre)
        projectName = row.name
        break

      case 2:
        // Nivel 2 = Fase
        currentFase = { row, edts: [] }
        fases.push(currentFase)
        currentEdt = null
        currentActividad = null
        break

      case 3:
        // Nivel 3 = EDT
        if (!currentFase) {
          // Si no hay fase padre, crear una genérica
          currentFase = {
            row: { ...row, name: 'General', outlineLevel: 2, id: 0 },
            edts: [],
          }
          fases.push(currentFase)
        }
        currentEdt = { row, actividades: [] }
        currentFase.edts.push(currentEdt)
        currentActividad = null
        break

      case 4:
        // Nivel 4 = Actividad
        if (!currentEdt) {
          // Si no hay EDT padre, crear uno genérico
          if (!currentFase) {
            currentFase = {
              row: { ...row, name: 'General', outlineLevel: 2, id: 0 },
              edts: [],
            }
            fases.push(currentFase)
          }
          currentEdt = {
            row: { ...row, name: 'General', outlineLevel: 3, id: 0 },
            actividades: [],
          }
          currentFase.edts.push(currentEdt)
        }
        currentActividad = { row, tareas: [] }
        currentEdt.actividades.push(currentActividad)
        break

      case 5:
        // Nivel 5 = Tarea
        if (!currentActividad) {
          // Si no hay actividad padre, crear una genérica
          if (!currentEdt) {
            if (!currentFase) {
              currentFase = {
                row: { ...row, name: 'General', outlineLevel: 2, id: 0 },
                edts: [],
              }
              fases.push(currentFase)
            }
            currentEdt = {
              row: { ...row, name: 'General', outlineLevel: 3, id: 0 },
              actividades: [],
            }
            currentFase.edts.push(currentEdt)
          }
          currentActividad = {
            row: { ...row, name: 'General', outlineLevel: 4, id: 0 },
            tareas: [],
          }
          currentEdt.actividades.push(currentActividad)
        }
        currentActividad.tareas.push({ row })
        break

      default:
        // Nivel > 5 → ignorar
        ignored++
        break
    }
  }

  // Calcular stats
  let edtCount = 0
  let actividadCount = 0
  let tareaCount = 0
  let hasWork = false
  let minDate: Date | null = null
  let maxDate: Date | null = null

  for (const fase of fases) {
    edtCount += fase.edts.length
    for (const edt of fase.edts) {
      actividadCount += edt.actividades.length
      for (const act of edt.actividades) {
        tareaCount += act.tareas.length

        // Calcular rango de fechas desde tareas (nivel hoja)
        for (const tarea of act.tareas) {
          if (tarea.row.work) hasWork = true
          if (tarea.row.start && (!minDate || tarea.row.start < minDate)) {
            minDate = tarea.row.start
          }
          if (tarea.row.finish && (!maxDate || tarea.row.finish > maxDate)) {
            maxDate = tarea.row.finish
          }
        }

        // También considerar fechas de la actividad misma
        if (act.row.start && (!minDate || act.row.start < minDate)) {
          minDate = act.row.start
        }
        if (act.row.finish && (!maxDate || act.row.finish > maxDate)) {
          maxDate = act.row.finish
        }
      }
    }
  }

  return {
    project: projectName || 'Proyecto sin nombre',
    fases,
    stats: {
      fases: fases.length,
      edts: edtCount,
      actividades: actividadCount,
      tareas: tareaCount,
      ignored,
      hasWork,
    },
    dateRange: {
      start: minDate,
      finish: maxDate,
    },
  }
}

// Serializar tree para enviar al API (convertir Dates a ISO strings)
export function serializeTree(tree: MSProjectTree): unknown {
  const serializeRow = (row: MSProjectRow) => ({
    ...row,
    start: row.start?.toISOString() || null,
    finish: row.finish?.toISOString() || null,
    work: row.work || '',
  })

  return {
    project: tree.project,
    fases: tree.fases.map(fase => ({
      row: serializeRow(fase.row),
      edts: fase.edts.map(edt => ({
        row: serializeRow(edt.row),
        actividades: edt.actividades.map(act => ({
          row: serializeRow(act.row),
          tareas: act.tareas.map(t => ({ row: serializeRow(t.row) })),
        })),
      })),
    })),
    stats: tree.stats,
    dateRange: {
      start: tree.dateRange.start?.toISOString() || null,
      finish: tree.dateRange.finish?.toISOString() || null,
    },
  }
}
