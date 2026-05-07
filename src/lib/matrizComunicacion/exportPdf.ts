import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export interface MatrizFilaExport {
  orden: number
  informacion: string
  emisor: string
  receptores: string[]
  medio: string
  frecuencia: string
  formato: string
  notas?: string | null
}

export interface MatrizExportData {
  nombreProyecto: string
  codigoProyecto: string
  cliente: string
  version: string
  filas: MatrizFilaExport[]
}

export function exportMatrizPdf(data: MatrizExportData): void {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

  const pageW = doc.internal.pageSize.getWidth()
  const today = new Date().toLocaleDateString('es-PE', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })

  // Header
  doc.setFillColor(46, 64, 87) // #2E4057
  doc.rect(0, 0, pageW, 18, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text('GYS CONTROL INDUSTRIAL SAC', 10, 8)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.text('MATRIZ DE COMUNICACIONES — GYS-GPR-MAC', 10, 14)

  doc.setFontSize(8)
  doc.text(`Proyecto: ${data.nombreProyecto} (${data.codigoProyecto})`, pageW / 2, 8, { align: 'center' })
  doc.text(`Cliente: ${data.cliente}`, pageW / 2, 14, { align: 'center' })

  doc.text(`Versión: ${data.version}`, pageW - 10, 8, { align: 'right' })
  doc.text(`Fecha: ${today}`, pageW - 10, 14, { align: 'right' })

  // Table
  autoTable(doc, {
    startY: 22,
    head: [['#', 'Información / Comunicación', 'Emisor', 'Receptores', 'Medio', 'Frecuencia', 'Formato', 'Notas']],
    body: data.filas.map(f => [
      String(f.orden + 1),
      f.informacion,
      f.emisor,
      f.receptores.join(', '),
      f.medio,
      f.frecuencia,
      f.formato,
      f.notas ?? '',
    ]),
    styles: { fontSize: 7.5, cellPadding: 2, overflow: 'linebreak' },
    headStyles: {
      fillColor: [46, 64, 87],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: {
      0: { cellWidth: 8, halign: 'center' },
      1: { cellWidth: 60 },
      2: { cellWidth: 38 },
      3: { cellWidth: 28 },
      4: { cellWidth: 32 },
      5: { cellWidth: 28 },
      6: { cellWidth: 30 },
      7: { cellWidth: 40 },
    },
    didDrawPage: (hookData) => {
      const pageCount = (doc as jsPDF & { internal: { getNumberOfPages(): number } })
        .internal.getNumberOfPages()
      doc.setFontSize(7)
      doc.setTextColor(150)
      doc.text(
        `Página ${hookData.pageNumber} de ${pageCount}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: 'center' }
      )
    },
  })

  doc.save(`Matriz-Comunicaciones-${data.codigoProyecto}.pdf`)
}
