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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { updateListaEquipoItem } from '@/lib/services/listaEquipoItem'
import { getProyectoEquipos } from '@/lib/services/proyectoEquipo'
import type { ListaEquipoItem } from '@/types'

interface Props {
  isOpen: boolean
  item: ListaEquipoItem
  /** Necesario para ofrecer los grupos de equipos cotizados del proyecto. */
  proyectoId: string
  onClose: () => void
  onUpdated?: () => Promise<void>
}

const SIN_GRUPO = '__SIN_GRUPO__'

export default function ModalEditarListaItem({ isOpen, item, proyectoId, onClose, onUpdated }: Props) {
  const [loading, setLoading] = useState(false)
  const [cantidad, setCantidad] = useState(0)
  const [comentarioRevision, setComentarioRevision] = useState('')
  const [grupoId, setGrupoId] = useState<string>(SIN_GRUPO)
  const [grupos, setGrupos] = useState<Array<{ id: string; nombre: string }>>([])
  const [cargandoGrupos, setCargandoGrupos] = useState(false)

  // Un ítem que reemplaza a uno cotizado hereda el grupo de aquél. Cambiarlo
  // aquí dejaría el reemplazo apuntando a un grupo y el ítem a otro.
  const grupoFijadoPorReemplazo = !!item?.proyectoEquipoItemId

  useEffect(() => {
    if (isOpen && item) {
      setCantidad(item.cantidad || 0)
      setComentarioRevision(item.comentarioRevision || '')
      setGrupoId(item.proyectoEquipoId || SIN_GRUPO)
    }
  }, [isOpen, item])

  useEffect(() => {
    if (!isOpen || grupoFijadoPorReemplazo) return
    let cancelado = false
    setCargandoGrupos(true)
    getProyectoEquipos(proyectoId)
      .then(data => {
        if (!cancelado) setGrupos((data || []).map(g => ({ id: g.id, nombre: g.nombre })))
      })
      .catch(() => {
        if (!cancelado) toast.error('No se pudieron cargar los grupos de equipos')
      })
      .finally(() => {
        if (!cancelado) setCargandoGrupos(false)
      })
    return () => { cancelado = true }
  }, [isOpen, proyectoId, grupoFijadoPorReemplazo])

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
        // Solo se manda si el ítem no arrastra el grupo de un reemplazo.
        ...(grupoFijadoPorReemplazo
          ? {}
          : { proyectoEquipoId: grupoId === SIN_GRUPO ? null : grupoId }),
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
            <label className="text-xs font-medium mb-1 block">Grupo de equipos cotizados</label>
            {grupoFijadoPorReemplazo ? (
              <div className="rounded border bg-muted/40 px-2 py-1.5 text-xs text-muted-foreground">
                Lo hereda del ítem cotizado que reemplaza. Para moverlo de grupo, usa <strong>Reemplazar</strong>.
              </div>
            ) : (
              <>
                <Select value={grupoId} onValueChange={setGrupoId} disabled={cargandoGrupos}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={cargandoGrupos ? 'Cargando...' : 'Sin grupo'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SIN_GRUPO}>Sin grupo</SelectItem>
                    {grupos.map(g => (
                      <SelectItem key={g.id} value={g.id}>{g.nombre}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Contra qué grupo de la cotización se compara el costo de este ítem.
                </p>
                {!cargandoGrupos && grupos.length === 0 && (
                  <p className="text-[11px] text-amber-700 mt-1">
                    El proyecto no tiene grupos de equipos cotizados.
                  </p>
                )}
              </>
            )}
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
