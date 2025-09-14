// ===================================================
// 📁 Archivo: GanttChart.tsx
// 📌 Ubicación: src/components/proyectos/
// 🔧 Descripción: Componente Gantt Chart para visualización de cronograma
//    Funciones: Timeline, dependencias, ruta crítica, zoom, filtros
//
// 🧠 Funcionalidades:
//    - Visualización de cronograma tipo Gantt
//    - Barras de progreso por tarea/subtarea
//    - Líneas de dependencias
//    - Ruta crítica destacada
//    - Zoom y navegación temporal
//    - Filtros por estado, prioridad, asignado
//    - Tooltips informativos
//    - Responsive design
//
// ✍️ Autor: Sistema GYS - Módulo Tareas
// 📅 Creado: 2025-01-13
// ===================================================

'use client'

import React, { useState, useEffect, useMemo, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Calendar,
  ZoomIn,
  ZoomOut,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  User as UserIcon,
  AlertTriangle,
  CheckCircle,
  Circle,
  MoreHorizontal
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'

import type { GanttChartPayload, GanttTaskPayload, GanttDependency } from '@/types/payloads'
import { getGanttData } from '@/lib/services/gantt'

// 📋 Props del componente
interface GanttChartProps {
  proyectoServicioId: string
  height?: number
  className?: string
  onTaskClick?: (task: GanttTaskPayload) => void
  onDependencyClick?: (dependency: GanttDependency) => void
}

// 🔧 Tipos para configuración
type ViewMode = 'days' | 'weeks' | 'months'
type FilterState = {
  estado?: string
  prioridad?: string
  asignadoId?: string
  soloRutaCritica?: boolean
}

const GanttChart: React.FC<GanttChartProps> = ({
  proyectoServicioId,
  height = 600,
  className,
  onTaskClick,
  onDependencyClick
}) => {
  // 🔄 Estados del componente
  const [data, setData] = useState<GanttChartPayload | null>(null)
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('weeks')
  const [filters, setFilters] = useState<FilterState>({})
  const [currentDate, setCurrentDate] = useState(new Date())
  const [zoomLevel, setZoomLevel] = useState(1)
  const scrollRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  // 🔄 Cargar datos del Gantt
  const loadGanttData = async () => {
    try {
      setLoading(true)
      const ganttData = await getGanttData(proyectoServicioId)
      setData(ganttData)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los datos del cronograma',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadGanttData()
  }, [proyectoServicioId])

  // 📊 Filtrar tareas según criterios
  const filteredTasks = useMemo(() => {
    if (!data) return []
    
    return data.tareas.filter(task => {
      if (filters.estado && task.estado !== filters.estado) return false
      if (filters.prioridad && task.prioridad !== filters.prioridad) return false
      if (filters.asignadoId && task.responsable.id !== filters.asignadoId) return false
      if (filters.soloRutaCritica && !task.rutaCritica) return false
      return true
    })
  }, [data, filters])

  // 📅 Generar timeline basado en el modo de vista
  const timeline = useMemo(() => {
    if (!data || filteredTasks.length === 0) return []
    
    const fechas = filteredTasks.flatMap(task => [
      new Date(task.fechaInicio),
      new Date(task.fechaFin)
    ]).filter(fecha => !isNaN(fecha.getTime()))
    
    if (fechas.length === 0) return []
    
    const fechaMin = new Date(Math.min(...fechas.map(f => f.getTime())))
    const fechaMax = new Date(Math.max(...fechas.map(f => f.getTime())))
    
    const timeline: Date[] = []
    const current = new Date(fechaMin)
    
    while (current <= fechaMax) {
      timeline.push(new Date(current))
      
      switch (viewMode) {
        case 'days':
          current.setDate(current.getDate() + 1)
          break
        case 'weeks':
          current.setDate(current.getDate() + 7)
          break
        case 'months':
          current.setMonth(current.getMonth() + 1)
          break
      }
    }
    
    return timeline
  }, [data, filteredTasks, viewMode])

  // 📏 Calcular posición y ancho de barras
  const getTaskBarStyle = (task: GanttTaskPayload) => {
    if (timeline.length === 0) return { left: '0%', width: '0%' }
    
    const fechaInicio = new Date(task.fechaInicio)
    const fechaFin = new Date(task.fechaFin)
    const timelineStart = timeline[0]
    const timelineEnd = timeline[timeline.length - 1]
    
    const totalDuration = timelineEnd.getTime() - timelineStart.getTime()
    const taskStart = fechaInicio.getTime() - timelineStart.getTime()
    const taskDuration = fechaFin.getTime() - fechaInicio.getTime()
    
    const left = (taskStart / totalDuration) * 100
    const width = (taskDuration / totalDuration) * 100
    
    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.max(1, width)}%`
    }
  }

  // 🎨 Configuración de colores por estado
  const estadoConfig = {
    pendiente: { color: 'bg-gray-400', textColor: 'text-gray-800', label: 'Pendiente' },
    en_progreso: { color: 'bg-blue-500', textColor: 'text-blue-800', label: 'En Progreso' },
    completada: { color: 'bg-green-500', textColor: 'text-green-800', label: 'Completada' },
    pausada: { color: 'bg-yellow-400', textColor: 'text-yellow-800', label: 'Pausada' },
    cancelada: { color: 'bg-red-400', textColor: 'text-red-800', label: 'Cancelada' }
  }

  const prioridadConfig = {
    baja: { border: 'border-gray-300', label: 'Baja' },
    media: { border: 'border-yellow-400', label: 'Media' },
    alta: { border: 'border-orange-500', label: 'Alta' },
    critica: { border: 'border-red-600', label: 'Crítica' }
  }

  // 📅 Formatear fechas según el modo de vista
  const formatTimelineDate = (date: Date) => {
    switch (viewMode) {
      case 'days':
        return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
      case 'weeks':
        return `S${Math.ceil(date.getDate() / 7)} ${date.toLocaleDateString('es-ES', { month: 'short' })}`
      case 'months':
        return date.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' })
      default:
        return date.toLocaleDateString('es-ES')
    }
  }

  // 🔄 Manejar cambio de filtros
  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  // 🔍 Manejar zoom
  const handleZoom = (direction: 'in' | 'out') => {
    setZoomLevel(prev => {
      const newLevel = direction === 'in' ? prev * 1.2 : prev / 1.2
      return Math.max(0.5, Math.min(3, newLevel))
    })
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <div className="flex items-center gap-2">
            <RefreshCw className="h-6 w-6 animate-spin" />
            <span>Cargando cronograma...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!data || filteredTasks.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No hay datos para mostrar</h3>
            <p className="text-muted-foreground">
              {data ? 'No se encontraron tareas con los filtros aplicados' : 'No hay tareas programadas'}
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <TooltipProvider>
      <Card className={className}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Cronograma del Proyecto
            </CardTitle>
            
            <div className="flex items-center gap-2">
              {/* 🔍 Controles de zoom */}
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => handleZoom('out')}>
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <span className="text-sm px-2">{Math.round(zoomLevel * 100)}%</span>
                <Button variant="outline" size="sm" onClick={() => handleZoom('in')}>
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </div>
              
              {/* 📅 Modo de vista */}
              <Select value={viewMode} onValueChange={(value: ViewMode) => setViewMode(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="days">Días</SelectItem>
                  <SelectItem value="weeks">Semanas</SelectItem>
                  <SelectItem value="months">Meses</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm" onClick={loadGanttData}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          {/* 🔧 Filtros */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <span className="text-sm font-medium">Filtros:</span>
            </div>
            
            <Select value={filters.estado || ''} onValueChange={(value) => handleFilterChange('estado', value || undefined)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {Object.entries(estadoConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={filters.prioridad || ''} onValueChange={(value) => handleFilterChange('prioridad', value || undefined)}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {Object.entries(prioridadConfig).map(([key, config]) => (
                  <SelectItem key={key} value={key}>
                    {config.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {data.rutaCritica && data.rutaCritica.length > 0 && (
              <Button
                variant={filters.soloRutaCritica ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleFilterChange('soloRutaCritica', !filters.soloRutaCritica)}
              >
                <AlertTriangle className="h-4 w-4 mr-1" />
                Ruta Crítica
              </Button>
            )}
          </div>
          
          {/* 📊 Métricas */}
          {data.metricas && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <div className="font-medium text-lg">{data.metricas.tareasTotal}</div>
                <div className="text-muted-foreground">Total Tareas</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-lg">{Math.round(data.metricas.progresoGeneral)}%</div>
                <div className="text-muted-foreground">Progreso</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-lg">{data.metricas.horasTotales}</div>
                <div className="text-muted-foreground">Horas Totales</div>
              </div>
              <div className="text-center">
                <div className="font-medium text-lg">{data.rutaCritica ? data.rutaCritica.length : 0}</div>
                <div className="text-muted-foreground">Ruta Crítica</div>
              </div>
            </div>
          )}
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="overflow-auto" ref={scrollRef} style={{ height: height - 200 }}>
            <div className="min-w-[800px]" style={{ transform: `scaleX(${zoomLevel})`, transformOrigin: 'left' }}>
              {/* 📅 Header del timeline */}
              <div className="sticky top-0 bg-background border-b z-10">
                <div className="flex">
                  <div className="w-64 p-3 border-r bg-muted/50">
                    <span className="font-medium">Tareas</span>
                  </div>
                  <div className="flex-1 flex">
                    {timeline.map((date, index) => (
                      <div
                        key={index}
                        className="flex-1 p-2 text-center text-xs border-r min-w-[60px]"
                      >
                        {formatTimelineDate(date)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              {/* 📋 Lista de tareas */}
              <div className="divide-y">
                {filteredTasks.map((task, index) => {
                  const barStyle = getTaskBarStyle(task)
                  const estadoInfo = estadoConfig[task.estado]
                  const prioridadInfo = prioridadConfig[task.prioridad]
                  
                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex hover:bg-muted/50 transition-colors"
                    >
                      {/* 📝 Información de la tarea */}
                      <div className="w-64 p-3 border-r">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm truncate" title={task.nombre}>
                              {task.nombre}
                            </span>
                            {task.rutaCritica && (
                              <AlertTriangle className="h-3 w-3 text-red-500" />
                            )}
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`${estadoInfo.textColor} text-xs`}>
                              {estadoInfo.label}
                            </Badge>
                            <Badge variant="outline" className={`${prioridadInfo.border} text-xs`}>
                              {prioridadInfo.label}
                            </Badge>
                          </div>
                          
                          {task.responsable?.nombre && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <UserIcon className="h-3 w-3" />
                              <span className="truncate">{task.responsable.nombre}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center gap-2">
                            <Progress value={task.progreso} className="flex-1 h-1" />
                            <span className="text-xs text-muted-foreground">
                              {task.progreso}%
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      {/* 📊 Barra del Gantt */}
                      <div className="flex-1 relative p-2">
                        <div className="relative h-8">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div
                                className={`absolute h-6 rounded cursor-pointer transition-all hover:opacity-80 ${
                                  estadoInfo.color
                                } ${
                                  task.rutaCritica ? 'ring-2 ring-red-500' : ''
                                }`}
                                style={barStyle}
                                onClick={() => onTaskClick?.(task)}
                              >
                                {/* 📈 Barra de progreso dentro de la tarea */}
                                <div
                                  className="h-full bg-white/30 rounded-l"
                                  style={{ width: `${task.progreso}%` }}
                                />
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              <div className="space-y-1">
                                <div className="font-medium">{task.nombre}</div>
                                <div className="text-sm">
                                  {new Date(task.fechaInicio).toLocaleDateString('es-ES')} - {new Date(task.fechaFin).toLocaleDateString('es-ES')}
                                </div>
                                <div className="text-sm">Progreso: {task.progreso}%</div>
                                {task.horasEstimadas > 0 && (
                                  <div className="text-sm">Horas: {task.horasEstimadas}h</div>
                                )}
                                {task.responsable?.nombre && (
                          <div className="text-sm">Asignado: {task.responsable.nombre}</div>
                                )}
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </div>
                    </motion.div>
                  )
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  )
}

export default GanttChart