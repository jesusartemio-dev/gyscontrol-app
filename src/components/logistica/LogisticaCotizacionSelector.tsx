// ===================================================
// 📁 Archivo: LogisticaCotizacionSelector.tsx
// 📌 Descripción: Componente profesional para selección de cotizaciones por ítem
// 📌 Características: Comparación visual, filtros, ordenamiento y selección intuitiva
// ✍️ Autor: Sistema de IA
// 📅 Creado: 2025-01-27
// ===================================================

'use client'

import { useState, useMemo } from 'react'
import { ListaEquipoItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import {
  Trophy,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X
} from 'lucide-react'

interface Props {
  item: ListaEquipoItem
  onUpdated?: () => void
}


export default function LogisticaCotizacionSelector({ item, onUpdated }: Props) {
  const [selectedCotizacionId, setSelectedCotizacionId] = useState<string | null>(item.cotizacionSeleccionadaId || null)
  const [isConfirming, setIsConfirming] = useState(false)

  // 🔄 Obtener todas las cotizaciones disponibles ordenadas por precio
  const availableCotizaciones = useMemo(() => {
    // Mostrar todas las cotizaciones excepto las rechazadas
    const disponibles = item.cotizaciones.filter(cot => cot.estado !== 'rechazado')
    return [...disponibles].sort((a, b) => (a.precioUnitario ?? 0) - (b.precioUnitario ?? 0))
  }, [item.cotizaciones])

  // 🎯 Manejar selección visual (sin guardar aún)
  const handleCotizacionClick = (cotizacionId: string) => {
    setSelectedCotizacionId(cotizacionId)
  }

  // ✅ Confirmar selección final
  const handleConfirmarSeleccion = async () => {
    if (!selectedCotizacionId) return

    setIsConfirming(true)
    try {
      const res = await fetch(`/api/lista-equipo-item/${item.id}/seleccionar-cotizacion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cotizacionProveedorItemId: selectedCotizacionId }),
      })

      if (res.ok) {
        toast.success('✅ Cotización seleccionada correctamente')
        onUpdated?.()
      } else {
        const data = await res.json()
        toast.error(`❌ Error: ${data.error || 'No se pudo seleccionar cotización'}`)
      }
    } catch (error) {
      toast.error('❌ Error inesperado al seleccionar cotización')
    } finally {
      setIsConfirming(false)
    }
  }

  // ❌ Deseleccionar cotización actual
  const handleDeseleccionar = async () => {
    setIsConfirming(true)
    try {
      const res = await fetch(`/api/lista-equipo-item/${item.id}/seleccionar-cotizacion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cotizacionProveedorItemId: null }), // Enviar null para deseleccionar
      })

      if (res.ok) {
        toast.success('✅ Cotización deseleccionada correctamente')
        setSelectedCotizacionId(null)
        onUpdated?.()
      } else {
        const data = await res.json()
        toast.error(`❌ Error: ${data.error || 'No se pudo deseleccionar cotización'}`)
      }
    } catch (error) {
      toast.error('❌ Error inesperado al deseleccionar cotización')
    } finally {
      setIsConfirming(false)
    }
  }

  // 📊 Calcular estadísticas rápidas
  const stats = useMemo(() => {
    const precios = availableCotizaciones.map(c => c.precioUnitario ?? 0).filter(p => p > 0)
    return {
      precioMin: precios.length > 0 ? Math.min(...precios) : 0,
      precioMax: precios.length > 0 ? Math.max(...precios) : 0,
      totalDisponibles: availableCotizaciones.length
    }
  }, [availableCotizaciones])

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center">
        <h3 className="text-lg font-semibold flex items-center justify-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          {item.descripcion} ({item.unidad})
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          Haz clic en una cotización para seleccionarla, luego confirma tu elección
        </p>
      </div>

      {/* Lista de opciones con selección */}
      {availableCotizaciones.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No hay cotizaciones disponibles para este ítem</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {availableCotizaciones.map((cotizacion) => {
            const precio = cotizacion.precioUnitario ?? 0
            const cantidad = item.cantidad ?? 1
            const costoTotal = precio * cantidad
            const isSelected = selectedCotizacionId === cotizacion.id
            const isCurrentSelection = item.cotizacionSeleccionadaId === cotizacion.id

            // Indicadores de mejor opción
            const esMejorPrecio = precio === stats.precioMin && precio > 0
            const esMejorTiempo = (cotizacion.tiempoEntregaDias ?? 999) === Math.min(
              ...availableCotizaciones.map(c => c.tiempoEntregaDias ?? 999).filter(t => t < 999)
            )

            return (
              <Card
                key={cotizacion.id}
                className={`transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200 shadow-md'
                    : isCurrentSelection
                    ? 'ring-2 ring-green-500 bg-green-50 border-green-200'
                    : 'hover:shadow-md hover:border-gray-300'
                }`}
                onClick={() => handleCotizacionClick(cotizacion.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    {/* Información del proveedor */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">
                          {cotizacion.cotizacionProveedor?.proveedor?.nombre || 'Proveedor desconocido'}
                        </h4>
                        {isCurrentSelection && !isSelected && (
                          <Badge className="bg-green-600 text-white text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Actual
                          </Badge>
                        )}
                        {isSelected && (
                          <Badge className="bg-blue-600 text-white text-xs">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Seleccionado
                          </Badge>
                        )}
                        {esMejorPrecio && !isSelected && !isCurrentSelection && (
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            <DollarSign className="h-3 w-3 mr-1" />
                            Mejor precio
                          </Badge>
                        )}
                        {esMejorTiempo && !isSelected && !isCurrentSelection && (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            <Clock className="h-3 w-3 mr-1" />
                            Menor tiempo
                          </Badge>
                        )}
                      </div>

                      <div className="text-xs text-muted-foreground">
                        Cotización: {cotizacion.cotizacionProveedor?.codigo || 'N/A'}
                      </div>
                    </div>

                    {/* Información de precios y entrega */}
                    <div className="flex items-center gap-6 text-right">
                      <div>
                        <div className={`text-sm font-bold ${
                          isSelected ? 'text-blue-600' :
                          isCurrentSelection ? 'text-green-600' : 'text-gray-700'
                        }`}>
                          ${precio.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">unitario</div>
                      </div>

                      <div>
                        <div className={`text-sm font-semibold ${
                          isSelected ? 'text-blue-600' :
                          isCurrentSelection ? 'text-green-600' : 'text-gray-700'
                        }`}>
                          ${costoTotal.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">total</div>
                      </div>

                      <div className="min-w-[80px]">
                        <div className={`text-sm font-medium ${
                          isSelected ? 'text-blue-600' :
                          isCurrentSelection ? 'text-green-600' : 'text-gray-700'
                        }`}>
                          {cotizacion.tiempoEntrega || 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">entrega</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Botones de acción */}
      {availableCotizaciones.length > 0 && (
        <div className="flex justify-center gap-3 pt-4 border-t">
          {/* Botón para deseleccionar */}
          {item.cotizacionSeleccionadaId && (
            <Button
              onClick={handleDeseleccionar}
              disabled={isConfirming}
              variant="outline"
              className="px-6 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300"
              size="lg"
            >
              {isConfirming ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deseleccionando...
                </>
              ) : (
                <>
                  <X className="h-4 w-4 mr-2" />
                  Deseleccionar
                </>
              )}
            </Button>
          )}

          {/* Botón de confirmación */}
          <Button
            onClick={handleConfirmarSeleccion}
            disabled={!selectedCotizacionId || isConfirming || selectedCotizacionId === item.cotizacionSeleccionadaId}
            className="px-8"
            size="lg"
          >
            {isConfirming ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Confirmando...
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Aceptar Selección
              </>
            )}
          </Button>
        </div>
      )}

      {/* Footer con estadísticas */}
      {availableCotizaciones.length > 0 && (
        <div className="text-xs text-muted-foreground text-center pt-2">
          {stats.totalDisponibles} cotizaciones para comparar •
          Rango de precios: ${stats.precioMin.toFixed(2)} - ${stats.precioMax.toFixed(2)}
        </div>
      )}
    </div>
  )
}
