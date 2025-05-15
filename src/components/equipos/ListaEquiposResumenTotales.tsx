// ===================================================
// 📁 Archivo: ListaEquiposResumenTotales.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Muestra los totales de una ListaEquipos (cantidad total, precio referencial total)
//
// 🧠 Uso: Colocado debajo de la lista de ítems para mostrar resumen
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-09
// ===================================================

'use client'

import { ListaEquiposItem } from '@/types'

interface Props {
  items: ListaEquiposItem[]
}

export default function ListaEquiposResumenTotales({ items }: Props) {
  const cantidadTotal = items.reduce((sum, item) => sum + (item.cantidad || 0), 0)
  const precioTotal = items.reduce(
    (sum, item) => sum + ((item.precioReferencial || 0) * (item.cantidad || 0)),
    0
  )

  return (
    <div className="mt-4 p-4 border rounded-lg bg-gray-50 shadow-sm text-sm text-gray-800 space-y-2">
      <div className="flex justify-between">
        <span className="font-medium">Cantidad total de ítems:</span>
        <span>{cantidadTotal.toFixed(2)}</span>
      </div>
      <div className="flex justify-between">
        <span className="font-medium">Costo total referencial (S/):</span>
        <span>S/ {precioTotal.toFixed(2)}</span>
      </div>
    </div>
  )
}
