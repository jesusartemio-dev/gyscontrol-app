import { readFile } from 'fs/promises'
import path from 'path'

const TTL_MS = 30 * 60 * 1000

/**
 * Fábrica de cargadores de plantilla local con caché TTL en memoria — un
 * cargador independiente por tipo de documento, cada uno con su propio caché
 * (nunca compartido entre plantillas distintas).
 */
export function crearCargadorPlantillaLocal(rutaRelativa: string) {
  const rutaAbsoluta = path.join(process.cwd(), rutaRelativa)
  let cache: { buffer: Buffer; cargadoEn: number } | null = null

  async function cargar(): Promise<Buffer> {
    if (cache && Date.now() - cache.cargadoEn < TTL_MS) {
      return cache.buffer
    }
    const buffer = await readFile(rutaAbsoluta)
    cache = { buffer, cargadoEn: Date.now() }
    return buffer
  }

  function limpiarCache() {
    cache = null
  }

  return { cargar, limpiarCache }
}
