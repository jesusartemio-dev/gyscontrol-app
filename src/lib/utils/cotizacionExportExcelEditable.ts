import type { Cotizacion } from '@/types'

const HEADER_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF3F4F6' } }
const GROUP_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFDBEAFE' } }
const TOTAL_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE5E7EB' } }
const INPUT_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFFF9E6' } }
const CURRENCY_FMT = '#,##0.00'

function applyHeaderStyle(row: any) {
  row.font = { bold: true, size: 10 }
  row.fill = HEADER_FILL
  row.alignment = { vertical: 'middle' }
}

function applyGroupStyle(row: any) {
  row.font = { bold: true, size: 10 }
  row.fill = GROUP_FILL
}

function applySubtotalStyle(row: any) {
  row.font = { bold: true, italic: true, size: 10 }
}

function applyTotalStyle(row: any) {
  row.font = { bold: true, size: 11 }
  row.fill = TOTAL_FILL
}

function setCurrencyFormat(row: any, cols: number[]) {
  cols.forEach(col => {
    const cell = row.getCell(col)
    if (cell.value != null) cell.numFmt = CURRENCY_FMT
  })
}

function setFormulaWithFormat(row: any, col: number, formula: string, result: number, numFmt: string = CURRENCY_FMT) {
  const cell = row.getCell(col)
  cell.value = { formula, result }
  cell.numFmt = numFmt
}

function markInputCells(row: any, cols: number[]) {
  cols.forEach(col => {
    row.getCell(col).fill = INPUT_FILL
  })
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return '—' }
}

// Pre-calculate total row number for a section
// Structure: 1 header + for each group(1 group header + N items + 1 subtotal) + 1 empty + 1 total
function calcTotalRow(groups: { items: any[] }[]): number {
  const dataRows = groups.reduce((acc, g) => acc + 1 + g.items.length + 1, 0)
  return 1 + dataRows + 1 + 1 // header + data + empty + total
}

// ============================================
// MAIN EXPORT FUNCTION (EDITABLE WITH FORMULAS)
// ============================================
export async function exportarCotizacionAExcelEditable(cotizacion: Cotizacion): Promise<void> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  // Pre-calculate total row numbers so Resumen can be built first
  const equiposTotalRow = calcTotalRow(cotizacion.equipos)
  const serviciosTotalRow = calcTotalRow(cotizacion.servicios)
  const gastosTotalRow = calcTotalRow(cotizacion.gastos)

  // Build sheets in display order
  buildResumenSheetEditable(wb, cotizacion, equiposTotalRow, serviciosTotalRow, gastosTotalRow)
  buildEquiposSheetEditable(wb, cotizacion)
  buildServiciosSheetEditable(wb, cotizacion)
  buildGastosSheetEditable(wb, cotizacion)
  buildCondicionesSheet(wb, cotizacion)

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${cotizacion.codigo}_EDITABLE_${cotizacion.nombre.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').substring(0, 25).trim()}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================
// HOJA: EQUIPOS (with formulas)
// Returns the row number of the TOTAL row
// ============================================
// Columns: A=Código, B=Descripción, C=Marca, D=Categoría, E=Unidad,
//          F=Cantidad, G=P.Lista, H=F.Costo, I=F.Venta,
//          J=P.Interno(formula), K=P.Cliente(formula),
//          L=Total Interno(formula), M=Total Cliente(formula)
function buildEquiposSheetEditable(wb: any, cot: Cotizacion): number {
  const ws = wb.addWorksheet('Equipos')
  ws.columns = [
    { header: 'Código', key: 'codigo', width: 14 },
    { header: 'Descripción', key: 'descripcion', width: 35 },
    { header: 'Marca', key: 'marca', width: 14 },
    { header: 'Categoría', key: 'categoria', width: 16 },
    { header: 'Unidad', key: 'unidad', width: 10 },
    { header: 'Cantidad', key: 'cantidad', width: 10 },
    { header: 'P.Lista', key: 'precioLista', width: 12 },
    { header: 'F.Costo', key: 'factorCosto', width: 10 },
    { header: 'F.Venta', key: 'factorVenta', width: 10 },
    { header: 'P.Interno', key: 'precioInterno', width: 12 },
    { header: 'P.Cliente', key: 'precioCliente', width: 12 },
    { header: 'Total Interno', key: 'totalInterno', width: 14 },
    { header: 'Total Cliente', key: 'totalCliente', width: 14 },
  ]
  applyHeaderStyle(ws.getRow(1))

  const subtotalRows: number[] = []

  cot.equipos.forEach(grupo => {
    // Group header
    const groupRow = ws.addRow([`▸ ${grupo.nombre}`, grupo.descripcion || ''])
    applyGroupStyle(groupRow)

    const itemStartRow = ws.rowCount + 1

    // Items with formulas
    grupo.items.forEach(item => {
      const row = ws.addRow([
        item.codigo,
        item.descripcion,
        item.marca,
        item.categoria,
        item.unidad,
        item.cantidad,
        item.precioLista,
        +(item.factorCosto ?? 1).toFixed(2),
        +(item.factorVenta ?? 1.15).toFixed(2),
      ])
      const r = row.number

      // P.Interno = P.Lista * F.Costo
      setFormulaWithFormat(row, 10, `G${r}*H${r}`, item.precioInterno)
      // P.Cliente = P.Lista * F.Venta
      setFormulaWithFormat(row, 11, `G${r}*I${r}`, item.precioCliente)
      // Total Interno = P.Interno * Cantidad
      setFormulaWithFormat(row, 12, `J${r}*F${r}`, item.costoInterno)
      // Total Cliente = P.Cliente * Cantidad
      setFormulaWithFormat(row, 13, `K${r}*F${r}`, item.costoCliente)

      // Mark editable input cells
      markInputCells(row, [6, 7, 8, 9]) // Cantidad, P.Lista, F.Costo, F.Venta
    })

    const itemEndRow = ws.rowCount

    // Subtotal row with SUM formulas
    const subRow = ws.addRow(['', '', '', '', '', '', '', '', '', '', `Subtotal ${grupo.nombre}:`])
    const sr = subRow.number
    if (itemStartRow <= itemEndRow) {
      setFormulaWithFormat(subRow, 12, `SUM(L${itemStartRow}:L${itemEndRow})`, grupo.subtotalInterno)
      setFormulaWithFormat(subRow, 13, `SUM(M${itemStartRow}:M${itemEndRow})`, grupo.subtotalCliente)
    }
    applySubtotalStyle(subRow)
    subtotalRows.push(sr)
  })

  // Grand total with SUM of subtotals
  ws.addRow([])
  const totalRow = ws.addRow(['', '', '', '', '', '', '', '', '', '', 'TOTAL EQUIPOS:'])
  const tr = totalRow.number

  if (subtotalRows.length > 0) {
    const sumInternoFormula = subtotalRows.map(r => `L${r}`).join('+')
    const sumClienteFormula = subtotalRows.map(r => `M${r}`).join('+')
    setFormulaWithFormat(totalRow, 12, sumInternoFormula, cot.totalEquiposInterno)
    setFormulaWithFormat(totalRow, 13, sumClienteFormula, cot.totalEquiposCliente)
  }
  applyTotalStyle(totalRow)

  return tr
}

// ============================================
// HOJA: SERVICIOS (with formulas)
// ============================================
// Columns: A=Nombre, B=Descripción, C=Recurso, D=Unidad, E=Fórmula,
//          F=Cantidad, G=HH Base, H=HH Repetido, I=HH Total,
//          J=F.Seguridad, K=Dificultad, L=Margen, M=$/Hora,
//          N=Costo Interno(formula), O=Costo Cliente(formula)
function buildServiciosSheetEditable(wb: any, cot: Cotizacion): number {
  const ws = wb.addWorksheet('Servicios')
  ws.columns = [
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Descripción', key: 'descripcion', width: 35 },
    { header: 'Recurso', key: 'recurso', width: 16 },
    { header: 'Unidad', key: 'unidad', width: 12 },
    { header: 'Fórmula', key: 'formula', width: 12 },
    { header: 'Cantidad', key: 'cantidad', width: 10 },
    { header: 'HH Base', key: 'hhBase', width: 10 },
    { header: 'HH Repetido', key: 'hhRepetido', width: 12 },
    { header: 'HH Total', key: 'hhTotal', width: 10 },
    { header: 'F.Seguridad', key: 'fSeguridad', width: 12 },
    { header: 'Dificultad', key: 'dificultad', width: 10 },
    { header: 'Margen', key: 'margen', width: 10 },
    { header: '$/Hora', key: 'costoHora', width: 10 },
    { header: 'Costo Interno', key: 'costoInterno', width: 14 },
    { header: 'Costo Cliente', key: 'costoCliente', width: 14 },
  ]
  applyHeaderStyle(ws.getRow(1))

  const subtotalRows: number[] = []

  cot.servicios.forEach(grupo => {
    const edtName = grupo.edt?.nombre || ''
    const groupRow = ws.addRow([`▸ ${grupo.nombre}${edtName ? ` (EDT: ${edtName})` : ''}`])
    applyGroupStyle(groupRow)

    const itemStartRow = ws.rowCount + 1

    grupo.items.forEach(item => {
      const row = ws.addRow([
        item.nombre,
        item.descripcion,
        item.recursoNombre,
        item.unidadServicioNombre,
        item.formula,
        item.cantidad,
        item.horaBase ?? 0,
        item.horaRepetido ?? 0,
        item.horaTotal, // HH Total kept as value (depends on formula type logic)
        +(item.factorSeguridad ?? 1).toFixed(2),
        item.nivelDificultad ?? 1,
        +(item.margen ?? 1).toFixed(2),
        item.costoHora,
      ])
      const r = row.number

      // Costo Interno = HH Total * F.Seguridad * Dificultad * $/Hora
      setFormulaWithFormat(row, 14, `I${r}*J${r}*K${r}*M${r}`, item.costoInterno)
      // Costo Cliente = Costo Interno * Margen
      setFormulaWithFormat(row, 15, `N${r}*L${r}`, item.costoCliente)

      // Mark editable cells
      markInputCells(row, [6, 7, 8, 9, 10, 11, 12, 13]) // Cantidad, HH, factores, costoHora
      setCurrencyFormat(row, [13])
    })

    const itemEndRow = ws.rowCount

    const subRow = ws.addRow(['', '', '', '', '', '', '', '', '', '', '', '', `Subtotal ${grupo.nombre}:`])
    const sr = subRow.number
    if (itemStartRow <= itemEndRow) {
      setFormulaWithFormat(subRow, 14, `SUM(N${itemStartRow}:N${itemEndRow})`, grupo.subtotalInterno)
      setFormulaWithFormat(subRow, 15, `SUM(O${itemStartRow}:O${itemEndRow})`, grupo.subtotalCliente)
    }
    applySubtotalStyle(subRow)
    subtotalRows.push(sr)
  })

  ws.addRow([])
  const totalRow = ws.addRow(['', '', '', '', '', '', '', '', '', '', '', '', 'TOTAL SERVICIOS:'])
  const tr = totalRow.number

  if (subtotalRows.length > 0) {
    const sumInternoFormula = subtotalRows.map(r => `N${r}`).join('+')
    const sumClienteFormula = subtotalRows.map(r => `O${r}`).join('+')
    setFormulaWithFormat(totalRow, 14, sumInternoFormula, cot.totalServiciosInterno)
    setFormulaWithFormat(totalRow, 15, sumClienteFormula, cot.totalServiciosCliente)
  }
  applyTotalStyle(totalRow)

  return tr
}

// ============================================
// HOJA: GASTOS (with formulas)
// ============================================
// Columns: A=Nombre, B=Descripción, C=Cantidad, D=P.Unitario,
//          E=F.Seguridad, F=Margen,
//          G=Costo Interno(formula), H=Costo Cliente(formula)
function buildGastosSheetEditable(wb: any, cot: Cotizacion): number {
  const ws = wb.addWorksheet('Gastos')
  ws.columns = [
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Descripción', key: 'descripcion', width: 35 },
    { header: 'Cantidad', key: 'cantidad', width: 10 },
    { header: 'P.Unitario', key: 'precioUnitario', width: 14 },
    { header: 'F.Seguridad', key: 'fSeguridad', width: 12 },
    { header: 'Margen', key: 'margen', width: 10 },
    { header: 'Costo Interno', key: 'costoInterno', width: 14 },
    { header: 'Costo Cliente', key: 'costoCliente', width: 14 },
  ]
  applyHeaderStyle(ws.getRow(1))

  const subtotalRows: number[] = []

  cot.gastos.forEach(grupo => {
    const groupRow = ws.addRow([`▸ ${grupo.nombre}`, grupo.descripcion || ''])
    applyGroupStyle(groupRow)

    const itemStartRow = ws.rowCount + 1

    grupo.items.forEach(item => {
      const row = ws.addRow([
        item.nombre,
        item.descripcion || '',
        item.cantidad,
        item.precioUnitario,
        +(item.factorSeguridad ?? 1).toFixed(2),
        +(item.margen ?? 1).toFixed(2),
      ])
      const r = row.number

      // Costo Interno = Cantidad * P.Unitario * F.Seguridad
      setFormulaWithFormat(row, 7, `C${r}*D${r}*E${r}`, item.costoInterno)
      // Costo Cliente = Costo Interno * Margen
      setFormulaWithFormat(row, 8, `G${r}*F${r}`, item.costoCliente)

      // Mark editable cells
      markInputCells(row, [3, 4, 5, 6]) // Cantidad, P.Unitario, F.Seguridad, Margen
      setCurrencyFormat(row, [4])
    })

    const itemEndRow = ws.rowCount

    const subRow = ws.addRow(['', '', '', '', '', `Subtotal ${grupo.nombre}:`])
    const sr = subRow.number
    if (itemStartRow <= itemEndRow) {
      setFormulaWithFormat(subRow, 7, `SUM(G${itemStartRow}:G${itemEndRow})`, grupo.subtotalInterno)
      setFormulaWithFormat(subRow, 8, `SUM(H${itemStartRow}:H${itemEndRow})`, grupo.subtotalCliente)
    }
    applySubtotalStyle(subRow)
    subtotalRows.push(sr)
  })

  ws.addRow([])
  const totalRow = ws.addRow(['', '', '', '', '', 'TOTAL GASTOS:'])
  const tr = totalRow.number

  if (subtotalRows.length > 0) {
    const sumInternoFormula = subtotalRows.map(r => `G${r}`).join('+')
    const sumClienteFormula = subtotalRows.map(r => `H${r}`).join('+')
    setFormulaWithFormat(totalRow, 7, sumInternoFormula, cot.totalGastosInterno)
    setFormulaWithFormat(totalRow, 8, sumClienteFormula, cot.totalGastosCliente)
  }
  applyTotalStyle(totalRow)

  return tr
}

// ============================================
// HOJA: RESUMEN (with cross-sheet formulas)
// ============================================
function buildResumenSheetEditable(
  wb: any,
  cot: Cotizacion,
  equiposTotalRow: number,
  serviciosTotalRow: number,
  gastosTotalRow: number
) {
  const ws = wb.addWorksheet('Resumen')
  ws.columns = [
    { width: 22 },
    { width: 35 },
    { width: 20 },
    { width: 20 },
  ]

  // Title
  const titleRow = ws.addRow([`COTIZACIÓN ${cot.codigo} (EDITABLE)`])
  titleRow.font = { bold: true, size: 14 }
  ws.addRow([])

  // Header info
  const infoFields: [string, string][] = [
    ['Nombre', cot.nombre],
    ['Cliente', cot.cliente?.nombre || '—'],
    ['RUC', cot.cliente?.ruc || '—'],
    ['Comercial', cot.comercial?.nombre || '—'],
    ['Fecha', formatDate(cot.fecha)],
    ['Moneda', cot.moneda || 'USD'],
    ['Revisión', cot.revision || '—'],
    ['Forma de Pago', cot.formaPago || '—'],
    ['Validez (días)', cot.validezOferta?.toString() || '—'],
    ['Estado', cot.estado],
  ]
  infoFields.forEach(([label, value]) => {
    const row = ws.addRow([label, value])
    row.getCell(1).font = { bold: true, size: 10 }
  })

  ws.addRow([])
  ws.addRow([])

  // Totals table header
  const totalsHeader = ws.addRow(['Sección', '', 'Total Interno', 'Total Cliente'])
  applyHeaderStyle(totalsHeader)

  // Equipos row — cross-sheet formulas
  const eqRow = ws.addRow(['Equipos'])
  const eqR = eqRow.number
  setFormulaWithFormat(eqRow, 3, `Equipos!L${equiposTotalRow}`, cot.totalEquiposInterno)
  setFormulaWithFormat(eqRow, 4, `Equipos!M${equiposTotalRow}`, cot.totalEquiposCliente)

  // Servicios row
  const svRow = ws.addRow(['Servicios'])
  setFormulaWithFormat(svRow, 3, `Servicios!N${serviciosTotalRow}`, cot.totalServiciosInterno)
  setFormulaWithFormat(svRow, 4, `Servicios!O${serviciosTotalRow}`, cot.totalServiciosCliente)

  // Gastos row
  const gsRow = ws.addRow(['Gastos'])
  const gsR = gsRow.number
  setFormulaWithFormat(gsRow, 3, `Gastos!G${gastosTotalRow}`, cot.totalGastosInterno)
  setFormulaWithFormat(gsRow, 4, `Gastos!H${gastosTotalRow}`, cot.totalGastosCliente)

  // Subtotal with SUM formula
  const subtotalRow = ws.addRow(['Subtotal'])
  const stR = subtotalRow.number
  setFormulaWithFormat(subtotalRow, 3, `SUM(C${eqR}:C${gsR})`, cot.totalInterno)
  setFormulaWithFormat(subtotalRow, 4, `SUM(D${eqR}:D${gsR})`, cot.totalCliente)
  applySubtotalStyle(subtotalRow)

  // Discount
  let descRow: any = null
  let descR = 0
  if (cot.descuento > 0) {
    descRow = ws.addRow([
      'Descuento',
      cot.descuentoEstado === 'aprobado' ? '(aprobado)' : `(${cot.descuentoEstado || 'pendiente'})`,
      '',
      -cot.descuento,
    ])
    descR = descRow.number
    setCurrencyFormat(descRow, [4])
    markInputCells(descRow, [4]) // Descuento is editable
  }

  // Grand total
  const grandRow = ws.addRow(['GRAN TOTAL'])
  if (cot.descuento > 0) {
    setFormulaWithFormat(grandRow, 4, `D${stR}+D${descR}`, cot.grandTotal) // descuento is negative
  } else {
    setFormulaWithFormat(grandRow, 4, `D${stR}`, cot.grandTotal)
  }
  applyTotalStyle(grandRow)
}

// ============================================
// HOJA: CONDICIONES Y EXCLUSIONES (same as original, no formulas needed)
// ============================================
function buildCondicionesSheet(wb: any, cot: Cotizacion) {
  const ws = wb.addWorksheet('Condiciones')
  ws.columns = [
    { width: 8 },
    { width: 20 },
    { width: 70 },
  ]

  const titleRow = ws.addRow(['', 'CONDICIONES COMERCIALES'])
  titleRow.font = { bold: true, size: 12 }
  ws.addRow([])

  if (cot.condiciones.length > 0) {
    const condHeader = ws.addRow(['#', 'Tipo', 'Descripción'])
    applyHeaderStyle(condHeader)
    cot.condiciones
      .sort((a, b) => a.orden - b.orden)
      .forEach((cond, i) => {
        ws.addRow([i + 1, cond.tipo || '—', cond.descripcion])
      })
  } else {
    ws.addRow(['', 'Sin condiciones registradas'])
  }

  ws.addRow([])
  ws.addRow([])

  const exclTitle = ws.addRow(['', 'EXCLUSIONES'])
  exclTitle.font = { bold: true, size: 12 }
  ws.addRow([])

  if (cot.exclusiones.length > 0) {
    const exclHeader = ws.addRow(['#', '', 'Descripción'])
    applyHeaderStyle(exclHeader)
    cot.exclusiones
      .sort((a, b) => a.orden - b.orden)
      .forEach((excl, i) => {
        ws.addRow([i + 1, '', excl.descripcion])
      })
  } else {
    ws.addRow(['', 'Sin exclusiones registradas'])
  }
}
