import PizZip from 'pizzip'

/**
 * Re-empaqueta el .docx generado por docxtemplater para máxima compatibilidad:
 * - `[Content_Types].xml` primero (convención OPC — docxtemplater lo deja
 *   como ÚLTIMA entrada al regenerar el zip, que Word suele tolerar pero no
 *   es lo estándar).
 * - Sin entradas de directorio explícitas (`word/`, `word/media/`, etc. como
 *   archivos propios dentro del zip) — solo las partes reales.
 *
 * Se opera sobre los BYTES crudos de cada entrada (`asUint8Array`), nunca
 * como texto, para no corromper binarios (imágenes, hdphoto.wdp).
 */
export function reempaquetarZip(buffer: Buffer): Buffer {
  const origen = new PizZip(buffer)
  const destino = new PizZip()

  const CONTENT_TYPES = '[Content_Types].xml'
  const nombres = Object.keys(origen.files).filter(nombre => !origen.files[nombre].dir)
  const ordenados = [
    ...nombres.filter(n => n === CONTENT_TYPES),
    ...nombres.filter(n => n !== CONTENT_TYPES),
  ]

  for (const nombre of ordenados) {
    const contenido = origen.file(nombre)!.asUint8Array()
    destino.file(nombre, contenido, { binary: true, createFolders: false })
  }

  return destino.generate({ type: 'nodebuffer' }) as Buffer
}
