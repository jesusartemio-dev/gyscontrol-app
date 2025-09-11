// ===================================================
// 📁 Archivo: PedidoEquipoListWithFilters.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Lista de pedidos con filtros avanzados para logística
// 🧠 Uso: Página principal de pedidos con capacidad de filtrado completo
// ✍️ Autor: IA GYS + Jesús Artemio
// 📅 Última actualización: 2025-01-27
// ===================================================

'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  PedidoEquipo,
  PedidoEquipoUpdatePayload,
  PedidoEquipoItemUpdatePayload,
} from '@/types'
import { getAllPedidoEquipos, PedidoEquipoFilters as PedidoEquipoFiltersType } from '@/lib/services/pedidoEquipo'
import PedidoEquipoFilters, {
  PedidoEquipoFiltersState,
  defaultFilters,
  FilterStats,
} from './PedidoEquipoFilters'
import PredefinedFilters from './PredefinedFilters'
import ExportData from './ExportData'
import PerformanceOptimizer from './PerformanceOptimizer'
import PedidoEquipoList from './PedidoEquipoList'
import { Button } from '@/components/ui/button'
import { RefreshCw, Package, TrendingUp, Clock, CheckCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  proyectoId?: string // Optional: if provided, will filter by project
  onUpdate?: (id: string, payload: PedidoEquipoUpdatePayload) => void
  onDelete?: (id: string) => void
  onUpdateItem?: (id: string, payload: PedidoEquipoItemUpdatePayload) => void
  onDeleteItem?: (id: string) => void
}

export default function PedidoEquipoListWithFilters({
  proyectoId,
  onUpdate,
  onDelete,
  onUpdateItem,
  onDeleteItem,
}: Props) {
  const [pedidos, setPedidos] = useState<PedidoEquipo[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<PedidoEquipoFiltersState>({
    ...defaultFilters,
    // If proyectoId is provided, don't show it in filters but use it
    ...(proyectoId ? {} : {}),
  })

  // Load pedidos based on filters
  const loadPedidos = async () => {
    setLoading(true)
    try {
      const filterParams: PedidoEquipoFiltersType = {
        ...(proyectoId && { proyectoId }),
        ...(filters.estado !== '__ALL__' && { estado: filters.estado }),
        ...(filters.responsableId !== '__ALL__' && { responsableId: filters.responsableId }),
        ...(filters.fechaDesde && { fechaDesde: filters.fechaDesde }),
        ...(filters.fechaHasta && { fechaHasta: filters.fechaHasta }),
        ...(filters.searchText && { searchText: filters.searchText }),
        // New OC filters
        ...(filters.fechaOCDesde && { fechaOCDesde: filters.fechaOCDesde }),
        ...(filters.fechaOCHasta && { fechaOCHasta: filters.fechaOCHasta }),
        ...(filters.soloVencidas && { soloVencidas: filters.soloVencidas }),
      }

      const data = await getAllPedidoEquipos(filterParams)
      if (data) {
        setPedidos(data)
      } else {
        toast.error('Error al cargar pedidos')
      }
    } catch (error) {
      console.error('Error loading pedidos:', error)
      toast.error('Error al cargar pedidos')
    } finally {
      setLoading(false)
    }
  }

  // ✅ Refresh function for child components
  const handleRefresh = async () => {
    await loadPedidos()
  }

  // Load pedidos on mount and when filters change
  useEffect(() => {
    loadPedidos()
  }, [filters, proyectoId])

  // Handle filter changes
  const handleFiltersChange = (newFilters: PedidoEquipoFiltersState) => {
    setFilters(newFilters)
  }

  // Handle predefined filter changes (partial filters)
  const handlePredefinedFiltersChange = (partialFilters: Partial<PedidoEquipoFiltersState>) => {
    setFilters(prevFilters => ({
      ...prevFilters,
      ...partialFilters
    }))
  }

  // Clear all filters
  const handleClearFilters = () => {
    setFilters(defaultFilters)
  }

  // Statistics from filtered data
  const stats = useMemo(() => {
    const total = pedidos.length
    const borradores = pedidos.filter(p => p.estado === 'borrador').length
    const enviados = pedidos.filter(p => p.estado === 'enviado').length
    const atendidos = pedidos.filter(p => p.estado === 'atendido').length
    const entregados = pedidos.filter(p => p.estado === 'entregado').length
    const parciales = pedidos.filter(p => p.estado === 'parcial').length

    // OC Statistics
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    let totalOC = 0
    let overdueOC = 0
    let currentOC = 0
    
    pedidos.forEach(pedido => {
      pedido.items?.forEach(item => {
        if (item.tiempoEntregaDias && item.tiempoEntregaDias > 0) {
          totalOC++
          const estimatedDate = new Date(pedido.fechaPedido)
          estimatedDate.setDate(estimatedDate.getDate() + item.tiempoEntregaDias)
          estimatedDate.setHours(0, 0, 0, 0)
          
          if (estimatedDate < today) {
            overdueOC++
          } else {
            currentOC++
          }
        }
      })
    })

    return {
      total,
      borradores,
      enviados,
      atendidos,
      entregados,
      parciales,
      // OC stats for filters component
      totalOC,
      overdueOC,
      currentOC,
    }
  }, [pedidos])

  // Filter stats for PedidoEquipoFilters component
  const filterStats: FilterStats = {
    totalPedidos: stats.totalOC,
    pedidosVencidos: stats.overdueOC,
    pedidosVigentes: stats.currentOC,
    activeFiltersCount: Object.values(filters).filter(v => v && v !== '__ALL__' && v !== false).length,
  }

  return (
    <div className="space-y-6">
      {/* Header with title and action buttons */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            📦 Gestión de Pedidos de Equipos
          </h1>
          <p className="text-gray-600 mt-1">
            {proyectoId
              ? 'Pedidos del proyecto seleccionado'
              : 'Todos los pedidos del sistema'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PerformanceOptimizer
            data={pedidos}
            onOptimize={loadPedidos}
          />
          <ExportData
            data={pedidos}
            filters={filters}
          />
          <Button
            onClick={loadPedidos}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Total</span>
          </div>
          <p className="text-2xl font-bold text-blue-900 mt-1">{stats.total}</p>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600" />
            <span className="text-sm font-medium text-gray-800">Borradores</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.borradores}</p>
        </div>

        <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">Enviados</span>
          </div>
          <p className="text-2xl font-bold text-yellow-900 mt-1">{stats.enviados}</p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-600" />
            <span className="text-sm font-medium text-blue-800">Atendidos</span>
          </div>
          <p className="text-2xl font-bold text-blue-900 mt-1">{stats.atendidos}</p>
        </div>

        <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-orange-600" />
            <span className="text-sm font-medium text-orange-800">Parciales</span>
          </div>
          <p className="text-2xl font-bold text-orange-900 mt-1">{stats.parciales}</p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <span className="text-sm font-medium text-green-800">Entregados</span>
          </div>
          <p className="text-2xl font-bold text-green-900 mt-1">{stats.entregados}</p>
        </div>
      </div>

      {/* OC Statistics */}
      {stats.totalOC > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Total OC</span>
            </div>
            <p className="text-2xl font-bold text-blue-900 mt-1">{stats.totalOC}</p>
          </div>

          <div className="bg-red-50 p-4 rounded-lg border border-red-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-800">OC Vencidas</span>
            </div>
            <p className="text-2xl font-bold text-red-900 mt-1">{stats.overdueOC}</p>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-green-600" />
              <span className="text-sm font-medium text-green-800">OC Vigentes</span>
            </div>
            <p className="text-2xl font-bold text-green-900 mt-1">{stats.currentOC}</p>
          </div>
        </div>
      )}

      {/* Predefined Filters */}
      <PredefinedFilters
        onApplyFilter={handlePredefinedFiltersChange}
        currentFilters={filters}
      />

      {/* Filters Component */}
      <PedidoEquipoFilters
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClearFilters={handleClearFilters}
        stats={filterStats}
      />

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-3 text-gray-600">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Cargando pedidos...</span>
          </div>
        </div>
      )}

      {/* Pedidos List */}
      {!loading && (
        <PedidoEquipoList
          data={pedidos}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onUpdateItem={onUpdateItem}
          onDeleteItem={onDeleteItem}
          onRefresh={handleRefresh}
        />
      )}

      {/* Empty State */}
      {!loading && pedidos.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No se encontraron pedidos
          </h3>
          <p className="text-gray-600 mb-4">
            {Object.values(filters).some(v => v && v !== '__ALL__')
              ? 'Intenta ajustar los filtros para ver más resultados'
              : 'No hay pedidos registrados en el sistema'}
          </p>
          {Object.values(filters).some(v => v && v !== '__ALL__') && (
            <Button onClick={handleClearFilters} variant="outline">
              Limpiar filtros
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
