import sharp from 'sharp'

const ANCHO_MAXIMO_PX = 1600

/**
 * Redimensiona una imagen a máx. ANCHO_MAXIMO_PX de ancho manteniendo aspecto
 * (nunca agranda una imagen más chica). Preserva el formato original.
 * Si sharp no puede procesar el buffer (formato no soportado / corrupto),
 * devuelve el buffer original sin romper la subida.
 */
export async function redimensionarImagen(buffer: Buffer, mimeType: string): Promise<Buffer> {
  try {
    const img = sharp(buffer, { failOn: 'none' })
    const metadata = await img.metadata()
    if (!metadata.width || metadata.width <= ANCHO_MAXIMO_PX) {
      return buffer
    }
    return await img.resize({ width: ANCHO_MAXIMO_PX, withoutEnlargement: true }).toBuffer()
  } catch (err) {
    console.warn(`[plan-trabajo] No se pudo redimensionar imagen (${mimeType}) — se sube sin redimensionar:`, err instanceof Error ? err.message : err)
    return buffer
  }
}
