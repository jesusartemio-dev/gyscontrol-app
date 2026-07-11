import sharp from 'sharp'

/**
 * Normaliza el PNG del organigrama capturado en el cliente al tamaño del
 * placeholder `word/media/organigrama.png` de la plantilla (ratio ≈1.7547 =
 * 9300000/5300000 EMU). Fondo blanco opaco (no transparente): el canvas de
 * captura ya usa #F8FAFC como fondo, así que el padding queda visualmente
 * continuo con el propio árbol, y esta imagen ocupa toda una página apaisada
 * por sí sola (a diferencia del logo, un badge chico sobre otro fondo) —
 * transparencia acá solo arriesga artefactos si el .docx se reconvierte a PDF.
 *
 * No comparte código con resolverLogoCliente.ts: esa función descarga de
 * Drive por URL; esta recibe un Buffer ya en memoria subido por el cliente en
 * el mismo request — forma de entrada e I/O distintas.
 */
const ANCHO_PX = 2400
const ALTO_PX = 1368 // 2400 / 1.7547 ≈ 1368

export async function normalizarImagenOrganigrama(buffer: Buffer): Promise<Buffer> {
  return sharp(buffer)
    .resize(ANCHO_PX, ALTO_PX, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer()
}
