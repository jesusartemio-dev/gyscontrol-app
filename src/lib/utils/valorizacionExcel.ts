import * as XLSX from 'xlsx'

// ============================================
// TIPOS
// ============================================
export interface ValImportRow {
  proyectoCodigo: string
  numero: number
  periodoInicio: string
  periodoFin: string
  montoValorizacion: number
  moneda: string
  tipoCambio: number | null
  descuentoComercialPorcentaje: number
  adelantoPorcentaje: number
  igvPorcentaje: number
  fondoGarantiaPorcentaje: number
  estado: string
  observaciones: string
}

export interface ValValidatedRow extends ValImportRow {
  fila: number
  proyectoId?: string
  proyectoNombre?: string
  errores: string[]
}

export interface ValImportResult {
  validos: ValValidatedRow[]
  invalidos: ValValidatedRow[]
  erroresGlobales: string[]
}

interface ProyectoRef {
  id: string
  codigo: string
  nombre: string
  totalCliente?: number | null
}

interface ValExportRow {
  codigo: string
  numero: number
  proyecto?: { codigo: string; nombre: string } | null
  periodoInicio: string
  periodoFin: string
  moneda: string
  tipoCambio: number | null
  presupuestoContractual: number
  acumuladoAnterior: number
  montoValorizacion: number
  acumuladoActual: number
  saldoPorValorizar: number
  porcentajeAvance: number
  descuentoComercialPorcentaje: number
  descuentoComercialMonto: number
  adelantoPorcentaje: number
  adelantoMonto: number
  subtotal: number
  igvPorcentaje: number
  igvMonto: number
  fondoGarantiaPorcentaje: number
  fondoGarantiaMonto: number
  netoARecibir: number
  estado: string
  observaciones: string | null
}

const ESTADOS_VALIDOS = ['borrador', 'enviada', 'observada', 'corregida', 'aprobada_cliente', 'facturada', 'pagada', 'anulada']
const MONEDAS_VALIDAS = ['PEN', 'USD']

// ============================================
// LEER EXCEL
// ============================================
export async function leerExcelVal(file: File): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array', cellDates: true })
        const sheetName = workbook.SheetNames[0]
        const sheet = workbook.Sheets[sheetName]
        const json = XLSX.utils.sheet_to_json<any>(sheet, { raw: false })
        resolve(json)
      } catch (error) {
        reject(error)
      }
    }
    reader.onerror = (error) => reject(error)
    reader.readAsArrayBuffer(file)
  })
}

// ============================================
// VALIDAR FILAS IMPORTADAS
// ============================================
export function validarValImport(
  rows: any[],
  proyectos: ProyectoRef[]
): ValImportResult {
  const erroresGlobales: string[] = []
  const validos: ValValidatedRow[] = []
  const invalidos: ValValidatedRow[] = []

  if (rows.length === 0) {
    erroresGlobales.push('El archivo está vacío o no tiene datos válidos')
    return { validos, invalidos, erroresGlobales }
  }

  const proyectoPorCodigo = new Map<string, ProyectoRef>()
  for (const p of proyectos) {
    proyectoPorCodigo.set(p.codigo.toLowerCase().trim(), p)
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const fila = i + 2
    const errores: string[] = []

    const proyectoCodigo = String(row['Código Proyecto'] || row['proyectoCodigo'] || '').trim()
    const numeroRaw = row['Número'] || row['numero'] || ''
    const periodoInicioRaw = row['Periodo Inicio'] || row['periodoInicio'] || ''
    const periodoFinRaw = row['Periodo Fin'] || row['periodoFin'] || ''
    const montoRaw = row['Monto Valorización'] || row['montoValorizacion'] || ''
    const moneda = String(row['Moneda'] || row['moneda'] || 'USD').trim().toUpperCase()
    const tipoCambioRaw = row['Tipo Cambio'] || row['tipoCambio'] || ''
    const descuentoRaw = row['Descuento Comercial %'] || row['descuentoComercialPorcentaje'] || '0'
    const adelantoRaw = row['Adelanto %'] || row['adelantoPorcentaje'] || '0'
    const igvRaw = row['IGV %'] || row['igvPorcentaje'] || '18'
    const fondoGarantiaRaw = row['Fondo Garantía %'] || row['fondoGarantiaPorcentaje'] || '0'
    const estado = String(row['Estado'] || row['estado'] || 'borrador').trim().toLowerCase()
    const observaciones = String(row['Observaciones'] || row['observaciones'] || '').trim()

    // Validate proyecto
    let proyectoId: string | undefined
    let proyectoNombre: string | undefined
    if (!proyectoCodigo) {
      errores.push('Código Proyecto es requerido')
    } else {
      const proy = proyectoPorCodigo.get(proyectoCodigo.toLowerCase())
      if (proy) {
        proyectoId = proy.id
        proyectoNombre = proy.nombre
      } else {
        errores.push(`Proyecto "${proyectoCodigo}" no encontrado`)
      }
    }

    // Validate numero
    const numero = parseInt(String(numeroRaw).trim())
    if (isNaN(numero) || numero <= 0) {
      errores.push('Número debe ser un entero positivo (1, 2, 3...)')
    }

    // Validate monto
    const montoValorizacion = parseFloat(String(montoRaw).replace(/,/g, ''))
    if (isNaN(montoValorizacion) || montoValorizacion <= 0) {
      errores.push('Monto Valorización debe ser mayor a 0')
    }

    // Validate moneda
    if (!MONEDAS_VALIDAS.includes(moneda)) {
      errores.push(`Moneda "${moneda}" inválida. Use: PEN o USD`)
    }

    // Validate dates
    const periodoInicio = parseDateStr(periodoInicioRaw)
    const periodoFin = parseDateStr(periodoFinRaw)

    if (!periodoInicio) {
      errores.push('Periodo Inicio es requerido (formato: DD/MM/YYYY)')
    }
    if (!periodoFin) {
      errores.push('Periodo Fin es requerido (formato: DD/MM/YYYY)')
    }
    if (periodoInicio && periodoFin && periodoFin <= periodoInicio) {
      errores.push('Periodo Fin debe ser posterior a Periodo Inicio')
    }

    // Validate percentages
    const descuentoComercialPorcentaje = parseFloat(String(descuentoRaw).replace(/,/g, '')) || 0
    const adelantoPorcentaje = parseFloat(String(adelantoRaw).replace(/,/g, '')) || 0
    const igvPorcentaje = parseFloat(String(igvRaw).replace(/,/g, ''))
    const fondoGarantiaPorcentaje = parseFloat(String(fondoGarantiaRaw).replace(/,/g, '')) || 0

    if (isNaN(igvPorcentaje)) {
      errores.push('IGV % debe ser un número')
    }
    if (descuentoComercialPorcentaje < 0 || descuentoComercialPorcentaje > 100) {
      errores.push('Descuento Comercial % debe estar entre 0 y 100')
    }
    if (adelantoPorcentaje < 0 || adelantoPorcentaje > 100) {
      errores.push('Adelanto % debe estar entre 0 y 100')
    }
    if (fondoGarantiaPorcentaje < 0 || fondoGarantiaPorcentaje > 100) {
      errores.push('Fondo Garantía % debe estar entre 0 y 100')
    }

    // Validate tipoCambio
    const tipoCambio = tipoCambioRaw ? parseFloat(String(tipoCambioRaw).replace(/,/g, '')) : null
    if (tipoCambio !== null && (isNaN(tipoCambio) || tipoCambio <= 0)) {
      errores.push('Tipo Cambio debe ser un número positivo')
    }

    // Validate estado
    if (!ESTADOS_VALIDOS.includes(estado)) {
      errores.push(`Estado "${estado}" inválido. Use: ${ESTADOS_VALIDOS.join(', ')}`)
    }

    const validated: ValValidatedRow = {
      fila,
      proyectoCodigo,
      numero,
      periodoInicio: periodoInicio ? periodoInicio.toISOString().split('T')[0] : '',
      periodoFin: periodoFin ? periodoFin.toISOString().split('T')[0] : '',
      montoValorizacion,
      moneda,
      tipoCambio,
      descuentoComercialPorcentaje,
      adelantoPorcentaje,
      igvPorcentaje: isNaN(igvPorcentaje) ? 18 : igvPorcentaje,
      fondoGarantiaPorcentaje,
      estado,
      observaciones,
      proyectoId,
      proyectoNombre,
      errores,
    }

    if (errores.length > 0) {
      invalidos.push(validated)
    } else {
      validos.push(validated)
    }
  }

  // Sort validos by proyectoCodigo + numero for correct acumulado ordering
  validos.sort((a, b) => {
    const cmpProj = a.proyectoCodigo.localeCompare(b.proyectoCodigo)
    if (cmpProj !== 0) return cmpProj
    return a.numero - b.numero
  })

  return { validos, invalidos, erroresGlobales }
}

// ============================================
// GENERAR PLANTILLA
// ============================================
export async function generarPlantillaVal() {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  const ws = wb.addWorksheet('Valorizaciones')
  ws.columns = [
    { header: 'Código Proyecto', key: 'proyecto', width: 16 },
    { header: 'Número', key: 'numero', width: 10 },
    { header: 'Periodo Inicio', key: 'periodoInicio', width: 16 },
    { header: 'Periodo Fin', key: 'periodoFin', width: 16 },
    { header: 'Monto Valorización', key: 'monto', width: 20 },
    { header: 'Moneda', key: 'moneda', width: 10 },
    { header: 'Tipo Cambio', key: 'tipoCambio', width: 14 },
    { header: 'Descuento Comercial %', key: 'descuento', width: 22 },
    { header: 'Adelanto %', key: 'adelanto', width: 14 },
    { header: 'IGV %', key: 'igv', width: 10 },
    { header: 'Fondo Garantía %', key: 'fondoGarantia', width: 18 },
    { header: 'Estado', key: 'estado', width: 18 },
    { header: 'Observaciones', key: 'observaciones', width: 30 },
  ]

  // Header style
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }

  // Example rows
  ws.addRow({
    proyecto: 'PRY-001',
    numero: 1,
    periodoInicio: '01/01/2026',
    periodoFin: '31/01/2026',
    monto: 150000.00,
    moneda: 'USD',
    tipoCambio: 3.75,
    descuento: 5,
    adelanto: 10,
    igv: 18,
    fondoGarantia: 5,
    estado: 'borrador',
    observaciones: 'Valorización enero',
  })
  ws.addRow({
    proyecto: 'PRY-001',
    numero: 2,
    periodoInicio: '01/02/2026',
    periodoFin: '28/02/2026',
    monto: 200000.00,
    moneda: 'USD',
    tipoCambio: 3.75,
    descuento: 5,
    adelanto: 10,
    igv: 18,
    fondoGarantia: 5,
    estado: 'borrador',
    observaciones: 'Valorización febrero',
  })

  // Style example rows
  for (let row = 2; row <= 3; row++) {
    ws.getRow(row).font = { italic: true, color: { argb: 'FF999999' } }
  }

  // Data validations
  const maxRow = 200
  for (let row = 2; row <= maxRow; row++) {
    // Moneda (F)
    ws.getCell(`F${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"PEN,USD"'],
      showErrorMessage: true,
      errorTitle: 'Moneda inválida',
      error: 'Use PEN o USD',
    }
    // Estado (L)
    ws.getCell(`L${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"borrador,enviada,aprobada_cliente,facturada,pagada,anulada"'],
      showErrorMessage: true,
      errorTitle: 'Estado inválido',
      error: 'Seleccione un estado válido',
    }
  }

  // Instructions sheet
  const wsInfo = wb.addWorksheet('Instrucciones')
  wsInfo.columns = [
    { header: 'Campo', key: 'campo', width: 24 },
    { header: 'Requerido', key: 'requerido', width: 12 },
    { header: 'Descripción', key: 'descripcion', width: 70 },
  ]
  wsInfo.getRow(1).font = { bold: true }
  wsInfo.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }

  const instrucciones = [
    ['Código Proyecto', 'Sí', 'Código del proyecto (ej: PRY-001). Debe existir en el sistema.'],
    ['Número', 'Sí', 'Número secuencial de la valorización (1, 2, 3...). Usado para calcular acumulados.'],
    ['Periodo Inicio', 'Sí', 'Formato: DD/MM/YYYY. Inicio del periodo valorizado.'],
    ['Periodo Fin', 'Sí', 'Formato: DD/MM/YYYY. Fin del periodo. Debe ser posterior al inicio.'],
    ['Monto Valorización', 'Sí', 'Monto valorizado en este periodo. Debe ser mayor a 0.'],
    ['Moneda', 'No', 'USD (defecto) o PEN.'],
    ['Tipo Cambio', 'No', 'Tipo de cambio referencial (ej: 3.75).'],
    ['Descuento Comercial %', 'No', 'Porcentaje de descuento comercial (0-100). Defecto: 0.'],
    ['Adelanto %', 'No', 'Porcentaje de adelanto (0-100). Defecto: 0.'],
    ['IGV %', 'No', 'Porcentaje de IGV. Defecto: 18.'],
    ['Fondo Garantía %', 'No', 'Porcentaje de fondo de garantía (0-100). Defecto: 0.'],
    ['Estado', 'No', 'borrador (defecto), enviada, aprobada_cliente, facturada, pagada, anulada.'],
    ['Observaciones', 'No', 'Texto libre.'],
    ['', '', ''],
    ['NOTA', '', 'Los campos calculados (acumuladoAnterior, subtotal, IGV monto, neto a recibir, etc.) se calculan automáticamente en el servidor al importar. Ordene las filas por número dentro de cada proyecto para que los acumulados se calculen correctamente.'],
  ]
  for (const [campo, req, desc] of instrucciones) {
    wsInfo.addRow({ campo, requerido: req, descripcion: desc })
  }

  // Download
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'Plantilla_Valorizaciones.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================
// EXPORTAR TABLA A EXCEL
// ============================================
export async function exportarValAExcel(items: ValExportRow[]) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  const ws = wb.addWorksheet('Valorizaciones')
  ws.columns = [
    { header: 'Código', key: 'codigo', width: 20 },
    { header: 'N°', key: 'numero', width: 6 },
    { header: 'Proyecto', key: 'proyecto', width: 14 },
    { header: 'Nombre Proyecto', key: 'proyectoNombre', width: 25 },
    { header: 'Periodo Inicio', key: 'periodoInicio', width: 14 },
    { header: 'Periodo Fin', key: 'periodoFin', width: 14 },
    { header: 'Moneda', key: 'moneda', width: 8 },
    { header: 'T.C.', key: 'tipoCambio', width: 8 },
    { header: 'Presup. Contractual', key: 'presupuesto', width: 20 },
    { header: 'Acumulado Anterior', key: 'acumAnterior', width: 18 },
    { header: 'Monto Valorización', key: 'montoVal', width: 20 },
    { header: 'Acumulado Actual', key: 'acumActual', width: 18 },
    { header: 'Saldo por Valorizar', key: 'saldo', width: 18 },
    { header: '% Avance', key: 'avance', width: 10 },
    { header: 'Desc. Comercial %', key: 'descPct', width: 16 },
    { header: 'Desc. Comercial Monto', key: 'descMonto', width: 20 },
    { header: 'Adelanto %', key: 'adelPct', width: 12 },
    { header: 'Adelanto Monto', key: 'adelMonto', width: 16 },
    { header: 'Subtotal', key: 'subtotal', width: 14 },
    { header: 'IGV %', key: 'igvPct', width: 8 },
    { header: 'IGV Monto', key: 'igvMonto', width: 14 },
    { header: 'Fondo Garantía %', key: 'fgPct', width: 16 },
    { header: 'Fondo Garantía Monto', key: 'fgMonto', width: 20 },
    { header: 'Neto a Recibir', key: 'neto', width: 16 },
    { header: 'Estado', key: 'estado', width: 16 },
    { header: 'Observaciones', key: 'observaciones', width: 25 },
  ]

  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F5E9' } }

  for (const item of items) {
    ws.addRow({
      codigo: item.codigo,
      numero: item.numero,
      proyecto: item.proyecto?.codigo || '',
      proyectoNombre: item.proyecto?.nombre || '',
      periodoInicio: formatDateExcel(item.periodoInicio),
      periodoFin: formatDateExcel(item.periodoFin),
      moneda: item.moneda,
      tipoCambio: item.tipoCambio || '',
      presupuesto: item.presupuestoContractual,
      acumAnterior: item.acumuladoAnterior,
      montoVal: item.montoValorizacion,
      acumActual: item.acumuladoActual,
      saldo: item.saldoPorValorizar,
      avance: item.porcentajeAvance,
      descPct: item.descuentoComercialPorcentaje,
      descMonto: item.descuentoComercialMonto,
      adelPct: item.adelantoPorcentaje,
      adelMonto: item.adelantoMonto,
      subtotal: item.subtotal,
      igvPct: item.igvPorcentaje,
      igvMonto: item.igvMonto,
      fgPct: item.fondoGarantiaPorcentaje,
      fgMonto: item.fondoGarantiaMonto,
      neto: item.netoARecibir,
      estado: item.estado,
      observaciones: item.observaciones || '',
    })
  }

  // Format numbers
  const totalRows = ws.rowCount
  const numCols = ['I', 'J', 'K', 'L', 'M', 'P', 'R', 'S', 'U', 'W', 'X']
  for (let row = 2; row <= totalRows; row++) {
    for (const col of numCols) {
      const cell = ws.getCell(`${col}${row}`)
      if (typeof cell.value === 'number') {
        cell.numFmt = '#,##0.00'
      }
    }
    // % columns
    for (const col of ['N', 'O', 'Q', 'T', 'V']) {
      const cell = ws.getCell(`${col}${row}`)
      if (typeof cell.value === 'number') {
        cell.numFmt = '0.00'
      }
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `Valorizaciones_${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================
// HELPERS
// ============================================
function parseDateStr(val: any): Date | null {
  if (!val) return null

  if (val instanceof Date && !isNaN(val.getTime())) return val

  const str = String(val).trim()
  if (!str) return null

  // DD/MM/YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/)
  if (ddmmyyyy) {
    const [, dd, mm, yyyy] = ddmmyyyy
    const d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd))
    if (!isNaN(d.getTime())) return d
  }

  // YYYY-MM-DD
  const yyyymmdd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/)
  if (yyyymmdd) {
    const [, yyyy, mm, dd] = yyyymmdd
    const d = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd))
    if (!isNaN(d.getTime())) return d
  }

  const d = new Date(str)
  if (!isNaN(d.getTime())) return d

  return null
}

function formatDateExcel(dateStr: string): string {
  try {
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return dateStr
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}/${mm}/${yyyy}`
  } catch {
    return dateStr
  }
}
