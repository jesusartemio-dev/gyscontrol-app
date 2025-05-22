'use client'

import { useState } from 'react'
import {
  PedidoEquipo,
  PedidoEquipoItemUpdatePayload,
  PedidoEquipoUpdatePayload,
} from '@/types'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp, Pencil, Trash2 } from 'lucide-react'
import PedidoEquipoItemList from './PedidoEquipoItemList'
import { Button } from '@/components/ui/button'

interface Props {
  pedido: PedidoEquipo
  onUpdateItem?: (id: string, payload: PedidoEquipoItemUpdatePayload) => void
  onDeleteItem?: (id: string) => void
  onUpdate?: (id: string, payload: PedidoEquipoUpdatePayload) => void
  onDelete?: (id: string) => void
}

export default function PedidoEquipoAccordion({
  pedido,
  onUpdateItem,
  onDeleteItem,
  onUpdate,
  onDelete,
}: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border rounded-xl shadow-md mb-4">
      <div className="flex justify-between items-center px-4 py-2 bg-gray-100 rounded-t-xl hover:bg-gray-200">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left text-sm font-semibold text-gray-700"
        >
          🧾 Pedido: {pedido.codigo || '(sin código)'} • Lista: {pedido.lista?.nombre || 'Sin nombre'} | Estado:{' '}
          <span className="font-bold text-blue-600">{pedido.estado}</span>
        </button>

        <div className="flex gap-2">
          {onUpdate && (
            <Button size="sm" variant="outline" onClick={() => onUpdate(pedido.id, {})}>
              <Pencil className="w-4 h-4" />
            </Button>
          )}
          {onDelete && (
            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => onDelete(pedido.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <button onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="px-4 py-3 space-y-2">
          <div className="text-sm text-gray-600">
            <p>📅 Fecha pedido: {format(new Date(pedido.fechaPedido), 'dd/MM/yyyy')}</p>
            {pedido.fechaEntregaEstimada && (
              <p>📦 Entrega estimada: {format(new Date(pedido.fechaEntregaEstimada), 'dd/MM/yyyy')}</p>
            )}
            {pedido.observacion && <p>📝 Observación: {pedido.observacion}</p>}
          </div>

          {/* Lista de ítems del pedido */}
          <PedidoEquipoItemList
            items={pedido.items}
            onUpdate={onUpdateItem}
            onDelete={onDeleteItem}
          />
        </div>
      )}
    </div>
  )
}
