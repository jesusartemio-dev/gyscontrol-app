import { getOrCreateFolder, getSharedDriveId } from '@/lib/services/googleDrive'

const NOMBRE_CARPETA = 'Biblioteca PT — Imágenes de referencia'

/**
 * Carpeta GLOBAL (no por proyecto) en la raíz del mismo Shared Drive que ya
 * usa la app para los docx exportados — sin caché en BD, mismo patrón
 * lookup-por-nombre que getOrCreatePlanTrabajoFolder.ts (idempotente: Drive
 * ya garantiza que una búsqueda repetida encuentra la misma carpeta).
 */
export async function getOrCreateCatalogoImagenesFolder(): Promise<string> {
  const sharedDriveId = getSharedDriveId()
  return getOrCreateFolder(sharedDriveId, NOMBRE_CARPETA, sharedDriveId)
}
