// ===================================================
// 📁 Archivo: ProyectoEquipoItemTable.tsx
// 📌 Ubicación: src/components/proyectos/equipos/
// 🔧 Descripción: Tabla editable de ítems de un grupo de equipos en un proyecto
//
// 🧠 Uso: Utilizado dentro de ProyectoEquipoAccordion.tsx para mostrar y editar ítems
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-05-08
// ===================================================

'use client'

import React, { memo, useMemo } from 'react'
import type { ProyectoEquipoCotizado, ProyectoEquipoCotizadoItem } from '@/types'
import ProyectoEquipoItemRow from './ProyectoEquipoItemRow'

interface Props {
  equipo: ProyectoEquipoCotizado
  onItemChange: (items: ProyectoEquipoCotizadoItem[]) => void
}

const ProyectoEquipoItemTable = memo(function ProyectoEquipoItemTable({ equipo, onItemChange }: Props) {
  // ✅ Actualizar un ítem por ID
  const handleUpdateItem = (id: string, changes: Partial<ProyectoEquipoCotizadoItem>) => {
    const nuevosItems = equipo.items.map((item) =>
      item.id === id ? { ...item, ...changes } : item
    )
    onItemChange(nuevosItems)
  }

  // ✅ Eliminar un ítem por ID
  const handleDeleteItem = (id: string) => {
    const nuevosItems = equipo.items.filter((item) => item.id !== id)
    onItemChange(nuevosItems)
  }

  // 📊 Calcular totales con memoización
  const { totalInterno, totalCliente } = useMemo(() => ({
    totalInterno: equipo.items.reduce((sum, item) => sum + (item.cantidad * item.precioInterno), 0),
    totalCliente: equipo.items.reduce((sum, item) => sum + (item.cantidad * item.precioCliente), 0)
  }), [equipo.items])

  return (
    <div className="overflow-auto border rounded-md shadow-sm">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-100 text-gray-700 font-medium">
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
              <ProyectoEquipoItemRow
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
})

export default ProyectoEquipoItemTable
