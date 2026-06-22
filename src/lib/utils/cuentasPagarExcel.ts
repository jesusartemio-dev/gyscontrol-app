import { normalizeStr } from '@/lib/utils'
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
  ordenCompra?: { numero: string; centroCosto?: { nombre: string } | null } | null
}

interface CxPAdminPagoRow {
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
  cuentaBancaria?: { nombreBanco: string; numeroCuenta: string } | null
}

export interface CxPAdminExportRow extends CxPExportRow {
  formaPago?: string | null
  diasCredito?: number | null
  detraccionPorcentaje?: number | null
  tipoCambio?: number | null
  descripcion?: string | null
  numeroCheque?: string | null
  numeroLetra?: string | null
  enviadaContador?: boolean
  fechaEnvioContador?: string | null
  enviadaPor?: { id: string; name: string | null } | null
  pagos?: CxPAdminPagoRow[]
}

const ESTADOS_VALIDOS = ['pendiente', 'parcial', 'pagada', 'vencida', 'anulada']
const MONEDAS_VALIDAS = ['PEN', 'USD']
// Soporta: nuevos valores ('contado'|'credito'|'adelanto') y legacy ('credito_NN').
const CONDICIONES_VALIDAS = ['contado', 'credito', 'adelanto', 'credito_15', 'credito_30', 'credito_45', 'credito_60', 'credito_90']

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
    proyectoPorCodigo.set(normalizeStr(p.codigo), p)
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
// EXPORTAR FORMATO ADMINISTRACIÓN (24 columnas)
// A-L: doc/factura (verde), M-X: pago/contabilidad (azul)
// ============================================
const ESTADO_LABEL_CXP: Record<string, string> = {
  pendiente: 'Pend. de Pago',
  parcial: 'Parcial',
  pagada: 'Pagada',
  vencida: 'Vencida',
  anulada: 'Anulada',
  pendiente_documentos: 'Pend. Documentos',
}

function formaPagoLabel(formaPago?: string | null, diasCredito?: number | null): string {
  if (!formaPago && !diasCredito) return ''
  const labels: Record<string, string> = {
    transferencia: 'Transferencia',
    cheque: 'Cheque',
    letra: 'Letra',
    factura: 'Factura',
    factura_negociable: 'Factura Negociable',
    otro: 'Otro',
  }
  const fp = formaPago ? (labels[formaPago] || formaPago) : ''
  if (fp && diasCredito) return `${fp} ${diasCredito} días`
  if (fp) return fp
  if (diasCredito) return `${diasCredito} días`
  return ''
}

function centroCostoCxP(item: CxPAdminExportRow): string {
  if (item.proyecto?.codigo) return item.proyecto.codigo
  if (item.ordenCompra?.centroCosto?.nombre) return item.ordenCompra.centroCosto.nombre
  return ''
}

function formatDateShort(dateStr: string | null | undefined): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return ''
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`
}

export async function exportarCxPFormatoAdmin(items: CxPAdminExportRow[]) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('CxP Administración')

  const FILL_VERDE = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF86EFAC' } }
  const FILL_AZUL  = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF93C5FD' } }
  const FONT_HEADER = { bold: true, color: { argb: 'FF000000' }, size: 11 }
  const FONT_HEADER_RED = { bold: true, color: { argb: 'FFDC2626' }, size: 11 }
  const NCOLS = 24  // A-X

  // Anchos de columna
  ws.columns = [
    { width: 6  },  // A  Nro.
    { width: 32 },  // B  Proveedor
    { width: 13 },  // C  Fecha factura
    { width: 16 },  // D  Referencia de proveedor
    { width: 26 },  // E  Descripción
    { width: 14 },  // F  Centro de costo
    { width: 13 },  // G  Fecha vencimiento
    { width: 14 },  // H  Orden de Compra
    { width: 12 },  // I  Total
    { width: 12 },  // J  A pagar
    { width: 9  },  // K  Moneda
    { width: 14 },  // L  Estado
    { width: 18 },  // M  Enviada al contador
    { width: 16 },  // N  Forma de pago
    { width: 13 },  // O  Fecha de pago
    { width: 13 },  // P  Nro. Cheque
    { width: 13 },  // Q  Nro. Letra
    { width: 14 },  // R  Nro. Único
    { width: 14 },  // S  Banco
    { width: 13 },  // T  Detracción pendiente
    { width: 13 },  // U  Fecha pago detracción
    { width: 14 },  // V  Monto pagado detracción (S/)
    { width: 16 },  // W  Nro. Constancia
    { width: 32 },  // X  Observación
  ]

  // ===== Cabecera (fila 1) =====
  const headers = [
    'Nro.',                           // A  1
    'Proveedor',                      // B  2
    'Fecha factura',                  // C  3
    'Referencia\nde proveedor',       // D  4
    'Descripción',                    // E  5
    'Centro de costo',                // F  6
    'Fecha\nvencimiento',             // G  7
    'Orden de Compra',                // H  8
    'Total',                          // I  9
    'A pagar',                        // J 10
    'Moneda',                         // K 11
    'Estado',                         // L 12
    'Enviada al\ncontador',           // M 13
    'Forma de pago',                  // N 14
    'Fecha de pago',                  // O 15
    'Nro. Cheque',                    // P 16
    'Nro. Letra',                     // Q 17
    'Nro. Único',                     // R 18
    'Banco',                          // S 19
    'Detracción\npendiente',          // T 20
    'Fecha pago\ndetracción',         // U 21
    'Monto detrac.\n(S/)',            // V 22
    'Nro. Constancia\nDetracción',    // W 23
    'Observación',                    // X 24
  ]
  for (let i = 0; i < headers.length; i++) {
    ws.getCell(1, i + 1).value = headers[i]
  }

  // Estilos cabecera: A-L verde, M-X azul
  const r1 = ws.getRow(1)
  r1.height = 32
  for (let i = 1; i <= NCOLS; i++) {
    const cell = r1.getCell(i)
    cell.font = (i === 23) ? FONT_HEADER_RED : FONT_HEADER  // W Nro.Constancia en rojo
    cell.fill = (i <= 12) ? FILL_VERDE : FILL_AZUL
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
    cell.border = {
      top:    { style: 'thin', color: { argb: 'FF000000' } },
      bottom: { style: 'thin', color: { argb: 'FF000000' } },
      left:   { style: 'thin', color: { argb: 'FF000000' } },
      right:  { style: 'thin', color: { argb: 'FF000000' } },
    }
  }

  // ===== Ordenar: fechaRecepcion DESC =====
  const sorted = [...items].sort((a, b) => {
    const da = a.fechaRecepcion ? new Date(a.fechaRecepcion).getTime() : 0
    const db = b.fechaRecepcion ? new Date(b.fechaRecepcion).getTime() : 0
    return db - da
  })

  // ===== Datos =====
  let dataRow = 2
  let totalMonto = 0
  let totalSaldo = 0

  for (let i = 0; i < sorted.length; i++) {
    const item = sorted[i]
    const fechaFactura   = item.fechaRecepcion  ? new Date(item.fechaRecepcion)  : null
    const fechaVencim    = item.fechaVencimiento ? new Date(item.fechaVencimiento) : null

    // Pagos ordinarios (no detracción) ordenados por fecha desc
    const pagosOrdinarios = (item.pagos ?? [])
      .filter(p => !p.esDetraccion)
      .sort((a, b) => new Date(b.fechaPago).getTime() - new Date(a.fechaPago).getTime())

    const pagoTransferencia = pagosOrdinarios.find(p => p.medioPago === 'transferencia')
    const pagoNoDetraccion  = pagosOrdinarios[0]  // último pago ordinario para Banco y Fecha
    const detraccion        = (item.pagos ?? []).find(p => p.esDetraccion)

    // M: Enviada al contador — texto compuesto
    let enviadaLabel = ''
    if (item.enviadaContador) {
      const fechaEnvio = item.fechaEnvioContador ? formatDateShort(item.fechaEnvioContador) : ''
      const por = item.enviadaPor?.name ?? ''
      enviadaLabel = ['Sí', fechaEnvio, por ? `(${por})` : ''].filter(Boolean).join(' ')
    }

    // T: Detracción pendiente
    let detraccionPendiente: number | null = null
    if (item.detraccionPorcentaje && item.detraccionPorcentaje > 0) {
      const esperada = Math.round(item.monto * item.detraccionPorcentaje / 100 * 100) / 100
      const pagada   = (item.pagos ?? [])
        .filter(p => p.esDetraccion)
        .reduce((sum, p) => sum + (p.detraccionMonto ?? p.monto ?? 0), 0)
      detraccionPendiente = Math.max(0, Math.round((esperada - pagada) * 100) / 100)
    }

    // V: Monto detracción pagado en S/
    // detraccionMonto ya es PEN (depósito al BN); si la factura es USD y hay tipoCambio, convertir
    let montoDetraccionPEN: number | null = null
    if (detraccion) {
      const raw = detraccion.detraccionMonto ?? detraccion.monto ?? 0
      if (item.moneda === 'USD' && item.tipoCambio && item.tipoCambio > 0) {
        montoDetraccionPEN = Math.round(raw * item.tipoCambio * 100) / 100
      } else {
        montoDetraccionPEN = raw
      }
    }

    const row = ws.getRow(dataRow)
    row.getCell(1).value  = i + 1                                                   // A
    row.getCell(2).value  = item.proveedor?.nombre ?? ''                            // B
    row.getCell(3).value  = fechaFactura                                            // C
    row.getCell(4).value  = item.numeroFactura ?? ''                                // D
    row.getCell(5).value  = item.descripcion ?? ''                                  // E
    row.getCell(6).value  = centroCostoCxP(item)                                    // F
    row.getCell(7).value  = fechaVencim                                             // G
    row.getCell(8).value  = item.ordenCompra?.numero ?? ''                          // H
    row.getCell(9).value  = item.monto                                              // I
    row.getCell(10).value = item.saldoPendiente                                     // J
    row.getCell(11).value = item.moneda                                             // K
    row.getCell(12).value = ESTADO_LABEL_CXP[item.estado] ?? item.estado            // L
    row.getCell(13).value = enviadaLabel                                            // M
    row.getCell(14).value = formaPagoLabel(item.formaPago, item.diasCredito)        // N
    row.getCell(15).value = pagoNoDetraccion?.fechaPago ? new Date(pagoNoDetraccion.fechaPago) : null  // O
    row.getCell(16).value = item.numeroCheque ?? ''                                 // P
    row.getCell(17).value = item.numeroLetra ?? ''                                  // Q
    row.getCell(18).value = pagoTransferencia?.numeroOperacion ?? ''                // R
    row.getCell(19).value = pagoNoDetraccion?.cuentaBancaria?.nombreBanco ?? ''     // S
    row.getCell(20).value = detraccionPendiente                                     // T
    row.getCell(21).value = detraccion?.detraccionFechaPago ? new Date(detraccion.detraccionFechaPago) : null  // U
    row.getCell(22).value = montoDetraccionPEN                                      // V
    row.getCell(23).value = detraccion?.numeroConstanciaBN ?? ''                    // W
    row.getCell(24).value = item.observaciones ?? ''                                // X

    // Acumular totales
    totalMonto += item.monto
    totalSaldo += item.saldoPendiente

    // Bordes de datos
    for (let c = 1; c <= NCOLS; c++) {
      row.getCell(c).border = {
        top:    { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left:   { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right:  { style: 'thin', color: { argb: 'FFE5E7EB' } },
      }
    }

    dataRow++
  }

  // ===== Fila de totales =====
  if (sorted.length > 0) {
    const totalRowIdx = dataRow
    const tRow = ws.getRow(totalRowIdx)
    tRow.getCell(1).value = 'TOTAL'
    tRow.getCell(9).value = totalMonto
    tRow.getCell(10).value = totalSaldo
    for (let c = 1; c <= NCOLS; c++) {
      const cell = tRow.getCell(c)
      cell.font = { bold: true }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } }
      cell.border = {
        top:    { style: 'medium', color: { argb: 'FF000000' } },
        bottom: { style: 'thin',   color: { argb: 'FFE5E7EB' } },
        left:   { style: 'thin',   color: { argb: 'FFE5E7EB' } },
        right:  { style: 'thin',   color: { argb: 'FFE5E7EB' } },
      }
    }
    ws.getCell(`I${totalRowIdx}`).numFmt  = '#,##0.00'
    ws.getCell(`J${totalRowIdx}`).numFmt  = '#,##0.00'
  }

  // ===== Formatos numéricos =====
  const lastDataRow = dataRow - 1
  if (lastDataRow >= 2) {
    for (const col of ['C', 'G', 'O', 'U']) {
      for (let r = 2; r <= lastDataRow; r++) ws.getCell(`${col}${r}`).numFmt = 'dd/mm/yyyy'
    }
    for (const col of ['I', 'J', 'T', 'V']) {
      for (let r = 2; r <= lastDataRow; r++) ws.getCell(`${col}${r}`).numFmt = '#,##0.00'
    }
  }

  // Congelar bajo cabecera y autoFilter
  ws.views = [{ state: 'frozen', ySplit: 1 }]
  ws.autoFilter = { from: 'A1', to: { row: 1, column: NCOLS } }

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `CuentasPorPagar_Admin_${new Date().toISOString().split('T')[0]}.xlsx`
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
