// ===================================================
// 📁 Archivo: ListaEquipoItemAccordion.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Visualización de ítems de una lista técnica con edición inline
//
// 🧠 Uso: Se utiliza en la vista de detalle de una lista técnica.
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-09
// ===================================================

'use client'

import { useState } from 'react'
import { ListaEquipoItem, ListaEquipoItemUpdatePayload } from '@/types'
import { Pencil, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Props {
  item: ListaEquipoItem
  onUpdate: (id: string, changes: ListaEquipoItemUpdatePayload) => void
  onDelete: (id: string) => void
}

export default function ListaEquipoItemAccordion({ item, onUpdate, onDelete }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [editedItem, setEditedItem] = useState({
    cantidad: item.cantidad,
    precioElegido: item.precioElegido ?? 0,
  })

  const handleSave = () => {
    onUpdate(item.id, {
      cantidad: editedItem.cantidad,
      precioElegido: editedItem.precioElegido,
    })
    setIsEditing(false)
  }

  return (
    <div className="border rounded-lg p-4 shadow-sm mb-2">
      <div className="flex justify-between items-center">
        <div className="flex flex-col">
          <span className="font-medium">{item.codigo} - {item.descripcion}</span>
          <span className="text-sm text-gray-500">{item.unidad}</span>
        </div>
        <div className="flex gap-2 items-center">
          {isEditing ? (
            <>
              <Input
                type="number"
                value={editedItem.cantidad}
                onChange={(e) => setEditedItem({ ...editedItem, cantidad: parseFloat(e.target.value) })}
                className="w-24"
              />
              <Input
                type="number"
                value={editedItem.precioElegido}
                onChange={(e) => setEditedItem({ ...editedItem, precioElegido: parseFloat(e.target.value) })}
                className="w-32"
              />
              <Button onClick={handleSave} className="bg-blue-600 text-white">💾</Button>
              <Button onClick={() => setIsEditing(false)} variant="outline">❌</Button>
            </>
          ) : (
            <>
              <span className="text-sm">{item.cantidad} u. | $ {item.precioElegido?.toFixed(2) ?? '---'}</span>
              <Button size="icon" onClick={() => setIsEditing(true)}>
                <Pencil className="w-4 h-4" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => onDelete(item.id)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
