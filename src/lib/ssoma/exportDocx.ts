import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  Table, TableRow, TableCell, WidthType,
  BorderStyle, ShadingType, AlignmentType,
} from 'docx'

function parsearTablaMarkdown(lineas: string[]): Table {
  const filas = lineas.filter(l => !l.match(/^\|[-| ]+\|$/))

  const rows = filas.map((fila, rowIndex) => {
    const celdas = fila
      .split('|')
      .filter((_, i, arr) => i > 0 && i < arr.length - 1)
      .map(c => c.trim())

    return new TableRow({
      children: celdas.map(texto => new TableCell({
        shading: rowIndex === 0 ? {
          fill: '2E4057',
          type: ShadingType.CLEAR,
        } : undefined,
        children: [new Paragraph({
          children: [new TextRun({
            text: texto.replace(/\*\*/g, ''),
            bold: rowIndex === 0,
            color: rowIndex === 0 ? 'FFFFFF' : '000000',
            size: 18,
          })],
        })],
        borders: {
          top: { style: BorderStyle.SINGLE, size: 1 },
          bottom: { style: BorderStyle.SINGLE, size: 1 },
          left: { style: BorderStyle.SINGLE, size: 1 },
          right: { style: BorderStyle.SINGLE, size: 1 },
        },
        width: { size: 100 / celdas.length, type: WidthType.PERCENTAGE },
      })),
    })
  })

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
}

function tablaFirmas(firmantes: { ingSeguridad: string; gestorNombre: string; ggNombre: string; fecha: string }): Table {
  const celda = (texto: string, bold = false, height?: number) => new TableCell({
    children: [new Paragraph({
      children: [new TextRun({ text: texto, bold, size: 18 })],
      alignment: AlignmentType.CENTER,
    })],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    },
    width: { size: 25, type: WidthType.PERCENTAGE },
    ...(height ? { verticalAlign: 'center' as const } : {}),
  })

  const celdaVacia = () => new TableCell({
    children: [
      new Paragraph({ text: '' }),
      new Paragraph({ text: '' }),
      new Paragraph({ text: '' }),
    ],
    borders: {
      top: { style: BorderStyle.SINGLE, size: 1 },
      bottom: { style: BorderStyle.SINGLE, size: 1 },
      left: { style: BorderStyle.SINGLE, size: 1 },
      right: { style: BorderStyle.SINGLE, size: 1 },
    },
    width: { size: 25, type: WidthType.PERCENTAGE },
  })

  return new Table({
    rows: [
      // Header
      new TableRow({
        children: [
          celda('PREPARADO POR', true),
          celda('REVISADO POR', true),
          celda('REVISADO POR', true),
          celda('APROBADO POR', true),
        ],
      }),
      // Nombres
      new TableRow({
        children: [
          celda(firmantes.ingSeguridad),
          celda(firmantes.gestorNombre),
          celda(firmantes.gestorNombre),
          celda(firmantes.ggNombre),
        ],
      }),
      // Cargos
      new TableRow({
        children: [
          celda('Ing. de Seguridad'),
          celda('Gestor de Proyectos'),
          celda('Gerente de Proyectos'),
          celda('Gerente General'),
        ],
      }),
      // Espacio firma
      new TableRow({
        children: [celdaVacia(), celdaVacia(), celdaVacia(), celdaVacia()],
      }),
      // Fechas
      new TableRow({
        children: [
          celda(firmantes.fecha),
          celda(firmantes.fecha),
          celda(firmantes.fecha),
          celda(firmantes.fecha),
        ],
      }),
    ],
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
}

function procesarContenido(contenido: string): (Paragraph | Table)[] {
  const elementos: (Paragraph | Table)[] = []
  const lineas = contenido.split('\n')
  let i = 0

  while (i < lineas.length) {
    const linea = lineas[i].trim()

    // Detectar inicio de tabla
    if (linea.startsWith('|')) {
      const bloqueTabla: string[] = []
      while (i < lineas.length && lineas[i].trim().startsWith('|')) {
        bloqueTabla.push(lineas[i])
        i++
      }
      elementos.push(parsearTablaMarkdown(bloqueTabla))
      continue
    }

    // Heading nivel 1 (# o número.sección)
    if (linea.startsWith('# ') || /^\d+\.\s/.test(linea)) {
      elementos.push(new Paragraph({
        text: linea.replace(/^#+\s/, '').replace(/\*\*/g, ''),
        heading: HeadingLevel.HEADING_1,
        spacing: { before: 240, after: 120 },
      }))
      i++
      continue
    }

    // Heading nivel 2 (## o número.número)
    if (linea.startsWith('## ') || /^\d+\.\d+/.test(linea)) {
      elementos.push(new Paragraph({
        text: linea.replace(/^#+\s/, '').replace(/\*\*/g, ''),
        heading: HeadingLevel.HEADING_2,
        spacing: { before: 200, after: 80 },
      }))
      i++
      continue
    }

    // Línea vacía
    if (!linea) {
      elementos.push(new Paragraph({ text: '' }))
      i++
      continue
    }

    // Separador ═══
    if (linea.match(/^[═=─-]{5,}/)) {
      elementos.push(new Paragraph({
        border: { bottom: { style: BorderStyle.SINGLE, size: 6 } },
        text: '',
      }))
      i++
      continue
    }

    // Párrafo normal — limpiar markdown
    const isBullet = !!linea.match(/^[•\-*]\s/)
    elementos.push(new Paragraph({
      children: [new TextRun({
        text: linea.replace(/\*\*/g, '').replace(/^[•\-*]\s/, ''),
        size: 22,
      })],
      bullet: isBullet ? { level: 0 } : undefined,
    }))
    i++
  }

  return elementos
}

export async function generarDocx(
  titulo: string,
  codigo: string,
  contenido: string,
  firmantes: { ingSeguridad: string; gestorNombre: string; ggNombre: string; fecha: string }
): Promise<Blob> {
  const elementos = procesarContenido(contenido)

  const doc = new Document({
    styles: {
      default: {
        document: {
          run: { font: 'Arial', size: 22 },
        },
      },
    },
    sections: [{
      properties: {
        page: {
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children: [
        // Empresa
        new Paragraph({
          children: [new TextRun({
            text: 'GYS CONTROL INDUSTRIAL S.A.C.',
            bold: true, size: 28, color: '2E4057',
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 },
        }),
        // Título
        new Paragraph({
          children: [new TextRun({
            text: titulo,
            bold: true, size: 26,
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 },
        }),
        // Código y revisión
        new Paragraph({
          children: [new TextRun({
            text: `Código: ${codigo}   |   Revisión: 01   |   Fecha: ${firmantes.fecha}`,
            size: 20, color: '666666',
          })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 },
        }),
        // Tabla de firmas
        tablaFirmas(firmantes),
        new Paragraph({ text: '', spacing: { after: 400 } }),
        // Contenido
        ...elementos,
      ],
    }],
  })

  return Packer.toBlob(doc)
}
