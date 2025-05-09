'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import CotizacionEquipoItemForm from './CotizacionEquipoItemForm'
import CotizacionEquipoItemList from './CotizacionEquipoItemList'
import type { CotizacionEquipo, CotizacionEquipoItem } from '@/types'
import { useState, useEffect } from 'react'
import { Pencil, Trash2, Briefcase } from 'lucide-react'

interface Props {
  equipo: CotizacionEquipo
  onCreated: (item: CotizacionEquipoItem) => void
  onDeleted: (itemId: string) => void
  onUpdated: (item: CotizacionEquipoItem) => void
  onDeletedGrupo: () => void
  onUpdatedNombre: (nuevoNombre: string) => void
}

export default function CotizacionEquipoAccordion({
  equipo,
  onCreated,
  onDeleted,
  onUpdated,
  onDeletedGrupo,
  onUpdatedNombre
}: Props) {
  const [editando, setEditando] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState(equipo.nombre)

  useEffect(() => {
    setNuevoNombre(equipo.nombre)
  }, [equipo.nombre])

  const handleBlur = () => {
    if (nuevoNombre.trim() && nuevoNombre !== equipo.nombre) {
      onUpdatedNombre(nuevoNombre.trim())
    }
    setEditando(false)
  }

  const renta = equipo.subtotalInterno > 0
    ? ((equipo.subtotalCliente - equipo.subtotalInterno) / equipo.subtotalInterno) * 100
    : 0

  return (
    <Accordion type="multiple" className="bg-white shadow-md rounded-2xl border border-gray-200 mb-2">
      <AccordionItem value={equipo.id}>
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center px-6 py-4 gap-4">
          {/* Botón de expandir/contraer */}
          <AccordionTrigger className="flex justify-start" />

          {/* Nombre editable */}
          <div className="flex items-center gap-2">
            <Briefcase size={18} className="text-gray-600" />
            {editando ? (
              <input
                type="text"
                value={nuevoNombre}
                onChange={(e) => setNuevoNombre(e.target.value)}
                onBlur={handleBlur}
                autoFocus
                className="border px-2 py-1 text-sm rounded w-full"
              />
            ) : (
              <span
                onClick={() => setEditando(true)}
                className="font-semibold text-base text-gray-800 cursor-pointer hover:underline"
              >
                {equipo.nombre}
              </span>
            )}
          </div>

          {/* Cantidad de ítems */}
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
            {equipo.items.length} ítem{equipo.items.length !== 1 ? 's' : ''}
          </span>

          {/* Totales */}
          <div className="text-right text-sm">
            <div className="text-gray-400 text-xs leading-tight">Interno / Cliente / % Rent</div>
            <div className="flex gap-1 justify-end">
              <span className="text-gray-700">${equipo.subtotalInterno.toFixed(2)}</span>
              <span className="text-green-600">${equipo.subtotalCliente.toFixed(2)}</span>
              <span className="text-blue-600">{renta.toFixed(1)}%</span>
            </div>
          </div>

          {/* Acciones */}
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
          <CotizacionEquipoItemForm cotizacionEquipoId={equipo.id} onCreated={onCreated} />
          <CotizacionEquipoItemList items={equipo.items} onDeleted={onDeleted} onUpdated={onUpdated} />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
