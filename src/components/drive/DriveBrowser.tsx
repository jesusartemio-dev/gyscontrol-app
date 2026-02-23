'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Search,
  Upload,
  FolderPlus,
  LayoutGrid,
  List,
  Loader2,
  RefreshCw,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react'
import { DriveBreadcrumb } from './DriveBreadcrumb'
import { DriveFileList } from './DriveFileList'
import { DriveFilePreview } from './DriveFilePreview'
import { DriveUploadDialog } from './DriveUploadDialog'
import { DriveCreateFolderDialog } from './DriveCreateFolderDialog'
import type { DriveItem, BreadcrumbItem, ViewMode, DriveListResponse } from '@/types/drive'
import { toast } from 'sonner'

interface DriveBrowserProps {
  sharedDriveId?: string
  driveName?: string
}

export function DriveBrowser({ sharedDriveId, driveName = 'GYS.PROYECTOS' }: DriveBrowserProps) {
  const rootId = sharedDriveId || ''
  const [currentFolderId, setCurrentFolderId] = useState<string>(rootId)
  const [breadcrumb, setBreadcrumb] = useState<BreadcrumbItem[]>([
    { id: rootId, name: driveName },
  ])
  const [files, setFiles] = useState<DriveItem[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [activeSearch, setActiveSearch] = useState('')
  const [selectedFile, setSelectedFile] = useState<DriveItem | null>(null)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [nextPageToken, setNextPageToken] = useState<string | undefined>()
  const [loadingMore, setLoadingMore] = useState(false)
  const [listCollapsed, setListCollapsed] = useState(false)

  const fetchFiles = useCallback(async (folderId: string, query?: string, pageToken?: string) => {
    const isLoadMore = !!pageToken
    if (isLoadMore) {
      setLoadingMore(true)
    } else {
      setLoading(true)
    }

    try {
      const params = new URLSearchParams()
      if (folderId) params.set('folderId', folderId)
      if (query) params.set('query', query)
      if (pageToken) params.set('pageToken', pageToken)
      if (rootId) params.set('driveId', rootId)

      const res = await fetch(`/api/drive/files?${params.toString()}`)
      if (!res.ok) throw new Error('Error al cargar archivos')

      const data: DriveListResponse = await res.json()

      if (isLoadMore) {
        setFiles(prev => [...prev, ...data.files])
      } else {
        setFiles(data.files)
      }
      setNextPageToken(data.nextPageToken)
    } catch (error) {
      console.error('Error fetching files:', error)
      toast.error('Error al cargar archivos')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [])

  // Load files when folder changes
  useEffect(() => {
    fetchFiles(currentFolderId, activeSearch || undefined)
  }, [currentFolderId, activeSearch, fetchFiles])

  const handleFolderClick = (folder: DriveItem) => {
    setCurrentFolderId(folder.id)
    setBreadcrumb(prev => [...prev, { id: folder.id, name: folder.name }])
    setSearchQuery('')
    setActiveSearch('')
    setSelectedFile(null)
  }

  const handleBreadcrumbNavigate = (folderId: string, index: number) => {
    setCurrentFolderId(folderId)
    setBreadcrumb(prev => prev.slice(0, index + 1))
    setSearchQuery('')
    setActiveSearch('')
    setSelectedFile(null)
  }

  const handleFileClick = (file: DriveItem) => {
    setSelectedFile(prev => prev?.id === file.id ? null : file)
  }

  const handleSearch = () => {
    setActiveSearch(searchQuery)
  }

  const handleClearSearch = () => {
    setSearchQuery('')
    setActiveSearch('')
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch()
    if (e.key === 'Escape') handleClearSearch()
  }

  const handleRefresh = () => {
    fetchFiles(currentFolderId, activeSearch || undefined)
  }

  const handleLoadMore = () => {
    if (nextPageToken) {
      fetchFiles(currentFolderId, activeSearch || undefined, nextPageToken)
    }
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        {/* Breadcrumb */}
        <div className="flex-1 min-w-0">
          <DriveBreadcrumb items={breadcrumb} onNavigate={handleBreadcrumbNavigate} />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setUploadOpen(true)}>
            <Upload className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Subir</span>
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCreateFolderOpen(true)}>
            <FolderPlus className="h-4 w-4 mr-1.5" />
            <span className="hidden sm:inline">Carpeta</span>
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleRefresh} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Search + View Toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar archivos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-9 pr-8 h-9"
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {activeSearch && (
          <span className="text-xs text-muted-foreground">
            Resultados para &quot;{activeSearch}&quot;
          </span>
        )}

        <div className="flex items-center border rounded-md ml-auto">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8 rounded-r-none"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="h-8 w-8 rounded-l-none"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Split Layout: File List + Preview Panel */}
      <div
        className="flex gap-0 rounded-lg border overflow-hidden"
        style={{ height: 'calc(100vh - 220px)' }}
      >
        {/* Left: File List */}
        {!(selectedFile && listCollapsed) && (
          <div className={`overflow-y-auto transition-all duration-200 border-r ${selectedFile ? 'w-[280px] shrink-0' : 'w-full'}`}>
            <DriveFileList
              files={files}
              viewMode={selectedFile ? 'list' : viewMode}
              loading={loading}
              onFileClick={handleFileClick}
              onFolderClick={handleFolderClick}
              selectedFileId={selectedFile?.id}
              compact={!!selectedFile}
            />

            {/* Load More */}
            {nextPageToken && !loading && (
              <div className="flex justify-center py-3">
                <Button variant="outline" size="sm" onClick={handleLoadMore} disabled={loadingMore}>
                  {loadingMore ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : null}
                  Cargar mas
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Right: Preview Panel */}
        {selectedFile && (
          <div className="flex-1 min-w-0 relative">
            {/* Toggle list button */}
            <button
              onClick={() => setListCollapsed(prev => !prev)}
              className="absolute top-2.5 left-2 z-10 p-1 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
              title={listCollapsed ? 'Mostrar lista' : 'Ocultar lista'}
            >
              {listCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
            <DriveFilePreview
              file={selectedFile}
              onClose={() => { setSelectedFile(null); setListCollapsed(false) }}
            />
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <DriveUploadDialog
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        folderId={currentFolderId}
        onUploadComplete={handleRefresh}
      />

      {/* Create Folder Dialog */}
      <DriveCreateFolderDialog
        open={createFolderOpen}
        onClose={() => setCreateFolderOpen(false)}
        parentId={currentFolderId}
        onFolderCreated={handleRefresh}
      />
    </div>
  )
}
