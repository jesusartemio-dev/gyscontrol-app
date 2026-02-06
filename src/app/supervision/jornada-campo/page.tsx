'use client'

/**
 * Jornada de Campo - Página principal
 *
 * Permite al supervisor:
 * - Iniciar una nueva jornada
 * - Ver y gestionar la jornada activa
 * - Ver historial de jornadas
 */

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
  Plus,
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

interface Bloqueo {
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

export default function JornadaCampoPage() {
  const { toast } = useToast()

  // Estado
  const [loading, setLoading] = useState(true)
  const [jornadas, setJornadas] = useState<JornadaCompleta[]>([])
  const [jornadasActivas, setJornadasActivas] = useState<JornadaCompleta[]>([])
  const [iniciarModalOpen, setIniciarModalOpen] = useState(false)
  const [detalleModalOpen, setDetalleModalOpen] = useState(false)
  const [jornadaDetalle, setJornadaDetalle] = useState<JornadaCompleta | null>(null)

  // Cargar jornadas
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

      // Filtrar todas las jornadas activas (estado = iniciado)
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

  const handleJornadaIniciada = (jornadaId: string) => {
    cargarJornadas()
  }

  const handleJornadaCerrada = () => {
    cargarJornadas()
  }

  const handleVerDetalle = async (jornadaId: string) => {
    try {
      const response = await fetch(`/api/horas-hombre/jornada/${jornadaId}`)
      if (!response.ok) {
        throw new Error('Error cargando detalle')
      }
      const data = await response.json()
      setJornadaDetalle(data.data)
      setDetalleModalOpen(true)
    } catch (error) {
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
      {/* Header - Mobile optimized */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Sun className="h-5 w-5 sm:h-6 sm:w-6 text-amber-500" />
            <span className="truncate">Jornada de Campo</span>
          </h1>
          {/* Desktop button */}
          <Button
            onClick={() => setIniciarModalOpen(true)}
            className="hidden sm:flex bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nueva Jornada
          </Button>
        </div>
        <p className="text-gray-600 text-sm hidden sm:block">
          Registra las actividades y horas de trabajo en campo
        </p>
        {/* Mobile button - full width */}
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

          {/* Lista de todas las jornadas */}
          <ListaJornadas
            jornadas={jornadas}
            onVerDetalle={handleVerDetalle}
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

      {/* Modal Detalle Jornada - Mobile optimized */}
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
              {/* Info general */}
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

              {/* Estadísticas - Mobile grid */}
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

              {/* Objetivos */}
              {jornadaDetalle.objetivosDia && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                    <Target className="h-3 w-3" /> Objetivos
                  </div>
                  <div className="text-xs sm:text-sm">{jornadaDetalle.objetivosDia}</div>
                </div>
              )}

              {/* Ubicación */}
              {jornadaDetalle.ubicacion && (
                <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-600">
                  <MapPin className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  {jornadaDetalle.ubicacion}
                </div>
              )}

              {/* Avance del día */}
              {jornadaDetalle.avanceDia && (
                <div className="bg-green-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" /> Avance del día
                  </div>
                  <div className="text-xs sm:text-sm">{jornadaDetalle.avanceDia}</div>
                </div>
              )}

              {/* Bloqueos */}
              {jornadaDetalle.bloqueos && (jornadaDetalle.bloqueos as Bloqueo[]).length > 0 && (
                <div className="bg-amber-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-amber-700 mb-2 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Bloqueos
                  </div>
                  <div className="space-y-2">
                    {(jornadaDetalle.bloqueos as Bloqueo[]).map((bloqueo, index) => (
                      <div key={index} className="text-xs sm:text-sm">
                        <div className="font-medium">{bloqueo.descripcion}</div>
                        {bloqueo.impacto && (
                          <div className="text-amber-600">Impacto: {bloqueo.impacto}</div>
                        )}
                        {bloqueo.accion && (
                          <div className="text-amber-600">Acción: {bloqueo.accion}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Plan siguiente */}
              {jornadaDetalle.planSiguiente && (
                <div className="bg-blue-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-blue-700 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Plan siguiente
                  </div>
                  <div className="text-xs sm:text-sm">{jornadaDetalle.planSiguiente}</div>
                </div>
              )}

              {/* Motivo de rechazo */}
              {jornadaDetalle.motivoRechazo && (
                <div className="bg-red-50 rounded-lg p-3">
                  <div className="text-xs font-medium text-red-700 mb-1 flex items-center gap-1">
                    <XCircle className="h-3 w-3" /> Motivo de rechazo
                  </div>
                  <div className="text-xs sm:text-sm text-red-800">{jornadaDetalle.motivoRechazo}</div>
                </div>
              )}

              {/* Tareas */}
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
