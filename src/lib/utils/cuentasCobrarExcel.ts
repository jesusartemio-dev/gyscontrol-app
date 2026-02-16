import * as XLSX from 'xlsx'

// ============================================
// TIPOS
// ============================================
export interface CxCImportRow {
  clienteRuc: string
  clienteNombre: string
  nroDocumento: string
  monto: number
  moneda: string
  fechaEmision: string
  fechaVencimiento: string
  estado: string
  proyectoCodigo: string
  descripcion: string
}

export interface CxCValidatedRow extends CxCImportRow {
  fila: number
  clienteId?: string
  proyectoId?: string
  errores: string[]
}

export interface CxCImportResult {
  validos: CxCValidatedRow[]
  invalidos: CxCValidatedRow[]
  erroresGlobales: string[]
}

interface ClienteRef {
  id: string
  nombre: string
  ruc: string | null
}

interface ProyectoRef {
  id: string
  codigo: string
  nombre: string
}

interface CxCExportRow {
  numeroDocumento: string | null
  cliente?: { nombre: string; ruc: string | null }
  proyecto?: { codigo: string; nombre: string }
  monto: number
  moneda: string
  montoPagado: number
  saldoPendiente: number
  fechaEmision: string
  fechaVencimiento: string
  estado: string
  descripcion: string | null
  observaciones: string | null
  valorizacion?: { codigo: string } | null
}

const ESTADOS_VALIDOS = ['pendiente', 'parcial', 'pagada', 'vencida', 'anulada']
const MONEDAS_VALIDAS = ['PEN', 'USD']

// ============================================
// LEER EXCEL
// ============================================
export async function leerExcelCxC(file: File): Promise<any[]> {
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
export function validarCxCImport(
  rows: any[],
  clientes: ClienteRef[],
  proyectos: ProyectoRef[]
): CxCImportResult {
  const erroresGlobales: string[] = []
  const validos: CxCValidatedRow[] = []
  const invalidos: CxCValidatedRow[] = []

  if (rows.length === 0) {
    erroresGlobales.push('El archivo está vacío o no tiene datos válidos')
    return { validos, invalidos, erroresGlobales }
  }

  // Mapas de búsqueda
  const clientePorRuc = new Map<string, ClienteRef>()
  for (const c of clientes) {
    if (c.ruc) clientePorRuc.set(c.ruc.trim(), c)
  }
  const proyectoPorCodigo = new Map<string, ProyectoRef>()
  for (const p of proyectos) {
    proyectoPorCodigo.set(p.codigo.toLowerCase().trim(), p)
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const fila = i + 2
    const errores: string[] = []

    // Leer campos
    const clienteRuc = String(row['RUC Cliente'] || row['clienteRuc'] || '').trim()
    const clienteNombre = String(row['Cliente'] || row['clienteNombre'] || '').trim()
    const nroDocumento = String(row['N° Documento'] || row['nroDocumento'] || '').trim()
    const montoRaw = row['Monto'] || row['monto']
    const moneda = String(row['Moneda'] || row['moneda'] || 'PEN').trim().toUpperCase()
    const fechaEmisionRaw = row['Fecha Emisión'] || row['Fecha Emision'] || row['fechaEmision'] || ''
    const fechaVencimientoRaw = row['Fecha Vencimiento'] || row['fechaVencimiento'] || ''
    const estado = String(row['Estado'] || row['estado'] || 'pendiente').trim().toLowerCase()
    const proyectoCodigo = String(row['Código Proyecto'] || row['Codigo Proyecto'] || row['proyectoCodigo'] || '').trim()
    const descripcion = String(row['Descripción'] || row['Descripcion'] || row['descripcion'] || '').trim()

    // Validar RUC
    if (!clienteRuc) {
      errores.push('RUC Cliente es requerido')
    } else if (!/^\d{11}$/.test(clienteRuc)) {
      errores.push(`RUC "${clienteRuc}" inválido (debe ser 11 dígitos)`)
    }

    // Buscar cliente
    let clienteId: string | undefined
    if (clienteRuc && /^\d{11}$/.test(clienteRuc)) {
      const cli = clientePorRuc.get(clienteRuc)
      if (cli) {
        clienteId = cli.id
      } else {
        errores.push(`Cliente con RUC ${clienteRuc} no encontrado en el sistema`)
      }
    }

    // Validar monto
    const monto = parseFloat(String(montoRaw || '0').replace(/,/g, ''))
    if (isNaN(monto) || monto <= 0) {
      errores.push('Monto debe ser un número mayor a 0')
    }

    // Validar moneda
    if (!MONEDAS_VALIDAS.includes(moneda)) {
      errores.push(`Moneda "${moneda}" inválida. Use: PEN o USD`)
    }

    // Validar fechas
    const fechaEmision = parseDateStr(fechaEmisionRaw)
    const fechaVencimiento = parseDateStr(fechaVencimientoRaw)

    if (!fechaEmision) {
      errores.push('Fecha Emisión es requerida (formato: DD/MM/YYYY)')
    }
    if (!fechaVencimiento) {
      errores.push('Fecha Vencimiento es requerida (formato: DD/MM/YYYY)')
    }
    if (fechaEmision && fechaVencimiento && fechaVencimiento < fechaEmision) {
      errores.push('Fecha Vencimiento debe ser posterior a Fecha Emisión')
    }

    // Validar estado
    if (!ESTADOS_VALIDOS.includes(estado)) {
      errores.push(`Estado "${estado}" inválido. Use: ${ESTADOS_VALIDOS.join(', ')}`)
    }

    // Buscar proyecto (requerido para CxC)
    let proyectoId: string | undefined
    if (!proyectoCodigo) {
      errores.push('Código Proyecto es requerido para cuentas por cobrar')
    } else {
      const proy = proyectoPorCodigo.get(proyectoCodigo.toLowerCase())
      if (proy) {
        proyectoId = proy.id
      } else {
        errores.push(`Proyecto "${proyectoCodigo}" no encontrado`)
      }
    }

    const validated: CxCValidatedRow = {
      fila,
      clienteRuc,
      clienteNombre,
      nroDocumento,
      monto,
      moneda,
      fechaEmision: fechaEmision ? fechaEmision.toISOString().split('T')[0] : '',
      fechaVencimiento: fechaVencimiento ? fechaVencimiento.toISOString().split('T')[0] : '',
      estado,
      proyectoCodigo,
      descripcion,
      clienteId,
      proyectoId,
      errores,
    }

    if (errores.length > 0) {
      invalidos.push(validated)
    } else {
      validos.push(validated)
    }
  }

  return { validos, invalidos, erroresGlobales }
}

// ============================================
// GENERAR PLANTILLA
// ============================================
export async function generarPlantillaCxC() {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  const ws = wb.addWorksheet('Cuentas por Cobrar')
  ws.columns = [
    { header: 'RUC Cliente', key: 'ruc', width: 15 },
    { header: 'Cliente', key: 'cliente', width: 30 },
    { header: 'N° Documento', key: 'documento', width: 18 },
    { header: 'Monto', key: 'monto', width: 14 },
    { header: 'Moneda', key: 'moneda', width: 10 },
    { header: 'Fecha Emisión', key: 'fechaEmision', width: 16 },
    { header: 'Fecha Vencimiento', key: 'fechaVencimiento', width: 16 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Código Proyecto', key: 'proyecto', width: 16 },
    { header: 'Descripción', key: 'descripcion', width: 30 },
  ]

  // Estilo header
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }

  // Ejemplo fila 1
  ws.addRow({
    ruc: '20100047218',
    cliente: 'Minera ABC S.A.',
    documento: 'F001-00100',
    monto: 45000.00,
    moneda: 'USD',
    fechaEmision: '01/01/2026',
    fechaVencimiento: '01/02/2026',
    estado: 'pendiente',
    proyecto: 'PRY-001',
    descripcion: 'Valorización N°1 - Enero 2026',
  })

  // Ejemplo fila 2
  ws.addRow({
    ruc: '20505678901',
    cliente: 'Empresa XYZ S.A.C.',
    documento: 'F001-00101',
    monto: 12500.00,
    moneda: 'PEN',
    fechaEmision: '15/01/2026',
    fechaVencimiento: '15/02/2026',
    estado: 'pendiente',
    proyecto: 'PRY-002',
    descripcion: 'Servicio de ingeniería',
  })

  // Estilo filas de ejemplo
  for (let row = 2; row <= 3; row++) {
    ws.getRow(row).font = { italic: true, color: { argb: 'FF999999' } }
  }

  // Data validations
  const maxRow = 500
  for (let row = 2; row <= maxRow; row++) {
    ws.getCell(`E${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"PEN,USD"'],
      showErrorMessage: true,
      errorTitle: 'Moneda inválida',
      error: 'Use PEN o USD',
    }
    ws.getCell(`H${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"pendiente,parcial,pagada,vencida,anulada"'],
      showErrorMessage: true,
      errorTitle: 'Estado inválido',
      error: 'Seleccione un estado válido',
    }
  }

  // Hoja de instrucciones
  const wsInfo = wb.addWorksheet('Instrucciones')
  wsInfo.columns = [
    { header: 'Campo', key: 'campo', width: 20 },
    { header: 'Requerido', key: 'requerido', width: 12 },
    { header: 'Descripción', key: 'descripcion', width: 60 },
  ]
  wsInfo.getRow(1).font = { bold: true }
  wsInfo.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } }

  const instrucciones = [
    ['RUC Cliente', 'Sí', 'RUC de 11 dígitos. El cliente debe existir en el sistema.'],
    ['Cliente', 'No', 'Nombre del cliente (referencia, no se usa para importar).'],
    ['N° Documento', 'No', 'Número de factura o documento (ej: F001-00100).'],
    ['Monto', 'Sí', 'Monto total del documento. Usar punto como decimal.'],
    ['Moneda', 'Sí', 'PEN (soles) o USD (dólares). Por defecto: PEN.'],
    ['Fecha Emisión', 'Sí', 'Formato: DD/MM/YYYY (ej: 01/01/2026).'],
    ['Fecha Vencimiento', 'Sí', 'Formato: DD/MM/YYYY. Debe ser posterior a la emisión.'],
    ['Estado', 'No', 'pendiente (defecto), parcial, pagada, vencida, anulada'],
    ['Código Proyecto', 'Sí', 'Código del proyecto (ej: PRY-001). Debe existir en el sistema.'],
    ['Descripción', 'No', 'Texto libre (ej: Valorización N°1).'],
  ]
  for (const [campo, req, desc] of instrucciones) {
    wsInfo.addRow({ campo, requerido: req, descripcion: desc })
  }

  // Descargar
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'Plantilla_CuentasPorCobrar.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================
// EXPORTAR TABLA A EXCEL
// ============================================
export async function exportarCxCAExcel(items: CxCExportRow[]) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  const ws = wb.addWorksheet('Cuentas por Cobrar')
  ws.columns = [
    { header: 'N° Documento', key: 'documento', width: 18 },
    { header: 'Cliente', key: 'cliente', width: 30 },
    { header: 'RUC', key: 'ruc', width: 15 },
    { header: 'Proyecto', key: 'proyecto', width: 15 },
    { header: 'Valorización', key: 'valorizacion', width: 15 },
    { header: 'Monto', key: 'monto', width: 14 },
    { header: 'Moneda', key: 'moneda', width: 10 },
    { header: 'Pagado', key: 'pagado', width: 14 },
    { header: 'Saldo', key: 'saldo', width: 14 },
    { header: 'Fecha Emisión', key: 'fechaEmision', width: 16 },
    { header: 'Fecha Vencimiento', key: 'fechaVencimiento', width: 16 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Descripción', key: 'descripcion', width: 30 },
    { header: 'Observaciones', key: 'observaciones', width: 30 },
  ]

  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }

  for (const item of items) {
    ws.addRow({
      documento: item.numeroDocumento || '',
      cliente: item.cliente?.nombre || '',
      ruc: item.cliente?.ruc || '',
      proyecto: item.proyecto?.codigo || '',
      valorizacion: item.valorizacion?.codigo || '',
      monto: item.monto,
      moneda: item.moneda,
      pagado: item.montoPagado,
      saldo: item.saldoPendiente,
      fechaEmision: formatDateExcel(item.fechaEmision),
      fechaVencimiento: formatDateExcel(item.fechaVencimiento),
      estado: item.estado,
      descripcion: item.descripcion || '',
      observaciones: item.observaciones || '',
    })
  }

  // Formato montos
  for (let row = 2; row <= items.length + 1; row++) {
    for (const col of ['F', 'H', 'I']) {
      ws.getCell(`${col}${row}`).numFmt = '#,##0.00'
    }
  }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `CuentasPorCobrar_${new Date().toISOString().split('T')[0]}.xlsx`
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

  // Fallback
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
