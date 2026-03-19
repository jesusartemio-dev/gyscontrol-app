import ExcelJS from 'exceljs'

// Tabla de valoración ordenada como DS 024-2016-EM (filas 4-28 de hoja Valoración)
const VALORACION_ROWS: Array<{ key: string; probNum: number; sevLetra: string; valor: number; nivel: string }> = [
  { key: '1A', probNum: 1, sevLetra: 'A', valor: 1,  nivel: 'ALTO' },
  { key: '1B', probNum: 1, sevLetra: 'B', valor: 2,  nivel: 'ALTO' },
  { key: '2A', probNum: 2, sevLetra: 'A', valor: 3,  nivel: 'ALTO' },
  { key: '1C', probNum: 1, sevLetra: 'C', valor: 4,  nivel: 'ALTO' },
  { key: '2B', probNum: 2, sevLetra: 'B', valor: 5,  nivel: 'ALTO' },
  { key: '3A', probNum: 3, sevLetra: 'A', valor: 6,  nivel: 'ALTO' },
  { key: '1D', probNum: 1, sevLetra: 'D', valor: 7,  nivel: 'ALTO' },
  { key: '2C', probNum: 2, sevLetra: 'C', valor: 8,  nivel: 'ALTO' },
  { key: '3B', probNum: 3, sevLetra: 'B', valor: 9,  nivel: 'MEDIO' },
  { key: '4A', probNum: 4, sevLetra: 'A', valor: 10, nivel: 'MEDIO' },
  { key: '1E', probNum: 1, sevLetra: 'E', valor: 11, nivel: 'MEDIO' },
  { key: '2D', probNum: 2, sevLetra: 'D', valor: 12, nivel: 'MEDIO' },
  { key: '3C', probNum: 3, sevLetra: 'C', valor: 13, nivel: 'MEDIO' },
  { key: '4B', probNum: 4, sevLetra: 'B', valor: 14, nivel: 'MEDIO' },
  { key: '5A', probNum: 5, sevLetra: 'A', valor: 15, nivel: 'BAJO' },
  { key: '2E', probNum: 2, sevLetra: 'E', valor: 16, nivel: 'BAJO' },
  { key: '3D', probNum: 3, sevLetra: 'D', valor: 17, nivel: 'BAJO' },
  { key: '4C', probNum: 4, sevLetra: 'C', valor: 18, nivel: 'BAJO' },
  { key: '5B', probNum: 5, sevLetra: 'B', valor: 19, nivel: 'BAJO' },
  { key: '3E', probNum: 3, sevLetra: 'E', valor: 20, nivel: 'BAJO' },
  { key: '4D', probNum: 4, sevLetra: 'D', valor: 21, nivel: 'BAJO' },
  { key: '5C', probNum: 5, sevLetra: 'C', valor: 22, nivel: 'BAJO' },
  { key: '4E', probNum: 4, sevLetra: 'E', valor: 23, nivel: 'BAJO' },
  { key: '5D', probNum: 5, sevLetra: 'D', valor: 24, nivel: 'BAJO' },
  { key: '5E', probNum: 5, sevLetra: 'E', valor: 25, nivel: 'BAJO' },
]

// Lookup for static coloring
const TABLA_VALORACION: Record<string, { valor: number; nivel: string }> = {}
for (const r of VALORACION_ROWS) {
  TABLA_VALORACION[r.key] = { valor: r.valor, nivel: r.nivel }
}

function getNivelColor(nivel: string): string {
  switch (nivel) {
    case 'ALTO': return 'FFCC0000'
    case 'MEDIO': return 'FFFFC000'
    case 'BAJO': return 'FF92D050'
    default: return 'FFFFFFFF'
  }
}

export interface IpercFila {
  proceso: string
  actividad: string
  subActividad: string
  puestoTrabajo: string
  factorRiesgo: string
  condicion: string
  peligro: string
  riesgo: string
  consecuencia: string
  severidad: number
  probabilidad: string
  eliminar: string
  sustituir: string
  controlIngenieria: string
  controlAdministrativo: string
  epp: string
  severidadResidual: number
  probabilidadResidual: string
  accionesMejora: string
  responsable: string
}

export interface IpercData {
  codigo: string
  revision: string
  fecha: string
  proyecto: string
  cliente: string
  planta: string
  ingSeguridad: string
  ggNombre: string
  equipoEvaluador: string[]
  filas: IpercFila[]
}

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: 'thin' },
  bottom: { style: 'thin' },
  left: { style: 'thin' },
  right: { style: 'thin' },
}

// 31 columnas visibles (cols A–AE), con 2 separadores vacíos
const COLUMNAS = [
  // DESCRIPCIÓN GENERAL (cols 1-7)  → B6:H6
  { header: 'N°',                      col: 1,  width: 5  },
  { header: 'PROCESO',                 col: 2,  width: 22 },
  { header: 'ACTIVIDAD',               col: 3,  width: 22 },
  { header: 'SUB-ACTIVIDAD',           col: 4,  width: 22 },
  { header: 'PUESTO DE TRABAJO',       col: 5,  width: 20 },
  { header: 'FACTOR DE RIESGO',        col: 6,  width: 13 },
  { header: 'CONDICIÓN',               col: 7,  width: 11 },
  // IDENTIFICACIÓN DEL PELIGRO (cols 8-10) → I6:K6
  { header: 'DESCRIPCIÓN DEL PELIGRO', col: 8,  width: 28 },
  { header: 'RIESGO',                  col: 9,  width: 22 },
  { header: 'CONSECUENCIA',            col: 10, width: 26 },
  // EVALUACIÓN DE RIESGO (cols 11-15) → L6:P6
  { header: 'SEVERIDAD',               col: 11, width: 10 },
  { header: 'PROBABILIDAD',            col: 12, width: 12 },
  { header: 'CONCATENADO',             col: 13, width: 12 },
  { header: 'VALOR DEL RIESGO',        col: 14, width: 12 },
  { header: 'NIVEL DEL RIESGO',        col: 15, width: 12 },
  // JERARQUÍA DE CONTROLES (cols 16-20) → Q6:U6
  { header: 'Eliminar',                col: 16, width: 18 },
  { header: 'Sustituir',               col: 17, width: 18 },
  { header: 'Control de Ingeniería',   col: 18, width: 28 },
  { header: 'Control Administrativo',  col: 19, width: 28 },
  { header: 'EPP',                     col: 20, width: 24 },
  // SEPARADOR VISUAL (col 21)
  { header: '',                         col: 21, width: 3  },
  // EVALUACIÓN RIESGO RESIDUAL (cols 22-28) → W6:AB6
  { header: 'Severidad',               col: 22, width: 10 },
  { header: 'Probabilidad',            col: 23, width: 12 },
  { header: 'CONCATENAR',              col: 24, width: 12 },
  { header: 'VALOR DE RIESGO',         col: 25, width: 12 },
  { header: 'NIVEL DE RIESGO',         col: 26, width: 12 },
  { header: 'Acciones de mejora',      col: 27, width: 22 },
  { header: 'RESPONSABLES',            col: 28, width: 16 },
  // SEPARADOR VISUAL (col 29)
  { header: '',                         col: 29, width: 3  },
  // VERIFICACIONES (cols 30-31) → AD6:AE6
  { header: 'Verif. Eval. Severidad ó ctrl ing', col: 30, width: 18 },
  { header: 'Verif. Eval. Acción de mejora',     col: 31, width: 18 },
]

const TOTAL_COLS = 31

export async function generarExcelIPERC(data: IpercData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'GYS Control Industrial SAC'
  wb.created = new Date()

  const ws = wb.addWorksheet('IPERC', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  })

  const AZUL_GYS = 'FF2E4057'
  const AZUL_COL = 'FF4472C4'
  const BLANCO = 'FFFFFFFF'

  // Set column widths
  for (const col of COLUMNAS) {
    ws.getColumn(col.col).width = col.width
  }

  // ─── Row 1: Title ───
  ws.mergeCells(1, 1, 1, TOTAL_COLS)
  const tituloCell = ws.getCell('A1')
  tituloCell.value = 'MATRIZ DE IDENTIFICACIÓN DE PELIGROS Y EVALUACIÓN DE RIESGOS Y CONTROLES - MATRIZ IPERC'
  tituloCell.font = { bold: true, size: 12, color: { argb: BLANCO } }
  tituloCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_GYS } }
  tituloCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  ws.getRow(1).height = 30

  // ─── Row 2: Subtitle ───
  ws.mergeCells(2, 1, 2, TOTAL_COLS)
  const normaCell = ws.getCell('A2')
  normaCell.value = 'SEGÚN FORMATO DEL DECRETO SUPREMO D.S. 024-2016-EM'
  normaCell.font = { bold: true, size: 10, color: { argb: BLANCO } }
  normaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_GYS } }
  normaCell.alignment = { horizontal: 'center', vertical: 'middle' }

  // ─── Row 3: Project info + code ───
  ws.mergeCells('A3:M3')
  ws.getCell('A3').value = `Proyecto: ${data.proyecto} — Cliente: ${data.cliente}`
  ws.getCell('A3').font = { bold: true, size: 10 }
  ws.getCell('N3').value = 'Código:'
  ws.getCell('N3').font = { bold: true, size: 9 }
  ws.mergeCells('O3:Q3')
  ws.getCell('O3').value = data.codigo
  ws.getCell('O3').font = { bold: true, size: 9, color: { argb: 'FF0070C0' } }
  ws.getCell('R3').value = 'Revisión:'
  ws.getCell('R3').font = { bold: true, size: 9 }
  ws.getCell('S3').value = data.revision
  ws.getCell('T3').value = data.fecha

  // ─── Row 4: Gerencia + Equipo evaluador ───
  ws.mergeCells('A4:B4')
  ws.getCell('A4').value = 'GERENCIA: PROYECTOS'
  ws.getCell('A4').font = { size: 8 }
  ws.mergeCells('C4:F4')
  ws.getCell('C4').value = `EQUIPO EVALUADOR: ${data.equipoEvaluador.join(' | ')}`
  ws.getCell('C4').font = { size: 8 }

  // ─── Row 5: Dates and signers ───
  ws.getCell('A5').value = `Fecha elaboración: ${data.fecha}`
  ws.getCell('A5').font = { size: 8 }
  ws.getCell('C5').value = `Preparado por: ${data.ingSeguridad}`
  ws.getCell('C5').font = { size: 8 }
  ws.getCell('N5').value = `Aprobado por: ${data.ggNombre}`
  ws.getCell('N5').font = { size: 8 }

  // ─── Row 6: Section headers (matching DS 024 real) ───
  const seccionHeaders: Array<{ merge: string; text: string }> = [
    { merge: 'B6:H6',    text: 'DESCRIPCIÓN GENERAL DE TRABAJO' },
    { merge: 'I6:K6',    text: 'IDENTIFICACIÓN DEL PELIGRO' },
    { merge: 'L6:P6',    text: 'EVALUACIÓN DE RIESGO' },
    { merge: 'Q6:U6',    text: 'JERARQUÍA DE CONTROLES' },
    { merge: 'W6:AB6',   text: 'EVALUACIÓN DE RIESGO RESIDUAL' },
    { merge: 'AC6:AD6',  text: 'HERRAMIENTA DE APOYO' },
  ]
  for (const { merge, text } of seccionHeaders) {
    ws.mergeCells(merge)
    const ref = merge.split(':')[0]
    const cell = ws.getCell(ref)
    cell.value = text
    cell.font = { bold: true, size: 9, color: { argb: BLANCO } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_GYS } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = thinBorder
  }
  ws.getRow(6).height = 20

  // ─── Row 7: Column headers ───
  for (const col of COLUMNAS) {
    if (!col.header) continue // skip separators
    const cell = ws.getCell(7, col.col)
    cell.value = col.header
    cell.font = { bold: true, size: 8, color: { argb: BLANCO } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_COL } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = thinBorder
  }
  ws.getRow(7).height = 35

  // ─── Data rows (starting at row 8) ───
  let currentRow = 8
  let rowNum = 1

  // Group by proceso
  const grupos: Record<string, IpercFila[]> = {}
  for (const fila of data.filas) {
    if (!grupos[fila.proceso]) grupos[fila.proceso] = []
    grupos[fila.proceso].push(fila)
  }

  for (const [proceso, filas] of Object.entries(grupos)) {
    const startRow = currentRow

    // Sub-group by actividad
    const subGrupos: Record<string, IpercFila[]> = {}
    for (const fila of filas) {
      if (!subGrupos[fila.actividad]) subGrupos[fila.actividad] = []
      subGrupos[fila.actividad].push(fila)
    }

    for (const [actividad, subFilas] of Object.entries(subGrupos)) {
      const actStartRow = currentRow

      for (const fila of subFilas) {
        const r = currentRow
        const row = ws.getRow(r)
        row.height = 45

        // For static coloring of nivel columns
        const keyInicial = `${fila.severidad}${fila.probabilidad}`
        const nivelInicial = TABLA_VALORACION[keyInicial]?.nivel ?? 'BAJO'
        const keyResidual = `${fila.severidadResidual}${fila.probabilidadResidual}`
        const nivelResidual = TABLA_VALORACION[keyResidual]?.nivel ?? 'BAJO'

        const isEven = r % 2 === 0
        const rowBg = isEven ? 'FFF2F2F2' : BLANCO

        // Helper: set a data cell with standard formatting
        const setCell = (col: number, val: string | number) => {
          const cell = ws.getCell(r, col)
          cell.value = val
          cell.font = { size: 8 }
          cell.alignment = { wrapText: true, vertical: 'middle', horizontal: col === 1 ? 'center' : 'left' }
          cell.border = thinBorder
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } }
        }

        // Helper: set a formula cell
        const setFormula = (col: number, formula: string) => {
          const cell = ws.getCell(r, col);
          (cell as any).value = { formula }
          cell.font = { size: 8 }
          cell.alignment = { wrapText: true, vertical: 'middle', horizontal: 'center' }
          cell.border = thinBorder
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } }
        }

        // Col 1: N°
        setCell(1, rowNum++)
        // Col 2: Proceso
        setCell(2, proceso)
        // Col 3: Actividad
        setCell(3, actividad)
        // Col 4: Sub-Actividad
        setCell(4, fila.subActividad)
        // Col 5: Puesto de Trabajo
        setCell(5, fila.puestoTrabajo)
        // Col 6: Factor de Riesgo
        setCell(6, fila.factorRiesgo)
        // Col 7: Condición
        setCell(7, fila.condicion)
        // Col 8: Peligro
        setCell(8, fila.peligro)
        // Col 9: Riesgo
        setCell(9, fila.riesgo)
        // Col 10: Consecuencia
        setCell(10, fila.consecuencia)
        // Col 11: Severidad (número)
        setCell(11, fila.severidad)
        ws.getCell(r, 11).alignment = { horizontal: 'center', vertical: 'middle' }
        // Col 12: Probabilidad (letra)
        setCell(12, fila.probabilidad)
        ws.getCell(r, 12).alignment = { horizontal: 'center', vertical: 'middle' }
        // Col 13: CONCATENADO (fórmula)
        setFormula(13, `CONCATENATE(K${r},L${r})`)
        // Col 14: VALOR DEL RIESGO (VLOOKUP)
        setFormula(14, `VLOOKUP(M${r},Valoración!$A$4:$E$28,4,0)`)
        // Col 15: NIVEL DEL RIESGO (VLOOKUP) + color estático
        setFormula(15, `VLOOKUP(M${r},Valoración!$A$4:$E$28,5,0)`)
        ws.getCell(r, 15).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: getNivelColor(nivelInicial) } }
        ws.getCell(r, 15).font = { bold: true, size: 8 }

        // Col 16-20: Jerarquía de controles
        setCell(16, fila.eliminar)
        setCell(17, fila.sustituir)
        setCell(18, fila.controlIngenieria)
        setCell(19, fila.controlAdministrativo)
        setCell(20, fila.epp)

        // Col 21: Separador vacío
        ws.getCell(r, 21).border = thinBorder

        // Col 22: Severidad residual (número)
        setCell(22, fila.severidadResidual)
        ws.getCell(r, 22).alignment = { horizontal: 'center', vertical: 'middle' }
        // Col 23: Probabilidad residual (letra)
        setCell(23, fila.probabilidadResidual)
        ws.getCell(r, 23).alignment = { horizontal: 'center', vertical: 'middle' }
        // Col 24: CONCATENAR residual (fórmula) — V=col22(sev), W=col23(prob)
        setFormula(24, `CONCATENATE(V${r},W${r})`)
        // Col 25: VALOR RIESGO residual (VLOOKUP) — X=col24(concat)
        setFormula(25, `VLOOKUP(X${r},Valoración!$A$4:$E$28,4,0)`)
        // Col 26: NIVEL RIESGO residual (VLOOKUP) + color estático
        setFormula(26, `VLOOKUP(X${r},Valoración!$A$4:$E$28,5,0)`)
        ws.getCell(r, 26).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: getNivelColor(nivelResidual) } }
        ws.getCell(r, 26).font = { bold: true, size: 8 }

        // Col 27: Acciones de mejora
        setCell(27, fila.accionesMejora)
        // Col 28: Responsable
        setCell(28, fila.responsable)

        // Col 29: Separador vacío
        ws.getCell(r, 29).border = thinBorder

        // Col 30: Verificación ctrl ingeniería / severidad
        // K=col11(sev), V=col22(sevRes), P=col16(eliminar)
        setFormula(30, `IF(AND(K${r}=V${r},P${r}="NA"),"ok",IF(AND(K${r}<V${r},P${r}<>"NA"),"OK","Verif Ctrl de ING ó la Severidad"))`)
        // Col 31: Verificación acción mejora
        // L=col12(prob), W=col23(probRes), Y=col25(valorRes), AA=col27(accionesMejora)
        setFormula(31, `IF(L${r}<W${r},IF(AND(Y${r}>15,AA${r}="_"),"OK",IF(AND(Y${r}<16,AA${r}<>"_"),"ok")))`)

        currentRow++
      }

      // Merge actividad column if multiple sub-activities
      if (subFilas.length > 1) {
        ws.mergeCells(actStartRow, 3, currentRow - 1, 3)
        ws.getCell(actStartRow, 3).alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' }
      }
    }

    // Merge proceso column
    if (filas.length > 1) {
      ws.mergeCells(startRow, 2, currentRow - 1, 2)
      ws.getCell(startRow, 2).alignment = { wrapText: true, vertical: 'middle', horizontal: 'left' }
      ws.getCell(startRow, 2).font = { bold: true, size: 8 }
    }
  }

  // ─── Legend ───
  currentRow += 2
  ws.mergeCells(currentRow, 1, currentRow, 7)
  ws.getCell(currentRow, 1).value = 'LEYENDA DE NIVELES DE RIESGO:'
  ws.getCell(currentRow, 1).font = { bold: true, size: 9 }

  currentRow++
  const leyenda = [
    { nivel: 'ALTO', color: getNivelColor('ALTO'), desc: 'Riesgo intolerable — requiere acción inmediata' },
    { nivel: 'MEDIO', color: getNivelColor('MEDIO'), desc: 'Riesgo moderado — requiere controles específicos' },
    { nivel: 'BAJO', color: getNivelColor('BAJO'), desc: 'Riesgo tolerable — mantener controles actuales' },
  ]
  for (const { nivel, color, desc } of leyenda) {
    ws.mergeCells(currentRow, 1, currentRow, 2)
    const cell = ws.getCell(currentRow, 1)
    cell.value = nivel
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
    cell.font = { bold: true, size: 9 }
    cell.alignment = { horizontal: 'center' }
    ws.mergeCells(currentRow, 3, currentRow, 7)
    ws.getCell(currentRow, 3).value = desc
    ws.getCell(currentRow, 3).font = { size: 8 }
    currentRow++
  }

  // ─── Sheet 2: Valoración (VLOOKUP reference) ───
  const wsVal = wb.addWorksheet('Valoración')
  wsVal.getCell('A1').value = 'TABLA DE VALORACIÓN DE RIESGO'
  wsVal.getCell('A1').font = { bold: true }

  // Row 3: headers
  const valHeaders = ['CONC.', 'PROBAB.', 'SEV.', 'RIESGO', 'RIESGO']
  valHeaders.forEach((h, i) => {
    const cell = wsVal.getCell(3, i + 1)
    cell.value = h
    cell.font = { bold: true, size: 9 }
    cell.border = thinBorder
  })

  // Rows 4-28: exactly 25 rows in DS 024 order
  VALORACION_ROWS.forEach((row, i) => {
    const r = i + 4
    wsVal.getCell(r, 1).value = row.key
    wsVal.getCell(r, 2).value = row.probNum
    wsVal.getCell(r, 3).value = row.sevLetra
    wsVal.getCell(r, 4).value = row.valor
    wsVal.getCell(r, 5).value = row.nivel
    wsVal.getCell(r, 5).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: getNivelColor(row.nivel) },
    }
    for (let c = 1; c <= 5; c++) {
      wsVal.getCell(r, c).border = thinBorder
      wsVal.getCell(r, c).font = { size: 9 }
    }
  })

  wsVal.getColumn(1).width = 14
  wsVal.getColumn(2).width = 12
  wsVal.getColumn(3).width = 14
  wsVal.getColumn(4).width = 8
  wsVal.getColumn(5).width = 10

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
