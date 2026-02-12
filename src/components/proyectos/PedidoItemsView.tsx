'use client'

import { useState, useEffect, useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { toast } from 'sonner'
import {
  Search,
  Loader2,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  DollarSign,
  Building2,
  Eye,
  Calendar,
  Package,
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

const estadoItemColors: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-700',
  atendido: 'bg-green-50 text-green-700',
  parcial: 'bg-yellow-50 text-yellow-700',
  entregado: 'bg-emerald-50 text-emerald-700',
  cancelado: 'bg-red-50 text-red-700',
}

const estadoItemLabels: Record<string, string> = {
  pendiente: 'Pendiente',
  atendido: 'Atendido',
  parcial: 'Parcial',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
}

const estadoPedidoColors: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  enviado: 'bg-indigo-50 text-indigo-700',
  confirmado: 'bg-blue-50 text-blue-700',
  parcial: 'bg-yellow-50 text-yellow-700',
  en_transito: 'bg-purple-50 text-purple-700',
  entregado: 'bg-green-50 text-green-700',
  atendido: 'bg-emerald-50 text-emerald-700',
  cancelado: 'bg-red-50 text-red-700',
  retrasado: 'bg-orange-50 text-orange-700',
}

const estadoPedidoLabels: Record<string, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  confirmado: 'Confirmado',
  parcial: 'Parcial',
  en_transito: 'En Transito',
  entregado: 'Entregado',
  atendido: 'Atendido',
  cancelado: 'Cancelado',
  retrasado: 'Retrasado',
}

interface PedidoItem {
  id: string
  pedidoId: string
  codigo: string
  descripcion: string
  unidad: string
  cantidadPedida: number
  cantidadAtendida?: number | null
  precioUnitario?: number | null
  costoTotal?: number | null
  estado: string
  tiempoEntrega?: string | null
  tiempoEntregaDias?: number | null
  proveedorNombre?: string | null
  createdAt?: string
  pedidoEquipo?: {
    id: string
    codigo: string
    estado: string
    fechaPedido?: string
    fechaEntregaEstimada?: string
    proyectoId: string
    proyecto?: {
      id: string
      codigo: string
      nombre: string
    }
    user?: {
      id: string
      name: string
    }
  }
  listaEquipoItem?: {
    proveedor?: {
      id: string
      nombre: string
    } | null
  } | null
}

interface PedidoGroup {
  pedidoId: string
  pedidoCodigo: string
  pedidoEstado: string
  fechaPedido?: string
  fechaEntrega?: string
  proyectoId: string
  proyectoNombre: string
  proyectoCodigo: string
  items: PedidoItem[]
  montoTotal: number
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(amount)
}

export function PedidoItemsView() {
  const [items, setItems] = useState<PedidoItem[]>([])
  const [proyectos, setProyectos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProyecto, setSelectedProyecto] = useState('todos')
  const [selectedEstado, setSelectedEstado] = useState('todos')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      try {
        const [itemsRes, proyectosRes] = await Promise.all([
          fetch('/api/pedido-equipo-item', { cache: 'no-store' }),
          fetch('/api/proyecto', { cache: 'no-store' }),
        ])
        if (itemsRes.ok) setItems(await itemsRes.json())
        if (proyectosRes.ok) setProyectos(await proyectosRes.json())
      } catch {
        toast.error('Error al cargar los datos')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [])

  // Refetch when project filter changes
  useEffect(() => {
    if (loading) return
    const loadItems = async () => {
      try {
        const params = new URLSearchParams()
        if (selectedProyecto !== 'todos') params.set('proyectoId', selectedProyecto)
        const res = await fetch(`/api/pedido-equipo-item?${params}`, { cache: 'no-store' })
        if (res.ok) setItems(await res.json())
      } catch {
        toast.error('Error al filtrar items')
      }
    }
    loadItems()
  }, [selectedProyecto]) // eslint-disable-line react-hooks/exhaustive-deps

  const filteredItems = useMemo(() => {
    let result = items

    if (selectedEstado !== 'todos') {
      result = result.filter(item => item.estado === selectedEstado)
    }

    if (searchTerm) {
      const search = searchTerm.toLowerCase()
      result = result.filter(item =>
        item.codigo?.toLowerCase().includes(search) ||
        item.descripcion?.toLowerCase().includes(search) ||
        item.proveedorNombre?.toLowerCase().includes(search)
      )
    }

    return result
  }, [items, selectedEstado, searchTerm])

  const groups = useMemo(() => {
    const groupMap = new Map<string, PedidoGroup>()

    for (const item of filteredItems) {
      const pedido = item.pedidoEquipo
      if (!pedido) continue

      const key = pedido.id
      if (!groupMap.has(key)) {
        groupMap.set(key, {
          pedidoId: pedido.id,
          pedidoCodigo: pedido.codigo || 'Sin codigo',
          pedidoEstado: pedido.estado || 'borrador',
          fechaPedido: pedido.fechaPedido,
          fechaEntrega: pedido.fechaEntregaEstimada,
          proyectoId: pedido.proyectoId || '',
          proyectoNombre: pedido.proyecto?.nombre || '',
          proyectoCodigo: pedido.proyecto?.codigo || '',
          items: [],
          montoTotal: 0,
        })
      }

      const group = groupMap.get(key)!
      group.items.push(item)
      group.montoTotal += item.costoTotal || (item.cantidadPedida * (item.precioUnitario || 0))
    }

    return Array.from(groupMap.values()).sort((a, b) => a.pedidoCodigo.localeCompare(b.pedidoCodigo))
  }, [filteredItems])

  // Expand all groups by default
  useEffect(() => {
    if (groups.length > 0 && expandedGroups.size === 0) {
      setExpandedGroups(new Set(groups.map(g => g.pedidoId)))
    }
  }, [groups]) // eslint-disable-line react-hooks/exhaustive-deps

  const stats = useMemo(() => ({
    totalItems: filteredItems.length,
    montoTotal: filteredItems.reduce((sum, item) =>
      sum + (item.costoTotal || (item.cantidadPedida * (item.precioUnitario || 0))), 0),
    pendientes: filteredItems.filter(i => i.estado === 'pendiente').length,
    entregados: filteredItems.filter(i => i.estado === 'entregado' || i.estado === 'atendido').length,
    parciales: filteredItems.filter(i => i.estado === 'parcial').length,
    totalGroups: groups.length,
  }), [filteredItems, groups])

  const toggleGroup = (id: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (expandedGroups.size === groups.length) {
      setExpandedGroups(new Set())
    } else {
      setExpandedGroups(new Set(groups.map(g => g.pedidoId)))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Stats Bar */}
      <div className="flex items-center gap-3 flex-wrap">
        <Badge variant="outline" className="text-xs font-medium">
          {stats.totalItems} items
        </Badge>
        <Badge variant="outline" className="text-xs font-medium">
          {stats.totalGroups} pedidos
        </Badge>
        <div className="hidden md:flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 text-gray-600">
            <span className="font-medium">{stats.pendientes} pendientes</span>
          </div>
          <div className="flex items-center gap-1 text-green-600">
            <span className="font-medium">{stats.entregados} entregados</span>
          </div>
          {stats.parciales > 0 && (
            <div className="flex items-center gap-1 text-yellow-600">
              <span className="font-medium">{stats.parciales} parciales</span>
            </div>
          )}
          <div className="w-px h-4 bg-gray-200" />
          <div className="flex items-center gap-1 text-emerald-600">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="font-semibold">{formatCurrency(stats.montoTotal)}</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por codigo, descripcion, proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        <Select value={selectedProyecto} onValueChange={setSelectedProyecto}>
          <SelectTrigger className="w-full sm:w-48 h-9">
            <SelectValue placeholder="Todos los proyectos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los proyectos</SelectItem>
            {proyectos.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="font-medium">{p.codigo}</span>
                <span className="text-muted-foreground ml-1.5 text-xs">{p.nombre}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedEstado} onValueChange={setSelectedEstado}>
          <SelectTrigger className="w-full sm:w-40 h-9">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            {Object.entries(estadoItemLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="sm" className="h-9 text-xs" onClick={toggleAll}>
          {expandedGroups.size === groups.length ? 'Colapsar' : 'Expandir'} todo
        </Button>
      </div>

      {/* Groups */}
      {groups.length === 0 ? (
        <div className="text-center py-12">
          <ShoppingCart className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">No se encontraron items de pedidos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {groups.map((group) => (
            <Collapsible
              key={group.pedidoId}
              open={expandedGroups.has(group.pedidoId)}
              onOpenChange={() => toggleGroup(group.pedidoId)}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border cursor-pointer hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    {expandedGroups.has(group.pedidoId) ? (
                      <ChevronDown className="h-4 w-4 shrink-0 text-gray-500" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 text-gray-500" />
                    )}
                    <ShoppingCart className="h-4 w-4 shrink-0 text-blue-500" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-medium text-sm">{group.pedidoCodigo}</span>
                        <Badge variant="outline" className={cn('text-[10px] px-1.5', estadoPedidoColors[group.pedidoEstado])}>
                          {estadoPedidoLabels[group.pedidoEstado] || group.pedidoEstado}
                        </Badge>
                        {group.fechaPedido && (
                          <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(group.fechaPedido), 'dd MMM yy', { locale: es })}
                          </span>
                        )}
                      </div>
                      {group.proyectoNombre && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <Building2 className="h-3 w-3" />
                          <span>{group.proyectoCodigo} - {group.proyectoNombre}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs">
                    <span className="text-muted-foreground">{group.items.length} items</span>
                    <span className="font-semibold text-emerald-600">{formatCurrency(group.montoTotal)}</span>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" asChild onClick={(e) => e.stopPropagation()}>
                      <Link href={`/proyectos/${group.proyectoId}/equipos/pedidos/${group.pedidoId}`}>
                        <Eye className="h-3.5 w-3.5 text-gray-500" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="border rounded-b-lg border-t-0 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-white">
                        <TableHead className="text-xs font-medium">Codigo</TableHead>
                        <TableHead className="text-xs font-medium">Descripcion</TableHead>
                        <TableHead className="text-xs font-medium text-center w-20">Pedida</TableHead>
                        <TableHead className="text-xs font-medium text-center w-20">Atendida</TableHead>
                        <TableHead className="text-xs font-medium text-right hidden sm:table-cell w-24">P. Unit.</TableHead>
                        <TableHead className="text-xs font-medium text-right w-24">Costo</TableHead>
                        <TableHead className="text-xs font-medium text-center w-24">Estado</TableHead>
                        <TableHead className="text-xs font-medium hidden lg:table-cell">Proveedor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {group.items.map((item, idx) => {
                        const costo = item.costoTotal || (item.cantidadPedida * (item.precioUnitario || 0))
                        const proveedor = item.proveedorNombre || item.listaEquipoItem?.proveedor?.nombre || '-'
                        const progreso = item.cantidadAtendida && item.cantidadPedida
                          ? Math.round((item.cantidadAtendida / item.cantidadPedida) * 100)
                          : 0
                        return (
                          <TableRow key={item.id} className={cn(idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30')}>
                            <TableCell className="text-xs font-mono">{item.codigo}</TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate">{item.descripcion}</TableCell>
                            <TableCell className="text-xs text-center font-medium">{item.cantidadPedida}</TableCell>
                            <TableCell className="text-xs text-center">
                              <span className={cn('font-medium', progreso >= 100 ? 'text-green-600' : progreso > 0 ? 'text-yellow-600' : 'text-gray-400')}>
                                {item.cantidadAtendida ?? 0}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs text-right hidden sm:table-cell text-muted-foreground">
                              {item.precioUnitario ? formatCurrency(item.precioUnitario) : '-'}
                            </TableCell>
                            <TableCell className="text-xs text-right font-medium text-emerald-600">
                              {formatCurrency(costo)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline" className={cn('text-[10px] px-1.5', estadoItemColors[item.estado])}>
                                {estadoItemLabels[item.estado] || item.estado}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-xs hidden lg:table-cell text-muted-foreground truncate max-w-[120px]">
                              {proveedor}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CollapsibleContent>
            </Collapsible>
          ))}
        </div>
      )}
    </div>
  )
}
