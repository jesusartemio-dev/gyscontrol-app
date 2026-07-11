import { readFile } from 'fs/promises'
import path from 'path'

// Plantilla oficial versionada en el repo — a diferencia de plan-trabajo, no
// hay fallback a Google Drive: este archivo vive en el repo, no en Drive.
const TEMPLATE_LOCAL_PATH = path.join(
  process.cwd(),
  'src/lib/services/Matriz/plantilla_matriz_comunicacion.docx'
)

const TTL_MS = 30 * 60 * 1000
let cache: { buffer: Buffer; cargadoEn: number } | null = null

export async function descargarPlantillaMatrizOficial(): Promise<Buffer> {
  if (cache && Date.now() - cache.cargadoEn < TTL_MS) {
    return cache.buffer
  }
  const buffer = await readFile(TEMPLATE_LOCAL_PATH)
  cache = { buffer, cargadoEn: Date.now() }
  return buffer
}

export function limpiarCachePlantillaMatriz() {
  cache = null
}
