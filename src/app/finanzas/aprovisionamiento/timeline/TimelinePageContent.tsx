'use client'

/**
 * TimelinePageContent - Client component for Timeline page
 * Handles data fetching, filtering, export, and coherence validation
 */

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import {
  Calendar,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Package,
  ShoppingCart,
  FileSpreadsheet,
  CalendarDays,
  BarChart3,
  Filter,
  X
} from 'lucide-react'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { TimelineView } from '@/components/finanzas/aprovisionamiento/TimelineView'
import type { TimelineData, GanttItem } from '@/types/aprovisionamiento'

interface TimelinePageContentProps {
  initialFilters: {
    proyectoId?: string
    fechaInicio?: string
    fechaFin?: string
    vista?: 'gantt' | 'lista' | 'calendario'
    agrupacion?: 'proyecto' | 'estado' | 'proveedor' | 'fecha'
    soloAlertas?: boolean
    tipo?: 'lista' | 'pedido' | 'ambos'
  }
}

export function TimelinePageContent({ initialFilters }: TimelinePageContentProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null)
  const [filtros, setFiltros] = useState(initialFilters)
  const [showQuickFilters, setShowQuickFilters] = useState(false)

  // Fetch timeline data
  const fetchData = useCallback(async () => {
    try {
      setLoading(true)

      const params = new URLSearchParams()
      if (filtros.proyectoId) params.set('proyectoId', filtros.proyectoId)
      if (filtros.fechaInicio) params.set('fechaInicio', filtros.fechaInicio)
      if (filtros.fechaFin) params.set('fechaFin', filtros.fechaFin)
      if (filtros.tipo) params.set('tipo', filtros.tipo)
      if (filtros.soloAlertas) params.set('soloConAlertas', 'true')

      const response = await fetch(`/api/aprovisionamiento/timeline?${params.toString()}`)

      if (!response.ok) {
        throw new Error('Error al cargar datos')
      }

      const data = await response.json()

      // Map API response to TimelineData format
      const mappedData: TimelineData = {
        items: (data.items || []).map((item: any) => ({
          id: item.id,
          label: item.nombre,
          titulo: item.nombre,
          descripcion: `${item.codigo} - ${item.proyecto?.nombre || 'Sin proyecto'}`,
          codigo: item.codigo,
          tipo: item.tipo,
          start: item.fechaInicio,
          end: item.fechaFin,
          fechaInicio: item.fechaInicio,
          fechaFin: item.fechaFin,
          amount: item.monto,
          estado: item.estado,
          color: item.color,
          progress: item.progreso,
          progreso: item.progreso,
          coherencia: 85,
          dependencies: item.dependencias || [],
          alertas: item.alertas || [],
          diasRetraso: item.diasRetraso,
          proyecto: item.proyecto
        })),
        resumen: data.resumen || {
          totalItems: 0,
          montoTotal: 0,
          itemsVencidos: 0,
          itemsEnRiesgo: 0,
          itemsConAlertas: 0,
          porcentajeCompletado: 0,
          coherenciaPromedio: 0,
          distribucionPorTipo: { listas: 0, pedidos: 0 },
          alertasPorPrioridad: { alta: 0, media: 0, baja: 0 }
        },
        alertas: data.items?.flatMap((item: any) => item.alertas || []) || [],
        configuracion: {
          mostrarMontos: true,
          mostrarEstados: true,
          mostrarDependencias: false,
          zoom: 'semana',
          colorPorEstado: {
            'pendiente': '#f59e0b',
            'en_proceso': '#3b82f6',
            'completado': '#10b981',
            'cancelado': '#ef4444'
          }
        }
      }

      setTimelineData(mappedData)
    } catch (error) {
      console.error('Error fetching timeline data:', error)
      toast.error('Error al cargar el timeline')
    } finally {
      setLoading(false)
    }
  }, [filtros])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Calculate stats
  const stats = {
    totalItems: timelineData?.items?.length || 0,
    listas: timelineData?.items?.filter(item => item.tipo === 'lista').length || 0,
    pedidos: timelineData?.items?.filter(item => item.tipo === 'pedido').length || 0,
    itemsEnRiesgo: timelineData?.items?.filter(item => {
      const diasHastaVencimiento = item.fechaFin
        ? Math.ceil((new Date(item.fechaFin).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : 999
      return diasHastaVencimiento <= 7 && diasHastaVencimiento > 0
    }).length || 0,
    itemsRetrasados: timelineData?.items?.filter(item => item.diasRetraso && item.diasRetraso > 0).length || 0,
    alertasActivas: timelineData?.alertas?.length || 0,
    montoTotal: timelineData?.resumen?.montoTotal || 0
  }

  // Export to Excel
  const handleExportExcel = async () => {
    if (!timelineData?.items?.length) {
      toast.error('No hay datos para exportar')
      return
    }

    try {
      setExporting(true)

      // Prepare data for export
      const exportData = timelineData.items.map(item => ({
        'Tipo': item.tipo === 'lista' ? 'Lista' : 'Pedido',
        'Código': item.codigo || '-',
        'Nombre': item.titulo || item.label || '-',
        'Proyecto': item.descripcion || '-',
        'Estado': item.estado || '-',
        'Fecha Inicio': item.fechaInicio ? new Date(item.fechaInicio).toLocaleDateString('es-PE') : '-',
        'Fecha Fin': item.fechaFin ? new Date(item.fechaFin).toLocaleDateString('es-PE') : '-',
        'Monto (USD)': item.amount || 0,
        'Progreso (%)': item.progreso || 0,
        'Días Retraso': item.diasRetraso || 0,
        'Alertas': item.alertas?.length || 0
      }))

      // Create workbook
      const wb = XLSX.utils.book_new()

      // Items sheet
      const ws = XLSX.utils.json_to_sheet(exportData)

      // Set column widths
      ws['!cols'] = [
        { wch: 8 },  // Tipo
        { wch: 15 }, // Código
        { wch: 30 }, // Nombre
        { wch: 25 }, // Proyecto
        { wch: 12 }, // Estado
        { wch: 12 }, // Fecha Inicio
        { wch: 12 }, // Fecha Fin
        { wch: 15 }, // Monto
        { wch: 12 }, // Progreso
        { wch: 12 }, // Días Retraso
        { wch: 10 }, // Alertas
      ]

      XLSX.utils.book_append_sheet(wb, ws, 'Timeline')

      // Summary sheet
      const summaryData = [
        { 'Métrica': 'Total Items', 'Valor': stats.totalItems },
        { 'Métrica': 'Listas', 'Valor': stats.listas },
        { 'Métrica': 'Pedidos', 'Valor': stats.pedidos },
        { 'Métrica': 'Items en Riesgo', 'Valor': stats.itemsEnRiesgo },
        { 'Métrica': 'Items Retrasados', 'Valor': stats.itemsRetrasados },
        { 'Métrica': 'Alertas Activas', 'Valor': stats.alertasActivas },
        { 'Métrica': 'Monto Total (USD)', 'Valor': stats.montoTotal.toFixed(2) },
      ]
      const wsSummary = XLSX.utils.json_to_sheet(summaryData)
      wsSummary['!cols'] = [{ wch: 20 }, { wch: 15 }]
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen')

      // Generate filename with date
      const fecha = new Date().toISOString().split('T')[0]
      const filename = `timeline-aprovisionamiento-${fecha}.xlsx`

      // Download
      XLSX.writeFile(wb, filename)
      toast.success('Timeline exportado correctamente')
    } catch (error) {
      console.error('Error exporting timeline:', error)
      toast.error('Error al exportar el timeline')
    } finally {
      setExporting(false)
    }
  }

  // Handle item click - navigate to detail page
  const handleItemClick = (item: GanttItem) => {
    if (item.tipo === 'lista') {
      router.push(`/finanzas/aprovisionamiento/listas/${item.id}`)
    } else if (item.tipo === 'pedido') {
      router.push(`/finanzas/aprovisionamiento/pedidos/${item.id}`)
    }
  }

  // Update filters and URL
  const updateFilter = (key: string, value: string | undefined) => {
    const newFiltros = { ...filtros, [key]: value }
    setFiltros(newFiltros)

    // Update URL
    const params = new URLSearchParams()
    if (newFiltros.proyectoId) params.set('proyecto', newFiltros.proyectoId)
    if (newFiltros.fechaInicio) params.set('fechaInicio', newFiltros.fechaInicio)
    if (newFiltros.fechaFin) params.set('fechaFin', newFiltros.fechaFin)
    if (newFiltros.vista) params.set('vista', newFiltros.vista)
    if (newFiltros.tipo && newFiltros.tipo !== 'ambos') params.set('tipo', newFiltros.tipo)
    if (newFiltros.soloAlertas) params.set('alertas', 'true')

    const queryString = params.toString()
    router.push(queryString ? `?${queryString}` : '', { scroll: false })
  }

  // Empty state
  if (!loading && (!timelineData?.items || timelineData.items.length === 0)) {
    return (
      <div className="space-y-4">
        {/* Quick filters */}
        <div className="flex items-center gap-2">
          <Select
            value={filtros.tipo || 'ambos'}
            onValueChange={(value) => updateFilter('tipo', value)}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ambos">Todos</SelectItem>
              <SelectItem value="lista">Solo Listas</SelectItem>
              <SelectItem value="pedido">Solo Pedidos</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Empty state card */}
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <div className="p-4 bg-muted rounded-full mb-4">
              <CalendarDays className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No hay items en el timeline</h3>
            <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
              No se encontraron listas ni pedidos con los filtros actuales.
              Crea una lista de equipos o un pedido para verlos en el timeline.
            </p>
            <div className="flex items-center gap-3">
              <Link href="/finanzas/aprovisionamiento/listas">
                <Button variant="outline" size="sm">
                  <Package className="h-4 w-4 mr-2" />
                  Ver Listas
                </Button>
              </Link>
              <Link href="/finanzas/aprovisionamiento/pedidos">
                <Button variant="outline" size="sm">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Ver Pedidos
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Stats & Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg">
            <Calendar className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">{stats.totalItems}</span>
            <span className="text-xs text-blue-600">items</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 border border-purple-200 rounded-lg">
            <Package className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">{stats.listas}</span>
            <span className="text-xs text-purple-600">listas</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
            <ShoppingCart className="h-4 w-4 text-emerald-600" />
            <span className="text-sm font-medium text-emerald-700">{stats.pedidos}</span>
            <span className="text-xs text-emerald-600">pedidos</span>
          </div>

          {stats.itemsRetrasados > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <Clock className="h-4 w-4 text-red-600" />
              <span className="text-sm font-medium text-red-700">{stats.itemsRetrasados}</span>
              <span className="text-xs text-red-600">retrasados</span>
            </div>
          )}

          {stats.alertasActivas > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium text-orange-700">{stats.alertasActivas}</span>
              <span className="text-xs text-orange-600">alertas</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Quick filter */}
          <Select
            value={filtros.tipo || 'ambos'}
            onValueChange={(value) => updateFilter('tipo', value)}
          >
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ambos">Todos</SelectItem>
              <SelectItem value="lista">Solo Listas</SelectItem>
              <SelectItem value="pedido">Solo Pedidos</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            disabled={loading}
            className="h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Actualizar</span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                disabled={exporting || !timelineData?.items?.length}
                className="h-8"
              >
                {exporting ? (
                  <RefreshCw className="h-3.5 w-3.5 mr-1 animate-spin" />
                ) : (
                  <Download className="h-3.5 w-3.5 mr-1" />
                )}
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportExcel}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar a Excel
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Alertas resumen */}
      {stats.alertasActivas > 0 && timelineData?.alertas && (
        <div className="flex items-center gap-2 p-3 bg-orange-50 border border-orange-200 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-orange-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-orange-800">
              {stats.alertasActivas} alertas activas
            </span>
            <span className="text-sm text-orange-600 ml-2">
              {timelineData.alertas.filter(a => a.prioridad === 'alta').length > 0 && (
                <Badge variant="destructive" className="text-[10px] h-4 mr-1">
                  {timelineData.alertas.filter(a => a.prioridad === 'alta').length} críticas
                </Badge>
              )}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-orange-700 hover:text-orange-900 hover:bg-orange-100"
            onClick={() => updateFilter('soloAlertas', filtros.soloAlertas ? undefined : 'true')}
          >
            {filtros.soloAlertas ? (
              <>
                <X className="h-3.5 w-3.5 mr-1" />
                Mostrar todos
              </>
            ) : (
              <>
                <Filter className="h-3.5 w-3.5 mr-1" />
                Ver solo alertas
              </>
            )}
          </Button>
        </div>
      )}

      {/* Timeline View */}
      <div className="border rounded-lg bg-white overflow-hidden">
        {loading ? (
          <div className="h-[600px] flex items-center justify-center">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 mx-auto text-muted-foreground animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Cargando timeline...</p>
            </div>
          </div>
        ) : (
          <TimelineView
            proyectoId={filtros.proyectoId}
            allowEdit={false}
            showFilters={true}
            showCoherencePanel={true}
            className="min-h-[600px]"
            defaultFilters={{
              fechaInicio: filtros.fechaInicio,
              fechaFin: filtros.fechaFin,
              proyectoIds: filtros.proyectoId ? [filtros.proyectoId] : [],
              tipoVista: filtros.vista || 'gantt',
              agrupacion: filtros.agrupacion || 'proyecto',
              soloAlertas: filtros.soloAlertas
            }}
          />
        )}
      </div>

      {/* Monto total */}
      {stats.montoTotal > 0 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <span className="text-muted-foreground">Monto total en timeline:</span>
          <span className="font-semibold text-emerald-600">
            $ {stats.montoTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
          </span>
        </div>
      )}
    </div>
  )
}
