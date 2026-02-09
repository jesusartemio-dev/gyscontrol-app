'use client'

import {
  Folder,
  FileText,
  Image,
  FileSpreadsheet,
  Presentation,
  File,
  FileCode,
  FileArchive,
  Film,
  Music,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { DriveItem, ViewMode } from '@/types/drive'
import { isFolder, formatFileSize } from '@/types/drive'

interface DriveFileListProps {
  files: DriveItem[]
  viewMode: ViewMode
  loading: boolean
  onFileClick: (file: DriveItem) => void
  onFolderClick: (folder: DriveItem) => void
  selectedFileId?: string
  compact?: boolean
}

function getFileIcon(mimeType: string) {
  if (isFolder(mimeType)) return { icon: Folder, color: 'text-blue-500' }
  if (mimeType === 'application/pdf') return { icon: FileText, color: 'text-red-500' }
  if (mimeType.startsWith('image/')) return { icon: Image, color: 'text-green-500' }
  if (mimeType.includes('spreadsheet') || mimeType.includes('excel'))
    return { icon: FileSpreadsheet, color: 'text-emerald-600' }
  if (mimeType.includes('presentation') || mimeType.includes('powerpoint'))
    return { icon: Presentation, color: 'text-orange-500' }
  if (mimeType.includes('document') || mimeType.includes('word'))
    return { icon: FileText, color: 'text-blue-600' }
  if (mimeType.startsWith('video/')) return { icon: Film, color: 'text-purple-500' }
  if (mimeType.startsWith('audio/')) return { icon: Music, color: 'text-pink-500' }
  if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('tar'))
    return { icon: FileArchive, color: 'text-yellow-600' }
  if (mimeType.includes('json') || mimeType.includes('xml') || mimeType.includes('html'))
    return { icon: FileCode, color: 'text-gray-600' }
  return { icon: File, color: 'text-gray-400' }
}

function formatDate(dateStr?: string) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('es-CL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
      {Array.from({ length: 12 }).map((_, i) => (
        <Card key={i} className="p-4">
          <Skeleton className="h-10 w-10 mx-auto mb-3" />
          <Skeleton className="h-4 w-full mb-1" />
          <Skeleton className="h-3 w-2/3" />
        </Card>
      ))}
    </div>
  )
}

function ListSkeleton() {
  return (
    <div className="space-y-1">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-2">
          <Skeleton className="h-5 w-5" />
          <Skeleton className="h-4 flex-1" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-16" />
        </div>
      ))}
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
      <Folder className="h-16 w-16 mb-4 opacity-30" />
      <p className="text-lg font-medium">Carpeta vacia</p>
      <p className="text-sm">No hay archivos en esta ubicacion</p>
    </div>
  )
}

export function DriveFileList({ files, viewMode, loading, onFileClick, onFolderClick, selectedFileId, compact }: DriveFileListProps) {
  if (loading) {
    return viewMode === 'grid' ? <GridSkeleton /> : <ListSkeleton />
  }

  if (files.length === 0) {
    return <EmptyState />
  }

  // Sort: folders first, then files alphabetically
  const sorted = [...files].sort((a, b) => {
    const aIsFolder = isFolder(a.mimeType)
    const bIsFolder = isFolder(b.mimeType)
    if (aIsFolder && !bIsFolder) return -1
    if (!aIsFolder && bIsFolder) return 1
    return a.name.localeCompare(b.name)
  })

  const handleClick = (item: DriveItem) => {
    if (isFolder(item.mimeType)) {
      onFolderClick(item)
    } else {
      onFileClick(item)
    }
  }

  if (viewMode === 'grid') {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 p-3">
        {sorted.map((item) => {
          const { icon: Icon, color } = getFileIcon(item.mimeType)
          const isSelected = selectedFileId === item.id
          return (
            <Card
              key={item.id}
              className={`p-4 cursor-pointer hover:bg-accent/50 hover:shadow-md transition-all group ${isSelected ? 'ring-2 ring-primary bg-accent/50' : ''}`}
              onClick={() => handleClick(item)}
            >
              <div className="flex flex-col items-center text-center gap-2">
                <Icon className={`h-10 w-10 ${color} group-hover:scale-110 transition-transform`} />
                <div className="w-full">
                  <p className="text-sm font-medium truncate" title={item.name}>
                    {item.name}
                  </p>
                  {!isFolder(item.mimeType) && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {formatFileSize(item.size)}
                      {item.modifiedTime && ` · ${formatDate(item.modifiedTime)}`}
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    )
  }

  // List view
  return (
    <div className="overflow-hidden">
      {!compact && (
        <div className="grid grid-cols-[1fr_100px_120px] gap-2 px-4 py-2 bg-muted/50 text-xs font-medium text-muted-foreground border-b">
          <span>Nombre</span>
          <span className="text-right">Tamano</span>
          <span className="text-right">Modificado</span>
        </div>
      )}
      <div className="divide-y">
        {sorted.map((item) => {
          const { icon: Icon, color } = getFileIcon(item.mimeType)
          const isSelected = selectedFileId === item.id
          return compact ? (
            <div
              key={item.id}
              className={`flex items-center gap-2.5 px-3 py-2 hover:bg-accent/50 cursor-pointer transition-colors ${isSelected ? 'bg-accent border-l-2 border-l-primary' : ''}`}
              onClick={() => handleClick(item)}
            >
              <Icon className={`h-4 w-4 shrink-0 ${color}`} />
              <span className="text-sm truncate" title={item.name}>
                {item.name}
              </span>
            </div>
          ) : (
            <div
              key={item.id}
              className={`grid grid-cols-[1fr_100px_120px] gap-2 px-4 py-2.5 hover:bg-accent/50 cursor-pointer transition-colors items-center ${isSelected ? 'bg-accent' : ''}`}
              onClick={() => handleClick(item)}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon className={`h-5 w-5 shrink-0 ${color}`} />
                <span className="text-sm truncate" title={item.name}>
                  {item.name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground text-right">
                {isFolder(item.mimeType) ? '—' : formatFileSize(item.size)}
              </span>
              <span className="text-xs text-muted-foreground text-right">
                {formatDate(item.modifiedTime)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
