import { listFiles, createFolder, getSharedDriveId } from '@/lib/services/googleDrive'

const FOLDER_MIME = 'application/vnd.google-apps.folder'

/** Busca la carpeta PETS_<codigo> en el SharedDrive; la crea si no existe. */
export async function getOrCreatePetsFolder(proyectoCodigo: string): Promise<string> {
  const parentId = getSharedDriveId()
  const folderName = `PETS_${proyectoCodigo}`

  const { files } = await listFiles({ folderId: parentId, query: folderName, pageSize: 20 })

  const existing = files.find(f => f.name === folderName && f.mimeType === FOLDER_MIME)
  if (existing?.id) return existing.id

  const folder = await createFolder({ parentId, folderName })
  if (!folder.id) throw new Error('Drive no devolvió id para la carpeta creada')
  return folder.id
}
