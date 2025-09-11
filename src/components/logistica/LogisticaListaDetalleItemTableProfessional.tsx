// ===================================================
// 📁 Archivo: LogisticaListaDetalleItemTableProfessional.tsx
// 📌 Descripción: Tabla profesional mejorada para ítems con selector de cotizaciones integrado
// 📌 Características: Vista compacta, expansión inteligente, indicadores visuales
// ✍️ Autor: Sistema de IA
// 📅 Creado: 2025-01-27
// ===================================================

'use client'

import { useState } from 'react'
import { ListaEquipoItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import LogisticaCotizacionSelector from './LogisticaCotizacionSelector'
import { 
  ChevronDown, 
  ChevronRight, 
  Trophy,
  AlertTriangle,
  CheckCircle2,
  Clock,
  DollarSign
} from 'lucide-react'
import React from 'react'

interface Props {
  items: ListaEquipoItem[]
  onUpdated?: () => void
}

export default function LogisticaListaDetalleItemTableProfessional({ items, onUpdated }: Props) {
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null)

  // 🔄 Alternar expansión para mostrar/ocultar el selector de cotizaciones
  const toggleExpand = (itemId: string) => {
    setExpandedItemId(prev => (prev === itemId ? null : itemId))
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

  return (
    <div className="space-y-4">
      {/* 📊 Resumen general */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{items.length}</div>
              <div className="text-sm text-muted-foreground">Total Ítems</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {items.filter(item => getItemStats(item).hasSelection).length}
              </div>
              <div className="text-sm text-muted-foreground">Con Selección</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-yellow-600">
                {items.filter(item => getItemStats(item).needsAttention).length}
              </div>
              <div className="text-sm text-muted-foreground">Pendientes</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">
                ${items.reduce((sum, item) => sum + (item.costoElegido ?? 0), 0).toFixed(2)}
              </div>
              <div className="text-sm text-muted-foreground">Costo Total</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 📋 Tabla de ítems */}
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
              <th className="px-3 py-3 font-semibold text-center">Cotizaciones</th>
              <th className="px-3 py-3 font-semibold text-center">Acciones</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => {
              const stats = getItemStats(item)
              const statusIndicator = getStatusIndicator(item)
              const isExpanded = expandedItemId === item.id

              return (
                <React.Fragment key={item.id}>
                  {/* 🔽 Fila principal con datos del ítem */}
                  <tr className={`border-b transition-colors ${getRowClassName(item)}`}>
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
                        onClick={() => toggleExpand(item.id)}
                        className="hover:bg-gray-100"
                        disabled={stats.cotizacionesCount === 0}
                      >
                        {isExpanded ? (
                          <>
                            <ChevronDown className="h-4 w-4 mr-1" />
                            Ocultar
                          </>
                        ) : (
                          <>
                            <ChevronRight className="h-4 w-4 mr-1" />
                            {stats.cotizacionesCount > 0 ? 'Seleccionar' : 'Sin cotizaciones'}
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>

                  {/* 🔍 Fila expandida para mostrar selector de cotizaciones */}
                  {isExpanded && (
                    <tr key={`${item.id}-expanded`}>
                      <td colSpan={9} className="p-0 bg-white">
                        <div className="p-6 border-t bg-gradient-to-r from-gray-50 to-white">
                          <LogisticaCotizacionSelector
                            item={item}
                            onUpdated={onUpdated}
                          />
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* 📝 Notas informativas */}
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
    </div>
  )
}
