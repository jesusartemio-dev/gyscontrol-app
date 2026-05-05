'use client'

import { useEffect, useRef } from 'react'
import { Camera, FolderOpen, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface FotoLocal {
  id: string
  file: File
  previewUrl: string
}

interface Props {
  fotos: FotoLocal[]
  onChange: (fotos: FotoLocal[]) => void
  max?: number
  disabled?: boolean
}

const MAX_TAMANO_BYTES = 15 * 1024 * 1024 // 15MB

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function FotosUploader({ fotos, onChange, max = 3, disabled }: Props) {
  const inputCamaraRef = useRef<HTMLInputElement>(null)
  const inputArchivoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    return () => {
      fotos.forEach((f) => URL.revokeObjectURL(f.previewUrl))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const agregar = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const restantes = max - fotos.length
    const aAgregar: FotoLocal[] = []
    for (let i = 0; i < Math.min(files.length, restantes); i++) {
      const file = files[i]
      if (!file.type.startsWith('image/')) continue
      if (file.size > MAX_TAMANO_BYTES) continue
      aAgregar.push({ id: genId(), file, previewUrl: URL.createObjectURL(file) })
    }
    onChange([...fotos, ...aAgregar])
    if (inputCamaraRef.current) inputCamaraRef.current.value = ''
    if (inputArchivoRef.current) inputArchivoRef.current.value = ''
  }

  const eliminar = (id: string) => {
    const target = fotos.find((f) => f.id === id)
    if (target) URL.revokeObjectURL(target.previewUrl)
    onChange(fotos.filter((f) => f.id !== id))
  }

  const lleno = fotos.length >= max

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {fotos.map((foto) => (
          <div key={foto.id} className="relative aspect-square rounded-md overflow-hidden border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto.previewUrl} alt="Foto" className="w-full h-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={() => eliminar(foto.id)}
                className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                aria-label="Eliminar foto"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        ))}

        {!lleno && !disabled && (
          <button
            type="button"
            onClick={() => inputCamaraRef.current?.click()}
            className={cn(
              'aspect-square rounded-md border border-dashed flex flex-col items-center justify-center gap-1',
              'text-muted-foreground hover:bg-muted/50 transition',
            )}
          >
            <Camera className="h-6 w-6" />
            <span className="text-[10px]">Cámara</span>
          </button>
        )}
      </div>

      {/* Input cámara directa */}
      <input
        ref={inputCamaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => agregar(e.target.files)}
        disabled={disabled || lleno}
      />
      {/* Input galería / archivos */}
      <input
        ref={inputArchivoRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => agregar(e.target.files)}
        disabled={disabled || lleno}
      />

      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>{fotos.length} / {max}</span>
        {!lleno && !disabled && (
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => inputCamaraRef.current?.click()}
            >
              <Camera className="h-3.5 w-3.5 mr-1" /> Cámara
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => inputArchivoRef.current?.click()}
            >
              <FolderOpen className="h-3.5 w-3.5 mr-1" /> Archivos
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
