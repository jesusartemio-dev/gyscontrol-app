'use client'

// ===================================================
// 📁 Archivo: LogisticaCotizacionItemSelector.tsx
// 📌 Descripción: Tabla de ítems técnicos para seleccionar y agregar a cotización (con marca visual de cotizados)
// 🧠 Uso: Muestra los ítems de la lista seleccionada y permite marcar cantidades
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-26
// ===================================================

import { ListaEquipoItem } from '@/types'
import { Badge } from '@/components/ui/badge'

interface Props {
  items: ListaEquipoItem[]
  selectedItems: Record<string, number> // id → cantidad
  onSelectItem: (itemId: string, checked: boolean) => void
  onChangeCantidad: (itemId: string, cantidad: number) => void
}

export default function LogisticaCotizacionItemSelector({
  items,
  selectedItems,
  onSelectItem,
  onChangeCantidad,
}: Props) {
  return (
    <div className="space-y-2 border p-4 rounded-xl">
      <div className="grid grid-cols-8 gap-2 font-semibold text-sm bg-gray-100 p-2 rounded">
        <div></div>
        <div>Descripción</div>
        <div>Código</div>
        <div>Unidad</div>
        <div>Cant. Original</div>
        <div>Presupuesto</div>
        <div>Cant. Cotizada</div>
        <div>Estado</div>
      </div>

      {items.map((item) => {
        const yaCotizado = item.cotizaciones && item.cotizaciones.length > 0

        return (
          <div
            key={item.id}
            className={`grid grid-cols-8 gap-2 items-center border-b py-1 text-sm ${
              yaCotizado ? 'bg-yellow-50' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={item.id in selectedItems}
              onChange={(e) => onSelectItem(item.id, e.target.checked)}
            />
            <div>{item.descripcion}</div>
            <div>{item.codigo}</div>
            <div>{item.unidad}</div>
            <div>{item.cantidad}</div>
            <div>S/. {item.presupuesto?.toFixed(2) || '0.00'}</div>
            <input
              type="number"
              className="border p-1 rounded w-full"
              value={selectedItems[item.id] || ''}
              min={1}
              disabled={!(item.id in selectedItems)}
              onChange={(e) =>
                onChangeCantidad(item.id, parseFloat(e.target.value) || 1)
              }
            />
            <div>
              {yaCotizado ? (
                <Badge variant="outline" className="text-green-700 border-green-700">
                  Ya cotizado
                </Badge>
              ) : (
                <span className="text-gray-400 text-xs">Nuevo</span>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
