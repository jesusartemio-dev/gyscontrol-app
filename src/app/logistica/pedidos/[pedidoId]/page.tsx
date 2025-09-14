/**
 * 📦 Página de Detalle de Pedido - Logística
 * 
 * Vista detallada para gestión logística de un pedido específico:
 * - Información completa del pedido y proyecto
 * - Timeline de trazabilidad de entregas
 * - Formularios de actualización de estados
 * - Historial de cambios y comunicaciones
 * - Métricas específicas del pedido
 * - Gestión de entregas parciales
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

// 📡 Types & Services
import {
  PedidoEquipo,
  PedidoEquipoItem,
  PedidoEquipoUpdatePayload,
  PedidoEquipoItemUpdatePayload,
  TrazabilidadEvent
} from '@/types'
import {
  getPedidoEquipoById,
  updatePedidoEquipo
} from '@/lib/services/pedidoEquipo'
import {
  updatePedidoEquipoItem
} from '@/lib/services/pedidoEquipoItem'
import {
  obtenerEventosTrazabilidad,
  obtenerMetricasEntrega
} from '@/lib/services/trazabilidad'

// 🎨 UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

// 🎯 Icons
import {
  Package,
  Truck,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowLeft,
  Edit,
  Save,
  X,
  Activity,
  Target,
  Calendar,
  User,
  MapPin,
  FileText,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw
} from 'lucide-react'

// 🧩 Custom Components
import TrazabilidadTimeline from '@/components/trazabilidad/TrazabilidadTimeline'
import MetricasEntrega, { type MetricaEntrega, crearMetricaEntrega } from '@/components/equipos/MetricasEntrega'
import PedidoEquipoItemList from '@/components/equipos/PedidoEquipoItemList'
import type { MetricasEntregaData } from '@/types/modelos'

// 🔧 Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const getStatusVariant = (estado: string): "default" | "secondary" | "destructive" | "outline" => {
  switch (estado?.toLowerCase()) {
    case 'completado': return 'default'
    case 'en_progreso': return 'secondary'
    case 'pendiente': return 'outline'
    case 'cancelado': return 'destructive'
    default: return 'outline'
  }
}

export default function PedidoLogisticaDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const pedidoId = params?.pedidoId as string

  // 🔄 Estados principales
  const [pedido, setPedido] = useState<PedidoEquipo | null>(null)
  const [eventos, setEventos] = useState<TrazabilidadEvent[]>([])
  const [metricas, setMetricas] = useState<MetricasEntregaData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [updating, setUpdating] = useState(false)

  // 📊 Estados de formulario
  const [formData, setFormData] = useState<Partial<PedidoEquipoUpdatePayload>>({})

  // 🔁 Cargar datos iniciales
  useEffect(() => {
    if (pedidoId) {
      cargarDatos()
    }
  }, [pedidoId])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError(null)

      const [pedidoData, eventosData, metricasData] = await Promise.all([
        getPedidoEquipoById(pedidoId),
        obtenerEventosTrazabilidad({ entidadId: pedidoId, entidadTipo: 'PEDIDO' }),
        obtenerMetricasEntrega(pedidoId)
      ])

      setPedido(pedidoData)
      setEventos(eventosData)
      setMetricas(metricasData)
      
      if (pedidoData) {
        setFormData({
          estado: pedidoData.estado,
          observacion: pedidoData.observacion || ''
        })
      }
    } catch (err) {
      console.error('Error cargando datos:', err)
      setError('Error al cargar los datos del pedido')
      toast.error('Error al cargar los datos del pedido')
    } finally {
      setLoading(false)
    }
  }

  // 📝 Actualizar pedido
  const handleUpdatePedido = async () => {
    if (!pedido || !formData) return

    try {
      setUpdating(true)
      const updated = await updatePedidoEquipo(pedido.id, formData)
      setPedido(updated)
      toast.success('Pedido actualizado correctamente')
      await cargarDatos() // Recargar para obtener nuevos eventos
    } catch (err) {
      console.error('Error actualizando pedido:', err)
      toast.error('Error al actualizar el pedido')
    } finally {
      setUpdating(false)
    }
  }

  // 📝 Actualizar item
  const handleUpdateItem = async (itemId: string, data: PedidoEquipoItemUpdatePayload) => {
    try {
      await updatePedidoEquipoItem(itemId, data)
      toast.success('Item actualizado correctamente')
      await cargarDatos() // Recargar datos
    } catch (err) {
      console.error('Error actualizando item:', err)
      toast.error('Error al actualizar el item')
    }
  }

  // 🔄 Calcular métricas de progreso
  const calcularProgreso = () => {
    if (!pedido?.items || pedido.items.length === 0) {
      return { progreso: 0, itemsEntregados: 0, totalItems: 0 }
    }

    const totalItems = pedido.items.reduce((sum, item) => sum + item.cantidadPedida, 0)
    const itemsEntregados = pedido.items.reduce((sum, item) => {
      return sum + (item.estado === 'entregado' ? item.cantidadPedida : 0)
    }, 0)
    const progreso = totalItems > 0 ? (itemsEntregados / totalItems) * 100 : 0

    return { progreso, itemsEntregados, totalItems }
  }

  const { progreso, itemsEntregados, totalItems } = calcularProgreso()

  // 🔄 Transformar métricas de entrega
  const transformarMetricasEntrega = (data: MetricasEntregaData): MetricaEntrega[] => {
    return [
      crearMetricaEntrega(
        'total-pedidos',
        'Total Pedidos',
        data.totalPedidos,
        {
          formato: 'entero',
          categoria: 'principal',
          icono: <Package className="w-4 h-4" />,
          tendencia: 'estable',
          porcentajeCambio: 0,
          ultimaActualizacion: data.ultimaActualizacion
        }
      ),
      crearMetricaEntrega(
        'pedidos-entregados',
        'Entregados',
        data.pedidosEntregados,
        {
          formato: 'entero',
          categoria: 'principal',
          icono: <CheckCircle className="w-4 h-4" />,
          tendencia: data.tendenciaEntregas,
          porcentajeCambio: 0,
          ultimaActualizacion: data.ultimaActualizacion
        }
      ),
      crearMetricaEntrega(
        'tiempo-promedio',
        'Tiempo Promedio',
        data.tiempoPromedioEntrega,
        {
          formato: 'tiempo',
          unidad: 'h',
          categoria: 'secundaria',
          icono: <Clock className="w-4 h-4" />,
          tendencia: 'estable',
          porcentajeCambio: 0,
          ultimaActualizacion: data.ultimaActualizacion
        }
      ),
      crearMetricaEntrega(
        'eficiencia-entrega',
        'Entrega a Tiempo',
        data.porcentajeEntregaATiempo,
        {
          formato: 'porcentaje',
          categoria: 'principal',
          meta: 95,
          icono: <Target className="w-4 h-4" />,
          tendencia: data.tendenciaEntregas,
          porcentajeCambio: 0,
          ultimaActualizacion: data.ultimaActualizacion
        }
      )
    ];
  };

  const metricasTransformadas = metricas ? transformarMetricasEntrega(metricas) : null;

  // 🔄 Loading state
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        {/* Header Skeleton */}
        <div className="space-y-4">
          <div className="h-4 bg-gray-200 rounded w-64 animate-pulse" />
          <div className="h-8 bg-gray-200 rounded w-96 animate-pulse" />
        </div>
        
        {/* Content Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="h-64 bg-gray-200 rounded animate-pulse" />
            <div className="h-96 bg-gray-200 rounded animate-pulse" />
          </div>
          <div className="space-y-6">
            <div className="h-48 bg-gray-200 rounded animate-pulse" />
            <div className="h-64 bg-gray-200 rounded animate-pulse" />
          </div>
        </div>
      </div>
    )
  }

  // ❌ Error state
  if (error || !pedido) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {error || 'No se pudo cargar el pedido'}
          </AlertDescription>
        </Alert>
        <div className="mt-4">
          <Button onClick={() => router.back()} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>
    )
  }

  return (
    <motion.div 
      className="p-6 space-y-6"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* 🧭 Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/logistica">Logística</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/logistica/pedidos">Pedidos</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Detalle {pedido.codigo}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 📊 Header con información principal */}
      <motion.div 
        className="space-y-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => router.back()}
                className="p-0 h-auto"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Volver
              </Button>
            </div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <Package className="h-8 w-8 text-primary" />
              Pedido {pedido.codigo}
            </h1>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(pedido.fechaPedido)}
              </span>
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {pedido.responsable?.name || 'N/A'}
              </span>
              <Badge variant={getStatusVariant(pedido.estado)}>
                {pedido.estado}
              </Badge>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => router.push('/gestion/reportes/pedidos')}
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              Ver Reportes
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={cargarDatos}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
          </div>
        </div>
      </motion.div>

      <Separator />

      {/* 📊 Métricas de progreso */}
      <motion.div 
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso General</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{progreso.toFixed(1)}%</div>
            <Progress value={progreso} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {itemsEntregados} de {totalItems} items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Items Totales</CardTitle>
            <Package className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{totalItems}</div>
            <p className="text-xs text-muted-foreground">
              Cantidad total de items
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entregados</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{itemsEntregados}</div>
            <p className="text-xs text-muted-foreground">
              Items completados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{totalItems - itemsEntregados}</div>
            <p className="text-xs text-muted-foreground">
              Items por entregar
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* 📋 Contenido principal con tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
      >
        <Tabs defaultValue="items" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="items" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Items ({pedido.items?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Timeline ({eventos.length})
            </TabsTrigger>
            <TabsTrigger value="info" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Información
            </TabsTrigger>
            <TabsTrigger value="metricas" className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Métricas
            </TabsTrigger>
          </TabsList>

          {/* 📦 Tab de Items */}
          <TabsContent value="items" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Gestión de Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pedido.items && pedido.items.length > 0 ? (
                  <PedidoEquipoItemList
                    items={pedido.items}
                    onUpdate={handleUpdateItem}
                  />
                ) : (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay items</h3>
                    <p className="text-muted-foreground">
                      Este pedido no tiene items asociados.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* 📈 Tab de Timeline */}
          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Timeline de Trazabilidad
                </CardTitle>
              </CardHeader>
              <CardContent>
                <TrazabilidadTimeline eventos={eventos} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* 📄 Tab de Información */}
          <TabsContent value="info" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Información del Pedido */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Información del Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Número</label>
                      <p className="font-semibold">{pedido.codigo}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Estado</label>
                      <div className="mt-1">
                        <Badge variant={getStatusVariant(pedido.estado)}>
                          {pedido.estado}
                        </Badge>
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Fecha Creación</label>
                      <p className="font-semibold">{formatDate(pedido.fechaPedido)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Fecha Requerida</label>
                      <p className="font-semibold">
                        {pedido.fechaNecesaria ? formatDate(pedido.fechaNecesaria) : 'No especificada'}
                      </p>
                    </div>
                  </div>
                  
                  {pedido.observacion && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Observaciones</label>
                      <p className="mt-1 text-sm bg-muted p-3 rounded">{pedido.observacion}</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Información del Proyecto */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Información del Proyecto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {pedido.responsable ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Responsable</label>
                    <p className="font-semibold">{pedido.responsable.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Email</label>
                    <p className="font-semibold">{pedido.responsable.email || 'No especificado'}</p>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground">No hay información del responsable disponible</p>
              )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* 📊 Tab de Métricas */}
          <TabsContent value="metricas" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Métricas de Entrega
                </CardTitle>
              </CardHeader>
              <CardContent>
                {metricasTransformadas ? (
                  <MetricasEntrega metricas={metricasTransformadas} />
                ) : (
                  <div className="text-center py-8">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No hay métricas disponibles</h3>
                    <p className="text-muted-foreground">
                      Las métricas se generarán cuando haya datos de entrega.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  )
}