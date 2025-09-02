// ===================================================
// 📁 Archivo: ProyectoEquipoAccordion.tsx
// 📌 Ubicación: src/components/proyectos/equipos/
// 🔧 Descripción: Accordion para mostrar y gestionar los ítems de un grupo de equipos
//
// 🧠 Uso: Utilizado dentro de ProyectoEquipoList.tsx para visualizar un grupo expandible
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-05-08
// ===================================================

'use client'

import React, { memo, useMemo, useState } from 'react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import ProyectoEquipoItemTable from './ProyectoEquipoItemTable'
import type { ProyectoEquipo, ProyectoEquipoItem } from '@/types'

interface Props {
  equipo: ProyectoEquipo
  onItemChange: (items: ProyectoEquipoItem[]) => void
  onUpdatedNombre: (nuevo: string) => void
  onDeletedGrupo: () => void
  onChange: (changes: Partial<ProyectoEquipo>) => void
}

const ProyectoEquipoAccordion = memo(function ProyectoEquipoAccordion({
  equipo,
  onItemChange,
  onUpdatedNombre,
  onDeletedGrupo,
  onChange
}: Props) {
  const [open, setOpen] = useState(false)

  // 📊 Memoizar cálculos de subtotales
  const subtotales = useMemo(() => ({
    cliente: equipo.subtotalCliente,
    interno: equipo.subtotalInterno
  }), [equipo.subtotalCliente, equipo.subtotalInterno])

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value={`equipo-${equipo.id}`}>
        <AccordionTrigger onClick={() => setOpen(!open)}>
          <div className="flex justify-between w-full">
            <div>
              <strong>{equipo.nombre}</strong>
              <div className="text-sm text-gray-500">
                Cliente: $ {subtotales.cliente.toFixed(2)} | Interno: $ {subtotales.interno.toFixed(2)}
              </div>
            </div>
          </div>
        </AccordionTrigger>

        <AccordionContent>
          <div className="p-4 bg-white space-y-4 rounded-b-md shadow-inner">
            {/* 🧾 Info básica */}
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm text-gray-500">
                  Responsable: <span className="text-gray-700">{equipo.responsable?.name ?? 'Sin asignar'}</span>
                </p>
                {equipo.descripcion && (
                  <p className="text-sm text-gray-400 mt-1 italic">{equipo.descripcion}</p>
                )}
              </div>
              {/* 🎯 Acciones (a futuro) */}
              {/* <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={() => onDeletedGrupo()}>
                  <Trash2 className="w-4 h-4 text-red-600" />
                </Button>
              </div> */}
            </div>

            {/* 🧩 Tabla de ítems del grupo */}
            <ProyectoEquipoItemTable
              equipo={equipo}
              onItemChange={onItemChange}
            />
          </div>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
})

export default ProyectoEquipoAccordion
