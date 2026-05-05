import { promises as fs } from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import { getFileContent } from './googleDrive'

// ─── Configuración ──────────────────────────────────────────────────────────
const TTL_MS = 24 * 60 * 60 * 1000 // 24h
const CACHE_DIR = path.join(os.tmpdir(), 'drive-cache')

function readConcurrency(): number {
  const raw = process.env.DRIVE_DOWNLOAD_CONCURRENCY
  if (!raw) return 5
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n > 0 && n <= 20 ? n : 5
}

let cacheDirEnsured = false
async function ensureCacheDir(): Promise<void> {
  if (cacheDirEnsured) return
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
    cacheDirEnsured = true
  } catch {
    // ignore — si no podemos crear, simplemente no cacheamos
  }
}

function cachePath(driveFileId: string): string {
  // sanitizar id para usarlo como filename
  const safe = driveFileId.replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(CACHE_DIR, `${safe}.bin`)
}

interface CacheStats {
  hits: number
  misses: number
  writeErrors: number
}

// Stats por invocación de generación (resetead por descargarImagenesDrive)
let stats: CacheStats = { hits: 0, misses: 0, writeErrors: 0 }

async function leerCache(driveFileId: string): Promise<Buffer | null> {
  try {
    const p = cachePath(driveFileId)
    const stat = await fs.stat(p)
    if (Date.now() - stat.mtimeMs > TTL_MS) {
      // Expirado — borrar y miss
      await fs.unlink(p).catch(() => {})
      return null
    }
    return await fs.readFile(p)
  } catch {
    return null
  }
}

async function escribirCache(driveFileId: string, buffer: Buffer): Promise<void> {
  try {
    await ensureCacheDir()
    await fs.writeFile(cachePath(driveFileId), buffer)
  } catch (err) {
    stats.writeErrors++
    console.warn(`[driveImageLoader] cache write failed for ${driveFileId}:`, err instanceof Error ? err.message : err)
  }
}

/**
 * Descarga un archivo de Drive y devuelve el buffer crudo + mimeType.
 * Usa caché en filesystem temp con TTL 24h.
 * Para cache hits el mimeType es 'image/jpeg' (fallback — el buffer es correcto).
 */
export async function descargarBufferDrive(
  driveFileId: string,
): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const cached = await leerCache(driveFileId)
  if (cached) {
    stats.hits++
    return { buffer: cached, mimeType: 'image/jpeg' }
  }

  stats.misses++
  try {
    const { data, mimeType } = await getFileContent(driveFileId)
    const mt = mimeType.startsWith('image/') ? mimeType : 'image/jpeg'
    void escribirCache(driveFileId, data)
    return { buffer: data, mimeType: mt }
  } catch (err) {
    console.warn(`[driveImageLoader] failed to fetch ${driveFileId}:`, err instanceof Error ? err.message : err)
    return null
  }
}

/**
 * Descarga un archivo de Google Drive y lo devuelve como base64 data URL listo
 * para incrustar en pptxgenjs. Usa caché en filesystem temp con TTL 24h.
 *
 * Si la descarga falla, devuelve null (el caller usa un placeholder).
 */
export async function descargarImagenDrive(driveFileId: string): Promise<string | null> {
  const result = await descargarBufferDrive(driveFileId)
  if (!result) return null
  return `data:${result.mimeType};base64,${result.buffer.toString('base64')}`
}

/**
 * Descarga múltiples imágenes en paralelo respetando un límite de concurrencia
 * (configurable vía `DRIVE_DOWNLOAD_CONCURRENCY`, default 5).
 * Devuelve un array del mismo length que el input, con null en las posiciones que fallaron.
 */
export async function descargarImagenesDrive(
  driveFileIds: (string | null | undefined)[],
  concurrencyOverride?: number,
): Promise<(string | null)[]> {
  // Resetear stats al inicio de cada batch
  stats = { hits: 0, misses: 0, writeErrors: 0 }

  const concurrency = concurrencyOverride ?? readConcurrency()
  const results: (string | null)[] = new Array(driveFileIds.length).fill(null)
  let cursor = 0

  async function worker() {
    while (cursor < driveFileIds.length) {
      const i = cursor++
      const id = driveFileIds[i]
      if (!id) continue
      results[i] = await descargarImagenDrive(id)
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, driveFileIds.length) },
    worker,
  )
  await Promise.all(workers)

  console.info(
    `[driveImageLoader] batch done: hits=${stats.hits} misses=${stats.misses} writeErrors=${stats.writeErrors} concurrency=${concurrency}`,
  )
  return results
}

/** Útil para tests / debug — devuelve las stats del último batch. */
export function getCacheStats(): Readonly<CacheStats> {
  return { ...stats }
}
