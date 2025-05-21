// ===================================================
// 📁 Archivo: PedidoEquipoItemList.tsx
// 📌 Ubicación: src/components/proyectos/
// 🔧 Descripción: Lista de ítems dentro de un pedido técnico de equipos
//
// 🧠 Uso: Visualiza cada ítem solicitado dentro del pedido, sus cantidades y estado.
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-21
// ===================================================

'use client'

import { PedidoEquipoItem } from '@/types'
import { format } from 'date-fns'

interface Props {
  items: PedidoEquipoItem[]
}

export default function PedidoEquipoItemList({ items }: Props) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-3 py-2 text-left">#</th>
            <th className="px-3 py-2 text-left">Cantidad</th>
            <th className="px-3 py-2 text-left">Fecha Necesaria</th>
            <th className="px-3 py-2 text-left">Estado</th>
            <th className="px-3 py-2 text-left">Comentario</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => (
            <tr
              key={item.id}
              className="border-t hover:bg-gray-50 transition-all"
            >
              <td className="px-3 py-2 font-semibold">{index + 1}</td>
              <td className="px-3 py-2">{item.cantidadPedida}</td>
              <td className="px-3 py-2">
                {format(new Date(item.fechaNecesaria), 'dd/MM/yyyy')}
              </td>
              <td className="px-3 py-2 capitalize">{item.estado}</td>
              <td className="px-3 py-2 text-gray-600">{item.comentarioLogistica || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
