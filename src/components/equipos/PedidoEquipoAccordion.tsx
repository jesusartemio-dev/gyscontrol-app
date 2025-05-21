// ===================================================
// 📁 Archivo: PedidoEquipoAccordion.tsx
// 📌 Ubicación: src/components/proyectos/
// 🔧 Descripción: Accordion para mostrar detalles de un pedido de equipos
//
// 🧠 Uso: Usado en vistas del proyecto o logística para ver información del pedido
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-21
// ===================================================

'use client'

import { useState } from 'react'
import { PedidoEquipo } from '@/types'
import { format } from 'date-fns'
import { ChevronDown, ChevronUp } from 'lucide-react'
import PedidoEquipoItemList from './PedidoEquipoItemList'

interface Props {
  pedido: PedidoEquipo
}

export default function PedidoEquipoAccordion({ pedido }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border rounded-xl shadow-md mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-t-xl flex justify-between items-center"
      >
        <div className="text-sm font-semibold text-gray-700">
          🧾 Pedido: {pedido.codigo || '(sin código)'} | Lista: {pedido.listaId} | Estado:{' '}
          <span className="font-bold text-blue-600">{pedido.estado}</span>
        </div>
        <div>{expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}</div>
      </button>

      {expanded && (
        <div className="px-4 py-3 space-y-2">
          <div className="text-sm text-gray-600">
            <p>📅 Fecha pedido: {format(new Date(pedido.fechaPedido), 'dd/MM/yyyy')}</p>
            {pedido.fechaEntregaEstimada && (
              <p>📦 Entrega estimada: {format(new Date(pedido.fechaEntregaEstimada), 'dd/MM/yyyy')}</p>
            )}
            {pedido.observacion && <p>📝 Observación: {pedido.observacion}</p>}
          </div>

          {/* Lista de ítems */}
          <PedidoEquipoItemList items={pedido.items} />
        </div>
      )}
    </div>
  )
}
