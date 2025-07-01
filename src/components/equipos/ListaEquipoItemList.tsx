'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Save, X, RefreshCcw, CheckCircle2 } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import { ListaEquipoItem } from '@/types'
import {
  updateListaEquipoItem,
  deleteListaEquipoItem,
} from '@/lib/services/listaEquipoItem'
import { toast } from 'sonner'
import ProyectoReemplazarItemListaModal from './ModalReemplazarItemLista'

interface Props {
  listaId: string
  proyectoId: string
  items: ListaEquipoItem[]
  editable?: boolean
  onCreated?: () => void
}

const labelEstado: Record<string, string> = {
  de_cotizacion: 'Cotización',
  nuevo: 'Nuevo',
  reemplazo: 'Reemplazo',
}

export default function ListaEquipoItemList({
  listaId,
  proyectoId,
  items,
  editable = true,
  onCreated,
}: Props) {
  const [editCantidadItemId, setEditCantidadItemId] = useState<string | null>(null)
  const [editCantidadValues, setEditCantidadValues] = useState<Record<string, string>>({})
  const [editComentarioItemId, setEditComentarioItemId] = useState<string | null>(null)
  const [editComentarioValues, setEditComentarioValues] = useState<Record<string, string>>({})
  const [itemReemplazo, setItemReemplazo] = useState<ListaEquipoItem | null>(null)

  const handleSaveCantidad = async (itemId: string) => {
    try {
      const cantidad = parseFloat(editCantidadValues[itemId] || '')
      if (isNaN(cantidad)) {
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
      const updateData: any = { verificado: checked }

      await updateListaEquipoItem(item.id, updateData)

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

  const handleDelete = async (itemId: string) => {
    const confirmado = confirm('¿Estás seguro de eliminar este ítem?')
    if (!confirmado) return
    try {
      const ok = await deleteListaEquipoItem(itemId)
      if (ok) {
        toast.success('🗑️ Ítem eliminado')
        onCreated?.()
      }
    } catch {
      toast.error('❌ No se pudo eliminar el ítem')
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
            <th className="p-2 text-left">💰 Cotización</th>
            <th className="p-2 text-right">💵 Costo USD</th>
            <th className="p-2 text-center">⏱ Tiempo Entrega</th>
            <th className="p-2 text-left">Estado</th>
            <th className="p-2 text-center">✔</th>
            <th className="p-2 text-left">Comentario</th>
            <th className="p-2 text-left">Equipo</th>
            <th className="p-2 text-center">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {sortedItems.map((item) => {
            const isEditingCantidad = editCantidadItemId === item.id
            const isEditingComentario = editComentarioItemId === item.id
            const precio = item.cotizacionSeleccionada?.precioUnitario ?? 0
            const cantidad = item.cantidad ?? 0
            const costoTotal = precio * cantidad

            return (
              <tr key={item.id} className="border-t">
                <td className="p-2">{item.codigo}</td>
                <td className="p-2">{item.descripcion}</td>
                <td className="p-2">{item.unidad}</td>
                <td className="p-2">
                  {isEditingCantidad ? (
                    <div className="flex gap-2 items-center">
                      <Input
                        type="number"
                        value={editCantidadValues[item.id] ?? item.cantidad?.toString() ?? ''}
                        onChange={(e) =>
                          setEditCantidadValues((prev) => ({ ...prev, [item.id]: e.target.value }))
                        }
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
                      className="flex items-center gap-1 text-gray-900 cursor-pointer"
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
                    <span className="text-gray-400 italic">No seleccionada</span>
                  )}
                </td>
                <td className="p-2 text-right text-gray-900 font-semibold">
                  {item.cotizacionSeleccionada ? `US$ ${costoTotal.toFixed(2)}` : '—'}
                </td>
                <td className="p-2 text-center text-gray-700">
                  {item.cotizacionSeleccionada?.tiempoEntrega ?? <span className="text-gray-400 italic">—</span>}
                </td>
                <td className="p-2 font-medium text-indigo-700">
                  {labelEstado[item.estado] || item.estado}
                </td>
                <td className="p-2 text-center">
                  <Checkbox
                    checked={item.verificado}
                    disabled={!editable}
                    onCheckedChange={(val) => editable && handleVerificado(item, Boolean(val))}
                  />
                </td>
                <td className="p-2">
                  {item.verificado ? (
                    isEditingComentario && editable ? (
                      <div className="flex gap-2 items-center">
                        <Input
                          id={`comentario-${item.id}`}
                          value={editComentarioValues[item.id] ?? item.comentarioRevision ?? ''}
                          onChange={(e) =>
                            setEditComentarioValues((prev) => ({
                              ...prev,
                              [item.id]: e.target.value,
                            }))
                          }
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
                        {item.comentarioRevision || '—'}
                      </div>
                    )
                  ) : (
                    <span className="text-gray-400 italic">—</span>
                  )}
                </td>
                <td className="p-2 text-gray-600">
                  {item.proyectoEquipoItem?.proyectoEquipo?.nombre ||
                    item.proyectoEquipo?.nombre ||
                    '—'}
                </td>
                <td className="p-2 text-center flex justify-center gap-2">
                  {!item.reemplazaAId ? (
                    <Button
                      size="sm"
                      onClick={() => setItemReemplazo(item)}
                      variant="outline"
                      disabled={!editable}
                    >
                      🔄 Reemplazar Nuevo
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => setItemReemplazo(item)}
                      variant="secondary"
                      disabled={!editable}
                    >
                      ♻️ Reemplazar reemplazo
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(item.id)}
                    disabled={!editable || !!item.cotizacionSeleccionada}
                  >
                    <Trash2 size={16} />
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>

        <tfoot>
          <tr className="bg-gray-50 font-semibold text-sm text-gray-800">
            <td className="p-2" colSpan={5}>Resumen:</td>
            <td className="p-2 text-green-700">
              US$ {items.reduce(
                (acc, item) =>
                  acc +
                  (item.cotizacionSeleccionada?.precioUnitario ?? 0) *
                    (item.cantidad ?? 0),
                0
              ).toFixed(2)}
            </td>
            <td className="p-2 text-gray-700">
              Máx: {
                Math.max(
                  ...items.map((item) => {
                    const t = item.cotizacionSeleccionada?.tiempoEntrega
                    const parsed = parseInt(t ?? '')
                    return isNaN(parsed) ? 0 : parsed
                  })
                )
              } días
            </td>
            <td colSpan={4}></td>
          </tr>
        </tfoot>
      </table>

      {itemReemplazo && (
        <ProyectoReemplazarItemListaModal
          open={!!itemReemplazo}
          item={itemReemplazo}
          onClose={() => setItemReemplazo(null)}
          onUpdated={onCreated}
          listaId={listaId}
          proyectoId={proyectoId}
          tipoReemplazo={itemReemplazo?.reemplazaAId ? 'reemplazo' : 'original'}
        />
      )}
    </div>
  )
}
