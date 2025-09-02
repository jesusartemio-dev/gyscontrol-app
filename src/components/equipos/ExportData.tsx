'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Download, FileText, Table, Calendar } from 'lucide-react'
import { PedidoEquipo } from '@/types'
import { toast } from 'sonner'

interface ExportDataProps {
  data: PedidoEquipo[]
  filters: any
  className?: string
}

export default function ExportData({ data, filters, className }: ExportDataProps) {
  const [isExporting, setIsExporting] = useState(false)

  // Generate CSV content
  const generateCSV = (includeOCData: boolean = false) => {
    const headers = [
      'ID',
      'Fecha Creación',
      'Estado',
      'Responsable',
      'Proyecto',
      'Total Items',
    ]

    if (includeOCData) {
      headers.push(
        'Items con OC',
        'OC Vencidas',
        'OC Vigentes',
        'Próxima OC'
      )
    }

    const csvContent = [
      headers.join(','),
      ...data.map(pedido => {
        const basicData = [
          pedido.id,
          new Date(pedido.fechaPedido).toLocaleDateString('es-ES'),
          pedido.estado,
          pedido.responsable?.name || 'N/A',
          'N/A', // Proyecto no está disponible directamente
          pedido.items?.length || 0,
        ]

        if (includeOCData) {
          const itemsWithOC = pedido.items?.filter(item => item.fechaOrdenCompraRecomendada) || []
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          
          const overdueOC = itemsWithOC.filter(item => {
            const ocDate = new Date(item.fechaOrdenCompraRecomendada!)
            ocDate.setHours(0, 0, 0, 0)
            return ocDate < today
          }).length
          
          const currentOC = itemsWithOC.length - overdueOC
          
          const nextOC = itemsWithOC
            .map(item => new Date(item.fechaOrdenCompraRecomendada!))
            .filter(date => date >= today)
            .sort((a, b) => a.getTime() - b.getTime())[0]

          basicData.push(
            itemsWithOC.length,
            overdueOC,
            currentOC,
            nextOC ? nextOC.toLocaleDateString('es-ES') : 'N/A'
          )
        }

        return basicData.join(',')
      })
    ].join('\n')

    return csvContent
  }

  // Download file
  const downloadFile = (content: string, filename: string, type: string) => {
    const blob = new Blob([content], { type })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  // Export handlers
  const handleExportBasic = async () => {
    setIsExporting(true)
    try {
      const csv = generateCSV(false)
      const timestamp = new Date().toISOString().split('T')[0]
      downloadFile(csv, `pedidos-equipos-${timestamp}.csv`, 'text/csv')
      toast.success('Datos exportados correctamente')
    } catch (error) {
      toast.error('Error al exportar los datos')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportWithOC = async () => {
    setIsExporting(true)
    try {
      const csv = generateCSV(true)
      const timestamp = new Date().toISOString().split('T')[0]
      downloadFile(csv, `pedidos-equipos-oc-${timestamp}.csv`, 'text/csv')
      toast.success('Datos con información de OC exportados correctamente')
    } catch (error) {
      toast.error('Error al exportar los datos')
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportSummary = async () => {
    setIsExporting(true)
    try {
      // Generate summary report
      const today = new Date()
      const summary = {
        fecha_reporte: today.toLocaleDateString('es-ES'),
        total_pedidos: data.length,
        por_estado: {
          borradores: data.filter(p => p.estado === 'borrador').length,
          enviados: data.filter(p => p.estado === 'enviado').length,
          atendidos: data.filter(p => p.estado === 'atendido').length,
          entregados: data.filter(p => p.estado === 'entregado').length,
          parciales: data.filter(p => p.estado === 'parcial').length,
        },
        filtros_aplicados: Object.entries(filters)
          .filter(([_, value]) => value && value !== '__ALL__')
          .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
      }

      const jsonContent = JSON.stringify(summary, null, 2)
      const timestamp = new Date().toISOString().split('T')[0]
      downloadFile(jsonContent, `resumen-pedidos-${timestamp}.json`, 'application/json')
      toast.success('Resumen exportado correctamente')
    } catch (error) {
      toast.error('Error al exportar el resumen')
    } finally {
      setIsExporting(false)
    }
  }

  if (data.length === 0) {
    return null
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={isExporting}
          className={className}
        >
          <Download className="w-4 h-4 mr-2" />
          {isExporting ? 'Exportando...' : 'Exportar'}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={handleExportBasic}>
          <Table className="w-4 h-4 mr-2" />
          Datos básicos (CSV)
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportWithOC}>
          <Calendar className="w-4 h-4 mr-2" />
          Con información de OC (CSV)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExportSummary}>
          <FileText className="w-4 h-4 mr-2" />
          Resumen ejecutivo (JSON)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}