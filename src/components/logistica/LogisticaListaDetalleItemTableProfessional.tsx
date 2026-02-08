'use client'

import { useState } from 'react'
import { ListaEquipoItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import LogisticaCotizacionSelector from './LogisticaCotizacionSelector'
import {
  Trophy,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Package,
  X,
  Zap,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  items: ListaEquipoItem[]
  onUpdated?: () => void
}

export default function LogisticaListaDetalleItemTableProfessional({ items, onUpdated }: Props) {
  const [searchTerm, setSearchTerm] = useState('')
  const [isAutoSelecting, setIsAutoSelecting] = useState(false)
  const [selectorModal, setSelectorModal] = useState<{ open: boolean; item: ListaEquipoItem | null }>({
    open: false,
    item: null
  })

  const openSelectorModal = (item: ListaEquipoItem) => {
    setSelectorModal({ open: true, item })
  }

  const closeSelectorModal = () => {
    setSelectorModal({ open: false, item: null })
  }

  // Auto-seleccionar mejor precio para items pendientes
  const handleAutoSelectBestPrices = async () => {
    const pendientes = items.filter(item => {
      const cots = item.cotizaciones || []
      const disponibles = cots.filter((c: any) => {
        const estado = c.cotizacion?.estado || c.estado
        return estado !== 'rechazado' && c.precioUnitario && c.precioUnitario > 0
      })
      return !item.cotizacionSeleccionadaId && disponibles.length > 0
    })

    if (pendientes.length === 0) {
      toast.info('No hay items pendientes con cotizaciones disponibles')
      return
    }

    setIsAutoSelecting(true)
    let seleccionados = 0
    let errores = 0

    for (const item of pendientes) {
      const cots = (item.cotizaciones || []).filter((c: any) => {
        const estado = c.cotizacion?.estado || c.estado
        return estado !== 'rechazado' && c.precioUnitario && c.precioUnitario > 0
      })
      // Find cheapest
      const mejor = cots.reduce((best: any, current: any) =>
        !best || (current.precioUnitario < best.precioUnitario) ? current : best
      , null)

      if (!mejor) continue

      try {
        const res = await fetch(`/api/lista-equipo-item/${item.id}/seleccionar-cotizacion`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cotizacionProveedorItemId: mejor.id }),
        })
        if (res.ok) seleccionados++
        else errores++
      } catch {
        errores++
      }
    }

    setIsAutoSelecting(false)

    if (seleccionados > 0) {
      toast.success(`Mejor precio seleccionado en ${seleccionados} items`)
      onUpdated?.()
    }
    if (errores > 0) {
      toast.error(`${errores} items no se pudieron actualizar`)
    }
  }

  // Calcular estadísticas del ítem
  const getItemStats = (item: ListaEquipoItem) => {
    const cotizaciones = item.cotizaciones || []
    const cotizacionesCount = cotizaciones.length
    const cotizacionesDisponibles = cotizaciones.filter((c: any) => {
      const estado = c.cotizacion?.estado || c.estado
      return estado !== 'rechazado' && c.precioUnitario && c.precioUnitario > 0
    }).length
    const hasSelection = !!item.cotizacionSeleccionadaId
    const selectedCot = cotizaciones.find((c: any) => c.id === item.cotizacionSeleccionadaId)

    const preciosDisponibles = cotizaciones
      .filter((c: any) => {
        const estado = c.cotizacion?.estado || c.estado
        return estado !== 'rechazado' && c.precioUnitario && c.precioUnitario > 0
      })
      .map((c: any) => c.precioUnitario!)
    const mejorPrecio = preciosDisponibles.length > 0 ? Math.min(...preciosDisponibles) : null
    const isOptimalSelection = selectedCot && mejorPrecio && (selectedCot as any).precioUnitario === mejorPrecio

    return {
      cotizacionesCount,
      cotizacionesDisponibles,
      hasSelection,
      selectedCot,
      mejorPrecio,
      isOptimalSelection,
      needsAttention: cotizacionesCount > 0 && !hasSelection && cotizacionesDisponibles > 0
    }
  }

  // Filtrar ítems
  const filteredItems = items.filter((item) => {
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesCodigo = item.codigo?.toLowerCase().includes(searchLower)
      const matchesDescripcion = item.descripcion?.toLowerCase().includes(searchLower)
      if (!matchesCodigo && !matchesDescripcion) return false
    }
    return true
  })

  // Estadísticas globales
  const stats = {
    total: items.length,
    conSeleccion: items.filter(item => getItemStats(item).hasSelection).length,
    pendientes: items.filter(item => getItemStats(item).needsAttention).length,
    costoTotal: items.reduce((sum, item) => sum + (item.costoElegido ?? 0), 0)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value)
  }

  return (
    <div className="bg-white rounded-lg border">
      {/* Header con filtros y stats */}
      <div className="px-4 py-3 border-b bg-gray-50/50">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-blue-600" />
            <span className="text-sm font-medium">Items de la Lista</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secondary" className="text-[10px] h-5">
              {stats.conSeleccion} seleccionados
            </Badge>
            <Badge variant="outline" className="text-[10px] h-5 text-yellow-700 bg-yellow-50 border-yellow-200">
              {stats.pendientes} pendientes
            </Badge>
            <Badge className="text-[10px] h-5 bg-emerald-600">
              {formatCurrency(stats.costoTotal)}
            </Badge>
            {stats.pendientes > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleAutoSelectBestPrices}
                disabled={isAutoSelecting}
                className="h-6 text-[10px] px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                {isAutoSelecting ? (
                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                ) : (
                  <Zap className="h-3 w-3 mr-1" />
                )}
                Auto-seleccionar ({stats.pendientes})
              </Button>
            )}
          </div>
        </div>

        {/* Búsqueda */}
        {items.length > 5 && (
          <div className="mt-2 relative max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-7 text-xs pl-8 pr-8"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabla */}
      {filteredItems.length > 0 ? (
        <div>
          <table className="w-full text-xs">
            <thead className="bg-gray-50">
              <tr className="border-b">
                <th className="px-3 py-2 text-left font-medium text-gray-600 w-8"></th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Código</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Descripción</th>
                <th className="px-3 py-2 text-left font-medium text-gray-600">Proveedor</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">Unidad</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">Cant.</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">P.Unit</th>
                <th className="px-3 py-2 text-right font-medium text-gray-600">Total</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">Entrega</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">Cots.</th>
                <th className="px-3 py-2 text-center font-medium text-gray-600">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((item) => {
                const itemStats = getItemStats(item)

                // Determinar estado visual
                let rowClass = ''
                let statusIcon = null
                let statusColor = ''

                if (itemStats.hasSelection && itemStats.isOptimalSelection) {
                  rowClass = 'bg-green-50/50'
                  statusIcon = <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  statusColor = 'text-green-600'
                } else if (itemStats.hasSelection) {
                  rowClass = 'bg-blue-50/50'
                  statusIcon = <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                  statusColor = 'text-blue-600'
                } else if (itemStats.needsAttention) {
                  rowClass = 'bg-yellow-50/50'
                  statusIcon = <AlertTriangle className="h-3.5 w-3.5 text-yellow-600" />
                  statusColor = 'text-yellow-600'
                } else if (itemStats.cotizacionesCount === 0) {
                  rowClass = 'bg-gray-50/30'
                  statusIcon = <Package className="h-3.5 w-3.5 text-gray-400" />
                  statusColor = 'text-gray-400'
                }

                return (
                  <tr key={item.id} className={`border-b hover:bg-gray-50/50 ${rowClass}`}>
                    {/* Estado */}
                    <td className="px-3 py-2 text-center">
                      {statusIcon}
                    </td>

                    {/* Código */}
                    <td className="px-3 py-2 font-medium text-gray-900">
                      {item.codigo}
                    </td>

                    {/* Descripción */}
                    <td className="px-3 py-2 max-w-[180px]">
                      <span className="truncate block" title={item.descripcion}>
                        {item.descripcion}
                      </span>
                    </td>

                    {/* Proveedor */}
                    <td className="px-3 py-2 max-w-[100px]">
                      <span className="truncate block text-gray-600" title={(item as any).proveedor?.nombre || ''}>
                        {(item as any).proveedor?.nombre || '—'}
                      </span>
                    </td>

                    {/* Unidad */}
                    <td className="px-3 py-2 text-center text-gray-600">
                      {item.unidad}
                    </td>

                    {/* Cantidad */}
                    <td className="px-3 py-2 text-center font-medium">
                      {item.cantidad}
                    </td>

                    {/* Precio unitario */}
                    <td className="px-3 py-2 text-right">
                      <span className={`font-medium ${statusColor || 'text-gray-900'}`}>
                        {item.precioElegido ? formatCurrency(item.precioElegido) : '—'}
                      </span>
                      {itemStats.mejorPrecio && item.precioElegido && item.precioElegido > itemStats.mejorPrecio && (
                        <div className="text-[9px] text-yellow-600">
                          Mejor: {formatCurrency(itemStats.mejorPrecio)}
                        </div>
                      )}
                    </td>

                    {/* Total */}
                    <td className="px-3 py-2 text-right font-medium text-emerald-600">
                      {item.costoElegido ? formatCurrency(item.costoElegido) : '—'}
                    </td>

                    {/* Entrega */}
                    <td className="px-3 py-2 text-center">
                      {itemStats.selectedCot?.tiempoEntregaDias ? (
                        <span className="text-gray-700">{itemStats.selectedCot.tiempoEntregaDias}d</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>

                    {/* Cotizaciones */}
                    <td className="px-3 py-2 text-center">
                      {itemStats.cotizacionesCount > 0 ? (
                        <Badge
                          variant="outline"
                          className={`text-[10px] h-5 ${
                            itemStats.hasSelection
                              ? 'bg-green-50 text-green-700 border-green-200'
                              : itemStats.cotizacionesDisponibles > 0
                              ? 'bg-yellow-50 text-yellow-700 border-yellow-200'
                              : 'bg-gray-50 text-gray-600 border-gray-200'
                          }`}
                        >
                          {itemStats.cotizacionesDisponibles}/{itemStats.cotizacionesCount}
                        </Badge>
                      ) : (
                        <span className="text-[10px] text-gray-400">0</span>
                      )}
                    </td>

                    {/* Acción */}
                    <td className="px-3 py-2 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openSelectorModal(item)}
                        disabled={itemStats.cotizacionesCount === 0}
                        className="h-6 text-[10px] px-2"
                      >
                        {itemStats.hasSelection ? (
                          <>
                            <Trophy className="h-3 w-3 mr-1 text-yellow-500" />
                            Cambiar
                          </>
                        ) : itemStats.cotizacionesCount > 0 ? (
                          'Elegir'
                        ) : (
                          'Sin cot.'
                        )}
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Package className="h-10 w-10 text-gray-300 mb-3" />
          <p className="text-sm text-muted-foreground">
            {searchTerm ? 'No se encontraron items' : 'No hay items en esta lista'}
          </p>
          {searchTerm && (
            <Button
              variant="link"
              size="sm"
              onClick={() => setSearchTerm('')}
              className="mt-2 h-6 text-xs"
            >
              Limpiar búsqueda
            </Button>
          )}
        </div>
      )}

      {/* Footer con resumen */}
      {filteredItems.length > 0 && (
        <div className="px-4 py-3 border-t bg-gray-50">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-muted-foreground">Óptimo:</span>
                <span className="font-medium">
                  {items.filter(i => getItemStats(i).isOptimalSelection).length}
                </span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="text-muted-foreground">Seleccionado:</span>
                <span className="font-medium">{stats.conSeleccion}</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-muted-foreground">Pendiente:</span>
                <span className="font-medium">{stats.pendientes}</span>
              </span>
            </div>
            <div className="font-semibold text-emerald-600">
              Total: {formatCurrency(stats.costoTotal)}
            </div>
          </div>
        </div>
      )}

      {/* Modal para selección */}
      <Dialog open={selectorModal.open} onOpenChange={closeSelectorModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">
              Seleccionar Cotización
            </DialogTitle>
          </DialogHeader>
          {selectorModal.item && (
            <LogisticaCotizacionSelector
              item={selectorModal.item}
              onUpdated={() => {
                onUpdated?.()
                closeSelectorModal()
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
