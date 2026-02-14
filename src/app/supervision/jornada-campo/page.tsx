'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Sun,
  Loader2,
  Calendar,
  Clock,
  Users,
  ListTodo,
  Target,
  MapPin,
  CheckCircle,
  XCircle,
  AlertCircle,
  UserCircle
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Badge } from '@/components/ui/badge'
import { ListaJornadas } from '@/components/horas-hombre/jornada'

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
  supervisor?: Usuario | null
  aprobadoPor?: Usuario | null
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

export default function JornadaCampoSupervisionPage() {
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [jornadas, setJornadas] = useState<JornadaCompleta[]>([])
  const [detalleModalOpen, setDetalleModalOpen] = useState(false)
  const [jornadaDetalle, setJornadaDetalle] = useState<JornadaCompleta | null>(null)
  const [aprobando, setAprobando] = useState<string | null>(null)
  const [rechazarModalOpen, setRechazarModalOpen] = useState(false)
  const [jornadaRechazar, setJornadaRechazar] = useState<string | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [procesandoRechazo, setProcesandoRechazo] = useState(false)

  const cargarJornadas = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/horas-hombre/jornada/todas')

      if (!response.ok) {
        throw new Error('Error cargando jornadas')
      }

      const data = await response.json()
      setJornadas(data.data || [])
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    cargarJornadas()
  }, [])

  const handleAprobar = async (jornadaId: string) => {
    try {
      setAprobando(jornadaId)
      const response = await fetch(`/api/horas-hombre/campo/${jornadaId}/aprobar`, {
        method: 'PUT'
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al aprobar')
      }
      toast({
        title: 'Jornada aprobada',
        description: 'La jornada fue aprobada exitosamente'
      })
      cargarJornadas()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo aprobar la jornada'
      })
    } finally {
      setAprobando(null)
    }
  }

  const handleRechazar = (jornadaId: string) => {
    setJornadaRechazar(jornadaId)
    setMotivoRechazo('')
    setRechazarModalOpen(true)
  }

  const confirmarRechazo = async () => {
    if (!jornadaRechazar || motivoRechazo.length < 10) return
    try {
      setProcesandoRechazo(true)
      const response = await fetch(`/api/horas-hombre/campo/${jornadaRechazar}/rechazar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivoRechazo })
      })
      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al rechazar')
      }
      toast({
        title: 'Jornada rechazada',
        description: 'La jornada fue rechazada'
      })
      setRechazarModalOpen(false)
      cargarJornadas()
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo rechazar la jornada'
      })
    } finally {
      setProcesandoRechazo(false)
    }
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
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-1">
        <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
          <Sun className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
          <span className="truncate">Jornadas de Campo</span>
        </h1>
        <p className="text-gray-600 text-sm">
          Vista general de todas las jornadas registradas
        </p>
      </div>

      {loading ? (
        <Card>
          <CardContent className="py-12 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400 mr-2" />
            <span className="text-gray-500">Cargando jornadas...</span>
          </CardContent>
        </Card>
      ) : (
        <ListaJornadas
          jornadas={jornadas}
          onVerDetalle={handleVerDetalle}
          onAprobar={handleAprobar}
          onRechazar={handleRechazar}
          aprobando={aprobando}
          loading={loading}
          showSupervisor={true}
          title="Todas las Jornadas"
        />
      )}

      {/* Modal Rechazar Jornada */}
      <Dialog open={rechazarModalOpen} onOpenChange={setRechazarModalOpen}>
        <DialogContent className="max-w-md p-4 sm:p-6">
          <DialogHeader className="pb-2">
            <DialogTitle className="flex items-center gap-2 text-base text-red-700">
              <XCircle className="h-5 w-5" />
              Rechazar Jornada
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Indica el motivo del rechazo para que el supervisor pueda corregir la jornada.
            </p>
            <Textarea
              placeholder="Escribe el motivo del rechazo (min. 10 caracteres)..."
              value={motivoRechazo}
              onChange={e => setMotivoRechazo(e.target.value)}
              rows={3}
              className="resize-none"
            />
            <div className="flex items-center justify-between">
              <span className={`text-xs ${motivoRechazo.length >= 10 ? 'text-green-600' : 'text-gray-400'}`}>
                {motivoRechazo.length}/10 caracteres min.
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRechazarModalOpen(false)}
                  disabled={procesandoRechazo}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="bg-red-600 hover:bg-red-700"
                  onClick={confirmarRechazo}
                  disabled={motivoRechazo.length < 10 || procesandoRechazo}
                >
                  {procesandoRechazo ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      Rechazando...
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-1" />
                      Rechazar
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

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

              {/* Creado por */}
              {jornadaDetalle.supervisor && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                  <UserCircle className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span>Creado por: <span className="font-medium">{jornadaDetalle.supervisor.name || jornadaDetalle.supervisor.email}</span></span>
                </div>
              )}

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
    </div>
  )
}
