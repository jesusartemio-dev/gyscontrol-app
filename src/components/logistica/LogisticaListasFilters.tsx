// ===================================================
// 📁 Archivo: LogisticaListasFilters.tsx
// 📌 Descripción: Componente de filtros avanzados para listas de logística
// 🧠 Uso: Filtros profesionales con múltiples criterios
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, X, Calendar, Package, User, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import type { Proyecto, ListaEquipo, EstadoListaEquipo } from '@/types'

interface FilterState {
  search: string
  proyectoId: string | 'all'
  estado: EstadoListaEquipo | 'all'
  fechaDesde: string
  fechaHasta: string
  conItems: boolean | null
  responsableId: string | 'all'
}

interface LogisticaListasFiltersProps {
  proyectos: Proyecto[]
  listas: ListaEquipo[]
  onFiltersChange: (filteredListas: ListaEquipo[]) => void
  className?: string
}

const ESTADOS_LISTA: { value: EstadoListaEquipo | 'all'; label: string; color: string }[] = [
  { value: 'all', label: 'Todos los estados', color: 'bg-gray-100' },
  { value: 'borrador', label: 'Borrador', color: 'bg-gray-500' },
  { value: 'por_revisar', label: 'Por Revisar', color: 'bg-yellow-500' },
  { value: 'por_cotizar', label: 'Por Cotizar', color: 'bg-blue-500' },
  { value: 'por_validar', label: 'Por Validar', color: 'bg-orange-500' },
  { value: 'por_aprobar', label: 'Por Aprobar', color: 'bg-purple-500' },
  { value: 'aprobado', label: 'Aprobado', color: 'bg-green-500' },
  { value: 'rechazado', label: 'Rechazado', color: 'bg-red-500' },
]

export default function LogisticaListasFilters({ proyectos, listas, onFiltersChange, className }: LogisticaListasFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    proyectoId: 'all',
    estado: 'all',
    fechaDesde: '',
    fechaHasta: '',
    conItems: null,
    responsableId: 'all'
  })

  const [showAdvanced, setShowAdvanced] = useState(false)
  const [activeFiltersCount, setActiveFiltersCount] = useState(0)

  // Apply filters whenever filters or listas change
  useEffect(() => {
    if (!listas || !Array.isArray(listas)) {
      onFiltersChange([])
      setActiveFiltersCount(0)
      return
    }
    
    const filtered = applyFilters(listas, filters)
    onFiltersChange(filtered)
    
    // Count active filters
    const count = Object.entries(filters).reduce((acc, [key, value]) => {
      if (key === 'search' && value) return acc + 1
      if (key === 'proyectoId' && value && value !== 'all') return acc + 1
      if (key === 'estado' && value !== 'all') return acc + 1
      if (key === 'fechaDesde' && value) return acc + 1
      if (key === 'fechaHasta' && value) return acc + 1
      if (key === 'conItems' && value !== null) return acc + 1
      if (key === 'responsableId' && value && value !== 'all') return acc + 1
      return acc
    }, 0)
    setActiveFiltersCount(count)
  }, [filters, listas, onFiltersChange])

  const applyFilters = (listas: ListaEquipo[], filters: FilterState): ListaEquipo[] => {
    if (!listas || !Array.isArray(listas)) {
      return []
    }
    
    return listas.filter(lista => {
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        const matchesSearch = 
          lista.nombre.toLowerCase().includes(searchLower) ||
          lista.codigo.toLowerCase().includes(searchLower) ||
          lista.proyecto?.nombre?.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Project filter
      if (filters.proyectoId && filters.proyectoId !== 'all' && lista.proyectoId !== filters.proyectoId) {
        return false
      }

      // Status filter
      if (filters.estado !== 'all' && lista.estado !== filters.estado) {
        return false
      }

      // Date filters
      if (filters.fechaDesde) {
        const listaDate = new Date(lista.createdAt)
        const fromDate = new Date(filters.fechaDesde)
        if (listaDate < fromDate) return false
      }

      if (filters.fechaHasta) {
        const listaDate = new Date(lista.createdAt)
        const toDate = new Date(filters.fechaHasta)
        toDate.setHours(23, 59, 59, 999) // End of day
        if (listaDate > toDate) return false
      }

      // Items filter
      if (filters.conItems !== null) {
        const hasItems = lista.items && lista.items.length > 0
        if (filters.conItems && !hasItems) return false
        if (!filters.conItems && hasItems) return false
      }

      return true
    })
  }

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const clearAllFilters = () => {
    setFilters({
      search: '',
      proyectoId: 'all',
      estado: 'all',
      fechaDesde: '',
      fechaHasta: '',
      conItems: null,
      responsableId: 'all'
    })
  }

  const getEstadoInfo = (estado: EstadoListaEquipo) => {
    return ESTADOS_LISTA.find(e => e.value === estado) || ESTADOS_LISTA[0]
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Búsqueda
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
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              {showAdvanced ? 'Ocultar' : 'Avanzado'}
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllFilters}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Basic Filters Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, código o proyecto..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Project Filter */}
          <Select
            value={filters.proyectoId}
            onValueChange={(value) => handleFilterChange('proyectoId', value)}
          >
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <SelectValue placeholder="Todos los proyectos" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los proyectos</SelectItem>
              {proyectos.map(proyecto => (
                <SelectItem key={proyecto.id} value={proyecto.id}>
                  {proyecto.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Status Filter */}
          <Select
            value={filters.estado}
            onValueChange={(value) => handleFilterChange('estado', value as EstadoListaEquipo | 'all')}
          >
            <SelectTrigger>
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4" />
                <SelectValue placeholder="Todos los estados" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {ESTADOS_LISTA.map(estado => (
                <SelectItem key={estado.value} value={estado.value}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${estado.color}`} />
                    {estado.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Advanced Filters */}
        {showAdvanced && (
          <div className="border-t pt-4 space-y-4">
            <h4 className="font-medium text-sm text-gray-700 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Filtros Avanzados
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Date Range */}
              <div>
                <Label htmlFor="fechaDesde" className="text-sm font-medium">Fecha desde</Label>
                <Input
                  id="fechaDesde"
                  type="date"
                  value={filters.fechaDesde}
                  onChange={(e) => handleFilterChange('fechaDesde', e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="fechaHasta" className="text-sm font-medium">Fecha hasta</Label>
                <Input
                  id="fechaHasta"
                  type="date"
                  value={filters.fechaHasta}
                  onChange={(e) => handleFilterChange('fechaHasta', e.target.value)}
                  className="mt-1"
                />
              </div>

              {/* Items Filter */}
              <div>
                <Label className="text-sm font-medium">Contenido</Label>
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="conItems"
                      checked={filters.conItems === true}
                      onCheckedChange={(checked) => 
                        handleFilterChange('conItems', checked ? true : null)
                      }
                    />
                    <Label htmlFor="conItems" className="text-sm">Con ítems</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="sinItems"
                      checked={filters.conItems === false}
                      onCheckedChange={(checked) => 
                        handleFilterChange('conItems', checked ? false : null)
                      }
                    />
                    <Label htmlFor="sinItems" className="text-sm">Sin ítems</Label>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Filters Display */}
        {activeFiltersCount > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <span className="text-sm text-gray-600">Filtros activos:</span>
            {filters.search && (
              <Badge variant="outline" className="flex items-center gap-1">
                Búsqueda: "{filters.search}"
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleFilterChange('search', '')}
                />
              </Badge>
            )}
            {filters.proyectoId && filters.proyectoId !== 'all' && (
              <Badge variant="outline" className="flex items-center gap-1">
                Proyecto: {proyectos.find(p => p.id === filters.proyectoId)?.nombre}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleFilterChange('proyectoId', 'all')}
                />
              </Badge>
            )}
            {filters.estado !== 'all' && (
              <Badge variant="outline" className="flex items-center gap-1">
                Estado: {getEstadoInfo(filters.estado as EstadoListaEquipo).label}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleFilterChange('estado', 'all')}
                />
              </Badge>
            )}
            {filters.fechaDesde && (
              <Badge variant="outline" className="flex items-center gap-1">
                Desde: {filters.fechaDesde}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleFilterChange('fechaDesde', '')}
                />
              </Badge>
            )}
            {filters.fechaHasta && (
              <Badge variant="outline" className="flex items-center gap-1">
                Hasta: {filters.fechaHasta}
                <X 
                  className="h-3 w-3 cursor-pointer" 
                  onClick={() => handleFilterChange('fechaHasta', '')}
                />
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}