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

    // Si cambia el margen, recalcular precioCliente
    if (field === 'margen') {
      updated.precioCliente = +(updated.precioInterno * (1 + updated.margen)).toFixed(2)
    }
    // Si cambia precioInterno, recalcular precioCliente basado en margen
    if (field === 'precioInterno') {
      updated.precioCliente = +(updated.precioInterno * (1 + updated.margen)).toFixed(2)
    }
    // Si cambia precioCliente, recalcular margen
    if (field === 'precioCliente' && updated.precioInterno > 0) {
      updated.margen = +((updated.precioCliente / updated.precioInterno) - 1).toFixed(4)
    }

    updated.costoInterno = +(updated.cantidad * updated.precioInterno).toFixed(2)
    updated.costoCliente = +(updated.cantidad * updated.precioCliente).toFixed(2)
    setLocalItem(updated)

    onUpdate(item.id, {
      cantidad: updated.cantidad,
      precioInterno: updated.precioInterno,
      margen: updated.margen,
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
          step="0.01"
          value={Math.round((localItem.margen || 0) * 100)}
          onChange={(e) => handleChange('margen', parseFloat(e.target.value) / 100 || 0)}
          className="w-16 text-center"
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
