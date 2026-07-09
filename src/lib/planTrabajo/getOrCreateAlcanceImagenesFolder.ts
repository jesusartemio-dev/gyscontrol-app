import { getOrCreateFolder, getSharedDriveId } from '@/lib/services/googleDrive'
import { getOrCreatePlanTrabajoFolder } from './getOrCreatePlanTrabajoFolder'

/** Subcarpeta "Imagenes_AlcanceDetallado" dentro de PlanTrabajo_<codigo> en el SharedDrive. */
export async function getOrCreateAlcanceImagenesFolder(proyectoCodigo: string): Promise<string> {
  const planFolderId = await getOrCreatePlanTrabajoFolder(proyectoCodigo)
  return getOrCreateFolder(planFolderId, 'Imagenes_AlcanceDetallado', getSharedDriveId())
}
