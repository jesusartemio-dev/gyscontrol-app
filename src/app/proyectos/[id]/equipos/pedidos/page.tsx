// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/proyectos/[id]/equipos/pedidos/page.tsx
// 🔧 Descripción: Página de gestión de pedidos de equipos con UX/UI mejorada
// 🎨 Mejoras aplicadas: Framer Motion, Shadcn/UI, Estados de carga, Breadcrumb navigation
// ✍️ Autor: Jesús Artemio + IA GYS
// 📅 Última actualización: 2025-01-27
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { motion } from 'framer-motion'

import {
  PedidoEquipo,
  PedidoEquipoPayload,
  PedidoEquipoUpdatePayload,
  PedidoEquipoItemUpdatePayload,
  PedidoEquipoItemPayload,
  ListaEquipo,
  Proyecto,
} from '@/types'

import {
  getPedidoEquipos,
  createPedidoEquipo,
  updatePedidoEquipo,
  deletePedidoEquipo,
} from '@/lib/services/pedidoEquipo'

import {
  createPedidoEquipoItem,
  updatePedidoEquipoItem,
  deletePedidoEquipoItem,
} from '@/lib/services/pedidoEquipoItem'

import { getListaEquiposPorProyecto } from '@/lib/services/listaEquipo'
import { getProyectoById } from '@/lib/services/proyecto'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'

import {
  ChevronRight,
  Package,
  Calendar,
  TrendingUp,
  AlertCircle,
  FileText,
  Clock,
  DollarSign,
  RefreshCw,
} from 'lucide-react'

import PedidoEquipoModalCrear from '@/components/equipos/PedidoEquipoModalCrear'
import PedidoEquipoAccordion from '@/components/equipos/PedidoEquipoAccordion'

// Helper functions for UI enhancements
const getStatusVariant = (estado: string): "default" | "outline" => {
  switch (estado?.toLowerCase()) {
    case 'pendiente': return 'default'
    case 'completado': return 'default'
    case 'pausado': return 'outline'
    case 'cancelado': return 'outline'
    default: return 'outline'
  }
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
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

export default function PedidosProyectoPage() {
  const { id: proyectoId } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const router = useRouter()

  const [pedidos, setPedidos] = useState<PedidoEquipo[]>([])
  const [listas, setListas] = useState<ListaEquipo[]>([])
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const [proyectoData, pedidosData, listasData] = await Promise.all([
        getProyectoById(proyectoId),
        getPedidoEquipos(proyectoId),
        getListaEquiposPorProyecto(proyectoId)
      ])
      
      setProyecto(proyectoData)
      setPedidos(pedidosData || [])
      setListas(listasData || [])
    } catch (err) {
      setError('Error al cargar los datos')
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  const cargarPedidos = async () => {
    try {
      const data = await getPedidoEquipos(proyectoId)
      setPedidos(data || [])
    } catch {
      toast.error('Error al cargar pedidos')
    }
  }

  const cargarListas = async () => {
    try {
      const data = await getListaEquiposPorProyecto(proyectoId)
      setListas(data || [])
    } catch {
      toast.error('Error al cargar listas')
    }
  }

  useEffect(() => {
    if (proyectoId) {
      cargarDatos()
    }
  }, [proyectoId])

  const handleCreatePedido = async (payload: PedidoEquipoPayload) => {
    const nuevo = await createPedidoEquipo(payload)
    if (nuevo) {
      toast.success('Pedido registrado')
      await cargarPedidos()
      await cargarListas()
      return nuevo
    } else {
      toast.error('Error al registrar pedido')
      return null
    }
  }

  const handleCreateItem = async (payload: PedidoEquipoItemPayload) => {
    const nuevo = await createPedidoEquipoItem(payload)
    if (nuevo) {
      toast.success('Ítem registrado')
      // 🔄 Actualizar tanto pedidos como listas para refrescar cantidadPedida
      await Promise.all([
        cargarPedidos(),
        cargarListas()
      ])
    } else {
      toast.error('Error al registrar ítem')
    }
  }

  const handleUpdate = async (id: string, payload: PedidoEquipoUpdatePayload) => {
    const actualizado = await updatePedidoEquipo(id, payload)
    if (actualizado) {
      toast.success('Pedido actualizado')
      cargarPedidos()
    } else {
      toast.error('Error al actualizar pedido')
    }
  }

  const handleDelete = async (id: string) => {
    const ok = await deletePedidoEquipo(id)
    if (ok) {
      toast.success('Pedido eliminado')
      cargarPedidos()
    } else {
      toast.error('Error al eliminar pedido')
    }
  }

  const handleUpdateItem = async (id: string, payload: PedidoEquipoItemUpdatePayload) => {
    const actualizado = await updatePedidoEquipoItem(id, payload)
    if (actualizado) {
      toast.success('Ítem actualizado')
      // 🔄 Actualizar tanto pedidos como listas para refrescar cantidadPedida
      await Promise.all([
        cargarPedidos(),
        cargarListas()
      ])
    } else {
      toast.error('Error al actualizar ítem')
    }
  }

  const handleDeleteItem = async (id: string) => {
    const ok = await deletePedidoEquipoItem(id)
    if (ok) {
      toast.success('Ítem eliminado')
      // 🔄 Actualizar tanto pedidos como listas para refrescar cantidadPedida
      await Promise.all([
        cargarPedidos(),
        cargarListas()
      ])
    } else {
      toast.error('Error al eliminar ítem')
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="container mx-auto p-6 space-y-6">
        <div className="space-y-4">
          <Skeleton className="h-6 w-64" />
          <Skeleton className="h-10 w-full" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-20" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto p-6"
      >
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error al cargar los datos</h3>
            <p className="text-red-600 mb-4 text-center">{error}</p>
            <Button onClick={cargarDatos} variant="outline" className="border-red-300 text-red-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reintentar
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // Project not found state
  if (!proyecto) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="container mx-auto p-6"
      >
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Proyecto no encontrado</h3>
            <p className="text-gray-600 mb-4">No se pudo encontrar el proyecto solicitado.</p>
            <Button onClick={() => router.push('/proyectos')} variant="outline">
              Volver a Proyectos
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  // Calculate quick stats
  const totalPedidos = pedidos.length
  const pedidosPendientes = pedidos.filter(p => p.estado?.toLowerCase() === 'pendiente').length
  const pedidosCompletados = pedidos.filter(p => p.estado?.toLowerCase() === 'completado').length
  const montoTotal = pedidos.reduce((total, pedido) => {
    const montoPedido = pedido.items?.reduce((sum, item) => sum + (item.costoTotal || 0), 0) || 0
    return total + montoPedido
  }, 0)

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="container mx-auto p-6 space-y-6"
    >
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
        <Button variant="ghost" size="sm" onClick={() => router.push('/proyectos')}>
          Proyectos
        </Button>
        <ChevronRight className="h-4 w-4" />
        <Button variant="ghost" size="sm" onClick={() => router.push(`/proyectos/${proyectoId}`)}>
          {proyecto.nombre}
        </Button>
        <ChevronRight className="h-4 w-4" />
        <Button variant="ghost" size="sm" onClick={() => router.push(`/proyectos/${proyectoId}/equipos`)}>
          Equipos
        </Button>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">Pedidos</span>
      </nav>

      {/* Header Section */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6"
      >
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="h-8 w-8 text-blue-600" />
            Pedidos de Equipos
          </h1>
          <div className="flex items-center gap-4 mt-2">
            <Badge variant={getStatusVariant(proyecto.estado || '')}>
              {proyecto.estado || 'Sin estado'}
            </Badge>
            <span className="text-sm text-gray-600 flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              Inicio: {formatDate(proyecto.fechaInicio)}
            </span>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={cargarDatos} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6"
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
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{pedidosPendientes}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completados</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{pedidosCompletados}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(montoTotal)}</div>
          </CardContent>
        </Card>
      </motion.div>

      <Separator />

      {/* Create New Order Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Crear Nuevo Pedido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <PedidoEquipoModalCrear
              listas={listas}
              proyectoId={proyectoId}
              responsableId={session?.user.id || ''}
              onCreated={handleCreatePedido}
              onRefresh={cargarListas}
            />
          </CardContent>
        </Card>
      </motion.div>

      {/* Orders Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-4"
      >
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <Package className="h-5 w-5" />
          Pedidos Realizados
        </h2>

        {pedidos.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-800 mb-2">No hay pedidos registrados</h3>
              <p className="text-gray-600 mb-4 text-center">
                Comienza creando tu primer pedido de equipos para este proyecto.
              </p>
            </CardContent>
          </Card>
        ) : (
          <motion.div
            className="space-y-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: { opacity: 0 },
              visible: {
                opacity: 1,
                transition: {
                  staggerChildren: 0.1
                }
              }
            }}
          >
            {pedidos.map((pedido, index) => (
              <motion.div
                key={pedido.id}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 }
                }}
                transition={{ delay: index * 0.1 }}
              >
                <PedidoEquipoAccordion
                  pedido={pedido}
                  responsableId={session?.user.id || ''}
                  onCreateItem={handleCreateItem}
                  onUpdateItem={handleUpdateItem}
                  onDeleteItem={handleDeleteItem}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  )
}
