import * as XLSX from 'xlsx'

interface TreeNode {
  id: string
  type: string
  nombre: string
  level: number
  data: {
    descripcion?: string
    fechaInicio?: string | null
    fechaFin?: string | null
    fechaInicioComercial?: string | null
    fechaFinComercial?: string | null
    horasEstimadas?: number | null
    estado?: string
    progreso?: number
    personasEstimadas?: number
    recursoId?: string | null
    recursoNombre?: string | null
    recursoTipo?: string | null
    isExtrasGroup?: boolean
    esExtra?: boolean
    /** Hito ◆ (Milestone) y su fecha comprometida (Deadline). */
    esHito?: boolean
    fechaLimite?: string | null
    /** Días laborables calculados por la API del árbol. */
    duracionDiasReal?: number
    /** Horas laborables entre inicio y fin (columna DUR), calculadas por la API del árbol. */
    duracionHoras?: number
    /** Horas-hombre (trabajo total) de la tarea, calculadas por la API del árbol. */
    horasHombre?: number
  }
  children?: TreeNode[]
}

interface Dependencia {
  tareaOrigenId: string
  tareaDependienteId: string
  tipo: string
  lagMinutos?: number
}

// Tipo de vínculo en la columna Predecessors de MS Project (en inglés, como el resto del archivo)
const TIPO_PREDECESORA: Record<string, string> = {
  finish_to_start: 'FS', start_to_start: 'SS', finish_to_finish: 'FF', start_to_finish: 'SF',
}

export interface RecursoExport {
  id: string
  nombre: string
  tipo: 'individual' | 'cuadrilla'
  costoHoraProyecto: number | null
}

interface TareaRecursoRow {
  taskName: string
  nodeId: string
  recursoNombre: string
  /** Trabajo total (HH) de la tarea. */
  trabajo: number
  /** Duración en horas laborables (para las unidades = trabajo / duración). */
  duracionHoras: number
}

interface FlatRow {
  id: number
  name: string
  duration: string
  start: Date | null
  finish: Date | null
  predecessors: string
  outlineLevel: number
  notes: string
  work: string
  nodeId: string // internal UUID for dependency mapping
  /** Hito (Milestone de MS Project): duración 0 y rombo en el Gantt. */
  milestone: boolean
  /** Resumen (fase/EDT/actividad con hijos): MS Project calcula sus fechas. */
  summary: boolean
  /** ID de GYS (p. ej. "tarea-<uuid>") para reconocer la tarea al reimportar. */
  gysId: string
  /** Fecha comprometida del hito (Deadline de MS Project). */
  deadline: Date | null
}

/**
 * Flatten the tree into rows with Outline Level, matching the MS Project Excel format.
 * Level mapping: proyecto=1, fase=2, edt=3, actividad=4, tarea=5
 */
function flattenTree(node: TreeNode, horasPorDia: number): FlatRow[] {
  const rows: FlatRow[] = []

  function visit(n: TreeNode) {
    const data = n.data || {}

    // Excluir el grupo "Tareas Extras" (pseudo-actividad) y las tareas extras
    // del export de cronograma: las extras son fuera-de-plan, no pertenecen al cronograma
    if (data.isExtrasGroup || data.esExtra) return

    const fechaInicio = data.fechaInicio || data.fechaInicioComercial
    const fechaFin = data.fechaFin || data.fechaFinComercial
    const horas = Number(data.horasEstimadas || 0)
    const hasChildren = n.children && n.children.length > 0

    // Outline level: proyecto=1, fase=2, edt=3, actividad=4, tarea=5
    const outlineLevel = n.level + 1

    // Duration: convert hours back to days string. "0 days" es solo para hitos:
    // MS Project convierte en hito cualquier tarea de duración 0, así que una
    // tarea sin horas que no es hito se exporta con sus días laborables.
    const esHito = !hasChildren && data.esHito === true
    // Duración = horas laborables entre inicio y fin (la columna DUR de GYS), en
    // horas para no depender de las horas por día que tenga MS Project. Los
    // resúmenes van sin duración: MS Project la calcula de sus hijos.
    let duration = ''
    if (esHito) {
      duration = '0 days'
    } else if (!hasChildren) {
      const durHoras = Number(data.duracionHoras)
      if (Number.isFinite(durHoras) && durHoras > 0) {
        duration = `${Math.round(durHoras * 100) / 100} hrs`
      } else {
        const dias = Number(data.duracionDiasReal) || 1
        duration = `${dias} ${dias === 1 ? 'day' : 'days'}`
      }
    }

    // Work = horas-hombre (HH), las mismas de la columna HH de GYS.
    let work = ''
    if (!hasChildren && !esHito) {
      const hh = data.horasHombre !== undefined ? Number(data.horasHombre) : horas * (data.personasEstimadas || 1)
      work = `${Math.round((hh || 0) * 100) / 100} hrs`
    }

    // Strip prefix from ID (e.g. "tarea-xxx" -> "xxx")
    const nodeId = n.id.replace(/^(proyecto|fase|edt|actividad|tarea)-/, '')

    rows.push({
      id: 0, // assigned later
      name: n.nombre || '',
      duration,
      start: fechaInicio ? new Date(fechaInicio) : null,
      finish: fechaFin ? new Date(fechaFin) : null,
      predecessors: '', // resolved later
      outlineLevel,
      notes: data.descripcion || '',
      work,
      nodeId,
      milestone: esHito,
      deadline: esHito && data.fechaLimite ? new Date(data.fechaLimite) : null,
      summary: !!hasChildren,
      gysId: n.id,
    })

    if (n.children) {
      for (const child of n.children) {
        visit(child)
      }
    }
  }

  visit(node)
  return rows
}

/**
 * Map dependency UUIDs to row IDs for the Predecessors column.
 * Only task-level dependencies are mapped.
 */
function resolvePredecessors(
  rows: FlatRow[],
  dependencias: Dependencia[],
  horasPorDia: number
): void {
  // Build map: tarea UUID -> row ID
  const uuidToRowId = new Map<string, number>()
  for (const row of rows) {
    uuidToRowId.set(row.nodeId, row.id)
  }

  // Build map: tarea UUID -> predecesoras con tipo y desfase ("4", "5SS", "7FS+2 hrs")
  const predecessorMap = new Map<string, string[]>()
  const minDia = Math.round(horasPorDia * 60)
  for (const dep of dependencias) {
    const origenRowId = uuidToRowId.get(dep.tareaOrigenId)
    if (origenRowId === undefined) continue
    const tipo = TIPO_PREDECESORA[dep.tipo] ?? 'FS'
    const lag = dep.lagMinutos ?? 0
    const lagTxt = lag === 0 ? '' : `${lag > 0 ? '+' : '-'}${
      Math.abs(lag) % minDia === 0 ? `${Math.abs(lag) / minDia} days` : `${Math.round((Math.abs(lag) / 60) * 100) / 100} hrs`}`
    const texto = tipo === 'FS' && !lagTxt ? String(origenRowId) : `${origenRowId}${tipo}${lagTxt}`

    const existing = predecessorMap.get(dep.tareaDependienteId) || []
    existing.push(texto)
    predecessorMap.set(dep.tareaDependienteId, existing)
  }

  // Assign predecessors to rows
  for (const row of rows) {
    const preds = predecessorMap.get(row.nodeId)
    if (preds && preds.length > 0) {
      row.predecessors = preds.join(',')
    }
  }
}

// Las fechas se escriben como fecha real de Excel (no como texto): MS Project
// las lee igual sea cual sea el idioma, y no aparece el "at" que agregan los
// navegadores al formatear ("October 28, 2026 at 08:00 AM").
// Las fechas guardan la hora de obra en los campos UTC (sin zona, como MS
// Project). El número de serie de Excel se calcula directo de esos componentes:
// si se le pasa un Date a la librería, convierte con la zona del navegador y su
// desfase histórico de 1899 (en Lima corría las horas 1 minuto: 08:00 → 07:59).
const EPOCH_EXCEL_MS = Date.UTC(1899, 11, 30)
function formatExcelDate(date: Date): XLSX.CellObject {
  const serial = (date.getTime() - EPOCH_EXCEL_MS) / 86400000
  return { t: 'n', v: Math.round(serial * 1440) / 1440, z: 'yyyy-mm-dd hh:mm' }
}

/**
 * Collect task-resource assignments from the flattened tree.
 * Only level-5 (tarea) nodes with a recurso assigned are included.
 */
function collectTareaRecursos(tree: TreeNode[]): TareaRecursoRow[] {
  const result: TareaRecursoRow[] = []

  function visit(n: TreeNode) {
    const data = n.data || {}

    // Excluir tareas extras y el pseudo-grupo "Tareas Extras"
    if (data.isExtrasGroup || data.esExtra) return

    const outlineLevel = n.level + 1
    const hasChildren = n.children && n.children.length > 0

    if (outlineLevel === 5 && !hasChildren && data.recursoNombre) {
      const nodeId = n.id.replace(/^(proyecto|fase|edt|actividad|tarea)-/, '')
      result.push({
        taskName: n.nombre || '',
        nodeId,
        recursoNombre: data.recursoNombre,
        trabajo: data.horasHombre !== undefined
          ? Number(data.horasHombre) || 0
          : Number(data.horasEstimadas || 0) * (data.personasEstimadas || 1),
        duracionHoras: Number(data.duracionHoras) || 0,
      })
    }

    if (n.children) {
      for (const child of n.children) visit(child)
    }
  }

  for (const root of tree) visit(root)
  return result
}

/**
 * Build the Resource_Table sheet with catalog resources.
 */
function buildResourceSheet(recursos: RecursoExport[]): XLSX.WorkSheet {
  const header = ['ID', 'Name', 'Type', 'Max Units', 'Standard Rate']
  const dataRows = recursos.map((r, idx) => [
    idx + 1,
    r.nombre,
    'Work',
    '100%',
    r.costoHoraProyecto != null ? `${r.costoHoraProyecto.toFixed(2)}/hr` : '0.00/hr',
  ])

  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows])
  ws['!cols'] = [
    { wch: 5 },   // ID
    { wch: 30 },  // Name
    { wch: 10 },  // Type
    { wch: 12 },  // Max Units
    { wch: 16 },  // Standard Rate
  ]
  return ws
}

/**
 * Build the Assignment_Table sheet from task-resource assignments.
 */
function buildAssignmentSheet(tareaRecursos: TareaRecursoRow[]): XLSX.WorkSheet {
  const header = ['Task Name', 'Resource Name', '% Work Complete', 'Work', 'Units']
  const dataRows = tareaRecursos.map(t => {
    // Unidades = trabajo / duración (5 h en 5 días de 9.5 h = 11%), como las calcula MS Project.
    const unidades = t.duracionHoras > 0 ? Math.round((t.trabajo / t.duracionHoras) * 100) : 100
    return [
      t.taskName,
      t.recursoNombre,
      '0%',
      `${Math.round(t.trabajo * 100) / 100} hrs`,
      `${unidades}%`,
    ]
  })

  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows])
  ws['!cols'] = [
    { wch: 55 },  // Task Name
    { wch: 30 },  // Resource Name
    { wch: 18 },  // % Work Complete
    { wch: 14 },  // Work
    { wch: 10 },  // Units
  ]
  return ws
}

/**
 * Export cronograma tree + dependencies to an Excel file matching MS Project format.
 * Creates 3 sheets: Task_Table, Resource_Table, Assignment_Table.
 */
export function exportCronogramaToExcel(
  tree: TreeNode[],
  dependencias: Dependencia[],
  projectName: string,
  horasPorDia: number = 8,
  recursos?: RecursoExport[]
): void {
  // Flatten all tree roots (should be 1 project node)
  let allRows: FlatRow[] = []
  for (const root of tree) {
    allRows = allRows.concat(flattenTree(root, horasPorDia))
  }

  // Assign sequential IDs starting from 0
  allRows.forEach((row, idx) => {
    row.id = idx
  })

  // Resolve predecessors
  resolvePredecessors(allRows, dependencias, horasPorDia)

  // Build Task_Table sheet
  const header = [
    'ID',
    'Active',
    'Task Mode',
    'Name',
    'Duration',
    'Work',
    'Start',
    'Finish',
    'Predecessors',
    'Outline Level',
    'Notes',
    'Milestone',
    'Deadline',
    'Text1',
  ]

  const dataRows = allRows.map((row) => [
    row.id,
    'Yes',
    // Manual: MS Project respeta las fechas exactas (no las reprograma por las
    // dependencias); los resúmenes se calculan de sus hijos.
    row.summary ? 'Auto Scheduled' : 'Manually Scheduled',
    row.name,
    row.duration,
    row.work,
    row.start ? formatExcelDate(row.start) : '',
    row.finish ? formatExcelDate(row.finish) : '',
    row.predecessors,
    row.outlineLevel,
    row.notes,
    row.milestone ? 'Yes' : 'No',
    row.deadline ? formatExcelDate(row.deadline) : 'NA',
    row.gysId,
  ])

  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows])

  // Column widths
  ws['!cols'] = [
    { wch: 5 },   // ID
    { wch: 7 },   // Active
    { wch: 16 },  // Task Mode
    { wch: 55 },  // Name
    { wch: 12 },  // Duration
    { wch: 14 },  // Work
    { wch: 30 },  // Start
    { wch: 30 },  // Finish
    { wch: 14 },  // Predecessors
    { wch: 14 },  // Outline Level
    { wch: 40 },  // Notes
    { wch: 10 },  // Milestone
    { wch: 30 },  // Deadline
    { wch: 46 },  // Text1 (ID de GYS)
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Task_Table')

  // Build Resource_Table sheet
  if (recursos && recursos.length > 0) {
    const resourceWs = buildResourceSheet(recursos)
    XLSX.utils.book_append_sheet(wb, resourceWs, 'Resource_Table')
  } else {
    // Empty sheet with headers only
    const emptyResourceWs = XLSX.utils.aoa_to_sheet([['ID', 'Name', 'Type', 'Max Units', 'Standard Rate']])
    XLSX.utils.book_append_sheet(wb, emptyResourceWs, 'Resource_Table')
  }

  // Build Assignment_Table sheet from tree data
  const tareaRecursos = collectTareaRecursos(tree)
  if (tareaRecursos.length > 0) {
    const assignmentWs = buildAssignmentSheet(tareaRecursos)
    XLSX.utils.book_append_sheet(wb, assignmentWs, 'Assignment_Table')
  } else {
    // Empty sheet with headers only
    const emptyAssignmentWs = XLSX.utils.aoa_to_sheet([['Task Name', 'Resource Name', '% Work Complete', 'Work', 'Units']])
    XLSX.utils.book_append_sheet(wb, emptyAssignmentWs, 'Assignment_Table')
  }

  const filename = `cronograma-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, filename)
}
