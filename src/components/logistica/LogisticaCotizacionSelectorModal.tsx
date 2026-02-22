// ===================================================
// 📁 Archivo: LogisticaCotizacionSelectorModal.tsx
// 📌 Descripción: Modal profesional para selección de cotizaciones por ítem
// 📌 Características: Comparación visual, filtros, ordenamiento y selección intuitiva en modal
// ✍️ Autor: Sistema de IA
// 📅 Creado: 2025-01-27
// ===================================================

'use client'

import { useState, useMemo } from 'react'
import { ListaEquipoItem, CotizacionProveedorItem } from '@/types'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { 
  Trophy, 
  DollarSign, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  X
} from 'lucide-react'

interface Props {
  item: ListaEquipoItem
  onUpdated?: () => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

type SortOption = 'precio-asc' | 'precio-desc' | 'tiempo-asc' | 'tiempo-desc' | 'proveedor'
type FilterOption = 'all' | 'cotizado' | 'pendiente' | 'rechazado'

export default function LogisticaCotizacionSelectorModal({ 
  item, 
  onUpdated, 
  trigger,
  open,
  onOpenChange 
}: Props) {
  const [sortBy, setSortBy] = useState<SortOption>('precio-asc')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isSelecting, setIsSelecting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  // ✅ Control del estado del modal
  const modalOpen = open !== undefined ? open : isOpen
  const setModalOpen = onOpenChange || setIsOpen

  // 🔄 Filtrar y ordenar cotizaciones
  const processedCotizaciones = useMemo(() => {
    let filtered = item.cotizaciones

    // Filtrar por estado
    if (filterBy !== 'all') {
      filtered = filtered.filter(cot => cot.estado === filterBy)
    }

    // Filtrar por búsqueda (proveedor)
    if (searchTerm) {
      filtered = filtered.filter(cot => 
        cot.cotizacionProveedor?.proveedor?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Ordenar
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'precio-asc':
          return (a.precioUnitario ?? 0) - (b.precioUnitario ?? 0)
        case 'precio-desc':
          return (b.precioUnitario ?? 0) - (a.precioUnitario ?? 0)
        case 'tiempo-asc':
          return (a.tiempoEntregaDias ?? 999) - (b.tiempoEntregaDias ?? 999)
        case 'tiempo-desc':
          return (b.tiempoEntregaDias ?? 0) - (a.tiempoEntregaDias ?? 0)
        case 'proveedor':
          return (a.cotizacionProveedor?.proveedor?.nombre ?? '').localeCompare(
            b.cotizacionProveedor?.proveedor?.nombre ?? ''
          )
        default:
          return 0
      }
    })

    return sorted
  }, [item.cotizaciones, sortBy, filterBy, searchTerm])

  // 🏆 Manejar selección de cotización
  const handleSeleccionar = async (cotizacionProveedorItemId: string) => {
    setIsSelecting(true)
    try {
      const res = await fetch(`/api/lista-equipo-item/${item.id}/seleccionar-cotizacion`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cotizacionProveedorItemId }),
      })

      if (res.ok) {
        const data = await res.json()
        if (data.warningOC) {
          toast.warning(data.warningOC, { duration: 8000 })
        }
        toast.success('Cotización seleccionada correctamente')
        onUpdated?.()
        setModalOpen(false)
      } else {
        const data = await res.json()
        toast.error(`Error: ${data.error || 'No se pudo seleccionar cotización'}`)
      }
    } catch (error) {
      toast.error('❌ Error inesperado al seleccionar cotización')
    } finally {
      setIsSelecting(false)
    }
  }

  // 📊 Calcular estadísticas
  const stats = useMemo(() => {
    const precios = item.cotizaciones.map(c => c.precioUnitario ?? 0).filter(p => p > 0)
    const tiempos = item.cotizaciones.map(c => c.tiempoEntregaDias ?? 0).filter(t => t > 0)
    
    return {
      precioMin: Math.min(...precios),
      precioMax: Math.max(...precios),
      precioPromedio: precios.reduce((a, b) => a + b, 0) / precios.length,
      tiempoMin: Math.min(...tiempos),
      tiempoMax: Math.max(...tiempos),
      totalCotizaciones: item.cotizaciones.length,
      cotizacionesDisponibles: item.cotizaciones.filter(c => c.estado === 'cotizado').length
    }
  }, [item.cotizaciones])

  // 🎨 Obtener color de badge según estado
  const getEstadoBadgeVariant = (estado: string) => {
    switch (estado) {
      case 'cotizado': return 'default'
      case 'pendiente': return 'secondary'
      case 'rechazado': return 'outline'
      default: return 'outline'
    }
  }

  // 🏅 Determinar si es la mejor opción
  const getBestOptionIndicator = (cotizacion: CotizacionProveedorItem) => {
    const precio = cotizacion.precioUnitario ?? 0
    const tiempo = cotizacion.tiempoEntregaDias ?? 999
    
    const esMejorPrecio = precio === stats.precioMin && precio > 0
    const esMejorTiempo = tiempo === stats.tiempoMin && tiempo > 0
    
    if (esMejorPrecio && esMejorTiempo) {
      return { icon: Trophy, color: 'text-yellow-500', label: 'Mejor precio y tiempo' }
    } else if (esMejorPrecio) {
      return { icon: DollarSign, color: 'text-green-500', label: 'Mejor precio' }
    } else if (esMejorTiempo) {
      return { icon: Clock, color: 'text-blue-500', label: 'Mejor tiempo' }
    }
    return null
  }

  // 🎯 Trigger por defecto si no se proporciona
  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Trophy className="h-4 w-4 mr-2" />
      Seleccionar Cotización
    </Button>
  )

  return (
    <Dialog open={modalOpen} onOpenChange={setModalOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="max-w-7xl max-h-[95vh] flex flex-col">
        {/* 🎯 Header mejorado con información clave */}
        <DialogHeader className="pb-4 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Trophy className="h-6 w-6 text-yellow-600" />
                </div>
                Selección de Cotización
              </DialogTitle>
              <DialogDescription className="mt-2 text-base">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <span className="font-semibold text-gray-900">{item.codigo}</span>
                  <span className="hidden sm:inline text-gray-400">•</span>
                  <span className="text-gray-600">{item.descripcion}</span>
                </div>
              </DialogDescription>
            </div>
            
            {/* 📊 Estadísticas simplificadas */}
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900">{stats.totalCotizaciones}</div>
                <div className="text-xs text-gray-500">Items</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{stats.cotizacionesDisponibles}</div>
                <div className="text-xs text-gray-500">Seleccionados</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">${stats.precioMin.toFixed(2)}</div>
                <div className="text-xs text-gray-500">Mejor precio</div>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* 🔧 Controles simplificados */}
        <div className="py-3 border-b">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Buscar proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-9"
              />
            </div>
            
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="Ordenar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="precio-asc">Precio ↑</SelectItem>
                <SelectItem value="precio-desc">Precio ↓</SelectItem>
                <SelectItem value="tiempo-asc">Tiempo ↑</SelectItem>
                <SelectItem value="tiempo-desc">Tiempo ↓</SelectItem>
                <SelectItem value="proveedor">Proveedor</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterBy} onValueChange={(value: FilterOption) => setFilterBy(value)}>
              <SelectTrigger className="w-32 h-9">
                <SelectValue placeholder="Filtrar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="cotizado">Cotizadas</SelectItem>
                <SelectItem value="pendiente">Pendientes</SelectItem>
                <SelectItem value="rechazado">Rechazadas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* 📋 Lista de cotizaciones optimizada */}
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto px-1">
            {processedCotizaciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <AlertCircle className="h-16 w-16 mb-4 text-gray-300" />
                <h3 className="text-lg font-medium mb-2">No hay cotizaciones</h3>
                <p className="text-sm text-center">Ajusta los filtros de búsqueda</p>
              </div>
            ) : (
              <div className="space-y-3 pb-4">
                {processedCotizaciones.map((cotizacion) => {
                  const precio = cotizacion.precioUnitario ?? 0
                  const cantidad = cotizacion.cantidad ?? item.cantidad ?? 0
                  const costoTotal = precio * cantidad
                  const isSelected = item.cotizacionSeleccionadaId === cotizacion.id
                  const bestOption = getBestOptionIndicator(cotizacion)

                  return (
                    <div 
                      key={cotizacion.id} 
                      className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                        isSelected 
                          ? 'border-green-500 bg-green-50' 
                          : bestOption 
                            ? 'border-yellow-400 bg-yellow-50' 
                            : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      {/* Header simple */}
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h4 className="font-semibold text-gray-900">
                            {cotizacion.cotizacionProveedor?.proveedor?.nombre || 'Proveedor no especificado'}
                          </h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant={getEstadoBadgeVariant(cotizacion.estado)} className="text-xs">
                              {cotizacion.estado}
                            </Badge>
                            {bestOption && (
                              <Badge variant="outline" className="text-xs text-yellow-700 border-yellow-400">
                                Mejor precio
                              </Badge>
                            )}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="text-green-600">
                            <CheckCircle2 className="h-5 w-5" />
                          </div>
                        )}
                      </div>

                      {/* Información en línea */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-6">
                          <div>
                            <div className="text-xs text-gray-500">Precio Unitario</div>
                            <div className="text-lg font-bold text-green-600">
                              ${precio.toFixed(2)}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-xs text-gray-500">Total</div>
                            <div className="text-lg font-bold text-gray-900">
                              ${costoTotal.toFixed(2)}
                            </div>
                          </div>
                          
                          <div>
                            <div className="text-xs text-gray-500">Entrega</div>
                            <div className="text-sm font-medium">
                              {cotizacion.tiempoEntregaDias ? `${cotizacion.tiempoEntregaDias} días` : 'N/A'}
                            </div>
                          </div>
                        </div>

                        {/* Botón prominente */}
                        <Button
                          onClick={() => handleSeleccionar(cotizacion.id)}
                          disabled={isSelected || isSelecting || cotizacion.estado !== 'cotizado'}
                          size="lg"
                          className={`px-8 py-3 font-semibold shadow-lg ${
                            isSelected 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : 'bg-blue-600 hover:bg-blue-700 text-white hover:shadow-xl'
                          }`}
                        >
                          {isSelected ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Seleccionado
                            </>
                          ) : (
                            'Seleccionar'
                          )}
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
