import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx'

export async function generarDocx(
  titulo: string,
  codigo: string,
  contenido: string,
  firmantes: { ingSeguridad: string; ggNombre: string; fecha: string }
): Promise<Blob> {
  const lineas = contenido.split('\n')
  const parrafos: Paragraph[] = []

  // Encabezado
  parrafos.push(new Paragraph({
    text: 'GYS CONTROL INDUSTRIAL S.A.C.',
    heading: HeadingLevel.HEADING_1,
  }))
  parrafos.push(new Paragraph({ text: titulo, heading: HeadingLevel.HEADING_2 }))
  parrafos.push(new Paragraph({ text: `Código: ${codigo}` }))
  parrafos.push(new Paragraph({ text: `Fecha: ${firmantes.fecha}` }))
  parrafos.push(new Paragraph({ text: '' }))

  // Contenido línea por línea
  for (const linea of lineas) {
    const trimmed = linea.trim()
    if (!trimmed) {
      parrafos.push(new Paragraph({ text: '' }))
      continue
    }
    // Detectar headings markdown
    if (trimmed.startsWith('# ')) {
      parrafos.push(new Paragraph({
        text: trimmed.replace(/^#+\s/, ''),
        heading: HeadingLevel.HEADING_1,
      }))
    } else if (trimmed.startsWith('## ') || trimmed.startsWith('### ')) {
      parrafos.push(new Paragraph({
        text: trimmed.replace(/^#+\s/, ''),
        heading: HeadingLevel.HEADING_2,
      }))
    } else if (/^\d+\./.test(trimmed) || /^\d+\.\d+/.test(trimmed)) {
      // Líneas numeradas como secciones
      parrafos.push(new Paragraph({
        text: trimmed.replace(/\*\*/g, ''),
        heading: HeadingLevel.HEADING_3,
      }))
    } else {
      // Párrafo normal — limpiar markdown
      parrafos.push(new Paragraph({
        children: [new TextRun({
          text: trimmed.replace(/\*\*/g, '').replace(/\*/g, ''),
          size: 22, // 11pt
        })],
      }))
    }
  }

  const doc = new Document({ sections: [{ children: parrafos }] })
  const buffer = await Packer.toBlob(doc)
  return buffer
}
