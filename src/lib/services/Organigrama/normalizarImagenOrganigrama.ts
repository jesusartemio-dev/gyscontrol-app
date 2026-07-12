import sharp from 'sharp'

/**
 * Normaliza el PNG del organigrama capturado en el cliente — SOLO garantiza
 * un ancho mínimo de impresión nítida (≥2000px), sin tocar el aspect ratio y
 * SIN padding: el bug real detectado (cajas chicas con mucho blanco
 * alrededor en el Word de G300) era forzar la imagen a un canvas 1.7547:1
 * fijo con `fit:'contain'` — el árbol real (~2.1:1) quedaba con franjas
 * blancas arriba/abajo. Ahora el tamaño del FRAME en el documento
 * (`wp:extent`/`a:ext`) se calcula dinámicamente a partir del aspect ratio
 * real de esta imagen (ver ajustarExtentImagenOrganigrama.ts) — la imagen
 * ocupa su propio frame a sangre, sin padding interno.
 *
 * No comparte código con resolverLogoCliente.ts: esa función descarga de
 * Drive por URL y SÍ necesita normalizar a un marco fijo (VML legacy de
 * tamaño constante); esta recibe un Buffer ya en memoria y el frame que la
 * contiene se ajusta a ELLA, no al revés.
 */
const ANCHO_MINIMO_PX = 2000

export interface ImagenNormalizada {
  buffer: Buffer
  width: number
  height: number
}

export async function normalizarImagenOrganigrama(buffer: Buffer): Promise<ImagenNormalizada> {
  const metadata = await sharp(buffer).metadata()
  const anchoOriginal = metadata.width ?? ANCHO_MINIMO_PX

  let pipeline = sharp(buffer)
  if (anchoOriginal < ANCHO_MINIMO_PX) {
    pipeline = pipeline.resize({ width: ANCHO_MINIMO_PX })
  }

  const { data, info } = await pipeline.png().toBuffer({ resolveWithObject: true })
  return { buffer: data, width: info.width, height: info.height }
}
