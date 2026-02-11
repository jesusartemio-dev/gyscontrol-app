/**
 * Página de Pedidos de Equipo - Vista minimalista
 */

'use client'

import { useState, useMemo, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  ShoppingCart,
  Plus,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  Package,
  Search,
  Eye,
  TrendingUp,
  Calendar,
  ArrowLeft
} from 'lucide-react'

import PedidoEquipoGanttClient from '@/components/aprovisionamiento/PedidoEquipoGanttClient'
import { usePedidosEquipo } from '@/lib/services/aprovisionamientoQuery'
import type { EstadoPedido } from '@/types/modelos'

function PedidosEquipoContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { status } = useSession()

  const [busqueda, setBusqueda] = useState(searchParams.get('busqueda') || '')
  const [viewMode, setViewMode] = useState<'table' | 'gantt'>('table')

  // URL params
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '15')
  const proyecto = searchParams.get('proyecto') || ''
  const estado = searchParams.get('estado') || ''

  // Query
  const {
    data: pedidosResponse,
    isLoading: loading,
    isError
  } = usePedidosEquipo({
    proyectoId: proyecto || undefined,
    estado: estado ? [estado as EstadoPedido] : undefined,
    busqueda: busqueda || undefined,
    page,
    limit
  })

  // Transform data
  const pedidosData = useMemo(() => {
    if (!pedidosResponse?.data) {
      return { items: [], total: 0, pagination: { page: 1, limit: 15, total: 0, totalPages: 0 } }
    }
    return {
      items: pedidosResponse.data || [],
      total: pedidosResponse.meta?.total || 0,
      pagination: pedidosResponse.meta || { page: 1, limit: 15, total: 0, totalPages: 0 }
    }
  }, [pedidosResponse])

  // Stats
  const stats = useMemo(() => {
    const items = pedidosData.items || []
    const totalPedidos = pedidosData.pagination.total || items.length
    const pedidosEnviados = items.filter(p => p.estado === 'enviado').length
    const pedidosRecibidos = items.filter(p => p.estado === 'entregado').length
    const pedidosRetrasados = items.filter(p => {
      if (!p.fechaEntregaEstimada) return false
      return new Date(p.fechaEntregaEstimada) < new Date() && p.estado !== 'entregado'
    }).length

    const totalItems = items.reduce((sum, p) => sum + (p.items?.length || 0), 0)
    const itemsEntregados = items.reduce((sum, p) => {
      return sum + (p.items?.filter(item => (item.cantidadAtendida || 0) >= item.cantidadPedida).length || 0)
    }, 0)
    const progresoEntrega = totalItems > 0 ? Math.round((itemsEntregados / totalItems) * 100) : 0

    const montoTotal = items.reduce((sum, p) => {
      return sum + (p.items?.reduce((s, i) => s + (i.costoTotal || (i.cantidadPedida * (i.precioUnitario || 0))), 0) || 0)
    }, 0)

    return { totalPedidos, pedidosEnviados, pedidosRecibidos, pedidosRetrasados, progresoEntrega, montoTotal }
  }, [pedidosData])

  // Gantt data
  const ganttData = useMemo(() => {
    return pedidosData.items.map(pedido => {
      const itemsEntregados = pedido.items?.filter(i => i.estado === 'entregado').length || 0
      const totalItems = pedido.items?.length || 0
      const progreso = totalItems > 0 ? Math.round((itemsEntregados / totalItems) * 100) : 0

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
        proveedor: pedido.items?.[0]?.listaEquipoItem?.proveedor,
        monto: pedido.items?.reduce((s, i) => s + (i.costoTotal || 0), 0) || 0,
        items: pedido.items?.map(i => ({
          id: i.id,
          cantidad: i.cantidadPedida,
          cantidadRecibida: i.cantidadAtendida || 0,
          precioUnitario: i.precioUnitario,
          subtotal: i.costoTotal || 0
        })) || []
      }
    })
  }, [pedidosData])

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')
    if (busqueda) params.set('busqueda', busqueda)
    else params.delete('busqueda')
    router.push(`/finanzas/aprovisionamiento/pedidos?${params.toString()}`)
  }

  const handleEstadoChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')
    if (value && value !== 'todos') params.set('estado', value)
    else params.delete('estado')
    router.push(`/finanzas/aprovisionamiento/pedidos?${params.toString()}`)
  }

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case 'borrador':
        return <Badge className="bg-gray-100 text-gray-700 text-[10px] h-5">Borrador</Badge>
      case 'enviado':
        return <Badge className="bg-blue-100 text-blue-700 text-[10px] h-5">Enviado</Badge>
      case 'atendido':
        return <Badge className="bg-indigo-100 text-indigo-700 text-[10px] h-5">Atendido</Badge>
      case 'parcial':
        return <Badge className="bg-purple-100 text-purple-700 text-[10px] h-5">Parcial</Badge>
      case 'entregado':
        return <Badge className="bg-green-100 text-green-700 text-[10px] h-5">Entregado</Badge>
      case 'cancelado':
        return <Badge className="bg-red-100 text-red-700 text-[10px] h-5">Cancelado</Badge>
      default:
        return <Badge variant="secondary" className="text-[10px] h-5">{estado}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-white">
          <AlertTriangle className="h-10 w-10 text-red-300 mb-3" />
          <p className="text-sm text-muted-foreground">Error al cargar pedidos</p>
          <Button variant="outline" size="sm" className="mt-3 h-7 text-xs" onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
            <Link href="/finanzas/aprovisionamiento">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Dashboard
            </Link>
          </Button>
          <Package className="h-5 w-5 text-emerald-600" />
          <h1 className="text-lg font-semibold">Pedidos de Equipo</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">Total</span>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-lg font-bold">{stats.totalPedidos}</p>
        </div>

        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">Progreso</span>
            <TrendingUp className="h-4 w-4 text-indigo-500" />
          </div>
          <p className="text-lg font-bold text-indigo-600">{stats.progresoEntrega}%</p>
        </div>

        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">Enviados</span>
            <Clock className="h-4 w-4 text-blue-500" />
          </div>
          <p className="text-lg font-bold text-blue-600">{stats.pedidosEnviados}</p>
        </div>

        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">Entregados</span>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </div>
          <p className="text-lg font-bold text-green-600">{stats.pedidosRecibidos}</p>
        </div>

        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">Retrasados</span>
            <AlertTriangle className="h-4 w-4 text-red-500" />
          </div>
          <p className="text-lg font-bold text-red-600">{stats.pedidosRetrasados}</p>
        </div>

        <div className="bg-white border rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] text-muted-foreground font-medium">Monto</span>
            <DollarSign className="h-4 w-4 text-emerald-500" />
          </div>
          <p className="text-base font-bold">
            ${stats.montoTotal.toLocaleString('en-US', { minimumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Filtros + Toggle Vista */}
      <div className="flex items-center justify-between gap-2 bg-white border rounded-lg p-2">
        <div className="flex items-center gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar pedido..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="h-7 pl-7 text-xs"
            />
          </div>
          <Select value={estado || 'todos'} onValueChange={handleEstadoChange}>
            <SelectTrigger className="h-7 w-32 text-xs">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              <SelectItem value="borrador">Borrador</SelectItem>
              <SelectItem value="enviado">Enviado</SelectItem>
              <SelectItem value="atendido">Atendido</SelectItem>
              <SelectItem value="parcial">Parcial</SelectItem>
              <SelectItem value="entregado">Entregado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleSearch}>
            Filtrar
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === 'table' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => setViewMode('table')}
          >
            <ShoppingCart className="h-3 w-3 mr-1" />
            Tabla
          </Button>
          <Button
            variant={viewMode === 'gantt' ? 'default' : 'ghost'}
            size="sm"
            className="h-7 text-xs px-2"
            onClick={() => setViewMode('gantt')}
          >
            <Calendar className="h-3 w-3 mr-1" />
            Gantt
          </Button>
        </div>
      </div>

      {/* Content */}
      {viewMode === 'table' ? (
        pedidosData.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border rounded-lg bg-white">
            <Package className="h-10 w-10 text-gray-300 mb-3" />
            <p className="text-sm text-muted-foreground">No hay pedidos</p>
          </div>
        ) : (
          <div className="border rounded-lg bg-white overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium">Pedido</TableHead>
                  <TableHead className="text-xs font-medium">Proyecto</TableHead>
                  <TableHead className="text-xs font-medium">Proveedor</TableHead>
                  <TableHead className="text-xs font-medium w-20">Estado</TableHead>
                  <TableHead className="text-xs font-medium text-center w-16">Items</TableHead>
                  <TableHead className="text-xs font-medium text-right">Monto</TableHead>
                  <TableHead className="text-xs font-medium w-24">F. Entrega</TableHead>
                  <TableHead className="text-xs font-medium w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pedidosData.items.map((pedido: any) => {
                  const montoPedido = (pedido.items || []).reduce((s: number, i: any) =>
                    s + (i.costoTotal || (i.cantidadPedida * (i.precioUnitario || 0))), 0
                  )
                  const proveedor = pedido.items?.[0]?.listaEquipoItem?.proveedor

                  return (
                    <TableRow key={pedido.id} className="hover:bg-gray-50/50">
                      <TableCell className="py-2">
                        <div>
                          <p className="text-xs font-medium">
                            {pedido.codigo || `PED-${String(pedido.numeroSecuencia).padStart(3, '0')}`}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(pedido.fechaPedido).toLocaleDateString('es-PE')}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-xs truncate max-w-[120px] block" title={pedido.proyecto?.nombre}>
                          {pedido.proyecto?.nombre || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-xs truncate max-w-[120px] block" title={proveedor?.nombre}>
                          {proveedor?.nombre || '-'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">{getEstadoBadge(pedido.estado)}</TableCell>
                      <TableCell className="py-2 text-center">
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                          {pedido.items?.length || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <span className="text-xs font-medium">
                          ${montoPedido.toLocaleString('en-US', { minimumFractionDigits: 0 })}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-[10px] text-muted-foreground">
                          {pedido.fechaEntregaEstimada
                            ? new Date(pedido.fechaEntregaEstimada).toLocaleDateString('es-PE')
                            : '-'}
                        </span>
                      </TableCell>
                      <TableCell className="py-2">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                          <Link href={`/finanzas/aprovisionamiento/pedidos/${pedido.id}`}>
                            <Eye className="h-3.5 w-3.5 text-blue-600" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>

            {pedidosData.pagination && (
              <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
                <span>
                  {((pedidosData.pagination.page - 1) * pedidosData.pagination.limit) + 1}-
                  {Math.min(pedidosData.pagination.page * pedidosData.pagination.limit, pedidosData.pagination.total)} de {pedidosData.pagination.total}
                </span>
                <span>Página {pedidosData.pagination.page} de {pedidosData.pagination.totalPages || 1}</span>
              </div>
            )}
          </div>
        )
      ) : (
        <div className="border rounded-lg bg-white overflow-hidden min-h-[400px]">
          <PedidoEquipoGanttClient
            data={ganttData}
            showCoherenceIndicators={true}
          />
        </div>
      )}
    </div>
  )
}

export default function PedidosEquipoPage() {
  return (
    <Suspense fallback={
      <div className="p-4 space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-7 w-24" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    }>
      <PedidosEquipoContent />
    </Suspense>
  )
}
