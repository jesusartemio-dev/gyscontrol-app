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

export default function ListaEquipoItemList({ listaId, proyectoId, items, editable = true, onCreated }: Props) {
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, string>>({})
  const [itemReemplazo, setItemReemplazo] = useState<ListaEquipoItem | null>(null)

  const handleChangeComentario = (itemId: string, value: string) => {
    setEditValues((prev) => ({ ...prev, [itemId]: value }))
  }

  const handleSaveComentario = async (itemId: string) => {
    try {
      await updateListaEquipoItem(itemId, {
        comentarioRevision: editValues[itemId] || '',
      })
      toast.success('Comentario guardado')
      setEditItemId(null)
      setEditValues((prev) => {
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
      if (!checked) updateData.comentarioRevision = null

      await updateListaEquipoItem(item.id, updateData)

      if (checked) {
        const valorActual = editValues[item.id] ?? item.comentarioRevision ?? ''
        const nuevoValor = valorActual.trim() === '' ? 'Verificado' : valorActual

        setEditValues((prev) => ({ ...prev, [item.id]: nuevoValor }))
        setEditItemId(item.id)

        setTimeout(() => {
          const input = document.querySelector<HTMLInputElement>(`#comentario-${item.id}`)
          if (input) input.focus()
        }, 50)
      } else {
        setEditItemId(null)
        setEditValues((prev) => {
          const copy = { ...prev }
          delete copy[item.id]
          return copy
        })
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
            <th className="p-2 text-center">✔</th>
            <th className="p-2 text-left">Comentario</th>
            <th className="p-2 text-left">Equipo</th>
            <th className="p-2 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sortedItems.map((item) => {
            const isEditing = editItemId === item.id
            return (
              <tr key={item.id} className="border-t">
                <td className="p-2">{item.codigo}</td>
                <td className="p-2">{item.descripcion}</td>
                <td className="p-2">{item.unidad}</td>
                <td className="p-2">{item.cantidad}</td>
                <td className="p-2 text-center">
                  <Checkbox
                    checked={item.verificado}
                    disabled={!editable}
                    onCheckedChange={(val) => editable && handleVerificado(item, Boolean(val))}
                  />
                </td>
                <td className="p-2">
                  {item.verificado ? (
                    isEditing && editable ? (
                      <div className="flex gap-2 items-center">
                        <Input
                          id={`comentario-${item.id}`}
                          value={editValues[item.id] ?? item.comentarioRevision ?? ''}
                          onChange={(e) => handleChangeComentario(item.id, e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleSaveComentario(item.id)}
                          className="w-full"
                        />
                        <Button size="icon" onClick={() => handleSaveComentario(item.id)}>
                          <CheckCircle2 size={16} />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditItemId(null)}>
                          <X size={16} />
                        </Button>
                      </div>
                    ) : (
                      <div
                        onClick={() => editable && setEditItemId(item.id)}
                        className={editable ? "text-gray-700 cursor-pointer hover:underline" : "text-gray-700"}
                      >
                        {item.comentarioRevision || '—'}
                      </div>
                    )
                  ) : (
                    <span className="text-gray-400 italic">—</span>
                  )}
                </td>
                <td className="p-2 text-gray-600">
                  {item.proyectoEquipoItem?.proyectoEquipo?.nombre || '—'}
                </td>
                <td className="p-2 text-center flex justify-center gap-2">
                  <Button size="sm" onClick={() => setItemReemplazo(item)} variant="outline" disabled={!editable}>
                    <RefreshCcw size={16} />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(item.id)}
                    disabled={!editable}
                  >
                    <Trash2 size={16} />
                  </Button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>

      {itemReemplazo && (
        <ProyectoReemplazarItemListaModal
          open={!!itemReemplazo}
          item={itemReemplazo}
          onClose={() => setItemReemplazo(null)}
          onUpdated={onCreated}
          listaId={listaId}
          proyectoId={proyectoId}
        />
      )}
    </div>
  )
}
