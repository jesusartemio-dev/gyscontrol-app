'use client'

import { useState } from 'react'
import {
  PedidoEquipo,
  PedidoEquipoItemUpdatePayload,
  PedidoEquipoUpdatePayload,
  PedidoEquipoItemPayload,
  ListaEquipoItem,
} from '@/types'

import { format } from 'date-fns'
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  PlusCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

import PedidoEquipoItemList from './PedidoEquipoItemList'
import PedidoEquipoItemModalAgregar from './PedidoEquipoItemModalAgregar'

interface Props {
  pedido: PedidoEquipo
  onUpdateItem?: (id: string, payload: PedidoEquipoItemUpdatePayload) => void
  onDeleteItem?: (id: string) => void
  onUpdate?: (id: string, payload: PedidoEquipoUpdatePayload) => void
  onDelete?: (id: string) => void
  onCreateItem?: (payload: PedidoEquipoItemPayload) => Promise<void>
}

export default function PedidoEquipoAccordion({
  pedido,
  onUpdateItem,
  onDeleteItem,
  onUpdate,
  onDelete,
  onCreateItem,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)

  const lista = pedido.lista

  const itemsDisponibles: ListaEquipoItem[] = lista?.items?.length
    ? lista.items.filter(
        (item) => item.cantidad - (item.cantidadPedida || 0) > 0
      )
    : []

  const totalPedido = pedido.items?.reduce(
    (total, item) => total + (item.costoTotal || 0),
    0
  )

  const handleCreateItem = async (payload: PedidoEquipoItemPayload) => {
    await onCreateItem?.(payload)
  }

  return (
    <div className="border rounded-xl shadow-md mb-4">
      {/* Encabezado del acordeón */}
      <div className="flex justify-between items-center px-4 py-2 bg-gray-100 rounded-t-xl hover:bg-gray-200">
        <div
          onClick={() => setExpanded(!expanded)}
          className="flex-1 text-left text-sm font-semibold text-gray-700 cursor-pointer"
        >
          <div>
            🧾 Pedido: {pedido.codigo || '(sin código)'} • Lista:{' '}
            {lista?.nombre || 'Sin nombre'}
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>
              Estado:{' '}
              <span className="text-blue-600 font-bold">{pedido.estado}</span>
            </span>
            <div className="flex gap-4 text-right">
              {pedido.items?.length > 0 && (
                <span className="text-green-700 font-semibold">
                  💰 Total: ${totalPedido.toFixed(2)}
                </span>
              )}
              <span className="text-orange-600 font-medium">
                📌 {format(new Date(pedido.fechaNecesaria), 'dd/MM/yyyy')}
              </span>
            </div>
          </div>
        </div>

        {/* Acciones rápidas */}
        <div className="flex gap-2 items-center">
          {onCreateItem && lista && lista.items?.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setMostrarModal(true)}
              title="Agregar ítem al pedido"
            >
              <PlusCircle className="w-4 h-4" />
            </Button>
          )}
          {onUpdate && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onUpdate(pedido.id, {})}
              title="Editar pedido"
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
              title="Eliminar pedido"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
          <button onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>
      </div>

      {/* Contenido expandido del acordeón */}
      {expanded && (
        <div className="px-4 py-3 space-y-2 text-sm text-gray-700">
          <p>
            📅 Pedido creado:{' '}
            {format(new Date(pedido.fechaPedido), 'dd/MM/yyyy')}
          </p>
          <p>
            📌 Fecha necesaria por Proyectos:{' '}
            <strong>
              {format(new Date(pedido.fechaNecesaria), 'dd/MM/yyyy')}
            </strong>
          </p>

          {pedido.fechaEntregaEstimada && (
            <p>
              🚚 Entrega estimada por logística:{' '}
              {format(new Date(pedido.fechaEntregaEstimada), 'dd/MM/yyyy')}
            </p>
          )}
          {pedido.fechaEntregaReal && (
            <p>
              ✅ Entregado realmente:{' '}
              {format(new Date(pedido.fechaEntregaReal), 'dd/MM/yyyy')}
            </p>
          )}
          {pedido.observacion && <p>📝 Observación: {pedido.observacion}</p>}

          <PedidoEquipoItemList
            items={pedido.items}
            onUpdate={onUpdateItem}
            onDelete={onDeleteItem}
          />
        </div>
      )}

      {/* Modal de agregar ítems */}
      {lista && onCreateItem && (
        <PedidoEquipoItemModalAgregar
          open={mostrarModal}
          onClose={() => setMostrarModal(false)}
          pedidoId={pedido.id}
          items={itemsDisponibles}
          onCreateItem={handleCreateItem}
        />
      )}
    </div>
  )
}
