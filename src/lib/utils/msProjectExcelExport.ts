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
  }
  children?: TreeNode[]
}

interface Dependencia {
  tareaOrigenId: string
  tareaDependienteId: string
  tipo: string
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
}

/**
 * Flatten the tree into rows with Outline Level, matching the MS Project Excel format.
 * Level mapping: proyecto=1, fase=2, edt=3, actividad=4, tarea=5
 */
function flattenTree(node: TreeNode, horasPorDia: number): FlatRow[] {
  const rows: FlatRow[] = []

  function visit(n: TreeNode) {
    const data = n.data || {}
    const fechaInicio = data.fechaInicio || data.fechaInicioComercial
    const fechaFin = data.fechaFin || data.fechaFinComercial
    const horas = Number(data.horasEstimadas || 0)
    const hasChildren = n.children && n.children.length > 0

    // Outline level: proyecto=1, fase=2, edt=3, actividad=4, tarea=5
    const outlineLevel = n.level + 1

    // Duration: convert hours back to days string
    let duration = ''
    if (horas > 0) {
      const days = horas / horasPorDia
      if (days === Math.floor(days)) {
        duration = `${days} days`
      } else {
        duration = `${days.toFixed(2)} days`
      }
    } else if (!hasChildren) {
      duration = '0 days'
    }

    // Work: person-hours
    let work = ''
    if (!hasChildren && horas > 0) {
      const personas = data.personasEstimadas || 1
      const totalWork = horas * personas
      work = `${totalWork} hrs`
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
  dependencias: Dependencia[]
): void {
  // Build map: tarea UUID -> row ID
  const uuidToRowId = new Map<string, number>()
  for (const row of rows) {
    uuidToRowId.set(row.nodeId, row.id)
  }

  // Build map: tarea UUID -> list of predecessor row IDs
  const predecessorMap = new Map<string, number[]>()
  for (const dep of dependencias) {
    const origenRowId = uuidToRowId.get(dep.tareaOrigenId)
    if (origenRowId === undefined) continue

    const existing = predecessorMap.get(dep.tareaDependienteId) || []
    existing.push(origenRowId)
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

function formatExcelDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  })
}

/**
 * Export cronograma tree + dependencies to an Excel file matching MS Project Task_Table format.
 */
export function exportCronogramaToExcel(
  tree: TreeNode[],
  dependencias: Dependencia[],
  projectName: string,
  horasPorDia: number = 8
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
  resolvePredecessors(allRows, dependencias)

  // Build sheet data
  const header = [
    'ID',
    'Active',
    'Task Mode',
    'Name',
    'Duration',
    'Start',
    'Finish',
    'Predecessors',
    'Outline Level',
    'Notes',
  ]

  const dataRows = allRows.map((row) => [
    row.id,
    'Yes',
    'Auto Scheduled',
    row.name,
    row.duration,
    row.start ? formatExcelDate(row.start) : '',
    row.finish ? formatExcelDate(row.finish) : '',
    row.predecessors,
    row.outlineLevel,
    row.notes,
  ])

  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows])

  // Column widths
  ws['!cols'] = [
    { wch: 5 },   // ID
    { wch: 7 },   // Active
    { wch: 16 },  // Task Mode
    { wch: 55 },  // Name
    { wch: 12 },  // Duration
    { wch: 30 },  // Start
    { wch: 30 },  // Finish
    { wch: 14 },  // Predecessors
    { wch: 14 },  // Outline Level
    { wch: 40 },  // Notes
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Task_Table')

  const filename = `cronograma-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.xlsx`
  XLSX.writeFile(wb, filename)
}
