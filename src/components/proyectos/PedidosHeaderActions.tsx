'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileSpreadsheet, Loader2, LayoutList, LayoutGrid } from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import type { PedidoEquipo } from '@/types/modelos'
import { cn } from '@/lib/utils'

export type ViewMode = 'table' | 'cards'

interface Props {
  pedidos: PedidoEquipo[]
  viewMode: ViewMode
  onViewModeChange: (mode: ViewMode) => void
}

export function PedidosHeaderActions({ pedidos, viewMode, onViewModeChange }: Props) {
  const [exporting, setExporting] = useState(false)

  const handleExportExcel = async () => {
    if (pedidos.length === 0) {
      toast.warning('No hay pedidos para exportar')
      return
    }

    setExporting(true)
    try {
      // Preparar datos para Excel
      const data = pedidos.map(pedido => {
        const montoTotal = pedido.items?.reduce((sum: number, item: any) =>
          sum + (item.costoTotal || (item.cantidadPedida * (item.precioUnitario || 0))), 0) || 0

        return {
          'Código': pedido.codigo,
          'Proyecto': (pedido as any).proyecto?.codigo || 'N/A',
          'Proyecto Nombre': (pedido as any).proyecto?.nombre || '',
          'Proveedor': (pedido as any).proveedor?.nombre || 'N/A',
          'Estado': formatEstado(pedido.estado),
          'Fecha Pedido': pedido.fechaPedido ? format(new Date(pedido.fechaPedido), 'dd/MM/yyyy') : '-',
          'Fecha Entrega Est.': pedido.fechaEntregaEstimada ? format(new Date(pedido.fechaEntregaEstimada), 'dd/MM/yyyy') : '-',
          'Fecha Entrega Real': pedido.fechaEntregaReal ? format(new Date(pedido.fechaEntregaReal), 'dd/MM/yyyy') : '-',
          'Monto Total (USD)': montoTotal,
          'Cantidad Items': pedido.items?.length || 0,
          'Observaciones': pedido.observacion || ''
        }
      })

      // Crear libro Excel
      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Pedidos')

      // Ajustar ancho de columnas
      const colWidths = [
        { wch: 12 }, // Código
        { wch: 12 }, // Proyecto
        { wch: 30 }, // Proyecto Nombre
        { wch: 25 }, // Proveedor
        { wch: 12 }, // Estado
        { wch: 12 }, // Fecha Pedido
        { wch: 14 }, // Fecha Entrega Est.
        { wch: 14 }, // Fecha Entrega Real
        { wch: 15 }, // Monto Total
        { wch: 12 }, // Cantidad Items
        { wch: 30 }, // Observaciones
      ]
      ws['!cols'] = colWidths

      // Generar archivo
      const fileName = `pedidos-equipos-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`
      XLSX.writeFile(wb, fileName)

      toast.success('Excel exportado correctamente')
    } catch (error) {
      console.error('Error al exportar:', error)
      toast.error('Error al exportar Excel')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {/* View Toggle */}
      <div className="flex items-center border rounded-md">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 px-2 rounded-r-none',
            viewMode === 'table' && 'bg-gray-100'
          )}
          onClick={() => onViewModeChange('table')}
          title="Vista tabla"
        >
          <LayoutList className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            'h-8 px-2 rounded-l-none border-l',
            viewMode === 'cards' && 'bg-gray-100'
          )}
          onClick={() => onViewModeChange('cards')}
          title="Vista cards"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
      </div>

      {/* Export Excel */}
      <Button
        variant="outline"
        size="sm"
        className="h-8"
        onClick={handleExportExcel}
        disabled={exporting}
      >
        {exporting ? (
          <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
        ) : (
          <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5 text-green-600" />
        )}
        Excel
      </Button>
    </div>
  )
}

function formatEstado(estado: string): string {
  const estados: Record<string, string> = {
    borrador: 'Borrador',
    enviado: 'Enviado',
    confirmado: 'Confirmado',
    parcial: 'Parcial',
    en_transito: 'En Tránsito',
    entregado: 'Entregado',
    atendido: 'Atendido',
    cancelado: 'Cancelado',
    retrasado: 'Retrasado'
  }
  return estados[estado] || estado
}
