/**
 * Página de Detalle de Pedido de Equipos
 * 
 * Vista detallada de un pedido específico con:
 * - Información general del pedido y tracking
 * - Detalles del proveedor y contacto
 * - Items del pedido con seguimiento
 * - Timeline de estados y entregas
 * - Documentos asociados
 * - Indicadores de coherencia y alertas
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
  Package,
  ShoppingCart,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  History,
  Calculator,
  Eye,
  Copy,
  Truck,
  Phone,
  Mail,
  MapPin,
  Calendar,
  DollarSign,
  User,
  Building,
  FileDown,
  MessageSquare,
  Home,
  TrendingUp,
  Package2
} from 'lucide-react'
import Link from 'next/link'

// ✅ Components
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

// 📡 Services
import { getPedidoEquipo } from '@/lib/services/aprovisionamiento'

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
  
  try {
    const response = await getPedidoEquipo(id) as any
    const pedido = response?.data || response

    if (!pedido) {
      return {
        title: 'Pedido no encontrado - GYS',
        description: 'El pedido solicitado no existe o no tienes permisos para verlo.'
      }
    }

    const proyecto = pedido.proyecto || pedido.listaEquipo?.proyecto
    return {
      title: `Pedido ${pedido.codigo} - GYS`,
      description: `Detalles del pedido de equipo ${pedido.codigo} del proyecto ${proyecto?.nombre || 'Sin proyecto'}`
    }
  } catch (error) {
    return {
      title: 'Error - GYS',
      description: 'Error al cargar la información del pedido.'
    }
  }
}

export default async function PedidoEquipoDetallePage({ params, searchParams }: PageProps) {
  // 📡 Extraer parámetros
  const { id } = await params
  const searchParamsResolved = await searchParams
  
  // 📡 Fetch pedido data - API returns { success, data: { ...pedido, gantt, validacion, estadisticas } }
  let pedido: any
  try {
    const response = await getPedidoEquipo(id) as any
    const rawPedido = response?.data || response
    if (!rawPedido) {
      notFound()
    }
    // Normalize: derive missing fields from available data
    pedido = {
      ...rawPedido,
      proyecto: rawPedido.proyecto || rawPedido.listaEquipo?.proyecto || null,
      fechaCreacion: rawPedido.fechaPedido || rawPedido.createdAt,
      fechaActualizacion: rawPedido.updatedAt,
      prioridad: rawPedido.prioridad || null,
      proveedor: rawPedido.proveedor || null,
      transportista: rawPedido.transportista || null,
      numeroGuia: rawPedido.numeroGuia || null,
      fechaEnvio: rawPedido.fechaEnvio || null,
    }
  } catch (error) {
    console.error('Error al obtener pedido:', error)
    notFound()
  }

  // 📡 Extract items from the main pedido response (no sub-endpoints needed)
  const pedidoItems = pedido.pedidoEquipoItem || []
  const itemsData = {
    total: pedidoItems.length,
    items: pedidoItems.map((item: any) => ({
      ...item,
      nombre: item.descripcion || item.codigo || 'Item',
      descripcion: item.descripcion,
      cantidadRecibida: item.cantidadAtendida || 0
    }))
  }
  const documentosData = { items: [] }

  // 🔁 Calculate pedido stats from embedded items
  const stats = {
    totalItems: itemsData.total,
    itemsRecibidos: itemsData.items.filter((item: any) => (item.cantidadRecibida || 0) >= item.cantidadPedida).length,
    itemsPendientes: itemsData.items.filter((item: any) => (item.cantidadRecibida || 0) < item.cantidadPedida).length,
    montoTotal: itemsData.items.reduce((sum: number, item: any) => sum + ((item.precioUnitario || 0) * (item.cantidadPedida || 0)), 0),
    montoRecibido: itemsData.items.reduce((sum: number, item: any) => sum + ((item.precioUnitario || 0) * (item.cantidadRecibida || 0)), 0),
    progresoEntrega: itemsData.total > 0 ?
      Math.min(100, Math.round((itemsData.items.filter((item: any) => (item.cantidadRecibida || 0) >= item.cantidadPedida).length / itemsData.total) * 100)) : 0,
    diasDesdeCreacion: (pedido.fechaPedido || pedido.createdAt) ?
      Math.floor((new Date().getTime() - new Date(pedido.fechaPedido || pedido.createdAt).getTime()) / (1000 * 60 * 60 * 24)) : 0,
    diasParaEntrega: pedido.fechaEntregaEstimada ?
      Math.floor((new Date(pedido.fechaEntregaEstimada).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0
  }

  const activeTab = searchParamsResolved.tab || 'resumen'

  // 🎨 Status color mapping
  const getStatusVariant = (estado: string) => {
    switch (estado) {
      case 'enviado': return 'default'
      case 'atendido': return 'default'
      case 'parcial': return 'secondary'
      case 'entregado': return 'default'
      case 'cancelado': return 'destructive'
      case 'borrador': return 'outline'
      default: return 'outline'
    }
  }

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
            <BreadcrumbLink href="/finanzas/aprovisionamiento/pedidos">Pedidos</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{pedido.codigo}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 🎨 Header Section */}
      <div className="flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" size="sm" asChild>
              <Link href="/finanzas/aprovisionamiento/pedidos">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Link>
            </Button>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-3xl font-bold tracking-tight">{pedido.codigo}</h1>
                <Badge variant={getStatusVariant(pedido.estado)}>
                  {pedido.estado.replace('_', ' ')}
                </Badge>
                {pedido.alertaRetraso && (
                  <Badge variant="destructive">
                    <Clock className="h-3 w-3 mr-1" />
                    Retraso
                  </Badge>
                )}
                {pedido.alertaCoherencia && (
                  <Badge variant="destructive">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    Alerta
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground mt-2">
                {pedido.proveedor?.nombre ? `Proveedor: ${pedido.proveedor.nombre} • ` : ''}Proyecto: {pedido.proyecto?.nombre || 'Sin proyecto'}
              </p>
            </div>
          </div>
          {/* Action buttons will be enabled as features are implemented */}
        </div>
      </div>

      <Separator />

      {/* 📊 Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso Entrega</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="text-2xl font-bold">{stats.progresoEntrega}%</div>
              <Progress value={stats.progresoEntrega} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {stats.itemsRecibidos} de {stats.totalItems} items
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              {stats.itemsPendientes} pendientes
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
              ${stats.montoTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              Valor del pedido
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Recibido</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats.montoRecibido.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.montoTotal > 0 ? Math.min(100, Math.round((stats.montoRecibido / stats.montoTotal) * 100)) : 0}% recibido
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              <Badge variant={getStatusVariant(pedido.estado)}>
                {pedido.estado.replace('_', ' ')}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {pedido.fechaActualizacion ? 
                `Actualizado ${new Date(pedido.fechaActualizacion).toLocaleDateString('es-PE')}` : 
                'Sin actualizaciones'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.diasParaEntrega > 0 ? stats.diasParaEntrega : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              días para entrega
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 📋 Tabs Content */}
      <Tabs value={activeTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="resumen" className="flex items-center space-x-2">
            <Eye className="h-4 w-4" />
            <span>Resumen</span>
          </TabsTrigger>
          <TabsTrigger value="items" className="flex items-center space-x-2">
            <Package2 className="h-4 w-4" />
            <span>Items ({stats.totalItems})</span>
          </TabsTrigger>
          <TabsTrigger value="tracking" className="flex items-center space-x-2">
            <Truck className="h-4 w-4" />
            <span>Tracking</span>
          </TabsTrigger>
          <TabsTrigger value="documentos" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Documentos</span>
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center space-x-2">
            <History className="h-4 w-4" />
            <span>Historial</span>
          </TabsTrigger>
        </TabsList>

        {/* 📊 Resumen Tab */}
        <TabsContent value="resumen" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pedido Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <ShoppingCart className="h-5 w-5" />
                  <span>Información del Pedido</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Código</label>
                    <p className="text-sm font-mono">{pedido.codigo}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Estado</label>
                    <p className="text-sm">
                      <Badge variant={getStatusVariant(pedido.estado)}>
                        {pedido.estado.replace('_', ' ')}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fecha Creación</label>
                    <p className="text-sm">
                      {pedido.fechaCreacion ? new Date(pedido.fechaCreacion).toLocaleDateString('es-PE') : 'No disponible'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Fecha Entrega Est.</label>
                    <p className="text-sm">
                      {pedido.fechaEntregaEstimada ? new Date(pedido.fechaEntregaEstimada).toLocaleDateString('es-PE') : 'No definida'}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Creado Por</label>
                    <p className="text-sm">{pedido.proyecto?.comercial?.name || 'Sistema'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Prioridad</label>
                    <p className="text-sm">
                      <Badge variant={pedido.prioridad?.toLowerCase() === 'alta' ? 'destructive' : 'outline'}>
                        {pedido.prioridad || 'Normal'}
                      </Badge>
                    </p>
                  </div>
                </div>
                {pedido.observacion && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Observaciones</label>
                    <p className="text-sm mt-1 p-3 bg-muted rounded">{pedido.observacion}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Supplier Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building className="h-5 w-5" />
                  <span>Información del Proveedor</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {pedido.proveedor ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={pedido.proveedor?.logo} alt={`Logo de ${pedido.proveedor?.nombre || 'proveedor'}`} />
                        <AvatarFallback>
                          {(pedido.proveedor?.nombre || 'PR').substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{pedido.proveedor?.nombre || 'Sin nombre'}</p>
                        <p className="text-sm text-muted-foreground">{pedido.proveedor?.ruc || ''}</p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{pedido.proveedor?.contacto || 'No disponible'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{pedido.proveedor?.email || 'No disponible'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{pedido.proveedor?.telefono || 'No disponible'}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{pedido.proveedor?.direccion || 'No disponible'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No hay proveedor asignado</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Financial Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calculator className="h-5 w-5" />
                <span>Resumen Financiero</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Monto Total</label>
                  <p className="text-2xl font-bold">
                    ${stats.montoTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Monto Recibido</label>
                  <p className="text-2xl font-bold text-green-600">
                    ${stats.montoRecibido.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-muted-foreground">Pendiente</label>
                  <p className="text-2xl font-bold text-orange-600">
                    ${(stats.montoTotal - stats.montoRecibido).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Progreso de Entrega</span>
                <span className="text-sm font-bold">{stats.progresoEntrega}%</span>
              </div>
              <Progress value={stats.progresoEntrega} className="h-2 mt-2" />
            </CardContent>
          </Card>

          {/* Items Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Package2 className="h-5 w-5" />
                <span>Resumen de Items</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {itemsData.items.length > 0 ? (
                <div className="space-y-3">
                  {itemsData.items.slice(0, 5).map((item: any) => {
                    const progreso = item.cantidadPedida > 0 ? Math.min(100, Math.round(((item.cantidadRecibida || 0) / item.cantidadPedida) * 100)) : 0
                    return (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.codigo} - {item.nombre || item.descripcion}</p>
                          <p className="text-xs text-muted-foreground">
                            {item.cantidadRecibida || 0}/{item.cantidadPedida} recibidos
                          </p>
                        </div>
                        <Badge variant={progreso >= 100 ? 'default' : progreso > 0 ? 'secondary' : 'outline'} className="text-[10px] ml-2">
                          {progreso >= 100 ? 'Completo' : progreso > 0 ? `${progreso}%` : 'Pendiente'}
                        </Badge>
                      </div>
                    )
                  })}
                  {itemsData.items.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      y {itemsData.items.length - 5} items más...
                    </p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">Sin items en este pedido</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 📦 Items Tab */}
        <TabsContent value="items" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Items del Pedido</span>
                <div className="flex items-center space-x-2">
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Detalle de todos los items incluidos en el pedido
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[800px]">
                    <thead className="border-b bg-muted/50">
                      <tr>
                        <th scope="col" className="text-left p-4 font-medium">Código</th>
                        <th scope="col" className="text-left p-4 font-medium">Descripción</th>
                        <th scope="col" className="text-right p-4 font-medium">Cant. Pedida</th>
                        <th scope="col" className="text-right p-4 font-medium">Cant. Recibida</th>
                        <th scope="col" className="text-right p-4 font-medium">Precio Unit.</th>
                        <th scope="col" className="text-right p-4 font-medium">Total</th>
                        <th scope="col" className="text-center p-4 font-medium">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itemsData.items.map((item: any, index: number) => {
                        const progreso = item.cantidadPedida > 0 ?
                          Math.min(100, Math.round(((item.cantidadRecibida || 0) / item.cantidadPedida) * 100)) : 0
                        
                        return (
                          <tr key={item.id} className="border-b hover:bg-muted/50">
                            <td className="p-4">
                              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                                {item.codigo}
                              </code>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="font-medium">{item.nombre}</p>
                                {item.descripcion && (
                                  <p className="text-sm text-muted-foreground truncate max-w-xs">
                                    {item.descripcion}
                                  </p>
                                )}
                              </div>
                            </td>
                            <td className="p-4 text-right font-mono">
                              {(item.cantidadPedida || 0).toLocaleString()}
                            </td>
                            <td className="p-4 text-right font-mono">
                              <div className="space-y-1">
                                <span className={(item.cantidadRecibida || 0) >= item.cantidadPedida ? 'text-green-600' : ''}>
                                  {(item.cantidadRecibida || 0).toLocaleString()}
                                </span>
                                <div className="w-full bg-muted rounded-full h-1">
                                  <div 
                                    className="bg-primary h-1 rounded-full transition-all" 
                                    style={{ width: `${Math.min(progreso, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>
                            <td className="p-4 text-right font-mono">
                              ${(item.precioUnitario || 0).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 text-right font-mono font-medium">
                              ${((item.cantidadPedida || 0) * (item.precioUnitario || 0)).toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                            </td>
                            <td className="p-4 text-center">
                              <Badge variant={progreso >= 100 ? 'default' : progreso > 0 ? 'secondary' : 'outline'}>
                                {progreso >= 100 ? 'Completo' : progreso > 0 ? 'Parcial' : 'Pendiente'}
                              </Badge>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary Row */}
              <div className="mt-4 p-4 bg-muted/50 rounded-lg">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    Total: {stats.totalItems} items • {stats.itemsRecibidos} completos • {stats.itemsPendientes} pendientes
                  </div>
                  <div className="text-lg font-bold">
                    Monto Total: ${stats.montoTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 🚚 Tracking Tab */}
        <TabsContent value="tracking" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Truck className="h-5 w-5" />
                <span>Seguimiento de Entrega</span>
              </CardTitle>
              <CardDescription>
                Timeline de estados y entregas del pedido
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Status Timeline */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                    <div className="w-3 h-3 bg-green-500 rounded-full" />
                    <div className="flex-1">
                      <p className="font-medium text-green-800">Pedido Creado</p>
                      <p className="text-sm text-green-600">
                        {pedido.fechaCreacion ? new Date(pedido.fechaCreacion).toLocaleDateString('es-PE') : 'Fecha no disponible'}
                      </p>
                    </div>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  
                  <div className="flex items-center space-x-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="w-3 h-3 bg-blue-500 rounded-full" />
                    <div className="flex-1">
                      <p className="font-medium text-blue-800">Pedido Enviado</p>
                      <p className="text-sm text-blue-600">
                        {pedido.fechaEnvio ? new Date(pedido.fechaEnvio).toLocaleDateString('es-PE') : 'Pendiente'}
                      </p>
                    </div>
                    {pedido.fechaEnvio ? <CheckCircle className="h-5 w-5 text-blue-500" /> : <Clock className="h-5 w-5 text-blue-400" />}
                  </div>
                  
                  <div className="flex items-center space-x-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="w-3 h-3 bg-orange-500 rounded-full" />
                    <div className="flex-1">
                      <p className="font-medium text-orange-800">En Tránsito</p>
                      <p className="text-sm text-orange-600">
                        {pedido.estado === 'parcial' || pedido.estado === 'enviado' ? 'En proceso' : 'Pendiente'}
                      </p>
                    </div>
                    {pedido.estado === 'parcial' || pedido.estado === 'enviado' ? <Truck className="h-5 w-5 text-orange-500" /> : <Clock className="h-5 w-5 text-orange-400" />}
                  </div>
                  
                  <div className="flex items-center space-x-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <div className="w-3 h-3 bg-gray-400 rounded-full" />
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">Entregado</p>
                      <p className="text-sm text-gray-600">
                        {pedido.fechaEntregaReal ? new Date(pedido.fechaEntregaReal).toLocaleDateString('es-PE') : 'Pendiente'}
                      </p>
                    </div>
                    {pedido.fechaEntregaReal ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Clock className="h-5 w-5 text-gray-400" />}
                  </div>
                </div>

                {/* Delivery Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Fecha Estimada</label>
                    <p className="text-sm">
                      {pedido.fechaEntregaEstimada ? 
                        new Date(pedido.fechaEntregaEstimada).toLocaleDateString('es-PE') : 
                        'No definida'
                      }
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Días Restantes</label>
                    <p className="text-sm">
                      {stats.diasParaEntrega > 0 ? 
                        `${stats.diasParaEntrega} días` : 
                        stats.diasParaEntrega === 0 ? 'Hoy' : 'Vencido'
                      }
                    </p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Transportista</label>
                    <p className="text-sm">{pedido.transportista || 'No asignado'}</p>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-muted-foreground">Número de Guía</label>
                    <p className="text-sm font-mono">{pedido.numeroGuia || 'No disponible'}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 📄 Documentos Tab */}
        <TabsContent value="documentos" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Documentos del Pedido</span>
                <Button size="sm">
                  <FileDown className="h-4 w-4 mr-2" />
                  Subir Documento
                </Button>
              </CardTitle>
              <CardDescription>
                Documentos asociados al pedido (órdenes, facturas, guías, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documentosData.items.length > 0 ? (
                  documentosData.items.map((documento: any) => (
                    <div key={documento.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-8 w-8 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{documento.nombre}</p>
                          <p className="text-sm text-muted-foreground">
                            {documento.tipo} • {documento.tamaño} • 
                            {documento.fechaSubida ? new Date(documento.fechaSubida).toLocaleDateString('es-PE') : 'Fecha no disponible'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          Ver
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Descargar
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No hay documentos asociados</p>
                    <Button variant="outline" className="mt-4">
                      <FileDown className="h-4 w-4 mr-2" />
                      Subir primer documento
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 📜 Historial Tab */}
        <TabsContent value="historial" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <History className="h-5 w-5" />
                <span>Historial de Cambios</span>
              </CardTitle>
              <CardDescription>
                Registro de todas las modificaciones y actualizaciones del pedido
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <History className="h-10 w-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">El historial de cambios estará disponible próximamente</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Creado: {pedido.fechaCreacion ? new Date(pedido.fechaCreacion).toLocaleDateString('es-PE') : 'No disponible'}
                </p>
              </div>
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
            Error al cargar el pedido
          </CardTitle>
          <CardDescription>
            Ha ocurrido un error al cargar los detalles del pedido
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
              <Link href="/finanzas/aprovisionamiento/pedidos">
                Volver a Pedidos
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}