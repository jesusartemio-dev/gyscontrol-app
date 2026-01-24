'use client'

import React, { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from '@/components/ui/dialog'
import {
  CheckSquare,
  Clock,
  AlertTriangle,
  TrendingUp,
  Calendar,
  Plus,
  RefreshCw,
  Eye,
  X,
  AlertCircle
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import Link from 'next/link'

interface TareaAsignada {
  id: string
  nombre: string
  descripcion?: string
  tipo: 'proyecto_tarea' | 'tarea'
  proyectoId: string
  proyectoNombre: string
  edtNombre: string
  responsableId?: string
  responsableNombre?: string
  fechaInicio: Date
  fechaFin: Date
  horasPlan: number
  horasReales: number
  progreso: number
  estado: string
  prioridad: 'baja' | 'media' | 'alta' | 'critica'
  diasRestantes: number
}

interface Metricas {
  totalTareas: number
  tareasActivas: number
  tareasCompletadas: number
  tareasProximasVencer: number
  tareasVencidas: number
  horasRegistradas: number
}

interface TareasAsignadasDashboardProps {
  tareas?: TareaAsignada[]
  metricas?: Metricas | null
  loading?: boolean
  onMarcarCompletada?: (tareaId: string, tipo: string) => void
  onRecargar?: () => void
}

export function TareasAsignadasDashboard({
  tareas = [],
  metricas = null,
  loading = false,
  onMarcarCompletada,
  onRecargar
}: TareasAsignadasDashboardProps) {
  const [filtroPrioridad, setFiltroPrioridad] = useState<string>('todas')
  const [filtroEstado, setFiltroEstado] = useState<string>('activas')
  const [tareaSeleccionada, setTareaSeleccionada] = useState<TareaAsignada | null>(null)

  // Filtrar tareas por estado
  const tareasPorEstado = filtroEstado === 'activas'
    ? tareas.filter(t => t.estado === 'en_progreso' || t.estado === 'pendiente')
    : filtroEstado === 'completadas'
      ? tareas.filter(t => t.estado === 'completada')
      : tareas

  // Filtrar tareas por prioridad
  const tareasFiltradas = filtroPrioridad === 'todas'
    ? tareasPorEstado
    : tareasPorEstado.filter(t => t.prioridad === filtroPrioridad)

  const getColorPrioridad = (prioridad: string) => {
    switch (prioridad) {
      case 'critica': return 'text-red-600 bg-red-100'
      case 'alta': return 'text-orange-600 bg-orange-100'
      case 'media': return 'text-yellow-600 bg-yellow-100'
      case 'baja': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'completada': return <Badge className="bg-green-100 text-green-800">Completada</Badge>
      case 'en_progreso': return <Badge className="bg-blue-100 text-blue-800">En Progreso</Badge>
      case 'pendiente': return <Badge variant="secondary">Pendiente</Badge>
      case 'pausada': return <Badge className="bg-yellow-100 text-yellow-800">Pausada</Badge>
      case 'cancelada': return <Badge className="bg-gray-100 text-gray-800">Cancelada</Badge>
      default: return <Badge variant="outline">{estado}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="animate-pulse">
                  <div className="h-8 w-8 bg-gray-300 rounded mb-2"></div>
                  <div className="h-6 w-12 bg-gray-300 rounded mb-1"></div>
                  <div className="h-4 w-20 bg-gray-300 rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckSquare className="h-8 w-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{metricas?.tareasActivas || 0}</p>
                <p className="text-sm text-gray-600">Tareas Activas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{metricas?.tareasCompletadas || 0}</p>
                <p className="text-sm text-gray-600">Completadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-8 w-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{metricas?.tareasProximasVencer || 0}</p>
                <p className="text-sm text-gray-600">Proximas a Vencer</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-2xl font-bold">{metricas?.tareasVencidas || 0}</p>
                <p className="text-sm text-gray-600">Vencidas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">
                  {metricas?.horasRegistradas || 0}h
                </p>
                <p className="text-sm text-gray-600">Horas Registradas</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">Estado:</span>
              <div className="flex gap-2">
                {[
                  { key: 'activas', label: 'Activas' },
                  { key: 'completadas', label: 'Completadas' },
                  { key: 'todas', label: 'Todas' }
                ].map(({ key, label }) => (
                  <Button
                    key={key}
                    variant={filtroEstado === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroEstado(key)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">Prioridad:</span>
              <div className="flex gap-2">
                {[
                  { key: 'todas', label: 'Todas', color: 'bg-gray-100' },
                  { key: 'critica', label: 'Critica', color: 'bg-red-100' },
                  { key: 'alta', label: 'Alta', color: 'bg-orange-100' },
                  { key: 'media', label: 'Media', color: 'bg-yellow-100' },
                  { key: 'baja', label: 'Baja', color: 'bg-green-100' }
                ].map(({ key, label, color }) => (
                  <Button
                    key={key}
                    variant={filtroPrioridad === key ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFiltroPrioridad(key)}
                    className={filtroPrioridad === key ? '' : color}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {onRecargar && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRecargar}
                className="ml-auto"
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Actualizar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Lista de tareas */}
      <div className="space-y-4">
        {tareasFiltradas.map((tarea) => (
          <Card key={tarea.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold">{tarea.nombre}</h3>
                    <Badge className={getColorPrioridad(tarea.prioridad)}>
                      {tarea.prioridad.toUpperCase()}
                    </Badge>
                    {getEstadoBadge(tarea.estado)}
                    {tarea.diasRestantes < 0 && tarea.estado !== 'completada' && (
                      <Badge className="bg-red-600 text-white">VENCIDA</Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckSquare className="h-4 w-4" />
                      <span className="truncate" title={tarea.proyectoNombre}>
                        {tarea.proyectoNombre}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="font-medium">EDT:</span>
                      <span>{tarea.edtNombre}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>
                        Vence: {format(new Date(tarea.fechaFin), 'dd/MM/yyyy', { locale: es })}
                        {tarea.diasRestantes >= 0 && tarea.estado !== 'completada' && (
                          <span className={`ml-2 ${tarea.diasRestantes <= 3 ? 'text-red-600 font-medium' : ''}`}>
                            ({tarea.diasRestantes} dias)
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Clock className="h-4 w-4" />
                      <span>
                        {tarea.horasPlan}h plan / {tarea.horasReales}h real
                      </span>
                    </div>
                  </div>

                  {/* Barra de progreso */}
                  <div className="mb-4">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Progreso</span>
                      <span>{tarea.progreso}%</span>
                    </div>
                    <Progress value={tarea.progreso} className="h-2" />
                  </div>

                  {/* Acciones */}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setTareaSeleccionada(tarea)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Ver Detalles
                    </Button>
                    <Link href="/mi-trabajo/timesheet">
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1" />
                        Registrar Horas
                      </Button>
                    </Link>
                    {tarea.progreso < 100 && tarea.estado !== 'completada' && onMarcarCompletada && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onMarcarCompletada(tarea.id, tarea.tipo)}
                      >
                        <CheckSquare className="h-4 w-4 mr-1" />
                        Marcar Completada
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {tareasFiltradas.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No hay tareas
              </h3>
              <p className="text-gray-600">
                {tareas.length === 0
                  ? 'Actualmente no tienes tareas asignadas.'
                  : 'No hay tareas con los filtros seleccionados.'}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal de detalles */}
      <Dialog open={!!tareaSeleccionada} onOpenChange={() => setTareaSeleccionada(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {tareaSeleccionada?.nombre}
              {tareaSeleccionada && (
                <Badge className={getColorPrioridad(tareaSeleccionada.prioridad)}>
                  {tareaSeleccionada.prioridad.toUpperCase()}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Detalles de la tarea asignada
            </DialogDescription>
          </DialogHeader>

          {tareaSeleccionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Proyecto</p>
                  <p className="text-sm">{tareaSeleccionada.proyectoNombre}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">EDT</p>
                  <p className="text-sm">{tareaSeleccionada.edtNombre}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Estado</p>
                  {getEstadoBadge(tareaSeleccionada.estado)}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Tipo</p>
                  <p className="text-sm capitalize">{tareaSeleccionada.tipo.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Fecha Inicio</p>
                  <p className="text-sm">
                    {format(new Date(tareaSeleccionada.fechaInicio), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Fecha Fin</p>
                  <p className="text-sm">
                    {format(new Date(tareaSeleccionada.fechaFin), 'dd/MM/yyyy', { locale: es })}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Horas Planificadas</p>
                  <p className="text-lg font-semibold">{tareaSeleccionada.horasPlan}h</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Horas Reales</p>
                  <p className="text-lg font-semibold">{tareaSeleccionada.horasReales}h</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Dias Restantes</p>
                  <p className={`text-lg font-semibold ${tareaSeleccionada.diasRestantes < 0 ? 'text-red-600' : tareaSeleccionada.diasRestantes <= 3 ? 'text-orange-600' : 'text-green-600'}`}>
                    {tareaSeleccionada.diasRestantes}
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Progreso</p>
                <div className="flex items-center gap-2">
                  <Progress value={tareaSeleccionada.progreso} className="h-3 flex-1" />
                  <span className="text-sm font-medium">{tareaSeleccionada.progreso}%</span>
                </div>
              </div>

              {tareaSeleccionada.descripcion && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Descripcion</p>
                  <p className="text-sm mt-1">{tareaSeleccionada.descripcion}</p>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setTareaSeleccionada(null)}>
                  <X className="h-4 w-4 mr-1" />
                  Cerrar
                </Button>
                <Link href="/mi-trabajo/timesheet">
                  <Button>
                    <Plus className="h-4 w-4 mr-1" />
                    Registrar Horas
                  </Button>
                </Link>
                {tareaSeleccionada.estado !== 'completada' && onMarcarCompletada && (
                  <Button
                    variant="default"
                    onClick={() => {
                      onMarcarCompletada(tareaSeleccionada.id, tareaSeleccionada.tipo)
                      setTareaSeleccionada(null)
                    }}
                  >
                    <CheckSquare className="h-4 w-4 mr-1" />
                    Completar
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
