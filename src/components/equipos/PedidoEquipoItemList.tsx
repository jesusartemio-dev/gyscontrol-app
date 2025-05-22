// ===================================================
// 📁 Archivo: PedidoEquipoItemList.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Lista de ítems dentro de un pedido técnico de equipos
//
// 🧠 Uso: Visualiza cada ítem solicitado dentro del pedido, sus cantidades y estado.
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-22
// ===================================================

'use client'

import {
  PedidoEquipoItem,
  PedidoEquipoItemUpdatePayload
} from '@/types'
import { format } from 'date-fns'
import { Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  items: PedidoEquipoItem[]
  onUpdate?: (id: string, payload: PedidoEquipoItemUpdatePayload) => void
  onDelete?: (id: string) => void
}

export default function PedidoEquipoItemList({ items, onUpdate, onDelete }: Props) {
  return (
    <div className="border rounded-lg overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Equipo</th>
            <th className="px-3 py-2">Unidad</th>
            <th className="px-3 py-2">Cantidad</th>
            <th className="px-3 py-2">Precio Unit.</th>
            <th className="px-3 py-2">Costo Total</th>
            <th className="px-3 py-2">Fecha Necesaria</th>
            <th className="px-3 py-2">Estado</th>
            <th className="px-3 py-2">Comentario</th>
            {(onUpdate || onDelete) && <th className="px-3 py-2 text-right">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const eq = item.listaEquipoItem
            const precio = eq?.precioElegido || 0
            const costo = (precio * item.cantidadPedida).toFixed(2)
            const restante = eq ? eq.cantidad - (eq.cantidadPedida || 0) : null

            return (
              <tr key={item.id} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2 font-semibold">{eq?.descripcion || '-'}</td>
                <td className="px-3 py-2">{eq?.unidad || '-'}</td>
                <td className="px-3 py-2">
                  {item.cantidadPedida}
                  {restante !== null && (
                    <span className="text-xs text-gray-500"> / {eq?.cantidad}</span>
                  )}
                </td>
                <td className="px-3 py-2">S/. {precio.toFixed(2)}</td>
                <td className="px-3 py-2">S/. {costo}</td>
                <td className="px-3 py-2">
                  {format(new Date(item.fechaNecesaria), 'dd/MM/yyyy')}
                </td>
                <td className="px-3 py-2 capitalize">{item.estado}</td>
                <td className="px-3 py-2 text-gray-600">
                  {item.comentarioLogistica || '-'}
                </td>
                {(onUpdate || onDelete) && (
                  <td className="px-3 py-2 text-right space-x-2">
                    {onUpdate && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onUpdate(item.id, {})}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-red-600"
                        onClick={() => onDelete(item.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
