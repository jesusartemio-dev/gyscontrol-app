// ===================================================
// 📁 imagenesEpp.ts
// 📌 Trae de Drive las fotos de los EPP para el documento MPP.
//
// Antes las fotos estaban incrustadas en plantilla-mpp.xlsx y ancladas a filas
// fijas, así que el catálogo no se podía tocar sin descolocarlas. Ahora cada
// EPP referencia su imagen en la biblioteca global y el render las coloca en
// la fila que le toque.
// ===================================================

import { getFileContent } from '@/lib/services/googleDrive'
import sharp from 'sharp'

/**
 * Caché en memoria por archivo de Drive. El catálogo son 52 fotos que casi
 * nunca cambian y cada exportación las pediría todas de nuevo: sin esto, un
 * MPP son 52 llamadas a Drive.
 */
const TTL_MS = 60 * 60 * 1000
const cache = new Map<string, { buffer: Buffer; expira: number }>()

/** Alto de la celda de evidencia; más resolución que esto no se ve. */
const ALTO_MAX = 160

export interface ImagenEpp {
  orden: number
  buffer: Buffer
}

/**
 * Devuelve las fotos de los ítems que tengan una.
 *
 * Una foto que no se pueda bajar se omite en silencio: el documento sale con
 * esa celda vacía, que es mejor que no poder exportar.
 */
export async function cargarImagenesEpp(
  items: Array<{ orden: number; driveFileId: string | null }>,
): Promise<ImagenEpp[]> {
  const conFoto = items.filter(i => !!i.driveFileId)
  const resultados = await Promise.all(
    conFoto.map(async ({ orden, driveFileId }) => {
      const id = driveFileId!
      const enCache = cache.get(id)
      if (enCache && enCache.expira > Date.now()) {
        return { orden, buffer: enCache.buffer }
      }
      try {
        const { data } = await getFileContent(id)
        // Las de la plantilla pesaban hasta 300 KB; a 160 px de alto quedan en
        // unos pocos KB y el multipart no se vuelve un problema.
        const buffer = await achicar(data)
        cache.set(id, { buffer, expira: Date.now() + TTL_MS })
        return { orden, buffer }
      } catch (e) {
        console.error(`[mpp.imagenesEpp] No se pudo bajar la imagen ${id}:`, e)
        return null
      }
    }),
  )
  return resultados.filter((x): x is ImagenEpp => x !== null)
}

export function limpiarCacheImagenesEpp() {
  cache.clear()
}

/**
 * Reduce la foto al alto de la celda; si falla, se usa tal cual.
 *
 * Que falle importa y por eso se avisa: las 52 fotos pesan 3.3 MB en su
 * tamaño original y 0.7 MB reducidas, y el envío al render tiene 4.5 MB de
 * tope. Sin reducir se acerca peligrosamente, y en silencio no habría forma
 * de saber que es eso.
 */
async function achicar(buffer: Buffer): Promise<Buffer> {
  try {
    return await sharp(buffer, { failOn: 'none' })
      .resize({ height: ALTO_MAX, withoutEnlargement: true })
      .toBuffer()
  } catch (e) {
    console.warn('[mpp.imagenesEpp] No se pudo reducir una foto, va en su tamaño original:', e)
    return buffer
  }
}
