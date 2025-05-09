'use client'

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from '@/components/ui/accordion'
import PlantillaServicioItemForm from './PlantillaServicioItemForm'
import PlantillaServicioItemList from './PlantillaServicioItemList'
import type { PlantillaServicio, PlantillaServicioItem } from '@/types'
import { useState, useEffect } from 'react'
import { Pencil, Trash2, Wrench, ChevronDown } from 'lucide-react'
import { useParams, useRouter } from 'next/navigation'

interface Props {
  servicio: PlantillaServicio
  onCreated: (item: PlantillaServicioItem) => void
  onDeleted: (itemId: string) => void
  onUpdated: (item: PlantillaServicioItem) => void
  onDeletedGrupo: () => void
  onUpdatedNombre: (nuevoNombre: string) => void
}

export default function PlantillaServicioAccordion({
  servicio,
  onCreated,
  onDeleted,
  onUpdated,
  onDeletedGrupo,
  onUpdatedNombre
}: Props) {
  const [editando, setEditando] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState(servicio.nombre)

  const router = useRouter()
  const params = useParams()
  const plantillaId = params.id as string

  useEffect(() => {
    setNuevoNombre(servicio.nombre)
  }, [servicio.nombre])

  const handleBlur = () => {
    if (nuevoNombre.trim() && nuevoNombre !== servicio.nombre) {
      onUpdatedNombre(nuevoNombre.trim())
    }
    setEditando(false)
  }

  const renta =
    servicio.subtotalInterno > 0
      ? ((servicio.subtotalCliente - servicio.subtotalInterno) / servicio.subtotalInterno) * 100
      : 0

  return (
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
                {servicio.nombre}
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
              onClick={() =>
                router.push(`/comercial/plantillas/${plantillaId}/servicio/select?grupo=${servicio.id}`)
              }
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm"
            >
              ➕ Agregar Servicios desde Catálogo
            </button>
          </div>

          <PlantillaServicioItemList
            items={servicio.items}
            onDeleted={onDeleted}
            onUpdated={onUpdated}
          />
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
