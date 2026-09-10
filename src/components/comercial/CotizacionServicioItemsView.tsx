'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { Search, Wrench, ExternalLink, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { DataPagination, usePagination } from '@/components/ui/data-pagination'
import {
  buscarCotizacionServicioItems,
  type CotizacionServicioItemBusqueda,
} from '@/lib/services/cotizacionServicioItem'
import type { PaginationMeta } from '@/types/payloads'

const ESTADO_LABELS: Record<string, string> = {
  borrador: 'Borrador',
  enviada: 'Enviada',
  aprobada: 'Aprobada',
  rechazada: 'Rechazada',
}

const ESTADO_COLORS: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700',
  enviada: 'bg-indigo-50 text-indigo-700',
  aprobada: 'bg-emerald-50 text-emerald-700',
  rechazada: 'bg-red-50 text-red-700',
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount)
}

export function CotizacionServicioItemsView() {
  const [items, setItems] = useState<CotizacionServicioItemBusqueda[]>([])
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [estado, setEstado] = useState('all')
  const [soloCatalogo, setSoloCatalogo] = useState(false)

  const { page, limit, handlePageChange, handleLimitChange, reset: resetPagination } = usePagination(1, 25)
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    page: 1, limit: 25, total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false,
  })

  // Debounce de búsqueda
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(search)
      resetPagination()
    }, 400)
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    }
  }, [search, resetPagination])

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await buscarCotizacionServicioItems({
        page,
        limit,
        search: debouncedSearch || undefined,
        estado: estado !== 'all' ? estado : undefined,
        soloCatalogo: soloCatalogo || undefined,
      })
      setItems(result.data)
      setPaginationMeta(result.pagination)
      setHasSearched(true)
    } catch {
      setError('Error al buscar ítems de servicio')
    } finally {
      setLoading(false)
    }
  }, [page, limit, debouncedSearch, estado, soloCatalogo])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const handleEstadoChange = (value: string) => {
    setEstado(value)
    resetPagination()
  }

  const handleSoloCatalogoChange = () => {
    setSoloCatalogo(prev => !prev)
    resetPagination()
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Wrench className="h-6 w-6 text-blue-600" />
        <h1 className="text-xl font-bold">Servicios Cotizados</h1>
        <Badge variant="secondary" className="text-xs">{paginationMeta.total}</Badge>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nombre, descripción, recurso o cotización..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 h-9"
          />
        </div>

        <Select value={estado} onValueChange={handleEstadoChange}>
          <SelectTrigger className="w-full sm:w-44 h-9">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            {Object.entries(ESTADO_LABELS).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <button
          type="button"
          onClick={handleSoloCatalogoChange}
          className={`h-9 px-3 rounded-md border text-xs font-medium whitespace-nowrap transition-colors ${
            soloCatalogo ? 'bg-blue-50 border-blue-300 text-blue-700' : 'bg-white border-input text-muted-foreground hover:bg-gray-50'
          }`}
        >
          Solo vinculados al catálogo
        </button>
      </div>

      {/* Resultados */}
      {error ? (
        <div className="text-center py-12 border rounded-lg bg-red-50/50">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      ) : !hasSearched && loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed rounded-lg bg-muted/30">
          <Wrench className="h-10 w-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            {debouncedSearch || estado !== 'all' || soloCatalogo
              ? 'No se encontraron ítems con estos filtros'
              : 'No hay ítems de servicio cotizados todavía'}
          </p>
        </div>
      ) : (
        <>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-white">
                  <TableHead className="text-xs font-medium">Nombre</TableHead>
                  <TableHead className="text-xs font-medium hidden md:table-cell">Recurso</TableHead>
                  <TableHead className="text-xs font-medium hidden sm:table-cell">Unidad</TableHead>
                  <TableHead className="text-xs font-medium text-center w-20">Cant.</TableHead>
                  <TableHead className="text-xs font-medium text-right w-20">Horas</TableHead>
                  <TableHead className="text-xs font-medium text-right w-24">Costo Cliente</TableHead>
                  <TableHead className="text-xs font-medium">Cotización</TableHead>
                  <TableHead className="text-xs font-medium hidden lg:table-cell">Cliente</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, idx) => (
                  <TableRow key={item.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                    <TableCell className="text-xs max-w-[240px]">
                      <span className="font-medium line-clamp-1">{item.nombre}</span>
                      <span className="block text-muted-foreground line-clamp-1">{item.descripcion}</span>
                    </TableCell>
                    <TableCell className="text-xs hidden md:table-cell text-muted-foreground">
                      {item.recursoNombre}
                    </TableCell>
                    <TableCell className="text-xs hidden sm:table-cell text-muted-foreground">
                      {item.unidadServicioNombre}
                    </TableCell>
                    <TableCell className="text-xs text-center font-medium">{item.cantidad}</TableCell>
                    <TableCell className="text-xs text-right text-muted-foreground">{item.horaTotal.toFixed(1)}</TableCell>
                    <TableCell className="text-xs text-right font-medium text-emerald-600">
                      {formatCurrency(item.costoCliente)}
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="flex flex-col">
                        <span className="font-mono font-medium">{item.cotizacionServicio.cotizacion.codigo}</span>
                        <Badge variant="outline" className={`text-[10px] px-1.5 py-0 w-fit mt-0.5 ${ESTADO_COLORS[item.cotizacionServicio.cotizacion.estado] || ''}`}>
                          {ESTADO_LABELS[item.cotizacionServicio.cotizacion.estado] || item.cotizacionServicio.cotizacion.estado}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs hidden lg:table-cell text-muted-foreground truncate max-w-[140px]">
                      {item.cotizacionServicio.cotizacion.cliente?.nombre || '—'}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/comercial/cotizaciones/${item.cotizacionServicio.cotizacion.id}/servicios`}
                        title="Ver en la cotización"
                        className="text-gray-400 hover:text-blue-600"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <DataPagination
            pagination={paginationMeta}
            onPageChange={handlePageChange}
            onLimitChange={handleLimitChange}
            itemsLabel="ítems"
            size="sm"
          />
        </>
      )}
    </div>
  )
}
