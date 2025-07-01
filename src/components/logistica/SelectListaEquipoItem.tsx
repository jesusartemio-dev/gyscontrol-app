// ===================================================
// 📁 Archivo: SelectListaEquipoItem.tsx
// 🔍 Descripción: Selector con checkboxes para elegir ítems técnicos de lista
// 🤔 Uso: Usado en formularios para seleccionar múltiples ListaEquipoItem
// ✍️ Autor: IA GYS
// 🗓️ Última actualización: 2025-05-23
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { ListaEquipoItem } from '@/types'
import { getListaEquipoItemsByProyecto } from '@/lib/services/listaEquipoItem'
import { Label } from '@/components/ui/label'

interface Props {
  proyectoId: string
  selected: string[]
  onChange: (ids: string[]) => void
}

export default function SelectListaEquipoItem({ proyectoId, selected, onChange }: Props) {
  const [items, setItems] = useState<ListaEquipoItem[]>([])

  useEffect(() => {
    const cargar = async () => {
      const data = await getListaEquipoItemsByProyecto(proyectoId)
      setItems(data || [])
    }
    cargar()
  }, [proyectoId])

  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter((x) => x !== id))
    } else {
      onChange([...selected, id])
    }
  }

  return (
    <div className="space-y-2">
      <Label className="font-medium">Selecciona ítems a cotizar:</Label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 p-2 bg-gray-50 rounded-md border">
        {items.map((item) => (
          <label
            key={item.id}
            className="flex items-start gap-2 p-2 bg-white rounded border shadow-sm cursor-pointer"
          >
            <Checkbox
              checked={selected.includes(item.id)}
              onCheckedChange={() => toggle(item.id)}
            />
            <div>
              <div className="font-medium text-sm">{item.descripcion}</div>
              <div className="text-xs text-gray-500">
                {item.codigo} • {item.cantidad} {item.unidad}
              </div>
            </div>
          </label>
        ))}
      </div>
    </div>
  )
}
