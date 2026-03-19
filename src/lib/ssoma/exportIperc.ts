import ExcelJS from 'exceljs'

const TABLA_VALORACION: Record<string, { valor: number; nivel: string }> = {
  '1A': { valor: 1, nivel: 'ALTO' },
  '1B': { valor: 2, nivel: 'ALTO' },
  '1C': { valor: 4, nivel: 'ALTO' },
  '1D': { valor: 7, nivel: 'ALTO' },
  '1E': { valor: 11, nivel: 'MEDIO' },
  '2A': { valor: 3, nivel: 'ALTO' },
  '2B': { valor: 5, nivel: 'ALTO' },
  '2C': { valor: 8, nivel: 'ALTO' },
  '2D': { valor: 12, nivel: 'MEDIO' },
  '2E': { valor: 16, nivel: 'BAJO' },
  '3A': { valor: 6, nivel: 'ALTO' },
  '3B': { valor: 9, nivel: 'MEDIO' },
  '3C': { valor: 13, nivel: 'MEDIO' },
  '3D': { valor: 17, nivel: 'BAJO' },
  '3E': { valor: 20, nivel: 'BAJO' },
  '4A': { valor: 10, nivel: 'MEDIO' },
  '4B': { valor: 14, nivel: 'MEDIO' },
  '4C': { valor: 18, nivel: 'BAJO' },
  '4D': { valor: 21, nivel: 'BAJO' },
  '4E': { valor: 23, nivel: 'BAJO' },
  '5A': { valor: 15, nivel: 'BAJO' },
  '5B': { valor: 19, nivel: 'BAJO' },
  '5C': { valor: 22, nivel: 'BAJO' },
  '5D': { valor: 24, nivel: 'BAJO' },
  '5E': { valor: 25, nivel: 'BAJO' },
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

export async function generarExcelIPERC(data: IpercData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'GYS Control Industrial SAC'
  wb.created = new Date()

  const ws = wb.addWorksheet('IPERC', {
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  })

  const AZUL_GYS = 'FF2E4057'
  const BLANCO = 'FFFFFFFF'

  // Row 1: Title
  ws.mergeCells('A1:W1')
  const tituloCell = ws.getCell('A1')
  tituloCell.value = 'MATRIZ DE IDENTIFICACIÓN DE PELIGROS Y EVALUACIÓN DE RIESGOS Y CONTROLES - MATRIZ IPERC'
  tituloCell.font = { bold: true, size: 12, color: { argb: BLANCO } }
  tituloCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_GYS } }
  tituloCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
  ws.getRow(1).height = 30

  // Row 2: Subtitle
  ws.mergeCells('A2:W2')
  const normaCell = ws.getCell('A2')
  normaCell.value = 'SEGÚN FORMATO DEL DECRETO SUPREMO D.S. 024-2016-EM'
  normaCell.font = { bold: true, size: 10, color: { argb: BLANCO } }
  normaCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_GYS } }
  normaCell.alignment = { horizontal: 'center', vertical: 'middle' }

  // Row 3: Project info + code
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

  // Row 4: Gerencia + Equipo evaluador
  ws.mergeCells('A4:B4')
  ws.getCell('A4').value = 'GERENCIA: PROYECTOS'
  ws.getCell('A4').font = { size: 8 }
  ws.mergeCells('C4:F4')
  ws.getCell('C4').value = `EQUIPO EVALUADOR: ${data.equipoEvaluador.join(' | ')}`
  ws.getCell('C4').font = { size: 8 }

  // Row 5: Dates and signers
  ws.getCell('A5').value = `Fecha elaboración: ${data.fecha}`
  ws.getCell('A5').font = { size: 8 }
  ws.getCell('C5').value = `Preparado por: ${data.ingSeguridad}`
  ws.getCell('C5').font = { size: 8 }
  ws.getCell('N5').value = `Aprobado por: ${data.ggNombre}`
  ws.getCell('N5').font = { size: 8 }

  // Row 6: Section headers
  const seccionHeaders = [
    { start: 'A6', end: 'G6', text: 'DESCRIPCIÓN GENERAL DE TRABAJO' },
    { start: 'H6', end: 'J6', text: 'IDENTIFICACIÓN DEL PELIGRO' },
    { start: 'K6', end: 'M6', text: 'EVALUACIÓN DE RIESGO' },
    { start: 'N6', end: 'R6', text: 'JERARQUÍA DE CONTROLES' },
    { start: 'S6', end: 'W6', text: 'EVALUACIÓN DE RIESGO RESIDUAL' },
  ]
  seccionHeaders.forEach(({ start, end, text }) => {
    ws.mergeCells(`${start}:${end}`)
    const cell = ws.getCell(start)
    cell.value = text
    cell.font = { bold: true, size: 9, color: { argb: BLANCO } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: AZUL_GYS } }
    cell.alignment = { horizontal: 'center', vertical: 'middle' }
    cell.border = thinBorder
  })
  ws.getRow(6).height = 20

  // Row 7: Column headers
  const columnas = [
    { header: 'N°', width: 4 },
    { header: 'PROCESO', width: 20 },
    { header: 'ACTIVIDAD', width: 22 },
    { header: 'SUB-ACTIVIDAD', width: 22 },
    { header: 'PUESTO DE TRABAJO', width: 20 },
    { header: 'FACTOR DE RIESGO', width: 12 },
    { header: 'CONDICIÓN', width: 10 },
    { header: 'PELIGRO', width: 25 },
    { header: 'RIESGO', width: 20 },
    { header: 'CONSECUENCIA', width: 25 },
    { header: 'SEVERIDAD', width: 10 },
    { header: 'PROBABILIDAD', width: 12 },
    { header: 'NIVEL DE RIESGO', width: 12 },
    { header: 'ELIMINAR', width: 18 },
    { header: 'SUSTITUIR', width: 18 },
    { header: 'CTRL. INGENIERÍA', width: 28 },
    { header: 'CTRL. ADMINISTRATIVO', width: 28 },
    { header: 'EPP', width: 22 },
    { header: 'SEV. RESIDUAL', width: 10 },
    { header: 'PROB. RESIDUAL', width: 12 },
    { header: 'NIVEL RESIDUAL', width: 12 },
    { header: 'ACCIONES MEJORA', width: 22 },
    { header: 'RESPONSABLE', width: 16 },
  ]

  columnas.forEach((col, i) => {
    const colObj = ws.getColumn(i + 1)
    colObj.width = col.width
    const cell = ws.getCell(7, i + 1)
    cell.value = col.header
    cell.font = { bold: true, size: 8, color: { argb: BLANCO } }
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } }
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true }
    cell.border = thinBorder
  })
  ws.getRow(7).height = 35

  // Data rows
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
        const row = ws.getRow(currentRow)
        row.height = 45

        const keyInicial = `${fila.severidad}${fila.probabilidad}`
        const valorInicial = TABLA_VALORACION[keyInicial] ?? { valor: 0, nivel: 'BAJO' }
        const keyResidual = `${fila.severidadResidual}${fila.probabilidadResidual}`
        const valorResidual = TABLA_VALORACION[keyResidual] ?? { valor: 0, nivel: 'BAJO' }

        const valores: (string | number)[] = [
          rowNum++,
          proceso,
          actividad,
          fila.subActividad,
          fila.puestoTrabajo,
          fila.factorRiesgo,
          fila.condicion,
          fila.peligro,
          fila.riesgo,
          fila.consecuencia,
          fila.severidad,
          fila.probabilidad,
          valorInicial.nivel,
          fila.eliminar,
          fila.sustituir,
          fila.controlIngenieria,
          fila.controlAdministrativo,
          fila.epp,
          fila.severidadResidual,
          fila.probabilidadResidual,
          valorResidual.nivel,
          fila.accionesMejora,
          fila.responsable,
        ]

        valores.forEach((val, i) => {
          const cell = ws.getCell(currentRow, i + 1)
          cell.value = val
          cell.font = { size: 8 }
          cell.alignment = {
            wrapText: true,
            vertical: 'middle',
            horizontal: i === 0 ? 'center' : 'left',
          }
          cell.border = thinBorder

          // Color for risk level (col M = index 12)
          if (i === 12) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: getNivelColor(valorInicial.nivel) } }
            cell.font = { bold: true, size: 8 }
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
          }
          // Color for residual level (col U = index 20)
          if (i === 20) {
            cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: getNivelColor(valorResidual.nivel) } }
            cell.font = { bold: true, size: 8 }
            cell.alignment = { horizontal: 'center', vertical: 'middle' }
          }
          // Alternating row color
          if (i !== 12 && i !== 20) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: currentRow % 2 === 0 ? 'FFF2F2F2' : BLANCO },
            }
          }
        })

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

  // Legend
  currentRow += 2
  ws.mergeCells(`A${currentRow}:G${currentRow}`)
  ws.getCell(`A${currentRow}`).value = 'LEYENDA DE NIVELES DE RIESGO:'
  ws.getCell(`A${currentRow}`).font = { bold: true, size: 9 }

  currentRow++
  const leyenda = [
    { nivel: 'ALTO', color: getNivelColor('ALTO'), desc: 'Riesgo intolerable — requiere acción inmediata' },
    { nivel: 'MEDIO', color: getNivelColor('MEDIO'), desc: 'Riesgo moderado — requiere controles específicos' },
    { nivel: 'BAJO', color: getNivelColor('BAJO'), desc: 'Riesgo tolerable — mantener controles actuales' },
  ]
  leyenda.forEach(({ nivel, color, desc }) => {
    ws.mergeCells(`A${currentRow}:B${currentRow}`)
    const cell = ws.getCell(`A${currentRow}`)
    cell.value = nivel
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: color } }
    cell.font = { bold: true, size: 9 }
    cell.alignment = { horizontal: 'center' }
    ws.mergeCells(`C${currentRow}:G${currentRow}`)
    ws.getCell(`C${currentRow}`).value = desc
    ws.getCell(`C${currentRow}`).font = { size: 8 }
    currentRow++
  })

  // Sheet 2: Valoración table
  const wsVal = wb.addWorksheet('Valoración')
  wsVal.getCell('A1').value = 'TABLA DE VALORACIÓN DE RIESGO'
  wsVal.getCell('A1').font = { bold: true }
  wsVal.getCell('A3').value = 'CONCATENADO'
  wsVal.getCell('B3').value = 'SEVERIDAD'
  wsVal.getCell('C3').value = 'PROBABILIDAD'
  wsVal.getCell('D3').value = 'VALOR'
  wsVal.getCell('E3').value = 'NIVEL'
  ;['A3', 'B3', 'C3', 'D3', 'E3'].forEach(ref => {
    wsVal.getCell(ref).font = { bold: true, size: 9 }
    wsVal.getCell(ref).border = thinBorder
  })

  Object.entries(TABLA_VALORACION).forEach(([key, { valor, nivel }], i) => {
    const row = i + 4
    wsVal.getCell(`A${row}`).value = key
    wsVal.getCell(`B${row}`).value = parseInt(key[0])
    wsVal.getCell(`C${row}`).value = key[1]
    wsVal.getCell(`D${row}`).value = valor
    wsVal.getCell(`E${row}`).value = nivel
    wsVal.getCell(`E${row}`).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: getNivelColor(nivel) },
    }
    ;['A', 'B', 'C', 'D', 'E'].forEach(col => {
      wsVal.getCell(`${col}${row}`).border = thinBorder
      wsVal.getCell(`${col}${row}`).font = { size: 9 }
    })
  })

  wsVal.getColumn(1).width = 14
  wsVal.getColumn(2).width = 12
  wsVal.getColumn(3).width = 14
  wsVal.getColumn(4).width = 8
  wsVal.getColumn(5).width = 10

  const buffer = await wb.xlsx.writeBuffer()
  return Buffer.from(buffer)
}
