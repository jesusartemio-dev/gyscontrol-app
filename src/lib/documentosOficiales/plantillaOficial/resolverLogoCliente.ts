import sharp from 'sharp'
import { getFileContent } from '@/lib/services/googleDrive'

/**
 * El logo del cliente se inyecta reemplazando los BYTES de `word/media/image4.png`
 * dentro del zip del .docx (byte-swap directo, sin módulo de imagen de
 * docxtemplater) — el marco está embebido vía VML legacy con tamaño fijo
 * ~81pt×19.5pt (≈428×104px, ratio ≈4:1). Cualquier imagen inyectada se estira a
 * esa caja, así que se normaliza con `sharp` (fit:'contain' + fondo
 * transparente) para no deformar logos con otro aspecto.
 *
 * Más simple que el caso de docxtemplater-image-module-free (ver
 * planTrabajo/resolverImagenesAlcance.ts): acá no hay restricción síncrona de
 * getImage/getSize, es un reemplazo de bytes de una media part cualquiera,
 * 100% async-friendly.
 *
 * Firmas (image1/2/3.png) — fuera de alcance, PNG transparentes 1×1 sin tocar.
 * Un futuro byte-swap de firma por persona seguiría este mismo patrón.
 */
const ANCHO_LOGO_PX = 428
const ALTO_LOGO_PX = 104

export async function resolverLogoClienteBuffer(logoUrl: string | null | undefined): Promise<Buffer | null> {
  if (!logoUrl) {
    console.warn('[plantilla-oficial] Cliente sin logoUrl — se mantiene el logo placeholder de la plantilla.')
    return null
  }

  try {
    const { data } = await getFileContent(logoUrl)
    return await sharp(data)
      .resize(ANCHO_LOGO_PX, ALTO_LOGO_PX, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .png()
      .toBuffer()
  } catch (e) {
    console.warn(
      `[plantilla-oficial] No se pudo resolver el logo del cliente (logoUrl: ${logoUrl}) — se mantiene el placeholder de la plantilla.`,
      e instanceof Error ? e.message : e
    )
    return null
  }
}
