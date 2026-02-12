import { Suspense } from 'react'
import { Metadata } from 'next'
import { Loader2 } from 'lucide-react'
import { EstadoPedido } from '@prisma/client'
import { PedidoEquipoFiltersWrapper } from '@/components/proyectos/PedidoEquipoFiltersWrapper'
import { PedidosPageContent } from '@/components/proyectos/PedidosPageContent'
import { PedidosTabSwitcher } from '@/components/proyectos/PedidosTabSwitcher'
import { PedidoItemsView } from '@/components/proyectos/PedidoItemsView'
import { getPedidosEquipo } from '@/lib/services/aprovisionamiento'
import { getProyectos } from '@/lib/services/proyecto'

export const metadata: Metadata = {
  title: 'Pedidos de Equipos - Proyectos | GYS',
  description: 'Gestión de pedidos de equipos de proyectos'
}

interface PageProps {
  searchParams: Promise<{
    tab?: string
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

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
    </div>
  )
}

export default async function PedidosEquipoPage({ searchParams }: PageProps) {
  const params = await searchParams
  const activeTab = params.tab || 'pedidos'

  // Items view - client component handles its own data
  if (activeTab === 'items') {
    return (
      <div className="p-4 space-y-3">
        <PedidosTabSwitcher activeTab={activeTab} />
        <Suspense fallback={<LoadingState />}>
          <PedidoItemsView />
        </Suspense>
      </div>
    )
  }

  // Pedidos view - server-side data fetching
  const page = parseInt(params.page || '1')
  const limit = parseInt(params.limit || '10')

  const proyectos = await getProyectos()
  const proyectosParaFiltros = proyectos.map(p => ({
    id: p.id,
    nombre: p.nombre,
    codigo: p.codigo
  }))

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
    <div className="p-4 space-y-3">
      <PedidosTabSwitcher activeTab={activeTab} />

      {/* Filters */}
      <Suspense fallback={<div className="h-10 bg-gray-100 rounded animate-pulse" />}>
        <PedidoEquipoFiltersWrapper filtros={filtros} proyectos={proyectosParaFiltros} />
      </Suspense>

      {/* Content with header, stats and table/cards */}
      <Suspense fallback={<LoadingState />}>
        <PedidosPageContent
          pedidos={pedidosData.items}
          pagination={pedidosData.pagination}
          stats={stats}
        />
      </Suspense>
    </div>
  )
}
