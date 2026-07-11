const TTL_MS = 30 * 60 * 1000

/**
 * Fábrica de cargadores de plantilla local con caché TTL en memoria — un
 * cargador independiente por tipo de documento, cada uno con su propio caché
 * (nunca compartido entre plantillas distintas).
 *
 * Recibe la LECTURA (`cargarBytes`), no una ruta — el file-tracing de Vercel
 * (`@vercel/nft`) solo detecta como dependencia del bundle un `readFile` con
 * ruta literal en el MISMO archivo/módulo que lo invoca; si la ruta viaja
 * como string a través de esta fábrica, el .docx queda fuera del deploy y
 * revienta con ENOENT en producción (bug real, ver commit que agregó esto).
 * Cada caller debe construir su propio `path.join(process.cwd(), 'literal')`
 * + `readFile(...)` en su propio archivo, y pasar solo la función acá.
 */
export function crearCargadorPlantillaLocal(cargarBytes: () => Promise<Buffer>) {
  let cache: { buffer: Buffer; cargadoEn: number } | null = null

  async function cargar(): Promise<Buffer> {
    if (cache && Date.now() - cache.cargadoEn < TTL_MS) {
      return cache.buffer
    }
    const buffer = await cargarBytes()
    cache = { buffer, cargadoEn: Date.now() }
    return buffer
  }

  function limpiarCache() {
    cache = null
  }

  return { cargar, limpiarCache }
}
