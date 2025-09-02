// ===================================================
// 📁 Archivo: PedidoEquipoList.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Lista de pedidos de equipos realizada por proyectos o visible por logística
// 🧠 Uso: Reutilizable en contextos de proyectos (edición) y logística (solo lectura)
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-21
// ===================================================

'use client'

import {
  PedidoEquipo,
  PedidoEquipoUpdatePayload,
  PedidoEquipoItemUpdatePayload,
} from '@/types'
import { useState } from 'react'
import { format } from 'date-fns'
import { Eye, ClipboardList, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import PedidoEquipoAccordion from './PedidoEquipoAccordion'

interface Props {
  data: PedidoEquipo[]
  onUpdate?: (id: string, payload: PedidoEquipoUpdatePayload) => void
  onDelete?: (id: string) => void
  onUpdateItem?: (id: string, payload: PedidoEquipoItemUpdatePayload) => void
  onDeleteItem?: (id: string) => void
  onRefresh?: () => Promise<void>
}

export default function PedidoEquipoList({
  data,
  onUpdate,
  onDelete,
  onUpdateItem,
  onDeleteItem,
  onRefresh,
}: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const toggleExpand = (id: string) => {
    setExpandedId(prev => (prev === id ? null : id))
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold flex items-center gap-2">
        <ClipboardList className="w-6 h-6 text-blue-600" />
        Pedidos Realizados
      </h2>

      {data.length === 0 && (
        <p className="text-sm text-gray-500">No hay pedidos registrados aún.</p>
      )}

      <div className="space-y-3">
        {data.map((pedido) => (
          <div key={pedido.id} className="border rounded-lg shadow transition">
            <div
              className="p-4 grid grid-cols-1 md:grid-cols-5 gap-4 items-center hover:bg-gray-50"
            >
              <div className="md:col-span-2">
                <div className="font-semibold text-gray-800">
                  {pedido.codigo || 'Sin código'}
                </div>
                <div className="text-sm text-gray-500">
                  Estado: <span className="capitalize">{pedido.estado}</span>
                </div>
                <div className="text-xs text-gray-400">
                  Pedido: {format(new Date(pedido.fechaPedido), 'dd/MM/yyyy')}
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-500">Responsable</span>
                <div className="text-sm text-gray-700">
                  {pedido.responsable?.name || 'Sin responsable'}
                </div>
              </div>

              <div>
                <span className="text-xs text-gray-500">Lista</span>
                <div className="text-sm text-gray-700">
                  {pedido.lista?.nombre || 'Sin nombre de lista'}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toggleExpand(pedido.id)}
                >
                  <Eye className="w-4 h-4 mr-1" /> Detalle
                </Button>

                {onUpdate && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUpdate(pedido.id, {})}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                )}

                {onDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-red-600"
                    onClick={() => onDelete(pedido.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>

            {expandedId === pedido.id && (
              <PedidoEquipoAccordion
                pedido={pedido}
                responsableId={pedido.responsableId}
                onUpdateItem={onUpdateItem}
                onDeleteItem={onDeleteItem}
                onRefresh={onRefresh}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
