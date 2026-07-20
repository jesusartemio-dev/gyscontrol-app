'use client'

import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { Camera, FolderOpen, Loader2, X } from 'lucide-react'
import type { PlanTrabajoImagen } from '@prisma/client'
import { ImagenConLightbox } from '@/components/catalogoImagenes/ImagenConLightbox'

interface Props {
  proyectoId: string
  edtRef: string
  tareaRef: string
  nombreDefault: string
  imagenes: PlanTrabajoImagen[]
  onChanged: () => Promise<void>
}

const MAX_IMAGENES = 10
const MAX_TAMANO_BYTES = 15 * 1024 * 1024

/**
 * Widget de captura para la vista de Campo — mismo endpoint que
 * GaleriaImagenesAlcance.tsx (../editores/), pero sin ningún control de
 * edición (sin picker de biblioteca, sin confirmar sugerencias de IA, sin
 * reordenar): solo cámara directa (`capture="environment"`), galería, y
 * borrar una foto propia. Tiles grandes (`aspect-square`) para dedo, no
 * mouse — mismo patrón que src/components/seguridad/registros/GaleriaFotosSortable.tsx.
 */
export function CampoFotoTarea({ proyectoId, edtRef, tareaRef, nombreDefault, imagenes, onChanged }: Props) {
  const [subiendo, setSubiendo] = useState(false)
  const [eliminandoId, setEliminandoId] = useState<string | null>(null)
  const inputCamaraRef = useRef<HTMLInputElement>(null)
  const inputArchivoRef = useRef<HTMLInputElement>(null)

  const propias = imagenes
    .filter(img => img.edtRef === edtRef && img.tareaRef === tareaRef)
    .sort((a, b) => a.orden - b.orden)

  const lleno = propias.length >= MAX_IMAGENES

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (propias.length + files.length > MAX_IMAGENES) {
      toast.error(`Máximo ${MAX_IMAGENES} fotos por tarea`)
      return
    }
    setSubiendo(true)
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          toast.error('Solo se permiten imágenes')
          continue
        }
        if (file.size > MAX_TAMANO_BYTES) {
          toast.error(`${file.name} supera 15MB`)
          continue
        }
        const formData = new FormData()
        formData.append('file', file)
        formData.append('edtRef', edtRef)
        formData.append('tareaRef', tareaRef)
        formData.append('caption', nombreDefault)

        const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/alcance-imagenes`, {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) {
          const e = await res.json().catch(() => ({}))
          throw new Error(e.error ?? `Error al subir ${file.name}`)
        }
      }
      await onChanged()
      toast.success('Foto subida')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir la foto')
    } finally {
      setSubiendo(false)
      if (inputCamaraRef.current) inputCamaraRef.current.value = ''
      if (inputArchivoRef.current) inputArchivoRef.current.value = ''
    }
  }

  const handleDelete = async (imagenId: string) => {
    setEliminandoId(imagenId)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/alcance-imagenes/${imagenId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar la foto')
      await onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar la foto')
    } finally {
      setEliminandoId(null)
    }
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {propias.map(img => (
          <div key={img.id} className="relative aspect-square rounded-md overflow-hidden border bg-gray-50">
            <ImagenConLightbox
              src={`/api/proyectos/${proyectoId}/plan-trabajo/alcance-imagenes/${img.id}/contenido`}
              alt="Foto de la tarea"
              alturaClase="h-full"
            />
            <button
              type="button"
              onClick={() => handleDelete(img.id)}
              disabled={eliminandoId === img.id}
              className="absolute top-1 right-1 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center z-20 hover:bg-red-600/80 transition disabled:opacity-50"
              aria-label="Eliminar foto"
            >
              {eliminandoId === img.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <X className="h-3.5 w-3.5" />}
            </button>
          </div>
        ))}

        {!lleno && (
          <button
            type="button"
            onClick={() => inputCamaraRef.current?.click()}
            disabled={subiendo}
            className="aspect-square rounded-md border-2 border-dashed border-indigo-300 flex flex-col items-center justify-center gap-1 text-indigo-600 bg-indigo-50/50 hover:bg-indigo-50 transition disabled:opacity-50"
          >
            {subiendo ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="text-[11px] font-medium">Subiendo…</span>
              </>
            ) : (
              <>
                <Camera className="h-7 w-7" />
                <span className="text-[11px] font-medium">Tomar foto</span>
              </>
            )}
          </button>
        )}
      </div>

      {!lleno && (
        <button
          type="button"
          onClick={() => inputArchivoRef.current?.click()}
          disabled={subiendo}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded hover:bg-muted transition disabled:opacity-50"
        >
          <FolderOpen className="h-4 w-4" /> Subir desde galería
        </button>
      )}

      <input
        ref={inputCamaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
        disabled={subiendo || lleno}
      />
      <input
        ref={inputArchivoRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
        disabled={subiendo || lleno}
      />
    </div>
  )
}
