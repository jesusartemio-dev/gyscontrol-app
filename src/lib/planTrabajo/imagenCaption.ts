/**
 * Puro, sin dependencias de servidor (Prisma/fs) — se importa tanto desde
 * construirDataBag.ts (export) como desde componentes cliente de la galería,
 * igual que agruparYOrdenarPorEstructura.ts (ver ese archivo para el porqué).
 */

/**
 * Caption efectivo de una imagen del alcance detallado. Bug del Bloque 4: el
 * caption por defecto al subir era el nombre del archivo (ej.
 * "6164a4de9aa415bc388b4567_color"), no el de la actividad/EDT. Como no hay
 * forma de saber si un caption fue editado a mano o quedó en ese default sin
 * tocar, se aplica una migración suave: si el caption persistido coincide
 * EXACTAMENTE con el nombre de archivo (sin extensión), se sustituye por el
 * nombre real de la actividad/EDT al mostrar/exportar — nunca se reescribe
 * la BD, solo el render.
 */
export function captionEfectivo(
  imagen: { caption: string | null; nombreArchivo: string },
  nombreDefault: string
): string {
  const captionActual = imagen.caption?.trim() ?? ''
  if (!captionActual) return nombreDefault
  const sinExtension = imagen.nombreArchivo.replace(/\.[^.]+$/, '').trim()
  return captionActual === sinExtension ? nombreDefault : captionActual
}
