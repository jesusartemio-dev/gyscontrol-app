'use client'

import { useEffect, useRef, useState } from 'react'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Camera, FolderOpen, GripVertical, Loader2, Plus, X } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const MAX_FOTOS = 10
const MAX_TAMANO_BYTES = 15 * 1024 * 1024

export interface FotoSortable {
  id: string
  nombreArchivo: string
  urlArchivo: string
  orden: number
}

interface Props {
  registroId: string
  fotos: FotoSortable[]
  editable: boolean
}

export function GaleriaFotosSortable({ registroId, fotos, editable }: Props) {
  const [items, setItems] = useState<FotoSortable[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    const sorted = [...fotos].sort((a, b) => a.orden - b.orden)
    setItems(sorted)
  }, [fotos])

  const queryClient = useQueryClient()
  const inputCamaraRef = useRef<HTMLInputElement>(null)
  const inputArchivoRef = useRef<HTMLInputElement>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const reorderMutation = useMutation({
    mutationFn: async (ordenes: { id: string; orden: number }[]) => {
      const res = await fetch(`/api/seguridad/registros/${registroId}/fotos/orden`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ ordenes }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Error al reordenar')
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'registro', registroId] })
    },
    onError: (e, _vars, ctx) => {
      toast.error(e instanceof Error ? e.message : 'Error al reordenar')
      if (ctx) setItems(ctx as FotoSortable[])
    },
    onMutate: () => items,
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch(`/api/seguridad/registros/${registroId}/fotos`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Error al subir')
      }
      return res.json()
    },
    onSuccess: () => {
      toast.success('Foto subida')
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'registro', registroId] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al subir'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (fotoId: string) => {
      setDeletingId(fotoId)
      const res = await fetch(`/api/seguridad/registros/${registroId}/fotos/${fotoId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Error al eliminar')
      }
    },
    onSuccess: () => {
      toast.success('Foto eliminada')
      queryClient.invalidateQueries({ queryKey: ['seguridad', 'registro', registroId] })
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : 'Error al eliminar'),
    onSettled: () => setDeletingId(null),
  })

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return
    const file = files[0]
    if (!file.type.startsWith('image/')) { toast.error('Solo se permiten imágenes'); return }
    if (file.size > MAX_TAMANO_BYTES) { toast.error('La imagen excede 15MB'); return }
    uploadMutation.mutate(file)
    if (inputCamaraRef.current) inputCamaraRef.current.value = ''
    if (inputArchivoRef.current) inputArchivoRef.current.value = ''
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return
    const next = arrayMove(items, oldIndex, newIndex).map((f, i) => ({ ...f, orden: i }))
    setItems(next)
    reorderMutation.mutate(next.map((f) => ({ id: f.id, orden: f.orden })))
  }

  const lleno = items.length >= MAX_FOTOS

  if (items.length === 0 && !editable) {
    return (
      <div className="rounded-md border border-dashed py-8 text-center text-xs text-muted-foreground">
        Este registro no tiene fotos.
      </div>
    )
  }

  if (!editable) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {items.map((f) => (
          <a
            key={f.id}
            href={`/api/seguridad/registros/fotos/${f.id}/contenido`}
            target="_blank"
            rel="noopener noreferrer"
            className="block aspect-square rounded-md overflow-hidden border bg-muted hover:opacity-90 transition"
            title={f.nombreArchivo}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/seguridad/registros/fotos/${f.id}/contenido`}
              alt={f.nombreArchivo}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => { e.currentTarget.style.display = 'none' }}
            />
          </a>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {items.map((f) => (
              <FotoItem
                key={f.id}
                foto={f}
                onDelete={() => deleteMutation.mutate(f.id)}
                deleting={deletingId === f.id}
              />
            ))}

            {!lleno && (
              <button
                type="button"
                onClick={() => inputCamaraRef.current?.click()}
                disabled={uploadMutation.isPending}
                className="aspect-square rounded-md border-2 border-dashed flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted/50 transition disabled:opacity-50"
              >
                {uploadMutation.isPending ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span className="text-[10px]">Subiendo…</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    <span className="text-[10px]">Agregar</span>
                  </>
                )}
              </button>
            )}
          </div>
        </SortableContext>
      </DndContext>

      <input
        ref={inputCamaraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={uploadMutation.isPending || lleno}
      />
      <input
        ref={inputArchivoRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
        disabled={uploadMutation.isPending || lleno}
      />

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          Arrastra para reordenar · La primera es la portada del reporte semanal
        </p>
        {!lleno && (
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => inputCamaraRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" /> Cámara
            </button>
            <button
              type="button"
              onClick={() => inputArchivoRef.current?.click()}
              disabled={uploadMutation.isPending}
              className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded hover:bg-muted transition disabled:opacity-50"
            >
              <FolderOpen className="h-3.5 w-3.5" /> Archivos
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

interface FotoItemProps {
  foto: FotoSortable
  onDelete: () => void
  deleting: boolean
}

function FotoItem({ foto, onDelete, deleting }: FotoItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: foto.id,
  })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative aspect-square rounded-md overflow-hidden border bg-muted',
        isDragging && 'opacity-50 ring-2 ring-orange-500',
        deleting && 'opacity-40',
      )}
      title={foto.nombreArchivo}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/seguridad/registros/fotos/${foto.id}/contenido`}
        alt={foto.nombreArchivo}
        className="w-full h-full object-cover pointer-events-none"
        loading="lazy"
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
      <a
        href={`/api/seguridad/registros/fotos/${foto.id}/contenido`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute inset-0 z-10"
        aria-label={`Abrir ${foto.nombreArchivo}`}
      />
      <button
        type="button"
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 h-6 w-6 rounded bg-black/60 text-white flex items-center justify-center cursor-grab active:cursor-grabbing z-20"
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={onDelete}
        disabled={deleting}
        className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 text-white flex items-center justify-center z-20 hover:bg-red-600/80 transition disabled:opacity-50"
        aria-label="Eliminar foto"
      >
        {deleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
      </button>
    </div>
  )
}
