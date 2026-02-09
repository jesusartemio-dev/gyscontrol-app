export interface DriveItem {
  id: string
  name: string
  mimeType: string
  size?: string
  modifiedTime?: string
  createdTime?: string
  webViewLink?: string
  thumbnailLink?: string
  iconLink?: string
  parents?: string[]
}

export interface DriveListResponse {
  files: DriveItem[]
  nextPageToken?: string
}

export interface BreadcrumbItem {
  id: string
  name: string
}

export type ViewMode = 'grid' | 'list'

export const MIME_TYPE_FOLDER = 'application/vnd.google-apps.folder'

export const GOOGLE_WORKSPACE_TYPES = [
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.presentation',
  'application/vnd.google-apps.drawing',
]

export function isFolder(mimeType: string): boolean {
  return mimeType === MIME_TYPE_FOLDER
}

export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/')
}

export function isPdf(mimeType: string): boolean {
  return mimeType === 'application/pdf'
}

export function isGoogleWorkspace(mimeType: string): boolean {
  return GOOGLE_WORKSPACE_TYPES.includes(mimeType)
}

export function getFileExtension(name: string): string {
  const parts = name.split('.')
  return parts.length > 1 ? parts.pop()!.toLowerCase() : ''
}

export function formatFileSize(bytes?: string | number): string {
  if (!bytes) return ''
  const b = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes
  if (isNaN(b)) return ''
  if (b < 1024) return `${b} B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`
  if (b < 1024 * 1024 * 1024) return `${(b / (1024 * 1024)).toFixed(1)} MB`
  return `${(b / (1024 * 1024 * 1024)).toFixed(1)} GB`
}
