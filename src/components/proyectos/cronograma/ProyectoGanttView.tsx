/**
 * ProyectoGanttView - Vista Gantt con grid temporal, línea hoy, y 5 niveles
 * Usa el endpoint /cronograma/tree para una sola llamada API
 */

'use client'

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  Calendar,
  ZoomIn,
  ZoomOut,
  Download,
  ChevronDown,
  ChevronRight,
  Loader2,
  RotateCcw
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { differenceInDays, addDays, addMonths, startOfMonth, startOfWeek, format, isToday, isSameMonth } from 'date-fns'
import { es } from 'date-fns/locale'

interface GanttItem {
  id: string
  nombre: string
  tipo: 'proyecto' | 'fase' | 'edt' | 'actividad' | 'tarea'
  fechaInicio: Date
  fechaFin: Date
  porcentajeAvance: number
  estado: string
  nivel: number
  padreId?: string
  hijos?: GanttItem[]
  color: string
  expandable: boolean
  expanded?: boolean
  horasEstimadas?: number
}

interface ProyectoGanttViewProps {
  proyectoId: string
  cronogramaId?: string
  onItemClick?: (item: GanttItem) => void
}

const TIPO_COLORS: Record<string, { bar: string; text: string; bg: string }> = {
  proyecto: { bar: '#2563eb', text: 'text-blue-600', bg: 'bg-blue-50' },
  fase: { bar: '#16a34a', text: 'text-green-600', bg: 'bg-green-50' },
  edt: { bar: '#d97706', text: 'text-amber-600', bg: 'bg-amber-50' },
  actividad: { bar: '#dc2626', text: 'text-red-600', bg: 'bg-red-50' },
  tarea: { bar: '#6b7280', text: 'text-gray-500', bg: 'bg-gray-50' },
}

const ROW_HEIGHT = 32
const NAME_COL_WIDTH = 280

export function ProyectoGanttView({ proyectoId, cronogramaId, onItemClick }: ProyectoGanttViewProps) {
  const [items, setItems] = useState<GanttItem[]>([])
  const [loading, setLoading] = useState(true)
  const [zoomLevel, setZoomLevel] = useState(1)
  const [filtroNivel, setFiltroNivel] = useState<string>('todos')
  const { toast } = useToast()
  const timelineScrollRef = useRef<HTMLDivElement>(null)
  const bodyScrollRef = useRef<HTMLDivElement>(null)

  // Sync horizontal scroll between header and body
  const handleBodyScroll = useCallback(() => {
    if (bodyScrollRef.current && timelineScrollRef.current) {
      timelineScrollRef.current.scrollLeft = bodyScrollRef.current.scrollLeft
    }
  }, [])

  // Load data from tree API (single call)
  const loadGanttData = useCallback(async () => {
    try {
      setLoading(true)

      // Load project info
      const [proyectoRes, treeRes] = await Promise.all([
        fetch(`/api/proyectos/${proyectoId}`),
        fetch(`/api/proyectos/${proyectoId}/cronograma/tree${cronogramaId ? `?cronogramaId=${cronogramaId}` : ''}`)
      ])

      if (!proyectoRes.ok || !treeRes.ok) throw new Error('Error cargando datos')

      const proyectoData = (await proyectoRes.json()).data
      const treeData = await treeRes.json()
      const treeArray = treeData?.data?.tree || []

      // Convert tree nodes to GanttItems
      const processNode = (node: any, nivel: number, parentId?: string): GanttItem => {
        const data = node.data || {}
        const fechaInicio = data.fechaInicioPlan || data.fechaInicioComercial || data.fechaInicio
        const fechaFin = data.fechaFinPlan || data.fechaFinComercial || data.fechaFin

        const item: GanttItem = {
          id: node.id,
          nombre: node.nombre || 'Sin nombre',
          tipo: node.type || 'tarea',
          fechaInicio: fechaInicio ? new Date(fechaInicio) : new Date(),
          fechaFin: fechaFin ? new Date(fechaFin) : new Date(),
          porcentajeAvance: node.metadata?.progressPercentage || 0,
          estado: node.metadata?.status || data.estado || 'pendiente',
          nivel,
          padreId: parentId,
          color: TIPO_COLORS[node.type]?.bar || '#6b7280',
          expandable: (node.children?.length || 0) > 0,
          expanded: nivel <= 1,
          horasEstimadas: data.horasEstimadas ? Number(data.horasEstimadas) : undefined,
          hijos: node.children?.map((child: any) => processNode(child, nivel + 1, node.id)) || []
        }

        // Calculate dates from children if the item has no dates
        if (item.hijos && item.hijos.length > 0) {
          const childStarts = item.hijos.map(c => c.fechaInicio.getTime()).filter(t => !isNaN(t))
          const childEnds = item.hijos.map(c => c.fechaFin.getTime()).filter(t => !isNaN(t))
          if (childStarts.length > 0) item.fechaInicio = new Date(Math.min(...childStarts))
          if (childEnds.length > 0) item.fechaFin = new Date(Math.max(...childEnds))
        }

        // Calculate hours from children
        if (!item.horasEstimadas && item.hijos && item.hijos.length > 0) {
          const sum = item.hijos.reduce((acc, c) => acc + (c.horasEstimadas || 0), 0)
          if (sum > 0) item.horasEstimadas = sum
        }

        return item
      }

      const fases = treeArray.map((node: any) => processNode(node, 1))

      // Create project root
      const projStart = proyectoData?.fechaInicio ? new Date(proyectoData.fechaInicio) : new Date()
      const projEnd = proyectoData?.fechaFin ? new Date(proyectoData.fechaFin) : addMonths(new Date(), 6)

      const proyectoItem: GanttItem = {
        id: proyectoData?.id || proyectoId,
        nombre: proyectoData?.nombre || 'Proyecto',
        tipo: 'proyecto',
        fechaInicio: fases.length > 0 ? new Date(Math.min(...fases.map((f: GanttItem) => f.fechaInicio.getTime()))) : projStart,
        fechaFin: fases.length > 0 ? new Date(Math.max(...fases.map((f: GanttItem) => f.fechaFin.getTime()))) : projEnd,
        porcentajeAvance: proyectoData?.progresoGeneral || 0,
        estado: proyectoData?.estado || 'en_progreso',
        nivel: 0,
        color: TIPO_COLORS.proyecto.bar,
        expandable: fases.length > 0,
        expanded: true,
        horasEstimadas: fases.reduce((s: number, f: GanttItem) => s + (f.horasEstimadas || 0), 0),
        hijos: fases,
      }

      setItems([proyectoItem])
    } catch (error) {
      toast({ title: 'Error cargando Gantt', description: String(error), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }, [proyectoId, cronogramaId])

  useEffect(() => { loadGanttData() }, [loadGanttData])

  // Toggle expanded state
  const toggleExpanded = (itemId: string) => {
    const update = (list: GanttItem[]): GanttItem[] =>
      list.map(item => {
        if (item.id === itemId) return { ...item, expanded: !item.expanded }
        if (item.hijos) return { ...item, hijos: update(item.hijos) }
        return item
      })
    setItems(update)
  }

  // Flatten visible items
  const visibleItems = useMemo(() => {
    const result: GanttItem[] = []
    const walk = (list: GanttItem[]) => {
      for (const item of list) {
        if (filtroNivel !== 'todos' && item.tipo !== filtroNivel && item.tipo !== 'proyecto') continue
        result.push(item)
        if (item.expanded && item.hijos) walk(item.hijos)
      }
    }
    walk(items)
    return result
  }, [items, filtroNivel])

  // Timeline configuration
  const timeline = useMemo(() => {
    if (visibleItems.length === 0) return null

    const allDates = visibleItems.flatMap(i => [i.fechaInicio, i.fechaFin]).filter(d => !isNaN(d.getTime()))
    if (allDates.length === 0) return null

    const minDate = startOfMonth(new Date(Math.min(...allDates.map(d => d.getTime()))))
    const rawMax = new Date(Math.max(...allDates.map(d => d.getTime())))
    const maxDate = startOfMonth(addMonths(rawMax, 2))

    const totalDays = differenceInDays(maxDate, minDate) || 1
    const dayWidth = Math.max(3, 8 * zoomLevel)
    const totalWidth = totalDays * dayWidth

    // Generate month columns
    const months: { date: Date; label: string; x: number; width: number }[] = []
    let d = new Date(minDate)
    while (d < maxDate) {
      const nextMonth = startOfMonth(addMonths(d, 1))
      const endOfRange = nextMonth > maxDate ? maxDate : nextMonth
      const startDay = differenceInDays(d, minDate)
      const daysInRange = differenceInDays(endOfRange, d)
      months.push({
        date: new Date(d),
        label: format(d, 'MMM yyyy', { locale: es }),
        x: startDay * dayWidth,
        width: daysInRange * dayWidth,
      })
      d = nextMonth
    }

    // Generate week lines
    const weekLines: number[] = []
    let weekStart = startOfWeek(minDate, { weekStartsOn: 1 })
    while (weekStart < maxDate) {
      const day = differenceInDays(weekStart, minDate)
      if (day > 0) weekLines.push(day * dayWidth)
      weekStart = addDays(weekStart, 7)
    }

    // Today line
    const today = new Date()
    const todayX = differenceInDays(today, minDate) * dayWidth
    const showToday = today >= minDate && today <= maxDate

    return { minDate, maxDate, totalDays, dayWidth, totalWidth, months, weekLines, todayX, showToday }
  }, [visibleItems, zoomLevel])

  // Export CSV
  const exportToCSV = () => {
    if (!visibleItems.length) return
    const csvData: string[][] = [['Nivel', 'Tipo', 'Nombre', 'Inicio', 'Fin', 'Horas', 'Progreso %', 'Estado']]
    const walk = (list: GanttItem[]) => {
      for (const item of list) {
        csvData.push([
          String(item.nivel),
          item.tipo,
          item.nombre,
          format(item.fechaInicio, 'dd/MM/yyyy'),
          format(item.fechaFin, 'dd/MM/yyyy'),
          String(item.horasEstimadas || ''),
          String(item.porcentajeAvance),
          item.estado,
        ])
        if (item.expanded && item.hijos) walk(item.hijos)
      }
    }
    walk(items)
    const content = csvData.map(row => row.map(v => v.includes(',') ? `"${v}"` : v).join(',')).join('\n')
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `gantt-${proyectoId}-${format(new Date(), 'yyyy-MM-dd')}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast({ title: 'CSV exportado', description: `${csvData.length - 1} filas` })
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span className="text-sm">Cargando Gantt...</span>
        </CardContent>
      </Card>
    )
  }

  if (!timeline) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          <Calendar className="h-10 w-10 mx-auto mb-3 opacity-50" />
          <p className="text-sm">No hay datos para mostrar en el diagrama de Gantt</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50/50">
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-blue-600" />
          <span className="text-sm font-semibold">Diagrama de Gantt</span>
          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
            {visibleItems.length} items
          </Badge>
        </div>

        <div className="flex items-center gap-1.5">
          <Select value={filtroNivel} onValueChange={setFiltroNivel}>
            <SelectTrigger className="h-7 w-36 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos los niveles</SelectItem>
              <SelectItem value="fase">Solo fases</SelectItem>
              <SelectItem value="edt">Solo EDTs</SelectItem>
              <SelectItem value="actividad">Solo actividades</SelectItem>
              <SelectItem value="tarea">Solo tareas</SelectItem>
            </SelectContent>
          </Select>

          <div className="w-px h-4 bg-gray-200" />

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(prev => Math.max(0.3, prev / 1.4))}>
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-[10px] text-muted-foreground w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(prev => Math.min(4, prev * 1.4))}>
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setZoomLevel(1)}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>

          <div className="w-px h-4 bg-gray-200" />

          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={exportToCSV} title="Exportar CSV">
            <Download className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      <CardContent className="p-0">
        {/* Header row: name col + timeline months */}
        <div className="flex border-b bg-white sticky top-0 z-10">
          <div className="flex-shrink-0 border-r border-gray-200 bg-gray-50 px-2 py-1.5" style={{ width: NAME_COL_WIDTH }}>
            <span className="text-xs font-medium text-gray-600">Elemento</span>
          </div>
          <div className="flex-1 overflow-hidden" ref={timelineScrollRef}>
            <div className="flex" style={{ width: timeline.totalWidth }}>
              {timeline.months.map((m, i) => (
                <div
                  key={i}
                  className={`flex-shrink-0 border-r border-gray-200 px-1.5 py-1.5 text-center ${isSameMonth(m.date, new Date()) ? 'bg-blue-50' : 'bg-gray-50'}`}
                  style={{ width: m.width }}
                >
                  <span className="text-[10px] font-medium text-gray-600 uppercase">{m.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Body: rows */}
        <div
          className="overflow-auto"
          style={{ maxHeight: 'calc(100vh - 340px)', minHeight: 200 }}
          ref={bodyScrollRef}
          onScroll={handleBodyScroll}
        >
          <div className="flex" style={{ minWidth: NAME_COL_WIDTH + timeline.totalWidth }}>
            {/* Name column */}
            <div className="flex-shrink-0" style={{ width: NAME_COL_WIDTH }}>
              {visibleItems.map((item) => {
                const colors = TIPO_COLORS[item.tipo] || TIPO_COLORS.tarea
                return (
                  <div
                    key={item.id}
                    className={`flex items-center border-b border-gray-100 hover:bg-gray-50 cursor-pointer ${item.nivel === 0 ? 'bg-blue-50/50' : ''}`}
                    style={{ height: ROW_HEIGHT }}
                    onClick={() => onItemClick?.(item)}
                  >
                    <div
                      className="flex items-center gap-1 px-2 w-full min-w-0"
                      style={{ paddingLeft: item.nivel * 16 + 8 }}
                    >
                      {/* Expand toggle */}
                      <div className="w-4 flex-shrink-0">
                        {item.expandable && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-4 w-4 p-0"
                            onClick={(e) => { e.stopPropagation(); toggleExpanded(item.id) }}
                          >
                            {item.expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                          </Button>
                        )}
                      </div>
                      {/* Color dot + name */}
                      <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <span className={`text-xs truncate ${item.nivel === 0 ? 'font-semibold' : item.nivel === 1 ? 'font-medium' : ''}`}>
                        {item.nombre}
                      </span>
                      <Badge variant="outline" className={`text-[9px] leading-none px-1 py-0 h-3.5 flex-shrink-0 ${colors.text} border-current/30`}>
                        {item.tipo}
                      </Badge>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Timeline bars */}
            <div className="flex-1 relative" style={{ width: timeline.totalWidth }}>
              {/* Week grid lines */}
              {timeline.weekLines.map((x, i) => (
                <div
                  key={`wk-${i}`}
                  className="absolute top-0 bottom-0 border-l border-gray-100"
                  style={{ left: x }}
                />
              ))}

              {/* Month grid lines */}
              {timeline.months.map((m, i) => (
                <div
                  key={`mo-${i}`}
                  className="absolute top-0 bottom-0 border-l border-gray-300"
                  style={{ left: m.x }}
                />
              ))}

              {/* Today line */}
              {timeline.showToday && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                  style={{ left: timeline.todayX }}
                  title={`Hoy: ${format(new Date(), 'dd MMM yyyy', { locale: es })}`}
                >
                  <div className="absolute -top-0 -left-1.5 w-3.5 h-3.5 bg-red-500 rounded-full flex items-center justify-center">
                    <span className="text-[7px] text-white font-bold">H</span>
                  </div>
                </div>
              )}

              {/* Bars */}
              {visibleItems.map((item, rowIdx) => {
                const startDay = differenceInDays(item.fechaInicio, timeline.minDate)
                const durationDays = Math.max(1, differenceInDays(item.fechaFin, item.fechaInicio))
                const barLeft = startDay * timeline.dayWidth
                const barWidth = Math.max(durationDays * timeline.dayWidth, 20)
                const colors = TIPO_COLORS[item.tipo] || TIPO_COLORS.tarea

                return (
                  <TooltipProvider key={item.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div
                          className="absolute cursor-pointer hover:opacity-80 transition-opacity group"
                          style={{
                            top: rowIdx * ROW_HEIGHT + 6,
                            left: barLeft,
                            width: barWidth,
                            height: ROW_HEIGHT - 12,
                          }}
                          onClick={() => onItemClick?.(item)}
                        >
                          {/* Bar background */}
                          <div
                            className="absolute inset-0 rounded shadow-sm"
                            style={{ backgroundColor: item.color + '40', border: `1px solid ${item.color}80` }}
                          />
                          {/* Progress fill */}
                          <div
                            className="absolute left-0 top-0 h-full rounded-l"
                            style={{ width: `${item.porcentajeAvance}%`, backgroundColor: item.color + 'A0' }}
                          />
                          {/* Label */}
                          <div className="absolute inset-0 flex items-center px-1.5 overflow-hidden">
                            <span className="text-[10px] font-medium truncate" style={{ color: item.color }}>
                              {durationDays}d{item.horasEstimadas ? ` · ${item.horasEstimadas}h` : ''}
                            </span>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs text-xs">
                        <div className="space-y-1">
                          <div className="font-semibold">{item.nombre}</div>
                          <div>{format(item.fechaInicio, 'dd MMM yyyy', { locale: es })} → {format(item.fechaFin, 'dd MMM yyyy', { locale: es })}</div>
                          <div>{durationDays} días{item.horasEstimadas ? ` · ${item.horasEstimadas}h` : ''} · {item.porcentajeAvance}%</div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer legend */}
        <div className="border-t px-3 py-1.5 bg-gray-50/50">
          <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
            {Object.entries(TIPO_COLORS).map(([tipo, c]) => (
              <div key={tipo} className="flex items-center gap-1">
                <div className="w-2.5 h-2.5 rounded" style={{ backgroundColor: c.bar }} />
                <span className="capitalize">{tipo}</span>
              </div>
            ))}
            <div className="w-px h-3 bg-gray-200" />
            <div className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded bg-red-500" />
              <span>Hoy</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
