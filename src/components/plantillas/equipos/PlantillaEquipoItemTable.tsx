// ===================================================
// 📁 Archivo: PlantillaEquipoItemTable.tsx
// 📌 Ubicación: src/components/plantillas/equipos/
// 🔧 Descripción: Tabla para visualizar y editar ítems de un grupo de equipos
// 🧠 Uso: Usado dentro de PlantillaEquipoAccordion.tsx
// ===================================================

'use client'

import type { PlantillaEquipo, PlantillaEquipoItem } from '@/types'
import PlantillaEquipoItemRow from './PlantillaEquipoItemRow'

interface Props {
  equipo: PlantillaEquipo
  onItemChange: (items: PlantillaEquipoItem[]) => void
}

export default function PlantillaEquipoItemTable({
  equipo,
  onItemChange,
}: Props) {
  const handleUpdateItem = (id: string, changes: Partial<PlantillaEquipoItem>) => {
    const nuevosItems = equipo.items.map((item) =>
      item.id === id ? { ...item, ...changes } : item
    )
    onItemChange(nuevosItems)
  }

  const handleDeleteItem = (id: string) => {
    const nuevosItems = equipo.items.filter((item) => item.id !== id)
    onItemChange(nuevosItems)
  }

  return (
    <div className="overflow-auto border rounded-md">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="p-2 text-left">Código</th>
            <th className="p-2 text-left">Nombre</th>
            <th className="p-2 text-left">Descripción</th>
            <th className="p-2 text-left">Unidad</th>
            <th className="p-2 text-left">Cantidad</th>
            <th className="p-2 text-left">Precio Interno</th>
            <th className="p-2 text-left">Precio Cliente</th>
            <th className="p-2 text-right">Costo Interno</th>
            <th className="p-2 text-right">Costo Cliente</th>
            <th className="p-2 text-right">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {equipo.items.length === 0 ? (
            <tr>
              <td colSpan={10} className="text-center p-4 text-gray-500">
                No hay ítems registrados.
              </td>
            </tr>
          ) : (
            equipo.items.map((item) => (
              <PlantillaEquipoItemRow
                key={item.id}
                item={item}
                onUpdate={handleUpdateItem}
                onDelete={handleDeleteItem}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
