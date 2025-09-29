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
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Card, CardContent } from '@/components/ui/card'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Settings, Brain, Package, DollarSign, User, ChevronDown, ChevronRight, CheckCircle, Clock, AlertCircle } from 'lucide-react'
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

  // 📊 Memoizar cálculos de subtotales y estadísticas
  const stats = useMemo(() => {
    const items = equipo.items || []
    const totalItems = items.length
    const completedItems = items.filter(item =>
      item.estado === 'en_lista' || item.estado === 'reemplazado'
    ).length
    const progressPercentage = totalItems > 0 ? (completedItems / totalItems) * 100 : 0

    return {
      subtotales: {
        cliente: equipo.subtotalCliente,
        interno: equipo.subtotalInterno
      },
      items: {
        total: totalItems,
        completed: completedItems,
        progress: progressPercentage
      }
    }
  }, [equipo.subtotalCliente, equipo.subtotalInterno, equipo.items])

  // 🎨 Función para obtener color del progreso
  const getProgressColor = (progress: number) => {
    if (progress === 0) return 'bg-gray-200'
    if (progress < 30) return 'bg-red-500'
    if (progress < 70) return 'bg-yellow-500'
    if (progress < 100) return 'bg-blue-500'
    return 'bg-green-500'
  }

  // 🏷️ Función para obtener badge de estado
  const getStatusBadge = () => {
    const { progress } = stats.items
    if (progress === 0) return { label: 'Sin iniciar', variant: 'secondary' as const, icon: Clock }
    if (progress < 100) return { label: 'En progreso', variant: 'default' as const, icon: AlertCircle }
    return { label: 'Completado', variant: 'default' as const, icon: CheckCircle }
  }


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

  const statusBadge = getStatusBadge()
  const StatusIcon = statusBadge.icon

  return (
    <>
      <Card className="mb-4 hover:shadow-md transition-shadow duration-200">
        <Accordion type="single" collapsible>
          <AccordionItem value={`equipo-${equipo.id}`} className="border-0">
            <div className="relative">
              {/* Acciones rápidas flotantes (solo visibles en collapsed) */}
              {!open && (
                <div className="absolute top-4 right-4 z-10 flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDistribucionAvanzada}
                    className="h-8 w-8 p-0 text-purple-600 hover:text-purple-700 hover:bg-purple-50 shadow-sm"
                    title="Crear Lista Múltiple"
                  >
                    <Settings className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleDistribucionInteligente}
                    className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 shadow-sm"
                    title="Crear Lista Inteligente"
                  >
                    <Brain className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <AccordionTrigger
                onClick={() => setOpen(!open)}
                className="px-6 py-4 hover:no-underline hover:bg-gray-50/50 rounded-t-lg pr-24"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-4">
                    {/* Icono del grupo */}
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-blue-600" />
                      </div>
                    </div>

                    {/* Información principal */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {equipo.nombre}
                        </h3>
                        <Badge variant={statusBadge.variant} className="flex items-center gap-1">
                          <StatusIcon className="w-3 h-3" />
                          {statusBadge.label}
                        </Badge>
                      </div>

                      {/* Estadísticas rápidas */}
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Package className="w-4 h-4" />
                          <span>{stats.items.total} ítems</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4" />
                          <span>${stats.subtotales.cliente.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
                        </div>
                        {equipo.responsable && (
                          <div className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            <span className="truncate max-w-24">{equipo.responsable.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="flex items-center gap-4 ml-4">
                    <div className="hidden sm:flex flex-col items-end gap-1 min-w-24">
                      <div className="text-xs text-gray-500">
                        {stats.items.completed}/{stats.items.total} completados
                      </div>
                      <Progress
                        value={stats.items.progress}
                        className="w-20 h-2"
                      />
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
            </div>

            <AccordionContent className="px-6 pb-4">
              <div className="border-t pt-4 space-y-4">
                {/* Información detallada */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Detalles del Grupo</h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">
                        <span className="font-medium">Responsable:</span> {equipo.responsable?.name ?? 'Sin asignar'}
                      </p>
                      {equipo.descripcion && (
                        <p className="text-gray-600">
                          <span className="font-medium">Descripción:</span> {equipo.descripcion}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Costos</h4>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-600">
                        <span className="font-medium">Cliente:</span> ${stats.subtotales.cliente.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-gray-600">
                        <span className="font-medium">Interno:</span> ${stats.subtotales.interno.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Barra de progreso completa */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Progreso de ítems</span>
                    <span className="text-sm text-gray-500">
                      {stats.items.completed} de {stats.items.total} completados
                    </span>
                  </div>
                  <Progress
                    value={stats.items.progress}
                    className="h-3"
                  />
                </div>

                {/* Acciones principales */}
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDistribucionAvanzada}
                    className="text-purple-600 hover:text-purple-700 hover:bg-purple-50"
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Crear Lista Múltiple
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDistribucionInteligente}
                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    Crear Lista Inteligente
                  </Button>
                </div>

                {/* Tabla de ítems */}
                <div className="border rounded-lg overflow-hidden">
                  <ProyectoEquipoItemTable
                    equipo={equipo}
                    onItemChange={onItemChange}
                  />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

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
