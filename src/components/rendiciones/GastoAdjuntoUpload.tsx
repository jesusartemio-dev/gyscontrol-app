'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Upload, X, FileText, Image, Loader2, ExternalLink } from 'lucide-react'
import { uploadGastoAdjunto, deleteGastoAdjunto } from '@/lib/services/gastoAdjunto'
import type { GastoAdjunto } from '@/types'

interface GastoAdjuntoUploadProps {
  gastoLineaId: string
  adjuntos: GastoAdjunto[]
  editable: boolean
  onChanged: () => void
}

export default function GastoAdjuntoUpload({
  gastoLineaId,
  adjuntos,
  editable,
  onChanged,
}: GastoAdjuntoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    try {
      setUploading(true)
      for (const file of Array.from(files)) {
        await uploadGastoAdjunto(gastoLineaId, file)
      }
      toast.success(`${files.length} archivo(s) subido(s)`)
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al subir archivo')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDelete = async (adjunto: GastoAdjunto) => {
    try {
      await deleteGastoAdjunto(adjunto.id)
      toast.success('Adjunto eliminado')
      onChanged()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
  }

  const getIcon = (tipo?: string | null) => {
    if (tipo?.startsWith('image/')) return <Image className="h-3.5 w-3.5 text-blue-600" />
    return <FileText className="h-3.5 w-3.5 text-gray-600" />
  }

  const formatSize = (bytes?: number | null) => {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  return (
    <div className="space-y-2">
      {/* Lista de adjuntos existentes */}
      {adjuntos.length > 0 && (
        <div className="space-y-1">
          {adjuntos.map((adj) => (
            <div
              key={adj.id}
              className="flex items-center gap-2 text-xs bg-muted/50 rounded px-2 py-1.5"
            >
              {getIcon(adj.tipoArchivo)}
              <a
                href={adj.urlArchivo}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 truncate hover:underline text-blue-700"
                onClick={(e) => e.stopPropagation()}
              >
                {adj.nombreArchivo}
              </a>
              {adj.tamano && (
                <span className="text-muted-foreground shrink-0">{formatSize(adj.tamano)}</span>
              )}
              <a
                href={adj.urlArchivo}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </a>
              {editable && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(adj) }}
                  className="shrink-0 text-red-500 hover:text-red-700"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      {editable && (
        <div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf,.jpg,.jpeg,.png"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            ) : (
              <Upload className="h-3 w-3 mr-1" />
            )}
            {uploading ? 'Subiendo...' : 'Adjuntar'}
          </Button>
        </div>
      )}
    </div>
  )
}
