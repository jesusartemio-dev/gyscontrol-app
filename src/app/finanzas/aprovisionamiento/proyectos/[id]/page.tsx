/**
 * Página de Detalle de Proyecto de Aprovisionamiento
 * 
 * Vista detallada de un proyecto específico con:
 * - Información general y KPIs del proyecto
 * - Listas de equipos asociadas
 * - Pedidos generados
 * - Timeline de actividades
 * - Indicadores de coherencia
 * 
 * @author GYS Team
 * @version 2.0.0
 */

import { Suspense } from 'react'
import { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { 
  ArrowLeft, 
  Edit, 
  Download, 
  Share,
  Calendar,
  DollarSign,
  Package,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  FileText,
  BarChart3,
  Home
} from 'lucide-react'
import Link from 'next/link'

// ✅ Components
import { ProyectoAprovisionamientoCard } from '@/components/finanzas/aprovisionamiento/ProyectoAprovisionamientoCard'
import { ListaEquipoTable } from '@/components/finanzas/aprovisionamiento/ListaEquipoTable'
import { PedidoEquipoTable } from '@/components/finanzas/aprovisionamiento/PedidoEquipoTable'
import { TimelineView } from '@/components/finanzas/aprovisionamiento/TimelineView'

// 📡 Services
import { getProyectoAprovisionamiento, getListasEquipoByProyecto, getPedidosEquipoByProyecto } from '@/lib/services/aprovisionamiento'

// 🎯 Types
import type { ListaEquipoDetail } from '@/types/master-detail'
import type { PedidoEquipo } from '@/types/modelos'

interface PageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    tab?: string
  }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params
  const proyecto = await getProyectoAprovisionamiento(id)
  
  if (!proyecto) {
    return {
      title: 'Proyecto no encontrado | GYS',
      description: 'El proyecto solicitado no existe'
    }
  }

  return {
    title: `${proyecto.nombre} | Aprovisionamiento | GYS`,
    description: `Detalle del proyecto de aprovisionamiento ${proyecto.codigo}`
  }
}

export default async function ProyectoDetallePage({ params, searchParams }: PageProps) {
  // 📡 Extraer parámetros
  const { id } = await params
  const searchParamsResolved = await searchParams
  
  // 📡 Fetch project data
  const proyecto = await getProyectoAprovisionamiento(id)
  
  if (!proyecto) {
    notFound()
  }

  // 📡 Fetch related data
  const [listasData, pedidosData] = await Promise.all([
    getListasEquipoByProyecto(id),
    getPedidosEquipoByProyecto(id)
  ])

  // 🔁 Calculate project stats
  const stats = {
    totalListas: listasData.data.pagination.total,
    listasAprobadas: listasData.data.listas.filter(item => item.estado === 'aprobada').length,
    totalPedidos: pedidosData.data.pagination.total,
    pedidosRecibidos: pedidosData.data.pedidos.filter(item => item.estado === 'entregado').length,
    montoTotalListas: listasData.data.listas.reduce((sum, item) => sum + (item.estadisticas?.montoTotal || 0), 0),
    montoTotalPedidos: pedidosData.data.pedidos.reduce((sum, pedido) => {
      const montoPedido = pedido.items?.reduce((itemSum, item) => 
        itemSum + (item.costoTotal || (item.cantidadPedida * (item.precioUnitario || 0))), 0) || 0
      return sum + montoPedido
    }, 0),
    progresoGeneral: proyecto.porcentajeEjecucion || 0,
    diasTranscurridos: proyecto.fechaInicio ? 
      Math.floor((new Date().getTime() - new Date(proyecto.fechaInicio).getTime()) / (1000 * 60 * 60 * 24)) : 0,
    diasRestantes: proyecto.fechaFin ? 
      Math.floor((new Date(proyecto.fechaFin).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0
  }

  const activeTab = searchParamsResolved.tab || 'overview'

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 🧭 Breadcrumb Navigation */}
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
            <BreadcrumbLink href="/finanzas/aprovisionamiento">Aprovisionamiento</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{proyecto.nombre}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 🎨 Header Section */}
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
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold tracking-tight">{proyecto.nombre}</h1>
                <Badge variant={proyecto.estado === 'ACTIVO' ? 'default' : 'secondary'}>
                  {proyecto.estado}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-2">
                {proyecto.codigo}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">
              <Share className="h-4 w-4 mr-2" />
              Compartir
            </Button>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
            <Button size="sm">
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </div>

        {/* 📊 Project Summary Card */}
        <ProyectoAprovisionamientoCard 
          proyecto={proyecto}
          variant="detailed"
          showActions={false}
        />
      </div>

      <Separator />

      {/* 📊 Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso General</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{stats.progresoGeneral}%</div>
              <Progress value={stats.progresoGeneral} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {stats.diasTranscurridos} días transcurridos
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Listas de Equipos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalListas}</div>
            <p className="text-xs text-muted-foreground">
              {stats.listasAprobadas} aprobadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPedidos}</div>
            <p className="text-xs text-muted-foreground">
              {stats.pedidosRecibidos} recibidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Listas</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.montoTotalListas.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor total listas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Pedidos</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.montoTotalPedidos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor total pedidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Restante</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.diasRestantes > 0 ? stats.diasRestantes : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              días restantes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 📋 Tabs Content */}
      <Tabs value={activeTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview" className="flex items-center space-x-2">
            <BarChart3 className="h-4 w-4" />
            <span>Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="listas" className="flex items-center space-x-2">
            <Package className="h-4 w-4" />
            <span>Listas ({stats.totalListas})</span>
          </TabsTrigger>
          <TabsTrigger value="pedidos" className="flex items-center space-x-2">
            <ShoppingCart className="h-4 w-4" />
            <span>Pedidos ({stats.totalPedidos})</span>
          </TabsTrigger>
          <TabsTrigger value="timeline" className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>Timeline</span>
          </TabsTrigger>
        </TabsList>

        {/* 📊 Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Project Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <FileText className="h-5 w-5" />
                  <span>Información del Proyecto</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Código</label>
                    <p className="text-sm font-mono">{proyecto.codigo}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Estado</label>
                    <p className="text-sm">
                      <Badge variant={proyecto.estado === 'ACTIVO' ? 'default' : 'secondary'}>
                        {proyecto.estado}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fecha Inicio</label>
                    <p className="text-sm">
                      {proyecto.fechaInicio ? new Date(proyecto.fechaInicio).toLocaleDateString('es-PE') : 'No definida'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fecha Fin Estimada</label>
                    <p className="text-sm">
                      {proyecto.fechaFin ? new Date(proyecto.fechaFin).toLocaleDateString('es-PE') : 'No definida'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Responsable</label>
                    <p className="text-sm">{proyecto.gestorNombre || 'No asignado'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Prioridad</label>
                    <p className="text-sm">
                      <Badge variant="outline">
                        Normal
                      </Badge>
                    </p>
                  </div>
                </div>
                {proyecto.gestorNombre && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Gestor</label>
                    <p className="text-sm mt-1">{proyecto.gestorNombre}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <DollarSign className="h-5 w-5" />
                  <span>Resumen Financiero</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Presupuesto Total</span>
                    <span className="font-medium">
                      ${proyecto.totalCliente?.toLocaleString('es-PE', { minimumFractionDigits: 2 }) || '0.00'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Monto Listas</span>
                    <span className="font-medium">
                      ${stats.montoTotalListas.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Monto Pedidos</span>
                    <span className="font-medium">
                      ${stats.montoTotalPedidos.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Ejecución Presupuestal</span>
                    <span className="font-bold">
                      {proyecto.totalCliente ? 
                        Math.round((stats.montoTotalPedidos / proyecto.totalCliente) * 100) : 0}%
                    </span>
                  </div>
                  {proyecto.totalCliente && (
                    <Progress 
                      value={Math.round((stats.montoTotalPedidos / proyecto.totalCliente) * 100)} 
                      className="h-2" 
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Clock className="h-5 w-5" />
                <span>Actividad Reciente</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Mock recent activities */}
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Lista de equipos aprobada</p>
                    <p className="text-xs text-muted-foreground">LEQ-2024-001 • Hace 2 horas</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Nuevo pedido creado</p>
                    <p className="text-xs text-muted-foreground">PEQ-2024-003 • Hace 4 horas</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full mt-2" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Alerta de coherencia detectada</p>
                    <p className="text-xs text-muted-foreground">Diferencia en precios • Hace 6 horas</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 📦 Listas Tab */}
        <TabsContent value="listas" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Listas de Equipos del Proyecto</span>
                <Button size="sm">
                  <Package className="h-4 w-4 mr-2" />
                  Nueva Lista
                </Button>
              </CardTitle>
              <CardDescription>
                Gestión de listas de equipos asociadas al proyecto
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Suspense fallback={
                <div className="h-64 bg-muted animate-pulse rounded m-6 flex items-center justify-center">
                  <div className="text-center">
                    <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Cargando listas...</p>
                  </div>
                </div>
              }>
                <ListaEquipoTable 
                   listas={listasData.data.listas} 
                   loading={false} 
                   onListaEdit={(lista: ListaEquipoDetail) => { 
                     window.location.href = `/finanzas/aprovisionamiento/listas/${lista.id}/edit` 
                   }} 
                   onListaClick={(lista: ListaEquipoDetail) => { 
                     window.location.href = `/finanzas/aprovisionamiento/listas/${lista.id}` 
                   }} 
                 />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 🛒 Pedidos Tab */}
        <TabsContent value="pedidos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Pedidos de Equipos del Proyecto</span>
                <Button size="sm">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Nuevo Pedido
                </Button>
              </CardTitle>
              <CardDescription>
                Seguimiento de pedidos y órdenes de compra
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Suspense fallback={
                <div className="h-64 bg-muted animate-pulse rounded m-6 flex items-center justify-center">
                  <div className="text-center">
                    <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Cargando pedidos...</p>
                  </div>
                </div>
              }>
                <PedidoEquipoTable
                  data={pedidosData.data.pedidos}
                  loading={false}
                  onPedidoClick={(pedido: PedidoEquipo) => {
                    window.location.href = `/finanzas/aprovisionamiento/pedidos/${pedido.id}`
                  }}
                  onPedidoEdit={(pedido: PedidoEquipo) => {
                    window.location.href = `/finanzas/aprovisionamiento/pedidos/${pedido.id}/edit`
                  }}
                />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 📅 Timeline Tab */}
        <TabsContent value="timeline" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="h-5 w-5" />
                <span>Timeline del Proyecto</span>
              </CardTitle>
              <CardDescription>
                Cronograma de actividades y seguimiento temporal
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Suspense fallback={
                <div className="h-96 bg-muted animate-pulse rounded m-6 flex items-center justify-center">
                  <div className="text-center">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Cargando timeline...</p>
                  </div>
                </div>
              }>
                <TimelineView 
                    proyectoId={id} 
                    defaultFilters={{ 
                      proyectoIds: [id], 
                      tipoVista: 'gantt', 
                      agrupacion: 'proyecto' 
                    }} 
                  />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// 🔄 Loading Component
function Loading() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-4">
        <div className="h-4 bg-muted animate-pulse rounded w-1/4" />
        <div className="h-8 bg-muted animate-pulse rounded w-1/3" />
        <div className="h-4 bg-muted animate-pulse rounded w-1/2" />
      </div>
      
      <div className="h-32 bg-muted animate-pulse rounded" />
      
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded" />
        ))}
      </div>
      
      <div className="h-96 bg-muted animate-pulse rounded" />
    </div>
  )
}

// ❌ Error Component
function Error({ 
  error, 
  reset 
}: { 
  error: Error & { digest?: string }
  reset: () => void 
}) {
  return (
    <div className="container mx-auto p-6">
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Error al cargar el proyecto
          </CardTitle>
          <CardDescription>
            Ha ocurrido un error al cargar los detalles del proyecto
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {error.message || 'Error desconocido al cargar los datos'}
          </p>
          <div className="flex space-x-2">
            <Button onClick={reset}>
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

// 🚫 Not Found Component
function NotFound() {
  return (
    <div className="container mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Proyecto no encontrado
          </CardTitle>
          <CardDescription>
            El proyecto solicitado no existe o no tienes permisos para verlo
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Verifica que el ID del proyecto sea correcto o contacta al administrador.
          </p>
          <div className="flex space-x-2">
            <Button asChild>
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