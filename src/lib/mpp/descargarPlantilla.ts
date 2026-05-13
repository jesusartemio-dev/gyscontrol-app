import { getFileContent } from '@/lib/services/googleDrive'

const TTL_MS = 30 * 60 * 1000
const MIME_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

let cache: { buffer: Buffer; expira: number } | null = null

export async function descargarPlantillaMpp(): Promise<Buffer> {
  if (cache && cache.expira > Date.now()) return cache.buffer

  const fileId = process.env.GOOGLE_DRIVE_MPP_TEMPLATE_FILE_ID
  if (!fileId) {
    throw new Error('GOOGLE_DRIVE_MPP_TEMPLATE_FILE_ID no configurado')
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
