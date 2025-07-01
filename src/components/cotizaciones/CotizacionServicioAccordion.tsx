'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import CotizacionServicioItemTable from './CotizacionServicioItemTable'
import CotizacionServicioItemAddModal from './CotizacionServicioItemAddModal'
import type {
  CotizacionServicio,
  CotizacionServicioItem,
  CotizacionServicioItemPayload
} from '@/types'
import { useState, useEffect } from 'react'
import { Pencil, Trash2, Wrench } from 'lucide-react'
import { createCotizacionServicioItem } from '@/lib/services/cotizacionServicioItem'

interface Props {
  servicio: CotizacionServicio
  onCreated: (item: CotizacionServicioItem) => void
  onDeleted: (itemId: string) => void
  onUpdated: (item: CotizacionServicioItem) => void
  onDeletedGrupo: () => void
  onUpdatedNombre: (nuevoNombre: string) => void
}

export default function CotizacionServicioAccordion({
  servicio,
  onCreated,
  onDeleted,
  onUpdated,
  onDeletedGrupo,
  onUpdatedNombre
}: Props) {
  const [editando, setEditando] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState(servicio.categoria)
  const [modalAbierto, setModalAbierto] = useState(false)

  useEffect(() => {
    setNuevoNombre(servicio.categoria)
  }, [servicio.categoria])

  const handleBlur = () => {
    if (nuevoNombre.trim() && nuevoNombre !== servicio.categoria) {
      onUpdatedNombre(nuevoNombre.trim())
    }
    setEditando(false)
  }

  const renta = servicio.subtotalInterno > 0
    ? ((servicio.subtotalCliente - servicio.subtotalInterno) / servicio.subtotalInterno) * 100
    : 0

  return (
    <>
      <Accordion type="multiple" className="bg-white shadow-md rounded-2xl border border-gray-200 mb-4">
        <AccordionItem value={servicio.id}>
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center px-6 py-4 gap-4">
            <AccordionTrigger className="flex items-center justify-start" />

            <div className="flex items-center gap-2">
              <Wrench size={18} className="text-gray-600" />
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
                  {servicio.categoria}
                </span>
              )}
            </div>

            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
              {servicio.items.length} ítem{servicio.items.length !== 1 ? 's' : ''}
            </span>

            <div className="text-right text-sm leading-tight whitespace-nowrap">
              <div className="text-gray-400 text-xs font-medium">Interno / Cliente / % Rent</div>
              <div>
                <span className="text-gray-700 font-medium">
                  $ {servicio.subtotalInterno.toFixed(2)}
                </span>{' '}
                /{' '}
                <span className="text-green-600 font-medium">
                  $ {servicio.subtotalCliente.toFixed(2)}
                </span>{' '}
                /{' '}
                <span className="text-blue-600 font-medium">
                  {renta.toFixed(1)}%
                </span>
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
            <div className="flex justify-end">
              <button
                onClick={() => setModalAbierto(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
              >
                ➕ Agregar Item Servicio
              </button>
            </div>

            <CotizacionServicioItemTable
              items={servicio.items}
              onDeleted={onDeleted}
              onUpdated={onUpdated}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <CotizacionServicioItemAddModal
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        servicio={servicio}
        onAgregarItems={async (items) => {
          for (const item of items) {
            try {
              const creado = await createCotizacionServicioItem({
                ...item,
                cotizacionServicioId: servicio.id
              } as CotizacionServicioItemPayload)
              onCreated(creado)
            } catch (error) {
              console.error('❌ Error al guardar ítem de servicio:', error)
            }
          }
        }}
      />
    </>
  )
}
