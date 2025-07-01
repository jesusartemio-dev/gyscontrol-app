'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import CotizacionGastoItemForm from './CotizacionGastoItemForm'
import CotizacionGastoItemTable from './CotizacionGastoItemTable'
import { useState } from 'react'
import { Pencil, Trash2, Coins } from 'lucide-react'
import type {
  CotizacionGasto,
  CotizacionGastoItem,
} from '@/types'
import { calcularSubtotal } from '@/lib/utils/costos'

interface Props {
  gasto: CotizacionGasto
  onCreated?: (item: CotizacionGastoItem) => void
  onUpdated?: (item: CotizacionGastoItem) => void
  onDeleted?: (id: string) => void
  onDeletedGrupo?: () => void
  onUpdatedNombre?: (nuevoNombre: string) => void
}

export default function CotizacionGastoAccordion({
  gasto,
  onCreated,
  onUpdated,
  onDeleted,
  onDeletedGrupo,
  onUpdatedNombre
}: Props) {
  const [editando, setEditando] = useState(false)

  const { subtotalInterno, subtotalCliente } = calcularSubtotal(gasto.items)

  const renta =
    subtotalInterno > 0
      ? ((subtotalCliente - subtotalInterno) / subtotalInterno) * 100
      : 0

  return (
    <Accordion type="multiple" className="bg-white shadow-md rounded-2xl border border-gray-200 mb-4">
      <AccordionItem value={gasto.id}>
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center px-6 py-4 gap-4">
          <AccordionTrigger className="flex items-center justify-start" />
          <div className="flex items-center gap-2">
            <Coins size={18} className="text-yellow-600" />
            {editando ? (
              <input
                type="text"
                value={gasto.nombre}
                onChange={(e) => onUpdatedNombre?.(e.target.value)}
                onBlur={() => setEditando(false)}
                autoFocus
                className="border px-2 py-1 text-sm rounded w-full"
              />
            ) : (
              <span
                onClick={() => setEditando(true)}
                className="font-semibold text-base text-gray-800 cursor-pointer hover:underline"
              >
                {gasto.nombre}
              </span>
            )}
          </div>

          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {gasto.items.length} ítem{gasto.items.length !== 1 ? 's' : ''}
          </span>

          <div className="text-right text-sm leading-tight whitespace-nowrap">
            <div className="text-gray-400 text-xs font-medium">Interno / Cliente / % Rent</div>
            <div>
              <span className="text-gray-700 font-medium">${subtotalInterno.toFixed(2)}</span>{' '}
              / <span className="text-green-600 font-medium">${subtotalCliente.toFixed(2)}</span>{' '}
              / <span className="text-blue-600 font-medium">{renta.toFixed(1)}%</span>
            </div>
          </div>

          <div className="flex gap-2 items-center">
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="text-blue-600 hover:text-blue-800 transition text-xs"
              title="Editar nombre"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={onDeletedGrupo}
              className="text-red-500 hover:text-red-700 transition text-xs"
              title="Eliminar grupo"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <AccordionContent className="px-6 pb-6 space-y-4">
          <CotizacionGastoItemForm gastoId={gasto.id} onCreated={onCreated} />
          <CotizacionGastoItemTable
            items={gasto.items}
            onUpdate={onUpdated}
            onDelete={onDeleted}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
