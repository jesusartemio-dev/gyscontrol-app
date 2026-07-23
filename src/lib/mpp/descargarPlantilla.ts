import { readFile } from 'fs/promises'
import path from 'path'
import { getFileContent } from '@/lib/services/googleDrive'

const TTL_MS = 30 * 60 * 1000
const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

// Plantilla versionada en el repo — fuente de verdad (mismo patrón que Plan de Trabajo).
const TEMPLATE_LOCAL_PATH = path.join(
  process.cwd(),
  'src/lib/services/mpp/templates/plantilla-mpp.xlsx'
)

let cache: { buffer: Buffer; expira: number } | null = null

export async function descargarPlantillaMpp(): Promise<Buffer> {
  if (cache && cache.expira > Date.now()) return cache.buffer

  try {
    const buffer = await readFile(TEMPLATE_LOCAL_PATH)
    cache = { buffer, expira: Date.now() + TTL_MS }
    return buffer
  } catch (e) {
    console.warn(
      `[mpp] No se pudo leer la plantilla local (${TEMPLATE_LOCAL_PATH}). Usando fallback de Google Drive — retirar este fallback una vez validada la plantilla local en todos los ambientes.`,
      e instanceof Error ? e.message : e
    )
  }

  return descargarPlantillaDrive()
}

// Fallback temporal a Google Drive — retirar tras validar la plantilla local.
async function descargarPlantillaDrive(): Promise<Buffer> {
  const fileId = process.env.GOOGLE_DRIVE_MPP_TEMPLATE_FILE_ID
  if (!fileId) {
    throw new Error(
      'Plantilla local no encontrada y GOOGLE_DRIVE_MPP_TEMPLATE_FILE_ID no está configurado'
    )
  }

  let result: { data: Buffer; mimeType: string }
  try {
    result = await getFileContent(fileId)
  } catch (e: unknown) {
    const err = e as { code?: number; message?: string }
    if (err.code === 404) {
      throw new Error(
        `Plantilla MPP no encontrada (fileId: ${fileId}). Verificar que existe en Drive.`
      )
    }
    if (err.code === 403) {
      throw new Error(
        `Service account sin acceso a la plantilla MPP (fileId: ${fileId}). ` +
        'Compartir con gyscontrol-drive@gys-maps.iam.gserviceaccount.com.'
      )
    }
    throw new Error(`Error al descargar plantilla MPP de Drive: ${err.message ?? String(e)}`)
  }

  if (result.mimeType !== MIME_XLSX) {
    throw new Error(
      `Plantilla MPP mimeType inesperado: ${result.mimeType}. ` +
      'Debe ser .xlsx nativo, no Google Sheets.'
    )
  }

  cache = { buffer: result.data, expira: Date.now() + TTL_MS }
  return result.data
}

export function limpiarCachePlantillaMpp() {
  cache = null
}
