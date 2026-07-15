import { writeFileSync, mkdirSync, existsSync } from 'fs'
import path from 'path'
import os from 'os'

/**
 * Fix del bug de "cajitas" en los histogramas del §13 del Plan de Trabajo
 * (informe §13, Bug 1): el SVG de `generarHistogramaPng.ts` no declaraba
 * `font-family`, y el runtime serverless de Vercel/Lambda no trae fuentes de
 * sistema instaladas. `sharp` empaqueta su propio `fontconfig` (confirmado:
 * `sharp.versions.fontconfig`), pero fontconfig es solo la librería de
 * RESOLUCIÓN de fuentes — no trae ningún archivo .ttf/.otf (confirmado
 * inspeccionando los tarballs npm `@img/sharp-linux-x64` y
 * `@img/sharp-libvips-linux-x64`: cero archivos de fuente). Sin fuentes
 * reales en el sistema, fontconfig no tiene nada que ofrecerle a
 * pango/librsvg para dibujar texto → glifo `.notdef` (la "cajita") para todo
 * carácter, sin importar qué `font-family` se pida.
 *
 * Fix: apuntar fontconfig a una fuente EMPAQUETADA EN EL REPO (DejaVu Sans,
 * licencia Bitstream Vera — permisiva, permite redistribución) en vez de
 * depender de que el runtime tenga alguna instalada. Se genera un
 * `fonts.conf` mínimo en un directorio escribible (`os.tmpdir()` — en Vercel
 * es `/tmp`, el único directorio con permiso de escritura en la función) que
 * apunta `<dir>` a la carpeta de fuentes del repo, y se setea
 * `FONTCONFIG_FILE` ANTES de la primera llamada a `sharp(...).png()` de la
 * sesión del proceso (fontconfig inicializa su estado la primera vez que se
 * usa dentro del proceso — si el env var no está seteado en ese momento, no
 * sirve setearlo después).
 */

const FUENTES_DIR = path.join(process.cwd(), 'src/lib/planTrabajo/fonts')
const FONTCONFIG_DIR = path.join(os.tmpdir(), 'plan-trabajo-fontconfig')
const FONTCONFIG_CACHE_DIR = path.join(FONTCONFIG_DIR, 'cache')
const FONTCONFIG_FILE_PATH = path.join(FONTCONFIG_DIR, 'fonts.conf')

let configurado = false

/** Convierte a formato POSIX (barras `/`) — fontconfig no resuelve `\` en Windows dentro del XML. */
function aRutaPosix(p: string): string {
  return p.split(path.sep).join('/')
}

/**
 * Idempotente por proceso — se puede llamar en cada render sin costo extra
 * tras la primera vez (instancias "warm" de la función reusan el mismo
 * proceso Node, así que solo hace falta escribir el archivo una vez).
 */
export function asegurarFontconfigParaHistogramas(): void {
  if (configurado) return

  mkdirSync(FONTCONFIG_CACHE_DIR, { recursive: true })

  const fontsConf = `<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <dir>${aRutaPosix(FUENTES_DIR)}</dir>
  <cachedir>${aRutaPosix(FONTCONFIG_CACHE_DIR)}</cachedir>
</fontconfig>
`
  writeFileSync(FONTCONFIG_FILE_PATH, fontsConf, 'utf-8')
  process.env.FONTCONFIG_FILE = FONTCONFIG_FILE_PATH

  configurado = true
}

/** Solo para tests — resetea el flag de "ya configurado" entre casos. */
export function _resetFontconfigParaTests(): void {
  configurado = false
}

/** Nombre de familia real del .ttf empaquetado (Regular + Bold) — usar tal cual en `font-family` del SVG. */
export const FUENTE_HISTOGRAMAS = 'DejaVu Sans'

/** Existe solo para que un test pueda confirmar que el archivo de fuente realmente está en el repo (no solo referenciado). */
export function rutaArchivosFuente(): string[] {
  return [path.join(FUENTES_DIR, 'DejaVuSans.ttf'), path.join(FUENTES_DIR, 'DejaVuSans-Bold.ttf')]
}

export function fuentesDisponibles(): boolean {
  return rutaArchivosFuente().every(existsSync)
}
