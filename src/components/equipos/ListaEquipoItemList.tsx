// ===================================================
// 📁 Archivo: ListaEquipoItemList.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Lista de ítems técnicos de una lista de equipos con mejoras UX/UI
// ===================================================

'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, CheckCircle2, X } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { ListaEquipoItem } from '@/types'
import { updateListaEquipoItem, deleteListaEquipoItem } from '@/lib/services/listaEquipoItem'
import { toast } from 'sonner'
import ModalReemplazarItemDesdeCatalogo from './ModalReemplazarItemDesdeCatalogo'
import ModalReemplazarReemplazoDesdeCatalogo from './ModalReemplazarReemplazoDesdeCatalogo'
import { motion, AnimatePresence } from 'framer-motion'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

interface Props {
  listaId: string
  proyectoId: string
  items: ListaEquipoItem[]
  editable?: boolean
  onCreated?: () => void
}

const labelOrigen: Record<string, string> = {
  cotizado: 'cotizado',
  nuevo: 'nuevo',
  reemplazo: 'reemplazo',
}

export default function ListaEquipoItemList({ listaId, proyectoId, items, editable = true, onCreated }: Props) {
  const [editCantidadItemId, setEditCantidadItemId] = useState<string | null>(null)
  const [editCantidadValues, setEditCantidadValues] = useState<Record<string, string>>({})
  const [editComentarioItemId, setEditComentarioItemId] = useState<string | null>(null)
  const [editComentarioValues, setEditComentarioValues] = useState<Record<string, string>>({})
  const [itemReemplazoOriginal, setItemReemplazoOriginal] = useState<ListaEquipoItem | null>(null)
  const [itemReemplazoReemplazo, setItemReemplazoReemplazo] = useState<ListaEquipoItem | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const handleSaveCantidad = async (itemId: string) => {
    try {
      const cantidad = parseFloat(editCantidadValues[itemId] || '')
      if (isNaN(cantidad) || cantidad <= 0) {
        toast.error('Cantidad inválida')
        return
      }
      await updateListaEquipoItem(itemId, { cantidad })
      toast.success('Cantidad actualizada')
      setEditCantidadItemId(null)
      setEditCantidadValues((prev) => {
        const updated = { ...prev }
        delete updated[itemId]
        return updated
      })
      onCreated?.()
    } catch {
      toast.error('Error al guardar cantidad')
    }
  }

  const handleSaveComentario = async (itemId: string) => {
    try {
      await updateListaEquipoItem(itemId, {
        comentarioRevision: editComentarioValues[itemId] || '',
      })
      toast.success('Comentario guardado')
      setEditComentarioItemId(null)
      setEditComentarioValues((prev) => {
        const updated = { ...prev }
        delete updated[itemId]
        return updated
      })
      onCreated?.()
    } catch {
      toast.error('Error al guardar el comentario')
    }
  }

  const handleVerificado = async (item: ListaEquipoItem, checked: boolean) => {
    try {
      await updateListaEquipoItem(item.id, { verificado: checked })
      if (checked) {
        const comentarioActual = item.comentarioRevision ?? ''
        setEditComentarioValues((prev) => ({
          ...prev,
          [item.id]: comentarioActual.trim() === '' ? 'Verificado' : comentarioActual,
        }))
        setEditComentarioItemId(item.id)
        setTimeout(() => {
          const input = document.querySelector<HTMLInputElement>(`#comentario-${item.id}`)
          if (input) input.focus()
        }, 50)
      } else {
        setEditComentarioItemId(null)
      }
      onCreated?.()
    } catch {
      toast.error('Error al actualizar verificado')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    try {
      const ok = await deleteListaEquipoItem(deleteTarget)
      if (ok) {
        toast.success('🗑️ Ítem eliminado')
        onCreated?.()
      }
    } catch {
      toast.error('❌ No se pudo eliminar el ítem')
    } finally {
      setDeleteTarget(null)
    }
  }

  const sortedItems = [...items].sort((a, b) => a.createdAt.localeCompare(b.createdAt))

  return (
    <div className="border rounded-md overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100 text-gray-800">
            <th className="p-2 text-left">Código</th>
            <th className="p-2 text-left">Descripción</th>
            <th className="p-2 text-left">Unidad</th>
            <th className="p-2 text-left">Cantidad</th>
            <th className="p-2 text-left">Cotización</th>
            <th className="p-2 text-right">Costo USD</th>
            <th className="p-2 text-center">Entrega</th>
            <th className="p-2 text-left">Origen</th>
            <th className="p-2 text-left">Estado</th>
            <th className="p-2 text-center">✔</th>
            <th className="p-2 text-left">Comentario</th>
            <th className="p-2 text-left">Equipo</th>
            <th className="p-2 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
        <AnimatePresence>
          {sortedItems.map((item) => {
            const isEditingCantidad = editCantidadItemId === item.id
            const isEditingComentario = editComentarioItemId === item.id
            const precio = item.cotizacionSeleccionada?.precioUnitario ?? 0
            const cantidad = item.cantidad ?? 0
            const costoTotal = precio * cantidad

            return (
              <motion.tr
                key={item.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className={item.estado === 'rechazado' ? 'bg-red-50 border-t' : 'border-t'}
              >
                <td className="p-2 font-semibold text-gray-800">{item.codigo}</td>
                <td className="p-2 text-gray-700">{item.descripcion}</td>
                <td className="p-2 text-gray-600">{item.unidad}</td>
                <td className="p-2">
                  {isEditingCantidad ? (
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        value={editCantidadValues[item.id] ?? item.cantidad?.toString() ?? ''}
                        onChange={(e) => setEditCantidadValues((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        className="w-20"
                      />
                      <Button size="icon" onClick={() => handleSaveCantidad(item.id)}>
                        <CheckCircle2 size={16} />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditCantidadItemId(null)}>
                        <X size={16} />
                      </Button>
                    </div>
                  ) : (
                    <div
                      className="flex items-center gap-1 text-gray-900 cursor-pointer hover:bg-gray-100 px-1 py-1 rounded"
                      onClick={() => editable && setEditCantidadItemId(item.id)}
                    >
                      {item.cantidad}
                      {editable && <Pencil size={14} className="text-muted-foreground" />}
                    </div>
                  )}
                </td>
                <td className="p-2 text-gray-700">
                  {item.cotizacionSeleccionada ? (
                    <div className="text-green-700 font-medium">
                      {item.cotizacionSeleccionada.cotizacion?.codigo || 'Sin código'}
                    </div>
                  ) : (
                    <span className="text-red-500 italic">⚠️ No seleccionada</span>
                  )}
                </td>
                <td className="p-2 text-right font-semibold text-gray-800">
                  {item.cotizacionSeleccionada ? `US$ ${costoTotal.toFixed(2)}` : '—'}
                </td>
                <td className="p-2 text-center text-gray-700">
                  {item.cotizacionSeleccionada?.tiempoEntrega ?? <span className="text-gray-400 italic">—</span>}
                </td>
                <td className="p-2 font-medium text-indigo-700">{labelOrigen[item.origen] || '—'}</td>
                <td className="p-2">
                  <span
                    className={
                      item.estado === 'aprobado'
                        ? 'text-green-600 font-medium'
                        : item.estado === 'rechazado'
                        ? 'text-red-600 font-medium'
                        : 'text-yellow-600 font-medium'
                    }
                  >
                    {item.estado || '—'}
                  </span>
                </td>
                <td className="p-2 text-center">
                  <Checkbox
                    checked={item.verificado}
                    disabled={!editable}
                    onCheckedChange={(val) => editable && handleVerificado(item, Boolean(val))}
                  />
                </td>
                <td className="p-2">
                  {isEditingComentario && editable ? (
                    <div className="flex gap-2 items-center">
                      <Input
                        id={`comentario-${item.id}`}
                        value={editComentarioValues[item.id] ?? item.comentarioRevision ?? ''}
                        onChange={(e) => setEditComentarioValues((prev) => ({ ...prev, [item.id]: e.target.value }))}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveComentario(item.id)}
                        className="w-full"
                      />
                      <Button size="icon" onClick={() => handleSaveComentario(item.id)}>
                        <CheckCircle2 size={16} />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditComentarioItemId(null)}>
                        <X size={16} />
                      </Button>
                    </div>
                  ) : (
                    <div
                      onClick={() => editable && setEditComentarioItemId(item.id)}
                      className={editable ? 'text-gray-700 cursor-pointer hover:underline' : 'text-gray-700'}
                    >
                      {item.comentarioRevision || <span className="text-gray-400 italic">—</span>}
                    </div>
                  )}
                </td>
                <td className="p-2 text-gray-600">{item.proyectoEquipo?.nombre || '—'}</td>
                <td className="p-2 text-center">
                  <div className="flex justify-center gap-2 items-center min-h-[36px]">
                    {(item.estado !== 'rechazado') && (item.origen === 'cotizado' || item.origen === 'reemplazo') ? (
                      !item.reemplazaProyectoEquipoItemId ? (
                        <Button size="sm" onClick={() => setItemReemplazoOriginal(item)} variant="outline" disabled={!editable}>
                          🔄 Reemplazar
                        </Button>
                      ) : (
                        <Button size="sm" onClick={() => setItemReemplazoReemplazo(item)} variant="secondary" disabled={!editable}>
                          ♻️ Reemplazar
                        </Button>
                      )
                    ) : (
                      <div className="w-[140px]" />
                    )}

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={!editable}
                          onClick={() => setDeleteTarget(item.id)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Eliminar ítem</TooltipContent>
                    </Tooltip>
                  </div>
                </td>

              </motion.tr>
            )
          })}
        </AnimatePresence>
        </tbody>
      </table>

      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar ítem?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El ítem será eliminado permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {itemReemplazoOriginal && (
        <ModalReemplazarItemDesdeCatalogo
          open={!!itemReemplazoOriginal}
          item={itemReemplazoOriginal}
          onClose={() => setItemReemplazoOriginal(null)}
          onUpdated={onCreated}
          listaId={listaId}
          proyectoId={proyectoId}
        />
      )}

      {itemReemplazoReemplazo && (
        <ModalReemplazarReemplazoDesdeCatalogo
          open={!!itemReemplazoReemplazo}
          item={itemReemplazoReemplazo}
          onClose={() => setItemReemplazoReemplazo(null)}
          onUpdated={onCreated}
          listaId={listaId}
          proyectoId={proyectoId}
        />
      )}
    </div>
  )
}
