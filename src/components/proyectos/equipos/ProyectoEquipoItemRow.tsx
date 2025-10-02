// ===================================================
// 📁 Archivo: ProyectoEquipoItemRow.tsx
// 📌 Ubicación: src/components/proyectos/equipos/
// 🔧 Descripción: Fila editable de un ítem de equipo en el proyecto
//
// 🧠 Uso: Se usa dentro de ProyectoEquipoItemTable para editar/cambiar datos del ítem
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-05-08
// ===================================================

'use client'

import React, { memo, useMemo } from 'react'
import { useEffect, useState } from 'react'
import type { ProyectoEquipoCotizadoItem } from '@/types'
import { Input } from '@/components/ui/input'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  item: ProyectoEquipoCotizadoItem
  onUpdate: (id: string, changes: Partial<ProyectoEquipoCotizadoItem>) => void
  onDelete: (id: string) => void
}

const ProyectoEquipoItemRow = memo(function ProyectoEquipoItemRow({ item, onUpdate, onDelete }: Props) {
  const [localItem, setLocalItem] = useState(item)

  // 🔁 Si el item cambia externamente, actualizamos localmente
  useEffect(() => {
    setLocalItem(item)
  }, [item])

  // ✅ Manejar cambios en campos editables
  const handleChange = (field: keyof ProyectoEquipoCotizadoItem, value: string | number) => {
    const parsed = typeof value === 'string' ? parseFloat(value) || 0 : value
    const updated = { ...localItem, [field]: parsed }

    // 🎯 Calcular costos derivados
    updated.costoInterno = updated.cantidad * updated.precioInterno
    updated.costoCliente = updated.cantidad * updated.precioCliente

    setLocalItem(updated)

    onUpdate(item.id, {
      cantidad: updated.cantidad,
      precioInterno: updated.precioInterno,
      precioCliente: updated.precioCliente,
      costoInterno: updated.costoInterno,
      costoCliente: updated.costoCliente,
    })
  }

  // 🎯 Memoizar cálculos de costos para optimizar rendimiento
  const costoInterno = useMemo(() => {
    return localItem.cantidad * localItem.precioInterno
  }, [localItem.cantidad, localItem.precioInterno])

  const costoCliente = useMemo(() => {
    return localItem.cantidad * localItem.precioCliente
  }, [localItem.cantidad, localItem.precioCliente])

  return (
    <tr className="border-b text-sm hover:bg-gray-50 transition">
      <td className="p-2 font-mono text-gray-700">{item.codigo}</td>
      <td className="p-2">{item.descripcion}</td>
      <td className="p-2 text-gray-500">{item.categoria || '-'}</td>
      <td className="p-2 text-gray-500">{item.unidad || '-'}</td>

      <td className="p-2">
        <Input
          type="number"
          step="any"
          value={localItem.cantidad}
          onChange={(e) => handleChange('cantidad', e.target.value)}
          className="w-24"
        />
      </td>
      <td className="p-2">
        <Input
          type="number"
          step="any"
          value={localItem.precioInterno}
          onChange={(e) => handleChange('precioInterno', e.target.value)}
          className="w-28"
        />
      </td>
      <td className="p-2">
        <Input
          type="number"
          step="any"
          value={localItem.precioCliente}
          onChange={(e) => handleChange('precioCliente', e.target.value)}
          className="w-28"
        />
      </td>

      <td className="p-2 text-right text-blue-700 font-medium">
        {costoInterno.toFixed(2)}
      </td>
      <td className="p-2 text-right text-green-700 font-medium">
        {costoCliente.toFixed(2)}
      </td>

      <td className="p-2 text-right">
        <Button variant="ghost" size="icon" onClick={() => onDelete(item.id)}>
          <Trash2 className="w-4 h-4 text-red-600" />
        </Button>
      </td>
    </tr>
  )
})

export default ProyectoEquipoItemRow
