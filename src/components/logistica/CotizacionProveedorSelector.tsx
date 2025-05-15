// ===================================================
// 📁 Archivo: CotizacionProveedorSelector.tsx
// 📌 Ubicación: src/components/logistica/
// 🔧 Descripción: Selector para elegir el proveedor preferido por ítem
//
// 🧠 Uso: Se utiliza dentro del análisis comparativo para seleccionar
//         el proveedor ideal para un ítem técnico.
// ===================================================

'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { ListaEquiposItem, CotizacionProveedorItem, CotizacionProveedor } from '@/types'
import { updateCotizacionProveedorItem } from '@/lib/services/cotizacionProveedorItem'

interface Props {
  item: ListaEquiposItem
  cotizaciones: CotizacionProveedor[]
  onChange?: () => void
}

export default function CotizacionProveedorSelector({ item, cotizaciones, onChange }: Props) {
  const [selectedId, setSelectedId] = useState<string | undefined>(
    item.cotizaciones.find((c) => c.seleccionado)?.id
  )
  const [loading, setLoading] = useState(false)

  const handleSelect = async (cotizacionItemId: string) => {
    try {
      setLoading(true)

      // 🔁 Desactivar todos los seleccionados
      for (const c of item.cotizaciones) {
        if (c.seleccionado && c.id !== cotizacionItemId) {
          await updateCotizacionProveedorItem(c.id, { seleccionado: false })
        }
      }

      // ✅ Activar el seleccionado actual
      await updateCotizacionProveedorItem(cotizacionItemId, { seleccionado: true })
      setSelectedId(cotizacionItemId)
      toast.success('Proveedor seleccionado actualizado')
      onChange?.()
    } catch (error) {
      toast.error('Error al seleccionar proveedor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <span className="text-sm text-gray-600">Proveedor sugerido:</span>

      <Select value={selectedId} onValueChange={handleSelect} disabled={loading}>
        <SelectTrigger className="w-64">
          <SelectValue placeholder="Selecciona proveedor" />
        </SelectTrigger>
        <SelectContent>
          {item.cotizaciones.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.cotizacion.nombre} - S/ {c.precioUnitario.toFixed(2)} ({c.tiempoEntrega} días)
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
