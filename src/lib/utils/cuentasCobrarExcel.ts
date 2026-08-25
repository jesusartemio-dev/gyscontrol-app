import { normalizeStr } from '@/lib/utils'
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
  cliente?: { nombre: string; ruc: string | null; diasPagoProgramados?: number[] | null }
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

interface CxCAdminPagoRow {
  monto: number
  fechaPago: string
  medioPago: string
  numeroOperacion: string | null
  observaciones: string | null
  esDetraccion?: boolean
  detraccionPorcentaje?: number | null
  detraccionMonto?: number | null
  detraccionFechaPago?: string | null
  numeroConstanciaBN?: string | null
  esRetencion?: boolean
  retencionPorcentaje?: number | null
  retencionMonto?: number | null
  retencionNumeroConstancia?: string | null
  cuentaBancaria?: { nombreBanco: string; numeroCuenta: string } | null
  anulado?: boolean
}

export interface CxCAdminExportRow extends CxCExportRow {
  tipoCambio?: number | null
  diasCredito?: number | null
  condicionPago?: string | null
  formaPago?: string | null
  bancoFinanciera?: string | null
  fechaRecepcion?: string | null
  ordenCompraCliente?: string | null
  numeroNegociacion?: string | null
  pagos?: CxCAdminPagoRow[]
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
    proyectoPorCodigo.set(normalizeStr(p.codigo), p)
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
// EXPORTAR FORMATO ADMINISTRACIÓN (33 columnas)
// ============================================
export async function exportarCxCFormatoAdmin(items: CxCAdminExportRow[]) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('CxC Administración')

  // Fila 1-3: cabecera con grupos (Detracción, Retención, Estado Pago)
  // Fila 4: nombres de columna individual
  // Datos comienzan en fila 5

  const HEADER_FILL_PRIMARY = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1E3A8A' } }
  const HEADER_FILL_GROUP = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF2563EB' } }
  const HEADER_FONT_WHITE = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  const HEADER_FONT_RED = { bold: true, color: { argb: 'FFFCA5A5' }, size: 11 }

  // Anchos de columna
  const colWidths = [
    6,   // A Nro.
    13,  // B Fecha Emisión
    13,  // C Fecha Recepción
    10,  // D Crédito (Días)
    13,  // E Fecha Vencimiento
    14,  // F Fecha Estimada Pago
    14,  // G Nro. Comprobante
    13,  // H RUC
    35,  // I Razón Social
    16,  // J Orden de Compra
    40,  // K Servicio
    14,  // L Base Imponible
    12,  // M IGV
    16,  // N Importe Total
    10,  // O Tipo de Cambio
    12,  // P Detracción Fecha
    14,  // Q Detracción Nro. Constancia
    14,  // R Detracción Monto
    8,   // S Detracción %
    12,  // T Retención Fecha
    14,  // U Retención Nro. Comprobante
    14,  // V Retención Monto Pagado
    8,   // W Retención %
    14,  // X Total Soles
    14,  // Y Total Dólares
    18,  // Z Por Vencer/Días Vencidos
    10,  // AA Negociado
    18,  // AB Banco/Financiera
    14,  // AC Nro. Negociación
    16,  // AD Banco (Desembolso)
    14,  // AE Nro. Operación
    13,  // AF Fecha Depósito
    30,  // AG Comentarios
  ]
  ws.columns = colWidths.map(w => ({ width: w }))

  // ===== Fila 1-3: cabecera con grupos =====
  // Las columnas simples ocupan filas 1-4 (merge vertical), los grupos tienen header en filas 1-2 y subhead en 3-4
  ws.getCell('A1').value = 'Nro.'
  ws.getCell('B1').value = 'Fecha\nEmisión'
  ws.getCell('C1').value = 'Fecha\nRecepción'
  ws.getCell('D1').value = 'Crédito\n(Días)'
  ws.getCell('E1').value = 'Fecha\nVencimiento'
  ws.getCell('F1').value = 'Fecha Estimada\nde Pago'
  ws.getCell('G1').value = 'Nro.\nComprobante'
  ws.getCell('H1').value = 'RUC'
  ws.getCell('I1').value = 'Razón Social'
  ws.getCell('J1').value = 'Orden de Compra'
  ws.getCell('K1').value = 'Servicio'
  ws.getCell('L1').value = 'Base Imponible'
  ws.getCell('M1').value = 'IGV'
  ws.getCell('N1').value = 'Importe Total\ndel Comprobante'
  ws.getCell('O1').value = 'Tipo de\nCambio'

  // Merge celdas simples A1:A4, B1:B4...O1:O4
  for (const col of ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O']) {
    ws.mergeCells(`${col}1:${col}4`)
  }

  // Grupo Detracción: P1:S2 + subheaders P3:S3
  ws.mergeCells('P1:S2')
  ws.getCell('P1').value = 'Detracción'
  ws.getCell('P3').value = 'Fecha'
  ws.getCell('Q3').value = 'Nro. de\nConstancia'
  ws.getCell('R3').value = 'Monto Depositado'
  ws.getCell('S3').value = '%'
  // Merge subheaders P3:P4, etc.
  for (const col of ['P', 'Q', 'R', 'S']) {
    ws.mergeCells(`${col}3:${col}4`)
  }

  // Grupo Retención: T1:W2 + subheaders T3:W3
  ws.mergeCells('T1:W2')
  ws.getCell('T1').value = 'Retención'
  ws.getCell('T3').value = 'Fecha'
  ws.getCell('U3').value = 'Nro.\nComprobante'
  ws.getCell('V3').value = 'Monto Pagado'
  ws.getCell('W3').value = '%'
  for (const col of ['T', 'U', 'V', 'W']) {
    ws.mergeCells(`${col}3:${col}4`)
  }

  // Total Soles / Dólares: X1:X4, Y1:Y4
  ws.getCell('X1').value = 'Total\nSoles'
  ws.getCell('Y1').value = 'Total\nDólares'
  ws.mergeCells('X1:X4')
  ws.mergeCells('Y1:Y4')

  // Grupo Estado Pago del Comprobante: Z1:AG2 + subheaders Z3:AG3
  ws.mergeCells('Z1:AG2')
  ws.getCell('Z1').value = 'Estado Pago del Comprobante'
  ws.getCell('Z3').value = 'Por Vencer/\nDías Vencidos'
  ws.getCell('AA3').value = 'Negociado'
  ws.getCell('AB3').value = 'Banco /\nFinanciera'
  ws.getCell('AC3').value = 'Nro.\nNegociación'
  ws.getCell('AD3').value = 'Banco\n(Desembolso)'
  ws.getCell('AE3').value = 'Nro. Operación'
  ws.getCell('AF3').value = 'Fecha\nDepósito'
  ws.getCell('AG3').value = 'Comentarios'
  for (const col of ['Z', 'AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG']) {
    ws.mergeCells(`${col}3:${col}4`)
  }

  // Estilo cabecera (filas 1-4)
  for (let row = 1; row <= 4; row++) {
    const r = ws.getRow(row)
    r.eachCell({ includeEmpty: false }, (cell) => {
      cell.fill = HEADER_FILL_PRIMARY
      cell.font = HEADER_FONT_WHITE
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        left: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      }
    })
  }

  // Cabeceras en rojo (campos calculados/fiscales): F, L, M
  for (const cell of ['F1', 'L1', 'M1']) {
    ws.getCell(cell).font = HEADER_FONT_RED
  }
  // Cabeceras grupo (Detracción, Retención, Estado Pago) en color distinto
  for (const cell of ['P1', 'T1', 'Z1']) {
    ws.getCell(cell).fill = HEADER_FILL_GROUP
  }

  ws.getRow(1).height = 22
  ws.getRow(2).height = 22
  ws.getRow(3).height = 28
  ws.getRow(4).height = 4 // fila pequeña separadora (parte del merge)

  // ===== Datos =====
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  let dataRow = 5
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const fechaEmision = item.fechaEmision ? new Date(item.fechaEmision) : null
    const fechaRecepcion = item.fechaRecepcion ? new Date(item.fechaRecepcion) : null
    const fechaVencimiento = item.fechaVencimiento ? new Date(item.fechaVencimiento) : null

    // Fecha estimada de pago: prioriza fechaRecepcion + diasCredito (real); si no hay
    // recepción, usa emisión; redondea al próximo día de pago fijo del cliente si aplica.
    const fechaEstimada = calcularFechaEstimadaPagoDesde(
      item.fechaRecepcion, item.fechaEmision, item.diasCredito, item.cliente?.diasPagoProgramados
    )

    // Base Imponible / IGV (asume IGV 18% — Perú estándar)
    const IGV_RATE = 0.18
    const baseImponible = item.monto / (1 + IGV_RATE)
    const igv = item.monto - baseImponible

    // Total Soles / Total Dólares
    let totalSoles: number | null = null
    let totalDolares: number | null = null
    if (item.moneda === 'PEN') {
      totalSoles = item.monto
      if (item.tipoCambio && item.tipoCambio > 0) totalDolares = item.monto / item.tipoCambio
    } else if (item.moneda === 'USD') {
      totalDolares = item.monto
      if (item.tipoCambio && item.tipoCambio > 0) totalSoles = item.monto * item.tipoCambio
    }

    // Por Vencer / Días Vencidos
    let porVencer = ''
    if (item.estado === 'pagada') {
      porVencer = 'Pagada'
    } else if (item.estado === 'anulada') {
      porVencer = 'Anulada'
    } else if (fechaVencimiento) {
      const diff = Math.floor((fechaVencimiento.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (diff > 0) porVencer = `${diff} días por vencer`
      else if (diff < 0) porVencer = `${Math.abs(diff)} días vencidos`
      else porVencer = 'Vence hoy'
    }

    // Negociado: SI si bancoFinanciera o formaPago=factura_negociable
    const negociado = (item.bancoFinanciera || item.formaPago === 'factura_negociable') ? 'SI' : 'NO'

    // Detracción: tomar la primera detracción registrada (esDetraccion=true), sin contar anuladas
    const detraccion = item.pagos?.find(p => p.esDetraccion && !p.anulado)

    // Retención: tomar la primera retención (esRetencion=true), sin contar anuladas
    const retencion = item.pagos?.find(p => p.esRetencion && !p.anulado)

    // Pagos comerciales (cobros netos, sin detracción ni retención, sin contar anulados)
    const pagoCobro = item.pagos?.find(p => !p.esDetraccion && !p.esRetencion && !p.anulado)

    const row = ws.getRow(dataRow)
    row.getCell(1).value = i + 1                                                      // A
    row.getCell(2).value = fechaEmision                                               // B
    row.getCell(3).value = fechaRecepcion                                             // C
    row.getCell(4).value = item.diasCredito ?? null                                   // D
    row.getCell(5).value = fechaVencimiento                                           // E
    row.getCell(6).value = fechaEstimada                                              // F
    row.getCell(7).value = item.numeroDocumento ?? ''                                 // G
    row.getCell(8).value = item.cliente?.ruc ?? ''                                    // H
    row.getCell(9).value = item.cliente?.nombre ?? ''                                 // I
    row.getCell(10).value = item.ordenCompraCliente ?? ''                             // J
    row.getCell(11).value = item.descripcion ?? item.valorizacion?.codigo ?? ''       // K
    row.getCell(12).value = baseImponible                                             // L
    row.getCell(13).value = igv                                                       // M
    row.getCell(14).value = item.monto                                                // N
    row.getCell(15).value = item.tipoCambio ?? null                                   // O

    // Detracción
    row.getCell(16).value = detraccion?.detraccionFechaPago ? new Date(detraccion.detraccionFechaPago) : null  // P
    row.getCell(17).value = detraccion?.numeroConstanciaBN ?? ''                      // Q
    // SUNAT RS 183-2004: detracción sin decimales — se redondea también para registros históricos
    const rawDetMonto = detraccion?.detraccionMonto ?? detraccion?.monto ?? null
    row.getCell(18).value = rawDetMonto != null ? Math.round(rawDetMonto) : null  // R
    row.getCell(19).value = detraccion?.detraccionPorcentaje != null ? detraccion.detraccionPorcentaje / 100 : null // S (formato %)

    // Retención
    row.getCell(20).value = retencion?.fechaPago ? new Date(retencion.fechaPago) : null  // T
    row.getCell(21).value = retencion?.retencionNumeroConstancia ?? ''                   // U
    row.getCell(22).value = retencion?.retencionMonto ?? retencion?.monto ?? null        // V
    row.getCell(23).value = retencion?.retencionPorcentaje != null ? retencion.retencionPorcentaje / 100 : null // W

    // Totales
    row.getCell(24).value = totalSoles                                                // X
    row.getCell(25).value = totalDolares                                              // Y

    // Estado Pago
    row.getCell(26).value = porVencer                                                 // Z
    row.getCell(27).value = negociado                                                 // AA
    row.getCell(28).value = item.bancoFinanciera ?? ''                                // AB
    row.getCell(29).value = item.numeroNegociacion ?? ''                              // AC
    row.getCell(30).value = pagoCobro?.cuentaBancaria?.nombreBanco ?? ''              // AD
    row.getCell(31).value = pagoCobro?.numeroOperacion ?? ''                          // AE
    row.getCell(32).value = pagoCobro?.fechaPago ? new Date(pagoCobro.fechaPago) : null // AF
    row.getCell(33).value = item.observaciones ?? ''                                  // AG

    // Bordes
    for (let c = 1; c <= 33; c++) {
      row.getCell(c).border = {
        top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
      }
    }

    dataRow++
  }

  // ===== Formatos numéricos =====
  const lastRow = dataRow - 1
  if (lastRow >= 5) {
    // Fechas (B, C, E, F, P, T, AF) — DD-MM-YY
    for (const col of ['B', 'C', 'E', 'F', 'P', 'T', 'AF']) {
      for (let r = 5; r <= lastRow; r++) {
        ws.getCell(`${col}${r}`).numFmt = 'dd-mm-yy'
      }
    }
    // Montos con 2 decimales (L, M, N, V, X, Y)
    for (const col of ['L', 'M', 'N', 'V', 'X', 'Y']) {
      for (let r = 5; r <= lastRow; r++) {
        ws.getCell(`${col}${r}`).numFmt = '#,##0.00'
      }
    }
    // Detracción (R): entero sin decimales — SUNAT RS 183-2004
    for (let r = 5; r <= lastRow; r++) {
      ws.getCell(`R${r}`).numFmt = '#,##0'
    }
    // Tipo de cambio (O) — 3 decimales
    for (let r = 5; r <= lastRow; r++) {
      ws.getCell(`O${r}`).numFmt = '0.000'
    }
    // Porcentajes (S, W)
    for (const col of ['S', 'W']) {
      for (let r = 5; r <= lastRow; r++) {
        ws.getCell(`${col}${r}`).numFmt = '0%'
      }
    }
    // Días crédito (D) — entero
    for (let r = 5; r <= lastRow; r++) {
      ws.getCell(`D${r}`).numFmt = '0'
    }
  }

  // Freeze header (panes congelados después de fila 4)
  ws.views = [{ state: 'frozen', ySplit: 4 }]

  // Descargar
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `CuentasPorCobrar_Admin_${new Date().toISOString().split('T')[0]}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================
// TIPOS ENRIQUECIDOS (para exports Contable y Financiero)
// ============================================

/** Datos de factoring/negociación provenientes de CobroValorizacion */
export interface CxCCobroData {
  tipo: string
  financiera: string | null
  tasaDescuentoPct: number | null      // almacenado como 1.38 = 1.38%
  fechaDesembolso: string | null
  numeroOperacion: string | null
  excedenteMonto: number | null        // "Retenido" por la financiera
  valorAFinanciar: number | null
  interesMonto: number | null
  comisionEstructuracion: number | null
  gastosAdicionales: number | null
  montoADesembolsar: number | null     // "Monto Neto Financiero" = lo que recibe GYS
  adelantoBanpro: number | null        // monto del adelanto ya girado
  saldoAGirar: number | null           // = montoADesembolsar - adelantoBanpro
  numeroFacturaInteres: string | null  // N° factura financiera por el interés
  numeroFacturaGastos: string | null   // N° factura financiera por comisión/gastos
  /** "Cobros esperados" del factoring — de acá sale la fecha real de Saldo/Retenido. */
  abonos?: Array<{
    tipo: string | null // 'adelanto' | 'saldo_girar' | 'detraccion' | 'excedente'
    estado: string      // 'pendiente' | 'recibido'
    fechaReal: string | null
  }>
  [key: string]: unknown               // permite campos extra del modelo Prisma
}

/** Fila enriquecida con CobroValorizacion — usada en exports Contable y Financiero */
export interface CxCRichRow {
  id?: string
  numeroDocumento: string | null
  descripcion: string | null
  monto: number
  moneda: string
  tipoCambio?: number | null
  montoPagado: number
  saldoPendiente: number
  fechaEmision: string
  fechaRecepcion?: string | null
  fechaVencimiento: string
  condicionPago?: string | null
  formaPago?: string | null
  diasCredito?: number | null
  bancoFinanciera?: string | null
  ordenCompraCliente?: string | null
  numeroHES?: string | null
  numeroGuiaRemision?: string | null
  numeroNegociacion?: string | null
  estado: string
  observaciones: string | null
  cliente?: { nombre: string; ruc: string | null; diasPagoProgramados?: number[] | null } | null
  proyecto?: { codigo: string; nombre: string } | null
  valorizacion?: {
    codigo: string
    cobro?: CxCCobroData | null
  } | null
  pagos?: Array<{
    monto: number
    fechaPago: string
    medioPago: string
    numeroOperacion: string | null
    observaciones: string | null
    esDetraccion?: boolean
    detraccionPorcentaje?: number | null
    detraccionMonto?: number | null
    detraccionFechaPago?: string | null
    numeroConstanciaBN?: string | null
    esRetencion?: boolean
    retencionPorcentaje?: number | null
    retencionMonto?: number | null
    retencionNumeroConstancia?: string | null
    cuentaBancaria?: { nombreBanco: string; numeroCuenta: string } | null
    anulado?: boolean
  }>
}

// ============================================
// HELPERS PUROS (lógica de negocio aislada)
// ============================================

/**
 * Monto Neto Contable = monto factura - total detracciones - total retenciones.
 * SUPUESTO: representa el neto real a cobrar descontando los importes que SUNAT/cliente
 * retienen. Confirmar con administración si esta es la definición correcta.
 */
export function calcularMontoNetoContable(cxc: CxCRichRow): number {
  const totalDetraccion = cxc.pagos
    ?.filter(p => p.esDetraccion && !p.anulado)
    .reduce((s, p) => s + (p.detraccionMonto ?? p.monto), 0) ?? 0
  const totalRetencion = cxc.pagos
    ?.filter(p => p.esRetencion && !p.anulado)
    .reduce((s, p) => s + (p.retencionMonto ?? p.monto), 0) ?? 0
  return cxc.monto - totalDetraccion - totalRetencion
}

/** Fecha del último PagoCobro (pagos ya ordenados desc por fechaPago desde la API). */
export function obtenerFechaUltimoPago(cxc: CxCRichRow): Date | null {
  const pagosNetos = cxc.pagos?.filter(p => !p.esDetraccion && !p.esRetencion && !p.anulado)
  if (!pagosNetos?.length) return null
  const raw = pagosNetos[0].fechaPago
  const d = new Date(raw)
  return isNaN(d.getTime()) ? null : d
}

/**
 * Redondea `fecha` hacia adelante al primer día del mes que aparezca en `diasPago`
 * (ej. [7, 22]) — si ninguno de este mes alcanza, pasa al primero del mes siguiente.
 * Clampea al último día del mes si el día programado no existe en ese mes (ej. 31 en febrero).
 */
/**
 * Si `fecha` cae sábado o domingo, la corre al lunes siguiente. No contempla
 * feriados — solo fin de semana, que es lo que pidió Administración
 * explícitamente (ej. el cliente paga el 7 y 22, pero si cae sábado/domingo
 * el pago real se corre al día hábil siguiente).
 */
function siguienteDiaHabil(fecha: Date): Date {
  const diaSemana = fecha.getDay() // 0 = domingo, 6 = sábado
  if (diaSemana === 6) return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 2)
  if (diaSemana === 0) return new Date(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + 1)
  return fecha
}

function proximoDiaDePago(fecha: Date, diasPago: number[]): Date {
  const dias = [...diasPago].sort((a, b) => a - b)
  const year = fecha.getFullYear()
  const month = fecha.getMonth()
  const day = fecha.getDate()

  const clamp = (y: number, m: number, d: number) => {
    const ultimoDiaMes = new Date(y, m + 1, 0).getDate()
    return new Date(y, m, Math.min(d, ultimoDiaMes))
  }

  const candidatoEsteMes = dias.find(d => d >= day)
  const resultado = candidatoEsteMes != null
    ? clamp(year, month, candidatoEsteMes)
    : clamp(year, month + 1, dias[0])
  return siguienteDiaHabil(resultado)
}

/**
 * Fecha estimada de pago: base (recepción o emisión) + días crédito, redondeada
 * hacia adelante al próximo día de pago fijo del cliente si lo tiene configurado
 * (ej. Nexa paga los 7 y 22 de cada mes — ver Cliente.diasPagoProgramados). Si
 * ese día cae sábado o domingo, se corre al lunes siguiente (ver
 * siguienteDiaHabil) — no contempla feriados.
 * Función pura (sin dependencias del DOM) para poder reutilizarla también en la
 * pantalla de detalle de CxC.
 */
export function calcularFechaEstimadaPagoDesde(
  fechaRecepcion: string | null | undefined,
  fechaEmision: string | null | undefined,
  diasCredito: number | null | undefined,
  diasPagoProgramados?: number[] | null,
): Date | null {
  const base = fechaRecepcion ?? fechaEmision
  if (!base || !diasCredito) return null
  const d = new Date(base)
  if (isNaN(d.getTime())) return null
  d.setDate(d.getDate() + diasCredito)
  if (diasPagoProgramados && diasPagoProgramados.length > 0) {
    return proximoDiaDePago(d, diasPagoProgramados)
  }
  return d
}

function calcularFechaEstimadaPago(cxc: CxCRichRow): Date | null {
  return calcularFechaEstimadaPagoDesde(cxc.fechaRecepcion, cxc.fechaEmision, cxc.diasCredito, cxc.cliente?.diasPagoProgramados)
}

/** "Servicio" si hay HES, "Bien" si hay guía de remisión, "" si ninguno. */
function calcularClasificacion(cxc: CxCRichRow): string {
  if (cxc.numeroHES) return 'Servicio'
  if (cxc.numeroGuiaRemision) return 'Bien'
  return ''
}

/** "SI" si hay CobroValorizacion o numeroNegociacion; "NO" en caso contrario. */
function calcularNegociado(cxc: CxCRichRow): string {
  return (cxc.valorizacion?.cobro || cxc.numeroNegociacion) ? 'SI' : 'NO'
}

/**
 * Texto de días por vencer / vencidos — misma lógica que exportarCxCFormatoAdmin.
 * Reutilizado en ambos exports nuevos.
 */
function calcularDiasPorVencer(cxc: CxCRichRow, today: Date): string {
  if (cxc.estado === 'pagada') return 'Pagada'
  if (cxc.estado === 'anulada') return 'Anulada'
  const venc = cxc.fechaVencimiento ? new Date(cxc.fechaVencimiento) : null
  if (!venc || isNaN(venc.getTime())) return ''
  const diff = Math.floor((venc.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  if (diff > 0) return `${diff} días por vencer`
  if (diff < 0) return `${Math.abs(diff)} días vencidos`
  return 'Vence hoy'
}

/**
 * Entidad Financiera para el reporte Financiero.
 * Prioriza CobroValorizacion.financiera; fallback a CxC.bancoFinanciera.
 */
function obtenerEntidadFinanciera(cxc: CxCRichRow): string {
  return cxc.valorizacion?.cobro?.financiera ?? cxc.bancoFinanciera ?? ''
}

/**
 * Suma de los PagoCobro que NO son detracción ni retención (efectivo real recibido).
 * Relación: calcularCobradoEfectivo(cxc) + Σdetrac + Σretenc = cxc.montoPagado
 */
export function calcularCobradoEfectivo(cxc: CxCRichRow): number {
  return cxc.pagos
    ?.filter(p => !p.esDetraccion && !p.esRetencion && !p.anulado)
    .reduce((s, p) => s + p.monto, 0) ?? 0
}

/**
 * Monto de DETRACCIÓN convertido a soles (PEN) para mostrar en el reporte Contable.
 *
 * SUPUESTO DE MONEDA: los PagoCobro no tienen campo moneda propio; se registran en
 * la misma moneda que la CxC padre (el cálculo "monto × %det" se aplica al monto de
 * la factura en su moneda original). Por lo tanto:
 *   - Factura PEN → detracción ya está en soles.
 *   - Factura USD → detracción está en USD; se convierte × tipoCambio (PEN/USD).
 * Si la factura es USD y no hay tipoCambio registrado, se devuelve el monto original
 * sin convertir (el valor vendrá en USD pero es lo mejor que podemos mostrar).
 */
export function detraccionEnSoles(cxc: CxCRichRow): number | null {
  const pago = cxc.pagos?.find(p => p.esDetraccion && !p.anulado) ?? null
  if (!pago) return null
  const monto = pago.detraccionMonto ?? pago.monto
  // SUNAT RS 183-2004: depósito de detracciones siempre en enteros (sin decimales)
  if (cxc.moneda === 'PEN') return Math.round(monto)
  if (cxc.moneda === 'USD' && cxc.tipoCambio) {
    return Math.round(monto * cxc.tipoCambio)
  }
  return Math.round(monto) // fallback
}

/**
 * Monto de RETENCIÓN convertido a soles (PEN). Mismo criterio que detraccionEnSoles.
 */
export function retencionEnSoles(cxc: CxCRichRow): number | null {
  const pago = cxc.pagos?.find(p => p.esRetencion && !p.anulado) ?? null
  if (!pago) return null
  const monto = pago.retencionMonto ?? pago.monto
  if (cxc.moneda === 'PEN') return monto
  if (cxc.moneda === 'USD' && cxc.tipoCambio) {
    return Math.round(monto * cxc.tipoCambio * 100) / 100
  }
  return monto // fallback: sin tipo de cambio disponible
}

/**
 * Base Imponible / IGV a partir del monto total del comprobante.
 * SUPUESTO: IGV 18% sobre el 100% del monto (mismo supuesto que exportarCxCFormatoAdmin).
 * No aplica a facturas exoneradas, de exportación (0%) o con otra tasa — confirmar con
 * Administración si hace falta un caso especial.
 */
export function calcularBaseImponibleIGV(monto: number, igvRate = 0.18): { baseImponible: number; igv: number } {
  const baseImponible = monto / (1 + igvRate)
  return { baseImponible, igv: monto - baseImponible }
}

/**
 * Convierte `monto` de `monedaOrigen` a `monedaDestino` usando el TC SUNAT venta
 * (USD->PEN) de la fecha de la factura. Si ya está en la moneda destino, lo
 * devuelve tal cual (sin tocarlo) — así lo pidió Administración explícitamente
 * para el caso "factura en soles, reporte en soles". Si falta la tasa (fecha sin
 * cotización o falla la consulta), devuelve null — el llamador lo deja en blanco.
 */
export function convertirMonedaSunat(
  monto: number,
  monedaOrigen: string,
  monedaDestino: 'USD' | 'PEN',
  tasaVenta: number | null | undefined,
): number | null {
  if (monedaOrigen === monedaDestino) return monto
  if (tasaVenta == null || tasaVenta <= 0) return null
  if (monedaOrigen === 'PEN' && monedaDestino === 'USD') return monto / tasaVenta
  if (monedaOrigen === 'USD' && monedaDestino === 'PEN') return monto * tasaVenta
  return null // combinación de monedas no soportada (solo PEN/USD)
}

/**
 * Detracción + Retención combinadas, en dólares.
 *
 * Solo se calcula para facturas en USD, donde el monto ya está guardado en la moneda
 * de la factura (no hace falta convertir). Para facturas en PEN devuelve null —
 * convertir a USD requiere un tipo de cambio confiable por factura, que hoy no está
 * garantizado (ver detraccionEnSoles/retencionEnSoles); pendiente de definir con
 * Administración antes de completar este caso.
 */
export function detraccionMasRetencionUSD(cxc: CxCRichRow): number | null {
  const detraccion = cxc.pagos?.find(p => p.esDetraccion && !p.anulado) ?? null
  const retencion  = cxc.pagos?.find(p => p.esRetencion && !p.anulado)  ?? null
  if (!detraccion && !retencion) return null
  if (cxc.moneda !== 'USD') return null // pendiente: definir TC con Administración
  const detMonto = detraccion ? (detraccion.detraccionMonto ?? detraccion.monto) : 0
  const retMonto = retencion  ? (retencion.retencionMonto  ?? retencion.monto)  : 0
  return Math.round((detMonto + retMonto) * 100) / 100
}

// Constantes de estilo compartidas (misma paleta que exportarCxCFormatoAdmin)
const HDR_FILL_PRIMARY = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1E3A8A' } }
const HDR_FILL_GROUP   = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF2563EB' } }
const HDR_FONT_WHITE   = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
const BORDER_DATA      = {
  top:    { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
  bottom: { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
  left:   { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
  right:  { style: 'thin' as const, color: { argb: 'FFE5E7EB' } },
}
const ALIGN_CENTER = { vertical: 'middle' as const, horizontal: 'center' as const, wrapText: true }
const ALIGN_LEFT   = { vertical: 'middle' as const, horizontal: 'left' as const }
const FMT_MONEY    = '#,##0.00'
const FMT_DATE     = 'dd/mm/yyyy'
const FMT_RATE     = '0.00%'   // tasaDescuentoPct almacenada como 1.38 → /100 → 0.0138 → "1.38%"
const FMT_INT      = '0'

/** Aplica estilo de cabecera a todas las celdas de las filas 1..nRows de ws. */
function applyHeaderStyle(ws: any, nRows: number, fillGroup?: string[]): void {
  for (let r = 1; r <= nRows; r++) {
    ws.getRow(r).eachCell({ includeEmpty: false }, (cell: any) => {
      cell.fill = HDR_FILL_PRIMARY
      cell.font = HDR_FONT_WHITE
      cell.alignment = ALIGN_CENTER
      cell.border = {
        top:    { style: 'thin', color: { argb: 'FFFFFFFF' } },
        bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
        left:   { style: 'thin', color: { argb: 'FFFFFFFF' } },
        right:  { style: 'thin', color: { argb: 'FFFFFFFF' } },
      }
    })
  }
  if (fillGroup) {
    for (const ref of fillGroup) ws.getCell(ref).fill = HDR_FILL_GROUP
  }
}

/** Aplica bordes finos a una celda de datos. */
function setBorderData(cell: any): void {
  cell.border = BORDER_DATA
}

/**
 * Hoja de referencia simple para CxC anuladas — solo consulta/auditoría, sin
 * fórmulas de totales, para que no se sumen dos veces montos ya anulados
 * (usada por exportarCxCContable y exportarCxCFinanciero). No incluye desglose
 * financiero (detracción, factoring, etc.) a propósito: si se necesita el
 * detalle completo de una CxC anulada, se revisa su ficha en el sistema.
 */
function agregarHojaAnuladas(wb: any, anuladas: CxCRichRow[]): void {
  if (anuladas.length === 0) return
  const ws = wb.addWorksheet('CxC Anuladas')
  const encabezados = ['N° Documento', 'Cliente', 'RUC', 'Proyecto', 'Valorización', 'Monto', 'Moneda', 'Fecha Emisión', 'Descripción']
  const anchos = [16, 35, 14, 14, 16, 14, 8, 12, 40]
  ws.columns = anchos.map(w => ({ width: w }))

  const hdr = ws.getRow(1)
  encabezados.forEach((h, i) => {
    const cell = hdr.getCell(i + 1)
    cell.value = h
    cell.fill = HDR_FILL_PRIMARY
    cell.font = HDR_FONT_WHITE
    cell.alignment = ALIGN_CENTER
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFFFFFFF' } }, bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } },
      left: { style: 'thin', color: { argb: 'FFFFFFFF' } }, right: { style: 'thin', color: { argb: 'FFFFFFFF' } },
    }
  })
  hdr.height = 24

  let r = 2
  for (const cxc of anuladas) {
    const row = ws.getRow(r)
    const cells: [number, any, string?][] = [
      [1, cxc.numeroDocumento ?? ''],
      [2, cxc.cliente?.nombre ?? ''],
      [3, cxc.cliente?.ruc ?? ''],
      [4, cxc.proyecto?.codigo ?? ''],
      [5, cxc.valorizacion?.codigo ?? ''],
      [6, cxc.monto, FMT_MONEY],
      [7, cxc.moneda],
      [8, cxc.fechaEmision ? new Date(cxc.fechaEmision) : null, FMT_DATE],
      [9, cxc.descripcion ?? ''],
    ]
    for (const [col, val, fmt] of cells) {
      const cell = row.getCell(col)
      cell.value = val ?? null
      if (fmt) cell.numFmt = fmt
      setBorderData(cell)
    }
    for (const col of [1, 2, 3, 4, 5, 7, 9]) row.getCell(col).alignment = ALIGN_LEFT
    r++
  }

  ws.views = [{ state: 'frozen', ySplit: 1 }]
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: encabezados.length } }
}

/** Descarga el buffer como .xlsx en el browser (mismo patrón que los exports existentes). */
async function downloadBuffer(buffer: ArrayBuffer | Uint8Array, filename: string): Promise<void> {
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================
// EXPORTAR FORMATO CONTABLE (27 columnas, 2 filas de cabecera + hoja Detalle)
// ============================================
/**
 * Genera el reporte Contable de CxC — libro con dos hojas:
 *
 * Hoja 1 "CxC Contable" (27 col):
 *   A–U: columnas individuales (merge vertical fila 1+2)
 *   V–X: Grupo Detracción (Nro. Constancia | Monto (S/) | Fecha)
 *   Y–AA: Grupo Retención  (Nro. Retención  | Monto (S/) | Fecha)
 *
 *   • Base Imponible / IGV → calculados sobre Monto Factura (asume IGV 18%, ver calcularBaseImponibleIGV)
 *   • Monto Neto  = monto − detracción − retención (en moneda de factura)
 *   • Cobrado     = Σ PagoCobro sin detrac/retenc (efectivo recibido, moneda factura)
 *   • Detracción/Retención (US$) → combinada, solo para facturas en USD (ver detraccionMasRetencionUSD)
 *   • Pagado      = montoPagado (total liquidado incl. detrac/retenc, moneda factura)
 *   • Detracción Monto (S/) / Retención Monto (S/) → siempre en soles
 *   • Totales: Base Imponible, IGV, Monto Factura, Monto Neto, Cobrado, Detracción/Retención (US$), Pagado, Saldo
 *
 * Hoja 2 "Detalle de Pagos": una fila por PagoCobro (solo CxC activas), ordenada
 * N°Doc → FechaPago asc.
 * Hoja 3 "CxC Anuladas": referencia simple de las CxC con estado='anulada' —
 * quedan fuera de la Hoja 1 y de sus Totales para no duplicar montos ya
 * anulados en la suma general (ver también exportarCxCFinanciero, mismo criterio).
 *
 * `opciones.monedaReporte` ('USD' | 'PEN'): si se indica, Base Imponible/IGV/Monto
 * Factura se muestran unificados en esa moneda (usando `opciones.tasasPorFecha`,
 * tipo de cambio SUNAT venta indexado por fecha de emisión YYYY-MM-DD — ver
 * /api/administracion/tipo-cambio-sunat). Sin este parámetro, el comportamiento
 * es el de siempre (cada factura en su propia moneda, columna Moneda visible).
 */
export async function exportarCxCContable(
  itemsSinFiltrar: CxCRichRow[],
  opciones?: { monedaReporte?: 'USD' | 'PEN'; tasasPorFecha?: Record<string, number | null> },
): Promise<void> {
  const monedaReporte = opciones?.monedaReporte
  const tasasPorFecha = opciones?.tasasPorFecha ?? {}
  const items = itemsSinFiltrar.filter(c => c.estado !== 'anulada')
  const anuladas = itemsSinFiltrar.filter(c => c.estado === 'anulada')
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('CxC Contable')

  // ── Layout: 27 columnas ───────────────────────────────────────────────────────
  // A(1)  N° Documento    B(2)  Cliente         C(3)  RUC
  // D(4)  Proyecto        E(5)  Valorización     F(6)  Base Imponible
  // G(7)  IGV             H(8)  Monto Factura    I(9)  Moneda
  // J(10) Monto Neto      K(11) Cobrado          L(12) Detracción/Retención (US$)
  // M(13) Pagado          N(14) Saldo            O(15) Fecha Emisión
  // P(16) Fecha Venc.     Q(17) Fecha Est. Pago  R(18) Fecha de Pago
  // S(19) Estado          T(20) Descripción      U(21) Clasificación
  // Grupo Detracción: V(22) Nro. Constancia | W(23) Monto (S/) | X(24) Fecha
  // Grupo Retención:  Y(25) Nro. Retención  | Z(26) Monto (S/) | AA(27) Fecha
  const colWidths = [
    16, // A  N° Documento
    35, // B  Cliente
    14, // C  RUC
    14, // D  Proyecto
    16, // E  Valorización
    14, // F  Base Imponible
    12, // G  IGV
    14, // H  Monto Factura
    8,  // I  Moneda
    14, // J  Monto Neto
    14, // K  Cobrado
    18, // L  Detracción/Retención (US$)
    14, // M  Pagado
    14, // N  Saldo
    12, // O  Fecha Emisión
    12, // P  Fecha Vencimiento
    14, // Q  Fecha Estimada de Pago
    12, // R  Fecha de Pago
    12, // S  Estado
    30, // T  Descripción
    12, // U  Clasificación
    16, // V  Detracción – Nro. Constancia
    14, // W  Detracción – Monto (S/)
    12, // X  Detracción – Fecha
    16, // Y  Retención – Nro. Retención
    14, // Z  Retención – Monto (S/)
    12, // AA Retención – Fecha
  ]
  ws.columns = colWidths.map(w => ({ width: w }))

  // ── Cabecera (2 filas) ────────────────────────────────────────────────────────
  const SOLO_COLS = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P','Q','R','S','T','U']
  const sufijoMoneda = monedaReporte ? ` (${monedaReporte})` : ''
  const SOLO_HDRS = [
    'N° Documento','Cliente','RUC','Proyecto','Valorización',
    `Base\nImponible${sufijoMoneda}`, `IGV${sufijoMoneda}`, `Monto\nFactura${sufijoMoneda}`, 'Moneda','Monto\nNeto','Cobrado',
    'Detracción/\nRetención (US$)','Pagado','Saldo',
    'Fecha\nEmisión','Fecha\nVencimiento','Fecha Estimada\nde Pago','Fecha\nde Pago',
    'Estado','Descripción','Clasificación',
  ]
  for (let i = 0; i < SOLO_COLS.length; i++) {
    ws.getCell(`${SOLO_COLS[i]}1`).value = SOLO_HDRS[i]
    ws.mergeCells(`${SOLO_COLS[i]}1:${SOLO_COLS[i]}2`)
  }

  ws.mergeCells('V1:X1'); ws.getCell('V1').value = 'Detracción'
  ws.getCell('V2').value = 'Nro. Constancia'
  ws.getCell('W2').value = 'Monto (S/)'
  ws.getCell('X2').value = 'Fecha'

  ws.mergeCells('Y1:AA1'); ws.getCell('Y1').value = 'Retención'
  ws.getCell('Y2').value = 'Nro. Retención'
  ws.getCell('Z2').value = 'Monto (S/)'
  ws.getCell('AA2').value = 'Fecha'

  applyHeaderStyle(ws, 2, ['V1', 'Y1'])
  ws.getRow(1).height = 28
  ws.getRow(2).height = 22

  // ── Datos ─────────────────────────────────────────────────────────────────────
  const DATA_START = 3
  let sinTasaCount = 0 // filas que necesitaban conversión y no encontraron TC SUNAT para su fecha

  // índices de columna para la fila de totales
  const COL_BASE    = 6  // F
  const COL_IGV     = 7  // G
  const COL_MONTO   = 8  // H
  const COL_NETO    = 10 // J
  const COL_COBRADO = 11 // K
  const COL_DETRET  = 12 // L
  const COL_PAGADO  = 13 // M
  const COL_SALDO   = 14 // N

  for (let i = 0; i < items.length; i++) {
    const cxc     = items[i]
    const rowNum  = DATA_START + i
    const row     = ws.getRow(rowNum)

    const detraccion   = cxc.pagos?.find(p => p.esDetraccion && !p.anulado) ?? null
    const retencion    = cxc.pagos?.find(p => p.esRetencion && !p.anulado)  ?? null
    const fechaEmision = cxc.fechaEmision     ? new Date(cxc.fechaEmision)     : null
    const fechaVenc    = cxc.fechaVencimiento ? new Date(cxc.fechaVencimiento) : null
    const fechaEst     = calcularFechaEstimadaPago(cxc)
    const fechaPago    = obtenerFechaUltimoPago(cxc)
    const montoNeto    = calcularMontoNetoContable(cxc)
    const cobrado      = calcularCobradoEfectivo(cxc)
    const clasificac   = calcularClasificacion(cxc)
    const detSoles     = detraccionEnSoles(cxc)
    const retSoles     = retencionEnSoles(cxc)
    const detRetUSD    = detraccionMasRetencionUSD(cxc)

    // Monto Factura / Base Imponible / IGV: en moneda original salvo que se pida
    // un reporte unificado (monedaReporte) — ahí se convierte con el TC SUNAT
    // venta de la fecha de emisión; si no hay tasa disponible, queda en blanco.
    const fechaEmisionKey = cxc.fechaEmision ? cxc.fechaEmision.slice(0, 10) : null
    const montoFactura = monedaReporte
      ? convertirMonedaSunat(cxc.monto, cxc.moneda, monedaReporte, fechaEmisionKey ? tasasPorFecha[fechaEmisionKey] : null)
      : cxc.monto
    const monedaMostrada = monedaReporte ?? cxc.moneda
    const { baseImponible, igv } = montoFactura != null
      ? calcularBaseImponibleIGV(montoFactura)
      : { baseImponible: null, igv: null }
    if (monedaReporte && cxc.moneda !== monedaReporte && montoFactura == null) sinTasaCount++

    // ── Validación de cuadre en moneda de factura ──────────────────────────────
    // montoNeto = monto − Σdetrac_fact − Σretenc_fact, por lo que la suma siempre
    // debería ser 0. Cualquier diferencia indica datos inconsistentes en BD.
    const totalDetFact = cxc.pagos?.filter(p => p.esDetraccion && !p.anulado).reduce((s, p) => s + (p.detraccionMonto ?? p.monto), 0) ?? 0
    const totalRetFact = cxc.pagos?.filter(p => p.esRetencion && !p.anulado).reduce((s, p) => s + (p.retencionMonto ?? p.monto), 0) ?? 0
    const cuadreDiff   = Math.abs(cxc.monto - (montoNeto + totalDetFact + totalRetFact))
    if (cuadreDiff >= 0.01) {
      console.warn(`[CxC Contable] Cuadre fallido para "${cxc.numeroDocumento ?? 'S/N'}": monto=${cxc.monto}, neto=${montoNeto}, detrac=${totalDetFact}, retenc=${totalRetFact}, diff=${cuadreDiff.toFixed(2)}`)
    }

    const cells: [number, any, string?][] = [
      [1,  cxc.numeroDocumento ?? ''],
      [2,  cxc.cliente?.nombre ?? ''],
      [3,  cxc.cliente?.ruc ?? ''],
      [4,  cxc.proyecto?.codigo ?? ''],
      [5,  cxc.valorizacion?.codigo ?? ''],
      [6,  baseImponible,        FMT_MONEY],
      [7,  igv,                  FMT_MONEY],
      [8,  montoFactura,         FMT_MONEY],
      [9,  monedaMostrada],
      [10, montoNeto,            FMT_MONEY],
      [11, cobrado,              FMT_MONEY],  // Cobrado: efectivo neto
      [12, detRetUSD,            FMT_MONEY],  // Detracción+Retención combinada (US$) — null si la factura es PEN
      [13, cxc.montoPagado,      FMT_MONEY],  // Pagado: total incl. detrac+retenc
      [14, cxc.saldoPendiente,   FMT_MONEY],
      [15, fechaEmision,         FMT_DATE],
      [16, fechaVenc,            FMT_DATE],
      [17, fechaEst,             FMT_DATE],
      [18, fechaPago,            FMT_DATE],
      [19, cxc.estado],
      [20, cxc.descripcion ?? ''],
      [21, clasificac],
      // Detracción
      [22, detraccion?.numeroConstanciaBN ?? ''],
      [23, detSoles,             FMT_INT],    // SUNAT: detracción sin decimales (S/)
      [24, detraccion?.detraccionFechaPago ? new Date(detraccion.detraccionFechaPago) : null, FMT_DATE],
      // Retención
      [25, retencion?.retencionNumeroConstancia ?? ''],
      [26, retSoles,             FMT_MONEY],  // Siempre en S/
      [27, retencion?.fechaPago ? new Date(retencion.fechaPago) : null, FMT_DATE],
    ]

    for (const [col, val, fmt] of cells) {
      const cell = row.getCell(col)
      cell.value = val ?? null
      if (fmt) cell.numFmt = fmt
      setBorderData(cell)
    }

    for (const col of [1, 2, 3, 4, 5, 9, 19, 20, 21, 22, 25]) {
      row.getCell(col).alignment = ALIGN_LEFT
    }
  }

  // ── Fila de Totales ──────────────────────────────────────────────────────────
  const lastData = DATA_START + items.length - 1
  const totRow   = DATA_START + items.length

  if (items.length > 0) {
    const tr = ws.getRow(totRow)
    tr.getCell(1).value = 'TOTALES'
    tr.getCell(1).font  = { bold: true }

    const notas: string[] = []
    if (monedaReporte) {
      notas.push(`Base Imponible/IGV/Monto Factura unificados en ${monedaReporte} (TC SUNAT venta por fecha de emisión) — el resto de columnas de monto sigue en la moneda original de cada factura`)
      if (sinTasaCount > 0) notas.push(`${sinTasaCount} factura(s) sin tipo de cambio disponible para su fecha — quedaron en blanco, excluidas del total`)
    } else if (items.some(x => x.moneda !== items[0].moneda)) {
      notas.push('⚠ Mix PEN/USD — totales brutos por columna')
    }
    tr.getCell(2).value = notas.join(' · ')
    tr.getCell(2).font = { italic: true, color: { argb: 'FF6B7280' }, size: 9 }

    for (const col of [COL_BASE, COL_IGV, COL_MONTO, COL_NETO, COL_COBRADO, COL_DETRET, COL_PAGADO, COL_SALDO]) {
      const colLetter = ws.getColumn(col).letter
      const cell = tr.getCell(col)
      cell.value = { formula: `SUM(${colLetter}${DATA_START}:${colLetter}${lastData})` }
      cell.numFmt = FMT_MONEY
      cell.font   = { bold: true }
      setBorderData(cell)
    }
  }

  ws.views = [{ state: 'frozen', ySplit: 2 }]
  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: 27 } }

  // ── Hoja 2: Detalle de Pagos ─────────────────────────────────────────────────
  const wsDet = wb.addWorksheet('Detalle de Pagos')
  const DET_COLS = ['N° Documento','Cliente','Proyecto','Valorización','Fecha de Pago','Tipo','Medio de Pago','Monto','Moneda','Observaciones']
  const detColWidths = [16, 35, 14, 16, 12, 14, 16, 14, 8, 40]
  wsDet.columns = detColWidths.map(w => ({ width: w }))

  // Cabecera simple (1 fila)
  const detHdrRow = wsDet.getRow(1)
  DET_COLS.forEach((h, i) => {
    const cell = detHdrRow.getCell(i + 1)
    cell.value = h
    cell.fill = HDR_FILL_PRIMARY
    cell.font = HDR_FONT_WHITE
    cell.alignment = ALIGN_CENTER
    cell.border = { top: { style: 'thin', color: { argb: 'FFFFFFFF' } }, bottom: { style: 'thin', color: { argb: 'FFFFFFFF' } }, left: { style: 'thin', color: { argb: 'FFFFFFFF' } }, right: { style: 'thin', color: { argb: 'FFFFFFFF' } } }
  })
  detHdrRow.height = 24

  // Recopilar todos los pagos y ordenar: N°Doc asc, luego fechaPago asc
  type DetallePago = {
    numeroDoc: string
    cliente: string
    proyecto: string
    valorizacion: string
    fechaPago: Date | null
    tipo: string
    medioPago: string
    monto: number
    moneda: string
    observaciones: string
  }
  const detalles: DetallePago[] = []
  for (const cxc of items) {
    if (!cxc.pagos?.length) continue
    for (const p of cxc.pagos) {
      const tipoBase = p.esDetraccion ? 'Detracción' : p.esRetencion ? 'Retención' : 'Efectivo'
      const tipo = p.anulado ? `${tipoBase} (anulado)` : tipoBase
      const fechaPagoDate = p.fechaPago ? new Date(p.fechaPago) : null
      detalles.push({
        numeroDoc:    cxc.numeroDocumento ?? '',
        cliente:      cxc.cliente?.nombre ?? '',
        proyecto:     cxc.proyecto?.codigo ?? '',
        valorizacion: cxc.valorizacion?.codigo ?? '',
        fechaPago:    fechaPagoDate,
        tipo,
        medioPago:    p.medioPago,
        monto:        p.monto,
        moneda:       cxc.moneda,
        observaciones: p.observaciones ?? '',
      })
    }
  }
  // Sort: N° Documento asc, luego fechaPago asc
  detalles.sort((a, b) => {
    const docCmp = a.numeroDoc.localeCompare(b.numeroDoc)
    if (docCmp !== 0) return docCmp
    const ta = a.fechaPago?.getTime() ?? 0
    const tb = b.fechaPago?.getTime() ?? 0
    return ta - tb
  })

  let detRow = 2
  for (const d of detalles) {
    const row = wsDet.getRow(detRow)
    const detCells: [number, any, string?][] = [
      [1, d.numeroDoc],
      [2, d.cliente],
      [3, d.proyecto],
      [4, d.valorizacion],
      [5, d.fechaPago,  FMT_DATE],
      [6, d.tipo],
      [7, d.medioPago],
      [8, d.monto,      FMT_MONEY],
      [9, d.moneda],
      [10, d.observaciones],
    ]
    for (const [col, val, fmt] of detCells) {
      const cell = row.getCell(col)
      cell.value = val ?? null
      if (fmt) cell.numFmt = fmt
      setBorderData(cell)
    }
    for (const col of [1, 2, 3, 4, 6, 7, 9, 10]) {
      row.getCell(col).alignment = ALIGN_LEFT
    }
    detRow++
  }

  wsDet.views = [{ state: 'frozen', ySplit: 1 }]
  wsDet.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: 10 } }

  // ── Hoja 3: CxC Anuladas (referencia, fuera de los Totales) ────────────────────
  agregarHojaAnuladas(wb, anuladas)

  // ── Descarga ─────────────────────────────────────────────────────────────────
  const now     = new Date()
  const dateStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`
  const sufijoArchivo = monedaReporte ? `_${monedaReporte}` : ''
  await downloadBuffer(await wb.xlsx.writeBuffer(), `CuentasPorCobrar_Contable${sufijoArchivo}_${dateStr}.xlsx`)
}

// ============================================
// EXPORTAR FORMATO FINANCIERO (29 columnas, 2 filas de cabecera)
// ============================================
/**
 * Genera el reporte Financiero de CxC con datos de factoring/negociación.
 *
 * Columnas individuales (A–P): merge vertical fila 1+2.
 * Grupo Adelanto (Q–R), Saldo (S–T), Retenido (U–V): 2 subcols c/u.
 * Grupo Costos (W–AB): 6 subcols.
 * Columna individual (AC): Observaciones.
 *
 * Si una CxC no tiene CobroValorizacion, las columnas de factoring van vacías (no 0).
 * Totales: Monto Factura (F), Monto Neto (G), Interés (X), Comisión (Z), Gastos (AA).
 *
 * Hoja 2 "CxC Anuladas": las CxC con estado='anulada' quedan afuera de la Hoja 1
 * y de sus Totales (evita duplicar Interés/Comisión/Adelanto de una operación de
 * factoring ya anulada en la suma general — ver agregarHojaAnuladas).
 */
export async function exportarCxCFinanciero(itemsSinFiltrar: CxCRichRow[]): Promise<void> {
  const items = itemsSinFiltrar.filter(c => c.estado !== 'anulada')
  const anuladas = itemsSinFiltrar.filter(c => c.estado === 'anulada')
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('CxC Financiero')

  // ── Layout: 25 columnas ──────────────────────────────────────────────────────
  // A(1)  N° Documento    B(2)  Cliente         C(3)  RUC
  // D(4)  Proyecto        E(5)  Valorización     F(6)  Monto Factura
  // G(7)  Monto Neto      H(8)  Fecha Emisión    I(9)  Fecha Estimada de Pago
  // J(10) Fecha Pago      K(11) Días por Vencer  L(12) Negociado
  // M(13) Entidad Fin.    N(14) Nro. Negociación O(15) Banco (Desembolso)
  // P(16) Nro. Operación
  // Grupo Adelanto:  Q(17) Monto | R(18) Fecha
  // Grupo Saldo:     S(19) Monto | T(20) Fecha
  // Grupo Retenido:  U(21) Monto | V(22) Fecha
  // Grupo Costos:    W(23) Tasa  | X(24) Interés | Y(25) Comisión/Gastos
  const colWidths = [
    16,  // A  N° Documento
    35,  // B  Cliente
    14,  // C  RUC
    14,  // D  Proyecto
    16,  // E  Valorización
    14,  // F  Monto Factura
    14,  // G  Monto Neto
    12,  // H  Fecha Emisión
    14,  // I  Fecha Estimada de Pago
    12,  // J  Fecha Pago
    18,  // K  Días por vencer
    10,  // L  Negociado
    20,  // M  Entidad Financiera
    16,  // N  Nro. Negociación
    18,  // O  Banco (Desembolso)
    16,  // P  Nro. Operación
    14,  // Q  Adelanto – Monto
    12,  // R  Adelanto – Fecha
    14,  // S  Saldo – Monto
    12,  // T  Saldo – Fecha
    14,  // U  Retenido – Monto
    12,  // V  Retenido – Fecha
    10,  // W  Costos – Tasa
    14,  // X  Costos – Interés
    16,  // Y  Costos – Comisión/Gastos
  ]
  ws.columns = colWidths.map(w => ({ width: w }))

  // ── Cabecera ──────────────────────────────────────────────────────────────────
  const SOLO_COLS_FIN = ['A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P']
  const soloHeadersFin = [
    'N° Documento','Cliente','RUC','Proyecto','Valorización',
    'Monto\nFactura','Monto\nNeto','Fecha\nEmisión','Fecha Estimada\nde Pago','Fecha\nPago',
    'Días\npor Vencer','Negociado','Entidad\nFinanciera','Nro.\nNegociación',
    'Banco\n(Desembolso)','Nro.\nOperación',
  ]
  for (let i = 0; i < SOLO_COLS_FIN.length; i++) {
    ws.getCell(`${SOLO_COLS_FIN[i]}1`).value = soloHeadersFin[i]
    ws.mergeCells(`${SOLO_COLS_FIN[i]}1:${SOLO_COLS_FIN[i]}2`)
  }

  // Grupos fila 1 → subcolumnas fila 2
  ws.mergeCells('Q1:R1'); ws.getCell('Q1').value = 'Adelanto'
  ws.getCell('Q2').value = 'Monto'; ws.getCell('R2').value = 'Fecha'

  ws.mergeCells('S1:T1'); ws.getCell('S1').value = 'Saldo'
  ws.getCell('S2').value = 'Monto'; ws.getCell('T2').value = 'Fecha'

  ws.mergeCells('U1:V1'); ws.getCell('U1').value = 'Retenido'
  ws.getCell('U2').value = 'Monto'; ws.getCell('V2').value = 'Fecha'

  ws.mergeCells('W1:Y1'); ws.getCell('W1').value = 'Costos del Financiamiento'
  ws.getCell('W2').value = 'Tasa'
  ws.getCell('X2').value = 'Interés'
  ws.getCell('Y2').value = 'Comisión/Gastos'

  applyHeaderStyle(ws, 2, ['Q1', 'S1', 'U1', 'W1'])
  ws.getRow(1).height = 28
  ws.getRow(2).height = 22

  // ── Datos ─────────────────────────────────────────────────────────────────────
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const DATA_START = 3

  const COL_MONTO_F    = 6   // F  Monto Factura
  const COL_NETO_F     = 7   // G  Monto Neto
  const COL_INTERES    = 24  // X  Interés
  const COL_COM_GASTOS = 25  // Y  Comisión/Gastos

  for (let i = 0; i < items.length; i++) {
    const cxc = items[i]
    const rowNum = DATA_START + i
    const row = ws.getRow(rowNum)

    const cobro = cxc.valorizacion?.cobro ?? null
    const fechaEmision    = cxc.fechaEmision ? new Date(cxc.fechaEmision) : null
    const fechaEstimada   = calcularFechaEstimadaPago(cxc)
    const fechaUltimoPago = obtenerFechaUltimoPago(cxc)
    const negociado       = calcularNegociado(cxc)
    const diasTxt         = calcularDiasPorVencer(cxc, today)
    const entidadFin      = obtenerEntidadFinanciera(cxc)
    const montoNeto       = calcularMontoNetoContable(cxc)

    // Banco desembolso = primer pago neto (cuentaBancaria) o vacío
    const pagoNeto = cxc.pagos?.find(p => !p.esDetraccion && !p.esRetencion && !p.anulado) ?? null

    // Tasa: almacenada como 1.38 (= 1.38%); para Excel % dividir /100
    const tasaPct = cobro?.tasaDescuentoPct != null ? cobro.tasaDescuentoPct / 100 : null

    // Comisión + Gastos en un solo campo
    const comGastos = (cobro?.comisionEstructuracion ?? 0) + (cobro?.gastosAdicionales ?? 0)

    // Fecha real del abono de Saldo/Retenido — en blanco si todavía no se recibió
    // (no se muestra la fecha esperada/estimada para no confundirla con una real).
    const abonoSaldo = cobro?.abonos?.find(a => a.tipo === 'saldo_girar' && a.estado === 'recibido')
    const abonoRetenido = cobro?.abonos?.find(a => a.tipo === 'excedente' && a.estado === 'recibido')
    const fechaSaldo = abonoSaldo?.fechaReal ? new Date(abonoSaldo.fechaReal) : null
    const fechaRetenido = abonoRetenido?.fechaReal ? new Date(abonoRetenido.fechaReal) : null

    const cells: [number, any, string?][] = [
      [1,  cxc.numeroDocumento ?? ''],
      [2,  cxc.cliente?.nombre ?? ''],
      [3,  cxc.cliente?.ruc ?? ''],
      [4,  cxc.proyecto?.codigo ?? ''],
      [5,  cxc.valorizacion?.codigo ?? ''],
      [6,  cxc.monto,            FMT_MONEY],
      [7,  montoNeto,            FMT_MONEY],
      [8,  fechaEmision,         FMT_DATE],
      [9,  fechaEstimada,        FMT_DATE],
      [10, fechaUltimoPago,      FMT_DATE],
      [11, diasTxt],
      [12, negociado],
      [13, entidadFin],
      [14, cxc.numeroNegociacion ?? cobro?.numeroOperacion ?? ''],
      [15, pagoNeto?.cuentaBancaria?.nombreBanco ?? ''],
      [16, pagoNeto?.numeroOperacion ?? ''],
      // Adelanto
      [17, cobro?.adelantoBanpro ?? null,       FMT_MONEY],
      [18, cobro?.fechaDesembolso ? new Date(cobro.fechaDesembolso as string) : null, FMT_DATE],
      // Saldo
      [19, cobro?.saldoAGirar ?? null,          FMT_MONEY],
      [20, fechaSaldo,                          FMT_DATE],
      // Retenido
      [21, cobro?.excedenteMonto != null ? Number(cobro.excedenteMonto) : null, FMT_MONEY],
      [22, fechaRetenido,                       FMT_DATE],
      // Costos
      [23, tasaPct,                             FMT_RATE],
      [24, cobro?.interesMonto ?? null,         FMT_MONEY],
      [25, comGastos > 0 ? comGastos : null,   FMT_MONEY],
    ]

    for (const [col, val, fmt] of cells) {
      const cell = row.getCell(col)
      cell.value = val ?? null
      if (fmt) cell.numFmt = fmt
      setBorderData(cell)
    }

    for (const col of [1, 2, 3, 4, 5, 11, 12, 13, 14, 15, 16]) {
      row.getCell(col).alignment = ALIGN_LEFT
    }
  }

  // ── Fila de Totales ────────────────────────────────────────────────────────────
  const lastData = DATA_START + items.length - 1
  const totRow   = DATA_START + items.length

  if (items.length > 0) {
    const tr = ws.getRow(totRow)
    tr.getCell(1).value = 'TOTALES'
    tr.getCell(1).font  = { bold: true }

    tr.getCell(2).value = items.some(i => i.moneda !== items[0].moneda)
      ? '⚠ Mix PEN/USD — totales brutos por columna'
      : ''
    tr.getCell(2).font = { italic: true, color: { argb: 'FF6B7280' }, size: 9 }

    for (const col of [COL_MONTO_F, COL_NETO_F, COL_INTERES, COL_COM_GASTOS]) {
      const colLetter = ws.getColumn(col).letter
      const cell = tr.getCell(col)
      cell.value = { formula: `SUM(${colLetter}${DATA_START}:${colLetter}${lastData})` }
      cell.numFmt = FMT_MONEY
      cell.font   = { bold: true }
      setBorderData(cell)
    }
  }

  // ── Freeze y autoFilter ────────────────────────────────────────────────────────
  ws.views = [{ state: 'frozen', ySplit: 2 }]
  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: 25 } }

  // ── Hoja 2: CxC Anuladas (referencia, fuera de los Totales) ────────────────────
  agregarHojaAnuladas(wb, anuladas)

  const today2 = new Date()
  const dateStr = `${today2.getFullYear()}-${String(today2.getMonth()+1).padStart(2,'0')}-${String(today2.getDate()).padStart(2,'0')}`
  await downloadBuffer(await wb.xlsx.writeBuffer(), `CuentasPorCobrar_Financiero_${dateStr}.xlsx`)
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
