// ===================================================
// 📁 Archivo: ListaEquipoItemListCompacta.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Vista compacta de lista de equipos con filtros avanzados
//
// 🎨 Mejoras UX/UI aplicadas:
// - Vista compacta con información esencial
// - Filtros múltiples y búsqueda en tiempo real
// - Ordenamiento dinámico por múltiples criterios
// - Paginación inteligente
// - Estadísticas en tiempo real
// - Acciones rápidas inline
// - Responsive design optimizado
// ===================================================

'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Label } from '@/components/ui/label'
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Package,
  DollarSign,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Clock,
  Eye,
  EyeOff,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Settings,
  TrendingUp,
  TrendingDown,
  Pencil,
  Trash2,
  CheckCircle2,
  X
} from 'lucide-react'
import { ListaEquipoItem } from '@/types'
import { updateListaEquipoItem, deleteListaEquipoItem } from '@/lib/services/listaEquipoItem'
import { toast } from 'sonner'
import { calcularCostoItem, calcularCostoTotal, formatCurrency } from '@/lib/utils/costoCalculations'

// 🎯 Types and interfaces
interface Props {
  listaId: string
  proyectoId: string
  items: ListaEquipoItem[]
  editable?: boolean
  onCreated?: () => void
  className?: string
}

interface FilterState {
  search: string
  estado: string
  origen: string
  verificado: string
  conCotizacion: string
  rangoMonto: { min: string; max: string }
}

interface SortConfig {
  field: string
  direction: 'asc' | 'desc'
}

// 🎨 Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0.4, 0, 0.2, 1]
    }
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.15 } }
}

// 🔧 Utility functions

const getStatusInfo = (estado: string) => {
  const statusMap = {
    borrador: { label: 'Borrador', variant: 'outline' as const, icon: Clock },
    aprobado: { label: 'Aprobado', variant: 'default' as const, icon: CheckCircle },
    rechazado: { label: 'Rechazado', variant: 'destructive' as const, icon: XCircle },
    revision: { label: 'En Revisión', variant: 'secondary' as const, icon: AlertTriangle }
  }
  return statusMap[estado as keyof typeof statusMap] || statusMap.borrador
}

const getOrigenInfo = (origen: string) => {
  const origenMap = {
    cotizado: { label: 'Cotizado', variant: 'default' as const },
    nuevo: { label: 'Nuevo', variant: 'secondary' as const },
    reemplazo: { label: 'Reemplazo', variant: 'outline' as const }
  }
  return origenMap[origen as keyof typeof origenMap] || origenMap.cotizado
}

export default function ListaEquipoItemListCompacta({
  listaId,
  proyectoId,
  items,
  editable = true,
  onCreated,
  className = ''
}: Props) {
  // 🎯 State management
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    estado: 'all',
    origen: 'all',
    verificado: 'all',
    conCotizacion: 'all',
    rangoMonto: { min: '', max: '' }
  })
  
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: 'codigo',
    direction: 'asc'
  })
  
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(25)
  const [showFilters, setShowFilters] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [editingItem, setEditingItem] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, any>>({})

  // 📊 Statistics calculation
  const stats = useMemo(() => {
    const total = items.length
    const verificados = items.filter(i => i.verificado).length
    const aprobados = items.filter(i => i.estado === 'aprobado').length
    const rechazados = items.filter(i => i.estado === 'rechazado').length
    const conCotizacion = items.filter(i => i.cotizacionSeleccionada).length
    const costoTotal = calcularCostoTotal(items)
    
    return {
      total,
      verificados,
      aprobados,
      rechazados,
      conCotizacion,
      costoTotal,
      porcentajeVerificados: total > 0 ? Math.round((verificados / total) * 100) : 0,
      porcentajeAprobados: total > 0 ? Math.round((aprobados / total) * 100) : 0
    }
  }, [items])

  // 🔍 Filtered and sorted data
  const processedItems = useMemo(() => {
    let filtered = [...items]
    
    // Apply filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase()
      filtered = filtered.filter(item => 
        item.codigo.toLowerCase().includes(searchLower) ||
        item.descripcion.toLowerCase().includes(searchLower)
      )
    }
    
    if (filters.estado !== 'all') {
      filtered = filtered.filter(item => item.estado === filters.estado)
    }
    
    if (filters.origen !== 'all') {
      filtered = filtered.filter(item => item.origen === filters.origen)
    }
    
    if (filters.verificado !== 'all') {
      const isVerified = filters.verificado === 'true'
      filtered = filtered.filter(item => item.verificado === isVerified)
    }
    
    if (filters.conCotizacion !== 'all') {
      const hasCotizacion = filters.conCotizacion === 'true'
      filtered = filtered.filter(item => !!item.cotizacionSeleccionada === hasCotizacion)
    }
    
    // Price range filter
        if (filters.rangoMonto.min || filters.rangoMonto.max) {
          filtered = filtered.filter(item => {
            const total = calcularCostoItem(item)
            
            const min = parseFloat(filters.rangoMonto.min) || 0
            const max = parseFloat(filters.rangoMonto.max) || Infinity
            
            return total >= min && total <= max
          })
        }
    
    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortConfig.field) {
        case 'codigo':
          aValue = a.codigo.toLowerCase()
          bValue = b.codigo.toLowerCase()
          break
        case 'descripcion':
          aValue = a.descripcion.toLowerCase()
          bValue = b.descripcion.toLowerCase()
          break
        case 'cantidad':
          aValue = a.cantidad ?? 0
          bValue = b.cantidad ?? 0
          break
        case 'costo':
          aValue = calcularCostoItem(a)
          bValue = calcularCostoItem(b)
          break
        case 'estado':
          aValue = a.estado
          bValue = b.estado
          break
        case 'verificado':
          aValue = a.verificado ? 1 : 0
          bValue = b.verificado ? 1 : 0
          break
        default:
          aValue = a.createdAt
          bValue = b.createdAt
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1
      return 0
    })
    
    return filtered
  }, [items, filters, sortConfig])

  // 📄 Pagination
  const totalPages = Math.ceil(processedItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedItems = processedItems.slice(startIndex, startIndex + itemsPerPage)

  // 🔄 Event handlers
  const handleSort = useCallback((field: string) => {
    setSortConfig(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }, [])

  const handleFilterChange = useCallback((key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
    setCurrentPage(1) // Reset to first page when filtering
  }, [])

  const clearFilters = useCallback(() => {
    setFilters({
      search: '',
      estado: 'all',
      origen: 'all',
      verificado: 'all',
      conCotizacion: 'all',
      rangoMonto: { min: '', max: '' }
    })
    setCurrentPage(1)
  }, [])

  const handleVerificado = useCallback(async (itemId: string, checked: boolean) => {
    try {
      setIsLoading(true)
      await updateListaEquipoItem(itemId, { verificado: checked })
      toast.success(checked ? 'Item verificado' : 'Verificación removida')
      onCreated?.()
    } catch {
      toast.error('Error al actualizar verificación')
    } finally {
      setIsLoading(false)
    }
  }, [onCreated])

  const handleQuickEdit = useCallback(async (itemId: string, field: string, value: any) => {
    try {
      setIsLoading(true)
      await updateListaEquipoItem(itemId, { [field]: value })
      toast.success('Actualizado correctamente')
      setEditingItem(null)
      setEditValues({})
      onCreated?.()
    } catch {
      toast.error('Error al actualizar')
    } finally {
      setIsLoading(false)
    }
  }, [onCreated])

  // 📊 Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0
    if (filters.search) count++
    if (filters.estado !== 'all') count++
    if (filters.origen !== 'all') count++
    if (filters.verificado !== 'all') count++
    if (filters.conCotizacion !== 'all') count++
    if (filters.rangoMonto.min || filters.rangoMonto.max) count++
    return count
  }, [filters])

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 📊 Statistics Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4"
      >
        <Card className="border-0 shadow-sm bg-gradient-to-br from-blue-50 to-blue-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-700">Total Items</p>
                <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-green-50 to-green-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-700">Verificados</p>
                <p className="text-2xl font-bold text-green-900">
                  {stats.verificados}
                  <span className="text-sm ml-1">({stats.porcentajeVerificados}%)</span>
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-emerald-50 to-emerald-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-700">Aprobados</p>
                <p className="text-2xl font-bold text-emerald-900">
                  {stats.aprobados}
                  <span className="text-sm ml-1">({stats.porcentajeAprobados}%)</span>
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-red-50 to-red-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-700">Rechazados</p>
                <p className="text-2xl font-bold text-red-900">{stats.rechazados}</p>
              </div>
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-purple-50 to-purple-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-700">Con Cotización</p>
                <p className="text-2xl font-bold text-purple-900">{stats.conCotizacion}</p>
              </div>
              <DollarSign className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm bg-gradient-to-br from-amber-50 to-amber-100">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-amber-700">Costo Total</p>
                <p className="text-lg font-bold text-amber-900">{formatCurrency(stats.costoTotal)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-amber-600" />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 🔍 Filters Section */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros y Búsqueda
              {activeFiltersCount > 0 && (
                <Badge variant="outline" className="ml-2">
                  {activeFiltersCount} activo{activeFiltersCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showFilters ? 'Ocultar' : 'Mostrar'}
              </Button>
              {activeFiltersCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="text-red-600 hover:text-red-700"
                >
                  <RotateCcw className="h-4 w-4 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <CardContent className="space-y-4">
                {/* Basic Filters Row */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar código o descripción..."
                      value={filters.search}
                      onChange={(e) => handleFilterChange('search', e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Estado */}
                  <Select value={filters.estado} onValueChange={(value) => handleFilterChange('estado', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="borrador">Borrador</SelectItem>
                      <SelectItem value="aprobado">Aprobado</SelectItem>
                      <SelectItem value="rechazado">Rechazado</SelectItem>
                      <SelectItem value="revision">En Revisión</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Origen */}
                  <Select value={filters.origen} onValueChange={(value) => handleFilterChange('origen', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Origen" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los orígenes</SelectItem>
                      <SelectItem value="cotizado">Cotizado</SelectItem>
                      <SelectItem value="nuevo">Nuevo</SelectItem>
                      <SelectItem value="reemplazo">Reemplazo</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Verificado */}
                  <Select value={filters.verificado} onValueChange={(value) => handleFilterChange('verificado', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Verificación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="true">Verificados</SelectItem>
                      <SelectItem value="false">No verificados</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Con Cotización */}
                  <Select value={filters.conCotizacion} onValueChange={(value) => handleFilterChange('conCotizacion', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Cotización" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="true">Con cotización</SelectItem>
                      <SelectItem value="false">Sin cotización</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Rango de Monto */}
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="justify-start">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Rango de monto
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80">
                      <div className="space-y-4">
                        <Label className="text-sm font-medium">Filtrar por rango de monto total</Label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-xs text-gray-600">Mínimo</Label>
                            <Input
                              type="number"
                              placeholder="0.00"
                              value={filters.rangoMonto.min}
                              onChange={(e) => handleFilterChange('rangoMonto', { ...filters.rangoMonto, min: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label className="text-xs text-gray-600">Máximo</Label>
                            <Input
                              type="number"
                              placeholder="999999.99"
                              value={filters.rangoMonto.max}
                              onChange={(e) => handleFilterChange('rangoMonto', { ...filters.rangoMonto, max: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* 📋 Compact List */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Lista de Equipos
              <Badge variant="outline" className="ml-2">
                {processedItems.length} de {items.length}
              </Badge>
            </CardTitle>
            
            {/* Sort Controls */}
            <div className="flex items-center gap-2">
              <Select value={sortConfig.field} onValueChange={(value) => handleSort(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="codigo">Código</SelectItem>
                  <SelectItem value="descripcion">Descripción</SelectItem>
                  <SelectItem value="cantidad">Cantidad</SelectItem>
                  <SelectItem value="costo">Costo</SelectItem>
                  <SelectItem value="estado">Estado</SelectItem>
                  <SelectItem value="verificado">Verificación</SelectItem>
                </SelectContent>
              </Select>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSortConfig(prev => ({ ...prev, direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}
              >
                {sortConfig.direction === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            // 💀 Loading skeleton
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : paginatedItems.length === 0 ? (
            // 🚫 Empty state
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-12"
            >
              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron equipos</h3>
              <p className="text-gray-600 mb-4">
                {activeFiltersCount > 0
                  ? 'Intenta ajustar los filtros para ver más resultados'
                  : 'No hay equipos en esta lista'
                }
              </p>
              {activeFiltersCount > 0 && (
                <Button variant="outline" onClick={clearFilters}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Limpiar filtros
                </Button>
              )}
            </motion.div>
          ) : (
            // 📋 Items list
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-2"
            >
              {paginatedItems.map((item) => {
                const statusInfo = getStatusInfo(item.estado)
                const origenInfo = getOrigenInfo(item.origen)
                const costoTotal = calcularCostoItem(item)
                const StatusIcon = statusInfo.icon

                return (
                  <motion.div
                    key={item.id}
variants={{
  hidden: { opacity: 0, y: 10 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.2,
      ease: [0, 0, 0.2, 1] as const
    }
  },
  exit: { 
    opacity: 0, 
    y: -10,
    transition: {
      duration: 0.15
    }
  }
}}
                    className="group border rounded-lg p-4 hover:shadow-md transition-all duration-200 bg-white"
                  >
                    <div className="flex items-center justify-between">
                      {/* Left section - Main info */}
                      <div className="flex items-center space-x-4 flex-1">
                        {/* Verification checkbox */}
                        {editable && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Checkbox
                                checked={item.verificado}
                                onCheckedChange={(checked) => handleVerificado(item.id, !!checked)}
                                className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{item.verificado ? 'Remover verificación' : 'Marcar como verificado'}</p>
                            </TooltipContent>
                          </Tooltip>
                        )}

                        {/* Code and description */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                              {item.codigo}
                            </code>
                            <Badge variant={origenInfo.variant} className="text-xs">
                              {origenInfo.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-900 truncate" title={item.descripcion}>
                            {item.descripcion}
                          </p>
                        </div>

                        {/* Quantity */}
                        <div className="text-center min-w-0">
                          <p className="text-xs text-gray-500">Cantidad</p>
                          <p className="text-sm font-medium">{item.cantidad || 0} {item.unidad}</p>
                        </div>

                        {/* Cost */}
                        <div className="text-center min-w-0">
                          <p className="text-xs text-gray-500">Costo Total</p>
                          <p className="text-sm font-medium">
                            {costoTotal > 0 ? formatCurrency(costoTotal) : 'Sin cotización'}
                          </p>
                        </div>

                        {/* Status */}
                        <div className="flex items-center gap-2">
                          <Badge variant={statusInfo.variant as "outline" | "default" | "secondary"} className="flex items-center gap-1">
                            <StatusIcon className="h-3 w-3" />
                            {statusInfo.label}
                          </Badge>
                        </div>
                      </div>

                      {/* Right section - Actions */}
                      {editable && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Editar item</p>
                            </TooltipContent>
                          </Tooltip>
                          
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Eliminar item</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </div>

                    {/* Comment section (if exists) */}
                    {item.comentarioRevision && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-500 mb-1">Comentario de revisión:</p>
                            <p className="text-sm text-gray-700">{item.comentarioRevision}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )
              })}
            </motion.div>
          )}
        </CardContent>
      </Card>

      {/* 📄 Pagination */}
      {totalPages > 1 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-between"
        >
          <div className="text-sm text-gray-600">
            Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, processedItems.length)} de {processedItems.length} resultados
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center space-x-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pageNum = i + 1
                return (
                  <Button
                    key={pageNum}
                    variant={currentPage === pageNum ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(pageNum)}
                    className="w-8 h-8 p-0"
                  >
                    {pageNum}
                  </Button>
                )
              })}
            </div>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
