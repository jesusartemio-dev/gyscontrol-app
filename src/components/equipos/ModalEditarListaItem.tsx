'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Loader2, Pencil, Layers } from 'lucide-react'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { updateListaEquipoItem } from '@/lib/services/listaEquipoItem'
import { getProyectoEquipos } from '@/lib/services/proyectoEquipo'
import type { ListaEquipoItem, ProyectoEquipoCotizado } from '@/types'

interface Props {
  isOpen: boolean
  item: ListaEquipoItem
  proyectoId: string
  onClose: () => void
  onUpdated?: () => Promise<void>
}

export default function ModalEditarListaItem({ isOpen, item, proyectoId, onClose, onUpdated }: Props) {
  const [loading, setLoading] = useState(false)
  const [equipos, setEquipos] = useState<ProyectoEquipoCotizado[]>([])
  const [form, setForm] = useState({
    codigo: '',
    descripcion: '',
    categoria: '',
    unidad: '',
    marca: '',
    cantidad: 0,
    comentarioRevision: '',
    proyectoEquipoId: '',
  })

  useEffect(() => {
    if (isOpen && item) {
      getProyectoEquipos(proyectoId).then(setEquipos).catch(() => {})
      const grupoId = (item as any).proyectoEquipoId
        || item.proyectoEquipo?.id
        || item.proyectoEquipoItem?.proyectoEquipo?.id
        || ''
      setForm({
        codigo: item.codigo || '',
        descripcion: item.descripcion || '',
        categoria: item.categoria || '',
        unidad: item.unidad || '',
        marca: item.marca || '',
        cantidad: item.cantidad || 0,
        comentarioRevision: item.comentarioRevision || '',
        proyectoEquipoId: grupoId,
      })
    }
  }, [isOpen, item, proyectoId])

  const handleSubmit = async () => {
    if (!form.codigo.trim() || !form.descripcion.trim() || !form.cantidad) {
      toast.error('Completa los campos obligatorios')
      return
    }

    setLoading(true)
    try {
      await updateListaEquipoItem(item.id, {
        codigo: form.codigo.trim(),
        descripcion: form.descripcion.trim(),
        categoria: form.categoria.trim() || undefined,
        unidad: form.unidad.trim(),
        marca: form.marca.trim() || undefined,
        cantidad: form.cantidad,
        comentarioRevision: form.comentarioRevision.trim() || undefined,
        proyectoEquipoId: form.proyectoEquipoId || undefined,
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
            Formulario para editar un item de la lista
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 mt-2">
          {/* Grupo (Equipo Cotizado) */}
          <div>
            <label className="text-xs font-medium mb-1 flex items-center gap-1">
              <Layers className="h-3 w-3" />
              Equipo Cotizado
            </label>
            <Select value={form.proyectoEquipoId} onValueChange={(v) => setForm(prev => ({ ...prev, proyectoEquipoId: v }))}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Sin grupo asignado" />
              </SelectTrigger>
              <SelectContent>
                {equipos.map(eq => (
                  <SelectItem key={eq.id} value={eq.id} className="text-xs">{eq.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Descripcion *</label>
            <Textarea
              value={form.descripcion}
              onChange={(e) => setForm(prev => ({ ...prev, descripcion: e.target.value }))}
              className="text-xs min-h-[60px]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Codigo *</label>
              <Input
                value={form.codigo}
                onChange={(e) => setForm(prev => ({ ...prev, codigo: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Categoria</label>
              <Input
                value={form.categoria}
                onChange={(e) => setForm(prev => ({ ...prev, categoria: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Cantidad *</label>
              <Input
                type="number"
                min={0}
                value={form.cantidad || ''}
                onChange={(e) => setForm(prev => ({ ...prev, cantidad: parseFloat(e.target.value) || 0 }))}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Unidad</label>
              <Input
                value={form.unidad}
                onChange={(e) => setForm(prev => ({ ...prev, unidad: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Marca</label>
              <Input
                value={form.marca}
                onChange={(e) => setForm(prev => ({ ...prev, marca: e.target.value }))}
                className="h-8 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium mb-1 block">Comentario de revision</label>
            <Textarea
              value={form.comentarioRevision}
              onChange={(e) => setForm(prev => ({ ...prev, comentarioRevision: e.target.value }))}
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
            disabled={loading || !form.codigo.trim() || !form.descripcion.trim() || !form.cantidad}
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
