'use client'

import { useState, useMemo, useEffect } from 'react'
import { ListaEquipoItem } from '@/types'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import {
  Trophy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  Circle,
} from 'lucide-react'

interface Props {
  item: ListaEquipoItem
  onUpdated?: () => void
}

export default function LogisticaCotizacionSelector({ item, onUpdated }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(
    item.cotizacionSeleccionadaId || null
  )
  const [isConfirming, setIsConfirming] = useState(false)

  // Obtener cotizaciones disponibles ordenadas por precio
  const cotizaciones = useMemo(() => {
    const list = item.cotizaciones || []
    const disponibles = list.filter((cot: any) => {
      const estado = cot.cotizacion?.estado || cot.estado
      return estado !== 'rechazado'
    })
    return [...disponibles].sort(
      (a: any, b: any) => (a.precioUnitario ?? 0) - (b.precioUnitario ?? 0)
    )
  }, [item.cotizaciones])

  // Stats
  const stats = useMemo(() => {
    const precios = cotizaciones
      .map((c: any) => c.precioUnitario ?? 0)
      .filter((p) => p > 0)
    const tiempos = cotizaciones
      .map((c: any) => c.tiempoEntregaDias ?? 999)
      .filter((t) => t < 999)
    return {
      precioMin: precios.length > 0 ? Math.min(...precios) : 0,
      precioMax: precios.length > 0 ? Math.max(...precios) : 0,
      tiempoMin: tiempos.length > 0 ? Math.min(...tiempos) : null,
    }
  }, [cotizaciones])

  // Auto-seleccionar si hay solo 1 cotización y no hay selección actual
  useEffect(() => {
    if (cotizaciones.length === 1 && !item.cotizacionSeleccionadaId) {
      setSelectedId(cotizaciones[0].id)
    }
  }, [cotizaciones, item.cotizacionSeleccionadaId])

  const handleConfirmar = async () => {
    if (!selectedId) return

    setIsConfirming(true)
    try {
      const res = await fetch(
        `/api/lista-equipo-item/${item.id}/seleccionar-cotizacion`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cotizacionProveedorItemId: selectedId }),
        }
      )

      if (res.ok) {
        toast.success('Cotización seleccionada')
        onUpdated?.()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al seleccionar')
      }
    } catch {
      toast.error('Error inesperado')
    } finally {
      setIsConfirming(false)
    }
  }

  const handleDeseleccionar = async () => {
    setIsConfirming(true)
    try {
      const res = await fetch(
        `/api/lista-equipo-item/${item.id}/seleccionar-cotizacion`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cotizacionProveedorItemId: null }),
        }
      )

      if (res.ok) {
        toast.success('Cotización deseleccionada')
        setSelectedId(null)
        onUpdated?.()
      } else {
        const data = await res.json()
        toast.error(data.error || 'Error al deseleccionar')
      }
    } catch {
      toast.error('Error inesperado')
    } finally {
      setIsConfirming(false)
    }
  }

  const getProveedorNombre = (cot: any) =>
    cot.cotizacion?.proveedor?.nombre ||
    cot.cotizacionProveedor?.proveedor?.nombre ||
    'Proveedor'

  const getCodigo = (cot: any) =>
    cot.cotizacion?.codigo || cot.cotizacionProveedor?.codigo || '-'

  return (
    <div className="flex flex-col min-h-0 max-h-full">
      {/* Header compacto */}
      <div className="flex items-center gap-2 p-4 pb-3 border-b flex-shrink-0">
        <Trophy className="h-4 w-4 text-yellow-500 shrink-0" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold truncate">{item.descripcion}</h3>
          <p className="text-[10px] text-muted-foreground">
            {item.cantidad} {item.unidad} • Selecciona proveedor
          </p>
        </div>
      </div>

      {/* Lista de cotizaciones (scrollable) */}
      {cotizaciones.length === 0 ? (
        <div className="text-center py-6 px-4">
          <AlertCircle className="h-6 w-6 mx-auto mb-2 text-gray-300" />
          <p className="text-xs text-muted-foreground">Sin cotizaciones</p>
        </div>
      ) : (
        <div className="overflow-y-auto flex-1 min-h-0 p-4 py-3 space-y-1.5">
          {cotizaciones.map((cot: any) => {
            const precio = cot.precioUnitario ?? 0
            const costoTotal = precio * (item.cantidad ?? 1)
            const isSelected = selectedId === cot.id
            const isCurrent = item.cotizacionSeleccionadaId === cot.id
            const esMejorPrecio = precio === stats.precioMin && precio > 0

            return (
              <div
                key={cot.id}
                onClick={() => setSelectedId(cot.id)}
                className={`
                  relative p-2.5 rounded-md border cursor-pointer transition-all
                  ${isSelected
                    ? 'bg-blue-50 border-blue-400 shadow-sm'
                    : isCurrent
                    ? 'bg-green-50 border-green-400'
                    : 'hover:bg-gray-50 border-gray-200'
                  }
                `}
              >
                {/* Indicador de selección izquierdo */}
                {isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-l-md" />
                )}
                {isCurrent && !isSelected && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-green-500 rounded-l-md" />
                )}

                <div className="flex items-center gap-3">
                  {/* Radio indicator */}
                  <div className="shrink-0">
                    {isSelected ? (
                      <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    ) : isCurrent ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-gray-300" />
                    )}
                  </div>

                  {/* Proveedor info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-xs font-medium truncate ${
                        isSelected ? 'text-blue-700' : isCurrent ? 'text-green-700' : ''
                      }`}>
                        {getProveedorNombre(cot)}
                      </span>
                      {esMejorPrecio && (
                        <span className="text-[9px] px-1 py-0.5 bg-green-100 text-green-700 rounded shrink-0">
                          Mejor
                        </span>
                      )}
                      {isCurrent && !isSelected && (
                        <span className="text-[9px] px-1 py-0.5 bg-green-600 text-white rounded shrink-0">
                          Actual
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {getCodigo(cot)}
                    </p>
                  </div>

                  {/* Precios en línea */}
                  <div className="flex items-center gap-3 shrink-0 text-right">
                    <div>
                      <div className={`text-xs font-bold ${
                        isSelected ? 'text-blue-600' : isCurrent ? 'text-green-600' : ''
                      }`}>
                        ${precio.toFixed(2)}
                      </div>
                      <div className="text-[9px] text-muted-foreground">unit.</div>
                    </div>
                    <div>
                      <div className={`text-xs font-bold ${
                        isSelected ? 'text-blue-600' : isCurrent ? 'text-green-600' : ''
                      }`}>
                        ${costoTotal.toFixed(2)}
                      </div>
                      <div className="text-[9px] text-muted-foreground">total</div>
                    </div>
                    <div className="w-12">
                      <div className={`text-[10px] font-medium ${
                        isSelected ? 'text-blue-600' : isCurrent ? 'text-green-600' : ''
                      }`}>
                        {cot.tiempoEntregaDias ? `${cot.tiempoEntregaDias}d` : '-'}
                      </div>
                      <div className="text-[9px] text-muted-foreground">entrega</div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Footer con acciones */}
      {cotizaciones.length > 0 && (
        <div className="flex items-center justify-between px-4 py-3 border-t flex-shrink-0">
          <span className="text-[10px] text-muted-foreground">
            {cotizaciones.length} opción{cotizaciones.length > 1 ? 'es' : ''} •
            ${stats.precioMin.toFixed(2)}
            {stats.precioMax !== stats.precioMin && ` - $${stats.precioMax.toFixed(2)}`}
          </span>
          <div className="flex items-center gap-1.5">
            {item.cotizacionSeleccionadaId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeseleccionar}
                disabled={isConfirming}
                className="h-6 text-[10px] text-red-600 hover:text-red-700 hover:bg-red-50 px-2"
              >
                {isConfirming ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <>
                    <X className="h-3 w-3 mr-0.5" />
                    Quitar
                  </>
                )}
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleConfirmar}
              disabled={
                !selectedId ||
                isConfirming ||
                selectedId === item.cotizacionSeleccionadaId
              }
              className="h-6 text-[10px] px-3"
            >
              {isConfirming ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Confirmar
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
