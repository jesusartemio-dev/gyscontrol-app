import { Suspense } from 'react'
import { Metadata } from 'next'
import { ShoppingCart, Plus, Download, Clock, DollarSign, CheckCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { EstadoPedido } from '@prisma/client'
import { PedidoEquipoTableWrapper } from '@/components/finanzas/aprovisionamiento/PedidoEquipoTableWrapper'
import { PedidoEquipoFiltersWrapper } from '@/components/proyectos/PedidoEquipoFiltersWrapper'
import { getPedidosEquipo } from '@/lib/services/aprovisionamiento'

export const metadata: Metadata = {
  title: 'Pedidos de Equipos - Proyectos | GYS',
  description: 'Gestión de pedidos de equipos de proyectos'
}

interface PageProps {
  searchParams: Promise<{
    proyecto?: string
    proveedor?: string
    estado?: string
    fechaInicio?: string
    fechaFin?: string
    montoMin?: string
    montoMax?: string
    coherencia?: string
    lista?: string
    page?: string
    limit?: string
    sortBy?: string
    sortOrder?: 'asc' | 'desc'
  }>
}

const formatCurrency = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`
  }
  return `$${amount.toFixed(0)}`
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  )
}

export default async function PedidosEquipoPage({ searchParams }: PageProps) {
  const params = await searchParams

  const page = parseInt(params.page || '1')
  const limit = parseInt(params.limit || '10')

  const pedidosResponse = await getPedidosEquipo({
    proyectoId: params.proyecto,
    proveedorId: params.proveedor,
    estado: params.estado,
    fechaInicio: params.fechaInicio,
    fechaFin: params.fechaFin,
    montoMin: params.montoMin ? parseFloat(params.montoMin) : undefined,
    montoMax: params.montoMax ? parseFloat(params.montoMax) : undefined,
    coherencia: params.coherencia,
    lista: params.lista,
    page,
    limit,
    sortBy: params.sortBy,
    sortOrder: params.sortOrder
  })

  const pedidosData = {
    items: pedidosResponse.data?.pedidos || [],
    total: pedidosResponse.data?.pagination?.total || 0,
    pagination: {
      page: pedidosResponse.data?.pagination?.page || 1,
      limit: pedidosResponse.data?.pagination?.limit || 10,
      total: pedidosResponse.data?.pagination?.total || 0,
      totalPages: pedidosResponse.data?.pagination?.pages || 0
    }
  }

  const filtros = {
    proyectoId: params.proyecto,
    proveedorId: params.proveedor,
    estado: params.estado as EstadoPedido | undefined,
    fechaCreacion: params.fechaInicio && params.fechaFin ? {
      from: new Date(params.fechaInicio),
      to: new Date(params.fechaFin)
    } : undefined,
    montoMinimo: params.montoMin ? parseFloat(params.montoMin) : undefined,
    montoMaximo: params.montoMax ? parseFloat(params.montoMax) : undefined,
    coherenciaMinima: params.coherencia ? parseFloat(params.coherencia) : undefined,
    busqueda: ''
  }

  // Calculate stats
  const stats = {
    total: pedidosData.total,
    pendientes: pedidosData.items.filter(p => p.estado === EstadoPedido.borrador || p.estado === EstadoPedido.enviado).length,
    completados: pedidosData.items.filter(p => p.estado === EstadoPedido.entregado).length,
    montoTotal: pedidosData.items.reduce((sum, p) => {
      const pedidoTotal = p.items?.reduce((itemSum: number, item: any) =>
        itemSum + (item.costoTotal || (item.cantidadPedida * (item.precioUnitario || 0))), 0) || 0
      return sum + pedidoTotal
    }, 0)
  }

  return (
    <div className="p-4 space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold">Pedidos</h1>
          <Badge variant="secondary" className="text-xs">
            {stats.total}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Inline Stats - Desktop */}
          <div className="hidden md:flex items-center gap-3 mr-4 text-xs">
            <div className="flex items-center gap-1 text-yellow-600" title="Pendientes">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-medium">{stats.pendientes}</span>
            </div>
            <div className="flex items-center gap-1 text-green-600" title="Completados">
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="font-medium">{stats.completados}</span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-1 text-emerald-600" title="Monto Total">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="font-semibold">{formatCurrency(stats.montoTotal)}</span>
            </div>
          </div>

          <Button variant="outline" size="sm" className="h-8">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Exportar
          </Button>
          <Button size="sm" className="h-8">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Nuevo
          </Button>
        </div>
      </div>

      {/* Mobile Stats */}
      <div className="md:hidden grid grid-cols-3 gap-2">
        <div className="bg-yellow-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-yellow-600">{stats.pendientes}</div>
          <div className="text-[10px] text-yellow-700">Pendientes</div>
        </div>
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-green-600">{stats.completados}</div>
          <div className="text-[10px] text-green-700">Completados</div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-emerald-600">{formatCurrency(stats.montoTotal)}</div>
          <div className="text-[10px] text-emerald-700">Total</div>
        </div>
      </div>

      {/* Filters */}
      <Suspense fallback={<div className="h-10 bg-gray-100 rounded animate-pulse" />}>
        <PedidoEquipoFiltersWrapper filtros={filtros} />
      </Suspense>

      {/* Table */}
      <Suspense fallback={<LoadingState />}>
        <PedidoEquipoTableWrapper
          data={pedidosData.items}
          pagination={pedidosData.pagination}
        />
      </Suspense>
    </div>
  )
}
