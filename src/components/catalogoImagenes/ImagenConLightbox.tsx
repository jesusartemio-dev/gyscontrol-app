'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

interface Props {
  src: string
  alt: string
  /** Alto del thumbnail — ancho siempre automático, la imagen nunca se recorta (bug de imágenes deformadas). */
  alturaClase?: string
  className?: string
}

/**
 * Thumbnail que SIEMPRE respeta el aspect ratio original (`object-contain`,
 * nunca `cover` ni alto+ancho fijos) — antes una foto vertical (ej. una
 * escalera) salía recortada y "decapitada" porque el contenedor forzaba
 * ambos ejes. Click abre la imagen completa en un modal simple (lightbox).
 * Usado en la vista, el editor y la galería de la Biblioteca de Imágenes.
 */
export function ImagenConLightbox({ src, alt, alturaClase = 'h-40', className = '' }: Props) {
  const [abierta, setAbierta] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierta(true)}
        className={`w-full ${alturaClase} bg-gray-100 rounded overflow-hidden flex items-center justify-center cursor-zoom-in ${className}`}
      >
        <img src={src} alt={alt} className="w-full h-full object-contain" />
      </button>

      {abierta && (
        <Dialog open onOpenChange={setAbierta}>
          <DialogContent className="max-w-3xl p-2 bg-black/95 border-0">
            <DialogTitle className="sr-only">{alt || 'Imagen ampliada'}</DialogTitle>
            <img src={src} alt={alt} className="w-full max-h-[80vh] object-contain" />
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
