'use client'

import { useEffect, useState, useMemo } from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProyectoById } from '@/lib/services/proyecto'
import { getProyectoEquipoById } from '@/lib/services/proyectoEquipo'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowUpCircle,
  Package,
  Search,
  List,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  Filter,
  MoreHorizontal,
  Undo2,
  Link2,
  Loader2,
  Layers,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import type { Proyecto, ProyectoEquipoCotizado, ProyectoEquipoCotizadoItem, ListaEquipo, ListaEquipoItem, EstadoEquipoItem } from '@prisma/client'
import CrearListaMultipleModal from '@/components/proyectos/equipos/CrearListaMultipleModal'

type ListaInfo = Pick<ListaEquipo, 'id' | 'codigo' | 'nombre'>

type DesgloseInfo = {
  id: string
  listaEquipo: ListaInfo
}

type DesgloseLinea = {
  id: string
  listaId: string
  codigo: string
  descripcion: string
  cantidad: number
  unidad: string
  listaEquipo?: ListaInfo | null
}

type ItemDisponibleDesglose = {
  id: string
  codigo: string
  descripcion: string
  cantidad: number
  unidad: string
  origen: string
  estado: string
  asociadoAEsteDesglose: boolean
  bloqueadoPorOtroDesglose: { cotizadoItemId: string; codigo: string | null; descripcion: string | null } | null
}

type ItemsDisponiblesPorLista = {
  listaId: string
  lista: ListaInfo | null
  items: ItemDisponibleDesglose[]
}

type ItemWithLista = ProyectoEquipoCotizadoItem & {
  listaEquipo?: ListaInfo | null
  listaEquipoSeleccionado?: (Pick<ListaEquipoItem, 'id' | 'cantidad'> & {
    listaEquipo?: ListaInfo | null
  }) | null
  desgloses?: DesgloseInfo[]
  listaEquipoItemsDesglose?: DesgloseLinea[]
}

type ProyectoEquipoCotizadoWithItems = Omit<ProyectoEquipoCotizado, 'proyecto' | 'responsable'> & {
  items: ItemWithLista[]
}

interface PageProps {
  params: Promise<{
    id: string
    equipoId: string
  }>
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="h-4 w-16" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-5 w-5" />
        <Skeleton className="h-6 w-48" />
      </div>
      <div className="flex items-center gap-4">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-28" />
      </div>
      <Skeleton className="h-8 w-64" />
      <div className="border rounded-lg">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-4 p-2 border-b last:border-0">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 flex-1" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </div>
  )
}

function ItemsTable({ items, proyectoId, onEstadoChange, onVincular, onDesglosar, onRevertirDesglose, onDesvincular }: { items: ItemWithLista[], proyectoId: string, onEstadoChange: (itemId: string, estado: string) => Promise<void>, onVincular: (item: ItemWithLista) => void, onDesglosar: (item: ItemWithLista) => void, onRevertirDesglose: (itemId: string) => Promise<void>, onDesvincular: (itemId: string) => Promise<void> }) {
  const [search, setSearch] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('__todas__')
  const [sortField, setSortField] = useState<string>('codigo')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  const categoriasUnicas = useMemo(() =>
    [...new Set(items.map(i => i.categoria || 'SIN-CATEGORIA'))].sort()
  , [items])

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // Filtro por categoría
      if (categoriaFiltro !== '__todas__') {
        const cat = item.categoria || 'SIN-CATEGORIA'
        if (cat !== categoriaFiltro) return false
      }
      // Filtro por búsqueda de texto
      if (!search) return true
      const term = search.toLowerCase()
      return (
        item.codigo.toLowerCase().includes(term) ||
        item.descripcion.toLowerCase().includes(term) ||
        item.marca?.toLowerCase().includes(term) ||
        item.categoria?.toLowerCase().includes(term)
      )
    })
  }, [items, search, categoriaFiltro])

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      const aVal = a[sortField as keyof ItemWithLista]
      const bVal = b[sortField as keyof ItemWithLista]
      if (aVal == null || bVal == null) return 0
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filteredItems, sortField, sortDir])

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ArrowUpDown className="h-2.5 w-2.5 ml-0.5 opacity-40" />
    return sortDir === 'asc'
      ? <ArrowUp className="h-2.5 w-2.5 ml-0.5" />
      : <ArrowDown className="h-2.5 w-2.5 ml-0.5" />
  }

  const getStatusBadge = (item: ItemWithLista) => {
    if (item.listaId || item.estado === 'en_lista') {
      const sel = item.listaEquipoSeleccionado
      const esParcial = sel && sel.cantidad < item.cantidad
      const esExcede = sel && sel.cantidad > item.cantidad
      return (
        <span className={cn(
          'inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded',
          esParcial ? 'text-amber-700 bg-amber-100'
            : esExcede ? 'text-orange-700 bg-orange-100'
            : 'text-green-700 bg-green-100'
        )}>
          {esParcial ? <AlertTriangle className="h-2.5 w-2.5" />
            : esExcede ? <ArrowUpCircle className="h-2.5 w-2.5" />
            : <CheckCircle2 className="h-2.5 w-2.5" />}
          {esParcial ? 'Parcial' : esExcede ? 'Excede' : 'En Lista'}
        </span>
      )
    }
    if (item.estado === 'reemplazado') {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-blue-700 bg-blue-100 px-1.5 py-0.5 rounded">
          <RefreshCw className="h-2.5 w-2.5" />Reempl.
        </span>
      )
    }
    if (item.estado === 'desglosado') {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">
          <Layers className="h-2.5 w-2.5" />Desglosado
        </span>
      )
    }
    if (item.estado === 'descartado') {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-red-700 bg-red-100 px-1.5 py-0.5 rounded">
          <XCircle className="h-2.5 w-2.5" />Descartado
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-0.5 text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">
        <Clock className="h-2.5 w-2.5" />Pendiente
      </span>
    )
  }

  const totalFiltered = sortedItems.reduce((sum, item) => sum + (item.cantidad * (item.precioCliente || 0)), 0)

  return (
    <div className="space-y-2">
      {/* Filters - only show if more than 3 items */}
      {items.length > 3 && (
        <div className="flex items-center gap-2">
          <div className="relative max-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            <Input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-7 h-7 text-xs"
            />
          </div>
          {categoriasUnicas.length > 1 && (
            <Select value={categoriaFiltro} onValueChange={setCategoriaFiltro}>
              <SelectTrigger className="h-7 text-xs w-[200px]">
                <Filter className="h-3 w-3 mr-1 text-gray-400" />
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__todas__">Todas las categorías ({items.length})</SelectItem>
                {categoriasUnicas.map(cat => {
                  const count = items.filter(i => (i.categoria || 'SIN-CATEGORIA') === cat).length
                  return (
                    <SelectItem key={cat} value={cat}>
                      {cat} ({count})
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          )}
          <span className="text-[10px] text-muted-foreground ml-auto">
            {sortedItems.length} de {items.length}
          </span>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b">
                <th className="px-2 py-1.5 text-left font-semibold text-gray-700 w-24">
                  <button onClick={() => handleSort('codigo')} className="flex items-center">
                    Código<SortIcon field="codigo" />
                  </button>
                </th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-700">
                  <button onClick={() => handleSort('descripcion')} className="flex items-center">
                    Descripción<SortIcon field="descripcion" />
                  </button>
                </th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-700 w-28">
                  <button onClick={() => handleSort('marca')} className="flex items-center">
                    Marca<SortIcon field="marca" />
                  </button>
                </th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-12">Und</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-14">
                  <button onClick={() => handleSort('cantidad')} className="flex items-center justify-center w-full">
                    Cant<SortIcon field="cantidad" />
                  </button>
                </th>
                <th className="px-2 py-1.5 text-right font-semibold text-gray-700 w-20">
                  <button onClick={() => handleSort('precioCliente')} className="flex items-center justify-end w-full">
                    P.Unit<SortIcon field="precioCliente" />
                  </button>
                </th>
                <th className="px-2 py-1.5 text-right font-semibold text-gray-700 w-24">Subtotal</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-20">Estado</th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-700 w-36">En Lista</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-8 text-muted-foreground">
                    {search || categoriaFiltro !== '__todas__' ? 'No se encontraron items con los filtros aplicados' : 'Sin items'}
                  </td>
                </tr>
              ) : (
                sortedItems.map((item, idx) => (
                  <tr
                    key={item.id}
                    className={cn(
                      'hover:bg-orange-50/50 transition-colors',
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    )}
                  >
                    <td className="px-2 py-1.5">
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-gray-600">{item.codigo}</span>
                        {!item.catalogoEquipoId && (
                          <span className="px-1 py-0.5 text-[8px] font-medium bg-amber-100 text-amber-700 rounded" title="No vinculado al catálogo de equipos">
                            Temp
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="line-clamp-2 text-[11px] leading-snug text-gray-700" title={item.descripcion}>{item.descripcion}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="line-clamp-1 text-gray-600" title={item.marca || ''}>
                        {item.marca || '-'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-center text-gray-500">{item.unidad}</td>
                    <td className="px-2 py-1.5 text-center font-medium">{item.cantidad}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-500">
                      {formatCurrency(item.precioCliente || 0)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-medium text-green-600">
                      {formatCurrency(item.cantidad * (item.precioCliente || 0))}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {getStatusBadge(item)}
                    </td>
                    <td className="px-2 py-1.5">
                      {(() => {
                        // Desglosado: show multiple listas with count of associated items
                        if (item.estado === 'desglosado' && item.desgloses && item.desgloses.length > 0) {
                          const lineasPorLista: Record<string, number> = {}
                          for (const linea of item.listaEquipoItemsDesglose || []) {
                            lineasPorLista[linea.listaId] = (lineasPorLista[linea.listaId] || 0) + 1
                          }
                          return (
                            <div className="flex flex-wrap gap-x-1.5 gap-y-0.5">
                              {item.desgloses.map((d) => {
                                const count = lineasPorLista[d.listaEquipo.id] || 0
                                return (
                                  <Link
                                    key={d.id}
                                    href={`/proyectos/${proyectoId}/listas/${d.listaEquipo.id}`}
                                    className="text-[10px] font-mono text-purple-600 hover:underline inline-flex items-center gap-0.5"
                                    title={`${d.listaEquipo.nombre}${count > 0 ? ` — ${count} ítem${count !== 1 ? 's' : ''} asociado${count !== 1 ? 's' : ''}` : ' — sin ítems asociados'}`}
                                  >
                                    <span>{d.listaEquipo.codigo}</span>
                                    <span className={cn(
                                      'text-[9px] px-1 py-0 rounded font-medium',
                                      count === 0
                                        ? 'bg-amber-100 text-amber-700'
                                        : 'bg-purple-100 text-purple-700'
                                    )}>
                                      {count}
                                    </span>
                                  </Link>
                                )
                              })}
                            </div>
                          )
                        }
                        // Normal: single lista
                        const lista = item.listaEquipo ?? item.listaEquipoSeleccionado?.listaEquipo
                        if (!lista) return <span className="text-[10px] text-muted-foreground">—</span>
                        return (
                          <div className="flex items-center gap-1">
                            <Link
                              href={`/proyectos/${proyectoId}/listas/${lista.id}`}
                              className="text-[10px] font-mono text-blue-600 hover:underline truncate max-w-[80px]"
                              title={lista.nombre}
                            >
                              {lista.codigo}
                            </Link>
                            {item.listaEquipoSeleccionado && (
                              <span className={cn(
                                'text-[10px] px-1 py-0.5 rounded font-medium',
                                item.listaEquipoSeleccionado.cantidad < item.cantidad
                                  ? 'bg-amber-100 text-amber-700'
                                  : item.listaEquipoSeleccionado.cantidad > item.cantidad
                                  ? 'bg-orange-100 text-orange-700'
                                  : 'bg-green-100 text-green-700'
                              )}>
                                {item.listaEquipoSeleccionado.cantidad}/{item.cantidad}
                              </span>
                            )}
                          </div>
                        )
                      })()}
                    </td>
                    <td className="px-1 py-1.5 text-center">
                      {(
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-0.5 rounded hover:bg-gray-200 transition-colors" disabled={updatingId === item.id}>
                              <MoreHorizontal className="h-3.5 w-3.5 text-gray-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            {item.estado === 'pendiente' && (
                              <>
                                <DropdownMenuItem
                                  className="text-xs"
                                  onSelect={() => setTimeout(() => onVincular(item), 0)}
                                >
                                  <Link2 className="h-3.5 w-3.5 mr-2" />
                                  Vincular
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs"
                                  onSelect={() => setTimeout(() => onDesglosar(item), 0)}
                                >
                                  <Layers className="h-3.5 w-3.5 mr-2" />
                                  Desglosar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs text-red-600 focus:text-red-600"
                                  onClick={async () => {
                                    setUpdatingId(item.id)
                                    await onEstadoChange(item.id, 'descartado')
                                    setUpdatingId(null)
                                  }}
                                >
                                  <XCircle className="h-3.5 w-3.5 mr-2" />
                                  Descartar
                                </DropdownMenuItem>
                              </>
                            )}
                            {(item.estado === 'en_lista' || item.estado === 'reemplazado') && (
                              <DropdownMenuItem
                                className="text-xs"
                                onClick={async () => {
                                  setUpdatingId(item.id)
                                  await onDesvincular(item.id)
                                  setUpdatingId(null)
                                }}
                              >
                                <Undo2 className="h-3.5 w-3.5 mr-2" />
                                Desvincular
                              </DropdownMenuItem>
                            )}
                            {item.estado === 'desglosado' && (
                              <>
                                <DropdownMenuItem
                                  className="text-xs"
                                  onSelect={() => setTimeout(() => onDesglosar(item), 0)}
                                >
                                  <Layers className="h-3.5 w-3.5 mr-2" />
                                  Editar desglose
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs"
                                  onClick={async () => {
                                    setUpdatingId(item.id)
                                    await onRevertirDesglose(item.id)
                                    setUpdatingId(null)
                                  }}
                                >
                                  <Undo2 className="h-3.5 w-3.5 mr-2" />
                                  Revertir desglose
                                </DropdownMenuItem>
                              </>
                            )}
                            {item.estado === 'descartado' && (
                              <DropdownMenuItem
                                className="text-xs"
                                onClick={async () => {
                                  setUpdatingId(item.id)
                                  await onEstadoChange(item.id, 'pendiente')
                                  setUpdatingId(null)
                                }}
                              >
                                <Undo2 className="h-3.5 w-3.5 mr-2" />
                                Restaurar
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100/80 border-t-2">
                <td colSpan={6} className="px-2 py-1.5 text-right font-medium text-gray-700">
                  Total ({sortedItems.length} items):
                </td>
                <td className="px-2 py-1.5 text-right font-mono font-bold text-green-700">
                  {formatCurrency(totalFiltered)}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}

export default function ProjectEquipmentDetailPage({ params }: PageProps) {
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [equipo, setEquipo] = useState<ProyectoEquipoCotizadoWithItems | null>(null)
  const [loading, setLoading] = useState(true)
  const [proyectoId, setProyectoId] = useState<string>('')
  const [equipoId, setEquipoId] = useState<string>('')
  const [showCreateListModal, setShowCreateListModal] = useState(false)
  const [vincularItem, setVincularItem] = useState<ItemWithLista | null>(null)
  const [unlinkedItems, setUnlinkedItems] = useState<any[]>([])
  const [loadingUnlinked, setLoadingUnlinked] = useState(false)
  const [linkingId, setLinkingId] = useState<string | null>(null)
  const [desgloseItem, setDesgloseItem] = useState<ItemWithLista | null>(null)
  const [desgloseListasProyecto, setDesgloseListasProyecto] = useState<ListaInfo[]>([])
  const [desgloseSelected, setDesgloseSelected] = useState<string[]>([])
  const [desgloseItemsByLista, setDesgloseItemsByLista] = useState<Record<string, ItemDisponibleDesglose[]>>({})
  const [desgloseLineasSelected, setDesgloseLineasSelected] = useState<Record<string, string[]>>({})
  const [desgloseExpanded, setDesgloseExpanded] = useState<string[]>([])
  const [desgloseLoadingLista, setDesgloseLoadingLista] = useState<string | null>(null)
  const [desgloseSearch, setDesgloseSearch] = useState<Record<string, string>>({})
  const [desgloseNota, setDesgloseNota] = useState('')
  const [desgloseSaving, setDesgloseSaving] = useState(false)
  const { toast } = useToast()

  const handleEstadoChange = async (itemId: string, nuevoEstado: string) => {
    try {
      const res = await fetch(`/api/proyecto-equipo-item/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      if (!res.ok) throw new Error('Error al actualizar')
      // Update local state
      if (equipo) {
        setEquipo({
          ...equipo,
          items: equipo.items.map(i => i.id === itemId ? { ...i, estado: nuevoEstado as EstadoEquipoItem } : i)
        })
      }
      toast({
        title: nuevoEstado === 'descartado' ? 'Ítem descartado' : 'Ítem restaurado',
        description: nuevoEstado === 'descartado'
          ? 'El ítem fue marcado como descartado'
          : 'El ítem fue restaurado a pendiente',
      })
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el estado del ítem',
        variant: 'destructive',
      })
    }
  }

  const handleOpenVincular = async (item: ItemWithLista) => {
    setVincularItem(item)
    setLoadingUnlinked(true)
    try {
      const res = await fetch(`/api/lista-equipo-item/sin-vincular?proyectoId=${proyectoId}&equipoGrupoId=${equipoId}`)
      if (res.ok) {
        const data = await res.json()
        setUnlinkedItems(data)
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar ítems de listas', variant: 'destructive' })
    } finally {
      setLoadingUnlinked(false)
    }
  }

  const handleVincular = async (listaItemId: string) => {
    if (!vincularItem) return
    setLinkingId(listaItemId)
    try {
      const res = await fetch(`/api/proyecto-equipo-item/${vincularItem.id}/vincular`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listaItemId }),
      })

      if (res.status === 409) {
        const data = await res.json().catch(() => ({}))
        const pedidos = (data.bloqueantes || []) as Array<{ pedidoCodigo: string; pedidoEstado: string }>
        const detalle = pedidos.map(p => `${p.pedidoCodigo} (${p.pedidoEstado})`).join(', ') || 'pedidos en curso'
        toast({
          title: 'No se puede vincular',
          description: `El ítem actualmente vinculado tiene ${detalle}. Pásalos a borrador antes de revincular.`,
          variant: 'destructive',
        })
        return
      }

      if (!res.ok) throw new Error('Error al vincular')

      if (equipo) {
        setEquipo({
          ...equipo,
          items: equipo.items.map(i =>
            i.id === vincularItem.id
              ? { ...i, estado: 'reemplazado' as EstadoEquipoItem }
              : i
          ),
        })
      }

      toast({ title: 'Vinculado', description: 'El ítem fue vinculado como reemplazo correctamente' })
      setVincularItem(null)
    } catch {
      toast({ title: 'Error', description: 'No se pudo vincular el ítem', variant: 'destructive' })
    } finally {
      setLinkingId(null)
    }
  }

  const handleDesvincular = async (itemId: string) => {
    try {
      const res = await fetch(`/api/proyecto-equipo-item/${itemId}/desvincular`, {
        method: 'POST',
      })
      if (!res.ok) throw new Error('Error al desvincular')
      if (equipo) {
        setEquipo({
          ...equipo,
          items: equipo.items.map(i =>
            i.id === itemId
              ? { ...i, estado: 'pendiente' as EstadoEquipoItem, listaId: null, listaEquipoSeleccionadoId: null, listaEquipo: null, listaEquipoSeleccionado: null }
              : i
          ),
        })
      }
      toast({ title: 'Desvinculado', description: 'El ítem volvió a estado pendiente' })
    } catch {
      toast({ title: 'Error', description: 'No se pudo desvincular el ítem', variant: 'destructive' })
    }
  }

  const fetchItemsDisponiblesDesglose = async (cotizadoItemId: string, listaIds: string[]) => {
    if (listaIds.length === 0) return
    setDesgloseLoadingLista(listaIds.join(','))
    try {
      const res = await fetch(
        `/api/proyecto-equipo-item/${cotizadoItemId}/desglose/items-disponibles?listaIds=${listaIds.join(',')}`
      )
      if (!res.ok) throw new Error('Error')
      const data = (await res.json()) as ItemsDisponiblesPorLista[]
      setDesgloseItemsByLista(prev => {
        const next = { ...prev }
        for (const g of data) next[g.listaId] = g.items
        return next
      })
      // Hidratar selección desde items asociados a este desglose
      setDesgloseLineasSelected(prev => {
        const next = { ...prev }
        for (const g of data) {
          if (next[g.listaId] === undefined) {
            next[g.listaId] = g.items.filter(i => i.asociadoAEsteDesglose).map(i => i.id)
          }
        }
        return next
      })
    } catch {
      toast({ title: 'Error', description: 'No se pudieron cargar items de la lista', variant: 'destructive' })
    } finally {
      setDesgloseLoadingLista(null)
    }
  }

  const handleOpenDesglosar = async (item: ItemWithLista) => {
    setDesgloseItem(item)
    const listasIniciales = item.desgloses?.map(d => d.listaEquipo.id) || []
    setDesgloseSelected(listasIniciales)
    setDesgloseExpanded(listasIniciales)
    setDesgloseItemsByLista({})
    setDesgloseLineasSelected({})
    setDesgloseSearch({})
    setDesgloseNota('')
    try {
      const res = await fetch(`/api/lista-equipo?proyectoId=${proyectoId}`)
      if (res.ok) {
        const data = await res.json()
        setDesgloseListasProyecto(data.map((l: any) => ({ id: l.id, codigo: l.codigo, nombre: l.nombre })))
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar listas del proyecto', variant: 'destructive' })
    }
    if (listasIniciales.length > 0) {
      await fetchItemsDisponiblesDesglose(item.id, listasIniciales)
    }
  }

  const handleToggleListaSelection = async (listaId: string, checked: boolean) => {
    if (!desgloseItem) return
    if (checked) {
      setDesgloseSelected(prev => [...prev, listaId])
      setDesgloseExpanded(prev => prev.includes(listaId) ? prev : [...prev, listaId])
      if (!desgloseItemsByLista[listaId]) {
        await fetchItemsDisponiblesDesglose(desgloseItem.id, [listaId])
      }
    } else {
      setDesgloseSelected(prev => prev.filter(id => id !== listaId))
      setDesgloseLineasSelected(prev => {
        const next = { ...prev }
        delete next[listaId]
        return next
      })
    }
  }

  const handleToggleLineaSelection = (listaId: string, lineaId: string, checked: boolean) => {
    setDesgloseLineasSelected(prev => {
      const current = prev[listaId] || []
      return {
        ...prev,
        [listaId]: checked ? [...current, lineaId] : current.filter(id => id !== lineaId),
      }
    })
  }

  const handleDesglosar = async () => {
    if (!desgloseItem || desgloseSelected.length === 0) return
    setDesgloseSaving(true)
    try {
      const payload = {
        listas: desgloseSelected.map(listaId => ({
          listaId,
          listaItemIds: desgloseLineasSelected[listaId] || [],
        })),
        nota: desgloseNota.trim() || undefined,
      }
      const res = await fetch(`/api/proyecto-equipo-item/${desgloseItem.id}/desglosar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Error al desglosar')
      const updated = await res.json()
      if (equipo) {
        setEquipo({
          ...equipo,
          items: equipo.items.map(i => i.id === desgloseItem.id ? {
            ...i,
            estado: 'desglosado' as EstadoEquipoItem,
            desgloses: updated.desgloses,
            listaEquipoItemsDesglose: updated.listaEquipoItemsDesglose,
          } : i)
        })
      }
      const totalLineas = Object.values(desgloseLineasSelected).reduce((s, arr) => s + arr.length, 0)
      toast({
        title: 'Desglosado',
        description: totalLineas > 0
          ? `${totalLineas} ítem(s) asociado(s) en ${desgloseSelected.length} lista(s)`
          : `Ítem desglosado en ${desgloseSelected.length} lista(s)`,
      })
      setDesgloseItem(null)
    } catch {
      toast({ title: 'Error', description: 'No se pudo desglosar el ítem', variant: 'destructive' })
    } finally {
      setDesgloseSaving(false)
    }
  }

  const handleRevertirDesglose = async (itemId: string) => {
    try {
      const res = await fetch(`/api/proyecto-equipo-item/${itemId}/desglosar`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al revertir')
      if (equipo) {
        setEquipo({
          ...equipo,
          items: equipo.items.map(i => i.id === itemId ? { ...i, estado: 'pendiente' as EstadoEquipoItem, desgloses: [] } : i)
        })
      }
      toast({ title: 'Revertido', description: 'El desglose fue revertido' })
    } catch {
      toast({ title: 'Error', description: 'No se pudo revertir el desglose', variant: 'destructive' })
    }
  }

  useEffect(() => {
    params.then(p => {
      setProyectoId(p.id)
      setEquipoId(p.equipoId)
    })
  }, [params])

  useEffect(() => {
    if (!proyectoId || !equipoId) return

    Promise.all([
      getProyectoById(proyectoId),
      getProyectoEquipoById(equipoId)
    ]).then(([proyectoData, equipoData]) => {
      if (!proyectoData || !equipoData) {
        notFound()
        return
      }
      setProyecto(proyectoData as unknown as Proyecto)
      setEquipo(equipoData as unknown as ProyectoEquipoCotizadoWithItems)
    }).catch(console.error).finally(() => setLoading(false))
  }, [proyectoId, equipoId])

  if (loading) return <LoadingSkeleton />
  if (!proyecto || !equipo) notFound()

  const totalItems = equipo.items?.length || 0
  const parcialesItems = equipo.items?.filter(i =>
    (i.listaId || i.estado === 'en_lista') && i.listaEquipoSeleccionado && i.listaEquipoSeleccionado.cantidad < i.cantidad
  ).length || 0
  const excedeItems = equipo.items?.filter(i =>
    (i.listaId || i.estado === 'en_lista') && i.listaEquipoSeleccionado && i.listaEquipoSeleccionado.cantidad > i.cantidad
  ).length || 0
  const completedItems = equipo.items?.filter(i => i.listaId || i.estado === 'en_lista' || i.estado === 'reemplazado').length || 0
  const desglosadosItems = equipo.items?.filter(i => i.estado === 'desglosado').length || 0
  const descartadosItems = equipo.items?.filter(i => i.estado === 'descartado').length || 0
  const pendingItems = totalItems - completedItems - desglosadosItems - descartadosItems
  const totalCost = equipo.items?.reduce((sum, i) => sum + (i.cantidad * (i.precioCliente || 0)), 0) || 0

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          {/* Back link */}
          <Link
            href={`/proyectos/${proyectoId}/equipos`}
            className="inline-flex items-center text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3 w-3 mr-1" />
            Equipos
          </Link>

          {/* Title */}
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" />
            <h1 className="text-lg font-semibold">{equipo.nombre}</h1>
          </div>

          {/* Stats inline */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
              {totalItems} items
            </Badge>
            <span className="text-gray-300">|</span>
            <span className="text-green-600">{completedItems - parcialesItems - excedeItems} en lista</span>
            {parcialesItems > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-amber-600">{parcialesItems} parcial</span>
              </>
            )}
            {excedeItems > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-orange-600">{excedeItems} excede</span>
              </>
            )}
            <span className="text-gray-300">|</span>
            <span className="text-amber-600">{pendingItems} pendientes</span>
            {descartadosItems > 0 && (
              <>
                <span className="text-gray-300">|</span>
                <span className="text-red-500">{descartadosItems} descartados</span>
              </>
            )}
            <span className="text-gray-300">|</span>
            <span className="font-mono text-green-600 font-medium">{formatCurrency(totalCost)}</span>
          </div>
        </div>

        {/* Action */}
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowCreateListModal(true)}
          className="h-7 text-xs"
        >
          <List className="h-3 w-3 mr-1" />
          Crear Lista
        </Button>
      </div>

      {/* Description */}
      {equipo.descripcion && (
        <p className="text-xs text-muted-foreground border-l-2 border-orange-300 pl-3">
          {equipo.descripcion}
        </p>
      )}

      {/* Items Table */}
      <ItemsTable items={equipo.items || []} proyectoId={proyectoId} onEstadoChange={handleEstadoChange} onVincular={handleOpenVincular} onDesglosar={handleOpenDesglosar} onRevertirDesglose={handleRevertirDesglose} onDesvincular={handleDesvincular} />

      {/* Dialog Vincular */}
      <Dialog open={!!vincularItem} onOpenChange={() => setVincularItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Link2 className="h-4 w-4 text-blue-600" />
            Vincular reemplazo
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground -mt-2">
            Selecciona el ítem de lista que reemplaza a <strong>{vincularItem?.codigo}</strong> — <span className="text-gray-500">{vincularItem?.descripcion}</span>
          </DialogDescription>

          {loadingUnlinked ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : unlinkedItems.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No hay ítems sin vincular en las listas de este grupo de equipos.
            </div>
          ) : (
            <ScrollArea className="max-h-[350px]">
              <div className="space-y-1">
                {unlinkedItems.map((li: any) => (
                  <div
                    key={li.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg border hover:bg-blue-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-xs text-gray-600">{li.codigo}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          {li.listaEquipo?.codigo}
                        </Badge>
                        <Badge variant="secondary" className="text-[9px] px-1 py-0">
                          {li.origen}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-700 truncate mt-0.5">{li.descripcion}</p>
                      <p className="text-[10px] text-muted-foreground">{li.cantidad} {li.unidad}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs shrink-0"
                      disabled={linkingId === li.id}
                      onClick={() => handleVincular(li.id)}
                    >
                      {linkingId === li.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <>
                          <Link2 className="h-3 w-3 mr-1" />
                          Vincular
                        </>
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Desglosar */}
      <Dialog open={!!desgloseItem} onOpenChange={() => setDesgloseItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-600" />
            Desglosar ítem
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground -mt-2">
            <strong>{desgloseItem?.codigo}</strong> — <span className="text-gray-500">{desgloseItem?.descripcion}</span>
          </DialogDescription>

          {desgloseListasProyecto.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No hay listas en este proyecto.
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-[11px] font-medium text-gray-600">Nota (opcional)</label>
                <textarea
                  value={desgloseNota}
                  onChange={(e) => setDesgloseNota(e.target.value)}
                  placeholder="Motivo o detalle del desglose..."
                  rows={2}
                  className="w-full text-xs px-2 py-1.5 border rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-purple-400"
                />
              </div>

              <div className="text-[11px] text-muted-foreground border-t pt-2">
                Marca las listas donde se desglosó este ítem. Para cada lista, opcionalmente selecciona los ítems específicos que componen el desglose.
              </div>

              <ScrollArea className="flex-1 min-h-[40vh] max-h-[55vh] pr-2">
                <div className="space-y-1.5">
                  {desgloseListasProyecto.map((lista) => {
                    const isSelected = desgloseSelected.includes(lista.id)
                    const isExpanded = desgloseExpanded.includes(lista.id)
                    const items = desgloseItemsByLista[lista.id]
                    const seleccionados = desgloseLineasSelected[lista.id] || []
                    const search = (desgloseSearch[lista.id] || '').toLowerCase()
                    const itemsFiltrados = items?.filter(it =>
                      !search || it.codigo.toLowerCase().includes(search) || it.descripcion.toLowerCase().includes(search)
                    )
                    return (
                      <div
                        key={lista.id}
                        className={cn(
                          'rounded-lg border transition-colors',
                          isSelected ? 'border-purple-200 bg-purple-50/40' : 'border-gray-200'
                        )}
                      >
                        <div className="flex items-center gap-2 p-2">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => handleToggleListaSelection(lista.id, !!checked)}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setDesgloseExpanded(prev =>
                                prev.includes(lista.id) ? prev.filter(id => id !== lista.id) : [...prev, lista.id]
                              )
                              if (isSelected && !desgloseItemsByLista[lista.id] && desgloseItem) {
                                fetchItemsDisponiblesDesglose(desgloseItem.id, [lista.id])
                              }
                            }}
                            className="flex-1 flex items-center gap-2 min-w-0 text-left hover:bg-purple-50/40 rounded px-1 py-0.5 transition-colors"
                          >
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-mono text-xs text-gray-700">{lista.codigo}</span>
                                {isSelected && seleccionados.length > 0 && (
                                  <Badge variant="secondary" className="text-[9px] px-1 py-0 bg-purple-100 text-purple-700 border-purple-200">
                                    {seleccionados.length} ítem{seleccionados.length !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-[11px] text-gray-500 truncate">{lista.nombre}</p>
                            </div>
                          </button>
                        </div>
                        {isExpanded && isSelected && (
                          <div className="border-t border-purple-100 px-2 py-2 space-y-1.5">
                            {!items ? (
                              <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                              </div>
                            ) : items.length === 0 ? (
                              <p className="text-[11px] text-muted-foreground text-center py-2">
                                Esta lista no tiene ítems candidatos. Crea ítems en la lista (origen "nuevo") y vuelve aquí.
                              </p>
                            ) : (
                              <>
                                <div className="relative">
                                  <Search className="h-3 w-3 text-gray-400 absolute left-2 top-1/2 -translate-y-1/2" />
                                  <Input
                                    value={desgloseSearch[lista.id] || ''}
                                    onChange={(e) => setDesgloseSearch(prev => ({ ...prev, [lista.id]: e.target.value }))}
                                    placeholder="Buscar por código o descripción..."
                                    className="h-7 text-xs pl-7"
                                  />
                                </div>
                                <div className="space-y-0.5 max-h-[240px] overflow-y-auto">
                                  {itemsFiltrados?.map((it) => {
                                    const bloqueado = !!it.bloqueadoPorOtroDesglose
                                    const checked = seleccionados.includes(it.id)
                                    return (
                                      <label
                                        key={it.id}
                                        className={cn(
                                          'flex items-start gap-2 p-1.5 rounded text-xs transition-colors',
                                          bloqueado
                                            ? 'opacity-60 cursor-not-allowed bg-gray-50'
                                            : checked
                                            ? 'bg-purple-100/60 cursor-pointer'
                                            : 'hover:bg-gray-50 cursor-pointer'
                                        )}
                                      >
                                        <Checkbox
                                          checked={checked}
                                          disabled={bloqueado}
                                          onCheckedChange={(c) => handleToggleLineaSelection(lista.id, it.id, !!c)}
                                          className="mt-0.5"
                                        />
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-mono text-gray-700">{it.codigo}</span>
                                            <span className="text-[10px] text-gray-500">{it.cantidad} {it.unidad}</span>
                                            {bloqueado && (
                                              <Badge variant="outline" className="text-[9px] px-1 py-0 bg-amber-50 text-amber-700 border-amber-200">
                                                en desglose de {it.bloqueadoPorOtroDesglose?.codigo || '?'}
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="text-[11px] text-gray-600 truncate">{it.descripcion}</p>
                                        </div>
                                      </label>
                                    )
                                  })}
                                  {itemsFiltrados?.length === 0 && (
                                    <p className="text-[11px] text-muted-foreground text-center py-2">
                                      Sin resultados.
                                    </p>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            </>
          )}

          <div className="flex justify-between items-center gap-2 pt-2 border-t">
            <p className="text-[11px] text-muted-foreground">
              {(() => {
                const totalLineas = Object.values(desgloseLineasSelected).reduce((s, arr) => s + arr.length, 0)
                return `${desgloseSelected.length} lista${desgloseSelected.length !== 1 ? 's' : ''}, ${totalLineas} ítem${totalLineas !== 1 ? 's' : ''} asociado${totalLineas !== 1 ? 's' : ''}`
              })()}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setDesgloseItem(null)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={desgloseSelected.length === 0 || desgloseSaving}
                onClick={handleDesglosar}
                className="bg-purple-600 hover:bg-purple-700"
              >
                {desgloseSaving ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Layers className="h-3 w-3 mr-1" />
                )}
                Guardar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal */}
      <CrearListaMultipleModal
        isOpen={showCreateListModal}
        onClose={() => setShowCreateListModal(false)}
        proyectoEquipo={equipo}
        proyectoId={proyectoId}
        onDistribucionCompletada={(listaId) => {
          console.log('Lista creada:', listaId)
          setShowCreateListModal(false)
        }}
      />
    </div>
  )
}
