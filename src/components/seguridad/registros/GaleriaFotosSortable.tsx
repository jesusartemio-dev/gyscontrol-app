'use client'

import { useEffect, useState } from 'react'
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
import { GripVertical } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

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
  // Estado local que se sincroniza con prop fotos al montar y cuando cambian
  const [items, setItems] = useState<FotoSortable[]>([])
  useEffect(() => {
    const sorted = [...fotos].sort((a, b) => a.orden - b.orden)
    setItems(sorted)
  }, [fotos])

  const queryClient = useQueryClient()
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
      // Rollback al estado del servidor
      if (ctx) setItems(ctx as FotoSortable[])
    },
    onMutate: () => items, // snapshot para rollback
  })

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((i) => i.id === active.id)
    const newIndex = items.findIndex((i) => i.id === over.id)
    if (oldIndex === -1 || newIndex === -1) return

    const next = arrayMove(items, oldIndex, newIndex).map((f, i) => ({ ...f, orden: i }))
    setItems(next) // optimistic
    reorderMutation.mutate(next.map((f) => ({ id: f.id, orden: f.orden })))
  }

  if (items.length === 0) {
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
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {items.map((f) => (
            <FotoItem key={f.id} foto={f} />
          ))}
        </div>
      </SortableContext>
      <p className="text-[11px] text-muted-foreground mt-2">
        Arrastra una foto para reordenarla. La primera aparece como portada en el reporte semanal.
      </p>
    </DndContext>
  )
}

function FotoItem({ foto }: { foto: FotoSortable }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: foto.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'relative aspect-square rounded-md overflow-hidden border bg-muted',
        isDragging && 'opacity-50 ring-2 ring-orange-500',
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
    </div>
  )
}
