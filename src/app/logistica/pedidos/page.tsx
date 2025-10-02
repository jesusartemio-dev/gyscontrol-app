/**
 * 📦 Página de Gestión de Pedidos - Logística
 * 
 * Página principal para gestión logística de pedidos de equipos:
 * - Vista consolidada de todos los pedidos
 * - Métricas de progreso y trazabilidad
 * - Filtros avanzados y búsqueda
 * - Actualización de estados de entrega
 * - Navegación a reportes y dashboard
 * 
 * @author GYS Team
 * @version 2.0.0
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

// 📡 Types & Services
import {
  PedidoEquipoUpdatePayload,
  PedidoEquipoItemUpdatePayload,
  PedidoEquipo
} from '@/types'
import {
  getAllPedidoEquipos,
  updatePedidoEquipo,
  deletePedidoEquipo,
} from '@/lib/services/pedidoEquipo'
import {
  updatePedidoEquipoItem,
  deletePedidoEquipoItem,
} from '@/lib/services/pedidoEquipoItem'

// 🎨 UI Components
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  BarChart3,
  Activity,
  Target,
  Clock,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Calendar,
  Table,
  Grid3X3
} from 'lucide-react'

// 🧩 Components
import PedidoEquiposTableView from '@/components/equipos/PedidoEquiposTableView'
import PedidoEquiposCardView from '@/components/equipos/PedidoEquiposCardView'
import PedidoEquipoEstadoLogistico from '@/components/equipos/PedidoEquipoEstadoLogistico'

export default function PedidosLogisticaPage() {
  const router = useRouter()
  const { data: session } = useSession()
  
  // 🎯 States
  const [pedidos, setPedidos] = useState<PedidoEquipo[]>([])
  const [filteredPedidos, setFilteredPedidos] = useState<PedidoEquipo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'table' | 'card'>('table')
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState('todos')

  // 📡 Data loading
  useEffect(() => {
    cargarPedidos()
  }, [])

  // 🔍 Filtrado de pedidos
  useEffect(() => {
    let filtered = pedidos

    // Filtro por búsqueda
    if (searchTerm) {
      filtered = filtered.filter(pedido =>
        pedido.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pedido.responsable?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pedido.items?.some(item => item.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    // Filtro por estado
    if (filterEstado !== 'todos') {
      filtered = filtered.filter(pedido => pedido.estado === filterEstado)
    }

    setFilteredPedidos(filtered)
  }, [pedidos, searchTerm, filterEstado])

  const cargarPedidos = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAllPedidoEquipos() // Sin filtro de proyecto para ver todos
      setPedidos(data || [])
    } catch (err) {
      setError('Error al cargar pedidos')
      toast.error('Error al cargar pedidos')
    } finally {
      setLoading(false)
    }
  }

  // 🎯 Event handlers
  const handleUpdate = async (id: string, payload: PedidoEquipoUpdatePayload) => {
    const actualizado = await updatePedidoEquipo(id, payload)
    if (actualizado) {
      toast.success('Pedido actualizado')
      await cargarPedidos() // Recargar datos
    } else {
      toast.error('Error al actualizar pedido')
    }
  }

  const handleDelete = async (id: string) => {
    const eliminado = await deletePedidoEquipo(id)
    if (eliminado) {
      toast.success('Pedido eliminado')
      await cargarPedidos() // Recargar datos
    } else {
      toast.error('Error al eliminar pedido')
    }
  }

  const handleUpdateItem = async (
    id: string,
    payload: PedidoEquipoItemUpdatePayload
  ) => {
    const actualizado = await updatePedidoEquipoItem(id, payload)
    if (actualizado) {
      toast.success('Item actualizado')
      await cargarPedidos() // Recargar datos
    } else {
      toast.error('Error al actualizar item')
    }
  }

  const handleDeleteItem = async (id: string) => {
    const eliminado = await deletePedidoEquipoItem(id)
    if (eliminado) {
      toast.success('Item eliminado')
      await cargarPedidos() // Recargar datos
    } else {
      toast.error('Error al eliminar item')
    }
  }

  // 📊 Calculate metrics
  const totalPedidos = filteredPedidos.length
  const pedidosEnProgreso = filteredPedidos.filter(p =>
    ['en_proceso', 'parcial', 'pendiente'].includes(p.estado?.toLowerCase() || '')
  ).length
  const pedidosCompletados = filteredPedidos.filter(p =>
    p.estado?.toLowerCase() === 'completado'
  ).length
  const pedidosRetrasados = filteredPedidos.filter(p => {
    if (!p.fechaNecesaria) return false
    const fechaLimite = new Date(p.fechaNecesaria)
    const hoy = new Date()
    return hoy > fechaLimite && p.estado?.toLowerCase() !== 'completado'
  }).length

  const totalItems = filteredPedidos.reduce((total, pedido) =>
    total + (pedido.items?.length || 0), 0
  )
  const itemsEntregados = filteredPedidos.reduce((total, pedido) =>
    total + (pedido.items?.filter(item => item.estado === 'entregado').length || 0), 0
  )
  const progresoGeneral = totalItems > 0 ? Math.round((itemsEntregados / totalItems) * 100) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-6 space-y-6"
    >
      {/* 🧭 Breadcrumb Navigation */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/logistica">Logística</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Pedidos</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* 📋 Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Truck className="h-8 w-8 text-blue-600" />
            Gestión de Pedidos
          </h1>
          <p className="text-muted-foreground mt-1">
            Control logístico y seguimiento de entregas
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-1 border rounded-lg p-1">
            <Button
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('table')}
              className="h-8"
            >
              <Table className="h-4 w-4 mr-2" />
              Tabla
            </Button>
            <Button
              variant={viewMode === 'card' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('card')}
              className="h-8"
            >
              <Grid3X3 className="h-4 w-4 mr-2" />
              Cards
            </Button>
          </div>
          <Button
            onClick={() => router.push('/gestion/reportes/pedidos')}
            variant="default"
            size="sm"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Dashboard
          </Button>
          <Button onClick={cargarPedidos} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </motion.div>

      {/* 📊 Métricas Rápidas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4"
      >
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pedidos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPedidos}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{pedidosEnProgreso}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{pedidosCompletados}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Retrasados</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{pedidosRetrasados}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progreso General</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{progresoGeneral}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {itemsEntregados}/{totalItems} items
            </p>
          </CardContent>
        </Card>
      </motion.div>

      <Separator />

      {/* 🚛 Gestión Logística de Entregas */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="space-y-4"
      >
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-800">
            Gestión Logística de Entregas
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Administra el estado logístico de los pedidos y coordina las entregas a proyectos.
        </p>

        {/* Aquí se mostraría un resumen de entregas pendientes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entregas Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {filteredPedidos.filter(p => p.estadoLogistico !== 'entregado').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Pedidos en proceso logístico
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entregas Hoy</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {filteredPedidos.filter(p => {
                  const hoy = new Date().toDateString()
                  return p.fechaProgramadaEntrega &&
                         new Date(p.fechaProgramadaEntrega).toDateString() === hoy
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Programadas para hoy
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Entregas Retrasadas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {filteredPedidos.filter(p => {
                  if (!p.fechaProgramadaEntrega) return false
                  const fechaProgramada = new Date(p.fechaProgramadaEntrega)
                  const hoy = new Date()
                  return fechaProgramada < hoy && p.estadoLogistico !== 'entregado'
                }).length}
              </div>
              <p className="text-xs text-muted-foreground">
                Con retraso en entrega
              </p>
            </CardContent>
          </Card>
        </div>
      </motion.div>

      <Separator />

      {/* 📦 Lista de Pedidos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            <Package className="h-5 w-5" />
            Pedidos Registrados
          </h2>
          <Badge variant="secondary" className="px-3 py-1">
            {viewMode === 'table' ? 'Vista Tabla' : 'Vista Cards'} • {filteredPedidos.length} pedidos
          </Badge>
        </div>

        {/* Filtros básicos */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Input
                placeholder="Buscar por código, responsable..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-4"
              />
            </div>
            <Select value={filterEstado} onValueChange={setFilterEstado}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos los estados</SelectItem>
                <SelectItem value="borrador">Borrador</SelectItem>
                <SelectItem value="enviado">Enviado</SelectItem>
                <SelectItem value="atendido">Atendido</SelectItem>
                <SelectItem value="parcial">Parcial</SelectItem>
                <SelectItem value="entregado">Entregado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-gray-600">
            {filteredPedidos.length} de {pedidos.length} pedidos
          </div>
        </div>

        {/* Vista de pedidos */}
        {filteredPedidos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No hay pedidos registrados</h3>
              <p className="text-gray-600 mb-4 text-center">
                Los pedidos aparecerán aquí una vez que sean creados desde los proyectos.
              </p>
            </CardContent>
          </Card>
        ) : (
          viewMode === 'table' ? (
            <PedidoEquiposTableView
              pedidos={filteredPedidos}
              proyectoId="" // Para logística, no hay proyecto específico
              onEdit={(pedido) => router.push(`/logistica/pedidos/${pedido.id}`)}
              onDelete={handleDelete}
            />
          ) : (
            <PedidoEquiposCardView
              pedidos={filteredPedidos}
              proyectoId="" // Para logística, no hay proyecto específico
              onEdit={(pedido) => router.push(`/logistica/pedidos/${pedido.id}`)}
              onDelete={handleDelete}
            />
          )
        )}
      </motion.div>
    </motion.div>
  )
}
