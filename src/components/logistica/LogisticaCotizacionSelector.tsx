// ===================================================
// 📁 Archivo: LogisticaCotizacionSelector.tsx
// 📌 Descripción: Componente profesional para selección de cotizaciones por ítem
// 📌 Características: Comparación visual, filtros, ordenamiento y selección intuitiva
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
  AlertCircle
} from 'lucide-react'

interface Props {
  item: ListaEquipoItem
  onUpdated?: () => void
}

type SortOption = 'precio-asc' | 'precio-desc' | 'tiempo-asc' | 'tiempo-desc' | 'proveedor'
type FilterOption = 'all' | 'cotizado' | 'pendiente' | 'rechazado'

export default function LogisticaCotizacionSelector({ item, onUpdated }: Props) {
  const [sortBy, setSortBy] = useState<SortOption>('precio-asc')
  const [filterBy, setFilterBy] = useState<FilterOption>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [isSelecting, setIsSelecting] = useState(false)

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
        cot.cotizacion?.proveedor?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())
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
          return (a.cotizacion?.proveedor?.nombre ?? '').localeCompare(
            b.cotizacion?.proveedor?.nombre ?? ''
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
        toast.success('🏆 Cotización seleccionada correctamente')
        onUpdated?.()
      } else {
        const data = await res.json()
        toast.error(`❌ Error: ${data.error || 'No se pudo seleccionar cotización'}`)
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

  return (
    <Card className="w-full">
      <CardHeader className="pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Selección de Cotización
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              <span className="font-semibold">{item.codigo}</span> - {item.descripcion}
            </p>
          </div>
          
          {/* 📊 Estadísticas rápidas */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className="text-xs">
              {stats.totalCotizaciones} cotizaciones
            </Badge>
            <Badge variant="outline" className="text-xs">
              ${stats.precioMin.toFixed(2)} - ${stats.precioMax.toFixed(2)}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {stats.tiempoMin} - {stats.tiempoMax} días
            </Badge>
          </div>
        </div>

        {/* 🔍 Controles de filtrado y búsqueda */}
        <div className="flex flex-col sm:flex-row gap-3 mt-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por proveedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="precio-asc">💰 Precio ↑</SelectItem>
              <SelectItem value="precio-desc">💰 Precio ↓</SelectItem>
              <SelectItem value="tiempo-asc">⏱️ Tiempo ↑</SelectItem>
              <SelectItem value="tiempo-desc">⏱️ Tiempo ↓</SelectItem>
              <SelectItem value="proveedor">🏢 Proveedor A-Z</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterBy} onValueChange={(value: FilterOption) => setFilterBy(value)}>
            <SelectTrigger className="w-[140px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="cotizado">Cotizadas</SelectItem>
              <SelectItem value="pendiente">Pendientes</SelectItem>
              <SelectItem value="rechazado">Rechazadas</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent>
        {processedCotizaciones.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No se encontraron cotizaciones con los filtros aplicados</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {processedCotizaciones.map((cotizacion) => {
              const precio = cotizacion.precioUnitario ?? 0
              const cantidad = cotizacion.cantidad ?? item.cantidad ?? 0
              const costoTotal = precio * cantidad
              const isSelected = item.cotizacionSeleccionadaId === cotizacion.id
              const bestOption = getBestOptionIndicator(cotizacion)

              return (
                <Card 
                  key={cotizacion.id} 
                  className={`transition-all duration-200 hover:shadow-md ${
                    isSelected ? 'ring-2 ring-green-500 bg-green-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* 📋 Información principal */}
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-semibold text-base">
                            {cotizacion.cotizacion?.proveedor?.nombre || 'Proveedor no especificado'}
                          </h4>
                          <Badge variant={getEstadoBadgeVariant(cotizacion.estado)}>
                            {cotizacion.estado}
                          </Badge>
                          {bestOption && (
                            <Badge variant="outline" className={`${bestOption.color} border-current`}>
                              <bestOption.icon className="h-3 w-3 mr-1" />
                              {bestOption.label}
                            </Badge>
                          )}
                          {isSelected && (
                            <Badge className="bg-green-600">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Seleccionado
                            </Badge>
                          )}
                        </div>
                        
                        <div className="text-sm text-muted-foreground">
                          Cotización: {cotizacion.cotizacion?.codigo || 'N/A'}
                        </div>
                      </div>

                      {/* 💰 Información de precios */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 lg:gap-6">
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Precio Unitario</div>
                          <div className="text-lg font-bold text-green-600">
                            ${precio.toFixed(2)}
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Costo Total</div>
                          <div className="text-lg font-bold">
                            ${costoTotal.toFixed(2)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ({cantidad} {item.unidad})
                          </div>
                        </div>
                        
                        <div className="text-center">
                          <div className="text-xs text-muted-foreground">Entrega</div>
                          <div className="text-sm font-semibold">
                            {cotizacion.tiempoEntregaDias ? `${cotizacion.tiempoEntregaDias} días` : 'N/A'}
                          </div>
                        </div>

                        {/* 🏆 Botón de selección */}
                        <Button
                          onClick={() => handleSeleccionar(cotizacion.id)}
                          disabled={isSelected || isSelecting || cotizacion.estado !== 'cotizado'}
                          variant={isSelected ? 'secondary' : 'default'}
                          className={isSelected ? 'bg-green-100 text-green-800' : ''}
                        >
                          {isSelected ? (
                            <>
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Seleccionado
                            </>
                          ) : (
                            <>
                              <Trophy className="h-4 w-4 mr-2" />
                              Seleccionar
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}