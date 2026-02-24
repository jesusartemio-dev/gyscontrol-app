/**
 * Genera un Excel en formato Deneen para una Valorización por HH.
 *
 * Sheets:
 *   1. Summary — 1 fila por grupo PROYECTO×RECURSO, totales con fórmulas
 *   2..N. Detalle por grupo — líneas individuales con OT breakdown
 *   N+1. Costo HH — tabla de tarifas y descuentos del cliente
 */
import ExcelJS from 'exceljs'

// ─── Types (matching the DB query result) ────────────────────────
export interface ExportLineaHH {
  id: string
  proyectoId: string
  recursoId: string
  fecha: string | Date
  detalle: string | null
  modalidad: string
  horasReportadas: number
  horasStd: number
  horasOT125: number
  horasOT135: number
  horasOT200: number
  horasEquivalente: number
  tarifaHora: number
  moneda: string
  costoLinea: number
  proyecto: { id: string; codigo: string; nombre: string }
  recurso: { id: string; nombre: string }
}

export interface ExportValHH {
  id: string
  clienteId: string
  periodoInicio: string | Date
  periodoFin: string | Date
  totalHorasReportadas: number
  totalHorasEquivalentes: number
  subtotal: number
  descuentoPct: number
  descuentoMonto: number
  cliente: { id: string; nombre: string }
  valorizacion: {
    id: string
    codigo: string
    moneda: string
    montoValorizacion: number
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
    periodoInicio: string | Date
    periodoFin: string | Date
  }
  lineas: ExportLineaHH[]
  tarifas: Array<{
    recursoId: string
    recursoNombre?: string
    recurso?: { nombre: string }
    modalidad: string
    tarifaVenta: number
  }>
  descuentos: Array<{
    desdeHoras: number
    descuentoPct: number
    orden: number
  }>
}

// ─── Grupos ──────────────────────────────────────────────────────
interface GrupoResumen {
  key: string
  proyectoCodigo: string
  recursoNombre: string
  modalidad: string          // predominant modalidad for the group
  totalHoras: number         // sum horasEquivalente
  tarifaHora: number
  totalCosto: number         // sum costoLinea
  lineas: ExportLineaHH[]
}

// ─── Colores y estilos ──────────────────────────────────────────
const C = {
  headerBg:   '1F4E79',
  headerText: 'FFFFFF',
  subtotalBg: 'D6E4F0',
  totalBg:    '1F4E79',
  totalText:  'FFFFFF',
  altRow:     'F2F7FB',
  border:     'AAAAAA',
}

const thinBorder: Partial<ExcelJS.Borders> = {
  top:    { style: 'thin', color: { argb: C.border } },
  bottom: { style: 'thin', color: { argb: C.border } },
  left:   { style: 'thin', color: { argb: C.border } },
  right:  { style: 'thin', color: { argb: C.border } },
}

const fontBase: Partial<ExcelJS.Font> = { name: 'Calibri', size: 11 }
const fontBold: Partial<ExcelJS.Font> = { ...fontBase, bold: true }
const fontHeader: Partial<ExcelJS.Font> = { ...fontBase, bold: true, color: { argb: C.headerText } }
const fontTotal: Partial<ExcelJS.Font> = { ...fontBase, bold: true, color: { argb: C.totalText } }

const fillHeader: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } }
const fillSubtotal: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.subtotalBg } }
const fillTotal: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.totalBg } }
const fillAlt: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.altRow } }

const numFmt2 = '#,##0.00'
const numFmt1 = '#,##0.0'
const numFmt4 = '#,##0.0000'

// ─── Helpers ────────────────────────────────────────────────────
function fmtDateDDMMYYYY(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const dd = String(date.getUTCDate()).padStart(2, '0')
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const yyyy = date.getUTCFullYear()
  return `${dd}/${mm}/${yyyy}`
}

function fmtDateYYYYMMDD(d: string | Date): string {
  const date = typeof d === 'string' ? new Date(d) : d
  const yyyy = date.getUTCFullYear()
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0')
  const dd = String(date.getUTCDate()).padStart(2, '0')
  return `${yyyy}${mm}${dd}`
}

function getApellido(nombre: string): string {
  const parts = nombre.trim().split(/\s+/)
  // Assume "First Last" or "First Middle Last"
  return parts.length > 1 ? parts[parts.length - 1] : parts[0]
}

function makeSheetName(proyectoCodigo: string, periodoFin: string | Date, recursoNombre: string): string {
  const fecha = fmtDateYYYYMMDD(periodoFin)
  const apellido = getApellido(recursoNombre)
  const raw = `${proyectoCodigo}-${fecha}-${apellido}`
  return raw.substring(0, 31) // Excel limit
}

function applyHeaderStyle(row: ExcelJS.Row, colStart: number, colEnd: number) {
  for (let c = colStart; c <= colEnd; c++) {
    const cell = row.getCell(c)
    cell.font = fontHeader
    cell.fill = fillHeader
    cell.border = thinBorder
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  }
}

function buildGrupos(lineas: ExportLineaHH[]): GrupoResumen[] {
  const map = new Map<string, GrupoResumen>()

  for (const l of lineas) {
    const key = `${l.proyecto.codigo}__${l.recurso.nombre}`
    const existing = map.get(key)
    if (existing) {
      existing.totalHoras += l.horasEquivalente
      existing.totalCosto += l.costoLinea
      existing.lineas.push(l)
    } else {
      map.set(key, {
        key,
        proyectoCodigo: l.proyecto.codigo,
        recursoNombre: l.recurso.nombre,
        modalidad: l.modalidad,
        totalHoras: l.horasEquivalente,
        tarifaHora: l.tarifaHora,
        totalCosto: l.costoLinea,
        lineas: [l],
      })
    }
  }

  // Round totals
  const result = Array.from(map.values())
  for (const g of result) {
    g.totalHoras = +g.totalHoras.toFixed(4)
    g.totalCosto = +g.totalCosto.toFixed(2)
    // Sort lines by fecha ASC
    g.lineas.sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
  }

  return result
}

// ─── Main export function ────────────────────────────────────────
export async function generarExcelValorizacionHH(data: ExportValHH): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'GySControl'
  wb.created = new Date()

  const grupos = buildGrupos(data.lineas)
  const periodoFin = data.periodoFin
  const val = data.valorizacion

  // ═══════════════════════════════════════════════════════════
  // SHEET 1: Summary
  // ═══════════════════════════════════════════════════════════
  const ws = wb.addWorksheet('Summary')

  // Column widths (B=2, C=3, ... L=12)
  ws.getColumn(2).width = 6
  ws.getColumn(3).width = 18
  ws.getColumn(4).width = 22
  ws.getColumn(5).width = 14
  ws.getColumn(6).width = 10
  ws.getColumn(7).width = 12
  ws.getColumn(8).width = 12
  ws.getColumn(9).width = 14
  ws.getColumn(10).width = 14
  ws.getColumn(11).width = 14
  ws.getColumn(12).width = 12

  // Row 2: Headers
  const headerRow = ws.getRow(2)
  headerRow.getCell(2).value = 'ITEM'
  headerRow.getCell(3).value = 'PROYECT'
  headerRow.getCell(4).value = 'NAME'
  headerRow.getCell(5).value = 'DATE'
  headerRow.getCell(6).value = 'HOURS'
  headerRow.getCell(7).value = 'COST HH ($)'
  headerRow.getCell(8).value = 'COST $'
  headerRow.getCell(9).value = { richText: [{ text: 'DESCUENTO\n10%' }] }
  headerRow.getCell(10).value = { richText: [{ text: 'DESCUENTO\n8%' }] }
  headerRow.getCell(11).value = { richText: [{ text: 'DESCUENTO\n5%' }] }
  headerRow.getCell(12).value = 'TOTAL $'
  headerRow.height = 30
  applyHeaderStyle(headerRow, 2, 12)

  // Data rows (one per grupo)
  const dataStartRow = 3
  let currentRow = dataStartRow

  for (let i = 0; i < grupos.length; i++) {
    const g = grupos[i]
    const r = ws.getRow(currentRow)
    r.getCell(2).value = i + 1
    r.getCell(3).value = g.proyectoCodigo
    r.getCell(4).value = g.recursoNombre
    r.getCell(5).value = fmtDateDDMMYYYY(periodoFin)
    r.getCell(6).value = +g.totalHoras.toFixed(2)
    r.getCell(7).value = g.tarifaHora
    // H = F * G (formula)
    r.getCell(8).value = { formula: `F${currentRow}*G${currentRow}` }
    // I, J, K — descuentos are 0 per row (totals applied at footer)
    r.getCell(9).value = 0
    r.getCell(10).value = 0
    r.getCell(11).value = 0
    // L = H - I - J - K
    r.getCell(12).value = { formula: `H${currentRow}-I${currentRow}-J${currentRow}-K${currentRow}` }

    // Style
    for (let c = 2; c <= 12; c++) {
      const cell = r.getCell(c)
      cell.font = fontBase
      cell.border = thinBorder
      cell.alignment = { vertical: 'middle' }
      if (c >= 6) {
        cell.numFmt = numFmt2
        cell.alignment = { horizontal: 'right', vertical: 'middle' }
      }
    }
    // Alternate row
    if (i % 2 === 1) {
      for (let c = 2; c <= 12; c++) {
        r.getCell(c).fill = fillAlt
      }
    }

    currentRow++
  }

  const lastDataRow = currentRow - 1

  // ── Footer rows ──
  currentRow++ // blank row

  // Sub Total
  const subTotalRow = currentRow
  const rSub = ws.getRow(subTotalRow)
  rSub.getCell(2).value = 'Sub Total'
  rSub.getCell(2).font = fontBold
  rSub.getCell(12).value = { formula: `SUM(L${dataStartRow}:L${lastDataRow})` }
  rSub.getCell(12).numFmt = numFmt2
  rSub.getCell(12).font = fontBold
  for (let c = 2; c <= 12; c++) {
    rSub.getCell(c).fill = fillSubtotal
    rSub.getCell(c).border = thinBorder
  }
  currentRow++

  // Adelantos
  const adelantoRow = currentRow
  const rAdel = ws.getRow(adelantoRow)
  rAdel.getCell(2).value = 'Adelantos'
  rAdel.getCell(2).font = fontBold
  rAdel.getCell(12).value = val.adelantoMonto || 0
  rAdel.getCell(12).numFmt = numFmt2
  rAdel.getCell(12).font = fontBold
  for (let c = 2; c <= 12; c++) {
    rAdel.getCell(c).border = thinBorder
  }
  currentRow++

  // Diferencia
  const difRow = currentRow
  const rDif = ws.getRow(difRow)
  rDif.getCell(2).value = 'Diferencia del Total de Horas menos adelantos'
  rDif.getCell(2).font = fontBold
  rDif.getCell(12).value = { formula: `L${subTotalRow}-L${adelantoRow}` }
  rDif.getCell(12).numFmt = numFmt2
  rDif.getCell(12).font = fontBold
  for (let c = 2; c <= 12; c++) {
    rDif.getCell(c).fill = fillSubtotal
    rDif.getCell(c).border = thinBorder
  }
  currentRow++

  // IGV
  const igvRow = currentRow
  const rIgv = ws.getRow(igvRow)
  const igvPct = val.igvPorcentaje || 18
  rIgv.getCell(2).value = `IGV $ (${igvPct}%)`
  rIgv.getCell(2).font = fontBold
  rIgv.getCell(12).value = { formula: `L${difRow}*${igvPct / 100}` }
  rIgv.getCell(12).numFmt = numFmt2
  rIgv.getCell(12).font = fontBold
  for (let c = 2; c <= 12; c++) {
    rIgv.getCell(c).border = thinBorder
  }
  currentRow++

  // TOTAL $
  const totalRow = currentRow
  const rTot = ws.getRow(totalRow)
  rTot.getCell(2).value = 'TOTAL $'
  rTot.getCell(2).font = fontTotal
  rTot.getCell(12).value = { formula: `L${difRow}+L${igvRow}` }
  rTot.getCell(12).numFmt = numFmt2
  rTot.getCell(12).font = fontTotal
  for (let c = 2; c <= 12; c++) {
    rTot.getCell(c).fill = fillTotal
    rTot.getCell(c).border = thinBorder
    if (!rTot.getCell(c).font?.color) {
      rTot.getCell(c).font = fontTotal
    }
  }

  // ═══════════════════════════════════════════════════════════
  // SHEETS 2..N: Detail per group
  // ═══════════════════════════════════════════════════════════
  for (const g of grupos) {
    const sheetName = makeSheetName(g.proyectoCodigo, periodoFin, g.recursoNombre)

    // Ensure unique sheet name
    let finalName = sheetName
    let suffix = 2
    while (wb.getWorksheet(finalName)) {
      finalName = sheetName.substring(0, 28) + `-${suffix}`
      suffix++
    }

    const ds = wb.addWorksheet(finalName)

    // Column widths
    ds.getColumn(1).width = 14  // DATE
    ds.getColumn(2).width = 45  // DETAILS
    ds.getColumn(3).width = 14  // HORAS REPORTADAS
    ds.getColumn(4).width = 12  // ESTÁNDAR
    ds.getColumn(5).width = 10  // OT1.25
    ds.getColumn(6).width = 10  // OT1.35
    ds.getColumn(7).width = 10  // OT2.0
    ds.getColumn(8).width = 12  // TOTAL

    // Row 1: Title (merged A1:H1)
    const predominantMod = g.lineas.filter(l => l.modalidad === 'campo').length > g.lineas.length / 2
      ? 'HORAS CAMPO'
      : 'HORAS OFICINA'
    ds.mergeCells('A1:H1')
    const titleCell = ds.getCell('A1')
    titleCell.value = predominantMod
    titleCell.font = fontBold
    titleCell.fill = fillSubtotal
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' }
    titleCell.border = thinBorder

    // Row 2: Headers
    const hRow = ds.getRow(2)
    const detailHeaders = ['DATE', 'DETAILS', 'HORAS REPORTADAS', 'ESTÁNDAR', 'OT1.25', 'OT1.35', 'OT2.0', 'TOTAL']
    detailHeaders.forEach((h, idx) => {
      hRow.getCell(idx + 1).value = h
    })
    applyHeaderStyle(hRow, 1, 8)

    // Data rows
    const detailStartRow = 3
    let dRow = detailStartRow

    for (let li = 0; li < g.lineas.length; li++) {
      const l = g.lineas[li]
      const r = ds.getRow(dRow)
      r.getCell(1).value = fmtDateDDMMYYYY(l.fecha)
      r.getCell(2).value = l.detalle || ''
      r.getCell(3).value = l.horasReportadas
      r.getCell(3).numFmt = numFmt1
      r.getCell(4).value = l.horasStd
      r.getCell(4).numFmt = numFmt1
      r.getCell(5).value = l.horasOT125
      r.getCell(5).numFmt = numFmt2
      r.getCell(6).value = l.horasOT135
      r.getCell(6).numFmt = numFmt2
      r.getCell(7).value = l.horasOT200
      r.getCell(7).numFmt = numFmt1
      // H = D + E*1.25 + F*1.35 + G*2
      r.getCell(8).value = { formula: `D${dRow}+E${dRow}*1.25+F${dRow}*1.35+G${dRow}*2` }
      r.getCell(8).numFmt = numFmt2

      // Style
      for (let c = 1; c <= 8; c++) {
        const cell = r.getCell(c)
        cell.font = fontBase
        cell.border = thinBorder
        if (c >= 3) cell.alignment = { horizontal: 'right', vertical: 'middle' }
      }
      // Alternate row
      if (li % 2 === 1) {
        for (let c = 1; c <= 8; c++) {
          r.getCell(c).fill = fillAlt
        }
      }

      dRow++
    }

    const lastDetailRow = dRow - 1

    // Total row
    const tRow = ds.getRow(dRow)
    tRow.getCell(1).value = 'TOTAL (HRs)'
    tRow.getCell(1).font = fontBold
    tRow.getCell(8).value = { formula: `SUM(H${detailStartRow}:H${lastDetailRow})` }
    tRow.getCell(8).numFmt = numFmt2
    tRow.getCell(8).font = fontBold
    for (let c = 1; c <= 8; c++) {
      tRow.getCell(c).fill = fillSubtotal
      tRow.getCell(c).border = thinBorder
    }
  }

  // ═══════════════════════════════════════════════════════════
  // LAST SHEET: Costo HH
  // ═══════════════════════════════════════════════════════════
  const cs = wb.addWorksheet('Costo HH')

  cs.getColumn(1).width = 6
  cs.getColumn(2).width = 30
  cs.getColumn(3).width = 14
  cs.getColumn(4).width = 14

  // Row 2: Headers
  const csHeader = cs.getRow(2)
  csHeader.getCell(1).value = 'ITEM'
  csHeader.getCell(2).value = 'CATEGORIA'
  csHeader.getCell(3).value = 'OFICINA'
  csHeader.getCell(4).value = 'CAMPO'
  applyHeaderStyle(csHeader, 1, 4)

  // Build tarifa rows: group by recurso, show oficina+campo in same row
  const tarifasByRecurso = new Map<string, { nombre: string; oficina: number | null; campo: number | null }>()
  for (const t of data.tarifas) {
    const nombre = t.recursoNombre || t.recurso?.nombre || t.recursoId
    if (!tarifasByRecurso.has(nombre)) {
      tarifasByRecurso.set(nombre, { nombre, oficina: null, campo: null })
    }
    const entry = tarifasByRecurso.get(nombre)!
    if (t.modalidad === 'oficina') entry.oficina = t.tarifaVenta
    else if (t.modalidad === 'campo') entry.campo = t.tarifaVenta
  }

  let csRow = 3
  let csItem = 1
  for (const [, entry] of tarifasByRecurso) {
    const r = cs.getRow(csRow)
    r.getCell(1).value = csItem
    r.getCell(2).value = entry.nombre
    r.getCell(3).value = entry.oficina !== null ? entry.oficina : ''
    r.getCell(3).numFmt = numFmt2
    r.getCell(4).value = entry.campo !== null ? entry.campo : ''
    r.getCell(4).numFmt = numFmt2
    for (let c = 1; c <= 4; c++) {
      r.getCell(c).font = fontBase
      r.getCell(c).border = thinBorder
    }
    csRow++
    csItem++
  }

  // NOTAS section
  csRow += 2
  const notasHeader = cs.getRow(csRow)
  notasHeader.getCell(1).value = 'NOTAS (Horas de Oficina)'
  notasHeader.getCell(1).font = fontBold
  csRow++

  const notas = [
    'Tasa horaria STD 48 HH x semana',
    'Tasa horario fuera de STD de acuerdo a ley',
  ]
  notas.forEach((nota, idx) => {
    const r = cs.getRow(csRow)
    r.getCell(1).value = idx + 1
    r.getCell(2).value = nota
    r.getCell(1).font = fontBase
    r.getCell(2).font = fontBase
    csRow++
  })

  // DESCUENTOS section
  csRow += 2
  const descHeader = cs.getRow(csRow)
  descHeader.getCell(1).value = 'DESCUENTOS:'
  descHeader.getCell(1).font = fontBold
  csRow++

  const descuentosSorted = [...data.descuentos].sort((a, b) => a.orden - b.orden)
  descuentosSorted.forEach((d, idx) => {
    const r = cs.getRow(csRow)
    r.getCell(1).value = idx + 1
    const pctStr = (d.descuentoPct * 100).toFixed(0)
    const adicional = idx > 0 ? ' ADICIONAL' : ''
    r.getCell(2).value = `> ${d.desdeHoras} HH DSCTO DE ${pctStr}%${adicional}`
    r.getCell(1).font = fontBase
    r.getCell(2).font = fontBase
    csRow++
  })

  // ═══════════════════════════════════════════════════════════
  // Generate buffer
  // ═══════════════════════════════════════════════════════════
  const arrayBuffer = await wb.xlsx.writeBuffer()
  return Buffer.from(arrayBuffer)
}
