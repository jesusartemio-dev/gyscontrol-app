'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, ExternalLink, X, Loader2, Maximize2 } from 'lucide-react'
import type { DriveItem } from '@/types/drive'
import { isImage, isPdf, isGoogleWorkspace, formatFileSize } from '@/types/drive'

interface DriveFilePreviewProps {
  file: DriveItem | null
  onClose: () => void
}

export function DriveFilePreview({ file, onClose }: DriveFilePreviewProps) {
  const [iframeLoading, setIframeLoading] = useState(true)
  const [fullscreen, setFullscreen] = useState(false)

  if (!file) return null

  const contentUrl = `/api/drive/files/${file.id}/content`
  const downloadUrl = `/api/drive/files/${file.id}/content?download=true`
  const googlePreviewUrl = `https://drive.google.com/file/d/${file.id}/preview`

  const handleDownload = () => {
    window.open(downloadUrl, '_blank')
  }

  const handleOpenInDrive = () => {
    if (file.webViewLink) {
      window.open(file.webViewLink, '_blank')
    }
  }

  // Fullscreen overlay
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b bg-background shrink-0">
          <div className="min-w-0">
            <h3 className="text-sm font-medium truncate">{file.name}</h3>
            {file.size && (
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            )}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDownload} title="Descargar">
              <Download className="h-4 w-4" />
            </Button>
            {file.webViewLink && (
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleOpenInDrive} title="Abrir en Drive">
                <ExternalLink className="h-4 w-4" />
              </Button>
            )}
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setFullscreen(false)} title="Salir de pantalla completa">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 overflow-hidden">
          <PreviewContent
            file={file}
            contentUrl={contentUrl}
            googlePreviewUrl={googlePreviewUrl}
            iframeLoading={iframeLoading}
            setIframeLoading={setIframeLoading}
            onDownload={handleDownload}
            onOpenInDrive={handleOpenInDrive}
          />
        </div>
      </div>
    )
  }

  // Side panel
  return (
    <div className="flex flex-col h-full border-l bg-background">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b shrink-0">
        <div className="min-w-0 flex-1 mr-2">
          <h3 className="text-sm font-medium truncate" title={file.name}>{file.name}</h3>
          {file.size && (
            <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
          )}
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDownload} title="Descargar">
            <Download className="h-3.5 w-3.5" />
          </Button>
          {file.webViewLink && (
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleOpenInDrive} title="Abrir en Drive">
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFullscreen(true)} title="Pantalla completa">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose} title="Cerrar">
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Preview Content */}
      <div className="flex-1 overflow-hidden">
        <PreviewContent
          file={file}
          contentUrl={contentUrl}
          googlePreviewUrl={googlePreviewUrl}
          iframeLoading={iframeLoading}
          setIframeLoading={setIframeLoading}
          onDownload={handleDownload}
          onOpenInDrive={handleOpenInDrive}
        />
      </div>
    </div>
  )
}

function PreviewContent({
  file,
  contentUrl,
  googlePreviewUrl,
  iframeLoading,
  setIframeLoading,
  onDownload,
  onOpenInDrive,
}: {
  file: DriveItem
  contentUrl: string
  googlePreviewUrl: string
  iframeLoading: boolean
  setIframeLoading: (v: boolean) => void
  onDownload: () => void
  onOpenInDrive: () => void
}) {
  if (isImage(file.mimeType)) {
    return (
      <div className="w-full h-full flex items-center justify-center p-4 bg-muted/30">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={contentUrl}
          alt={file.name}
          className="max-w-full max-h-full object-contain rounded"
        />
      </div>
    )
  }

  if (isPdf(file.mimeType)) {
    return (
      <div className="w-full h-full relative">
        {iframeLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <iframe
          src={`${contentUrl}#navpanes=0&zoom=page-width`}
          className="w-full h-full border-0"
          title={file.name}
          onLoad={() => setIframeLoading(false)}
        />
      </div>
    )
  }

  if (isGoogleWorkspace(file.mimeType)) {
    return (
      <div className="w-full h-full relative">
        {iframeLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        <iframe
          src={googlePreviewUrl}
          className="w-full h-full border-0"
          title={file.name}
          onLoad={() => setIframeLoading(false)}
          allow="autoplay"
        />
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center h-full gap-4 text-muted-foreground p-4">
      <p className="text-sm font-medium">Vista previa no disponible</p>
      <p className="text-xs text-center">Este tipo de archivo no se puede previsualizar</p>
      <div className="flex gap-2">
        <Button size="sm" onClick={onDownload}>
          <Download className="h-4 w-4 mr-1.5" />
          Descargar
        </Button>
        {file.webViewLink && (
          <Button size="sm" variant="outline" onClick={onOpenInDrive}>
            <ExternalLink className="h-4 w-4 mr-1.5" />
            Abrir en Drive
          </Button>
        )}
      </div>
    </div>
  )
}
