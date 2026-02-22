/**
 * 🎯 Equipment Orders Page - Minimalist Version
 * Focuses on showing orders clearly
 */

'use client'

import { useEffect, useState, useMemo, memo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
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
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  ArrowLeft,
  Package,
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  Truck,
  Eye,
  Trash2,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ShoppingCart
} from 'lucide-react'
import Link from 'next/link'
import PedidoEquipoModalCrear from '@/components/equipos/PedidoEquipoModalCrear'

// Skeleton minimalista
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-5 w-32 ml-auto" />
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="border rounded-lg">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-3 border-b last:border-0">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    </div>
  )
}

// Componente de tabla de pedidos
const PedidosTable = memo(function PedidosTable({
  pedidos,
  proyectoId,
  onDelete,
  onRefresh,
  loading
}: {
  pedidos: PedidoEquipo[]
  proyectoId: string
  onDelete: (id: string) => void
  onRefresh: () => void
  loading: boolean
}) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [filterEstado, setFilterEstado] = useState('all')
  const [sortField, setSortField] = useState<string>('createdAt')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const filteredPedidos = useMemo(() => {
    let result = pedidos

    if (search) {
      const term = search.toLowerCase()
      result = result.filter(pedido =>
        pedido.codigo?.toLowerCase().includes(term) ||
        (pedido as any).proveedor?.toLowerCase().includes(term) ||
        (pedido as any).descripcion?.toLowerCase().includes(term)
      )
    }

    if (filterEstado !== 'all') {
      result = result.filter(pedido => pedido.estado === filterEstado)
    }

    return result
  }, [pedidos, search, filterEstado])

  const sortedPedidos = useMemo(() => {
    return [...filteredPedidos].sort((a, b) => {
      let aVal: any = a[sortField as keyof PedidoEquipo]
      let bVal: any = b[sortField as keyof PedidoEquipo]

      if (sortField === 'createdAt' || sortField === 'fechaEstimada') {
        aVal = aVal ? new Date(aVal).getTime() : 0
        bVal = bVal ? new Date(bVal).getTime() : 0
      }

      if (sortField === 'montoTotal') {
        aVal = a.items?.reduce((sum, item) => sum + (item.costoTotal || 0), 0) || 0
        bVal = b.items?.reduce((sum, item) => sum + (item.costoTotal || 0), 0) || 0
      }

      if (aVal == null || bVal == null) return 0
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredPedidos, sortField, sortDir])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />
    return sortDir === 'asc'
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />
  }

  const getEstadoBadge = (estado: string) => {
    const estados: Record<string, { icon: any; className: string; label: string }> = {
      pendiente: { icon: Clock, className: 'bg-yellow-100 text-yellow-700', label: 'Pendiente' },
      en_proceso: { icon: Truck, className: 'bg-blue-100 text-blue-700', label: 'En Proceso' },
      parcial: { icon: AlertCircle, className: 'bg-orange-100 text-orange-700', label: 'Parcial' },
      completado: { icon: CheckCircle2, className: 'bg-green-100 text-green-700', label: 'Completado' },
      cancelado: { icon: AlertCircle, className: 'bg-red-100 text-red-700', label: 'Cancelado' }
    }

    const config = estados[estado?.toLowerCase()] || estados.pendiente
    const Icon = config.icon

    return (
      <Badge className={`${config.className} text-xs font-normal`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short' })
  }

  const formatCurrency = (amount: number) => {
    return `$${amount.toLocaleString('es-PE', { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="space-y-3">
      {/* Filtros compactos */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar pedido..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-9 text-sm"
          />
        </div>

        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-36 h-9 text-sm">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="en_proceso">En Proceso</SelectItem>
            <SelectItem value="parcial">Parcial</SelectItem>
            <SelectItem value="completado">Completado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>

        <Button
          variant="ghost"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="h-9"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>

        <span className="text-xs text-muted-foreground ml-auto">
          {sortedPedidos.length} de {pedidos.length} pedidos
        </span>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50 hover:bg-muted/50">
              <TableHead className="w-[120px]">
                <button
                  onClick={() => handleSort('codigo')}
                  className="flex items-center text-xs font-medium"
                >
                  Código<SortIcon field="codigo" />
                </button>
              </TableHead>
              <TableHead>
                <button
                  onClick={() => handleSort('proveedor')}
                  className="flex items-center text-xs font-medium"
                >
                  Proveedor<SortIcon field="proveedor" />
                </button>
              </TableHead>
              <TableHead className="w-[70px] text-right text-xs font-medium">Items</TableHead>
              <TableHead className="w-[100px] text-right">
                <button
                  onClick={() => handleSort('montoTotal')}
                  className="flex items-center justify-end w-full text-xs font-medium"
                >
                  Monto<SortIcon field="montoTotal" />
                </button>
              </TableHead>
              <TableHead className="w-[90px]">
                <button
                  onClick={() => handleSort('createdAt')}
                  className="flex items-center text-xs font-medium"
                >
                  Fecha<SortIcon field="createdAt" />
                </button>
              </TableHead>
              <TableHead className="w-[100px] text-xs font-medium">Estado</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedPedidos.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-sm">
                  {search || filterEstado !== 'all' ? 'No se encontraron pedidos' : 'Sin pedidos registrados'}
                </TableCell>
              </TableRow>
            ) : (
              sortedPedidos.map((pedido) => {
                const montoTotal = pedido.items?.reduce((sum, item) => sum + (item.costoTotal || 0), 0) || 0
                const totalItems = pedido.items?.length || 0

                // Compute proveedor label from items
                const proveedorNames = new Set(
                  pedido.items?.map(i =>
                    (i as any).proveedorNombre || (i as any).listaEquipoItem?.proveedor?.nombre
                  ).filter(Boolean) || []
                )
                const proveedorLabel = proveedorNames.size === 0
                  ? ((pedido as any).esUrgente ? 'Sin asignar' : 'Sin proveedor')
                  : proveedorNames.size === 1
                    ? [...proveedorNames][0]
                    : 'Varios'

                return (
                  <TableRow
                    key={pedido.id}
                    className="group cursor-pointer hover:bg-muted/50"
                    onClick={() => router.push(`/proyectos/${proyectoId}/equipos/pedidos/${pedido.id}`)}
                  >
                    <TableCell className="font-mono text-xs text-muted-foreground py-2">
                      <div className="flex items-center gap-1.5">
                        {pedido.codigo || '-'}
                        {(pedido as any).esUrgente && (
                          <Badge variant="destructive" className="text-[9px] h-4 px-1">URGENTE</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="py-2">
                      <div>
                        <span className={`text-sm font-medium line-clamp-1 ${proveedorNames.size === 0 ? 'text-muted-foreground' : ''}`}>{proveedorLabel}</span>
                        {(pedido as any).descripcion && (
                          <span className="text-xs text-muted-foreground line-clamp-1 block">
                            {(pedido as any).descripcion}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm py-2">
                      {totalItems}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-medium py-2">
                      {formatCurrency(montoTotal)}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground py-2">
                      {formatDate((pedido as any).createdAt)}
                    </TableCell>
                    <TableCell className="py-2">
                      {getEstadoBadge(pedido.estado || 'pendiente')}
                    </TableCell>
                    <TableCell className="py-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => router.push(`/proyectos/${proyectoId}/equipos/pedidos/${pedido.id}`)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => onDelete(pedido.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
})

export default function PedidosProyectoPage() {
  const { id: proyectoId } = useParams<{ id: string }>()
  const { data: session } = useSession()
  const router = useRouter()

  const [pedidos, setPedidos] = useState<PedidoEquipo[]>([])
  const [listas, setListas] = useState<ListaEquipo[]>([])
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [loading, setLoading] = useState(true)

  const cargarDatos = async () => {
    try {
      setLoading(true)
      const [proyectoData, pedidosData, listasData] = await Promise.all([
        getProyectoById(proyectoId),
        getPedidoEquipos(proyectoId),
        getListaEquiposPorProyecto(proyectoId)
      ])
      setProyecto(proyectoData)
      setPedidos(pedidosData || [])
      setListas(listasData || [])
    } catch (err) {
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
    if (proyectoId) cargarDatos()
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

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este pedido?')) return
    const ok = await deletePedidoEquipo(id)
    if (ok) {
      toast.success('Pedido eliminado')
      cargarPedidos()
    } else {
      toast.error('Error al eliminar pedido')
    }
  }

  if (loading && !proyecto) return <LoadingSkeleton />

  if (!proyecto) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Proyecto no encontrado</h3>
        <Button variant="outline" onClick={() => router.push('/proyectos')}>
          Volver a Proyectos
        </Button>
      </div>
    )
  }

  // Stats calculados
  const totalPedidos = pedidos.length
  const pedidosCompletados = pedidos.filter(p => p.estado?.toLowerCase() === 'completado').length
  const totalItems = pedidos.reduce((total, p) => total + (p.items?.length || 0), 0)
  const montoTotal = pedidos.reduce((total, p) => {
    return total + (p.items?.reduce((sum, item) => sum + (item.costoTotal || 0), 0) || 0)
  }, 0)

  return (
    <div className="space-y-4">
      {/* Header compacto */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {/* Navegación mínima */}
          <Link
            href={`/proyectos/${proyectoId}/equipos`}
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Equipos
          </Link>

          {/* Título con icono */}
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-blue-600" />
            <h1 className="text-lg font-semibold">Pedidos de Equipos</h1>
          </div>

          {/* Stats inline */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>{totalPedidos} pedidos</span>
            <span className="text-green-600">{pedidosCompletados} completados</span>
            <span>{totalItems} items</span>
            <span className="font-mono">${montoTotal.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</span>
          </div>
        </div>

        {/* Acción principal */}
        <PedidoEquipoModalCrear
          listas={listas}
          proyectoId={proyectoId}
          responsableId={session?.user.id || ''}
          onCreated={handleCreatePedido}
          onRefresh={cargarListas}
        />
      </div>

      {/* Tabla de pedidos - El foco principal */}
      <PedidosTable
        pedidos={pedidos}
        proyectoId={proyectoId}
        onDelete={handleDelete}
        onRefresh={cargarDatos}
        loading={loading}
      />
    </div>
  )
}
