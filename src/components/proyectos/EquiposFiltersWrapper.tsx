/**
 * 🎯 Wrapper de Filtros de Equipos
 * 
 * Componente que maneja los filtros para la vista de equipos:
 * - Filtro por proyecto
 * - Filtro por estado
 * - Filtro por categoría
 * - Búsqueda por texto
 * - Navegación con parámetros URL
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Search, Filter, X } from 'lucide-react'

// 🎨 UI Components
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'

// 🔧 Types
import type { Proyecto } from '@/types'

interface FiltrosEquipos {
  proyectoId: string
  estado: string
  categoria: string
  busqueda: string
}

interface EquiposFiltersWrapperProps {
  filtros: FiltrosEquipos
  proyectos: Proyecto[]
}

// 📋 Opciones de estado
const ESTADOS_OPCIONES = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'disponible', label: 'Disponible' },
  { value: 'en_uso', label: 'En Uso' },
  { value: 'mantenimiento', label: 'Mantenimiento' },
  { value: 'fuera_servicio', label: 'Fuera de Servicio' }
]

// 📋 Opciones de categoría (estas podrían venir de la base de datos)
const CATEGORIAS_OPCIONES = [
  { value: 'todos', label: 'Todas las categorías' },
  { value: 'maquinaria', label: 'Maquinaria' },
  { value: 'herramientas', label: 'Herramientas' },
  { value: 'vehiculos', label: 'Vehículos' },
  { value: 'equipos_medicion', label: 'Equipos de Medición' },
  { value: 'equipos_seguridad', label: 'Equipos de Seguridad' },
  { value: 'otros', label: 'Otros' }
]

export function EquiposFiltersWrapper({ filtros, proyectos }: EquiposFiltersWrapperProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 🔧 Función para manejar cambios en los filtros
  const handleFiltrosChange = (nuevosFiltros: Partial<FiltrosEquipos>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    // Actualizar parámetros
    Object.entries({ ...filtros, ...nuevosFiltros }).forEach(([key, value]) => {
      if (value && value !== 'todos' && value !== '') {
        params.set(key, value)
      } else {
        params.delete(key)
      }
    })
    
    // Resetear página al cambiar filtros
    params.delete('page')
    
    // Navegar con nuevos parámetros
    const queryString = params.toString()
    router.push(`/proyectos/equipos${queryString ? `?${queryString}` : ''}`)
  }

  // 🔧 Limpiar todos los filtros
  const limpiarFiltros = () => {
    router.push('/proyectos/equipos')
  }

  // 🔧 Contar filtros activos
  const filtrosActivos = Object.entries(filtros).filter(
    ([key, value]) => value && value !== 'todos' && value !== ''
  ).length

  return (
    <Card>
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* 📋 Header de filtros */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              <h3 className="font-medium">Filtros</h3>
              {filtrosActivos > 0 && (
                <Badge variant="secondary">
                  {filtrosActivos} activo{filtrosActivos !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            {filtrosActivos > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={limpiarFiltros}
                className="h-8 px-2 lg:px-3"
              >
                <X className="h-4 w-4 mr-1" />
                Limpiar
              </Button>
            )}
          </div>

          {/* 🔍 Filtros */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* 🏗️ Filtro por Proyecto */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Proyecto</label>
              <Select
                value={filtros.proyectoId}
                onValueChange={(value) => handleFiltrosChange({ proyectoId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar proyecto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los proyectos</SelectItem>
                  {proyectos.map((proyecto) => (
                    <SelectItem key={proyecto.id} value={proyecto.id}>
                      {proyecto.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 📊 Filtro por Estado */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Select
                value={filtros.estado}
                onValueChange={(value) => handleFiltrosChange({ estado: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_OPCIONES.map((opcion) => (
                    <SelectItem key={opcion.value} value={opcion.value}>
                      {opcion.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 🏷️ Filtro por Categoría */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoría</label>
              <Select
                value={filtros.categoria}
                onValueChange={(value) => handleFiltrosChange({ categoria: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar categoría" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIAS_OPCIONES.map((opcion) => (
                    <SelectItem key={opcion.value} value={opcion.value}>
                      {opcion.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 🔍 Búsqueda */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Búsqueda</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar equipos..."
                  value={filtros.busqueda}
                  onChange={(e) => handleFiltrosChange({ busqueda: e.target.value })}
                  className="pl-9"
                />
              </div>
            </div>
          </div>

          {/* 📋 Filtros activos */}
          {filtrosActivos > 0 && (
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <span className="text-sm text-muted-foreground">Filtros activos:</span>
              
              {filtros.proyectoId && filtros.proyectoId !== 'todos' && (
                <Badge variant="secondary" className="gap-1">
                  Proyecto: {proyectos.find(p => p.id === filtros.proyectoId)?.nombre || filtros.proyectoId}
                  <button
                    onClick={() => handleFiltrosChange({ proyectoId: 'todos' })}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              
              {filtros.estado && filtros.estado !== 'todos' && (
                <Badge variant="secondary" className="gap-1">
                  Estado: {ESTADOS_OPCIONES.find(e => e.value === filtros.estado)?.label || filtros.estado}
                  <button
                    onClick={() => handleFiltrosChange({ estado: 'todos' })}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              
              {filtros.categoria && filtros.categoria !== 'todos' && (
                <Badge variant="secondary" className="gap-1">
                  Categoría: {CATEGORIAS_OPCIONES.find(c => c.value === filtros.categoria)?.label || filtros.categoria}
                  <button
                    onClick={() => handleFiltrosChange({ categoria: 'todos' })}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
              
              {filtros.busqueda && (
                <Badge variant="secondary" className="gap-1">
                  Búsqueda: "{filtros.busqueda}"
                  <button
                    onClick={() => handleFiltrosChange({ busqueda: '' })}
                    className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
