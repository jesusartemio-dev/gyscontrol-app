'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import {
  Plus,
  HardHat,
  Loader2,
  Calendar,
  Clock,
  Users,
  ListTodo,
  Target,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import {
  IniciarJornadaModal,
  JornadaActiva,
  ListaJornadas
} from '@/components/horas-hombre/jornada'

type EstadoJornada = 'iniciado' | 'pendiente' | 'aprobado' | 'rechazado'

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

interface Bloqueo {
  tipoBloqueoId?: string
  tipoBloqueoNombre?: string
  descripcion: string
  impacto?: string
  accion?: string
}

interface JornadaCompleta {
  id: string
  proyecto: Proyecto
  proyectoEdt?: Edt | null
  fechaTrabajo: string
  estado: EstadoJornada
  objetivosDia?: string | null
  avanceDia?: string | null
  bloqueos?: Bloqueo[] | null
  planSiguiente?: string | null
  ubicacion?: string | null
  personalPlanificado?: PersonalPlanificado[] | null
  motivoRechazo?: string | null
  fechaCierre?: string | null
  createdAt: string
  tareas: TareaJornada[]
  cantidadTareas: number
  cantidadMiembros: number
  totalHoras: number
}

export default function MiJornadaPage() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [jornadas, setJornadas] = useState<JornadaCompleta[]>([])
  const [jornadasActivas, setJornadasActivas] = useState<JornadaCompleta[]>([])
  const [iniciarModalOpen, setIniciarModalOpen] = useState(false)
  const [detalleModalOpen, setDetalleModalOpen] = useState(false)
  const [jornadaDetalle, setJornadaDetalle] = useState<JornadaCompleta | null>(null)
  const [reabrirJornadaId, setReabrirJornadaId] = useState<string | null>(null)
  const [eliminarJornadaId, setEliminarJornadaId] = useState<string | null>(null)
  const [reabriendo, setReabriendo] = useState<string | null>(null)
  const [eliminandoRechazada, setEliminandoRechazada] = useState<string | null>(null)

  const cargarJornadas = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/horas-hombre/jornada/mis-jornadas')

      if (!response.ok) {
        throw new Error('Error cargando jornadas')
      }

      const data = await response.json()
      const jornadasData = data.data || []

      setJornadas(jornadasData)
      const activas = jornadasData.filter((j: JornadaCompleta) => j.estado === 'iniciado')
      setJornadasActivas(activas)
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarJornadas()
  }, [])

  const handleJornadaIniciada = () => {
    cargarJornadas()
  }

  const handleJornadaCerrada = () => {
    cargarJornadas()
  }

  const handleVerDetalle = async (jornadaId: string) => {
    try {
      const response = await fetch(`/api/horas-hombre/jornada/${jornadaId}`)
      if (!response.ok) throw new Error('Error cargando detalle')
      const data = await response.json()
      setJornadaDetalle(data.data)
      setDetalleModalOpen(true)
    } catch {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'No se pudo cargar el detalle de la jornada'
      })
    }
  }

  const handleReabrir = (jornadaId: string) => {
    setReabrirJornadaId(jornadaId)
  }

  const confirmarReabrir = async () => {
    if (!reabrirJornadaId) return
    try {
      setReabriendo(reabrirJornadaId)
      const response = await fetch(`/api/horas-hombre/jornada/${reabrirJornadaId}/reabrir`, {
        method: 'PUT'
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error reabriendo jornada')
      }
      toast({ title: 'Jornada reabierta', description: 'La jornada ha sido reabierta y puedes editarla' })
      cargarJornadas()
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Error reabriendo jornada' })
    } finally {
      setReabriendo(null)
      setReabrirJornadaId(null)
    }
  }

  const handleEliminarRechazada = (jornadaId: string) => {
    setEliminarJornadaId(jornadaId)
  }

  const confirmarEliminarRechazada = async () => {
    if (!eliminarJornadaId) return
    try {
      setEliminandoRechazada(eliminarJornadaId)
      const response = await fetch(`/api/horas-hombre/jornada/${eliminarJornadaId}`, {
        method: 'DELETE'
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error eliminando jornada')
      }
      toast({ title: 'Jornada eliminada', description: 'La jornada rechazada ha sido eliminada' })
      cargarJornadas()
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: error instanceof Error ? error.message : 'Error eliminando jornada' })
    } finally {
      setEliminandoRechazada(null)
      setEliminarJornadaId(null)
    }
  }

  const formatFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    })
  }

  const getEstadoBadge = (estado: EstadoJornada) => {
    switch (estado) {
      case 'iniciado':
        return <Badge className="bg-green-100 text-green-800"><Clock className="h-3 w-3 mr-1" />En curso</Badge>
      case 'pendiente':
        return <Badge className="bg-amber-100 text-amber-800"><AlertCircle className="h-3 w-3 mr-1" />Pendiente</Badge>
      case 'aprobado':
        return <Badge className="bg-blue-100 text-blue-800"><CheckCircle className="h-3 w-3 mr-1" />Aprobado</Badge>
      case 'rechazado':
        return <Badge className="bg-red-100 text-red-800"><XCircle className="h-3 w-3 mr-1" />Rechazado</Badge>
      default:
        return <Badge variant="outline">{estado}</Badge>
    }
  }

  return (
    <div className="container mx-auto py-4 space-y-4">
      {/* Header - Estilo MI TRABAJO */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b">
        <div className="flex items-center gap-3">
          <HardHat className="h-6 w-6 text-amber-600" />
          <div>
            <h1 className="text-xl font-bold text-gray-900">Mi Jornada</h1>
            <p className="text-xs text-gray-500">Registra tus actividades y horas de trabajo en campo</p>
          </div>
        </div>
        {/* Desktop button */}
        <Button
          onClick={() => setIniciarModalOpen(true)}
          className="hidden sm:flex bg-green-600 hover:bg-green-700"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-1" />
          Nueva Jornada
        </Button>
        {/* Mobile button */}
        <Button
          onClick={() => setIniciarModalOpen(true)}
          className="sm:hidden w-full bg-green-600 hover:bg-green-700 h-12 text-base"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nueva Jornada
        </Button>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-500">Cargando jornadas...</span>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Jornadas Activas */}
          {jornadasActivas.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                {jornadasActivas.length === 1
                  ? 'Jornada en curso'
                  : `${jornadasActivas.length} jornadas en curso`}
              </div>
              <div className="space-y-2">
                {jornadasActivas.map(jornada => (
                  <JornadaActiva
                    key={jornada.id}
                    jornada={{
                      ...jornada,
                      personalPlanificado: (jornada.personalPlanificado || []) as PersonalPlanificado[]
                    }}
                    onRefresh={cargarJornadas}
                    onClosed={handleJornadaCerrada}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Lista de mis jornadas */}
          <ListaJornadas
            jornadas={jornadas}
            onVerDetalle={handleVerDetalle}
            onReabrir={handleReabrir}
            onEliminar={handleEliminarRechazada}
            reabriendo={reabriendo}
            eliminando={eliminandoRechazada}
            loading={loading}
          />
        </div>
      )}

      {/* Modal Iniciar Jornada */}
      <IniciarJornadaModal
        open={iniciarModalOpen}
        onOpenChange={setIniciarModalOpen}
        onSuccess={handleJornadaIniciada}
      />

      {/* Modal Detalle Jornada */}
      <Dialog open={detalleModalOpen} onOpenChange={setDetalleModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="h-4 w-4 sm:h-5 sm:w-5" />
              Detalle de Jornada
            </DialogTitle>
          </DialogHeader>

          {jornadaDetalle && (
            <div className="space-y-3 sm:space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-base sm:text-lg truncate">{jornadaDetalle.proyecto.codigo}</div>
                  <div className="text-xs sm:text-sm text-gray-500 truncate">{jornadaDetalle.proyecto.nombre}</div>
                  <div className="text-xs sm:text-sm text-gray-500 mt-1">
                    {formatFecha(jornadaDetalle.fechaTrabajo)}
                  </div>
                </div>
                {getEstadoBadge(jornadaDetalle.estado)}
              </div>

              <div className="grid grid-cols-3 gap-2 sm:flex sm:items-center sm:gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-1 justify-center sm:justify-start bg-blue-50 sm:bg-transparent rounded-lg py-2 sm:py-0">
                  <ListTodo className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
                  <span className="font-medium">{jornadaDetalle.cantidadTareas}</span>
                  <span className="hidden sm:inline">tareas</span>
                </div>
                <div className="flex items-center gap-1 justify-center sm:justify-start bg-green-50 sm:bg-transparent rounded-lg py-2 sm:py-0">
                  <Users className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-green-500" />
                  <span className="font-medium">{jornadaDetalle.cantidadMiembros}</span>
                  <span className="hidden sm:inline">personas</span>
                </div>
                <div className="flex items-center gap-1 justify-center sm:justify-start bg-orange-50 sm:bg-transparent rounded-lg py-2 sm:py-0">
                  <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-orange-500" />
                  <span className="font-medium">{jornadaDetalle.totalHoras}h</span>
                </div>
              </div>

              {jornadaDetalle.objetivosDia && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                    <Target className="h-3 w-3" /> Objetivos
                  </div>
                  <div className="text-xs sm:text-sm">{jornadaDetalle.objetivosDia}</div>
                </div>
              )}

              {jornadaDetalle.ubicacion && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  {jornadaDetalle.ubicacion}
                </div>
              )}

              {jornadaDetalle.avanceDia && (
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Avance del dia
                  </div>
                  <div className="text-xs sm:text-sm">{jornadaDetalle.avanceDia}</div>
                </div>
              )}

              {jornadaDetalle.bloqueos && (jornadaDetalle.bloqueos as Bloqueo[]).length > 0 && (
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-amber-700 mb-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Bloqueos
                  </div>
                  <div className="space-y-2">
                    {(jornadaDetalle.bloqueos as Bloqueo[]).map((bloqueo, index) => (
                      <div key={index} className="text-xs sm:text-sm">
                        {bloqueo.tipoBloqueoNombre && (
                          <span className="inline-block text-[10px] font-semibold text-amber-800 bg-amber-200 rounded px-1.5 py-0.5 mr-1.5 mb-0.5">
                            {bloqueo.tipoBloqueoNombre}
                          </span>
                        )}
                        <div className="font-medium">{bloqueo.descripcion}</div>
                        {bloqueo.impacto && <div className="text-amber-600">Impacto: {bloqueo.impacto}</div>}
                        {bloqueo.accion && <div className="text-amber-600">Accion: {bloqueo.accion}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {jornadaDetalle.planSiguiente && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-blue-700 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Plan siguiente
                  </div>
                  <div className="text-xs sm:text-sm">{jornadaDetalle.planSiguiente}</div>
                </div>
              )}

              {jornadaDetalle.motivoRechazo && (
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-red-700 mb-1 flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Motivo de rechazo
                  </div>
                  <div className="text-xs sm:text-sm text-red-800">{jornadaDetalle.motivoRechazo}</div>
                </div>
              )}

              {jornadaDetalle.tareas.length > 0 && (
                <div>
                  <div className="text-xs sm:text-sm font-medium text-gray-500 mb-2">Tareas registradas</div>
                  <div className="space-y-2">
                    {jornadaDetalle.tareas.map(tarea => {
                      const nombreTarea = tarea.proyectoTarea?.nombre || tarea.nombreTareaExtra || 'Sin nombre'
                      const horasTarea = tarea.miembros.reduce((s, m) => s + m.horas, 0)
                      return (
                        <div key={tarea.id} className="border rounded-lg p-2.5 sm:p-3">
                          <div className="flex items-start justify-between mb-2 gap-2">
                            <div className="font-medium text-xs sm:text-sm leading-tight">{nombreTarea}</div>
                            <Badge variant="outline" className="text-xs flex-shrink-0">{horasTarea}h</Badge>
                          </div>
                          {tarea.proyectoTarea?.proyectoActividad && (
                            <div className="text-xs text-gray-500 mb-2">
                              {tarea.proyectoTarea.proyectoActividad.nombre}
                            </div>
                          )}
                          <div className="flex flex-wrap gap-1">
                            {tarea.miembros.map(m => (
                              <Badge key={m.id} variant="secondary" className="text-xs">
                                {m.usuario.name?.split(' ')[0] || m.usuario.email.split('@')[0]} · {m.horas}h
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Confirmar Reabrir */}
      <AlertDialog open={!!reabrirJornadaId} onOpenChange={(open) => !open && setReabrirJornadaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reabrir jornada rechazada?</AlertDialogTitle>
            <AlertDialogDescription>
              La jornada volverá al estado &quot;en curso&quot; y podrás editarla.
              Las horas registradas en el cronograma serán revertidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!reabriendo}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarReabrir}
              disabled={!!reabriendo}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {reabriendo ? 'Reabriendo...' : 'Reabrir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmar Eliminar Rechazada */}
      <AlertDialog open={!!eliminarJornadaId} onOpenChange={(open) => !open && setEliminarJornadaId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar jornada rechazada?</AlertDialogTitle>
            <AlertDialogDescription>
              Se eliminará la jornada y todas sus tareas permanentemente.
              Las horas registradas en el cronograma serán revertidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={!!eliminandoRechazada}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmarEliminarRechazada}
              disabled={!!eliminandoRechazada}
              className="bg-red-600 hover:bg-red-700"
            >
              {eliminandoRechazada ? 'Eliminando...' : 'Eliminar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
