import type { Cotizacion } from '@/types'

const HEADER_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFF3F4F6' } }
const GROUP_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFDBEAFE' } }
const TOTAL_FILL = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFE5E7EB' } }
const CURRENCY_FMT = '#,##0.00'

function applyHeaderStyle(row: any) {
  row.font = { bold: true, size: 10 }
  row.fill = HEADER_FILL
  row.alignment = { vertical: 'middle' }
}

function applyGroupStyle(row: any, colCount: number) {
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

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    return new Date(dateStr).toLocaleDateString('es-PE', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch { return '—' }
}

// ============================================
// MAIN EXPORT FUNCTION
// ============================================
export async function exportarCotizacionAExcel(cotizacion: Cotizacion): Promise<void> {
  const ExcelJS = (await import('exceljs')).default
  const wb = new ExcelJS.Workbook()

  buildResumenSheet(wb, cotizacion)
  buildEquiposSheet(wb, cotizacion)
  buildServiciosSheet(wb, cotizacion)
  buildGastosSheet(wb, cotizacion)
  buildCondicionesSheet(wb, cotizacion)

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${cotizacion.codigo}_${cotizacion.nombre.replace(/[^a-zA-Z0-9áéíóúñÁÉÍÓÚÑ ]/g, '').substring(0, 30).trim()}.xlsx`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================
// HOJA 1: RESUMEN
// ============================================
function buildResumenSheet(wb: any, cot: Cotizacion) {
  const ws = wb.addWorksheet('Resumen')
  ws.columns = [
    { width: 22 },
    { width: 35 },
    { width: 20 },
    { width: 20 },
  ]

  // Title
  const titleRow = ws.addRow([`COTIZACIÓN ${cot.codigo}`])
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

  // Totals table
  const totalsHeader = ws.addRow(['Sección', '', 'Total Interno', 'Total Cliente'])
  applyHeaderStyle(totalsHeader)

  const sections: [string, number, number][] = [
    ['Equipos', cot.totalEquiposInterno, cot.totalEquiposCliente],
    ['Servicios', cot.totalServiciosInterno, cot.totalServiciosCliente],
    ['Gastos', cot.totalGastosInterno, cot.totalGastosCliente],
  ]
  sections.forEach(([name, interno, cliente]) => {
    const row = ws.addRow([name, '', interno, cliente])
    setCurrencyFormat(row, [3, 4])
  })

  // Subtotal
  const subtotalRow = ws.addRow(['Subtotal', '', cot.totalInterno, cot.totalCliente])
  applySubtotalStyle(subtotalRow)
  setCurrencyFormat(subtotalRow, [3, 4])

  // Discount
  if (cot.descuento > 0) {
    const descRow = ws.addRow(['Descuento', cot.descuentoEstado === 'aprobado' ? '(aprobado)' : `(${cot.descuentoEstado || 'pendiente'})`, '', -cot.descuento])
    setCurrencyFormat(descRow, [4])
  }

  // Grand total
  const grandRow = ws.addRow(['GRAN TOTAL', '', '', cot.grandTotal])
  applyTotalStyle(grandRow)
  setCurrencyFormat(grandRow, [4])
}

// ============================================
// HOJA 2: EQUIPOS
// ============================================
function buildEquiposSheet(wb: any, cot: Cotizacion) {
  const ws = wb.addWorksheet('Equipos')
  const cols = [
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
  ws.columns = cols

  const headerRow = ws.getRow(1)
  applyHeaderStyle(headerRow)

  const currencyCols = [7, 10, 11, 12, 13]

  cot.equipos.forEach(grupo => {
    // Group header row
    const groupRow = ws.addRow([`▸ ${grupo.nombre}`, grupo.descripcion || ''])
    applyGroupStyle(groupRow, cols.length)

    // Items
    grupo.items.forEach(item => {
      const row = ws.addRow({
        codigo: item.codigo,
        descripcion: item.descripcion,
        marca: item.marca,
        categoria: item.categoria,
        unidad: item.unidad,
        cantidad: item.cantidad,
        precioLista: item.precioLista,
        factorCosto: +(item.factorCosto ?? 1).toFixed(2),
        factorVenta: +(item.factorVenta ?? 1.15).toFixed(2),
        precioInterno: item.precioInterno,
        precioCliente: item.precioCliente,
        totalInterno: item.costoInterno,
        totalCliente: item.costoCliente,
      })
      setCurrencyFormat(row, currencyCols)
    })

    // Subtotal row
    const subRow = ws.addRow(['', '', '', '', '', '', '', '', '', '', `Subtotal ${grupo.nombre}:`, grupo.subtotalInterno, grupo.subtotalCliente])
    applySubtotalStyle(subRow)
    setCurrencyFormat(subRow, [12, 13])
  })

  // Grand total
  ws.addRow([])
  const totalRow = ws.addRow(['', '', '', '', '', '', '', '', '', '', 'TOTAL EQUIPOS:', cot.totalEquiposInterno, cot.totalEquiposCliente])
  applyTotalStyle(totalRow)
  setCurrencyFormat(totalRow, [12, 13])
}

// ============================================
// HOJA 3: SERVICIOS
// ============================================
function buildServiciosSheet(wb: any, cot: Cotizacion) {
  const ws = wb.addWorksheet('Servicios')
  const cols = [
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
  ws.columns = cols

  const headerRow = ws.getRow(1)
  applyHeaderStyle(headerRow)

  const currencyCols = [13, 14, 15]

  cot.servicios.forEach(grupo => {
    const edtName = grupo.edt?.nombre || ''
    const groupRow = ws.addRow([`▸ ${grupo.nombre}${edtName ? ` (EDT: ${edtName})` : ''}`])
    applyGroupStyle(groupRow, cols.length)

    grupo.items.forEach(item => {
      const row = ws.addRow({
        nombre: item.nombre,
        descripcion: item.descripcion,
        recurso: item.recursoNombre,
        unidad: item.unidadServicioNombre,
        formula: item.formula,
        cantidad: item.cantidad,
        hhBase: item.horaBase ?? 0,
        hhRepetido: item.horaRepetido ?? 0,
        hhTotal: item.horaTotal,
        fSeguridad: +(item.factorSeguridad ?? 1).toFixed(2),
        dificultad: item.nivelDificultad ?? 1,
        margen: +(item.margen ?? 1).toFixed(2),
        costoHora: item.costoHora,
        costoInterno: item.costoInterno,
        costoCliente: item.costoCliente,
      })
      setCurrencyFormat(row, currencyCols)
    })

    const subRow = ws.addRow(['', '', '', '', '', '', '', '', '', '', '', '', `Subtotal ${grupo.nombre}:`, grupo.subtotalInterno, grupo.subtotalCliente])
    applySubtotalStyle(subRow)
    setCurrencyFormat(subRow, [14, 15])
  })

  ws.addRow([])
  const totalRow = ws.addRow(['', '', '', '', '', '', '', '', '', '', '', '', 'TOTAL SERVICIOS:', cot.totalServiciosInterno, cot.totalServiciosCliente])
  applyTotalStyle(totalRow)
  setCurrencyFormat(totalRow, [14, 15])
}

// ============================================
// HOJA 4: GASTOS
// ============================================
function buildGastosSheet(wb: any, cot: Cotizacion) {
  const ws = wb.addWorksheet('Gastos')
  const cols = [
    { header: 'Nombre', key: 'nombre', width: 30 },
    { header: 'Descripción', key: 'descripcion', width: 35 },
    { header: 'Cantidad', key: 'cantidad', width: 10 },
    { header: 'P.Unitario', key: 'precioUnitario', width: 14 },
    { header: 'F.Seguridad', key: 'fSeguridad', width: 12 },
    { header: 'Margen', key: 'margen', width: 10 },
    { header: 'Costo Interno', key: 'costoInterno', width: 14 },
    { header: 'Costo Cliente', key: 'costoCliente', width: 14 },
  ]
  ws.columns = cols

  const headerRow = ws.getRow(1)
  applyHeaderStyle(headerRow)

  const currencyCols = [4, 7, 8]

  cot.gastos.forEach(grupo => {
    const groupRow = ws.addRow([`▸ ${grupo.nombre}`, grupo.descripcion || ''])
    applyGroupStyle(groupRow, cols.length)

    grupo.items.forEach(item => {
      const row = ws.addRow({
        nombre: item.nombre,
        descripcion: item.descripcion || '',
        cantidad: item.cantidad,
        precioUnitario: item.precioUnitario,
        fSeguridad: +(item.factorSeguridad ?? 1).toFixed(2),
        margen: +(item.margen ?? 1).toFixed(2),
        costoInterno: item.costoInterno,
        costoCliente: item.costoCliente,
      })
      setCurrencyFormat(row, currencyCols)
    })

    const subRow = ws.addRow(['', '', '', '', '', `Subtotal ${grupo.nombre}:`, grupo.subtotalInterno, grupo.subtotalCliente])
    applySubtotalStyle(subRow)
    setCurrencyFormat(subRow, [7, 8])
  })

  ws.addRow([])
  const totalRow = ws.addRow(['', '', '', '', '', 'TOTAL GASTOS:', cot.totalGastosInterno, cot.totalGastosCliente])
  applyTotalStyle(totalRow)
  setCurrencyFormat(totalRow, [7, 8])
}

// ============================================
// HOJA 5: CONDICIONES Y EXCLUSIONES
// ============================================
function buildCondicionesSheet(wb: any, cot: Cotizacion) {
  const ws = wb.addWorksheet('Condiciones')
  ws.columns = [
    { width: 8 },
    { width: 20 },
    { width: 70 },
  ]

  // Condiciones section
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

  // Exclusiones section
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
