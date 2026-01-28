'use client'

/**
 * TimelinePageContent - Client component for Timeline page
 * Simplified: delegates most UI to TimelineView component
 */

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import {
  Download,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { TimelineView } from '@/components/finanzas/aprovisionamiento/TimelineView'
import type { GanttItem } from '@/types/aprovisionamiento'

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
  const [exporting, setExporting] = useState(false)
  const [timelineItems, setTimelineItems] = useState<GanttItem[]>([])

  // Capture timeline data for export
  const handleTimelineDataChange = useCallback((items: GanttItem[]) => {
    setTimelineItems(items)
  }, [])

  // Export to Excel
  const handleExportExcel = async () => {
    if (!timelineItems?.length) {
      toast.error('No hay datos para exportar')
      return
    }

    try {
      setExporting(true)

      const exportData = timelineItems.map(item => ({
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
      }))

      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(exportData)
      ws['!cols'] = [
        { wch: 8 }, { wch: 15 }, { wch: 30 }, { wch: 25 },
        { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 15 },
        { wch: 12 }, { wch: 12 }
      ]
      XLSX.utils.book_append_sheet(wb, ws, 'Timeline')

      const fecha = new Date().toISOString().split('T')[0]
      XLSX.writeFile(wb, `timeline-aprovisionamiento-${fecha}.xlsx`)
      toast.success('Timeline exportado correctamente')
    } catch (error) {
      console.error('Error exporting:', error)
      toast.error('Error al exportar')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-3">
      {/* Export button - positioned absolutely or in TimelineView header */}
      <div className="flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={exporting || !timelineItems?.length}
              className="h-8"
            >
              {exporting ? (
                <RefreshCw className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5 mr-1.5" />
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

      {/* Timeline View - handles all the UI */}
      <TimelineView
        proyectoId={initialFilters.proyectoId}
        allowEdit={false}
        showFilters={true}
        showCoherencePanel={true}
        className="min-h-[calc(100vh-180px)]"
        defaultFilters={{
          fechaInicio: initialFilters.fechaInicio,
          fechaFin: initialFilters.fechaFin,
          proyectoIds: initialFilters.proyectoId ? [initialFilters.proyectoId] : [],
          tipoVista: initialFilters.vista || 'gantt',
          agrupacion: initialFilters.agrupacion || 'proyecto',
          soloAlertas: initialFilters.soloAlertas
        }}
      />
    </div>
  )
}
