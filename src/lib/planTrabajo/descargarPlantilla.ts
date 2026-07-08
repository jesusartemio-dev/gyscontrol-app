import { readFile } from 'fs/promises'
import path from 'path'
import { getFileContent } from '@/lib/services/googleDrive'

const TTL_MS = 30 * 60 * 1000
const MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
const MIME_GOOGLE_DOC = 'application/vnd.google-apps.document'

// Plantilla versionada en el repo — fuente de verdad (informe §4.5: gobernanza de plantilla).
const TEMPLATE_LOCAL_PATH = path.join(
  process.cwd(),
  'src/lib/services/planTrabajo/templates/plan-trabajo-nexa-template.docx'
)

let cache: { buffer: Buffer; cargadoEn: number } | null = null

export async function descargarPlantillaPlanTrabajo(): Promise<Buffer> {
  if (cache && Date.now() - cache.cargadoEn < TTL_MS) {
    return cache.buffer
  }

  try {
    const buffer = await readFile(TEMPLATE_LOCAL_PATH)
    cache = { buffer, cargadoEn: Date.now() }
    return buffer
  } catch (e) {
    console.warn(
      `[plan-trabajo] No se pudo leer la plantilla local (${TEMPLATE_LOCAL_PATH}). Usando fallback de Google Drive — retirar este fallback una vez validada la plantilla local en todos los ambientes.`,
      e instanceof Error ? e.message : e
    )
  }

  return descargarPlantillaDrive()
}

// Fallback temporal a Google Drive — retirar tras validar la plantilla local (informe §4.5).
async function descargarPlantillaDrive(): Promise<Buffer> {
  const fileId = process.env.GOOGLE_DRIVE_PLAN_TEMPLATE_FILE_ID
  if (!fileId) {
    throw new Error(
      'Plantilla local no encontrada y GOOGLE_DRIVE_PLAN_TEMPLATE_FILE_ID no está configurado'
    )
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
