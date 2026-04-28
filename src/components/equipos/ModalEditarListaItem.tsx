'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Pencil, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { updateListaEquipoItem } from '@/lib/services/listaEquipoItem'
import type { ListaEquipoItem } from '@/types'

interface Props {
  isOpen: boolean
  item: ListaEquipoItem
  onClose: () => void
  onUpdated?: () => Promise<void>
}

export default function ModalEditarListaItem({ isOpen, item, onClose, onUpdated }: Props) {
  const [loading, setLoading] = useState(false)
  const [cantidad, setCantidad] = useState(0)
  const [comentarioRevision, setComentarioRevision] = useState('')

  useEffect(() => {
    if (isOpen && item) {
      setCantidad(item.cantidad || 0)
      setComentarioRevision(item.comentarioRevision || '')
    }
  }, [isOpen, item])

  const handleSubmit = async () => {
    if (!cantidad) {
      toast.error('La cantidad es obligatoria')
      return
    }

    setLoading(true)
    try {
      await updateListaEquipoItem(item.id, {
        cantidad,
        comentarioRevision: comentarioRevision.trim() || undefined,
      })

      toast.success('Item actualizado')
      onClose()
      await onUpdated?.()
    } catch {
      toast.error('Error al actualizar item')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Pencil className="h-4 w-4 text-blue-600" />
            <DialogTitle className="text-sm font-semibold">Editar item</DialogTitle>
          </div>
          <DialogDescription className="sr-only">
            Editar cantidad y comentario de revisión del item
          </DialogDescription>
        </DialogHeader>

        {/* Resumen de identidad del item (read-only) */}
        <div className="mt-2 rounded border bg-muted/40 p-3 space-y-1.5 text-xs">
          <div className="flex gap-2">
            <span className="text-muted-foreground min-w-[80px]">Código:</span>
            <span className="font-medium">{item.codigo}</span>
          </div>
          <div className="flex gap-2">
            <span className="text-muted-foreground min-w-[80px]">Descripción:</span>
            <span className="font-medium">{item.descripcion}</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-1">
            <div className="flex flex-col">
              <span className="text-muted-foreground">Categoría</span>
              <span>{item.categoria || '—'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Marca</span>
              <span>{item.marca || '—'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-muted-foreground">Unidad</span>
              <span>{item.unidad || '—'}</span>
            </div>
          </div>
        </div>

        {/* Aviso */}
        <div className="mt-2 flex items-start gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>
            Para cambiar código, descripción, categoría, marca o unidad, usa <strong>Reemplazar</strong>.
          </span>
        </div>

        {/* Campos editables */}
        <div className="space-y-3 mt-3">
          <div>
            <label className="text-xs font-medium mb-1 block">Cantidad *</label>
            <Input
              type="number"
              min={0}
              value={cantidad || ''}
              onChange={(e) => setCantidad(parseFloat(e.target.value) || 0)}
              className="h-8 text-xs"
            />
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Comentario de revisión</label>
            <Textarea
              value={comentarioRevision}
              onChange={(e) => setComentarioRevision(e.target.value)}
              placeholder="Comentario opcional..."
              className="text-xs min-h-[50px]"
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-3">
          <Button variant="outline" size="sm" onClick={onClose} disabled={loading} className="h-7 text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSubmit}
            disabled={loading || !cantidad}
            className="h-7 text-xs"
          >
            {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Pencil className="h-3 w-3 mr-1" />}
            Guardar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
