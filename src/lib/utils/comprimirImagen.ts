/**
 * Compresión de imágenes en el navegador, antes de subirlas.
 *
 * Motivo: las fotos de evidencia se toman con el celular en campo (3–8 MB por
 * foto, 4000px de lado). Subirlas crudas es lento con datos móviles y, sobre
 * todo, las funciones serverless de Vercel rechazan cuerpos de request de más
 * de ~4.5MB — una foto de celular sin comprimir puede fallar con 413 en
 * producción aunque el límite declarado en la API sea 15MB.
 *
 * Reescalando el lado mayor a 1920px con JPEG q=0.8 una foto típica queda en
 * 250–600 KB, lo que hace viable subir varias fotos por registro.
 *
 * Si algo falla (formato que el canvas no sabe decodificar, memoria, etc.) se
 * devuelve el archivo original: comprimir es una optimización, nunca un
 * bloqueo para guardar la evidencia.
 */

export interface OpcionesCompresion {
  /** Lado mayor máximo en px. */
  maxLado?: number
  /** Calidad JPEG 0–1. */
  calidad?: number
  /** Archivos por debajo de este tamaño se dejan tal cual. */
  omitirSiMenorA?: number
}

const DEFAULTS: Required<OpcionesCompresion> = {
  maxLado: 1920,
  calidad: 0.8,
  omitirSiMenorA: 400 * 1024, // 400KB
}

function cambiarExtensionAJpg(nombre: string): string {
  return nombre.replace(/\.[^./\\]+$/, '') + '.jpg'
}

async function decodificar(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // `imageOrientation: 'from-image'` aplica el EXIF de rotación del celular;
  // sin esto las fotos verticales se suben acostadas.
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file, { imageOrientation: 'from-image' })
  }
  // Fallback (Safari viejo): <img> + objectURL. El navegador ya honra el EXIF
  // al pintar en canvas desde un <img> en versiones recientes.
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => reject(new Error('No se pudo decodificar la imagen'))
      img.src = url
    })
  } finally {
    // El bitmap ya está en memoria una vez resuelto el onload.
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}

function aBlob(canvas: HTMLCanvasElement, calidad: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', calidad))
}

/**
 * Devuelve una versión reescalada/comprimida del archivo, o el original si no
 * hace falta comprimir o si la compresión falla.
 */
export async function comprimirImagen(
  file: File,
  opciones: OpcionesCompresion = {},
): Promise<File> {
  const { maxLado, calidad, omitirSiMenorA } = { ...DEFAULTS, ...opciones }

  if (typeof document === 'undefined') return file
  if (!file.type.startsWith('image/')) return file
  // Los GIF/SVG pierden animación o vectorización al pasar por canvas.
  if (file.type === 'image/gif' || file.type === 'image/svg+xml') return file
  if (file.size <= omitirSiMenorA) return file

  let bitmap: ImageBitmap | HTMLImageElement | null = null
  try {
    bitmap = await decodificar(file)
    const anchoOrig = 'width' in bitmap ? bitmap.width : 0
    const altoOrig = 'height' in bitmap ? bitmap.height : 0
    if (!anchoOrig || !altoOrig) return file

    const escala = Math.min(1, maxLado / Math.max(anchoOrig, altoOrig))
    const ancho = Math.round(anchoOrig * escala)
    const alto = Math.round(altoOrig * escala)

    const canvas = document.createElement('canvas')
    canvas.width = ancho
    canvas.height = alto
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap as CanvasImageSource, 0, 0, ancho, alto)

    const blob = await aBlob(canvas, calidad)
    // Liberar el canvas grande cuanto antes (iOS es agresivo con la memoria).
    canvas.width = 0
    canvas.height = 0
    if (!blob) return file

    // Si comprimir no ganó nada (p.ej. imagen ya optimizada), quedarse con el original.
    if (blob.size >= file.size) return file

    return new File([blob], cambiarExtensionAJpg(file.name), {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    })
  } catch {
    return file
  } finally {
    if (bitmap && 'close' in bitmap) bitmap.close()
  }
}
