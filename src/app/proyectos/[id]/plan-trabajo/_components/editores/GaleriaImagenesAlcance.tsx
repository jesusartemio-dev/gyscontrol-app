'use client'

import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Loader2, Trash2, Upload, ChevronUp, ChevronDown, ImageIcon, LibraryBig, Search } from 'lucide-react'
import type { PlanTrabajoImagen, CatalogoImagen } from '@prisma/client'
import { captionEfectivo } from '@/lib/planTrabajo/imagenCaption'
import { matchearSugerenciasCatalogoImagen } from '@/lib/catalogoImagenes/matchearSugerencias'

interface Props {
  proyectoId: string
  edtRef: string
  subItemRef?: string
  /** Nombre del EDT o de la actividad (subItem) al que pertenece esta galería — default del caption al subir (Bloque 4.2, Tarea 1; antes era el filename). */
  nombreDefault: string
  /** Nombres de herramientas/equipos del plan + nombre/tareas de la actividad — usado para sugerir imágenes del catálogo global (Bloque 4.2, Tarea 6). Vacío/omitido = sin sugerencias. */
  textosContexto?: string[]
  imagenes: PlanTrabajoImagen[]
  onChanged: () => Promise<void>
}

const MAX_IMAGENES = 10

/**
 * Galería de imágenes de un EDT/subItem de fase EJECUCIÓN (Bloque 4, Tarea 3).
 * Las imágenes NUNCA pasan por IA — solo suben/reordenan/borran vía estos
 * endpoints REST directos a Google Drive (mismo patrón que evidencias/seguridad).
 */
export function GaleriaImagenesAlcance({ proyectoId, edtRef, subItemRef, nombreDefault, textosContexto = [], imagenes, onChanged }: Props) {
  const [subiendo, setSubiendo] = useState(false)
  const [procesandoId, setProcesandoId] = useState<string | null>(null)
  const [catalogo, setCatalogo] = useState<CatalogoImagen[]>([])
  const [pickerAbierto, setPickerAbierto] = useState(false)
  const [busquedaPicker, setBusquedaPicker] = useState('')
  const [adjuntandoId, setAdjuntandoId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/catalogo-imagenes?activo=true')
      .then(res => (res.ok ? res.json() : { data: [] }))
      .then(body => setCatalogo(body.data ?? []))
      .catch(() => setCatalogo([]))
  }, [])

  const propias = imagenes
    .filter(img => img.edtRef === edtRef && (img.subItemRef ?? undefined) === subItemRef)
    .sort((a, b) => a.orden - b.orden)

  const sugeridas = matchearSugerenciasCatalogoImagen(catalogo, [nombreDefault, ...textosContexto])

  const adjuntarDesdeBiblioteca = async (catalogoImagenId: string) => {
    if (propias.length >= MAX_IMAGENES) {
      toast.error(`Máximo ${MAX_IMAGENES} imágenes por actividad`)
      return
    }
    setAdjuntandoId(catalogoImagenId)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/alcance-imagenes/desde-biblioteca`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ edtRef, subItemRef, catalogoImagenId }),
      })
      if (!res.ok) {
        const e = await res.json().catch(() => ({}))
        throw new Error(e.error ?? 'Error al adjuntar la imagen')
      }
      await onChanged()
      toast.success('Imagen adjuntada desde la biblioteca')
      setPickerAbierto(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al adjuntar la imagen')
    } finally {
      setAdjuntandoId(null)
    }
  }

  const catalogoFiltrado = catalogo.filter(img =>
    !busquedaPicker.trim() ||
    img.nombre.toLowerCase().includes(busquedaPicker.toLowerCase()) ||
    img.keywords.some(k => k.toLowerCase().includes(busquedaPicker.toLowerCase()))
  )

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    if (propias.length + files.length > MAX_IMAGENES) {
      toast.error(`Máximo ${MAX_IMAGENES} imágenes por actividad`)
      return
    }
    setSubiendo(true)
    try {
      for (const file of Array.from(files)) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('edtRef', edtRef)
        if (subItemRef) formData.append('subItemRef', subItemRef)
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
      toast.success('Imagen(es) subida(s)')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al subir imagen')
    } finally {
      setSubiendo(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const handleDelete = async (imagenId: string) => {
    setProcesandoId(imagenId)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/alcance-imagenes/${imagenId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Error al eliminar imagen')
      await onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al eliminar imagen')
    } finally {
      setProcesandoId(null)
    }
  }

  const handleCaption = async (imagenId: string, caption: string) => {
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/alcance-imagenes/${imagenId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ caption }),
      })
      if (!res.ok) throw new Error('Error al guardar el pie de imagen')
      await onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al guardar el pie de imagen')
    }
  }

  const handleReorder = async (idx: number, direccion: -1 | 1) => {
    const otroIdx = idx + direccion
    if (otroIdx < 0 || otroIdx >= propias.length) return
    const a = propias[idx]
    const b = propias[otroIdx]
    setProcesandoId(a.id)
    try {
      const res = await fetch(`/api/proyectos/${proyectoId}/plan-trabajo/alcance-imagenes/orden`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ordenes: [
            { id: a.id, orden: b.orden },
            { id: b.id, orden: a.orden },
          ],
        }),
      })
      if (!res.ok) throw new Error('Error al reordenar')
      await onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Error al reordenar')
    } finally {
      setProcesandoId(null)
    }
  }

  return (
    <div className="space-y-2 border rounded-md p-2 bg-white">
      <div className="flex items-center justify-between gap-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
          <ImageIcon size={12} /> Imágenes ({propias.length}/{MAX_IMAGENES})
        </p>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 text-[10px] px-2"
            disabled={propias.length >= MAX_IMAGENES}
            onClick={() => setPickerAbierto(true)}
          >
            <LibraryBig size={11} className="mr-1" /> Desde biblioteca
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 text-[10px] px-2"
            disabled={subiendo || propias.length >= MAX_IMAGENES}
            onClick={() => inputRef.current?.click()}
          >
            {subiendo ? <Loader2 size={11} className="animate-spin mr-1" /> : <Upload size={11} className="mr-1" />}
            Subir
          </Button>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png"
          multiple
          className="hidden"
          onChange={e => handleUpload(e.target.files)}
        />
      </div>

      {sugeridas.length > 0 && propias.length < MAX_IMAGENES && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-muted-foreground">Sugeridas:</span>
          {sugeridas.map(s => (
            <Badge
              key={s.id}
              variant="outline"
              className="text-[10px] cursor-pointer hover:bg-indigo-50"
              onClick={() => adjuntarDesdeBiblioteca(s.id)}
            >
              {adjuntandoId === s.id ? <Loader2 size={9} className="animate-spin mr-1" /> : null}
              {s.nombre}
            </Badge>
          ))}
        </div>
      )}

      {propias.length === 0 ? (
        <p className="text-[11px] text-muted-foreground italic">Sin imágenes adjuntas.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          {propias.map((img, idx) => (
            <div key={img.id} className="border rounded overflow-hidden bg-gray-50">
              <img
                src={`/api/proyectos/${proyectoId}/plan-trabajo/alcance-imagenes/${img.id}/contenido`}
                alt={img.caption ?? img.nombreArchivo}
                className="w-full h-24 object-cover"
              />
              <div className="p-1.5 space-y-1">
                <Input
                  defaultValue={captionEfectivo(img, nombreDefault)}
                  placeholder="Pie de imagen"
                  className="h-6 text-[10px]"
                  onBlur={e => handleCaption(img.id, e.target.value)}
                />
                <div className="flex items-center justify-between">
                  <div className="flex gap-0.5">
                    <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0" disabled={idx === 0 || procesandoId === img.id} onClick={() => handleReorder(idx, -1)}>
                      <ChevronUp size={11} />
                    </Button>
                    <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0" disabled={idx === propias.length - 1 || procesandoId === img.id} onClick={() => handleReorder(idx, 1)}>
                      <ChevronDown size={11} />
                    </Button>
                  </div>
                  <Button type="button" variant="ghost" size="sm" className="h-5 w-5 p-0 text-red-500" disabled={procesandoId === img.id} onClick={() => handleDelete(img.id)}>
                    {procesandoId === img.id ? <Loader2 size={11} className="animate-spin" /> : <Trash2 size={11} />}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {pickerAbierto && (
        <Dialog open onOpenChange={(open) => !open && setPickerAbierto(false)}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Elegir imagen de la biblioteca</DialogTitle>
            </DialogHeader>
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busquedaPicker}
                onChange={e => setBusquedaPicker(e.target.value)}
                placeholder="Buscar por nombre o keyword..."
                className="pl-7 h-8 text-sm"
              />
            </div>
            {catalogoFiltrado.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Sin resultados. Sube imágenes nuevas desde "Biblioteca de Imágenes" en el menú.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">
                {catalogoFiltrado.map(img => (
                  <button
                    key={img.id}
                    type="button"
                    disabled={adjuntandoId === img.id}
                    onClick={() => adjuntarDesdeBiblioteca(img.id)}
                    className="border rounded overflow-hidden bg-gray-50 text-left hover:ring-2 hover:ring-indigo-300 disabled:opacity-50"
                  >
                    <div className="aspect-square bg-gray-100">
                      <img
                        src={`/api/catalogo-imagenes/${img.id}/contenido`}
                        alt={img.nombre}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-[10px] px-1 py-0.5 truncate" title={img.nombre}>
                      {adjuntandoId === img.id ? <Loader2 size={9} className="animate-spin inline mr-1" /> : null}
                      {img.nombre}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
