'use client'

// ===================================================
// 📁 Archivo: LogisticaCotizacionResumen.tsx
// 📌 Descripción: Muestra los ítems seleccionados antes de generar la cotización
// 🧠 Uso: Resume las selecciones, permite quitar ítems y limpiar todo
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-26
// ===================================================

import { ListaEquipoItem } from '@/types'

interface Props {
  selectedItems: Record<string, { item: ListaEquipoItem; cantidad: number }>
  onRemoveItem: (itemId: string) => void
  onClear: () => void
}

export default function LogisticaCotizacionResumen({
  selectedItems,
  onRemoveItem,
  onClear,
}: Props) {
  const total = Object.values(selectedItems).reduce(
    (acc, { item, cantidad }) => acc + (item.presupuesto || 0) * cantidad,
    0
  )

  return (
    <div className="space-y-2 border p-4 rounded-xl">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Resumen de Ítems Seleccionados</h3>
        <button
          className="text-blue-500 text-sm underline"
          onClick={onClear}
        >
          Limpiar todo
        </button>
      </div>

      {Object.keys(selectedItems).length === 0 ? (
        <p className="text-sm text-gray-500">No hay ítems seleccionados.</p>
      ) : (
        <ul className="space-y-1">
          {Object.values(selectedItems).map(({ item, cantidad }) => (
            <li
              key={item.id}
              className="flex justify-between items-center border-b py-1 text-sm"
            >
              <span>
                {item.descripcion} ({item.codigo}) — {cantidad} unidades • S/.{' '}
                {(item.presupuesto || 0).toFixed(2)} c/u
              </span>
              <button
                className="text-red-500 text-xs"
                onClick={() => onRemoveItem(item.id)}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="text-right font-bold text-base mt-2">
        Total: S/. {total.toFixed(2)}
      </div>
    </div>
  )
}
