'use client'

// ===================================================
// 📁 Archivo: VistaListaCompacta.tsx
// 📌 Ubicación: src/components/proyectos/equipos/VistaListaCompacta.tsx
// 🔧 Descripción: Vista de lista compacta con filtros avanzados
//
// 🎨 Mejoras UX/UI aplicadas:
// - Lista compacta con información esencial
// - Filtros múltiples y búsqueda en tiempo real
// - Ordenamiento dinámico
// - Paginación y virtualización
// ===================================================

import React, { useState, useMemo, memo } from 'react'
import { motion } from 'framer-motion'
import { 
  staggerContainerVariants,
  staggerItemVariants 
} from '@/lib/animations/masterDetailAnimations'
import { 
  useIsMobile,
  useIsTouchDevice,
  touchInteractions,
  getResponsiveClasses
} from '@/lib/responsive/breakpoints'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  CheckCircle,
  ArrowLeftRight,
  Plus,
  Trash2,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  DollarSign,
  Eye,
  EyeOff,
  RotateCcw,
  Download,
  Grid3X3,
  List,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils/currency'
import type { ProyectoEquipoCotizadoItem, ListaEquipoItem } from '@/types'

// 🎯 Tipos para el componente
interface ComparisonData {
  type: 'mantenido' | 'reemplazado' | 'agregado' | 'descartado' | 'no_incluido'
  category: string
  pei: ProyectoEquipoCotizadoItem | null
  lei: ListaEquipoItem | null
  grupo: string
  costoPEI: number
  costoLEI: number
  diferencia: number
  estado: string
  trazabilidad?: {
    original: ProyectoEquipoCotizadoItem
    reemplazo: ListaEquipoItem
    motivo: string
  }
}

interface Summary {
  mantenidos: number
  reemplazados: number
  agregados: number
  descartados: number
  totalItems: number
  impactoFinanciero: number
  porcentajeCambio: number
}

interface Props {
  comparisons: ComparisonData[]
  summary: Summary
  searchTerm: string
  onSearchChange: (term: string) => void
  filterStatus: string
  onFilterChange: (status: string) => void
  className?: string
}

// 🎨 Animation variants
// ✅ Usando variantes centralizadas de animación

// 🎯 Función para obtener configuración por tipo
const getTypeConfig = (type: ComparisonData['type']) => {
  switch (type) {
    case 'mantenido':
      return {
        icon: CheckCircle,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        badgeVariant: 'default' as const,
        label: 'Mantenido'
      }
    case 'reemplazado':
      return {
        icon: ArrowLeftRight,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        badgeVariant: 'secondary' as const,
        label: 'Reemplazado'
      }
    case 'agregado':
      return {
        icon: Plus,
        color: 'text-purple-600',
        bgColor: 'bg-purple-50',
        badgeVariant: 'outline' as const,
        label: 'Agregado'
      }
    case 'descartado':
      return {
        icon: Trash2,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        badgeVariant: 'destructive' as const,
        label: 'Descartado'
      }
    default:
      return {
        icon: Minus,
        color: 'text-gray-600',
        bgColor: 'bg-gray-50',
        badgeVariant: 'outline' as const,
        label: 'No Incluido'
      }
  }
}

// 🎯 Componente de item compacto
const CompactItem = ({ item, index }: { item: ComparisonData; index: number }) => {
  const config = getTypeConfig(item.type)
  const Icon = config.icon
  
  return (
    <motion.div
      variants={staggerItemVariants}
      className="group hover:bg-gray-50 transition-colors duration-150"
    >
      <div className="flex items-center space-x-4 p-4 border-b border-gray-100 last:border-b-0">
        {/* Icono y tipo */}
        <div className="flex items-center space-x-3 min-w-0 flex-1">
          <div className={`flex items-center justify-center w-8 h-8 rounded-full ${config.bgColor}`}>
            <Icon className={`h-4 w-4 ${config.color}`} />
          </div>
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2 mb-1">
              <Badge variant={config.badgeVariant as 'outline' | 'default' | 'secondary'} className="text-xs">
                {config.label}
              </Badge>
              <span className="text-xs text-gray-500">#{index + 1}</span>
            </div>
            <h3 className="font-medium text-gray-900 truncate text-sm">
              {item.pei?.descripcion || item.lei?.descripcion || 'Sin descripción'}
            </h3>
            <div className="flex items-center space-x-4 text-xs text-gray-500 mt-1">
              <span>Cat: {item.category}</span>
              <span>Grupo: {item.grupo}</span>
              {item.pei?.codigo && <span>Código: {item.pei.codigo}</span>}
            </div>
          </div>
        </div>
        
        {/* Costos */}
        <div className="hidden md:flex flex-col items-end space-y-1 min-w-0">
          {item.costoPEI > 0 && (
            <div className="text-xs text-gray-600">
              <span className="text-gray-500">Com:</span> {formatCurrency(item.costoPEI)}
            </div>
          )}
          {item.costoLEI > 0 && (
            <div className="text-xs text-gray-600">
              <span className="text-gray-500">Proy:</span> {formatCurrency(item.costoLEI)}
            </div>
          )}
        </div>
        
        {/* Impacto financiero */}
        <div className="flex items-center space-x-1 min-w-0">
          {item.diferencia > 0 && <TrendingUp className="h-4 w-4 text-red-500" />}
          {item.diferencia < 0 && <TrendingDown className="h-4 w-4 text-green-500" />}
          {item.diferencia === 0 && <Minus className="h-4 w-4 text-gray-400" />}
          <span className={`font-semibold text-sm ${
            item.diferencia > 0 ? 'text-red-600' : 
            item.diferencia < 0 ? 'text-green-600' : 'text-gray-600'
          }`}>
            {item.diferencia !== 0 && (item.diferencia > 0 ? '+' : '')}
            {formatCurrency(item.diferencia)}
          </span>
        </div>
      </div>
    </motion.div>
  )
  }
  
  const VistaListaCompacta = memo(function VistaListaCompacta({ 
  comparisons, 
  summary, 
  searchTerm, 
  onSearchChange, 
  filterStatus, 
  onFilterChange, 
  className = '' 
}: Props) {
  // 📱 Responsive hooks
  const isMobile = useIsMobile()
  const isTouchDevice = useIsTouchDevice()
  const touchButtonClasses = isTouchDevice ? touchInteractions.button.touch : touchInteractions.button.desktop
  const containerSpacing = getResponsiveClasses({
    xs: 'space-y-4',
    md: 'space-y-6'
  })
  const gridClasses = getResponsiveClasses({
    xs: 'grid-cols-1 gap-4',
    md: 'grid-cols-2 gap-6',
    lg: 'grid-cols-3 gap-6'
  })
  
  // 🎯 Estados para filtros y ordenamiento (usando props del padre para search y filter)
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [sortBy, setSortBy] = useState<string>('diferencia')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(20)
  const [showFilters, setShowFilters] = useState(false)
  
  // 📊 Datos filtrados y ordenados
  const filteredAndSortedData = useMemo(() => {
    let filtered = comparisons.filter(item => {
      const matchesSearch = !searchTerm || 
        (item.pei?.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         item.lei?.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         item.pei?.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         item.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
         item.grupo.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesType = typeFilter === 'all' || item.type === typeFilter
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter
      
      return matchesSearch && matchesType && matchesCategory
    })
    
    // Ordenamiento
    filtered.sort((a, b) => {
      let aValue: any, bValue: any
      
      switch (sortBy) {
        case 'descripcion':
          aValue = (a.pei?.descripcion || a.lei?.descripcion || '').toLowerCase()
          bValue = (b.pei?.descripcion || b.lei?.descripcion || '').toLowerCase()
          break
        case 'category':
          aValue = a.category.toLowerCase()
          bValue = b.category.toLowerCase()
          break
        case 'grupo':
          aValue = a.grupo.toLowerCase()
          bValue = b.grupo.toLowerCase()
          break
        case 'costoPEI':
          aValue = a.costoPEI
          bValue = b.costoPEI
          break
        case 'costoLEI':
          aValue = a.costoLEI
          bValue = b.costoLEI
          break
        case 'diferencia':
        default:
          aValue = Math.abs(a.diferencia)
          bValue = Math.abs(b.diferencia)
          break
      }
      
      if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1
      if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1
      return 0
    })
    
    return filtered
  }, [comparisons, searchTerm, typeFilter, categoryFilter, sortBy, sortOrder])
  
  // 📄 Paginación
  const totalPages = Math.ceil(filteredAndSortedData.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const paginatedData = filteredAndSortedData.slice(startIndex, startIndex + itemsPerPage)
  
  // 📊 Opciones para filtros
  const categories = Array.from(new Set(comparisons.map(c => c.category))).sort()
  const types = ['mantenido', 'reemplazado', 'agregado', 'descartado', 'no_incluido']
  
  // 🔄 Función para resetear filtros
  const resetFilters = () => {
    onSearchChange('')
    setTypeFilter('all')
    setCategoryFilter('all')
    setSortBy('diferencia')
    setSortOrder('desc')
    setCurrentPage(1)
  }
  
  // 📊 Estadísticas rápidas
  const stats = {
    total: filteredAndSortedData.length,
    impactoTotal: filteredAndSortedData.reduce((sum, c) => sum + c.diferencia, 0)
  }

  return (
    <motion.div
      className={`space-y ${containerSpacing} ${className}`}
      variants={staggerContainerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 🔍 Barra de búsqueda y controles */}
      <motion.div variants={staggerItemVariants}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
              {/* Búsqueda */}
              <div className="flex items-center space-x-4 flex-1">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                      placeholder="Buscar por descripción, código, categoría..."
                      value={searchTerm}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className="pl-10"
                    />
                </div>
                
                {/* Controles */}
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center space-x-1"
                  >
                    <Filter className="h-4 w-4" />
                    <span className="hidden sm:inline">Filtros</span>
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={resetFilters}
                    className="flex items-center space-x-1"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span className="hidden sm:inline">Reset</span>
                  </Button>
                </div>
              </div>
              
              {/* Estadísticas */}
              <div className="flex items-center space-x-4 text-sm text-gray-600">
                <div className="flex items-center space-x-1">
                  <Package className="h-4 w-4" />
                  <span>{stats.total} items</span>
                </div>
                <div className={`flex items-center space-x-1 ${
                  stats.impactoTotal >= 0 ? 'text-red-600' : 'text-green-600'
                }`}>
                  <DollarSign className="h-4 w-4" />
                  <span>{stats.impactoTotal >= 0 ? '+' : ''}{formatCurrency(stats.impactoTotal)}</span>
                </div>
              </div>
            </div>
            
            {/* 🎛️ Filtros expandidos */}
            {showFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-4 pt-4 border-t border-gray-200"
              >
                <div className={`grid ${gridClasses}`}>
                  {/* Filtro por tipo */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Tipo</label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los tipos</SelectItem>
                        {types.map(type => (
                          <SelectItem key={type} value={type}>
                            {getTypeConfig(type as any).label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Filtro por categoría */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Categoría</label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las categorías</SelectItem>
                        {categories.map(category => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Ordenar por */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Ordenar por</label>
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="diferencia">Impacto financiero</SelectItem>
                        <SelectItem value="descripcion">Descripción</SelectItem>
                        <SelectItem value="category">Categoría</SelectItem>
                        <SelectItem value="grupo">Grupo</SelectItem>
                        <SelectItem value="costoPEI">Costo comercial</SelectItem>
                        <SelectItem value="costoLEI">Costo proyectos</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Orden */}
                  <div>
                    <label className="text-xs font-medium text-gray-700 mb-1 block">Orden</label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                      className="h-8 w-full flex items-center justify-center space-x-1"
                    >
                      {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
                      <span>{sortOrder === 'asc' ? 'Ascendente' : 'Descendente'}</span>
                    </Button>
                  </div>
                </div>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 📋 Lista compacta */}
      <motion.div variants={staggerItemVariants}>
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {paginatedData.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {paginatedData.map((item, index) => (
                  <CompactItem
                    key={`${item.type}-${item.pei?.id || item.lei?.id || startIndex + index}`}
                    item={item}
                    index={startIndex + index}
                  />
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No se encontraron resultados</h3>
                <p className="text-gray-600 mb-4">Intenta ajustar los filtros o términos de búsqueda.</p>
                <Button variant="outline" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Resetear filtros
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 📄 Paginación */}
      {totalPages > 1 && (
        <motion.div variants={staggerItemVariants}>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600">
                  Mostrando {startIndex + 1} - {Math.min(startIndex + itemsPerPage, filteredAndSortedData.length)} de {filteredAndSortedData.length} resultados
                </div>
                
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <div className="flex items-center space-x-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const page = i + 1
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="w-8 h-8 p-0"
                        >
                          {page}
                        </Button>
                      )
                    })}
                  </div>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </motion.div>
  )
})

export default VistaListaCompacta
