import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface PersonalMatriz {
  siglas: string
  nombre: string
  empresa: string
  cargo: string
  celular: string
  correo: string
}

export interface FilaMatriz {
  orden: number
  edtNombre: string
  frecuencia: string
  medio: string
  celdas: Array<{ siglas: string; valor: string }>
}

export interface DatosMatrizPdf {
  proyecto: string
  cliente: string
  codigoDocumento: string
  revision: string
  fecha: string
  personal: PersonalMatriz[]
  filas: FilaMatriz[]
}

export function generarPdfMatriz(datos: DatosMatrizPdf): void {
  const doc = new jsPDF({ orientation: 'landscape', format: 'a4' })
  const azul: [number, number, number] = [46, 64, 87]
  const gris: [number, number, number] = [245, 245, 245]
  const W = doc.internal.pageSize.getWidth()

  // ── HEADER ────────────────────────────────────────
  doc.setFillColor(...azul)
  doc.rect(10, 8, 40, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('GYS', 20, 15)
  doc.setFontSize(7)
  doc.text('CONTROL INDUSTRIAL', 14, 20)
  doc.text('S.A.C.', 22, 24)

  doc.setTextColor(0, 0, 0)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('MATRIZ DE COMUNICACIONES', W / 2, 14, { align: 'center' })

  const bx = W - 70
  doc.setFontSize(7)
  doc.setFont('helvetica', 'normal')
  doc.rect(bx, 8, 60, 18)
  doc.line(bx, 13, W - 10, 13)
  doc.line(bx, 18, W - 10, 18)
  doc.text(`Formato: ${datos.codigoDocumento}`, bx + 2, 12)
  doc.text(`Revisión: ${datos.revision}`, bx + 2, 17)
  doc.text(`Fecha: ${datos.fecha}`, bx + 2, 22)

  // Segunda fila header
  doc.rect(10, 26, W - 20, 8)
  doc.line(110, 26, 110, 34)
  doc.line(130, 26, 130, 34)
  doc.line(160, 26, 160, 34)
  doc.line(200, 26, 200, 34)
  doc.line(220, 26, 220, 34)
  doc.setFont('helvetica', 'bold')
  doc.text('Proyecto:', 12, 31)
  doc.setFont('helvetica', 'normal')
  doc.text(datos.proyecto.substring(0, 45), 30, 31)
  doc.setFont('helvetica', 'bold')
  doc.text('Rev.:', 112, 31)
  doc.setFont('helvetica', 'normal')
  doc.text(datos.revision, 120, 31)
  doc.setFont('helvetica', 'bold')
  doc.text('Fecha:', 132, 31)
  doc.setFont('helvetica', 'normal')
  doc.text(datos.fecha, 143, 31)
  doc.setFont('helvetica', 'bold')
  doc.text('Documento:', 162, 31)
  doc.setFont('helvetica', 'normal')
  doc.text(datos.codigoDocumento.substring(0, 20), 180, 31)
  doc.setFont('helvetica', 'bold')
  doc.text('Pág.:', 202, 31)
  doc.setFont('helvetica', 'normal')
  doc.text('1 de 1', 210, 31)

  // ── TABLA 1: PERSONAL ─────────────────────────────
  autoTable(doc, {
    startY: 37,
    head: [[
      { content: 'NOMBRE', styles: { halign: 'center' } },
      { content: 'SIGLAS', styles: { halign: 'center' } },
      { content: 'EMPRESA', styles: { halign: 'center' } },
      { content: 'CARGO', styles: { halign: 'center' } },
      { content: 'CELULAR', styles: { halign: 'center' } },
      { content: 'CORREO', styles: { halign: 'center' } },
    ]],
    body: datos.personal.map(p => [
      p.nombre, p.siglas, p.empresa, p.cargo, p.celular, p.correo,
    ]),
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: azul, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: gris },
    columnStyles: {
      0: { cellWidth: 35 },
      1: { cellWidth: 12, halign: 'center' },
      2: { cellWidth: 35 },
      3: { cellWidth: 40 },
      4: { cellWidth: 22, halign: 'center' },
      5: { cellWidth: 'auto' as const },
    },
    margin: { left: 10, right: 10 },
  })

  // ── TABLA 2: MATRIZ ───────────────────────────────
  const startYMatriz = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5
  const siglas = datos.personal.map(p => p.siglas)

  const headRow1 = [
    { content: 'ID', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
    { content: 'ACTIVIDAD', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
    { content: 'FRECUENCIA', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
    { content: 'MEDIO', rowSpan: 2, styles: { halign: 'center' as const, valign: 'middle' as const } },
    { content: 'RESPONSABILIDAD', colSpan: siglas.length, styles: { halign: 'center' as const } },
  ]

  const headRow2 = siglas.map(s => ({
    content: s,
    styles: { halign: 'center' as const, fontStyle: 'bold' as const },
  }))

  const bodyRows = datos.filas.map((fila, idx) => {
    const celdas = siglas.map(s => {
      const c = fila.celdas.find(x => x.siglas === s)
      return { content: c?.valor ?? 'D', styles: { halign: 'center' as const } }
    })
    return [
      { content: String(idx + 1), styles: { halign: 'center' as const } },
      { content: fila.edtNombre, styles: { fontStyle: 'bold' as const } },
      { content: fila.frecuencia, styles: { halign: 'center' as const } },
      { content: fila.medio, styles: { halign: 'center' as const } },
      ...celdas,
    ]
  })

  const anchoSiglas = Math.min(10, Math.floor((W - 20 - 10 - 35 - 18 - 18) / Math.max(siglas.length, 1)))

  autoTable(doc, {
    startY: startYMatriz,
    head: [headRow1, headRow2],
    body: bodyRows,
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: azul, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold', halign: 'center' },
    alternateRowStyles: { fillColor: gris },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' as const },
      1: { cellWidth: 35 },
      2: { cellWidth: 18, halign: 'center' as const },
      3: { cellWidth: 18, halign: 'center' as const },
      ...Object.fromEntries(siglas.map((_, i) => [i + 4, { cellWidth: anchoSiglas, halign: 'center' as const }])),
    },
    margin: { left: 10, right: 10 },
  })

  // ── TABLA 3: LEYENDA ──────────────────────────────
  const startYLeyenda = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 4

  autoTable(doc, {
    startY: startYLeyenda,
    head: [[
      { content: 'FRECUENCIA', colSpan: 2, styles: { halign: 'center' as const } },
      { content: 'MEDIO', colSpan: 2, styles: { halign: 'center' as const } },
      { content: 'RESPONSABILIDAD', colSpan: 2, styles: { halign: 'center' as const } },
    ]],
    body: [
      ['M', 'Mensual',  'I', 'Informe',  'D', 'Destinatario'],
      ['S', 'Semanal',  'M', 'Minuta',   'E', 'Emisor'],
      ['E', 'Eventual', 'E', 'E-mail',   'R', 'Autoriza'],
      ['',  '',         'R', 'Reunión',  'S', 'Soporte'],
      ['',  '',         'P', 'Planilla', 'V', 'Valida'],
    ],
    styles: { fontSize: 7, cellPadding: 1.5 },
    headStyles: { fillColor: azul, textColor: [255, 255, 255] as [number, number, number], fontStyle: 'bold', halign: 'center' },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' as const, fontStyle: 'bold' as const },
      1: { cellWidth: 20 },
      2: { cellWidth: 8, halign: 'center' as const, fontStyle: 'bold' as const },
      3: { cellWidth: 20 },
      4: { cellWidth: 8, halign: 'center' as const, fontStyle: 'bold' as const },
      5: { cellWidth: 25 },
    },
    margin: { left: 10, right: 10 },
  })

  // ── FOOTER ────────────────────────────────────────
  const pageH = doc.internal.pageSize.getHeight()
  doc.setFontSize(6)
  doc.setTextColor(100, 100, 100)
  doc.text(
    'Documento elaborado por GYS Control Industrial S.A.C.  |  ' +
    'La información contenida en este documento es confidencial.  |  ' +
    `Código: ${datos.codigoDocumento}  |  Revisión: ${datos.revision}`,
    W / 2, pageH - 5, { align: 'center' }
  )

  doc.save(`${datos.codigoDocumento || 'Matriz-Comunicaciones'}.pdf`)
}
