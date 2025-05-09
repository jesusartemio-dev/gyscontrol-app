// ===================================================
// 📁 Archivo: PlantillaEquipoItemRow.tsx
// 📌 Ubicación: src/components/plantillas/equipos/
// 🔧 Descripción: Fila editable de un ítem de equipo
// 🧠 Uso: Utilizado dentro de PlantillaEquipoItemTable.tsx
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import type { PlantillaEquipoItem } from '@/types'
import { Input } from '@/components/ui/input'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  item: PlantillaEquipoItem
  onUpdate: (id: string, changes: Partial<PlantillaEquipoItem>) => void
  onDelete: (id: string) => void
}

export default function PlantillaEquipoItemRow({ item, onUpdate, onDelete }: Props) {
  const [localItem, setLocalItem] = useState(item)

  useEffect(() => {
    setLocalItem(item)
  }, [item])

  const handleChange = (field: keyof PlantillaEquipoItem, value: string | number) => {
    const updated = {
      ...localItem,
      [field]: typeof value === 'string' ? parseFloat(value) || 0 : value
    }
    updated.costoInterno = updated.cantidad * updated.precioInterno
    updated.costoCliente = updated.cantidad * updated.precioCliente
    setLocalItem(updated)

    onUpdate(item.id, {
      cantidad: updated.cantidad,
      precioInterno: updated.precioInterno,
      precioCliente: updated.precioCliente,
      costoInterno: updated.costoInterno,
      costoCliente: updated.costoCliente
    })
  }

  return (
    <tr className="border-b text-sm">
      <td className="p-2">{item.codigo}</td>
      <td className="p-2">{item.descripcion || '-'}</td>
      <td className="p-2">{item.unidad || '-'}</td>
      <td className="p-2">
        <Input
          type="number"
          step="any"
          value={localItem.cantidad}
          onChange={(e) => handleChange('cantidad', e.target.value)}
          className="w-20"
        />
      </td>
      <td className="p-2">
        <Input
          type="number"
          step="any"
          value={localItem.precioInterno}
          onChange={(e) => handleChange('precioInterno', e.target.value)}
          className="w-24"
        />
      </td>
      <td className="p-2">
        <Input
          type="number"
          step="any"
          value={localItem.precioCliente}
          onChange={(e) => handleChange('precioCliente', e.target.value)}
          className="w-24"
        />
      </td>
      <td className="p-2 text-right text-blue-600 font-semibold">
        {localItem.costoInterno.toFixed(2)}
      </td>
      <td className="p-2 text-right text-green-600 font-semibold">
        {localItem.costoCliente.toFixed(2)}
      </td>
      <td className="p-2 text-right">
        <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}>
          <Trash2 className="w-4 h-4 text-red-600" />
        </Button>
      </td>
    </tr>
  )
}
