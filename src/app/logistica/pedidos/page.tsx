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
  TrendingUp
} from 'lucide-react'

// 🧩 Components
import PedidoEquipoListWithFilters from '@/components/equipos/PedidoEquipoListWithFilters'

export default function PedidosLogisticaPage() {
  const router = useRouter()
  const { data: session } = useSession()
  
  // 🎯 States
  const [pedidos, setPedidos] = useState<PedidoEquipo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 📡 Data loading
  useEffect(() => {
    cargarPedidos()
  }, [])

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
  const totalPedidos = pedidos.length
  const pedidosEnProgreso = pedidos.filter(p => 
    ['en_proceso', 'parcial', 'pendiente'].includes(p.estado?.toLowerCase() || '')
  ).length
  const pedidosCompletados = pedidos.filter(p => 
    p.estado?.toLowerCase() === 'completado'
  ).length
  const pedidosRetrasados = pedidos.filter(p => {
    if (!p.fechaNecesaria) return false
    const fechaLimite = new Date(p.fechaNecesaria)
    const hoy = new Date()
    return hoy > fechaLimite && p.estado?.toLowerCase() !== 'completado'
  }).length

  const totalItems = pedidos.reduce((total, pedido) => 
    total + (pedido.items?.length || 0), 0
  )
  const itemsEntregados = pedidos.reduce((total, pedido) => 
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

      {/* 📦 Lista de Pedidos */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <PedidoEquipoListWithFilters
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onUpdateItem={handleUpdateItem}
          onDeleteItem={handleDeleteItem}
        />
      </motion.div>
    </motion.div>
  )
}
