/**
 * 📦 Pedidos - Logística
 * Diseño minimalista y compacto
 * @author GYS Team
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RefreshCw, Truck, Package, Search, Filter, X, CheckCircle, AlertTriangle, Clock, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getAllPedidoEquipos, deletePedidoEquipo } from '@/lib/services/pedidoEquipo'
import LogisticaPedidosTable from '@/components/logistica/LogisticaPedidosTable'
import type { PedidoEquipo } from '@/types'

const ESTADOS_PEDIDO = [
  { value: 'all', label: 'Todos' },
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'atendido', label: 'Atendido' },
  { value: 'parcial', label: 'Parcial' },
  { value: 'entregado', label: 'Entregado' },
  { value: 'cancelado', label: 'Cancelado' },
]

export default function LogisticaPedidosPage() {
  const router = useRouter()
  const [pedidos, setPedidos] = useState<PedidoEquipo[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState<string>('all')
  const [proyectoId, setProyectoId] = useState<string>('all')
  const fetchData = async () => {
    try {
      setRefreshing(true)
      const data = await getAllPedidoEquipos()
      setPedidos(data || [])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Error al cargar pedidos')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Unique projects for filter
  const proyectosUnicos = Array.from(
    new Map(pedidos.filter(p => p.proyecto).map(p => [p.proyecto!.id, p.proyecto!])).values()
  )

  // Filter pedidos
  const pedidosFiltrados = pedidos.filter((pedido) => {
    if (search) {
      const s = search.toLowerCase()
      const match =
        pedido.codigo?.toLowerCase().includes(s) ||
        pedido.responsable?.name?.toLowerCase().includes(s) ||
        pedido.proyecto?.nombre?.toLowerCase().includes(s) ||
        pedido.observacion?.toLowerCase().includes(s)
      if (!match) return false
    }
    if (estado !== 'all' && pedido.estado !== estado) return false
    if (proyectoId !== 'all' && pedido.proyectoId !== proyectoId) return false
    return true
  })

  // Stats
  const stats = {
    total: pedidos.length,
    items: pedidos.reduce((sum, p) => sum + (p.items?.length || 0), 0),
    enProgreso: pedidos.filter(p => ['enviado', 'atendido', 'parcial'].includes(p.estado || '')).length,
    entregados: pedidos.filter(p => p.estado === 'entregado').length,
    retrasados: pedidos.filter(p => {
      if (!p.fechaNecesaria) return false
      return new Date(p.fechaNecesaria) < new Date() && p.estado !== 'entregado'
    }).length,
  }

  const hasFilters = search || estado !== 'all' || proyectoId !== 'all'

  const clearFilters = () => {
    setSearch('')
    setEstado('all')
    setProyectoId('all')
  }

  const handleDelete = async (id: string) => {
    const deleted = await deletePedidoEquipo(id)
    if (deleted) {
      toast.success('Pedido eliminado')
      fetchData()
    } else {
      toast.error('Error al eliminar pedido')
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-5 gap-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header sticky */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-green-100 flex items-center justify-center">
                <Truck className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h1 className="text-base font-semibold">Pedidos de Equipos</h1>
                <p className="text-[10px] text-muted-foreground">Control logístico y entregas</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchData}
                disabled={refreshing}
                className="h-7 text-xs"
              >
                <RefreshCw className={`h-3 w-3 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stats compactos */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Pedidos</span>
              <Package className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <p className="text-xl font-bold mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Items</span>
              <Package className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <p className="text-xl font-bold mt-1">{stats.items}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">En Progreso</span>
              <Clock className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <p className="text-xl font-bold mt-1 text-amber-600">{stats.enProgreso}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Entregados</span>
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            </div>
            <p className="text-xl font-bold mt-1 text-green-600">{stats.entregados}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Retrasados</span>
              <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
            </div>
            <p className="text-xl font-bold mt-1 text-red-600">{stats.retrasados}</p>
          </div>
        </div>

        {/* Filtros en línea */}
        <div className="bg-white rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Buscar por código, responsable..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <Select value={proyectoId} onValueChange={setProyectoId}>
              <SelectTrigger className="h-8 w-[180px] text-xs">
                <Building2 className="h-3 w-3 mr-1.5 text-gray-400" />
                <SelectValue placeholder="Proyecto" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos los proyectos</SelectItem>
                {proyectosUnicos.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-xs">
                    {p.codigo || p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={estado} onValueChange={setEstado}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <Filter className="h-3 w-3 mr-1.5 text-gray-400" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {ESTADOS_PEDIDO.map((e) => (
                  <SelectItem key={e.value} value={e.value} className="text-xs">
                    {e.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-red-600">
                <X className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            )}

            <div className="ml-auto text-xs text-muted-foreground">
              {pedidosFiltrados.length} de {pedidos.length}
            </div>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-lg border overflow-hidden">
          <LogisticaPedidosTable
            pedidos={pedidosFiltrados}
            onRefresh={fetchData}
            onDelete={handleDelete}
          />
        </div>
      </div>

    </div>
  )
}
