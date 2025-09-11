// ===================================================
// 📁 Archivo: FiltrosAprovisionamiento.tsx
// 📌 Ubicación: src/components/finanzas/
// 🔧 Descripción: Componente de filtros funcionales para aprovisionamiento
//
// 🧠 Funcionalidades:
// - Filtros interactivos con estado
// - Búsqueda en tiempo real
// - Filtros por estado, responsable, fechas
// - Integración con URL params
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { 
  Search, 
  Filter, 
  X,
  Calendar,
  AlertTriangle,
  RotateCcw
} from 'lucide-react'
import { debounce } from 'lodash'

// ✅ Tipos para los filtros
export interface FiltrosAprovisionamiento {
  search: string
  estado: string
  responsable: string
  fechaInicio: string
  fechaFin: string
  alertas: boolean
  page: number
  limit: number
}

// Alias para compatibilidad interna
type FiltrosState = FiltrosAprovisionamiento

interface FiltrosAprovisionamientoProps {
  filtros: FiltrosState
  onFiltrosChange: (filtros: FiltrosState) => void
  loading?: boolean
  className?: string
}

// 🔁 Opciones predefinidas
const ESTADOS_OPTIONS = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'activo', label: 'Activo' },
  { value: 'pausado', label: 'Pausado' },
  { value: 'completado', label: 'Completado' }
]

const RESPONSABLES_OPTIONS = [
  { value: 'todos', label: 'Todos los responsables' },
  { value: 'juan.perez', label: 'Juan Pérez' },
  { value: 'maria.garcia', label: 'María García' },
  { value: 'carlos.lopez', label: 'Carlos López' },
  { value: 'ana.rodriguez', label: 'Ana Rodríguez' },
  { value: 'luis.martinez', label: 'Luis Martínez' }
]

export default function FiltrosAprovisionamiento({ 
  filtros,
  onFiltrosChange,
  loading = false,
  className = '' 
}: FiltrosAprovisionamientoProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [isExpanded, setIsExpanded] = useState(false)
  const [activeFiltersCount, setActiveFiltersCount] = useState(0)
  
  // 🔄 Debounced search para evitar demasiadas llamadas
  const debouncedSearch = useCallback(
    debounce((searchTerm: string) => {
      onFiltrosChange({ ...filtros, search: searchTerm, page: 1 })
    }, 500),
    [filtros, onFiltrosChange]
  )
  
  // 📡 Manejar cambios de filtros
  const handleFilterChange = useCallback((newFiltros: Partial<FiltrosState>) => {
    onFiltrosChange({ ...filtros, ...newFiltros, page: 1 })
  }, [filtros, onFiltrosChange])
  
  // 🔄 Contar filtros activos
  useEffect(() => {
    let count = 0
    if (filtros.search) count++
    if (filtros.estado !== 'todos') count++
    if (filtros.responsable !== 'todos') count++
    if (filtros.fechaInicio) count++
    if (filtros.fechaFin) count++
    if (filtros.alertas) count++
    
    setActiveFiltersCount(count)
  }, [filtros])
  
  // 📝 Handlers para cambios de filtros
  const handleSearchChange = (value: string) => {
    debouncedSearch(value)
  }
  
  const handleSingleFilterChange = (key: keyof FiltrosState, value: any) => {
    handleFilterChange({ [key]: value })
  }
  
  const handleReset = () => {
    const resetFiltros: FiltrosState = {
      search: '',
      estado: 'todos',
      responsable: 'todos',
      fechaInicio: '',
      fechaFin: '',
      alertas: false,
      page: 1,
      limit: filtros.limit
    }
    
    onFiltrosChange(resetFiltros)
  }
  
  const handleToggleAlertas = () => {
    handleFilterChange({ alertas: !filtros.alertas })
  }
  
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros Avanzados
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleReset}
                className="text-muted-foreground hover:text-foreground"
              >
                <RotateCcw className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Contraer' : 'Expandir'}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* 🔍 Búsqueda principal - siempre visible */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, código o responsable..."
              value={filtros.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 pr-4"
            />
            {filtros.search && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSearchChange('')}
                className="absolute right-1 top-1 h-7 w-7 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
          
          {/* 🎯 Filtros rápidos */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filtros.alertas ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggleAlertas}
              className="h-8"
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              Con Alertas
            </Button>
            
            {ESTADOS_OPTIONS.slice(1).map((estado) => (
              <Button
                key={estado.value}
                variant={filtros.estado === estado.value ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleSingleFilterChange('estado', estado.value)}
                className="h-8"
              >
                {estado.label}
              </Button>
            ))}
          </div>
        </div>
        
        {/* 📊 Filtros avanzados - expandibles */}
        {isExpanded && (
          <div className="mt-6 pt-6 border-t">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado del Proyecto</label>
                <Select
                  value={filtros.estado}
                  onValueChange={(value) => handleSingleFilterChange('estado', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ESTADOS_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Responsable</label>
                <Select
                  value={filtros.responsable}
                  onValueChange={(value) => handleSingleFilterChange('responsable', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RESPONSABLES_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Rango de Fechas</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={filtros.fechaInicio}
                      onChange={(e) => handleSingleFilterChange('fechaInicio', e.target.value)}
                      className="pl-8"
                      placeholder="Desde"
                    />
                  </div>
                  <div className="relative flex-1">
                    <Calendar className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="date"
                      value={filtros.fechaFin}
                      onChange={(e) => handleSingleFilterChange('fechaFin', e.target.value)}
                      className="pl-8"
                      placeholder="Hasta"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* 🏷️ Filtros activos */}
        {activeFiltersCount > 0 && (
          <div className="mt-4 pt-4 border-t">
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-muted-foreground">Filtros activos:</span>
              
              {filtros.search && (
                <Badge variant="secondary" className="gap-1">
                  Búsqueda: {filtros.search}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleSearchChange('')}
                  />
                </Badge>
              )}
              
              {filtros.estado !== 'todos' && (
                <Badge variant="secondary" className="gap-1">
                  Estado: {ESTADOS_OPTIONS.find(e => e.value === filtros.estado)?.label}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleSingleFilterChange('estado', 'todos')}
                  />
                </Badge>
              )}
              
              {filtros.responsable !== 'todos' && (
                <Badge variant="secondary" className="gap-1">
                  Responsable: {RESPONSABLES_OPTIONS.find(r => r.value === filtros.responsable)?.label}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleSingleFilterChange('responsable', 'todos')}
                  />
                </Badge>
              )}
              
              {filtros.fechaInicio && (
                <Badge variant="secondary" className="gap-1">
                  Desde: {filtros.fechaInicio}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleSingleFilterChange('fechaInicio', '')}
                  />
                </Badge>
              )}
              
              {filtros.fechaFin && (
                <Badge variant="secondary" className="gap-1">
                  Hasta: {filtros.fechaFin}
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleSingleFilterChange('fechaFin', '')}
                  />
                </Badge>
              )}
              
              {filtros.alertas && (
                <Badge variant="destructive" className="gap-1">
                  Con Alertas
                  <X 
                    className="h-3 w-3 cursor-pointer" 
                    onClick={() => handleSingleFilterChange('alertas', false)}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}