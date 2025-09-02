// ===================================================
// 📁 Archivo: PlantillaEquipoAccordion.tsx
// 📌 Ubicación: src/components/plantillas/equipos/
// 🔧 Descripción: Accordion para mostrar un grupo de equipo en la plantilla
//
// 🧠 Uso: Se usa dentro del listado de PlantillaEquipoList.tsx
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-05-08
// ===================================================

'use client'

import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import PlantillaEquipoItemTable from './PlantillaEquipoItemTable'
import type { PlantillaEquipo, PlantillaEquipoItem } from '@/types'

interface Props {
  equipo: PlantillaEquipo
  onItemChange: (items: PlantillaEquipoItem[]) => void
  onUpdatedNombre: (nuevo: string) => void
  onDeletedGrupo: () => void
  onChange: (changes: Partial<PlantillaEquipo>) => void
}

export default function PlantillaEquipoAccordion({
  equipo,
  onItemChange,
  onUpdatedNombre,
  onDeletedGrupo,
  onChange
}: Props) {
  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="item-1">
        <AccordionTrigger>
          <div className="flex justify-between w-full">
            <div>
              <strong>{equipo.nombre}</strong>
              <div className="text-sm text-gray-500">
                Cliente: $ {equipo.subtotalCliente.toFixed(2)} | Interno: $ {equipo.subtotalInterno.toFixed(2)}
              </div>
            </div>
          </div>
        </AccordionTrigger>
        <AccordionContent>
          <div className="p-4 bg-white space-y-4">
            {equipo.descripcion && (
              <p className="text-sm text-gray-400 mt-1 italic">{equipo.descripcion}</p>
            )}

            <PlantillaEquipoItemTable
              equipo={equipo}
              onItemChange={onItemChange}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}
