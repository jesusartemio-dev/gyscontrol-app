'use client'

import { useEffect, useCallback, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, Archive, ZoomIn, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export interface FotoVisor {
  id: string
  nombreArchivo: string
  orden: number
}

interface Props {
  fotos: FotoVisor[]
  titulo?: string
  zipUrl?: string
}

export function GaleriaFotos({ fotos, titulo, zipUrl }: Props) {
  const [open, setOpen] = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [zipLoading, setZipLoading] = useState(false)

  const prev = useCallback(
    () => setCurrentIndex((i) => Math.max(0, i - 1)),
    [],
  )
  const next = useCallback(
    () => setCurrentIndex((i) => Math.min(fotos.length - 1, i + 1)),
    [fotos.length],
  )

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); prev() }
      else if (e.key === 'ArrowRight') { e.preventDefault(); next() }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, prev, next])

  const openAt = (i: number) => {
    setCurrentIndex(i)
    setOpen(true)
  }

  const downloadCurrent = () => {
    const foto = fotos[currentIndex]
    if (!foto) return
    const a = document.createElement('a')
    a.href = `/api/seguridad/registros/fotos/${foto.id}/contenido`
    a.download = foto.nombreArchivo
    document.body.appendChild(a)
    a.click()
    a.remove()
  }

  const downloadZip = async () => {
    if (!zipUrl) return
    setZipLoading(true)
    try {
      const res = await fetch(zipUrl, { credentials: 'include' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(d.error ?? 'Error al generar ZIP')
      }
      const blob = await res.blob()
      const cd = res.headers.get('Content-Disposition') ?? ''
      const match = cd.match(/filename="?([^"]+)"?/)
      const filename = match ? match[1] : 'fotos.zip'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast.success(`ZIP descargado: ${filename}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Error al generar ZIP')
    } finally {
      setZipLoading(false)
    }
  }

  if (fotos.length === 0) return null

  const foto = fotos[currentIndex]

  return (
    <div className="space-y-2">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {titulo ?? `${fotos.length} foto${fotos.length !== 1 ? 's' : ''}`}
        </p>
        {zipUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={downloadZip}
            disabled={zipLoading}
          >
            {zipLoading ? (
              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
            ) : (
              <Archive className="h-3 w-3 mr-1.5" />
            )}
            {zipLoading ? 'Generando ZIP…' : 'Descargar todas en ZIP'}
          </Button>
        )}
      </div>

      {/* Thumbnail grid */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
        {fotos.map((f, i) => (
          <button
            key={f.id}
            type="button"
            onClick={() => openAt(i)}
            className="aspect-square rounded-md overflow-hidden bg-muted hover:opacity-90 transition relative group"
            aria-label={`Ver ${f.nombreArchivo}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/seguridad/registros/fotos/${f.id}/contenido`}
              alt={f.nombreArchivo}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
              }}
            />
            <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/25 transition opacity-0 group-hover:opacity-100">
              <ZoomIn className="h-4 w-4 text-white drop-shadow" />
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl p-0 gap-0 overflow-hidden bg-black border-0">
          <DialogHeader className="p-3 flex-row items-center justify-between bg-black/80 backdrop-blur-sm border-b border-white/10">
            <DialogTitle className="text-white text-sm font-normal truncate flex-1 pr-4">
              {foto?.nombreArchivo ?? ''}
              <span className="text-white/50 ml-2 text-xs">
                {currentIndex + 1} / {fotos.length}
              </span>
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-white hover:text-white hover:bg-white/20 shrink-0"
              onClick={downloadCurrent}
            >
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Descargar
            </Button>
          </DialogHeader>

          {/* Image area */}
          <div className="relative flex items-center justify-center min-h-[300px] max-h-[75vh] bg-black">
            {foto && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={foto.id}
                src={`/api/seguridad/registros/fotos/${foto.id}/contenido`}
                alt={foto.nombreArchivo}
                className="max-w-full max-h-[75vh] object-contain"
                onError={(e) => {
                  e.currentTarget.alt = 'No se pudo cargar la imagen'
                }}
              />
            )}

            {/* Prev arrow */}
            {currentIndex > 0 && (
              <button
                type="button"
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition"
                aria-label="Foto anterior"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            )}

            {/* Next arrow */}
            {currentIndex < fotos.length - 1 && (
              <button
                type="button"
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-full bg-black/50 hover:bg-black/80 text-white flex items-center justify-center transition"
                aria-label="Foto siguiente"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            )}
          </div>

          {/* Dot indicators */}
          {fotos.length > 1 && fotos.length <= 20 && (
            <div className="flex justify-center gap-1 py-2 bg-black/80">
              {fotos.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setCurrentIndex(i)}
                  className={`h-1.5 rounded-full transition-all ${
                    i === currentIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/40 hover:bg-white/70'
                  }`}
                  aria-label={`Ir a foto ${i + 1}`}
                />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
