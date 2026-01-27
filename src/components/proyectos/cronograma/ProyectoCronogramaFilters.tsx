// ===================================================
// 📁 Archivo: ProyectoCronogramaFilters.tsx
// 📌 Ubicación: src/components/proyectos/cronograma/ProyectoCronogramaFilters.tsx
// 🔧 Descripción: Componente para filtros avanzados del cronograma
// 🎯 Funcionalidades: Filtros por estado, responsable, fechas, etc.
// ✍️ Autor: Sistema de IA Mejorado
// 📅 Última actualización: 2025-09-23
// ===================================================

'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Filter,
  X,
  Calendar,
  User,
  Target,
  Settings,
  Search,
  RotateCcw
} from 'lucide-react'

interface ProyectoCronogramaFiltersProps {
  onFiltersChange?: (filters: FilterState) => void
  initialFilters?: Partial<FilterState>
}

export interface FilterState {
  search: string
  estado: string[]
  prioridad: string[]
  responsableId: string
  edtId: string
  // zona: string // TODO: lógica de zonas eliminada tras migración a cronograma de 5 niveles (sin zonas)
  fechaDesde: string
  fechaHasta: string
  soloConRetrasos: boolean
  soloSinProgreso: boolean
  faseId: string
}

const ESTADOS_OPTIONS = [
  { value: 'planificado', label: 'Planificado' },
  { value: 'en_progreso', label: 'En Progreso' },
  { value: 'completado', label: 'Completado' },
  { value: 'pausado', label: 'Pausado' },
  { value: 'cancelado', label: 'Cancelado' },
  { value: 'detenido', label: 'Detenido' }
]

const PRIORIDADES_OPTIONS = [
  { value: 'baja', label: 'Baja' },
  { value: 'media', label: 'Media' },
  { value: 'alta', label: 'Alta' },
  { value: 'critica', label: 'Crítica' }
]

export function ProyectoCronogramaFilters({
  onFiltersChange,
  initialFilters
}: ProyectoCronogramaFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    estado: [],
    prioridad: [],
    responsableId: '',
    edtId: '',
    // zona: '', // TODO: lógica de zonas eliminada tras migración a cronograma de 5 niveles (sin zonas)
    fechaDesde: '',
    fechaHasta: '',
    soloConRetrasos: false,
    soloSinProgreso: false,
    faseId: '',
    ...initialFilters
  })

  const [isExpanded, setIsExpanded] = useState(false)

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    const newFilters = { ...filters, [key]: value }
    setFilters(newFilters)
    onFiltersChange?.(newFilters)
  }

  const handleEstadoChange = (estado: string, checked: boolean) => {
    const newEstados = checked
      ? [...filters.estado, estado]
      : filters.estado.filter(e => e !== estado)
    handleFilterChange('estado', newEstados)
  }

  const handlePrioridadChange = (prioridad: string, checked: boolean) => {
    const newPrioridades = checked
      ? [...filters.prioridad, prioridad]
      : filters.prioridad.filter(p => p !== prioridad)
    handleFilterChange('prioridad', newPrioridades)
  }

  const clearFilters = () => {
    const emptyFilters: FilterState = {
      search: '',
      estado: [],
      prioridad: [],
      responsableId: '',
      edtId: '',
      // zona: '', // TODO: lógica de zonas eliminada tras migración a cronograma de 5 niveles (sin zonas)
      fechaDesde: '',
      fechaHasta: '',
      soloConRetrasos: false,
      soloSinProgreso: false,
      faseId: ''
    }
    setFilters(emptyFilters)
    onFiltersChange?.(emptyFilters)
  }

  const getActiveFiltersCount = () => {
    let count = 0
    if (filters.search) count++
    if (filters.estado.length > 0) count++
    if (filters.prioridad.length > 0) count++
    if (filters.responsableId) count++
    if (filters.edtId) count++
    // if (filters.zona) count++ // TODO: lógica de zonas eliminada tras migración a cronograma de 5 niveles (sin zonas)
    if (filters.fechaDesde) count++
    if (filters.fechaHasta) count++
    if (filters.soloConRetrasos) count++
    if (filters.soloSinProgreso) count++
    if (filters.faseId) count++
    return count
  }

  const activeFiltersCount = getActiveFiltersCount()

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros Avanzados
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFiltersCount} activo{activeFiltersCount > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="text-red-600 hover:text-red-800"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Limpiar
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? 'Ocultar' : 'Mostrar'} Filtros
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-6">
          {/* Búsqueda */}
          <div className="space-y-2">
            <Label htmlFor="search">Buscar EDTs</Label>
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="search"
                placeholder="Buscar por nombre, descripción..."
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Estados */}
          <div className="space-y-3">
            <Label>Estados</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {ESTADOS_OPTIONS.map((estado) => (
                <div key={estado.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`estado-${estado.value}`}
                    checked={filters.estado.includes(estado.value)}
                    onCheckedChange={(checked) =>
                      handleEstadoChange(estado.value, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`estado-${estado.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {estado.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Prioridades */}
          <div className="space-y-3">
            <Label>Prioridades</Label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {PRIORIDADES_OPTIONS.map((prioridad) => (
                <div key={prioridad.value} className="flex items-center space-x-2">
                  <Checkbox
                    id={`prioridad-${prioridad.value}`}
                    checked={filters.prioridad.includes(prioridad.value)}
                    onCheckedChange={(checked) =>
                      handlePrioridadChange(prioridad.value, checked as boolean)
                    }
                  />
                  <Label
                    htmlFor={`prioridad-${prioridad.value}`}
                    className="text-sm font-normal cursor-pointer"
                  >
                    {prioridad.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Filtros específicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Responsable */}
            <div className="space-y-2">
              <Label htmlFor="responsable">Responsable</Label>
              <Select
                value={filters.responsableId}
                onValueChange={(value) => handleFilterChange('responsableId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar responsable" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los responsables</SelectItem>
                  {/* TODO: Cargar lista de usuarios */}
                  <SelectItem value="user1">Juan Pérez</SelectItem>
                  <SelectItem value="user2">María García</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Categoría de Servicio */}
            <div className="space-y-2">
              <Label htmlFor="categoria">Categoría de Servicio</Label>
              <Select
                value={filters.edtId}
                onValueChange={(value) => handleFilterChange('edtId', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {/* TODO: Cargar lista de categorías */}
                  <SelectItem value="cat1">Ingeniería Civil</SelectItem>
                  <SelectItem value="cat2">Instalaciones Eléctricas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Zona - Eliminado según FASE 3 */}
            {/* <div className="space-y-2">
              <Label htmlFor="zona">Zona</Label>
              <Input
                id="zona"
                placeholder="Filtrar por zona"
                value={filters.zona}
                onChange={(e) => handleFilterChange('zona', e.target.value)}
              />
            </div> */}
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fechaDesde">Fecha Desde</Label>
              <Input
                id="fechaDesde"
                type="date"
                value={filters.fechaDesde}
                onChange={(e) => handleFilterChange('fechaDesde', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fechaHasta">Fecha Hasta</Label>
              <Input
                id="fechaHasta"
                type="date"
                value={filters.fechaHasta}
                onChange={(e) => handleFilterChange('fechaHasta', e.target.value)}
              />
            </div>
          </div>

          {/* Opciones especiales */}
          <div className="space-y-3">
            <Label>Opciones Especiales</Label>
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="soloConRetrasos"
                  checked={filters.soloConRetrasos}
                  onCheckedChange={(checked) =>
                    handleFilterChange('soloConRetrasos', checked)
                  }
                />
                <Label
                  htmlFor="soloConRetrasos"
                  className="text-sm font-normal cursor-pointer"
                >
                  Solo EDTs con retrasos
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="soloSinProgreso"
                  checked={filters.soloSinProgreso}
                  onCheckedChange={(checked) =>
                    handleFilterChange('soloSinProgreso', checked)
                  }
                />
                <Label
                  htmlFor="soloSinProgreso"
                  className="text-sm font-normal cursor-pointer"
                >
                  Solo EDTs sin progreso reciente
                </Label>
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  )
}