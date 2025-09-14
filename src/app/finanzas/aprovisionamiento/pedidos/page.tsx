// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/finanzas/aprovisionamiento/pedidos/page.tsx
// 🔧 Descripción: Página de gestión de pedidos de equipos con UX/UI mejorada
// 🎨 Mejoras aplicadas: Framer Motion, Shadcn/UI, Estados de carga, Breadcrumb navigation
// ✍️ Autor: Jesús Artemio + IA GYS
// 📅 Última actualización: 2025-01-27
// ===================================================

'use client'

import { useState, useEffect, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { 
  ShoppingCart, 
  ArrowLeft, 
  Plus, 
  Download, 
  Upload,
  Filter,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Truck,
  Users,
  Home,
  BarChart3,
  Calendar,
  Target,
  Activity,
  TrendingUp,
  Package
} from 'lucide-react'

// ✅ Import components
import PedidoEquipoFiltersClient from '@/components/aprovisionamiento/PedidoEquipoFiltersClient'
import PedidoEquipoTableClient from '@/components/aprovisionamiento/PedidoEquipoTableClient'
import PedidoEquipoGanttClient from '@/components/aprovisionamiento/PedidoEquipoGanttClient'
import PedidoEquipoCoherenciaClient from '@/components/aprovisionamiento/PedidoEquipoCoherenciaClient'

// ✅ Import React Query services
import { usePedidosEquipo } from '@/lib/services/aprovisionamientoQuery'

// ✅ Import types
import type { EstadoPedido, PedidoEquipo } from '@/types/modelos'

// 🔧 Main component
function PedidosEquipoContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { data: session } = useSession()

  // 📡 URL params
  const proyecto = searchParams.get('proyecto') || ''
  const proveedor = searchParams.get('proveedor') || ''
  const estado = searchParams.get('estado') || ''
  const fechaInicio = searchParams.get('fechaInicio') || ''
  const fechaFin = searchParams.get('fechaFin') || ''
  const montoMin = searchParams.get('montoMin') || ''
  const montoMax = searchParams.get('montoMax') || ''
  const coherencia = searchParams.get('coherencia') || ''
  const lista = searchParams.get('lista') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '10')
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') || 'desc'

  // 🔁 State
  const [viewMode, setViewMode] = useState<'table' | 'gantt' | 'coherencia'>('table')
  
  // 📡 React Query - Fetch pedidos with optimized cache
  const {
    data: pedidosResponse,
    isLoading: loading,
    error,
    refetch
  } = usePedidosEquipo({
    proyectoId: proyecto || undefined,
    proveedorId: proveedor || undefined,
    estado: estado ? [estado as EstadoPedido] : undefined,
    fechaDesde: fechaInicio || undefined,
    fechaHasta: fechaFin || undefined,
    montoMinimo: montoMin ? parseFloat(montoMin) : undefined,
    montoMaximo: montoMax ? parseFloat(montoMax) : undefined,
    busqueda: coherencia || undefined,
    page,
    limit
  })
  
  // 🔄 Transform data for compatibility
  const pedidosData = useMemo(() => {
    if (!pedidosResponse?.data) {
      return {
        items: [],
        total: 0,
        pagination: { page: 1, limit: 10, total: 0, pages: 0, hasNext: false, hasPrev: false }
      }
    }
    
    return {
      items: pedidosResponse.data || [],
      total: pedidosResponse.meta?.total || 0,
      pagination: pedidosResponse.meta || {
        page: 1, limit: 10, total: 0, totalPages: 0, hasNextPage: false, hasPrevPage: false
      }
    }
  }, [pedidosResponse])

  // ✅ Set dynamic page title
  useEffect(() => {
    document.title = 'Pedidos de Equipos | Aprovisionamiento | GYS'
  }, [])

  // 🔄 Handle error display
  const errorMessage = error ? 'Error al cargar los pedidos' : null

  // 📊 Stats calculation
  const stats = useMemo(() => {
    const items = pedidosData.items || []
    const totalPedidos = items.length
    const pedidosEnviados = items.filter(p => p.estado === 'enviado').length
    const pedidosRecibidos = items.filter(p => p.estado === 'entregado').length
    const pedidosRetrasados = items.filter(p => {
      if (!p.fechaEntregaEstimada) return false
      const fechaEstimada = new Date(p.fechaEntregaEstimada)
      const hoy = new Date()
      return fechaEstimada < hoy && p.estado !== 'entregado'
    }).length
    
    const totalItems = items.reduce((sum, p) => sum + (p.items?.length || 0), 0)
    const itemsEntregados = items.reduce((sum, p) => {
      return sum + (p.items?.filter(item => (item.cantidadAtendida || 0) >= item.cantidadPedida).length || 0)
    }, 0)
    const itemsEnProgreso = totalItems - itemsEntregados
    
    const progresoEntrega = totalItems > 0 ? Math.round((itemsEntregados / totalItems) * 100) : 0
    
    const montoTotal = items.reduce((sum, p) => {
      // Calcular monto total basado en items del pedido
      const montoPedido = p.items?.reduce((itemSum, item) => 
        itemSum + (item.costoTotal || (item.cantidadPedida * (item.precioUnitario || 0))), 0
      ) || 0
      return sum + montoPedido
    }, 0)
    
    const coherenciaPromedio = items.length > 0 
      ? items.reduce((sum, p) => sum + (p.coherencia || 0), 0) / items.length 
      : 0

    return {
      totalPedidos,
      pedidosEnviados,
      pedidosRecibidos,
      pedidosRetrasados,
      totalItems,
      itemsEntregados,
      itemsEnProgreso,
      progresoEntrega,
      montoTotal,
      coherenciaPromedio
    }
  }, [pedidosData])



  // 📊 Gantt data transformation
  const ganttData = useMemo(() => {
    return pedidosData.items.map(pedido => {
      // Calcular progreso basado en items entregados
      const itemsEntregados = pedido.items?.filter(item => 
        item.estado === 'entregado'
      ).length || 0
      const totalItems = pedido.items?.length || 0
      const progreso = totalItems > 0 ? Math.round((itemsEntregados / totalItems) * 100) : 0

      // Calcular monto real basado en cantidades atendidas
      const montoReal = pedido.items?.reduce((sum, item) => 
        sum + ((item.cantidadAtendida || 0) * (item.precioUnitario || 0)), 0
      ) || 0

      return {
        id: pedido.id,
        codigo: pedido.codigo || `PED-${String(pedido.numeroSecuencia).padStart(3, '0')}`,
        nombre: pedido.codigo || `PED-${String(pedido.numeroSecuencia).padStart(3, '0')}`,
        fechaCreacion: new Date(pedido.fechaPedido),
        fechaInicio: pedido.fechaPedido,
        fechaFin: pedido.fechaEntregaEstimada || pedido.fechaNecesaria,
        fechaEntregaEstimada: pedido.fechaEntregaEstimada ? new Date(pedido.fechaEntregaEstimada) : undefined,
        fechaEntregaReal: pedido.fechaEntregaReal ? new Date(pedido.fechaEntregaReal) : undefined,
        progreso,
        estado: pedido.estado,
        coherencia: pedido.coherencia || 0,
        proveedor: pedido.items?.[0]?.listaEquipoItem?.proveedor ? {
          id: pedido.items[0].listaEquipoItem.proveedor.id,
          nombre: pedido.items[0].listaEquipoItem.proveedor.nombre
        } : undefined,
        monto: pedido.items?.reduce((sum, item) => sum + (item.costoTotal || (item.cantidadPedida * (item.precioUnitario || 0))), 0) || 0,
        montoReal,
        items: pedido.items?.map(item => ({
          id: item.id,
          cantidad: item.cantidadPedida,
          cantidadRecibida: item.cantidadAtendida || 0,
          precioUnitario: item.precioUnitario,
          subtotal: item.costoTotal || (item.cantidadPedida * (item.precioUnitario || 0))
        })) || []
      }
    })
  }, [pedidosData])

  // 📊 Table data transformation
  const tableData = useMemo(() => {
    return pedidosData.items.map(pedido => {
      // Calcular costo total basado en items
      const costoTotal = pedido.items?.reduce((sum, item) => 
        sum + (item.costoTotal || (item.cantidadPedida * (item.precioUnitario || 0))), 0
      ) || 0

      // Calcular progreso
      const itemsAtendidos = pedido.items?.filter(item => 
        (item.cantidadAtendida || 0) >= item.cantidadPedida
      ).length || 0
      const totalItems = pedido.items?.length || 0
      const progreso = totalItems > 0 ? Math.round((itemsAtendidos / totalItems) * 100) : 0

      // Calcular coherencia
      const coherenciaData = {
        esCoherente: (pedido.coherencia || 0) >= 80,
        itemsCoherentes: itemsAtendidos,
        preciosCoherentes: totalItems,
        totalItems,
        alertas: {
          cantidadesExcedidas: false,
          preciosDesviados: false,
          itemsFaltantes: itemsAtendidos < totalItems,
          sinLista: !pedido.lista
        }
      }

      return {
        id: pedido.id,
        codigo: pedido.codigo || `PED-${String(pedido.numeroSecuencia).padStart(3, '0')}`,
        descripcion: pedido.observacion || 'Pedido de equipos',
        estado: pedido.estado,
        fechaCreacion: new Date(pedido.fechaPedido),
        fechaNecesaria: pedido.fechaNecesaria ? new Date(pedido.fechaNecesaria) : undefined,
        fechaEntregaEstimada: pedido.fechaEntregaEstimada ? new Date(pedido.fechaEntregaEstimada) : undefined,
        fechaEntregaReal: pedido.fechaEntregaReal ? new Date(pedido.fechaEntregaReal) : undefined,
        montoTotal: costoTotal,
        observaciones: pedido.observacion,
        urgente: false, // TODO: Implementar lógica de urgencia
        coherencia: coherenciaData,
        proyecto: undefined, // TODO: Incluir datos del proyecto si es necesario
        proveedor: pedido.items?.[0]?.listaEquipoItem?.proveedor ? {
          id: pedido.items[0].listaEquipoItem.proveedor.id,
          nombre: pedido.items[0].listaEquipoItem.proveedor.nombre,
          ruc: pedido.items[0].listaEquipoItem.proveedor.ruc
        } : undefined,
        lista: pedido.lista ? {
          id: pedido.lista.id,
          nombre: pedido.lista.nombre
        } : undefined,
        responsable: pedido.responsable ? {
          id: pedido.responsable.id,
          nombre: pedido.responsable.name || 'Sin nombre',
          email: pedido.responsable.email
        } : undefined,
        items: pedido.items?.map(item => ({
          id: item.id,
          cantidad: item.cantidadPedida,
          cantidadRecibida: item.cantidadAtendida || 0,
          precioUnitario: item.precioUnitario,
          subtotal: item.costoTotal || (item.cantidadPedida * (item.precioUnitario || 0))
        })) || []
      }
    })
  }, [pedidosData])

  // 🚨 Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="space-y-6">
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
          <div className="space-y-2">
            <div className="h-8 bg-gray-200 rounded w-48 animate-pulse" />
            <div className="h-4 bg-gray-200 rounded w-96 animate-pulse" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
          <div className="h-32 bg-gray-200 rounded animate-pulse" />
          <div className="h-64 bg-gray-200 rounded animate-pulse" />
        </div>
      </div>
    )
  }

  // 🚨 Error state
  if (error) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Error en Pedidos de Equipos
            </CardTitle>
            <CardDescription>
              Ha ocurrido un error al cargar los pedidos de equipos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {error?.message || 'Error desconocido al cargar los pedidos'}
            </p>
            <div className="flex space-x-2">
              <Button onClick={() => window.location.reload()}>
                Reintentar
              </Button>
              <Button variant="outline" asChild>
                <Link href="/finanzas/aprovisionamiento">
                  Volver a Aprovisionamiento
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Breadcrumb */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/" className="flex items-center gap-1">
              <Home className="h-3 w-3" />
              Inicio
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/finanzas">Finanzas</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/finanzas/aprovisionamiento">Aprovisionamiento</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Pedidos de Equipos</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/finanzas/aprovisionamiento">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Pedidos de Equipos</h1>
              <p className="text-muted-foreground mt-2">
                Gestión y seguimiento de pedidos con timeline de ejecución
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant={viewMode === 'table' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('table')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Tabla
            </Button>
            <Button 
              variant={viewMode === 'gantt' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('gantt')}
            >
              <Calendar className="h-4 w-4 mr-2" />
              Gantt
            </Button>
            <Button 
              variant={viewMode === 'coherencia' ? 'default' : 'outline'} 
              size="sm"
              onClick={() => setViewMode('coherencia')}
            >
              <Target className="h-4 w-4 mr-2" />
              Coherencia
            </Button>
            <Separator orientation="vertical" className="h-6" />
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4 mr-2" />
              Importar
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Pedido
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPedidos}</div>
              <p className="text-xs text-muted-foreground">
                Pedidos registrados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progreso Entrega</CardTitle>
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.progresoEntrega}%</div>
              <p className="text-xs text-muted-foreground">
                {stats.itemsEntregados} de {stats.totalItems} items
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
              <Activity className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.itemsEnProgreso}</div>
              <p className="text-xs text-muted-foreground">
                Items en tránsito
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completados</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.pedidosRecibidos}</div>
              <p className="text-xs text-muted-foreground">
                Pedidos entregados
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${stats.montoTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-muted-foreground">
                Valor total pedidos
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Separator />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Filter className="h-5 w-5" />
            <span>Filtros y Búsqueda</span>
          </CardTitle>
          <CardDescription>
            Filtra pedidos por proyecto, proveedor, estado, fechas, montos y coherencia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PedidoEquipoFiltersClient
            filtros={{
              busqueda: undefined,
              proyectoId: proyecto,
              proveedorId: proveedor,
              estado: estado as EstadoPedido,
              fechaCreacion: fechaInicio || fechaFin ? {
                from: fechaInicio ? new Date(fechaInicio) : undefined,
                to: fechaFin ? new Date(fechaFin) : undefined
              } : undefined,
              fechaEntrega: undefined,
              montoMinimo: montoMin ? parseFloat(montoMin) : undefined,
              montoMaximo: montoMax ? parseFloat(montoMax) : undefined,
              tieneObservaciones: undefined,
              soloVencidos: undefined,
              soloSinRecibir: undefined,
              soloUrgentes: undefined,
              coherenciaMinima: coherencia === 'true' ? 80 : undefined,
              listaId: lista
            }}
          />
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Pedidos de Equipos - Vista {viewMode === 'table' ? 'Tabla' : viewMode === 'gantt' ? 'Gantt' : 'Coherencia'}</span>
            <div className="flex items-center space-x-2">
              <Badge variant="outline">
                {pedidosData.items.length} de {pedidosData.total}
              </Badge>
              {lista && (
                <Badge variant="secondary">
                  Lista: {lista}
                </Badge>
              )}
              {coherencia === 'true' && (
                <Badge variant="secondary">
                  Solo coherentes
                </Badge>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            {viewMode === 'table' 
              ? 'Gestiona pedidos con seguimiento de proveedores y entregas'
              : viewMode === 'gantt'
              ? 'Timeline de ejecución de pedidos con fechas críticas y coherencia'
              : 'Análisis de coherencia entre listas de equipos y pedidos realizados'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {viewMode === 'table' && (
            <PedidoEquipoTableClient 
              data={tableData}
              pagination={{
                page,
                limit,
                total: pedidosData.total,
                totalPages: Math.ceil(pedidosData.total / limit)
              }}
              sorting={{
                sortBy,
                sortOrder: sortOrder as 'asc' | 'desc'
              }}
            />
          )}
          
          {viewMode === 'gantt' && (
            <PedidoEquipoGanttClient 
              data={ganttData}
              dateRange={fechaInicio && fechaFin ? {
                start: new Date(fechaInicio),
                end: new Date(fechaFin)
              } : undefined}
              showCoherenceIndicators={true}
            />
          )}
          
          {viewMode === 'coherencia' && (
            <PedidoEquipoCoherenciaClient
              proyectoId={proyecto}
              listaEquipoId={lista}
              modo="completo"
              autoRefresh={true}
              refreshInterval={30000}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// 🔧 Main page component with Suspense
export default function PedidosEquipoPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando pedidos de equipos...</p>
        </div>
      </div>
    }>
      <PedidosEquipoContent />
    </Suspense>
  )
}
