'use client'

/**
 * JornadaActiva - Panel compacto y colapsable para jornadas en curso
 */

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Building,
  Calendar,
  MapPin,
  Target,
  Users,
  ListTodo,
  Clock,
  Plus,
  Send,
  Trash2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Pencil,
  Settings
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { AgregarTareaModal } from './AgregarTareaModal'
import { EditarTareaModal } from './EditarTareaModal'
import { EditarJornadaModal } from './EditarJornadaModal'
import { CerrarJornadaModal } from './CerrarJornadaModal'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Proyecto {
  id: string
  codigo: string
  nombre: string
}

interface Edt {
  id: string
  nombre: string
}

interface Usuario {
  id: string
  name: string | null
  email: string
}

interface MiembroTarea {
  id: string
  usuario: Usuario
  horas: number
  observaciones?: string | null
}

interface TareaJornada {
  id: string
  proyectoTarea?: {
    id: string
    nombre: string
    proyectoActividad?: { nombre: string } | null
  } | null
  nombreTareaExtra?: string | null
  descripcion?: string | null
  miembros: MiembroTarea[]
}

interface PersonalPlanificado {
  userId: string
  nombre: string
}

interface JornadaActivaData {
  id: string
  proyecto: Proyecto
  proyectoEdt?: Edt | null
  fechaTrabajo: string
  objetivosDia?: string | null
  ubicacion?: string | null
  personalPlanificado: PersonalPlanificado[]
  tareas: TareaJornada[]
}

interface JornadaActivaProps {
  jornada: JornadaActivaData
  onRefresh: () => void
  onClosed: () => void
}

export function JornadaActiva({
  jornada,
  onRefresh,
  onClosed
}: JornadaActivaProps) {
  const { toast } = useToast()

  // Estados
  const [isOpen, setIsOpen] = useState(true)
  const [agregarTareaOpen, setAgregarTareaOpen] = useState(false)
  const [editarTareaOpen, setEditarTareaOpen] = useState(false)
  const [editarJornadaOpen, setEditarJornadaOpen] = useState(false)
  const [tareaSeleccionada, setTareaSeleccionada] = useState<TareaJornada | null>(null)
  const [cerrarJornadaOpen, setCerrarJornadaOpen] = useState(false)
  const [eliminarJornadaOpen, setEliminarJornadaOpen] = useState(false)
  const [eliminando, setEliminando] = useState(false)

  // Calcular estadísticas
  const cantidadTareas = jornada.tareas.length
  const miembrosUnicos = new Set(
    jornada.tareas.flatMap(t => t.miembros.map(m => m.usuario.id))
  ).size
  const totalHoras = jornada.tareas.reduce(
    (sum, t) => sum + t.miembros.reduce((s, m) => s + m.horas, 0),
    0
  )

  const formatFechaCorta = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short'
    })
  }

  const getNombreTarea = (tarea: TareaJornada): string => {
    if (tarea.proyectoTarea) {
      return tarea.proyectoTarea.nombre
    }
    return tarea.nombreTareaExtra || 'Tarea sin nombre'
  }

  const handleEditarTarea = (tarea: TareaJornada) => {
    setTareaSeleccionada(tarea)
    setEditarTareaOpen(true)
  }

  const handleEliminarJornada = async () => {
    try {
      setEliminando(true)
      const response = await fetch(`/api/horas-hombre/jornada/${jornada.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error eliminando jornada')
      }

      toast({
        title: 'Jornada eliminada',
        description: 'La jornada ha sido eliminada correctamente'
      })

      onRefresh()
    } catch (error) {
      console.error('Error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error eliminando jornada'
      })
    } finally {
      setEliminando(false)
      setEliminarJornadaOpen(false)
    }
  }

  const tareasResumen = jornada.tareas.map(t => ({
    id: t.id,
    nombre: getNombreTarea(t),
    miembros: t.miembros.length,
    horas: t.miembros.reduce((sum, m) => sum + m.horas, 0)
  }))

  return (
    <>
      <Collapsible
        open={isOpen}
        onOpenChange={setIsOpen}
        className="border border-green-200 rounded-lg bg-gradient-to-r from-green-50 to-white overflow-hidden"
      >
        {/* Header - Mobile optimized */}
        <div className="p-3 space-y-2">
          {/* Primera fila: Expand + Proyecto + Acciones */}
          <div className="flex items-center gap-2">
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 h-8 w-8 flex-shrink-0">
                {isOpen ? (
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
              </Button>
            </CollapsibleTrigger>

            {/* Info principal */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Badge className="bg-green-600 text-xs px-1.5 py-0.5 flex-shrink-0">
                  <Clock className="h-3 w-3 sm:mr-1" />
                  <span className="hidden sm:inline">Activa</span>
                </Badge>
                <span className="font-bold text-sm sm:text-base truncate">{jornada.proyecto.codigo}</span>
                <span className="hidden sm:inline text-xs text-gray-500">
                  {formatFechaCorta(jornada.fechaTrabajo)}
                </span>
              </div>
            </div>

            {/* Acciones rápidas - Touch friendly */}
            <div className="flex items-center gap-1 flex-shrink-0">
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setAgregarTareaOpen(true)
                }}
                className="h-9 sm:h-8 px-2 sm:px-3 text-xs"
              >
                <Plus className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Tarea</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation()
                  setCerrarJornadaOpen(true)
                }}
                disabled={cantidadTareas === 0}
                className="h-9 sm:h-8 px-2 sm:px-3 text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                <Send className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Cerrar</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setEliminarJornadaOpen(true)
                }}
                className="h-9 w-9 sm:h-8 sm:w-8 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" />
              </Button>
            </div>
          </div>

          {/* Segunda fila: Stats (visible en mobile) */}
          <div className="flex items-center gap-3 text-xs pl-10">
            <span className="flex items-center gap-1 text-blue-600 font-medium">
              <ListTodo className="h-3.5 w-3.5" />
              {cantidadTareas} {cantidadTareas === 1 ? 'tarea' : 'tareas'}
            </span>
            <span className="flex items-center gap-1 text-green-600 font-medium">
              <Users className="h-3.5 w-3.5" />
              {miembrosUnicos}
            </span>
            <span className="flex items-center gap-1 text-orange-600 font-medium">
              <Clock className="h-3.5 w-3.5" />
              {totalHoras}h
            </span>
            {jornada.proyectoEdt && (
              <span className="hidden sm:flex items-center gap-1 text-gray-500">
                <Target className="h-3.5 w-3.5" />
                {jornada.proyectoEdt.nombre}
              </span>
            )}
          </div>
        </div>

        {/* Contenido expandible */}
        <CollapsibleContent>
          <div className="px-3 sm:px-4 pb-3 sm:pb-4 pt-1 space-y-3 border-t border-green-100">
            {/* Objetivos y ubicación */}
            <div className="bg-white rounded-lg p-3 border">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <span className="text-xs text-gray-500 block mb-0.5">Objetivos:</span>
                  <span className="text-sm">{jornada.objetivosDia || 'Sin objetivos definidos'}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditarJornadaOpen(true)}
                  className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50 flex-shrink-0"
                >
                  <Settings className="h-4 w-4" />
                </Button>
              </div>
              {jornada.ubicacion && (
                <div className="flex items-center gap-1 text-gray-500 text-xs mt-2 pt-2 border-t">
                  <MapPin className="h-3.5 w-3.5" />
                  {jornada.ubicacion}
                </div>
              )}
            </div>

            {/* Lista de tareas */}
            {cantidadTareas > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-medium text-gray-500">
                  Tareas ({cantidadTareas})
                </div>
                <div className="grid gap-2">
                  {jornada.tareas.map(tarea => {
                    const horasTarea = tarea.miembros.reduce((s, m) => s + m.horas, 0)
                    return (
                      <div
                        key={tarea.id}
                        className="flex items-start justify-between bg-white rounded-lg p-3 border text-sm"
                      >
                        <div className="flex-1 min-w-0">
                          <span className="font-medium text-sm leading-tight block">
                            {getNombreTarea(tarea)}
                          </span>
                          <div className="flex flex-wrap gap-x-2 gap-y-1 mt-1.5">
                            {tarea.miembros.map(m => (
                              <span key={m.id} className="text-xs text-gray-500 whitespace-nowrap">
                                {m.usuario.name?.split(' ')[0] || m.usuario.email.split('@')[0]} ({m.horas}h)
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditarTarea(tarea)}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Badge variant="secondary" className="text-xs font-medium">
                            {horasTarea}h
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 rounded-lg p-3 text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>Agrega tareas antes de cerrar la jornada</span>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Modales */}
      <AgregarTareaModal
        open={agregarTareaOpen}
        onOpenChange={setAgregarTareaOpen}
        jornadaId={jornada.id}
        proyectoId={jornada.proyecto.id}
        proyectoEdtId={jornada.proyectoEdt?.id}
        personalPlanificado={jornada.personalPlanificado as PersonalPlanificado[]}
        onSuccess={onRefresh}
      />

      <CerrarJornadaModal
        open={cerrarJornadaOpen}
        onOpenChange={setCerrarJornadaOpen}
        jornadaId={jornada.id}
        proyecto={jornada.proyecto}
        fechaTrabajo={jornada.fechaTrabajo}
        objetivosDia={jornada.objetivosDia}
        tareasResumen={tareasResumen}
        totalHoras={totalHoras}
        totalMiembros={miembrosUnicos}
        onSuccess={() => {
          onRefresh()
          onClosed()
        }}
      />

      {tareaSeleccionada && (
        <EditarTareaModal
          open={editarTareaOpen}
          onOpenChange={(open) => {
            setEditarTareaOpen(open)
            if (!open) setTareaSeleccionada(null)
          }}
          jornadaId={jornada.id}
          tarea={tareaSeleccionada}
          personalPlanificado={jornada.personalPlanificado}
          onSuccess={onRefresh}
        />
      )}

      <EditarJornadaModal
        open={editarJornadaOpen}
        onOpenChange={setEditarJornadaOpen}
        jornadaId={jornada.id}
        objetivosDia={jornada.objetivosDia}
        ubicacion={jornada.ubicacion}
        onSuccess={onRefresh}
      />

      <AlertDialog open={eliminarJornadaOpen} onOpenChange={setEliminarJornadaOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar jornada?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la jornada de {jornada.proyecto.codigo} y todas sus tareas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminando}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminarJornada}
              disabled={eliminando}
              className="bg-red-600 hover:bg-red-700"
            >
              {eliminando ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
