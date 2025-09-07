/**
 * 📊 PedidoEquipoGanttClient Component
 * 
 * Vista Gantt avanzada para seguimiento temporal de pedidos de equipos
 * con indicadores de coherencia, alertas de retrasos y gestión de cronogramas.
 * 
 * Features:
 * - Timeline visual de pedidos por proyecto
 * - Indicadores de progreso y estados
 * - Alertas de retrasos y dependencias
 * - Filtros por proyecto, proveedor y fechas
 * - Zoom temporal (día, semana, mes)
 * - Drag & drop para reprogramación
 * - Exportación de cronogramas
 * - Integración con coherencia de listas
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client'

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertCircle,
  Building2,
  Calendar,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Filter,
  Maximize2,
  Minimize2,
  MoreHorizontal,
  Package,
  RefreshCw,
  Target,
  Truck,
  Users,
  ZoomIn,
  ZoomOut
} from 'lucide-react'
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInDays, isWithinInterval, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

// 📝 Types
import type { EstadoPedido } from '@/types/modelos'

// 📋 Props interface
interface PedidoEquipoGanttClientProps {
  data: Array<{
    id: string
    codigo: string
    descripcion?: string
    estado: EstadoPedido
    fechaCreacion: Date
    fechaEntregaEstimada?: Date
    fechaEntregaReal?: Date
    montoTotal?: number
    urgente?: boolean
    coherencia?: number
    progreso?: number
    proyecto?: {
      id: string
      nombre: string
      codigo: string
      color?: string
    }
    proveedor?: {
      id: string
      nombre: string
    }
    responsable?: {
      id: string
      nombre: string
    }
    dependencias?: string[]
  }>
  dateRange?: {
    start: Date
    end: Date
  }
  viewMode?: 'day' | 'week' | 'month'
  showCoherenceIndicators?: boolean
  allowDragDrop?: boolean
  onPedidoClick?: (pedido: any) => void
  onPedidoUpdate?: (id: string, updates: any) => Promise<void>
  onDateRangeChange?: (range: { start: Date; end: Date }) => void
  onViewModeChange?: (mode: 'day' | 'week' | 'month') => void
  onExport?: (format: 'pdf' | 'png') => void
}

// 🎯 Estados de pedido con colores para Gantt
const ESTADOS_GANTT_CONFIG = {
  borrador: {
    color: 'bg-gray-400',
    textColor: 'text-white',
    borderColor: 'border-gray-500'
  },
  enviado: {
    color: 'bg-blue-500',
    textColor: 'text-white',
    borderColor: 'border-blue-600'
  },
  atendido: {
    color: 'bg-yellow-500',
    textColor: 'text-white',
    borderColor: 'border-yellow-600'
  },
  parcial: {
    color: 'bg-orange-500',
    textColor: 'text-white',
    borderColor: 'border-orange-600'
  },
  entregado: {
    color: 'bg-green-500',
    textColor: 'text-white',
    borderColor: 'border-green-600'
  },
  cancelado: {
    color: 'bg-red-500',
    textColor: 'text-white',
    borderColor: 'border-red-600'
  }
} as const

// 🔧 Utility functions
const getDateRange = (viewMode: 'day' | 'week' | 'month', baseDate: Date) => {
  switch (viewMode) {
    case 'day':
      return {
        start: baseDate,
        end: addDays(baseDate, 6) // 7 días
      }
    case 'week':
      return {
        start: startOfWeek(baseDate, { weekStartsOn: 1 }),
        end: endOfWeek(addDays(baseDate, 21), { weekStartsOn: 1 }) // 4 semanas
      }
    case 'month':
      return {
        start: startOfMonth(baseDate),
        end: endOfMonth(addDays(baseDate, 90)) // 3 meses
      }
  }
}

const getTimelineColumns = (start: Date, end: Date, viewMode: 'day' | 'week' | 'month') => {
  const columns = []
  let current = new Date(start)
  
  while (current <= end) {
    columns.push(new Date(current))
    
    switch (viewMode) {
      case 'day':
        current = addDays(current, 1)
        break
      case 'week':
        current = addDays(current, 7)
        break
      case 'month':
        current = addDays(current, 30)
        break
    }
  }
  
  return columns
}

const calculateBarPosition = (fechaInicio: Date, fechaFin: Date, rangeStart: Date, rangeEnd: Date) => {
  const totalDays = differenceInDays(rangeEnd, rangeStart)
  const startOffset = Math.max(0, differenceInDays(fechaInicio, rangeStart))
  const duration = differenceInDays(fechaFin, fechaInicio)
  
  return {
    left: (startOffset / totalDays) * 100,
    width: Math.max(2, (duration / totalDays) * 100)
  }
}

const getCoherenceColor = (coherencia?: number) => {
  if (!coherencia) return 'bg-gray-100'
  if (coherencia >= 90) return 'bg-green-100'
  if (coherencia >= 70) return 'bg-yellow-100'
  if (coherencia >= 50) return 'bg-orange-100'
  return 'bg-red-100'
}

// ✅ Main component
export default function PedidoEquipoGanttClient({
  data,
  dateRange,
  viewMode = 'week',
  showCoherenceIndicators = true,
  allowDragDrop = true,
  onPedidoClick,
  onPedidoUpdate,
  onDateRangeChange,
  onViewModeChange,
  onExport
}: PedidoEquipoGanttClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedPedido, setSelectedPedido] = useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [draggedPedido, setDraggedPedido] = useState<string | null>(null)
  const ganttRef = useRef<HTMLDivElement>(null)

  // 🔁 Calculate date range
  const effectiveDateRange = useMemo(() => {
    return dateRange || getDateRange(viewMode, currentDate)
  }, [dateRange, viewMode, currentDate])

  // 🔁 Generate timeline columns
  const timelineColumns = useMemo(() => {
    return getTimelineColumns(effectiveDateRange.start, effectiveDateRange.end, viewMode)
  }, [effectiveDateRange, viewMode])

  // 🔁 Group data by project
  const groupedData = useMemo(() => {
    const groups = new Map()
    
    data.forEach(pedido => {
      const projectKey = pedido.proyecto?.id || 'sin-proyecto'
      const projectName = pedido.proyecto?.nombre || 'Sin Proyecto'
      
      if (!groups.has(projectKey)) {
        groups.set(projectKey, {
          id: projectKey,
          nombre: projectName,
          color: pedido.proyecto?.color || '#6b7280',
          pedidos: []
        })
      }
      
      groups.get(projectKey).pedidos.push(pedido)
    })
    
    return Array.from(groups.values())
  }, [data])

  // 🔁 Filter visible pedidos
  const visiblePedidos = useMemo(() => {
    return data.filter(pedido => {
      if (!pedido.fechaEntregaEstimada) return false
      
      const fechaInicio = pedido.fechaCreacion
      const fechaFin = pedido.fechaEntregaReal || pedido.fechaEntregaEstimada
      
      return isWithinInterval(fechaInicio, effectiveDateRange) || 
             isWithinInterval(fechaFin, effectiveDateRange) ||
             (fechaInicio <= effectiveDateRange.start && fechaFin >= effectiveDateRange.end)
    })
  }, [data, effectiveDateRange])

  // 🔁 Handle navigation
  const handlePrevious = useCallback(() => {
    const newDate = viewMode === 'day' ? addDays(currentDate, -7) :
                   viewMode === 'week' ? addDays(currentDate, -28) :
                   addDays(currentDate, -90)
    setCurrentDate(newDate)
    onDateRangeChange?.(getDateRange(viewMode, newDate))
  }, [currentDate, viewMode, onDateRangeChange])

  const handleNext = useCallback(() => {
    const newDate = viewMode === 'day' ? addDays(currentDate, 7) :
                   viewMode === 'week' ? addDays(currentDate, 28) :
                   addDays(currentDate, 90)
    setCurrentDate(newDate)
    onDateRangeChange?.(getDateRange(viewMode, newDate))
  }, [currentDate, viewMode, onDateRangeChange])

  // 🔁 Handle view mode change
  const handleViewModeChange = useCallback((newMode: 'day' | 'week' | 'month') => {
    onViewModeChange?.(newMode)
    onDateRangeChange?.(getDateRange(newMode, currentDate))
  }, [currentDate, onViewModeChange, onDateRangeChange])

  // 🔁 Handle drag and drop
  const handleDragStart = useCallback((pedidoId: string) => {
    if (!allowDragDrop) return
    setDraggedPedido(pedidoId)
  }, [allowDragDrop])

  const handleDragEnd = useCallback(() => {
    setDraggedPedido(null)
  }, [])

  const handleDrop = useCallback(async (pedidoId: string, newDate: Date) => {
    if (!allowDragDrop || !onPedidoUpdate) return
    
    try {
      await onPedidoUpdate(pedidoId, {
        fechaEntregaEstimada: newDate
      })
      toast.success('Fecha de entrega actualizada')
    } catch (error) {
      toast.error('Error al actualizar la fecha')
    }
  }, [allowDragDrop, onPedidoUpdate])

  // 🔁 Calculate stats
  const stats = useMemo(() => {
    const total = visiblePedidos.length
    const completados = visiblePedidos.filter(p => p.estado === 'entregado').length
    const retrasados = visiblePedidos.filter(p => {
      return p.fechaEntregaEstimada && 
             new Date(p.fechaEntregaEstimada) < new Date() && 
             p.estado !== 'entregado'
    }).length
    const urgentes = visiblePedidos.filter(p => p.urgente).length
    
    return { total, completados, retrasados, urgentes }
  }, [visiblePedidos])

  return (
    <div className={cn(
      'space-y-4',
      isFullscreen && 'fixed inset-0 z-50 bg-white p-4 overflow-auto'
    )}>
      {/* 📊 Header with controls */}
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold">
            Vista Gantt - Pedidos de Equipos
          </h3>
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <span>Total: {stats.total}</span>
            <span>Completados: {stats.completados}</span>
            <span>Retrasados: {stats.retrasados}</span>
            <span>Urgentes: {stats.urgentes}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* View Mode Selector */}
          <Select value={viewMode} onValueChange={handleViewModeChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Por Día</SelectItem>
              <SelectItem value="week">Por Semana</SelectItem>
              <SelectItem value="month">Por Mes</SelectItem>
            </SelectContent>
          </Select>
          
          {/* Navigation */}
          <div className="flex items-center space-x-1">
            <Button variant="outline" size="sm" onClick={handlePrevious}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
              Hoy
            </Button>
            <Button variant="outline" size="sm" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          
          {/* Actions */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsFullscreen(!isFullscreen)}>
                {isFullscreen ? <Minimize2 className="mr-2 h-4 w-4" /> : <Maximize2 className="mr-2 h-4 w-4" />}
                {isFullscreen ? 'Salir pantalla completa' : 'Pantalla completa'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport?.('pdf')}>
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onExport?.('png')}>
                <Download className="mr-2 h-4 w-4" />
                Exportar PNG
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* 📅 Date Range Display */}
      <div className="flex items-center justify-center py-2 bg-muted/50 rounded-lg">
        <div className="flex items-center space-x-2 text-sm font-medium">
          <Calendar className="h-4 w-4" />
          <span>
            {format(effectiveDateRange.start, 'dd MMM yyyy', { locale: es })} - {format(effectiveDateRange.end, 'dd MMM yyyy', { locale: es })}
          </span>
        </div>
      </div>

      {/* 📊 Gantt Chart */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Cronograma de Pedidos</CardTitle>
            <div className="flex items-center space-x-2 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-green-500 rounded" />
                <span>Entregado</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-yellow-500 rounded" />
                <span>En proceso</span>
              </div>
              <div className="flex items-center space-x-1">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span>Retrasado</span>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div ref={ganttRef} className="overflow-x-auto">
            {/* Timeline Header */}
            <div className="flex border-b bg-muted/30">
              <div className="w-64 p-3 border-r bg-background">
                <span className="font-medium text-sm">Proyecto / Pedido</span>
              </div>
              <div className="flex-1 flex">
                {timelineColumns.map((date, index) => (
                  <div 
                    key={index} 
                    className="flex-1 p-2 border-r text-center text-xs font-medium min-w-[60px]"
                  >
                    <div>
                      {viewMode === 'day' && format(date, 'dd')}
                      {viewMode === 'week' && format(date, 'dd MMM')}
                      {viewMode === 'month' && format(date, 'MMM yyyy')}
                    </div>
                    <div className="text-muted-foreground">
                      {viewMode === 'day' && format(date, 'EEE', { locale: es })}
                      {viewMode === 'week' && `Sem ${format(date, 'w')}`}
                      {viewMode === 'month' && format(date, 'yyyy')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Gantt Rows */}
            <div className="divide-y">
              {groupedData.map((grupo) => (
                <div key={grupo.id}>
                  {/* Project Header */}
                  <div className="flex bg-muted/20">
                    <div className="w-64 p-3 border-r">
                      <div className="flex items-center space-x-2">
                        <Building2 className="h-4 w-4" style={{ color: grupo.color }} />
                        <span className="font-medium text-sm">{grupo.nombre}</span>
                        <Badge variant="outline" className="text-xs">
                          {grupo.pedidos.length}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex-1 relative">
                      {/* Project timeline background */}
                      <div className="h-full bg-gradient-to-r from-transparent via-muted/10 to-transparent" />
                    </div>
                  </div>

                  {/* Pedidos in Project */}
                  {grupo.pedidos.map((pedido: PedidoEquipoGanttClientProps['data'][0]) => {
                    if (!pedido.fechaEntregaEstimada) return null
                    
                    const fechaInicio = pedido.fechaCreacion
                    const fechaFin = pedido.fechaEntregaReal || pedido.fechaEntregaEstimada
                    const estadoConfig = ESTADOS_GANTT_CONFIG[pedido.estado]
                    const isOverdue = new Date(pedido.fechaEntregaEstimada) < new Date() && pedido.estado !== 'entregado'
                    const isSelected = selectedPedido === pedido.id
                    const isDragged = draggedPedido === pedido.id
                    
                    const barPosition = calculateBarPosition(
                      fechaInicio,
                      fechaFin,
                      effectiveDateRange.start,
                      effectiveDateRange.end
                    )

                    return (
                      <motion.div 
                        key={pedido.id}
                        className={cn(
                          'flex hover:bg-muted/30 transition-colors',
                          isSelected && 'bg-blue-50',
                          isDragged && 'opacity-50'
                        )}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* Pedido Info */}
                        <div className="w-64 p-3 border-r">
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs">{pedido.codigo}</span>
                              {pedido.urgente && (
                                <AlertCircle className="h-3 w-3 text-orange-500" />
                              )}
                              {isOverdue && (
                                <Clock className="h-3 w-3 text-red-500" />
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-2">
                              <Badge 
                                variant="outline" 
                                className={cn('text-xs', estadoConfig.color, estadoConfig.textColor)}
                              >
                                {pedido.estado}
                              </Badge>
                              
                              {showCoherenceIndicators && pedido.coherencia !== undefined && (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger>
                                      <Badge 
                                        variant="outline" 
                                        className={cn('text-xs', getCoherenceColor(pedido.coherencia))}
                                      >
                                        <Target className="h-3 w-3 mr-1" />
                                        {(pedido.coherencia && pedido.coherencia >= 80) ? 'Coherente' : 'Incoherente'}
                                      </Badge>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Coherencia con lista</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )}
                            </div>
                            
                            {pedido.proveedor && (
                              <div className="text-xs text-muted-foreground truncate">
                                {pedido.proveedor.nombre}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Timeline Bar */}
                        <div className="flex-1 relative p-2">
                          <div className="relative h-8">
                            {/* Background grid */}
                            <div className="absolute inset-0 flex">
                              {timelineColumns.map((_, index) => (
                                <div 
                                  key={index} 
                                  className="flex-1 border-r border-muted/30 last:border-r-0"
                                />
                              ))}
                            </div>
                            
                            {/* Progress Bar */}
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <motion.div
                                    className={cn(
                                      'absolute top-1 h-6 rounded cursor-pointer transition-all duration-200',
                                      estadoConfig.color,
                                      estadoConfig.borderColor,
                                      'border-2',
                                      isOverdue && 'ring-2 ring-red-500 ring-opacity-50',
                                      pedido.urgente && 'ring-2 ring-orange-500 ring-opacity-50',
                                      allowDragDrop && 'hover:shadow-md'
                                    )}
                                    style={{
                                      left: `${barPosition.left}%`,
                                      width: `${barPosition.width}%`,
                                      minWidth: '20px'
                                    }}
                                    draggable={allowDragDrop}
                                    onDragStart={() => handleDragStart(pedido.id)}
                                    onDragEnd={handleDragEnd}
                                    onClick={() => {
                                      setSelectedPedido(isSelected ? null : pedido.id)
                                      onPedidoClick?.(pedido)
                                    }}
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                  >
                                    {/* Progress indicator */}
                                    {pedido.progreso !== undefined && (
                                      <div 
                                        className="absolute top-0 left-0 h-full bg-white/30 rounded-l"
                                        style={{ width: `${pedido.progreso}%` }}
                                      />
                                    )}
                                    
                                    {/* Bar content */}
                                    <div className="flex items-center justify-center h-full px-2">
                                      <span className={cn('text-xs font-medium truncate', estadoConfig.textColor)}>
                                        {pedido.codigo}
                                      </span>
                                    </div>
                                  </motion.div>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="space-y-1 text-xs">
                                    <div className="font-medium">{pedido.codigo}</div>
                                    <div>Estado: {pedido.estado}</div>
                                    <div>Inicio: {format(fechaInicio, 'dd/MM/yyyy')}</div>
                                    <div>Entrega: {format(new Date(pedido.fechaEntregaEstimada), 'dd/MM/yyyy')}</div>
                                    {pedido.progreso !== undefined && (
                                      <div>Progreso: {pedido.progreso.toFixed(1)}%</div>
                                    )}
                                    {pedido.coherencia !== undefined && (
                                      <div>Coherencia: {(pedido.coherencia && pedido.coherencia >= 80) ? 'Coherente' : 'Incoherente'}</div>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                            
                            {/* Today indicator */}
                            {isWithinInterval(new Date(), effectiveDateRange) && (
                              <div 
                                className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10"
                                style={{
                                  left: `${((differenceInDays(new Date(), effectiveDateRange.start) / differenceInDays(effectiveDateRange.end, effectiveDateRange.start)) * 100)}%`
                                }}
                              >
                                <div className="absolute -top-1 -left-1 w-2 h-2 bg-red-500 rounded-full" />
                              </div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 📊 Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <div className="text-xs text-muted-foreground">Total Pedidos</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{stats.completados}</div>
                <div className="text-xs text-muted-foreground">Completados</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="h-5 w-5 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{stats.retrasados}</div>
                <div className="text-xs text-muted-foreground">Retrasados</div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{stats.urgentes}</div>
                <div className="text-xs text-muted-foreground">Urgentes</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}