import { getFileContent } from '@/lib/services/googleDrive'

const TTL_MS = 30 * 60 * 1000
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const MIME_GOOGLE_DOC = 'application/vnd.google-apps.document'

let cache: { buffer: Buffer; cargadoEn: number } | null = null

export async function descargarPlantillaPlanTrabajo(): Promise<Buffer> {
  if (cache && Date.now() - cache.cargadoEn < TTL_MS) {
    return cache.buffer
  }

  const fileId = process.env.GOOGLE_DRIVE_PLAN_TEMPLATE_FILE_ID
  if (!fileId) {
    throw new Error('GOOGLE_DRIVE_PLAN_TEMPLATE_FILE_ID no está configurado')
  }

  let result: { data: Buffer; mimeType: string }
  try {
    result = await getFileContent(fileId)
  } catch (e: unknown) {
    const err = e as { code?: number; message?: string }
    if (err.code === 404) {
      throw new Error(`Plantilla no encontrada (fileId: ${fileId}). Verificar que existe en Drive.`)
    }
    if (err.code === 403) {
      throw new Error(`Service account sin acceso a la plantilla (fileId: ${fileId}). Compartir el archivo con el service account.`)
    }
    throw new Error(`Error al descargar plantilla de Drive: ${err.message ?? String(e)}`)
  }

  if (result.mimeType === MIME_GOOGLE_DOC) {
    throw new Error(
      'La plantilla es un Google Doc, no un .docx nativo. Re-subirla con la opción "Convertir uploads" desactivada en Drive.'
    )
  }
  if (result.mimeType !== MIME_DOCX) {
    throw new Error(`MimeType inesperado: ${result.mimeType}. Esperado: ${MIME_DOCX}`)
  }

  cache = { buffer: result.data, cargadoEn: Date.now() }
  return result.data
}

export function limpiarCachePlantilla() {
  cache = null
}
