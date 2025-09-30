// ===================================================
// 📁 Archivo: LogisticaListaDetalleItemTableProfessional.tsx
// 📌 Descripción: Componente con vista Tabla y Card para ítems con selector de cotizaciones
// 📌 Características: Vista compacta, expansión inteligente, indicadores visuales, filtros
// ✍️ Autor: Sistema de IA
// 📅 Creado: 2025-01-27
// ===================================================

'use client'

import { useState } from 'react'
import { ListaEquipoItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import LogisticaCotizacionSelector from './LogisticaCotizacionSelector'
import {
  Trophy,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign,
  Grid3X3,
  List,
  Search,
  Filter
} from 'lucide-react'
import React from 'react'

interface Props {
  items: ListaEquipoItem[]
  onUpdated?: () => void
}

type ViewMode = 'table' | 'card'
type FilterStatus = 'all' | 'selected' | 'pending' | 'no-selection'

export default function LogisticaListaDetalleItemTableProfessional({ items, onUpdated }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('table')
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectorModal, setSelectorModal] = useState<{ open: boolean; item: ListaEquipoItem | null }>({
    open: false,
    item: null
  })

  // 🔄 Abrir modal del selector de cotizaciones
  const openSelectorModal = (item: ListaEquipoItem) => {
    setSelectorModal({ open: true, item })
  }

  // 🔄 Cerrar modal del selector
  const closeSelectorModal = () => {
    setSelectorModal({ open: false, item: null })
  }

  // 📊 Calcular estadísticas del ítem
  const getItemStats = (item: ListaEquipoItem) => {
    const cotizacionesCount = item.cotizaciones.length
    const cotizacionesDisponibles = item.cotizaciones.filter(c => c.estado === 'cotizado').length
    const hasSelection = !!item.cotizacionSeleccionadaId
    const selectedCot = item.cotizaciones.find(c => c.id === item.cotizacionSeleccionadaId)
    
    // Calcular mejor precio disponible
    const preciosDisponibles = item.cotizaciones
      .filter(c => c.estado === 'cotizado' && c.precioUnitario)
      .map(c => c.precioUnitario!)
    const mejorPrecio = preciosDisponibles.length > 0 ? Math.min(...preciosDisponibles) : null
    
    // Verificar si la selección actual es óptima
    const isOptimalSelection = selectedCot && mejorPrecio && selectedCot.precioUnitario === mejorPrecio
    
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

  // 🎨 Obtener clase CSS para la fila según el estado
  const getRowClassName = (item: ListaEquipoItem) => {
    const stats = getItemStats(item)
    
    if (stats.hasSelection && stats.isOptimalSelection) {
      return 'bg-green-50 border-l-4 border-l-green-500'
    } else if (stats.hasSelection) {
      return 'bg-blue-50 border-l-4 border-l-blue-500'
    } else if (stats.needsAttention) {
      return 'bg-yellow-50 border-l-4 border-l-yellow-500'
    } else if (stats.cotizacionesCount === 0) {
      return 'bg-gray-50 border-l-4 border-l-gray-300'
    }
    return 'hover:bg-gray-50'
  }

  // 🏷️ Obtener indicador de estado
  const getStatusIndicator = (item: ListaEquipoItem) => {
    const stats = getItemStats(item)
    
    if (stats.hasSelection && stats.isOptimalSelection) {
      return {
        icon: CheckCircle2,
        color: 'text-green-600',
        bgColor: 'bg-green-100',
        label: 'Óptimo'
      }
    } else if (stats.hasSelection) {
      return {
        icon: CheckCircle2,
        color: 'text-blue-600',
        bgColor: 'bg-blue-100',
        label: 'Seleccionado'
      }
    } else if (stats.needsAttention) {
      return {
        icon: AlertTriangle,
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-100',
        label: 'Pendiente'
      }
    } else if (stats.cotizacionesCount === 0) {
      return {
        icon: AlertTriangle,
        color: 'text-gray-500',
        bgColor: 'bg-gray-100',
        label: 'Sin cotizaciones'
      }
    }
    return null
  }

  // 🔍 Filtrar ítems según criterios
  const filteredItems = items.filter((item) => {
    const stats = getItemStats(item)

    // Filtro por estado
    if (filterStatus !== 'all') {
      switch (filterStatus) {
        case 'selected':
          if (!stats.hasSelection) return false
          break
        case 'pending':
          if (!stats.needsAttention) return false
          break
        case 'no-selection':
          if (stats.hasSelection || stats.cotizacionesCount === 0) return false
          break
      }
    }

    // Filtro por búsqueda
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase()
      const matchesCodigo = item.codigo?.toLowerCase().includes(searchLower)
      const matchesDescripcion = item.descripcion?.toLowerCase().includes(searchLower)
      if (!matchesCodigo && !matchesDescripcion) return false
    }

    return true
  })

  // 🎴 Componente de Vista Card
  const CardView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredItems.map((item) => {
        const stats = getItemStats(item)
        const statusIndicator = getStatusIndicator(item)

        return (
          <Card key={item.id} className={`transition-all duration-200 hover:shadow-lg ${getRowClassName(item)}`}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    {item.codigo}
                    {statusIndicator && (
                      <Badge variant="outline" className={`text-xs ${statusIndicator.bgColor} ${statusIndicator.color}`}>
                        <statusIndicator.icon className="h-3 w-3 mr-1" />
                        {statusIndicator.label}
                      </Badge>
                    )}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {item.descripcion}
                  </p>
                </div>
              </div>
            </CardHeader>

            <CardContent className="space-y-3">
              {/* Información básica */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Unidad:</span>
                  <div className="font-medium">{item.unidad}</div>
                </div>
                <div>
                  <span className="text-muted-foreground">Cantidad:</span>
                  <div className="font-medium">{item.cantidad}</div>
                </div>
              </div>

              {/* Información de precios */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Precio Elegido:</span>
                  <span className="font-semibold text-green-600">
                    ${(item.precioElegido ?? 0).toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Costo Total:</span>
                  <span className="font-bold text-lg">
                    ${(item.costoElegido ?? 0).toFixed(2)}
                  </span>
                </div>

                {stats.mejorPrecio && item.precioElegido && item.precioElegido > stats.mejorPrecio && (
                  <div className="flex items-center gap-1 text-xs text-yellow-600 bg-yellow-50 p-2 rounded">
                    <AlertTriangle className="h-3 w-3" />
                    Mejor precio disponible: ${stats.mejorPrecio.toFixed(2)}
                  </div>
                )}
              </div>

              {/* Tiempo de entrega */}
              {stats.selectedCot && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Entrega:
                  </span>
                  <div className="text-right">
                    <div className="font-medium">{stats.selectedCot.tiempoEntrega || 'N/A'}</div>
                    {stats.selectedCot.tiempoEntregaDias && (
                      <div className="text-xs text-muted-foreground">
                        ({stats.selectedCot.tiempoEntregaDias} días)
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Cotizaciones */}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Cotizaciones:</span>
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-xs">
                    {stats.cotizacionesCount} total
                  </Badge>
                  {stats.cotizacionesDisponibles > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {stats.cotizacionesDisponibles} disponibles
                    </Badge>
                  )}
                </div>
              </div>

              {/* Botón de acción */}
              <Button
                onClick={() => openSelectorModal(item)}
                disabled={stats.cotizacionesCount === 0}
                className="w-full"
                variant={stats.hasSelection ? "outline" : "default"}
              >
                {stats.cotizacionesCount > 0 ? 'Seleccionar Cotización' : 'Sin cotizaciones'}
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )

  return (
    <div className="space-y-4">
      {/* 🎛️ Controles de vista y filtros */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            {/* Toggle de vista */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-muted-foreground">Vista:</span>
              <div className="flex rounded-lg border">
                <Button
                  variant={viewMode === 'table' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('table')}
                  className="rounded-r-none"
                >
                  <List className="h-4 w-4 mr-2" />
                  Tabla
                </Button>
                <Button
                  variant={viewMode === 'card' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('card')}
                  className="rounded-l-none"
                >
                  <Grid3X3 className="h-4 w-4 mr-2" />
                  Cards
                </Button>
              </div>
            </div>

            {/* Controles de filtrado */}
            <div className="flex flex-col sm:flex-row gap-3 flex-1 max-w-2xl">
              {/* Búsqueda */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por código o descripción..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Filtro por estado */}
              <Select value={filterStatus} onValueChange={(value: FilterStatus) => setFilterStatus(value)}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los ítems</SelectItem>
                  <SelectItem value="selected">Con selección</SelectItem>
                  <SelectItem value="pending">Pendientes</SelectItem>
                  <SelectItem value="no-selection">Sin selección</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 📊 Resumen general */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{filteredItems.length}</div>
              <div className="text-sm text-muted-foreground">
                {filterStatus === 'all' ? 'Total Ítems' : 'Ítems Filtrados'}
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {filteredItems.filter(item => getItemStats(item).hasSelection).length}
              </div>
              <div className="text-sm text-muted-foreground">Con Selección</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {filteredItems.filter(item => getItemStats(item).needsAttention).length}
              </div>
              <div className="text-sm text-muted-foreground">Pendientes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                ${filteredItems.reduce((sum, item) => sum + (item.costoElegido ?? 0), 0).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Costo Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 📋 Vista de Tabla o Cards */}
      {filteredItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {searchTerm || filterStatus !== 'all' ? 'No se encontraron ítems' : 'No hay ítems disponibles'}
            </h3>
            <p className="text-gray-500 text-center max-w-md">
              {searchTerm || filterStatus !== 'all'
                ? 'Intenta ajustar los filtros de búsqueda para ver más resultados.'
                : 'Esta lista no contiene ítems actualmente.'
              }
            </p>
            {(searchTerm || filterStatus !== 'all') && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm('')
                  setFilterStatus('all')
                }}
                className="mt-4"
              >
                Limpiar filtros
              </Button>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'table' ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border rounded-xl overflow-hidden shadow-sm">
            <thead className="bg-gradient-to-r from-gray-50 to-gray-100 text-xs uppercase text-left">
              <tr className="whitespace-nowrap">
                <th className="px-3 py-3 font-semibold">Estado</th>
                <th className="px-3 py-3 font-semibold">Código</th>
                <th className="px-3 py-3 font-semibold">Descripción</th>
                <th className="px-3 py-3 font-semibold">Unidad</th>
                <th className="px-3 py-3 font-semibold text-right">Cantidad</th>
                <th className="px-3 py-3 font-semibold text-right">Precio Elegido</th>
                <th className="px-3 py-3 font-semibold text-right">Costo Total</th>
                <th className="px-3 py-3 font-semibold text-center">
                  <Clock className="h-4 w-4 inline mr-1" />
                  Entrega
                </th>
                <th className="px-3 py-3 font-semibold text-center">Cotizaciones</th>
                <th className="px-3 py-3 font-semibold text-center">Acciones</th>
              </tr>
            </thead>

            <tbody>
              {filteredItems.map((item) => {
                  const stats = getItemStats(item)
                  const statusIndicator = getStatusIndicator(item)

                  return (
                    <tr key={item.id} className={`border-b transition-colors ${getRowClassName(item)}`}>
                      {/* 🏷️ Indicador de estado */}
                      <td className="px-3 py-4">
                        {statusIndicator && (
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusIndicator.bgColor} ${statusIndicator.color}`}>
                            <statusIndicator.icon className="h-3 w-3" />
                            {statusIndicator.label}
                          </div>
                        )}
                      </td>

                      <td className="font-semibold px-3 py-4 text-gray-900">{item.codigo}</td>
                      <td className="px-3 py-4 max-w-xs">
                        <div className="truncate" title={item.descripcion}>
                          {item.descripcion}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-gray-600">{item.unidad}</td>
                      <td className="text-right px-3 py-4 font-medium">{item.cantidad}</td>
                      <td className="text-right px-3 py-4">
                        <span className="font-semibold text-green-600">
                          ${(item.precioElegido ?? 0).toFixed(2)}
                        </span>
                        {stats.mejorPrecio && item.precioElegido && item.precioElegido > stats.mejorPrecio && (
                          <div className="text-xs text-yellow-600 flex items-center justify-end gap-1 mt-1">
                            <AlertTriangle className="h-3 w-3" />
                            Mejor: ${stats.mejorPrecio.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="text-right px-3 py-4">
                        <span className="font-bold text-lg">
                          ${(item.costoElegido ?? 0).toFixed(2)}
                        </span>
                      </td>
                      <td className="text-center px-3 py-4">
                        <div className="text-sm font-medium">
                          {stats.selectedCot?.tiempoEntrega || 'N/A'}
                        </div>
                        {stats.selectedCot?.tiempoEntregaDias && (
                          <div className="text-xs text-muted-foreground">
                            ({stats.selectedCot.tiempoEntregaDias} días)
                          </div>
                        )}
                      </td>
                      <td className="text-center px-3 py-4">
                        <div className="flex flex-col items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            {stats.cotizacionesCount} total
                          </Badge>
                          {stats.cotizacionesDisponibles > 0 && (
                            <Badge variant="outline" className="text-xs">
                              {stats.cotizacionesDisponibles} disponibles
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="text-center px-3 py-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openSelectorModal(item)}
                          className="hover:bg-gray-100"
                          disabled={stats.cotizacionesCount === 0}
                        >
                          {stats.cotizacionesCount > 0 ? 'Seleccionar' : 'Sin cotizaciones'}
                        </Button>
                      </td>
                    </tr>
                  )
                })}
            </tbody>
          </table>
        </div>
      ) : (
        <CardView />
      )}

      {/* 📝 Notas informativas - Solo en vista tabla */}
      {viewMode === 'table' && (
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground space-y-2">
              <h4 className="font-semibold text-gray-900 mb-2">Leyenda de Estados:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span>Selección óptima (mejor precio)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span>Cotización seleccionada</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span>Requiere selección</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                  <span>Sin cotizaciones</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 🎯 Modal para selección de cotizaciones */}
      <Dialog open={selectorModal.open} onOpenChange={closeSelectorModal}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="sr-only">
              Seleccionar Cotización - {selectorModal.item?.descripcion}
            </DialogTitle>
          </DialogHeader>
          <div className="max-h-[85vh] overflow-y-auto">
            {selectorModal.item && (
              <LogisticaCotizacionSelector
                item={selectorModal.item}
                onUpdated={() => {
                  onUpdated?.()
                  closeSelectorModal()
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
