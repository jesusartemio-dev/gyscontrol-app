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
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Settings, Brain } from 'lucide-react'
import ProyectoEquipoItemTable from './ProyectoEquipoItemTable'
import CrearListaMultipleModal from './CrearListaMultipleModal'
import CrearListaInteligenteModal from './CrearListaInteligenteModal'
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
  const [mostrarDistribucionAvanzada, setMostrarDistribucionAvanzada] = useState(false)
  const [mostrarDistribucionInteligente, setMostrarDistribucionInteligente] = useState(false)
  const router = useRouter()

  // 📊 Memoizar cálculos de subtotales
  const subtotales = useMemo(() => ({
    cliente: equipo.subtotalCliente,
    interno: equipo.subtotalInterno
  }), [equipo.subtotalCliente, equipo.subtotalInterno])


  // 🎯 Función para abrir distribución avanzada
  const handleDistribucionAvanzada = () => {
    const proyectoId = window.location.pathname.split('/')[2]
    setMostrarDistribucionAvanzada(true)
  }

  // 📋 Función callback cuando se completa la distribución
  const handleDistribucionCompletada = (listaId: string) => {
    // Navegar al detalle de la lista creada
    const proyectoId = window.location.pathname.split('/')[2]
    router.push(`/proyectos/${proyectoId}/equipos/listas/${listaId}`)
  }

  // 🧠 Función para abrir distribución inteligente
  const handleDistribucionInteligente = () => {
    const proyectoId = window.location.pathname.split('/')[2]
    setMostrarDistribucionInteligente(true)
  }

  return (
    <>
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
                {/* 🎯 Acciones */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDistribucionAvanzada}
                    className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    + Lista Múltiple
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDistribucionInteligente}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    + Lista Inteligente
                  </Button>
                </div>
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

      {/* 🎯 Modal de Crear Lista Múltiple */}
      <CrearListaMultipleModal
        isOpen={mostrarDistribucionAvanzada}
        onClose={() => setMostrarDistribucionAvanzada(false)}
        proyectoEquipo={equipo}
        proyectoId={window.location.pathname.split('/')[2]}
        onDistribucionCompletada={handleDistribucionCompletada}
      />

      {/* 🧠 Modal de Crear Lista Inteligente */}
      <CrearListaInteligenteModal
        isOpen={mostrarDistribucionInteligente}
        onClose={() => setMostrarDistribucionInteligente(false)}
        proyectoEquipo={equipo}
        proyectoId={window.location.pathname.split('/')[2]}
        onDistribucionCompletada={handleDistribucionCompletada}
      />
    </>
  )
})

export default ProyectoEquipoAccordion
