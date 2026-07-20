import PizZip from 'pizzip'

export interface ImagenExtraidaDeDocx {
  /** Número de "Figura N." leído del párrafo siguiente a la imagen — null si no matcheó ese patrón (foto nueva pegada a mano en Word, sin ese caption). */
  numeroFigura: number | null
  bytes: Buffer
  mimeType: string
  nombreArchivoOriginal: string
  /** Orden de aparición en el documento — para mostrar las pendientes en el mismo orden en que aparecen en el Word. */
  orden: number
}

const MIME_POR_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
}

function extraerTextoPlano(parrafoXml: string): string {
  return Array.from(parrafoXml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g))
    .map(m => m[1])
    .join('')
}

/**
 * Extrae las imágenes embebidas en un .docx (tratándolo como el ZIP que es —
 * mismo estilo que reempaquetarZip.ts, sin librería de parseo XML nueva) e
 * intenta identificar cuáles ya existían en el sistema, leyendo el caption
 * "Figura {N}." que la plantilla SIEMPRE pone en el párrafo inmediatamente
 * después de cada imagen (ver exportDocx.ts / construirDataBag.ts — mismo
 * número que calcularNumerosDeFigura). Las imágenes sin ese patrón (el
 * usuario las pegó a mano en Word) devuelven numeroFigura=null — el caller
 * las manda a revisión manual.
 *
 * Defensivo a propósito: un Word con estructura inesperada (control de
 * cambios, comentarios, formato atípico) no debe romper la subida de la
 * versión — como mucho, esas imágenes puntuales quedan con numeroFigura
 * null en vez de matchear, o si el parseo global falla devuelve [].
 */
export function extraerImagenesDeDocx(buffer: Buffer): ImagenExtraidaDeDocx[] {
  try {
    const zip = new PizZip(buffer)

    const relsFile = zip.file('word/_rels/document.xml.rels')
    const docFile = zip.file('word/document.xml')
    if (!relsFile || !docFile) return []

    const relsXml = relsFile.asText()
    const idAMedia = new Map<string, string>()
    for (const m of relsXml.matchAll(/<Relationship\s+Id="(rId\d+)"[^>]*Target="(media\/[^"]+)"/g)) {
      idAMedia.set(m[1], m[2])
    }

    const docXml = docFile.asText()
    const parrafos = docXml.split('</w:p>')

    const resultado: ImagenExtraidaDeDocx[] = []
    let orden = 0

    for (let i = 0; i < parrafos.length; i++) {
      const parrafo = parrafos[i]
      const embedMatch = parrafo.match(/r:embed="(rId\d+)"/)
      if (!embedMatch) continue

      const mediaPath = idAMedia.get(embedMatch[1])
      if (!mediaPath) continue

      const mediaFile = zip.file(mediaPath)
      if (!mediaFile) continue

      let numeroFigura: number | null = null
      const siguiente = parrafos[i + 1]
      if (siguiente) {
        const texto = extraerTextoPlano(siguiente).trim()
        const figuraMatch = texto.match(/^Figura\s+(\d+)\./)
        if (figuraMatch) numeroFigura = Number(figuraMatch[1])
      }

      const extension = (mediaPath.split('.').pop() ?? '').toLowerCase()
      resultado.push({
        numeroFigura,
        bytes: Buffer.from(mediaFile.asUint8Array()),
        mimeType: MIME_POR_EXTENSION[extension] ?? 'application/octet-stream',
        nombreArchivoOriginal: mediaPath.split('/').pop() ?? mediaPath,
        orden: orden++,
      })
    }

    return resultado
  } catch (error) {
    console.error('[extraerImagenesDeDocx] Error parseando el docx (no bloqueante):', error)
    return []
  }
}
