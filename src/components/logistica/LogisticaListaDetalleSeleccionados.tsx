// ===================================================
// 📁 Archivo: LogisticaListaDetalleSeleccionados.tsx
// 📌 Descripción: Panel para mostrar resumen de ítems seleccionados en el detalle de lista logística
// 🧠 Uso: Muestra un listado de los ítems marcados y permite quitarlos
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-05-25
// ===================================================

'use client'

import { ListaEquipoItem } from '@/types'

interface Props {
  selectedItems: Record<string, { item: ListaEquipoItem; cantidad: number }>
  onRemove: (itemId: string) => void
}

export default function LogisticaListaDetalleSeleccionados({ selectedItems, onRemove }: Props) {
  const itemsArray = Object.values(selectedItems)

  return (
    <div className="space-y-2 border-t pt-2">
      <h3 className="font-bold text-md">Ítems Seleccionados</h3>
      {itemsArray.length === 0 ? (
        <p className="text-gray-500 text-sm">No hay ítems seleccionados.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {itemsArray.map(({ item, cantidad }) => (
            <li key={item.id} className="flex justify-between items-center border p-2 rounded">
              <span>
                {item.descripcion} ({item.codigo}) — {cantidad} unidades
              </span>
              <button
                className="text-red-500 text-xs"
                onClick={() => onRemove(item.id)}
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
