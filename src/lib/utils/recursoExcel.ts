// ===============================
// 📁 recursoExcel.ts
// 🔧 Utilidades para exportar/importar recursos desde Excel
// ===============================
import * as XLSX from 'xlsx'
import { Recurso } from '@/types'

/**
 * Exporta la lista de recursos a un archivo Excel
 */
export function exportarRecursosAExcel(recursos: Recurso[]) {
  const data = recursos.map((r) => {
    // Cuadrilla: composición por perfiles (recursos individuales), nunca nombres
    // de persona (ver docs/analisis-composicion-recursos.md). Individual: sigue
    // siendo el pool de empleados de referencia de costo, sin cambios.
    const personal = r.tipo === 'cuadrilla'
      ? r.perfiles?.map(p => `${(p.cantidad ?? 1) > 1 ? `${p.cantidad}× ` : ''}${p.recursoMiembro?.nombre ?? ''}`).filter(Boolean).join(', ') || ''
      : r.composiciones?.map(c => c.empleado?.user?.name).filter(Boolean).join(', ') || ''

    return {
      Nombre: r.nombre,
      Tipo: r.tipo === 'cuadrilla' ? 'Cuadrilla' : 'Individual',
      Origen: r.origen === 'externo' ? 'Externo' : 'GYS',
      'Costo Hora': r.costoHora,
      'Costo Hora Proyecto': r.costoHoraProyecto ?? '',
      Descripción: r.descripcion || '',
      Personal: personal || '(sin asignar)'
    }
  })

  const worksheet = XLSX.utils.json_to_sheet(data)

  const columnWidths = [
    { wch: 30 }, // Nombre
    { wch: 12 }, // Tipo
    { wch: 10 }, // Origen
    { wch: 12 }, // Costo Hora
    { wch: 18 }, // Costo Hora Proyecto
    { wch: 40 }, // Descripción
    { wch: 40 }, // Personal
  ]
  worksheet['!cols'] = columnWidths

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Recursos')

  const timestamp = new Date().toISOString().split('T')[0]
  XLSX.writeFile(workbook, `recursos_${timestamp}.xlsx`)
}

const TIPO_OPCIONES = ['Individual', 'Cuadrilla'] as const
const ORIGEN_OPCIONES = ['GYS', 'Externo'] as const

/**
 * Genera una plantilla Excel para importar recursos, usando exceljs para
 * dropdowns estrictos (data validation):
 * - "Nombre" solo permite elegir un recurso HABILITADO existente (no se
 *   pueden crear recursos nuevos por importación).
 * - "Tipo" y "Origen" son listas cerradas.
 * - Todos los campos salvo Nombre son opcionales: si se dejan en blanco,
 *   se conserva el valor actual del recurso (no se sobreescribe con un
 *   valor por defecto).
 */
export async function generarPlantillaRecursos(recursosExistentes: Recurso[] = []) {
  const ExcelJS = (await import('exceljs')).default
  const activos = [...recursosExistentes]
    .filter(r => r.activo)
    .sort((a, b) => a.nombre.localeCompare(b.nombre))

  const wb = new ExcelJS.Workbook()

  // --- Hoja 1: Recursos (editable) ---
  const ws = wb.addWorksheet('Recursos')
  ws.columns = [
    { header: 'Nombre *', key: 'nombre', width: 30 },
    { header: 'Tipo', key: 'tipo', width: 12 },
    { header: 'Origen', key: 'origen', width: 10 },
    { header: 'Costo Hora', key: 'costoHora', width: 12 },
    { header: 'Costo Hora Proyecto', key: 'costoHoraProyecto', width: 18 },
    { header: 'Descripción', key: 'descripcion', width: 40 },
  ]
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFED7AA' } }

  ws.addRow({
    nombre: activos[0]?.nombre ?? '(elige un recurso de la lista)',
    tipo: '', origen: '', costoHora: '', costoHoraProyecto: '',
    descripcion: '(deja en blanco lo que no quieras cambiar)'
  })

  // --- Hoja 2: Recursos Existentes (referencia visible + fuente del dropdown) ---
  const wsRef = wb.addWorksheet('Recursos Existentes')
  wsRef.columns = [
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Tipo', key: 'tipo', width: 12 },
    { header: 'Origen', key: 'origen', width: 10 },
    { header: 'Costo Hora', key: 'costoHora', width: 12 },
  ]
  wsRef.getRow(1).font = { bold: true }
  wsRef.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }
  for (const r of activos) {
    wsRef.addRow({
      nombre: r.nombre,
      tipo: r.tipo === 'cuadrilla' ? 'Cuadrilla' : 'Individual',
      origen: r.origen === 'externo' ? 'Externo' : 'GYS',
      costoHora: r.costoHora,
    })
  }

  // --- Hojas ocultas: opciones de Tipo/Origen ---
  const wsTipo = wb.addWorksheet('TipoOpciones')
  wsTipo.columns = [{ header: 'Tipo', key: 'v', width: 12 }]
  for (const v of TIPO_OPCIONES) wsTipo.addRow({ v })
  wsTipo.state = 'hidden'

  const wsOrigen = wb.addWorksheet('OrigenOpciones')
  wsOrigen.columns = [{ header: 'Origen', key: 'v', width: 10 }]
  for (const v of ORIGEN_OPCIONES) wsOrigen.addRow({ v })
  wsOrigen.state = 'hidden'

  // --- Data validations ---
  const SELECTOR_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFEFF6FF' } }
  const ROWS_VALIDADAS = 500
  for (let row = 2; row <= ROWS_VALIDADAS; row++) {
    // A: Nombre — solo recursos habilitados existentes
    if (activos.length > 0) {
      ws.getCell(`A${row}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`'Recursos Existentes'!$A$2:$A$${activos.length + 1}`],
        showErrorMessage: true,
        errorTitle: 'Recurso inválido',
        error: 'Selecciona un recurso habilitado de la lista. No se crean recursos nuevos por importación.',
      }
      ws.getCell(`A${row}`).fill = SELECTOR_FILL
    }
    // B: Tipo
    ws.getCell(`B${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`TipoOpciones!$A$2:$A$${TIPO_OPCIONES.length + 1}`],
      showErrorMessage: true,
      errorTitle: 'Tipo inválido',
      error: 'Solo se permite Individual o Cuadrilla. Déjalo en blanco para no cambiarlo.',
    }
    ws.getCell(`B${row}`).fill = SELECTOR_FILL
    // C: Origen
    ws.getCell(`C${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`OrigenOpciones!$A$2:$A$${ORIGEN_OPCIONES.length + 1}`],
      showErrorMessage: true,
      errorTitle: 'Origen inválido',
      error: 'Solo se permite GYS o Externo. Déjalo en blanco para no cambiarlo.',
    }
    ws.getCell(`C${row}`).fill = SELECTOR_FILL
    // D: Costo Hora — decimal >= 0, opcional
    ws.getCell(`D${row}`).dataValidation = {
      type: 'decimal',
      operator: 'greaterThanOrEqual',
      allowBlank: true,
      formulae: [0],
      showErrorMessage: true,
      errorTitle: 'Costo inválido',
      error: 'Costo Hora debe ser ≥ 0. Déjalo en blanco para no cambiarlo.',
    }
    // E: Costo Hora Proyecto — decimal >= 0, opcional
    ws.getCell(`E${row}`).dataValidation = {
      type: 'decimal',
      operator: 'greaterThanOrEqual',
      allowBlank: true,
      formulae: [0],
      showErrorMessage: true,
      errorTitle: 'Costo inválido',
      error: 'Costo Hora Proyecto debe ser ≥ 0. Déjalo en blanco para no cambiarlo.',
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'plantilla_recursos.xlsx'
  a.click()
  URL.revokeObjectURL(url)
}
