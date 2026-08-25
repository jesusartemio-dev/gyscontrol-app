import { calcularBaseImponibleIGV, convertirMonedaSunat } from './cuentasCobrarExcel'

export interface CxPRow {
  fechaRecepcion: string
  tipoDocumento: string
  numeroFactura: string | null
  proveedor?: { nombre: string; ruc: string } | null
  descripcion: string | null
  monto: number
  moneda: string
  tipoCambio?: number | null
  proyecto?: { codigo: string; nombre: string } | null
  estado: string
  observaciones?: string | null
  // % de detracción SUNAT de esta factura (4, 10, 12...). Retención no aplica a
  // CxP — confirmado con Administración.
  detraccionPorcentaje?: number | null
}

export interface GastoRow {
  fecha: string
  tipoComprobante: string | null
  numeroComprobante: string | null
  proveedorNombre: string | null
  proveedorRuc: string | null
  descripcion: string | null
  monto: number
  moneda: string
  categoriaGasto?: { nombre: string } | null
  hojaDeGastos?: {
    estado: string
    proyecto?: { codigo: string; nombre: string } | null
    empleado?: { name: string | null } | null
  } | null
}

const ESTADO_CXP: Record<string, string> = {
  pendiente_documentos: 'Pend. Documentos',
  pendiente: 'Pendiente',
  parcial: 'Parcial',
  pagada: 'Pagada',
  vencida: 'Vencida',
  anulada: 'Anulada',
}

const ESTADO_GASTO: Record<string, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  aprobado: 'Aprobado',
  depositado: 'Depositado',
  rendido: 'Rendido',
  revisado: 'Revisado',
  validado: 'Validado',
  cerrado: 'Cerrado',
  rechazado: 'Rechazado',
}

function fmtDate(iso: string) {
  return new Date(iso + (iso.includes('T') ? '' : 'T00:00:00Z'))
}

function tipoDocLabel(tipo: string) {
  if (tipo === 'nota_credito') return 'Nota de Crédito'
  return 'Factura'
}

function tipoComprobanteLabel(tipo: string | null) {
  if (!tipo) return 'Sin comprobante'
  const map: Record<string, string> = {
    factura: 'Factura', boleta: 'Boleta', recibo: 'Recibo', ticket: 'Ticket',
  }
  return map[tipo] || tipo
}

/**
 * Convierte `monto` a PEN: prioriza el tipoCambio ya guardado en el comprobante
 * (dato real de esa operación); si no hay, usa el TC SUNAT venta de `tasasPorFecha`
 * para la fecha del comprobante. Si ninguno está disponible, devuelve el monto
 * sin convertir y `convertido: false` — el llamador lo deja en su moneda
 * original y lo marca, en vez de mostrar un monto en soles inventado.
 */
function convertirASolesCompra(
  monto: number,
  moneda: string,
  fechaKey: string,
  tipoCambioGuardado: number | null | undefined,
  tasasPorFecha: Record<string, number | null>,
): { monto: number; convertido: boolean } {
  if (moneda === 'PEN') return { monto, convertido: true }
  if (moneda !== 'USD') return { monto, convertido: false } // EUR: sin fuente de TC automática
  const tc = (tipoCambioGuardado && tipoCambioGuardado > 0) ? tipoCambioGuardado : tasasPorFecha[fechaKey]
  const convertido = convertirMonedaSunat(monto, 'USD', 'PEN', tc)
  if (convertido == null) return { monto, convertido: false }
  return { monto: Math.round(convertido * 100) / 100, convertido: true }
}

export async function exportarComprasMes(
  mes: string, // "2026-06"
  cxpRows: CxPRow[],
  gastoRows: GastoRow[],
  tasasPorFecha: Record<string, number | null> = {},
) {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()
  const [year, month] = mes.split('-').map(Number)
  const nombreMes = new Date(year, month - 1, 1).toLocaleString('es-PE', { month: 'long' })
  const ws = wb.addWorksheet(`Compras ${nombreMes} ${year}`)

  const FILL_HEADER = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FF1E3A5F' } }
  const FILL_NC     = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFEE2E2' } }
  const FILL_ANULADA = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF3F4F6' } }
  const FILL_GASTO  = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFFBEB' } }
  const FILL_SIN_TC = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFED7AA' } }
  const FONT_HEADER = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  const FONT_NC     = { color: { argb: 'FFDC2626' } }
  const FONT_ANULADA = { color: { argb: 'FF9CA3AF' }, italic: true }
  const NCOLS = 14

  ws.columns = [
    { width: 13 }, // A Fecha
    { width: 16 }, // B Tipo Doc
    { width: 18 }, // C N° Comprobante
    { width: 30 }, // D Proveedor / Empleado
    { width: 14 }, // E RUC
    { width: 30 }, // F Descripción
    { width: 20 }, // G Proyecto
    { width: 14 }, // H Base Imponible (S/)
    { width: 12 }, // I IGV (S/)
    { width: 14 }, // J Monto (S/)
    { width: 13 }, // K Detracción (S/)
    { width: 10 }, // L Moneda
    { width: 18 }, // M Estado
    { width: 12 }, // N Origen
  ]

  // Título
  ws.mergeCells(1, 1, 1, NCOLS)
  const titleCell = ws.getCell(1, 1)
  titleCell.value = `Compras del Mes — ${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} ${year}`
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1E3A5F' } }
  titleCell.alignment = { horizontal: 'center' }

  // Cabecera
  const headers = ['Fecha', 'Tipo Documento', 'N° Comprobante', 'Proveedor / Empleado', 'RUC', 'Descripción', 'Proyecto', 'Base Imponible (S/)', 'IGV (S/)', 'Monto (S/)', 'Detracción (S/)', 'Moneda', 'Estado', 'Origen']
  headers.forEach((h, i) => {
    const cell = ws.getCell(2, i + 1)
    cell.value = h
    cell.font = FONT_HEADER
    cell.fill = FILL_HEADER
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = { bottom: { style: 'medium', color: { argb: 'FF000000' } } }
  })
  ws.getRow(2).height = 22

  let dataRow = 3
  let totalPEN = 0
  let totalUSD = 0
  let totalEUR = 0
  let totalDetraccion = 0
  let sinTcCount = 0

  // Separador sección facturas
  const sepCxP = ws.getRow(dataRow)
  ws.mergeCells(dataRow, 1, dataRow, NCOLS)
  sepCxP.getCell(1).value = '── Facturas y Notas de Crédito (Cuentas por Pagar) ──'
  sepCxP.getCell(1).font = { bold: true, italic: true, color: { argb: 'FF1E3A5F' } }
  sepCxP.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8F0FE' } }
  dataRow++

  for (const item of cxpRows) {
    const esNC = item.tipoDocumento === 'nota_credito'
    const esAnulada = item.estado === 'anulada'
    const montoOriginal = esNC ? -Math.abs(item.monto) : item.monto

    const fechaKey = (item.fechaRecepcion as string).slice(0, 10)
    const { monto: montoFinal, convertido } = convertirASolesCompra(
      montoOriginal, item.moneda, fechaKey, item.tipoCambio, tasasPorFecha
    )
    const monedaMostrada = convertido ? 'PEN' : item.moneda
    if (!convertido) sinTcCount++

    if (monedaMostrada === 'USD') totalUSD += montoFinal
    else if (monedaMostrada === 'EUR') totalEUR += montoFinal
    else totalPEN += montoFinal

    const { baseImponible, igv } = calcularBaseImponibleIGV(montoFinal)

    // Detracción: SUNAT RS 183-2004, siempre entero (sin decimales). Solo CxP —
    // no aplica a Gastos Operativos ni Retención (confirmado con Administración).
    const detraccionMonto = (item.detraccionPorcentaje && item.detraccionPorcentaje > 0)
      ? Math.round(montoFinal * item.detraccionPorcentaje / 100)
      : null
    if (detraccionMonto) totalDetraccion += detraccionMonto

    const row = ws.getRow(dataRow)
    row.getCell(1).value = fmtDate(item.fechaRecepcion as string)
    row.getCell(1).numFmt = 'dd/mm/yyyy'
    row.getCell(2).value = tipoDocLabel(item.tipoDocumento)
    row.getCell(3).value = item.numeroFactura ?? ''
    row.getCell(4).value = item.proveedor?.nombre ?? ''
    row.getCell(5).value = item.proveedor?.ruc ?? ''
    row.getCell(6).value = item.descripcion ?? ''
    row.getCell(7).value = item.proyecto ? `${item.proyecto.codigo} – ${item.proyecto.nombre}` : ''
    row.getCell(8).value = baseImponible
    row.getCell(8).numFmt = '#,##0.00'
    row.getCell(9).value = igv
    row.getCell(9).numFmt = '#,##0.00'
    row.getCell(10).value = montoFinal
    row.getCell(10).numFmt = '#,##0.00'
    row.getCell(11).value = detraccionMonto
    row.getCell(11).numFmt = '#,##0'
    row.getCell(12).value = monedaMostrada
    row.getCell(13).value = ESTADO_CXP[item.estado] ?? item.estado
    row.getCell(14).value = 'Factura'

    const fillRow = esNC ? FILL_NC : esAnulada ? FILL_ANULADA : undefined
    const fontRow = esNC ? FONT_NC : esAnulada ? FONT_ANULADA : undefined
    for (let c = 1; c <= NCOLS; c++) {
      if (fillRow) row.getCell(c).fill = fillRow
      if (fontRow) row.getCell(c).font = fontRow
      row.getCell(c).border = {
        top:    { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left:   { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right:  { style: 'thin', color: { argb: 'FFE5E7EB' } },
      }
    }
    if (!convertido) row.getCell(12).fill = FILL_SIN_TC // marca la moneda no convertida, para revisar a mano
    dataRow++
  }

  // Separador sección gastos
  const sepGasto = ws.getRow(dataRow)
  ws.mergeCells(dataRow, 1, dataRow, NCOLS)
  sepGasto.getCell(1).value = '── Gastos Operativos ──'
  sepGasto.getCell(1).font = { bold: true, italic: true, color: { argb: 'FF92400E' } }
  sepGasto.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9C3' } }
  dataRow++

  for (const item of gastoRows) {
    const fechaKey = (item.fecha as string).slice(0, 10)
    const { monto: montoFinal, convertido } = convertirASolesCompra(
      item.monto, item.moneda, fechaKey, null, tasasPorFecha
    )
    const monedaMostrada = convertido ? 'PEN' : item.moneda
    if (!convertido) sinTcCount++

    if (monedaMostrada === 'USD') totalUSD += montoFinal
    else if (monedaMostrada === 'EUR') totalEUR += montoFinal
    else totalPEN += montoFinal

    const { baseImponible, igv } = calcularBaseImponibleIGV(montoFinal)

    const row = ws.getRow(dataRow)
    row.getCell(1).value = fmtDate(item.fecha as string)
    row.getCell(1).numFmt = 'dd/mm/yyyy'
    row.getCell(2).value = tipoComprobanteLabel(item.tipoComprobante)
    row.getCell(3).value = item.numeroComprobante ?? ''
    row.getCell(4).value = item.proveedorNombre ?? item.hojaDeGastos?.empleado?.name ?? ''
    row.getCell(5).value = item.proveedorRuc ?? ''
    row.getCell(6).value = item.descripcion ?? ''
    row.getCell(7).value = item.hojaDeGastos?.proyecto
      ? `${item.hojaDeGastos.proyecto.codigo} – ${item.hojaDeGastos.proyecto.nombre}`
      : ''
    row.getCell(8).value = baseImponible
    row.getCell(8).numFmt = '#,##0.00'
    row.getCell(9).value = igv
    row.getCell(9).numFmt = '#,##0.00'
    row.getCell(10).value = montoFinal
    row.getCell(10).numFmt = '#,##0.00'
    // 11: Detracción — no aplica a Gastos Operativos, queda en blanco.
    row.getCell(12).value = monedaMostrada
    row.getCell(13).value = ESTADO_GASTO[item.hojaDeGastos?.estado ?? ''] ?? (item.hojaDeGastos?.estado ?? '')
    row.getCell(14).value = 'Gasto'

    for (let c = 1; c <= NCOLS; c++) {
      row.getCell(c).fill = FILL_GASTO
      row.getCell(c).border = {
        top:    { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left:   { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right:  { style: 'thin', color: { argb: 'FFE5E7EB' } },
      }
    }
    if (!convertido) row.getCell(12).fill = FILL_SIN_TC
    dataRow++
  }

  // Totales — Monto ahora vive en J (10); todo lo que se pudo convertir cae en
  // TOTAL PEN, USD/EUR solo quedan filas con fondo naranja (sin TC disponible).
  dataRow++
  const tRow = ws.getRow(dataRow)
  tRow.getCell(9).value = 'TOTAL PEN'
  tRow.getCell(9).font = { bold: true }
  tRow.getCell(10).value = totalPEN
  tRow.getCell(10).numFmt = '#,##0.00'
  tRow.getCell(10).font = { bold: true }
  if (totalUSD !== 0) {
    dataRow++
    const tUSD = ws.getRow(dataRow)
    tUSD.getCell(9).value = 'TOTAL USD (sin convertir)'
    tUSD.getCell(9).font = { bold: true }
    tUSD.getCell(10).value = totalUSD
    tUSD.getCell(10).numFmt = '#,##0.00'
    tUSD.getCell(10).font = { bold: true }
  }
  if (totalEUR !== 0) {
    dataRow++
    const tEUR = ws.getRow(dataRow)
    tEUR.getCell(9).value = 'TOTAL EUR (sin convertir)'
    tEUR.getCell(9).font = { bold: true }
    tEUR.getCell(10).value = totalEUR
    tEUR.getCell(10).numFmt = '#,##0.00'
    tEUR.getCell(10).font = { bold: true }
  }
  if (totalDetraccion > 0) {
    dataRow++
    const tDet = ws.getRow(dataRow)
    tDet.getCell(9).value = 'TOTAL DETRACCIÓN'
    tDet.getCell(9).font = { bold: true }
    tDet.getCell(11).value = totalDetraccion
    tDet.getCell(11).numFmt = '#,##0'
    tDet.getCell(11).font = { bold: true }
  }
  if (sinTcCount > 0) {
    dataRow++
    const note = ws.getRow(dataRow)
    ws.mergeCells(dataRow, 1, dataRow, NCOLS)
    note.getCell(1).value = `⚠ ${sinTcCount} comprobante(s) resaltado(s) en naranja no se pudieron convertir a soles (sin tipo de cambio disponible para su fecha) — quedaron en su moneda original.`
    note.getCell(1).font = { italic: true, color: { argb: 'FF9A3412' }, size: 9 }
  }

  // Freeze header
  ws.views = [{ state: 'frozen', ySplit: 2 }]

  const buf = await wb.xlsx.writeBuffer()
  return buf
}
