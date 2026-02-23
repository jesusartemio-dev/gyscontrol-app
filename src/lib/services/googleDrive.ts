import { google, drive_v3 } from 'googleapis'
import { Readable } from 'stream'

const SCOPES = ['https://www.googleapis.com/auth/drive']

let driveClient: drive_v3.Drive | null = null

function getDriveClient(): drive_v3.Drive {
  if (driveClient) return driveClient

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!email || !key) {
    throw new Error('Google Drive Service Account credentials not configured')
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: email,
      private_key: key,
    },
    scopes: SCOPES,
  })

  driveClient = google.drive({ version: 'v3', auth })
  return driveClient
}

export function getSharedDriveId(): string {
  const id = process.env.GOOGLE_SHARED_DRIVE_ID
  if (!id) throw new Error('GOOGLE_SHARED_DRIVE_ID not configured')
  return id
}

export function getAdminDriveId(): string {
  const id = process.env.GOOGLE_ADMIN_DRIVE_ID
  if (id) return id
  // Fallback: usar Drive de Proyectos si no está configurado el de Admin
  console.warn('[GoogleDrive] GOOGLE_ADMIN_DRIVE_ID no configurado, usando GOOGLE_SHARED_DRIVE_ID como fallback')
  return getSharedDriveId()
}

/** IDs de drives permitidos para validación de seguridad */
export function getAllowedDriveIds(): string[] {
  const ids = [getSharedDriveId()]
  const adminId = process.env.GOOGLE_ADMIN_DRIVE_ID
  if (adminId && !ids.includes(adminId)) ids.push(adminId)
  return ids
}

export async function listFiles(options: {
  folderId?: string
  query?: string
  pageSize?: number
  pageToken?: string
  orderBy?: string
  driveId?: string
}) {
  const drive = getDriveClient()
  const { folderId, query, pageSize = 50, pageToken, orderBy = 'folder,name', driveId } = options
  const sharedDriveId = driveId || getSharedDriveId()

  // Build query: files in folder, not trashed
  const qParts: string[] = ['trashed = false']

  if (folderId) {
    qParts.push(`'${folderId}' in parents`)
  }

  if (query) {
    qParts.push(`name contains '${query.replace(/'/g, "\\'")}'`)
  }

  const res = await drive.files.list({
    q: qParts.join(' and '),
    pageSize,
    pageToken: pageToken || undefined,
    orderBy,
    fields: 'nextPageToken, files(id, name, mimeType, size, modifiedTime, webViewLink, thumbnailLink, iconLink, parents, createdTime)',
    supportsAllDrives: true,
    includeItemsFromAllDrives: true,
    driveId: sharedDriveId,
    corpora: 'drive',
  })

  return {
    files: res.data.files || [],
    nextPageToken: res.data.nextPageToken || undefined,
  }
}

export async function getFile(fileId: string) {
  const drive = getDriveClient()

  const res = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, size, modifiedTime, webViewLink, thumbnailLink, iconLink, parents, createdTime',
    supportsAllDrives: true,
  })

  return res.data
}

export async function getFileContent(fileId: string): Promise<{
  data: Buffer
  mimeType: string
  fileName: string
}> {
  const drive = getDriveClient()

  // First get metadata for mimeType and name
  const meta = await drive.files.get({
    fileId,
    fields: 'name, mimeType',
    supportsAllDrives: true,
  })

  const mimeType = meta.data.mimeType || 'application/octet-stream'
  const fileName = meta.data.name || 'download'

  // For Google Workspace files, export as PDF
  const googleTypes: Record<string, string> = {
    'application/vnd.google-apps.document': 'application/pdf',
    'application/vnd.google-apps.spreadsheet': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.google-apps.presentation': 'application/pdf',
    'application/vnd.google-apps.drawing': 'application/pdf',
  }

  if (googleTypes[mimeType]) {
    const exportMime = googleTypes[mimeType]
    const res = await drive.files.export({
      fileId,
      mimeType: exportMime,
    }, { responseType: 'arraybuffer' })

    return {
      data: Buffer.from(res.data as ArrayBuffer),
      mimeType: exportMime,
      fileName: `${fileName}.${exportMime === 'application/pdf' ? 'pdf' : 'xlsx'}`,
    }
  }

  // Regular files - download directly
  const res = await drive.files.get({
    fileId,
    alt: 'media',
    supportsAllDrives: true,
  }, { responseType: 'arraybuffer' })

  return {
    data: Buffer.from(res.data as ArrayBuffer),
    mimeType,
    fileName,
  }
}

export async function uploadFile(options: {
  folderId: string
  fileName: string
  mimeType: string
  buffer: Buffer
}) {
  const drive = getDriveClient()
  const { folderId, fileName, mimeType, buffer } = options

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(buffer),
    },
    fields: 'id, name, mimeType, size, modifiedTime, webViewLink, thumbnailLink, iconLink, parents, createdTime',
    supportsAllDrives: true,
  })

  return res.data
}

export async function createFolder(options: {
  parentId: string
  folderName: string
}) {
  const drive = getDriveClient()
  const { parentId, folderName } = options

  const res = await drive.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentId],
    },
    fields: 'id, name, mimeType, webViewLink, parents, createdTime',
    supportsAllDrives: true,
  })

  return res.data
}
