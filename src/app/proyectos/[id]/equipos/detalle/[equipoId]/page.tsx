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
  Layers
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

type ItemWithLista = ProyectoEquipoCotizadoItem & {
  listaEquipo?: ListaInfo | null
  listaEquipoSeleccionado?: (Pick<ListaEquipoItem, 'id' | 'cantidad'> & {
    listaEquipo?: ListaInfo | null
  }) | null
  desgloses?: DesgloseInfo[]
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

function ItemsTable({ items, proyectoId, onEstadoChange, onVincular, onDesglosar, onRevertirDesglose }: { items: ItemWithLista[], proyectoId: string, onEstadoChange: (itemId: string, estado: string) => Promise<void>, onVincular: (item: ItemWithLista) => void, onDesglosar: (item: ItemWithLista) => void, onRevertirDesglose: (itemId: string) => Promise<void> }) {
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
                        // Desglosado: show multiple listas
                        if (item.estado === 'desglosado' && item.desgloses && item.desgloses.length > 0) {
                          return (
                            <div className="flex flex-wrap gap-0.5">
                              {item.desgloses.map((d) => (
                                <Link
                                  key={d.id}
                                  href={`/proyectos/${proyectoId}/listas/${d.listaEquipo.id}`}
                                  className="text-[10px] font-mono text-purple-600 hover:underline"
                                  title={d.listaEquipo.nombre}
                                >
                                  {d.listaEquipo.codigo}
                                </Link>
                              ))}
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
                      {(item.estado === 'pendiente' || item.estado === 'descartado' || item.estado === 'desglosado') && !item.listaId && !item.listaEquipoSeleccionado && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-0.5 rounded hover:bg-gray-200 transition-colors" disabled={updatingId === item.id}>
                              <MoreHorizontal className="h-3.5 w-3.5 text-gray-400" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            {item.estado === 'pendiente' && (
                              <>
                                <DropdownMenuItem
                                  className="text-xs"
                                  onClick={() => onVincular(item)}
                                >
                                  <Link2 className="h-3.5 w-3.5 mr-2" />
                                  Vincular
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs"
                                  onClick={() => onDesglosar(item)}
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
                            {item.estado === 'desglosado' && (
                              <>
                                <DropdownMenuItem
                                  className="text-xs"
                                  onClick={() => onDesglosar(item)}
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
      // 1. Update ListaEquipoItem to link to the cotizado item
      const res1 = await fetch(`/api/lista-equipo-item/${listaItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proyectoEquipoItemId: vincularItem.id,
          reemplazaProyectoEquipoCotizadoItemId: vincularItem.id,
          origen: 'reemplazo',
        }),
      })
      if (!res1.ok) throw new Error('Error al vincular ítem de lista')

      // 2. Update ProyectoEquipoCotizadoItem to mark as reemplazado
      const res2 = await fetch(`/api/proyecto-equipo-item/${vincularItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'reemplazado',
          listaEquipoSeleccionadoId: listaItemId,
          motivoCambio: 'Vinculado manualmente como reemplazo',
        }),
      })
      if (!res2.ok) throw new Error('Error al actualizar ítem cotizado')

      // Update local state
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

  const handleOpenDesglosar = async (item: ItemWithLista) => {
    setDesgloseItem(item)
    setDesgloseSelected(item.desgloses?.map(d => d.listaEquipo.id) || [])
    try {
      const res = await fetch(`/api/lista-equipo?proyectoId=${proyectoId}`)
      if (res.ok) {
        const data = await res.json()
        setDesgloseListasProyecto(data.map((l: any) => ({ id: l.id, codigo: l.codigo, nombre: l.nombre })))
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo cargar listas del proyecto', variant: 'destructive' })
    }
  }

  const handleDesglosar = async () => {
    if (!desgloseItem || desgloseSelected.length === 0) return
    setDesgloseSaving(true)
    try {
      const res = await fetch(`/api/proyecto-equipo-item/${desgloseItem.id}/desglosar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listaIds: desgloseSelected }),
      })
      if (!res.ok) throw new Error('Error al desglosar')
      const updated = await res.json()
      if (equipo) {
        setEquipo({
          ...equipo,
          items: equipo.items.map(i => i.id === desgloseItem.id ? { ...i, estado: 'desglosado' as EstadoEquipoItem, desgloses: updated.desgloses } : i)
        })
      }
      toast({ title: 'Desglosado', description: `Ítem desglosado en ${desgloseSelected.length} lista(s)` })
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
      <ItemsTable items={equipo.items || []} proyectoId={proyectoId} onEstadoChange={handleEstadoChange} onVincular={handleOpenVincular} onDesglosar={handleOpenDesglosar} onRevertirDesglose={handleRevertirDesglose} />

      {/* Dialog Vincular */}
      <Dialog open={!!vincularItem} onOpenChange={() => setVincularItem(null)}>
        <DialogContent className="max-w-lg">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Link2 className="h-4 w-4 text-blue-600" />
            Vincular reemplazo
          </DialogTitle>
          <p className="text-xs text-muted-foreground -mt-2">
            Selecciona el ítem de lista que reemplaza a <strong>{vincularItem?.codigo}</strong> — <span className="text-gray-500">{vincularItem?.descripcion}</span>
          </p>

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
        <DialogContent className="max-w-md">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4 text-purple-600" />
            Desglosar ítem
          </DialogTitle>
          <p className="text-xs text-muted-foreground -mt-2">
            Selecciona las listas donde se desglosó <strong>{desgloseItem?.codigo}</strong> — <span className="text-gray-500">{desgloseItem?.descripcion}</span>
          </p>

          {desgloseListasProyecto.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No hay listas en este proyecto.
            </div>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-1">
                {desgloseListasProyecto.map((lista) => (
                  <label
                    key={lista.id}
                    className={cn(
                      'flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-colors',
                      desgloseSelected.includes(lista.id) ? 'bg-purple-50 border-purple-200' : 'hover:bg-gray-50'
                    )}
                  >
                    <Checkbox
                      checked={desgloseSelected.includes(lista.id)}
                      onCheckedChange={(checked) => {
                        setDesgloseSelected(prev =>
                          checked ? [...prev, lista.id] : prev.filter(id => id !== lista.id)
                        )
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <span className="font-mono text-xs text-gray-600">{lista.codigo}</span>
                      <p className="text-xs text-gray-700 truncate">{lista.nombre}</p>
                    </div>
                  </label>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-end gap-2 pt-2">
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
              Desglosar en {desgloseSelected.length} lista(s)
            </Button>
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
