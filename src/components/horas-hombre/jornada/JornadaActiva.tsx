'use client'

/**
 * JornadaActiva - Panel para jornadas en curso
 */

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  MapPin,
  Target,
  Users,
  ListTodo,
  Clock,
  Plus,
  Send,
  Trash2,
  AlertCircle,
  Pencil,
  Settings,
  MoreVertical
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
    porcentajeCompletado?: number
    proyectoActividad?: { nombre: string } | null
  } | null
  nombreTareaExtra?: string | null
  descripcion?: string | null
  miembros: MiembroTarea[]
}

interface PersonalPlanificado {
  userId: string
  nombre: string
  rolJornada?: 'trabajador' | 'supervisor' | 'seguridad'
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
  const [agregarTareaOpen, setAgregarTareaOpen] = useState(false)
  const [editarTareaOpen, setEditarTareaOpen] = useState(false)
  const [editarJornadaOpen, setEditarJornadaOpen] = useState(false)
  const [tareaSeleccionada, setTareaSeleccionada] = useState<TareaJornada | null>(null)
  const [cerrarJornadaOpen, setCerrarJornadaOpen] = useState(false)
  const [eliminarJornadaOpen, setEliminarJornadaOpen] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [tareaAEliminar, setTareaAEliminar] = useState<TareaJornada | null>(null)
  const [eliminandoTarea, setEliminandoTarea] = useState(false)

  // Calcular estadisticas
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
      weekday: 'short',
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

  const getProgresoColor = (pct: number) => {
    if (pct >= 100) return 'bg-green-500'
    if (pct >= 50) return 'bg-blue-500'
    if (pct > 0) return 'bg-amber-500'
    return 'bg-gray-300'
  }

  const handleEditarTarea = (tarea: TareaJornada) => {
    setTareaSeleccionada(tarea)
    setEditarTareaOpen(true)
  }

  const handleEliminarTarea = async () => {
    if (!tareaAEliminar) return
    try {
      setEliminandoTarea(true)
      const response = await fetch(`/api/horas-hombre/jornada/${jornada.id}/tarea/${tareaAEliminar.id}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error eliminando tarea')
      }
      toast({
        title: 'Tarea eliminada',
        description: 'La tarea ha sido eliminada correctamente'
      })
      onRefresh()
    } catch (error) {
      console.error('Error:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error eliminando tarea'
      })
    } finally {
      setEliminandoTarea(false)
      setTareaAEliminar(null)
    }
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
    horas: t.miembros.reduce((sum, m) => sum + m.horas, 0),
    proyectoTareaId: t.proyectoTarea?.id || null,
    porcentajeActual: t.proyectoTarea?.porcentajeCompletado ?? 0
  }))

  return (
    <>
      <div className="rounded-xl border-l-4 border-l-green-500 border border-gray-200 bg-white shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 sm:py-4">
          {/* Fila principal: Proyecto + Fecha + Acciones */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2.5 mb-1">
                <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500" />
                </span>
                <h3 className="font-bold text-base sm:text-lg truncate">{jornada.proyecto.codigo}</h3>
                <span className="text-xs text-gray-400 hidden sm:inline truncate">{jornada.proyecto.nombre}</span>
              </div>
              <div className="flex items-center flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 ml-5">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {formatFechaCorta(jornada.fechaTrabajo)}
                </span>
                {jornada.proyectoEdt && (
                  <span className="flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" />
                    {jornada.proyectoEdt.nombre}
                  </span>
                )}
                {jornada.ubicacion && (
                  <span className="hidden sm:flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    {jornada.ubicacion}
                  </span>
                )}
                <span className="text-gray-200">|</span>
                <span className="flex items-center gap-1 text-blue-600 font-medium">
                  <ListTodo className="h-3.5 w-3.5" />
                  {cantidadTareas}
                </span>
                <span className="flex items-center gap-1 text-green-600 font-medium">
                  <Users className="h-3.5 w-3.5" />
                  {miembrosUnicos}
                </span>
                <span className="flex items-center gap-1 text-orange-600 font-medium">
                  <Clock className="h-3.5 w-3.5" />
                  {totalHoras}h
                </span>
              </div>
            </div>

            {/* Acciones */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Button
                size="sm"
                onClick={() => setAgregarTareaOpen(true)}
                className="h-9 sm:h-8 px-3 text-xs bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Tarea</span>
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setCerrarJornadaOpen(true)}
                disabled={cantidadTareas === 0}
                className="h-9 sm:h-8 px-3 text-xs border-orange-300 text-orange-600 hover:bg-orange-50"
              >
                <Send className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Cerrar</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-9 w-9 sm:h-8 sm:w-8 p-0 text-gray-400">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditarJornadaOpen(true)}>
                    <Settings className="h-4 w-4 mr-2" />
                    Editar jornada
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setEliminarJornadaOpen(true)}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Eliminar jornada
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Objetivos */}
        {jornada.objetivosDia && (
          <div className="mx-4 mb-3 bg-gray-50 rounded-lg px-3 py-2 flex items-start gap-2">
            <Target className="h-3.5 w-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-gray-600 leading-relaxed">{jornada.objetivosDia}</p>
          </div>
        )}

        {/* Ubicacion mobile */}
        {jornada.ubicacion && (
          <div className="mx-4 mb-3 sm:hidden flex items-center gap-1.5 text-xs text-gray-500">
            <MapPin className="h-3.5 w-3.5" />
            {jornada.ubicacion}
          </div>
        )}

        {/* Lista de tareas */}
        <div className="border-t border-gray-100">
          {cantidadTareas > 0 ? (
            <div className="divide-y divide-gray-50">
              {jornada.tareas.map(tarea => {
                const horasTarea = tarea.miembros.reduce((s, m) => s + m.horas, 0)
                const pct = tarea.proyectoTarea?.porcentajeCompletado
                const hasPct = tarea.proyectoTarea && pct !== undefined && pct !== null
                return (
                  <div
                    key={tarea.id}
                    className="px-4 py-2.5 hover:bg-gray-50/50 transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">
                            {getNombreTarea(tarea)}
                          </span>
                          {hasPct && (
                            <span className={`text-[10px] font-bold px-1.5 py-0 rounded-full text-white ${getProgresoColor(pct!)}`}>
                              {pct}%
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-1">
                          {tarea.miembros.map(m => (
                            <span key={m.id} className="text-[11px] text-gray-400">
                              {m.usuario.name?.split(' ')[0] || m.usuario.email.split('@')[0]} ({m.horas}h)
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditarTarea(tarea)}
                          className="h-7 w-7 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setTareaAEliminar(tarea)}
                          className="h-7 w-7 p-0 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                        <Badge variant="secondary" className="text-[11px] font-semibold px-2 py-0 rounded-full">
                          {horasTarea}h
                        </Badge>
                      </div>
                    </div>
                    {/* Barra de progreso */}
                    {hasPct && (
                      <div className="mt-1.5 h-1 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${getProgresoColor(pct!)}`}
                          style={{ width: `${Math.min(pct!, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="px-4 py-4 flex items-center gap-2 text-amber-600 text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>Agrega tareas antes de cerrar la jornada</span>
            </div>
          )}
        </div>
      </div>

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
          proyectoEdtId={jornada.proyectoEdt?.id}
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
            <AlertDialogTitle>Eliminar jornada?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminara la jornada de {jornada.proyecto.codigo} y todas sus tareas.
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

      <AlertDialog open={!!tareaAEliminar} onOpenChange={(open) => { if (!open) setTareaAEliminar(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar tarea?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la tarea &quot;{tareaAEliminar ? getNombreTarea(tareaAEliminar) : ''}&quot; y las horas registradas de sus miembros.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={eliminandoTarea}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEliminarTarea}
              disabled={eliminandoTarea}
              className="bg-red-600 hover:bg-red-700"
            >
              {eliminandoTarea ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
