// ===================================================
// 📁 Archivo: PedidoEquipoFilters.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Componente de filtros para PedidoEquipo y PedidoEquipoItem
// 🧠 Uso: Filtrar pedidos por estado, responsable, fechas y búsqueda de texto
// ✍️ Autor: IA GYS + Jesús Artemio
// 📅 Última actualización: 2025-01-27
// ===================================================

'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar, Filter, X, Clock, AlertTriangle, Info, TrendingUp } from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { User } from '@/types'
import { getUsers } from '@/lib/services/user'

// Estados posibles de PedidoEquipo según schema.prisma
const ESTADOS_PEDIDO = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'atendido', label: 'Atendido' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'entregado', label: 'Entregado' },
]

export interface PedidoEquipoFiltersState {
  searchText: string
  estado: string
  responsableId: string
  fechaDesde: string
  fechaHasta: string
  // Filtros por Fecha OC Recomendada
  fechaOCDesde: string
  fechaOCHasta: string
  soloVencidas: boolean
}

export interface FilterStats {
  totalPedidos: number
  pedidosVencidos: number
  pedidosVigentes: number
  activeFiltersCount: number
}

interface Props {
  filters: PedidoEquipoFiltersState
  onFiltersChange: (filters: PedidoEquipoFiltersState) => void
  onClearFilters: () => void
  stats?: FilterStats
}

export default function PedidoEquipoFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  stats,
}: Props) {
  const [responsables, setResponsables] = useState<User[]>([])
  const [showAdvanced, setShowAdvanced] = useState(false)

  useEffect(() => {
    // Load users for responsable filter
    getUsers().then((users) => {
      if (users) {
        setResponsables(users)
      }
    })
  }, [])

  const handleFilterChange = (key: keyof PedidoEquipoFiltersState, value: string | boolean) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    })
  }

  const hasActiveFilters = 
    filters.searchText ||
    filters.estado !== '__ALL__' ||
    filters.responsableId !== '__ALL__' ||
    filters.fechaDesde ||
    filters.fechaHasta ||
    filters.fechaOCDesde ||
    filters.fechaOCHasta ||
    filters.soloVencidas

  return (
      <div className="bg-white p-4 rounded-lg border shadow-sm space-y-4">
        {/* Header with Stats Dashboard */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              Filtros de Pedidos
            </h3>
            {stats && (
              <div className="flex items-center gap-4 text-sm">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-md">
                      <TrendingUp className="w-4 h-4" />
                      <span className="font-medium">{stats.totalPedidos}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Total de pedidos encontrados</p>
                  </TooltipContent>
                </Tooltip>
                
                {stats.pedidosVencidos > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 px-2 py-1 bg-red-50 text-red-700 rounded-md">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-medium">{stats.pedidosVencidos}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Pedidos con OC vencidas</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                
                {stats.pedidosVigentes > 0 && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1 px-2 py-1 bg-green-50 text-green-700 rounded-md">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">{stats.pedidosVigentes}</span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Pedidos con OC vigentes</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                >
                  {showAdvanced ? 'Ocultar' : 'Más filtros'}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{showAdvanced ? 'Ocultar filtros avanzados' : 'Mostrar filtros por fechas y OC'}</p>
              </TooltipContent>
            </Tooltip>
            
            {hasActiveFilters && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClearFilters}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4 mr-1" />
                    Limpiar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Limpiar todos los filtros activos</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

      {/* Basic Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-gray-700">Buscar</label>
          <Input
            placeholder="Código, descripción o observación..."
            value={filters.searchText}
            onChange={(e) => handleFilterChange('searchText', e.target.value)}
            className="w-full"
          />
        </div>

        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-gray-700">Estado</label>
          <Select
            value={filters.estado}
            onValueChange={(value) => handleFilterChange('estado', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los estados" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todos los estados</SelectItem>
              {ESTADOS_PEDIDO.map((estado) => (
                <SelectItem key={estado.value} value={estado.value}>
                  {estado.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col space-y-1">
          <label className="text-sm font-medium text-gray-700">Responsable</label>
          <Select
            value={filters.responsableId}
            onValueChange={(value) => handleFilterChange('responsableId', value)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Todos los responsables" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__ALL__">Todos los responsables</SelectItem>
              {responsables.map((user) => (
                <SelectItem key={user.id} value={user.id}>
                  {user.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Fecha desde
                  <Info className="w-3 h-3 text-gray-400" />
                </label>
                <Input
                  type="date"
                  value={filters.fechaDesde}
                  onChange={(e) => handleFilterChange('fechaDesde', e.target.value)}
                  className="focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filtrar pedidos creados desde esta fecha</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex flex-col space-y-1">
                <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  Fecha hasta
                  <Info className="w-3 h-3 text-gray-400" />
                </label>
                <Input
                  type="date"
                  value={filters.fechaHasta}
                  onChange={(e) => handleFilterChange('fechaHasta', e.target.value)}
                  className="focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Filtrar pedidos creados hasta esta fecha</p>
            </TooltipContent>
          </Tooltip>

          {/* Filtros por Fecha OC Recomendada */}
          <div className="md:col-span-2 pt-4 border-t bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg">
            <Tooltip>
              <TooltipTrigger asChild>
                <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2 cursor-help">
                  <Clock className="w-4 h-4 text-orange-600" />
                  Filtros por Fecha OC Recomendada
                  <Info className="w-3 h-3 text-gray-400" />
                </h4>
              </TooltipTrigger>
              <TooltipContent>
                <p>Filtros basados en las fechas recomendadas para órdenes de compra</p>
              </TooltipContent>
            </Tooltip>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col space-y-1">
                    <label className="text-sm font-medium text-orange-700 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      F. OC desde
                      <Info className="w-3 h-3 text-gray-400" />
                    </label>
                    <Input
                      type="date"
                      value={filters.fechaOCDesde}
                      onChange={(e) => handleFilterChange('fechaOCDesde', e.target.value)}
                      className="focus:ring-2 focus:ring-orange-500 border-orange-200"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mostrar pedidos con OC recomendada desde esta fecha</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex flex-col space-y-1">
                    <label className="text-sm font-medium text-orange-700 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      F. OC hasta
                      <Info className="w-3 h-3 text-gray-400" />
                    </label>
                    <Input
                      type="date"
                      value={filters.fechaOCHasta}
                      onChange={(e) => handleFilterChange('fechaOCHasta', e.target.value)}
                      className="focus:ring-2 focus:ring-orange-500 border-orange-200"
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Mostrar pedidos con OC recomendada hasta esta fecha</p>
                </TooltipContent>
              </Tooltip>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center space-x-2 mt-3 p-2 bg-red-50 rounded-md border border-red-200">
                   <Checkbox
                     id="soloVencidas"
                     checked={filters.soloVencidas}
                     onCheckedChange={(checked) => handleFilterChange('soloVencidas', checked === true)}
                     className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                   />
                  <label
                    htmlFor="soloVencidas"
                    className="text-sm font-medium text-red-700 cursor-pointer flex items-center gap-1"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Solo mostrar OC vencidas (fecha pasada)
                    <Info className="w-3 h-3 text-gray-400" />
                  </label>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Mostrar únicamente pedidos con fechas de OC que ya han vencido</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      )}

      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 pt-3 border-t bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
            <Filter className="w-4 h-4" />
            Filtros activos:
          </div>
          {filters.searchText && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1 font-medium shadow-sm">
                  <Info className="w-3 h-3" />
                  Texto: {filters.searchText.length > 15 ? filters.searchText.substring(0, 15) + '...' : filters.searchText}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Búsqueda por texto: "{filters.searchText}"</p>
              </TooltipContent>
            </Tooltip>
          )}
          {filters.estado !== '__ALL__' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1 font-medium shadow-sm">
                  <TrendingUp className="w-3 h-3" />
                  Estado: {ESTADOS_PEDIDO.find(e => e.value === filters.estado)?.label}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Filtrado por estado: {ESTADOS_PEDIDO.find(e => e.value === filters.estado)?.label}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {filters.responsableId !== '__ALL__' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-full flex items-center gap-1 font-medium shadow-sm">
                  <Info className="w-3 h-3" />
                  Responsable: {responsables.find(r => r.id === filters.responsableId)?.name}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Filtrado por responsable: {responsables.find(r => r.id === filters.responsableId)?.name}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {filters.fechaDesde && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1 font-medium shadow-sm">
                  <Calendar className="w-3 h-3" />
                  Desde: {filters.fechaDesde}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Pedidos desde: {new Date(filters.fechaDesde).toLocaleDateString('es-ES')}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {filters.fechaHasta && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full flex items-center gap-1 font-medium shadow-sm">
                  <Calendar className="w-3 h-3" />
                  Hasta: {filters.fechaHasta}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Pedidos hasta: {new Date(filters.fechaHasta).toLocaleDateString('es-ES')}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {filters.fechaOCDesde && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs rounded-full flex items-center gap-1 font-medium shadow-sm border border-amber-200">
                  <Clock className="w-3 h-3" />
                  F. OC desde: {filters.fechaOCDesde}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>OC recomendada desde: {new Date(filters.fechaOCDesde).toLocaleDateString('es-ES')}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {filters.fechaOCHasta && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs rounded-full flex items-center gap-1 font-medium shadow-sm border border-amber-200">
                  <Clock className="w-3 h-3" />
                  F. OC hasta: {filters.fechaOCHasta}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>OC recomendada hasta: {new Date(filters.fechaOCHasta).toLocaleDateString('es-ES')}</p>
              </TooltipContent>
            </Tooltip>
          )}
          {filters.soloVencidas && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="px-3 py-1 bg-red-100 text-red-800 text-xs rounded-full flex items-center gap-1 font-medium shadow-sm border border-red-200 animate-pulse">
                  <AlertTriangle className="w-3 h-3" />
                  Solo OC vencidas
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p>Mostrando únicamente pedidos con OC vencidas</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      )}
      </div>
  )
}

// Default filters state
export const defaultFilters: PedidoEquipoFiltersState = {
  searchText: '',
  estado: '__ALL__',
  responsableId: '__ALL__',
  fechaDesde: '',
  fechaHasta: '',
  // Filtros por Fecha OC Recomendada
  fechaOCDesde: '',
  fechaOCHasta: '',
  soloVencidas: false,
}
