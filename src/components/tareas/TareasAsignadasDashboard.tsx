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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table'
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
  AlertCircle,
  Edit2,
  Check,
  LayoutGrid,
  List,
  Zap
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
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
  const [filtroProyecto, setFiltroProyecto] = useState<string>('todos')
  const [tareaSeleccionada, setTareaSeleccionada] = useState<TareaAsignada | null>(null)
  const [vistaActual, setVistaActual] = useState<'tabla' | 'card'>('tabla')

  // Estados para edición de progreso y estado
  const [editandoProgreso, setEditandoProgreso] = useState<string | null>(null)
  const [nuevoProgreso, setNuevoProgreso] = useState<number>(0)
  const [actualizando, setActualizando] = useState(false)
  const [actualizandoEstado, setActualizandoEstado] = useState<string | null>(null)
  const { toast } = useToast()

  // Calcular eficiencia (solo cuando la tarea está completada)
  const calcularEficiencia = (horasPlan: number, horasReales: number, estado: string): number | null => {
    if (estado !== 'completada') return null
    if (horasPlan <= 0 || horasReales <= 0) return null
    return Math.round((horasPlan / horasReales) * 100)
  }

  // Actualizar progreso de tarea
  const actualizarProgreso = async (tarea: TareaAsignada, progreso: number) => {
    try {
      setActualizando(true)
      const response = await fetch('/api/tareas/mis-asignadas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tareaId: tarea.id,
          tipo: tarea.tipo,
          progreso
        })
      })

      if (!response.ok) throw new Error('Error al actualizar')

      toast({ title: 'Progreso actualizado', description: `${progreso}%` })
      setEditandoProgreso(null)
      onRecargar?.()
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el progreso', variant: 'destructive' })
    } finally {
      setActualizando(false)
    }
  }

  // Actualizar estado de tarea
  const actualizarEstado = async (tarea: TareaAsignada, nuevoEstado: string) => {
    try {
      setActualizandoEstado(tarea.id)
      const response = await fetch('/api/tareas/mis-asignadas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tareaId: tarea.id,
          tipo: tarea.tipo,
          estado: nuevoEstado
        })
      })

      if (!response.ok) throw new Error('Error al actualizar')

      const estadoTexto = {
        pendiente: 'Pendiente',
        en_progreso: 'En Progreso',
        completada: 'Completada',
        pausada: 'Pausada'
      }[nuevoEstado] || nuevoEstado

      toast({ title: 'Estado actualizado', description: estadoTexto })
      onRecargar?.()
    } catch {
      toast({ title: 'Error', description: 'No se pudo actualizar el estado', variant: 'destructive' })
    } finally {
      setActualizandoEstado(null)
    }
  }

  // Obtener color del estado
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'completada': return 'bg-green-100 text-green-800'
      case 'en_progreso': return 'bg-blue-100 text-blue-800'
      case 'pendiente': return 'bg-gray-100 text-gray-800'
      case 'pausada': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  // Obtener proyectos únicos para el filtro
  const proyectosUnicos = Array.from(
    new Map(tareas.map(t => [t.proyectoId, { id: t.proyectoId, nombre: t.proyectoNombre }])).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre))

  // Filtrar tareas
  const tareasPorEstado = filtroEstado === 'activas'
    ? tareas.filter(t => t.estado === 'en_progreso' || t.estado === 'pendiente')
    : filtroEstado === 'completadas'
      ? tareas.filter(t => t.estado === 'completada')
      : tareas

  const tareasPorProyecto = filtroProyecto === 'todos'
    ? tareasPorEstado
    : tareasPorEstado.filter(t => t.proyectoId === filtroProyecto)

  const tareasFiltradas = filtroPrioridad === 'todas'
    ? tareasPorProyecto
    : tareasPorProyecto.filter(t => t.prioridad === filtroPrioridad)

  const getColorPrioridad = (prioridad: string) => {
    switch (prioridad) {
      case 'critica': return 'text-red-600 bg-red-100'
      case 'alta': return 'text-orange-600 bg-orange-100'
      case 'media': return 'text-yellow-600 bg-yellow-100'
      case 'baja': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getPrioridadBadgeClass = (prioridad: string) => {
    switch (prioridad) {
      case 'critica': return 'bg-red-500 text-white'
      case 'alta': return 'bg-orange-500 text-white'
      case 'media': return 'bg-yellow-500 text-white'
      case 'baja': return 'bg-green-500 text-white'
      default: return 'bg-gray-500 text-white'
    }
  }

  // Dias restantes con color
  const getDiasInfo = (diasRestantes: number, estado: string) => {
    if (estado === 'completada') return { texto: '-', color: 'text-gray-400' }
    if (diasRestantes < 0) return { texto: `${Math.abs(diasRestantes)}d vencida`, color: 'text-red-600 font-medium' }
    if (diasRestantes === 0) return { texto: 'Hoy', color: 'text-orange-600 font-medium' }
    if (diasRestantes <= 3) return { texto: `${diasRestantes}d`, color: 'text-orange-500' }
    if (diasRestantes <= 7) return { texto: `${diasRestantes}d`, color: 'text-yellow-600' }
    return { texto: `${diasRestantes}d`, color: 'text-gray-600' }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
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
      {/* Resumen compacto */}
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-gray-500 font-medium">Resumen:</span>
        <Badge variant="outline" className="font-normal text-blue-600 border-blue-200 bg-blue-50">
          <CheckSquare className="h-3 w-3 mr-1" />
          {metricas?.tareasActivas || 0} activas
        </Badge>
        <Badge variant="outline" className="font-normal text-green-600 border-green-200 bg-green-50">
          <TrendingUp className="h-3 w-3 mr-1" />
          {metricas?.tareasCompletadas || 0} completadas
        </Badge>
        <Badge variant="outline" className="font-normal text-orange-600 border-orange-200 bg-orange-50">
          <AlertTriangle className="h-3 w-3 mr-1" />
          {metricas?.tareasProximasVencer || 0} por vencer
        </Badge>
        {(metricas?.tareasVencidas || 0) > 0 && (
          <Badge variant="outline" className="font-normal text-red-600 border-red-200 bg-red-50">
            <AlertCircle className="h-3 w-3 mr-1" />
            {metricas?.tareasVencidas} vencidas
          </Badge>
        )}
        <Badge variant="outline" className="font-normal text-purple-600 border-purple-200 bg-purple-50">
          <Clock className="h-3 w-3 mr-1" />
          {metricas?.horasRegistradas || 0}h registradas
        </Badge>
      </div>

      {/* Filtros y controles */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Toggle vista */}
        <div className="flex items-center border rounded-lg p-1 bg-gray-50">
          <Button
            variant={vistaActual === 'tabla' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setVistaActual('tabla')}
            className="h-8 px-3"
          >
            <List className="h-4 w-4 mr-1" />
            Tabla
          </Button>
          <Button
            variant={vistaActual === 'card' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setVistaActual('card')}
            className="h-8 px-3"
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            Cards
          </Button>
        </div>

        <div className="h-6 w-px bg-gray-200" />

        {/* Filtro estado */}
        <div className="flex items-center gap-1">
          {[
            { key: 'activas', label: 'Activas' },
            { key: 'completadas', label: 'Completadas' },
            { key: 'todas', label: 'Todas' }
          ].map(({ key, label }) => (
            <Button
              key={key}
              variant={filtroEstado === key ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setFiltroEstado(key)}
              className="h-8"
            >
              {label}
            </Button>
          ))}
        </div>

        <div className="h-6 w-px bg-gray-200" />

        {/* Filtro proyecto */}
        <Select value={filtroProyecto} onValueChange={setFiltroProyecto}>
          <SelectTrigger className="h-8 w-[160px]">
            <SelectValue placeholder="Proyecto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los proyectos</SelectItem>
            {proyectosUnicos.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.nombre.split(' - ')[0]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Filtro prioridad */}
        <Select value={filtroPrioridad} onValueChange={setFiltroPrioridad}>
          <SelectTrigger className="h-8 w-[120px]">
            <SelectValue placeholder="Prioridad" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todas">Todas</SelectItem>
            <SelectItem value="critica">Crítica</SelectItem>
            <SelectItem value="alta">Alta</SelectItem>
            <SelectItem value="media">Media</SelectItem>
            <SelectItem value="baja">Baja</SelectItem>
          </SelectContent>
        </Select>

        {onRecargar && (
          <Button variant="outline" size="sm" onClick={onRecargar} className="h-8 ml-auto">
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Vista Tabla */}
      {vistaActual === 'tabla' && (
        <Card>
          <CardContent className="p-0">
            {tareasFiltradas.length === 0 ? (
              <div className="p-8 text-center">
                <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay tareas</h3>
                <p className="text-gray-600">
                  {tareas.length === 0 ? 'Actualmente no tienes tareas asignadas.' : 'No hay tareas con los filtros seleccionados.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50">
                      <TableHead className="font-semibold">Tarea</TableHead>
                      <TableHead className="font-semibold">Proyecto</TableHead>
                      <TableHead className="font-semibold">Estado</TableHead>
                      <TableHead className="font-semibold">Prioridad</TableHead>
                      <TableHead className="font-semibold">Vencimiento</TableHead>
                      <TableHead className="font-semibold">Horas</TableHead>
                      <TableHead className="font-semibold">Eficiencia</TableHead>
                      <TableHead className="font-semibold">Progreso</TableHead>
                      <TableHead className="font-semibold text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tareasFiltradas.map((tarea) => {
                      const diasInfo = getDiasInfo(tarea.diasRestantes, tarea.estado)
                      const eficiencia = calcularEficiencia(tarea.horasPlan, tarea.horasReales, tarea.estado)
                      return (
                        <TableRow key={tarea.id} className="hover:bg-gray-50">
                          <TableCell>
                            <div className="max-w-[250px]">
                              <p className="font-medium text-sm truncate" title={tarea.nombre}>{tarea.nombre}</p>
                              <p className="text-xs text-gray-500 truncate">{tarea.edtNombre}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="text-sm truncate max-w-[150px]" title={tarea.proyectoNombre}>
                              {tarea.proyectoNombre.split(' - ')[0]}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Select
                              value={tarea.estado}
                              onValueChange={(v) => actualizarEstado(tarea, v)}
                              disabled={actualizandoEstado === tarea.id}
                            >
                              <SelectTrigger className={`h-7 w-[110px] text-xs font-medium ${getEstadoColor(tarea.estado)}`}>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pendiente">Pendiente</SelectItem>
                                <SelectItem value="en_progreso">En Progreso</SelectItem>
                                <SelectItem value="completada">Completada</SelectItem>
                                <SelectItem value="pausada">Pausada</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] ${getPrioridadBadgeClass(tarea.prioridad)}`}>
                              {tarea.prioridad.toUpperCase()}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <p>{format(new Date(tarea.fechaFin), 'dd/MM/yy')}</p>
                              <p className={`text-xs ${diasInfo.color}`}>{diasInfo.texto}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <span className={tarea.horasReales > 0 ? 'font-medium' : 'text-gray-400'}>
                                {tarea.horasReales}h
                              </span>
                              <span className="text-gray-400">/{tarea.horasPlan}h</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {eficiencia === null ? (
                              <span className="text-gray-300 text-xs">-</span>
                            ) : (
                              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                                eficiencia >= 100 ? 'text-green-600 bg-green-50' :
                                eficiencia >= 80 ? 'text-yellow-600 bg-yellow-50' :
                                'text-red-600 bg-red-50'
                              }`}>
                                {eficiencia}%
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {editandoProgreso === tarea.id ? (
                              <div className="flex items-center gap-1">
                                <Input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={nuevoProgreso}
                                  onChange={(e) => setNuevoProgreso(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                                  className="h-6 w-14 text-xs px-1"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') actualizarProgreso(tarea, nuevoProgreso)
                                    if (e.key === 'Escape') setEditandoProgreso(null)
                                  }}
                                />
                                <button onClick={() => actualizarProgreso(tarea, nuevoProgreso)} disabled={actualizando} className="p-0.5 hover:bg-green-100 rounded">
                                  <Check className="h-3.5 w-3.5 text-green-600" />
                                </button>
                                <button onClick={() => setEditandoProgreso(null)} className="p-0.5 hover:bg-gray-100 rounded">
                                  <X className="h-3.5 w-3.5 text-gray-500" />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => { setEditandoProgreso(tarea.id); setNuevoProgreso(tarea.progreso) }}
                                className="flex items-center gap-1 hover:bg-gray-100 rounded px-1 group"
                                title="Click para editar"
                              >
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${tarea.progreso === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
                                    style={{ width: `${tarea.progreso}%` }}
                                  />
                                </div>
                                <span className="text-xs w-8">{tarea.progreso}%</span>
                                <Edit2 className="h-3 w-3 text-gray-400 opacity-0 group-hover:opacity-100" />
                              </button>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => setTareaSeleccionada(tarea)} className="h-7 px-2">
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              <Link href="/mi-trabajo/timesheet">
                                <Button variant="ghost" size="sm" className="h-7 px-2">
                                  <Plus className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Vista Cards */}
      {vistaActual === 'card' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {tareasFiltradas.length === 0 ? (
            <Card className="col-span-full">
              <CardContent className="p-8 text-center">
                <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay tareas</h3>
                <p className="text-gray-600">
                  {tareas.length === 0 ? 'Actualmente no tienes tareas asignadas.' : 'No hay tareas con los filtros seleccionados.'}
                </p>
              </CardContent>
            </Card>
          ) : (
            tareasFiltradas.map((tarea) => {
              const diasInfo = getDiasInfo(tarea.diasRestantes, tarea.estado)
              const eficiencia = calcularEficiencia(tarea.horasPlan, tarea.horasReales, tarea.estado)
              return (
                <Card key={tarea.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate" title={tarea.nombre}>{tarea.nombre}</h3>
                        <p className="text-xs text-gray-500 truncate">{tarea.proyectoNombre.split(' - ')[0]}</p>
                      </div>
                      <Badge className={`text-[10px] shrink-0 ${getPrioridadBadgeClass(tarea.prioridad)}`}>
                        {tarea.prioridad.charAt(0).toUpperCase()}
                      </Badge>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="flex items-center gap-1 text-gray-600">
                        <Zap className="h-3 w-3" />
                        <span className="truncate">{tarea.edtNombre}</span>
                      </div>
                      <div className={`flex items-center gap-1 ${diasInfo.color}`}>
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(tarea.fechaFin), 'dd/MM')} ({diasInfo.texto})</span>
                      </div>
                      <div className="flex items-center gap-1 text-gray-600">
                        <Clock className="h-3 w-3" />
                        <span>{tarea.horasReales}h / {tarea.horasPlan}h</span>
                      </div>
                      {eficiencia !== null && (
                        <div className={`flex items-center gap-1 ${
                          eficiencia >= 100 ? 'text-green-600' : eficiencia >= 80 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          <TrendingUp className="h-3 w-3" />
                          <span>{eficiencia}% efic.</span>
                        </div>
                      )}
                    </div>

                    {/* Estado */}
                    <div className="mb-3">
                      <Select
                        value={tarea.estado}
                        onValueChange={(v) => actualizarEstado(tarea, v)}
                        disabled={actualizandoEstado === tarea.id}
                      >
                        <SelectTrigger className={`h-7 w-full text-xs font-medium ${getEstadoColor(tarea.estado)}`}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="en_progreso">En Progreso</SelectItem>
                          <SelectItem value="completada">Completada</SelectItem>
                          <SelectItem value="pausada">Pausada</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Progreso */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-500">Progreso</span>
                        {editandoProgreso === tarea.id ? (
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              value={nuevoProgreso}
                              onChange={(e) => setNuevoProgreso(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                              className="h-5 w-12 text-xs px-1"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') actualizarProgreso(tarea, nuevoProgreso)
                                if (e.key === 'Escape') setEditandoProgreso(null)
                              }}
                            />
                            <button onClick={() => actualizarProgreso(tarea, nuevoProgreso)} disabled={actualizando} className="p-0.5 hover:bg-green-100 rounded">
                              <Check className="h-3 w-3 text-green-600" />
                            </button>
                            <button onClick={() => setEditandoProgreso(null)} className="p-0.5 hover:bg-gray-100 rounded">
                              <X className="h-3 w-3 text-gray-500" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => { setEditandoProgreso(tarea.id); setNuevoProgreso(tarea.progreso) }}
                            className="flex items-center gap-1 hover:bg-gray-100 rounded px-1"
                          >
                            <span>{tarea.progreso}%</span>
                            <Edit2 className="h-3 w-3 text-gray-400" />
                          </button>
                        )}
                      </div>
                      <Progress value={tarea.progreso} className="h-1.5" />
                    </div>

                    {/* Vencida badge */}
                    {tarea.diasRestantes < 0 && tarea.estado !== 'completada' && (
                      <Badge className="bg-red-600 text-white text-[10px] w-full justify-center mb-3">VENCIDA</Badge>
                    )}

                    {/* Acciones */}
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => setTareaSeleccionada(tarea)} className="flex-1 h-8 text-xs">
                        <Eye className="h-3 w-3 mr-1" />
                        Detalles
                      </Button>
                      <Link href="/mi-trabajo/timesheet" className="flex-1">
                        <Button size="sm" className="w-full h-8 text-xs">
                          <Plus className="h-3 w-3 mr-1" />
                          Horas
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

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
            <DialogDescription>Detalles de la tarea asignada</DialogDescription>
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
                  <Select
                    value={tareaSeleccionada.estado}
                    onValueChange={(v) => {
                      actualizarEstado(tareaSeleccionada, v)
                      setTareaSeleccionada({ ...tareaSeleccionada, estado: v })
                    }}
                    disabled={actualizandoEstado === tareaSeleccionada.id}
                  >
                    <SelectTrigger className={`h-8 w-[130px] text-xs font-medium mt-1 ${getEstadoColor(tareaSeleccionada.estado)}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="en_progreso">En Progreso</SelectItem>
                      <SelectItem value="completada">Completada</SelectItem>
                      <SelectItem value="pausada">Pausada</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Tipo</p>
                  <p className="text-sm capitalize">{tareaSeleccionada.tipo.replace('_', ' ')}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Fecha Inicio</p>
                  <p className="text-sm">{format(new Date(tareaSeleccionada.fechaInicio), 'dd/MM/yyyy', { locale: es })}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Fecha Fin</p>
                  <p className="text-sm">{format(new Date(tareaSeleccionada.fechaFin), 'dd/MM/yyyy', { locale: es })}</p>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Horas Plan</p>
                  <p className="text-lg font-semibold">{tareaSeleccionada.horasPlan}h</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Horas Reales</p>
                  <p className="text-lg font-semibold">{tareaSeleccionada.horasReales}h</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Eficiencia</p>
                  {(() => {
                    const eficiencia = calcularEficiencia(tareaSeleccionada.horasPlan, tareaSeleccionada.horasReales, tareaSeleccionada.estado)
                    if (eficiencia === null) return <p className="text-lg font-semibold text-gray-400">-</p>
                    const color = eficiencia >= 100 ? 'text-green-600' : eficiencia >= 80 ? 'text-yellow-600' : 'text-red-600'
                    return <p className={`text-lg font-semibold ${color}`}>{eficiencia}%</p>
                  })()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Días Restantes</p>
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
                  <p className="text-sm font-medium text-gray-500">Descripción</p>
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
