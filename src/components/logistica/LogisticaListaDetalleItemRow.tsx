'use client'

import { ListaEquipoItem } from '@/types'

interface Props {
  item: ListaEquipoItem
  isSelected?: boolean
  selectedCantidad?: number | string
  onCheck?: (checked: boolean) => void
  onCantidadChange?: (cantidad: number) => void
}

export default function LogisticaListaDetalleItemRow({
  item,
  isSelected = false,
  selectedCantidad = '',
  onCheck,
  onCantidadChange,
}: Props) {
  return (
    <div className="grid grid-cols-7 gap-2 items-center border-b py-1 text-sm">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={(e) => onCheck?.(e.target.checked)}
      />
      <div>{item.descripcion}</div>
      <div>{item.codigo}</div>
      <div>{item.unidad}</div>
      <div>{item.cantidad}</div>
      <div>$ {item.presupuesto?.toFixed(2) || '0.00'}</div>
      <input
        type="number"
        className="border p-1 rounded w-full"
        value={selectedCantidad}
        min={1}
        onChange={(e) => onCantidadChange?.(parseFloat(e.target.value) || 1)}
        disabled={!isSelected}
      />
    </div>
  )
}
