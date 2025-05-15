'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Pencil, Trash2, Save, X } from 'lucide-react'
import { ListaEquiposItem } from '@/types'
import {
  updateListaEquiposItem,
  deleteListaEquiposItem,
} from '@/lib/services/listaEquiposItem'
import { toast } from 'sonner'

interface Props {
  listaId: string
  items: ListaEquiposItem[]
  onCreated?: () => void
}

export default function ListaEquiposItemList({ listaId, items, onCreated }: Props) {
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<ListaEquiposItem>>({})

  const handleEdit = (item: ListaEquiposItem) => {
    setEditItemId(item.id)
    setEditValues({ ...item })
  }

  const handleCancel = () => {
    setEditItemId(null)
    setEditValues({})
  }

  const handleChange = (field: keyof ListaEquiposItem, value: string | number) => {
    setEditValues((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!editItemId || !editValues.codigo) {
      toast.error('El código es obligatorio')
      return
    }

    try {
      const actualizado = await updateListaEquiposItem(editItemId, editValues)
      if (actualizado) {
        toast.success('✅ Ítem actualizado')
        onCreated?.()
        setEditItemId(null)
        setEditValues({})
      }
    } catch {
      toast.error('❌ Error al guardar los cambios')
    }
  }

  const handleDelete = async (itemId: string) => {
    const confirmado = confirm('¿Estás seguro de eliminar este ítem?')
    if (!confirmado) return

    try {
      const ok = await deleteListaEquiposItem(itemId)
      if (ok) {
        toast.success('🗑️ Ítem eliminado')
        onCreated?.()
      }
    } catch {
      toast.error('❌ No se pudo eliminar el ítem')
    }
  }

  return (
    <div className="border rounded-md overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100 text-gray-800">
            <th className="p-2 text-left">Código</th>
            <th className="p-2 text-left">Descripción</th>
            <th className="p-2 text-left">Unidad</th>
            <th className="p-2 text-left">Cantidad</th>
            <th className="p-2 text-left">Precio Referencial</th>
            <th className="p-2 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const isEditing = item.id === editItemId
            return (
              <tr key={item.id} className="border-t">
                <td className="p-2">
                  {isEditing ? (
                    <Input
                      value={editValues.codigo || ''}
                      onChange={(e) => handleChange('codigo', e.target.value)}
                    />
                  ) : (
                    item.codigo
                  )}
                </td>
                <td className="p-2">
                  {isEditing ? (
                    <Input
                      value={editValues.descripcion || ''}
                      onChange={(e) => handleChange('descripcion', e.target.value)}
                    />
                  ) : (
                    item.descripcion
                  )}
                </td>
                <td className="p-2">
                  {isEditing ? (
                    <Input
                      value={editValues.unidad || ''}
                      onChange={(e) => handleChange('unidad', e.target.value)}
                    />
                  ) : (
                    item.unidad
                  )}
                </td>
                <td className="p-2">
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editValues.cantidad ?? ''}
                      onChange={(e) =>
                        handleChange('cantidad', parseFloat(e.target.value) || 0)
                      }
                    />
                  ) : (
                    item.cantidad
                  )}
                </td>
                <td className="p-2">
                  {isEditing ? (
                    <Input
                      type="number"
                      value={editValues.precioReferencial ?? ''}
                      onChange={(e) =>
                        handleChange(
                          'precioReferencial',
                          parseFloat(e.target.value) || 0
                        )
                      }
                    />
                  ) : (
                    item.precioReferencial ?? '-'
                  )}
                </td>
                <td className="p-2 text-center flex justify-center gap-2">
                  {isEditing ? (
                    <>
                      <Button size="sm" onClick={handleSave}>
                        <Save size={16} />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancel}>
                        <X size={16} />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button size="sm" onClick={() => handleEdit(item)}>
                        <Pencil size={16} />
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
