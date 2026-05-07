import {
  Document, Packer, Paragraph, TextRun,
  Table, TableRow, TableCell, WidthType,
  BorderStyle, ShadingType, AlignmentType,
} from 'docx'
import type { PersonalMatriz, FilaMatriz, DatosMatrizPdf } from './exportPdf'

// ─── helpers ──────────────────────────────────────────────────────────────────

const AZULhex = '2E4057'
const BORDERS = {
  top:    { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
  bottom: { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
  left:   { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
  right:  { style: BorderStyle.SINGLE, size: 1, color: 'AAAAAA' },
}

function hCell(
  text: string,
  opts: { w?: number; colSpan?: number; center?: boolean } = {}
): TableCell {
  return new TableCell({
    ...(opts.colSpan && { columnSpan: opts.colSpan }),
    shading: { fill: AZULhex, type: ShadingType.CLEAR },
    borders: BORDERS,
    ...(opts.w ? { width: { size: opts.w * 100, type: WidthType.DXA } } : {}),
    children: [new Paragraph({
      alignment: opts.center !== false ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text, bold: true, color: 'FFFFFF', size: 16 })],
    })],
  })
}

function dCell(
  text: string,
  opts: { w?: number; bold?: boolean; center?: boolean; shade?: boolean } = {}
): TableCell {
  return new TableCell({
    shading: opts.shade ? { fill: 'F5F5F5', type: ShadingType.CLEAR } : undefined,
    borders: BORDERS,
    ...(opts.w ? { width: { size: opts.w * 100, type: WidthType.DXA } } : {}),
    children: [new Paragraph({
      alignment: opts.center ? AlignmentType.CENTER : AlignmentType.LEFT,
      children: [new TextRun({ text, bold: opts.bold ?? false, size: 16 })],
    })],
  })
}

function emptyCell(w?: number): TableCell {
  return new TableCell({
    borders: BORDERS,
    ...(w ? { width: { size: w * 100, type: WidthType.DXA } } : {}),
    children: [new Paragraph({ text: '' })],
  })
}

// ─── Tabla header del documento ───────────────────────────────────────────────

function tablaDocHeader(datos: DatosMatrizPdf): Table {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          new TableCell({
            width: { size: 15, type: WidthType.PERCENTAGE },
            shading: { fill: AZULhex, type: ShadingType.CLEAR },
            borders: BORDERS,
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'GYS', bold: true, color: 'FFFFFF', size: 26 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'CONTROL INDUSTRIAL SAC', color: 'FFFFFF', size: 14 })] }),
            ],
          }),
          new TableCell({
            width: { size: 55, type: WidthType.PERCENTAGE },
            shading: { fill: AZULhex, type: ShadingType.CLEAR },
            borders: BORDERS,
            children: [
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: 'MATRIZ DE COMUNICACIONES', bold: true, color: 'FFFFFF', size: 22 })] }),
              new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: datos.proyecto, color: 'FFFFFF', size: 16 })] }),
            ],
          }),
          new TableCell({
            width: { size: 30, type: WidthType.PERCENTAGE },
            borders: BORDERS,
            children: [
              new Paragraph({ children: [new TextRun({ text: `Formato: ${datos.codigoDocumento}`, size: 16 })] }),
              new Paragraph({ children: [new TextRun({ text: `Revisión: ${datos.revision}`, size: 16 })] }),
              new Paragraph({ children: [new TextRun({ text: `Fecha: ${datos.fecha}`, size: 16 })] }),
              new Paragraph({ children: [new TextRun({ text: `Cliente: ${datos.cliente}`, size: 16 })] }),
            ],
          }),
        ],
      }),
    ],
  })
}

// ─── Tabla personal ───────────────────────────────────────────────────────────

function tablaPersonal(personal: PersonalMatriz[]): Table {
  const headerRow = new TableRow({
    children: [
      hCell('NOMBRE'),
      hCell('SIGLAS', { w: 12, center: true }),
      hCell('EMPRESA'),
      hCell('CARGO'),
      hCell('CELULAR', { w: 20, center: true }),
      hCell('CORREO'),
    ],
  })

  const bodyRows = personal.map((p, i) =>
    new TableRow({
      children: [
        dCell(p.nombre, { shade: i % 2 === 1 }),
        dCell(p.siglas, { shade: i % 2 === 1, center: true, bold: true }),
        dCell(p.empresa, { shade: i % 2 === 1 }),
        dCell(p.cargo, { shade: i % 2 === 1 }),
        dCell(p.celular, { shade: i % 2 === 1, center: true }),
        dCell(p.correo, { shade: i % 2 === 1 }),
      ],
    })
  )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow, ...bodyRows],
  })
}

// ─── Tabla matriz principal ───────────────────────────────────────────────────

function tablaMatriz(personal: PersonalMatriz[], filas: FilaMatriz[]): Table {
  const siglas = personal.map(p => p.siglas)

  // Row 1: ID | ACTIVIDAD | FREC | MEDIO | RESPONSABILIDAD (merged)
  const headerRow1 = new TableRow({
    children: [
      hCell('ID', { w: 8, center: true }),
      hCell('ACTIVIDAD', { w: 45 }),
      hCell('FREC', { w: 14, center: true }),
      hCell('MEDIO', { w: 14, center: true }),
      hCell('RESPONSABILIDAD', { colSpan: siglas.length, center: true }),
    ],
  })

  // Row 2: empty cells for fixed cols + siglas
  const headerRow2 = new TableRow({
    children: [
      emptyCell(8),
      emptyCell(45),
      emptyCell(14),
      emptyCell(14),
      ...siglas.map(s => hCell(s, { w: 10, center: true })),
    ],
  })

  const bodyRows = filas.map((fila, idx) =>
    new TableRow({
      children: [
        dCell(String(idx + 1), { center: true, shade: idx % 2 === 1 }),
        dCell(fila.edtNombre, { bold: true, shade: idx % 2 === 1 }),
        dCell(fila.frecuencia, { center: true, shade: idx % 2 === 1 }),
        dCell(fila.medio, { center: true, shade: idx % 2 === 1 }),
        ...siglas.map(s => {
          const c = fila.celdas.find(x => x.siglas === s)
          return dCell(c?.valor ?? 'D', { center: true, shade: idx % 2 === 1 })
        }),
      ],
    })
  )

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [headerRow1, headerRow2, ...bodyRows],
  })
}

// ─── Tabla leyenda ────────────────────────────────────────────────────────────

function tablaLeyenda(): Table {
  const leyendaRows = [
    ['M', 'Mensual',  'I', 'Informe',  'D', 'Destinatario'],
    ['S', 'Semanal',  'M', 'Minuta',   'E', 'Emisor'],
    ['E', 'Eventual', 'E', 'E-mail',   'R', 'Autoriza'],
    ['',  '',         'R', 'Reunión',  'S', 'Soporte'],
    ['',  '',         'P', 'Planilla', 'V', 'Valida'],
  ]

  return new Table({
    width: { size: 50, type: WidthType.PERCENTAGE },
    rows: [
      new TableRow({
        children: [
          hCell('FRECUENCIA', { colSpan: 2, center: true }),
          hCell('MEDIO', { colSpan: 2, center: true }),
          hCell('RESPONSABILIDAD', { colSpan: 2, center: true }),
        ],
      }),
      ...leyendaRows.map(([fc, fl, mc, ml, rc, rl], i) =>
        new TableRow({
          children: [
            dCell(fc, { w: 8, center: true, bold: true, shade: i % 2 === 1 }),
            dCell(fl, { w: 20, shade: i % 2 === 1 }),
            dCell(mc, { w: 8, center: true, bold: true, shade: i % 2 === 1 }),
            dCell(ml, { w: 20, shade: i % 2 === 1 }),
            dCell(rc, { w: 8, center: true, bold: true, shade: i % 2 === 1 }),
            dCell(rl, { w: 25, shade: i % 2 === 1 }),
          ],
        })
      ),
    ],
  })
}

// ─── Función principal ────────────────────────────────────────────────────────

export async function generarDocxMatriz(datos: DatosMatrizPdf): Promise<Buffer> {
  const separador = new Paragraph({ text: '', spacing: { before: 120, after: 120 } })

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: { width: 15840, height: 12240 }, // landscape A4 in twips
          margin: { top: 720, bottom: 720, left: 720, right: 720 },
        },
      },
      children: [
        tablaDocHeader(datos),
        separador,
        new Paragraph({ children: [new TextRun({ text: '1. PERSONAL DEL PROYECTO', bold: true, size: 18 })] }),
        tablaPersonal(datos.personal),
        separador,
        new Paragraph({ children: [new TextRun({ text: '2. MATRIZ DE COMUNICACIONES', bold: true, size: 18 })] }),
        tablaMatriz(datos.personal, datos.filas),
        separador,
        new Paragraph({ children: [new TextRun({ text: '3. LEYENDA', bold: true, size: 18 })] }),
        tablaLeyenda(),
        separador,
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({
            text: `Documento elaborado por GYS Control Industrial S.A.C.  |  Información confidencial  |  Código: ${datos.codigoDocumento}  |  Rev: ${datos.revision}`,
            size: 14, color: '888888',
          })],
        }),
      ],
    }],
  })

  return Packer.toBuffer(doc)
}
