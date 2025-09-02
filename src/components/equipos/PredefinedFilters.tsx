// ===================================================
// 📁 Archivo: PredefinedFilters.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Filtros predefinidos para PedidoEquipo
// 🧠 Uso: Filtros rápidos y configuraciones guardadas
// ✍️ Autor: IA GYS + Jesús Artemio
// 📅 Última actualización: 2025-01-31
// ===================================================

'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Clock,
  AlertTriangle,
  Calendar,
  Zap,
  Star,
  Filter,
  ChevronDown,
} from 'lucide-react'
import { PedidoEquipoFiltersState } from './PedidoEquipoFilters'
import { cn } from '@/lib/utils'

interface PredefinedFilter {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  filters: Partial<PedidoEquipoFiltersState>
  color: string
  popular?: boolean
}

interface Props {
  onApplyFilter: (filters: Partial<PedidoEquipoFiltersState>) => void
  currentFilters: PedidoEquipoFiltersState
  className?: string
}

const PREDEFINED_FILTERS: PredefinedFilter[] = [
  {
    id: 'oc-vencidas',
    name: 'OC Vencidas',
    description: 'Pedidos con órdenes de compra vencidas',
    icon: <AlertTriangle className="w-4 h-4" />,
    filters: {
      soloVencidas: true,
    },
    color: 'bg-red-100 text-red-800 border-red-200',
    popular: true,
  },
  {
    id: 'esta-semana',
    name: 'Esta Semana',
    description: 'OC recomendadas para esta semana',
    icon: <Calendar className="w-4 h-4" />,
    filters: {
      fechaOCDesde: getStartOfWeek(),
      fechaOCHasta: getEndOfWeek(),
    },
    color: 'bg-blue-100 text-blue-800 border-blue-200',
    popular: true,
  },
  {
    id: 'este-mes',
    name: 'Este Mes',
    description: 'OC recomendadas para este mes',
    icon: <Calendar className="w-4 h-4" />,
    filters: {
      fechaOCDesde: getStartOfMonth(),
      fechaOCHasta: getEndOfMonth(),
    },
    color: 'bg-green-100 text-green-800 border-green-200',
  },
  {
    id: 'urgentes',
    name: 'Urgentes',
    description: 'Pedidos enviados con OC vencidas',
    icon: <Zap className="w-4 h-4" />,
    filters: {
      estado: 'enviado',
      soloVencidas: true,
    },
    color: 'bg-orange-100 text-orange-800 border-orange-200',
    popular: true,
  },
  {
    id: 'proximos-7-dias',
    name: 'Próximos 7 días',
    description: 'OC recomendadas para los próximos 7 días',
    icon: <Clock className="w-4 h-4" />,
    filters: {
      fechaOCDesde: getTodayString(),
      fechaOCHasta: getDateAfterDays(7),
    },
    color: 'bg-purple-100 text-purple-800 border-purple-200',
  },
  {
    id: 'atrasados',
    name: 'Atrasados',
    description: 'Pedidos borradores con OC vencidas',
    icon: <AlertTriangle className="w-4 h-4" />,
    filters: {
      estado: 'borrador',
      soloVencidas: true,
    },
    color: 'bg-red-100 text-red-800 border-red-200',
  },
]

// Helper functions for date calculations
function getTodayString(): string {
  return new Date().toISOString().split('T')[0]
}

function getStartOfWeek(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  const monday = new Date(today.setDate(diff))
  return monday.toISOString().split('T')[0]
}

function getEndOfWeek(): string {
  const today = new Date()
  const day = today.getDay()
  const diff = today.getDate() - day + (day === 0 ? 0 : 7) // Adjust when day is Sunday
  const sunday = new Date(today.setDate(diff))
  return sunday.toISOString().split('T')[0]
}

function getStartOfMonth(): string {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
}

function getEndOfMonth(): string {
  const today = new Date()
  return new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]
}

function getDateAfterDays(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return date.toISOString().split('T')[0]
}

export default function PredefinedFilters({ onApplyFilter, currentFilters, className }: Props) {
  const popularFilters = PREDEFINED_FILTERS.filter(f => f.popular)
  const otherFilters = PREDEFINED_FILTERS.filter(f => !f.popular)

  const handleApplyFilter = (filter: PredefinedFilter) => {
    onApplyFilter(filter.filters)
  }

  const isFilterActive = (filter: PredefinedFilter): boolean => {
    return Object.entries(filter.filters).every(([key, value]) => {
      const currentValue = currentFilters[key as keyof PedidoEquipoFiltersState]
      return currentValue === value
    })
  }

  return (
    <TooltipProvider>
      <div className={cn("flex flex-wrap items-center gap-2 p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200", className)}>
        <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
          <Star className="w-4 h-4 text-yellow-500" />
          Filtros rápidos:
        </div>

        {/* Popular Filters - Always visible */}
        {popularFilters.map((filter) => {
          const isActive = isFilterActive(filter)
          return (
            <Tooltip key={filter.id}>
              <TooltipTrigger asChild>
                <Button
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleApplyFilter(filter)}
                  className={`
                    ${isActive 
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md' 
                      : `${filter.color} hover:shadow-md transition-all duration-200`
                    }
                    flex items-center gap-1 text-xs font-medium
                  `}
                >
                  {filter.icon}
                  {filter.name}
                  {isActive && <Badge variant="outline" className="ml-1 px-1 py-0 text-xs">✓</Badge>}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{filter.description}</p>
              </TooltipContent>
            </Tooltip>
          )
        })}

        {/* More Filters Dropdown */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-1">
                  <Filter className="w-4 h-4" />
                  Más filtros
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>
            <TooltipContent>
              <p>Ver más opciones de filtros predefinidos</p>
            </TooltipContent>
          </Tooltip>

          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros Adicionales
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            
            {otherFilters.map((filter) => {
              const isActive = isFilterActive(filter)
              return (
                <DropdownMenuItem
                  key={filter.id}
                  onClick={() => handleApplyFilter(filter)}
                  className={`
                    flex items-center gap-2 cursor-pointer
                    ${isActive ? 'bg-blue-50 text-blue-700 font-medium' : ''}
                  `}
                >
                  <div className={`p-1 rounded ${filter.color}`}>
                    {filter.icon}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{filter.name}</div>
                    <div className="text-xs text-gray-500">{filter.description}</div>
                  </div>
                  {isActive && (
                    <Badge variant="outline" className="px-1 py-0 text-xs">
                      ✓
                    </Badge>
                  )}
                </DropdownMenuItem>
              )
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </TooltipProvider>
  )
}