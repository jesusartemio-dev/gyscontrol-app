import sharp from 'sharp'
import { descargarBufferDrive } from '@/lib/services/driveImageLoader'
import type { PlanTrabajoImagen } from '@prisma/client'
import type { ImagenResueltaTag } from './exportDocx'

/**
 * Resuelve las imágenes de alcanceDetallado a {data, width, height} (base64 +
 * dimensiones reales, leídas con sharp) ANTES de renderizar el docx —
 * docxtemplater-image-module-free exige que getImage/getSize sean síncronos,
 * así que toda la parte async (descarga de Drive + lectura de dimensiones)
 * debe resolverse de antemano (Bloque 4, Tarea 4).
 * Imagen inaccesible o sin driveFileId → null (getSize la trata como
 * placeholder 1×1, nunca rompe el export) + warning en consola.
 */
export async function resolverImagenesAlcance(
  imagenes: Pick<PlanTrabajoImagen, 'id' | 'driveFileId'>[]
): Promise<Map<string, ImagenResueltaTag | null>> {
  const resultado = new Map<string, ImagenResueltaTag | null>()

  await Promise.all(
    imagenes.map(async img => {
      if (!img.driveFileId) {
        console.warn(`[plan-trabajo] Imagen ${img.id} sin driveFileId — se exporta como placeholder.`)
        resultado.set(img.id, null)
        return
      }

      const descargada = await descargarBufferDrive(img.driveFileId)
      if (!descargada) {
        console.warn(`[plan-trabajo] No se pudo descargar de Drive la imagen ${img.id} (driveFileId=${img.driveFileId}) — se exporta como placeholder.`)
        resultado.set(img.id, null)
        return
      }

      try {
        const metadata = await sharp(descargada.buffer).metadata()
        resultado.set(img.id, {
          data: `data:${descargada.mimeType};base64,${descargada.buffer.toString('base64')}`,
          width: metadata.width ?? 0,
          height: metadata.height ?? 0,
        })
      } catch (e) {
        console.warn(`[plan-trabajo] No se pudieron leer las dimensiones de la imagen ${img.id} — se exporta como placeholder:`, e instanceof Error ? e.message : e)
        resultado.set(img.id, null)
      }
    })
  )

  return resultado
}
