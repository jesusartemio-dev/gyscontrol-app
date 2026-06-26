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

export async function exportarComprasMes(
  mes: string, // "2026-06"
  cxpRows: CxPRow[],
  gastoRows: GastoRow[],
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
  const FONT_HEADER = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  const FONT_NC     = { color: { argb: 'FFDC2626' } }
  const FONT_ANULADA = { color: { argb: 'FF9CA3AF' }, italic: true }
  const NCOLS = 11

  ws.columns = [
    { width: 13 }, // A Fecha
    { width: 16 }, // B Tipo Doc
    { width: 18 }, // C N° Comprobante
    { width: 30 }, // D Proveedor / Empleado
    { width: 14 }, // E RUC
    { width: 30 }, // F Descripción
    { width: 20 }, // G Proyecto
    { width: 12 }, // H Monto
    { width: 8  }, // I Moneda
    { width: 18 }, // J Estado
    { width: 12 }, // K Origen
  ]

  // Título
  ws.mergeCells(1, 1, 1, NCOLS)
  const titleCell = ws.getCell(1, 1)
  titleCell.value = `Compras del Mes — ${nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1)} ${year}`
  titleCell.font = { bold: true, size: 14, color: { argb: 'FF1E3A5F' } }
  titleCell.alignment = { horizontal: 'center' }

  // Cabecera
  const headers = ['Fecha', 'Tipo Documento', 'N° Comprobante', 'Proveedor / Empleado', 'RUC', 'Descripción', 'Proyecto', 'Monto', 'Moneda', 'Estado', 'Origen']
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
    const montoFinal = esNC ? -Math.abs(item.monto) : item.monto

    if (item.moneda === 'USD') totalUSD += montoFinal
    else totalPEN += montoFinal

    const row = ws.getRow(dataRow)
    row.getCell(1).value = fmtDate(item.fechaRecepcion as string)
    row.getCell(1).numFmt = 'dd/mm/yyyy'
    row.getCell(2).value = tipoDocLabel(item.tipoDocumento)
    row.getCell(3).value = item.numeroFactura ?? ''
    row.getCell(4).value = item.proveedor?.nombre ?? ''
    row.getCell(5).value = item.proveedor?.ruc ?? ''
    row.getCell(6).value = item.descripcion ?? ''
    row.getCell(7).value = item.proyecto ? `${item.proyecto.codigo} – ${item.proyecto.nombre}` : ''
    row.getCell(8).value = montoFinal
    row.getCell(8).numFmt = '#,##0.00'
    row.getCell(9).value = item.moneda
    row.getCell(10).value = ESTADO_CXP[item.estado] ?? item.estado
    row.getCell(11).value = 'Factura'

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
    const montoFinal = item.monto
    if (item.moneda === 'USD') totalUSD += montoFinal
    else totalPEN += montoFinal

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
    row.getCell(8).value = montoFinal
    row.getCell(8).numFmt = '#,##0.00'
    row.getCell(9).value = item.moneda
    row.getCell(10).value = ESTADO_GASTO[item.hojaDeGastos?.estado ?? ''] ?? (item.hojaDeGastos?.estado ?? '')
    row.getCell(11).value = 'Gasto'

    for (let c = 1; c <= NCOLS; c++) {
      row.getCell(c).fill = FILL_GASTO
      row.getCell(c).border = {
        top:    { style: 'thin', color: { argb: 'FFE5E7EB' } },
        bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        left:   { style: 'thin', color: { argb: 'FFE5E7EB' } },
        right:  { style: 'thin', color: { argb: 'FFE5E7EB' } },
      }
    }
    dataRow++
  }

  // Totales
  dataRow++
  const tRow = ws.getRow(dataRow)
  tRow.getCell(7).value = 'TOTAL PEN'
  tRow.getCell(7).font = { bold: true }
  tRow.getCell(8).value = totalPEN
  tRow.getCell(8).numFmt = '#,##0.00'
  tRow.getCell(8).font = { bold: true }
  dataRow++
  if (totalUSD !== 0) {
    const tUSD = ws.getRow(dataRow)
    tUSD.getCell(7).value = 'TOTAL USD'
    tUSD.getCell(7).font = { bold: true }
    tUSD.getCell(8).value = totalUSD
    tUSD.getCell(8).numFmt = '#,##0.00'
    tUSD.getCell(8).font = { bold: true }
  }

  // Freeze header
  ws.views = [{ state: 'frozen', ySplit: 2 }]

  const buf = await wb.xlsx.writeBuffer()
  return buf
}
