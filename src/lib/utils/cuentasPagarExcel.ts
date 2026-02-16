import * as XLSX from 'xlsx'

// ============================================
// TIPOS
// ============================================
export interface CxPImportRow {
  proveedorRuc: string
  proveedorNombre: string
  nroFactura: string
  monto: number
  moneda: string
  fechaRecepcion: string
  fechaVencimiento: string
  condicionPago: string
  estado: string
  proyectoCodigo: string
  observaciones: string
}

export interface CxPValidatedRow extends CxPImportRow {
  fila: number
  proveedorId?: string
  proyectoId?: string
  errores: string[]
}

export interface CxPImportResult {
  validos: CxPValidatedRow[]
  invalidos: CxPValidatedRow[]
  erroresGlobales: string[]
}

interface ProveedorRef {
  id: string
  nombre: string
  ruc: string | null
}

interface ProyectoRef {
  id: string
  codigo: string
  nombre: string
}

interface CxPExportRow {
  numeroFactura: string | null
  proveedor?: { nombre: string; ruc: string | null }
  proyecto?: { codigo: string; nombre: string } | null
  monto: number
  moneda: string
  montoPagado: number
  saldoPendiente: number
  fechaRecepcion: string
  fechaVencimiento: string
  condicionPago: string
  estado: string
  observaciones: string | null
  ordenCompra?: { numero: string } | null
}

const ESTADOS_VALIDOS = ['pendiente', 'parcial', 'pagada', 'vencida', 'anulada']
const MONEDAS_VALIDAS = ['PEN', 'USD']
const CONDICIONES_VALIDAS = ['contado', 'credito_15', 'credito_30', 'credito_45', 'credito_60', 'credito_90']

// ============================================
// LEER EXCEL
// ============================================
export async function leerExcelCxP(file: File): Promise<any[]> {
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
export function validarCxPImport(
  rows: any[],
  proveedores: ProveedorRef[],
  proyectos: ProyectoRef[]
): CxPImportResult {
  const erroresGlobales: string[] = []
  const validos: CxPValidatedRow[] = []
  const invalidos: CxPValidatedRow[] = []

  if (rows.length === 0) {
    erroresGlobales.push('El archivo está vacío o no tiene datos válidos')
    return { validos, invalidos, erroresGlobales }
  }

  // Mapas de búsqueda
  const proveedorPorRuc = new Map<string, ProveedorRef>()
  for (const p of proveedores) {
    if (p.ruc) proveedorPorRuc.set(p.ruc.trim(), p)
  }
  const proyectoPorCodigo = new Map<string, ProyectoRef>()
  for (const p of proyectos) {
    proyectoPorCodigo.set(p.codigo.toLowerCase().trim(), p)
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const fila = i + 2 // +2: header + 1-indexed
    const errores: string[] = []

    // Leer campos
    const proveedorRuc = String(row['RUC Proveedor'] || row['proveedorRuc'] || '').trim()
    const proveedorNombre = String(row['Proveedor'] || row['proveedorNombre'] || '').trim()
    const nroFactura = String(row['N° Factura'] || row['nroFactura'] || '').trim()
    const montoRaw = row['Monto'] || row['monto']
    const moneda = String(row['Moneda'] || row['moneda'] || 'PEN').trim().toUpperCase()
    const fechaRecepcionRaw = row['Fecha Recepción'] || row['fechaRecepcion'] || ''
    const fechaVencimientoRaw = row['Fecha Vencimiento'] || row['fechaVencimiento'] || ''
    const condicionPago = String(row['Condición Pago'] || row['condicionPago'] || 'contado').trim().toLowerCase()
    const estado = String(row['Estado'] || row['estado'] || 'pendiente').trim().toLowerCase()
    const proyectoCodigo = String(row['Código Proyecto'] || row['proyectoCodigo'] || '').trim()
    const observaciones = String(row['Observaciones'] || row['observaciones'] || '').trim()

    // Validar RUC
    if (!proveedorRuc) {
      errores.push('RUC Proveedor es requerido')
    } else if (!/^\d{11}$/.test(proveedorRuc)) {
      errores.push(`RUC "${proveedorRuc}" inválido (debe ser 11 dígitos)`)
    }

    // Buscar proveedor
    let proveedorId: string | undefined
    if (proveedorRuc && /^\d{11}$/.test(proveedorRuc)) {
      const prov = proveedorPorRuc.get(proveedorRuc)
      if (prov) {
        proveedorId = prov.id
      } else {
        errores.push(`Proveedor con RUC ${proveedorRuc} no encontrado en el sistema`)
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
    const fechaRecepcion = parseDateStr(fechaRecepcionRaw)
    const fechaVencimiento = parseDateStr(fechaVencimientoRaw)

    if (!fechaRecepcion) {
      errores.push('Fecha Recepción es requerida (formato: DD/MM/YYYY)')
    }
    if (!fechaVencimiento) {
      errores.push('Fecha Vencimiento es requerida (formato: DD/MM/YYYY)')
    }
    if (fechaRecepcion && fechaVencimiento && fechaVencimiento < fechaRecepcion) {
      errores.push('Fecha Vencimiento debe ser posterior a Fecha Recepción')
    }

    // Validar condición de pago
    if (!CONDICIONES_VALIDAS.includes(condicionPago)) {
      errores.push(`Condición "${condicionPago}" inválida. Use: ${CONDICIONES_VALIDAS.join(', ')}`)
    }

    // Validar estado
    if (!ESTADOS_VALIDOS.includes(estado)) {
      errores.push(`Estado "${estado}" inválido. Use: ${ESTADOS_VALIDOS.join(', ')}`)
    }

    // Buscar proyecto (opcional)
    let proyectoId: string | undefined
    if (proyectoCodigo) {
      const proy = proyectoPorCodigo.get(proyectoCodigo.toLowerCase())
      if (proy) {
        proyectoId = proy.id
      } else {
        errores.push(`Proyecto "${proyectoCodigo}" no encontrado`)
      }
    }

    const validated: CxPValidatedRow = {
      fila,
      proveedorRuc,
      proveedorNombre,
      nroFactura,
      monto,
      moneda,
      fechaRecepcion: fechaRecepcion ? fechaRecepcion.toISOString().split('T')[0] : '',
      fechaVencimiento: fechaVencimiento ? fechaVencimiento.toISOString().split('T')[0] : '',
      condicionPago,
      estado,
      proyectoCodigo,
      observaciones,
      proveedorId,
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
export async function generarPlantillaCxP() {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  const ws = wb.addWorksheet('Cuentas por Pagar')
  ws.columns = [
    { header: 'RUC Proveedor', key: 'ruc', width: 15 },
    { header: 'Proveedor', key: 'proveedor', width: 30 },
    { header: 'N° Factura', key: 'factura', width: 18 },
    { header: 'Monto', key: 'monto', width: 14 },
    { header: 'Moneda', key: 'moneda', width: 10 },
    { header: 'Fecha Recepción', key: 'fechaRecepcion', width: 16 },
    { header: 'Fecha Vencimiento', key: 'fechaVencimiento', width: 16 },
    { header: 'Condición Pago', key: 'condicionPago', width: 16 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Código Proyecto', key: 'proyecto', width: 16 },
    { header: 'Observaciones', key: 'observaciones', width: 30 },
  ]

  // Estilo header
  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }

  // Ejemplo fila 1
  ws.addRow({
    ruc: '20100047218',
    proveedor: 'Siemens S.A.C.',
    factura: 'F001-00456',
    monto: 15000.00,
    moneda: 'USD',
    fechaRecepcion: '15/01/2026',
    fechaVencimiento: '15/02/2026',
    condicionPago: 'credito_30',
    estado: 'pendiente',
    proyecto: 'PRY-001',
    observaciones: 'Factura por equipos de control',
  })

  // Ejemplo fila 2
  ws.addRow({
    ruc: '20505678901',
    proveedor: 'Distribuidora ABC',
    factura: 'F002-00789',
    monto: 3500.50,
    moneda: 'PEN',
    fechaRecepcion: '20/01/2026',
    fechaVencimiento: '20/02/2026',
    condicionPago: 'contado',
    estado: 'pendiente',
    proyecto: '',
    observaciones: '',
  })

  // Estilo filas de ejemplo
  for (let row = 2; row <= 3; row++) {
    ws.getRow(row).font = { italic: true, color: { argb: 'FF999999' } }
  }

  // Data validations
  const maxRow = 500
  for (let row = 2; row <= maxRow; row++) {
    // Moneda
    ws.getCell(`E${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"PEN,USD"'],
      showErrorMessage: true,
      errorTitle: 'Moneda inválida',
      error: 'Use PEN o USD',
    }
    // Condición de pago
    ws.getCell(`H${row}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: ['"contado,credito_15,credito_30,credito_45,credito_60,credito_90"'],
      showErrorMessage: true,
      errorTitle: 'Condición inválida',
      error: 'Seleccione una condición de pago válida',
    }
    // Estado
    ws.getCell(`I${row}`).dataValidation = {
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
    ['RUC Proveedor', 'Sí', 'RUC de 11 dígitos. El proveedor debe existir en el sistema.'],
    ['Proveedor', 'No', 'Nombre del proveedor (referencia, no se usa para importar).'],
    ['N° Factura', 'No', 'Número del comprobante (ej: F001-00456).'],
    ['Monto', 'Sí', 'Monto total de la factura. Usar punto como decimal.'],
    ['Moneda', 'Sí', 'PEN (soles) o USD (dólares). Por defecto: PEN.'],
    ['Fecha Recepción', 'Sí', 'Formato: DD/MM/YYYY (ej: 15/01/2026).'],
    ['Fecha Vencimiento', 'Sí', 'Formato: DD/MM/YYYY. Debe ser posterior a la recepción.'],
    ['Condición Pago', 'No', 'contado, credito_15, credito_30, credito_45, credito_60, credito_90'],
    ['Estado', 'No', 'pendiente (defecto), parcial, pagada, vencida, anulada'],
    ['Código Proyecto', 'No', 'Código del proyecto (ej: PRY-001). Debe existir en el sistema.'],
    ['Observaciones', 'No', 'Texto libre.'],
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
  link.download = 'Plantilla_CuentasPorPagar.xlsx'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================
// EXPORTAR TABLA A EXCEL
// ============================================
export async function exportarCxPAExcel(items: CxPExportRow[]) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  const ws = wb.addWorksheet('Cuentas por Pagar')
  ws.columns = [
    { header: 'N° Factura', key: 'factura', width: 18 },
    { header: 'Proveedor', key: 'proveedor', width: 30 },
    { header: 'RUC', key: 'ruc', width: 15 },
    { header: 'Proyecto', key: 'proyecto', width: 15 },
    { header: 'OC', key: 'oc', width: 15 },
    { header: 'Monto', key: 'monto', width: 14 },
    { header: 'Moneda', key: 'moneda', width: 10 },
    { header: 'Pagado', key: 'pagado', width: 14 },
    { header: 'Saldo', key: 'saldo', width: 14 },
    { header: 'Fecha Recepción', key: 'fechaRecepcion', width: 16 },
    { header: 'Fecha Vencimiento', key: 'fechaVencimiento', width: 16 },
    { header: 'Condición Pago', key: 'condicionPago', width: 16 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Observaciones', key: 'observaciones', width: 30 },
  ]

  ws.getRow(1).font = { bold: true }
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF3F4F6' } }

  for (const item of items) {
    ws.addRow({
      factura: item.numeroFactura || '',
      proveedor: item.proveedor?.nombre || '',
      ruc: item.proveedor?.ruc || '',
      proyecto: item.proyecto?.codigo || '',
      oc: item.ordenCompra?.numero || '',
      monto: item.monto,
      moneda: item.moneda,
      pagado: item.montoPagado,
      saldo: item.saldoPendiente,
      fechaRecepcion: formatDateExcel(item.fechaRecepcion),
      fechaVencimiento: formatDateExcel(item.fechaVencimiento),
      condicionPago: item.condicionPago,
      estado: item.estado,
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
  link.download = `CuentasPorPagar_${new Date().toISOString().split('T')[0]}.xlsx`
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

  // Si ya es Date
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
