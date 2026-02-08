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
  ArrowLeft,
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
  Filter
} from 'lucide-react'
import type { Proyecto, ProyectoEquipoCotizado, ProyectoEquipoCotizadoItem } from '@prisma/client'
import CrearListaMultipleModal from '@/components/proyectos/equipos/CrearListaMultipleModal'

type ProyectoEquipoCotizadoWithItems = Omit<ProyectoEquipoCotizado, 'proyecto' | 'responsable'> & {
  items: ProyectoEquipoCotizadoItem[]
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

function ItemsTable({ items }: { items: ProyectoEquipoCotizadoItem[] }) {
  const [search, setSearch] = useState('')
  const [categoriaFiltro, setCategoriaFiltro] = useState('__todas__')
  const [sortField, setSortField] = useState<string>('codigo')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

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
      const aVal = a[sortField as keyof ProyectoEquipoCotizadoItem]
      const bVal = b[sortField as keyof ProyectoEquipoCotizadoItem]
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

  const getStatusBadge = (item: ProyectoEquipoCotizadoItem) => {
    if (item.listaId || item.estado === 'en_lista') {
      return (
        <span className="inline-flex items-center gap-0.5 text-[10px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded">
          <CheckCircle2 className="h-2.5 w-2.5" />En Lista
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
              </tr>
            </thead>
            <tbody className="divide-y">
              {sortedItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-muted-foreground">
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
                      <span className="font-mono text-gray-600">{item.codigo}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="line-clamp-1" title={item.descripcion}>{item.descripcion}</span>
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
                <td></td>
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
  const completedItems = equipo.items?.filter(i => i.listaId || i.estado === 'en_lista' || i.estado === 'reemplazado').length || 0
  const pendingItems = totalItems - completedItems
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
            <span className="text-green-600">{completedItems} en lista</span>
            <span className="text-gray-300">|</span>
            <span className="text-amber-600">{pendingItems} pendientes</span>
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
      <ItemsTable items={equipo.items || []} />

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
