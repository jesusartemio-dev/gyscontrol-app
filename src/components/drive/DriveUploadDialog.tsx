'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Upload, File, X, Loader2 } from 'lucide-react'
import { formatFileSize } from '@/types/drive'
import { toast } from 'sonner'

interface DriveUploadDialogProps {
  open: boolean
  onClose: () => void
  folderId: string
  onUploadComplete: () => void
}

export function DriveUploadDialog({ open, onClose, folderId, onUploadComplete }: DriveUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (f: File) => {
    setFile(f)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) handleFileSelect(f)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    const f = e.dataTransfer.files?.[0]
    if (f) handleFileSelect(f)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
  }, [])

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folderId', folderId)

      const res = await fetch('/api/drive/files', {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.message || 'Error al subir')
      }

      toast.success(`"${file.name}" subido exitosamente`)
      setFile(null)
      onClose()
      onUploadComplete()
    } catch (error: any) {
      console.error('Upload error:', error)
      toast.error(error.message || 'Error al subir archivo')
    } finally {
      setUploading(false)
    }
  }

  const handleClose = () => {
    if (!uploading) {
      setFile(null)
      onClose()
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Subir archivo</DialogTitle>
        </DialogHeader>

        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
            ${dragOver ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-primary/50'}
          `}
        >
          <input
            ref={inputRef}
            type="file"
            onChange={handleInputChange}
            className="hidden"
          />
          <Upload className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
          <p className="text-sm font-medium">
            Arrastra un archivo aqui o haz click para seleccionar
          </p>
        </div>

        {file && (
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <File className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
            </div>
            {!uploading && (
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); setFile(null) }}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancelar
          </Button>
          <Button onClick={handleUpload} disabled={!file || uploading}>
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Subiendo...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Subir
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
