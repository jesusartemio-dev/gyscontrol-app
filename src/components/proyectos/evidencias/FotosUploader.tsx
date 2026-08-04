'use client'

import { useEffect, useRef, useState } from 'react'
import { Camera, ImagePlus, Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { comprimirImagen } from '@/lib/utils/comprimirImagen'

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

const MAX_TAMANO_BYTES = 25 * 1024 * 1024 // 25MB antes de comprimir

function genId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function formatoTamano(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function FotosUploader({ fotos, onChange, max = 10, disabled }: Props) {
  const inputCamaraRef = useRef<HTMLInputElement>(null)
  const inputArchivoRef = useRef<HTMLInputElement>(null)
  const [procesando, setProcesando] = useState(0)

  // Revocar los objectURL vivos al desmontar. Se usa un ref porque el efecto
  // corre una sola vez y con `fotos` en el closure vería siempre el array
  // inicial (vacío) — el bug que dejaba las URLs de las fotos reales colgando.
  const fotosRef = useRef(fotos)
  fotosRef.current = fotos
  useEffect(() => {
    return () => {
      fotosRef.current.forEach((f) => URL.revokeObjectURL(f.previewUrl))
    }
  }, [])

  const limpiarInputs = () => {
    if (inputCamaraRef.current) inputCamaraRef.current.value = ''
    if (inputArchivoRef.current) inputArchivoRef.current.value = ''
  }

  const agregar = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    const seleccionados = Array.from(files)
    limpiarInputs()

    const restantes = max - fotos.length
    if (restantes <= 0) {
      toast.error(`Máximo ${max} foto${max === 1 ? '' : 's'} por registro.`)
      return
    }

    // Motivos de descarte explícitos: antes se filtraban en silencio y el
    // usuario elegía 8 fotos y veía aparecer 3 sin ninguna explicación.
    const noImagen = seleccionados.filter((f) => !f.type.startsWith('image/'))
    const validos = seleccionados.filter((f) => f.type.startsWith('image/'))
    const pesados = validos.filter((f) => f.size > MAX_TAMANO_BYTES)
    const aceptables = validos.filter((f) => f.size <= MAX_TAMANO_BYTES)
    const sobran = Math.max(0, aceptables.length - restantes)
    const aProcesar = aceptables.slice(0, restantes)

    if (noImagen.length > 0) toast.error(`${noImagen.length} archivo(s) no son imágenes.`)
    if (pesados.length > 0) toast.error(`${pesados.length} imagen(es) superan los 25MB.`)
    if (sobran > 0) toast.warning(`Solo caben ${restantes} más — se omitieron ${sobran}.`)
    if (aProcesar.length === 0) return

    setProcesando(aProcesar.length)
    try {
      const nuevas: FotoLocal[] = []
      for (const file of aProcesar) {
        const optimizado = await comprimirImagen(file)
        nuevas.push({
          id: genId(),
          file: optimizado,
          previewUrl: URL.createObjectURL(optimizado),
        })
        setProcesando((n) => n - 1)
      }
      onChange([...fotos, ...nuevas])
    } finally {
      setProcesando(0)
    }
  }

  const eliminar = (id: string) => {
    const target = fotos.find((f) => f.id === id)
    if (target) URL.revokeObjectURL(target.previewUrl)
    onChange(fotos.filter((f) => f.id !== id))
  }

  const lleno = fotos.length >= max
  const ocupado = procesando > 0 || !!disabled
  const pesoTotal = fotos.reduce((s, f) => s + f.file.size, 0)

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {fotos.map((foto) => (
          <div key={foto.id} className="relative aspect-square rounded-md overflow-hidden border bg-muted">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto.previewUrl} alt="Foto" className="w-full h-full object-cover" />
            {!disabled && (
              <button
                type="button"
                onClick={() => eliminar(foto.id)}
                className="absolute top-0.5 right-0.5 h-7 w-7 rounded-full bg-black/60 text-white flex items-center justify-center active:bg-red-600"
                aria-label="Eliminar foto"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}

        {procesando > 0 && (
          <div className="aspect-square rounded-md border border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-[10px]">{procesando} en cola</span>
          </div>
        )}

        {!lleno && !disabled && (
          <>
            {/* Galería primero: es la vía para elegir varias de un tirón, y era
                la que quedaba escondida como un link diminuto al pie. */}
            <button
              type="button"
              onClick={() => inputArchivoRef.current?.click()}
              disabled={ocupado}
              className={cn(
                'aspect-square rounded-md border-2 border-dashed border-orange-300 bg-orange-50/50',
                'flex flex-col items-center justify-center gap-1 text-orange-700',
                'active:bg-orange-100 hover:bg-orange-100/70 transition disabled:opacity-50',
              )}
            >
              <ImagePlus className="h-6 w-6" />
              <span className="text-[10px] font-medium">Galería</span>
              <span className="text-[9px] opacity-70">varias</span>
            </button>
            <button
              type="button"
              onClick={() => inputCamaraRef.current?.click()}
              disabled={ocupado}
              className={cn(
                'aspect-square rounded-md border border-dashed flex flex-col items-center justify-center gap-1',
                'text-muted-foreground active:bg-muted hover:bg-muted/50 transition disabled:opacity-50',
              )}
            >
              <Camera className="h-6 w-6" />
              <span className="text-[10px]">Cámara</span>
            </button>
          </>
        )}
      </div>

      {/* Cámara directa — sin `multiple`: capture+multiple es inconsistente en Android */}
      <input
        ref={inputCamaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void agregar(e.target.files)}
        disabled={ocupado || lleno}
      />
      {/* Galería / archivos — selección múltiple */}
      <input
        ref={inputArchivoRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => void agregar(e.target.files)}
        disabled={ocupado || lleno}
      />

      <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
        <span>
          {fotos.length} / {max} foto{max === 1 ? '' : 's'}
          {pesoTotal > 0 && <span className="hidden sm:inline"> · {formatoTamano(pesoTotal)}</span>}
        </span>
        {lleno
          ? <span className="text-amber-600">Límite alcanzado</span>
          : <span className="text-[10px]">Se optimizan antes de subir</span>}
      </div>
    </div>
  )
}
