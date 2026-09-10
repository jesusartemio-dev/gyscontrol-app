'use client'

import { useState, useEffect, useMemo, Fragment } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { Search, Loader2, Wrench, DollarSign, Layers, Copy, Check, FileSpreadsheet, Info } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import * as XLSX from 'xlsx'
import { format } from 'date-fns'
import {
  obtenerCotizacionServicioItemsConsolidado,
  buscarCotizacionServicioItems,
  type CotizacionServicioItemBusqueda,
} from '@/lib/services/cotizacionServicioItem'

const ESTADO_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
}

interface ConsolidadoServicioItem {
  groupKey: string
  nombre: string
  descripcion: string
  recursoNombre: string
  unidadServicioNombre: string
  cantidadTotal: number
  horaTotalTotal: number
  costoClienteTotal: number
  costoInternoTotal: number
  origenes: {
    cotizacionId: string
    cotizacionCodigo: string
    clienteNombre: string
    cantidad: number
  }[]
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount)
}

export function CotizacionServicioConsolidadoView() {
  const [items, setItems] = useState<CotizacionServicioItemBusqueda[]>([])
  const [totalGeneral, setTotalGeneral] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRecurso, setSelectedRecurso] = useState('todos')
  const [selectedEstado, setSelectedEstado] = useState('all')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const estadoParam = selectedEstado !== 'all' ? selectedEstado : undefined
        const [vinculados, totalRes] = await Promise.all([
          obtenerCotizacionServicioItemsConsolidado({ estado: estadoParam }),
          buscarCotizacionServicioItems({ page: 1, limit: 1, estado: estadoParam }),
        ])
        setItems(vinculados)
        setTotalGeneral(totalRes.pagination.total)
      } catch {
        toast.error('Error al cargar el consolidado de servicios')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [selectedEstado])

  // Consolidation logic — solo ítems vinculados al catálogo (catalogoServicioId siempre presente)
  const consolidated = useMemo(() => {
    const groupMap = new Map<string, ConsolidadoServicioItem>()

    for (const item of items) {
      const groupKey = item.catalogoServicioId!

      if (!groupMap.has(groupKey)) {
        groupMap.set(groupKey, {
          groupKey,
          nombre: item.nombre || '',
          descripcion: item.descripcion || '',
          recursoNombre: item.recursoNombre || 'SIN-RECURSO',
          unidadServicioNombre: item.unidadServicioNombre || '',
          cantidadTotal: 0,
          horaTotalTotal: 0,
          costoClienteTotal: 0,
          costoInternoTotal: 0,
          origenes: [],
        })
      }

      const group = groupMap.get(groupKey)!
      group.cantidadTotal += item.cantidad || 0
      group.horaTotalTotal += item.horaTotal || 0
      group.costoClienteTotal += item.costoCliente || 0
      group.costoInternoTotal += item.costoInterno || 0

      const cotizacion = item.cotizacionServicio.cotizacion
      const existingOrigen = group.origenes.find(o => o.cotizacionId === cotizacion.id)
      if (existingOrigen) {
        existingOrigen.cantidad += item.cantidad || 0
      } else {
        group.origenes.push({
          cotizacionId: cotizacion.id,
          cotizacionCodigo: cotizacion.codigo || 'Sin codigo',
          clienteNombre: cotizacion.cliente?.nombre || 'Sin cliente',
          cantidad: item.cantidad || 0,
        })
      }
    }

    return Array.from(groupMap.values())
  }, [items])

  const recursos = useMemo(() => {
    const set = new Set<string>()
    for (const item of consolidated) set.add(item.recursoNombre)
    return Array.from(set).sort()
  }, [consolidated])

  const filteredConsolidated = useMemo(() => {
    let result = consolidated

    if (selectedRecurso !== 'todos') {
      result = result.filter(item => item.recursoNombre === selectedRecurso)
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(item =>
        item.nombre.toLowerCase().includes(search) ||
        item.descripcion.toLowerCase().includes(search) ||
        item.recursoNombre.toLowerCase().includes(search)
      )
    }

    return result.sort((a, b) => {
      const cmp = a.recursoNombre.localeCompare(b.recursoNombre)
      if (cmp !== 0) return cmp
      return a.nombre.localeCompare(b.nombre)
    })
  }, [consolidated, selectedRecurso, searchTerm])

  const groupedByRecurso = useMemo(() => {
    const groups: { recurso: string; items: ConsolidadoServicioItem[] }[] = []
    let current = ''
    for (const item of filteredConsolidated) {
      if (item.recursoNombre !== current) {
        current = item.recursoNombre
        groups.push({ recurso: current, items: [] })
      }
      groups[groups.length - 1].items.push(item)
    }
    return groups
  }, [filteredConsolidated])

  const sinVincular = Math.max(0, totalGeneral - items.length)

  const stats = useMemo(() => ({
    itemsUnicos: filteredConsolidated.length,
    recursos: new Set(filteredConsolidated.map(i => i.recursoNombre)).size,
    costoClienteTotal: filteredConsolidated.reduce((sum, i) => sum + i.costoClienteTotal, 0),
  }), [filteredConsolidated])

  const handleCopyToClipboard = async () => {
    const header = 'Nombre\tDescripcion\tRecurso\tUnidad\tCantidad\tHoras\tCosto Cliente\tCosto Interno\tOrigenes'
    const rows = filteredConsolidated.map(item => {
      const origenes = item.origenes.map(o => `${o.cotizacionCodigo}(${o.cantidad})`).join(', ')
      return `${item.nombre}\t${item.descripcion}\t${item.recursoNombre}\t${item.unidadServicioNombre}\t${item.cantidadTotal}\t${item.horaTotalTotal.toFixed(1)}\t${item.costoClienteTotal.toFixed(2)}\t${item.costoInternoTotal.toFixed(2)}\t${origenes}`
    })
    const text = [header, ...rows].join('\n')

    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      toast.success('Tabla copiada al portapapeles')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Error al copiar')
    }
  }

  const handleExportExcel = () => {
    if (filteredConsolidated.length === 0) {
      toast.warning('No hay items para exportar')
      return
    }

    try {
      const data = filteredConsolidated.map(item => ({
        'Nombre': item.nombre,
        'Descripcion': item.descripcion,
        'Recurso': item.recursoNombre,
        'Unidad': item.unidadServicioNombre,
        'Cantidad': item.cantidadTotal,
        'Horas': Number(item.horaTotalTotal.toFixed(1)),
        'Costo Cliente': Number(item.costoClienteTotal.toFixed(2)),
        'Costo Interno': Number(item.costoInternoTotal.toFixed(2)),
        'Origenes': item.origenes.map(o => `${o.cotizacionCodigo}(${o.cantidad})`).join(', '),
      }))

      const ws = XLSX.utils.json_to_sheet(data)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Consolidado')
      ws['!cols'] = [
        { wch: 30 }, { wch: 40 }, { wch: 18 }, { wch: 10 }, { wch: 10 },
        { wch: 10 }, { wch: 14 }, { wch: 14 }, { wch: 50 },
      ]

      const fileName = `consolidado-servicios-cotizados-${format(new Date(), 'yyyyMMdd-HHmm')}.xlsx`
      XLSX.writeFile(wb, fileName)
      toast.success('Excel exportado correctamente')
    } catch (error) {
      console.error('Error al exportar:', error)
      toast.error('Error al exportar Excel')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Stats Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline" className="text-xs font-medium">
          <Layers className="h-3 w-3 mr-1" />
          {stats.itemsUnicos} servicios únicos
        </Badge>
        <Badge variant="outline" className="text-xs font-medium">
          {stats.recursos} recursos
        </Badge>
        <div className="hidden md:flex items-center gap-1 text-emerald-600 text-xs">
          <DollarSign className="h-3.5 w-3.5" />
          <span className="font-semibold">{formatCurrency(stats.costoClienteTotal)}</span>
        </div>
        {sinVincular > 0 && (
          <div className="flex items-center gap-1 text-xs text-amber-600" title="Ítems cotizados sin vincular a un servicio del catálogo — no entran en este consolidado">
            <Info className="h-3.5 w-3.5" />
            <span>{sinVincular} ítems sin vincular al catálogo (no incluidos)</span>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nombre, descripción, recurso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        <Select value={selectedEstado} onValueChange={setSelectedEstado}>
          <SelectTrigger className="w-full sm:w-40 h-9">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(ESTADO_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedRecurso} onValueChange={setSelectedRecurso}>
          <SelectTrigger className="w-full sm:w-44 h-9">
            <SelectValue placeholder="Todos los recursos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los recursos</SelectItem>
            {recursos.map((r) => (
              <SelectItem key={r} value={r}>{r}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={handleCopyToClipboard}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copiado' : 'Copiar'}
        </Button>

        <Button variant="outline" size="sm" className="h-9 text-xs gap-1.5" onClick={handleExportExcel}>
          <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />
          Excel
        </Button>
      </div>

      {/* Table */}
      {filteredConsolidated.length === 0 ? (
        <div className="text-center py-12">
          <Wrench className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No se encontraron servicios vinculados al catálogo para consolidar</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-white">
                <TableHead className="text-xs font-medium">Nombre</TableHead>
                <TableHead className="text-xs font-medium hidden sm:table-cell">Unidad</TableHead>
                <TableHead className="text-xs font-medium text-center w-20">Cantidad</TableHead>
                <TableHead className="text-xs font-medium text-right w-20">Horas</TableHead>
                <TableHead className="text-xs font-medium text-right w-24">Costo Cliente</TableHead>
                <TableHead className="text-xs font-medium text-right hidden sm:table-cell w-24">Costo Interno</TableHead>
                <TableHead className="text-xs font-medium">Cotizaciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedByRecurso.map((group) => (
                <Fragment key={`rec-${group.recurso}`}>
                  <TableRow className="bg-blue-50/80 hover:bg-blue-50/80 border-l-[3px] border-l-blue-500">
                    <TableCell colSpan={7} className="py-2 px-4">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded bg-blue-100 flex items-center justify-center">
                          <Layers className="h-3 w-3 text-blue-600" />
                        </div>
                        <span className="text-xs font-bold text-blue-900 uppercase tracking-wide">{group.recurso}</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 bg-blue-100 text-blue-700 border-0">
                          {group.items.length} items
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                  {group.items.map((item, idx) => (
                    <TableRow key={item.groupKey} className={cn(idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30')}>
                      <TableCell className="text-xs max-w-[260px]">
                        <span className="font-medium line-clamp-1">{item.nombre}</span>
                        <span className="block text-muted-foreground line-clamp-1">{item.descripcion}</span>
                      </TableCell>
                      <TableCell className="text-xs hidden sm:table-cell text-muted-foreground">{item.unidadServicioNombre}</TableCell>
                      <TableCell className="text-center">
                        <span className="text-sm font-bold text-blue-700">{item.cantidadTotal}</span>
                      </TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">{item.horaTotalTotal.toFixed(1)}</TableCell>
                      <TableCell className="text-xs text-right font-medium text-emerald-600">
                        {formatCurrency(item.costoClienteTotal)}
                      </TableCell>
                      <TableCell className="text-xs text-right hidden sm:table-cell text-muted-foreground">
                        {formatCurrency(item.costoInternoTotal)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.origenes.map((origen) => (
                            <Link
                              key={origen.cotizacionId}
                              href={`/comercial/cotizaciones/${origen.cotizacionId}/servicios`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Badge
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 cursor-pointer hover:bg-blue-50 hover:border-blue-300 whitespace-nowrap"
                                title={origen.clienteNombre}
                              >
                                {origen.cotizacionCodigo} ({origen.cantidad})
                              </Badge>
                            </Link>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
