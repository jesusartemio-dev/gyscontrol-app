'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  FileText,
  Plus,
  Download,
  DollarSign,
  Loader2,
  CheckCircle2,
  Clock,
  Send,
  FileSpreadsheet,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import CotizacionModal from '@/components/cotizaciones/CotizacionModal'
import CotizacionList from '@/components/cotizaciones/CotizacionList'
import { getCotizacionesPaginated } from '@/lib/services/cotizacion'
import type { Cotizacion } from '@/types'
import type { PaginationMeta } from '@/types/payloads'
import { penToUSD } from '@/lib/costos'
import { ExcelImportWizard } from '@/components/agente/ExcelImportWizard'
import { usePagination } from '@/components/ui/data-pagination'

const formatCurrencyKPI = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`
  }
  return `$${amount.toFixed(0)}`
}

export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState<Cotizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  // Filtros
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear().toString())

  // Paginación
  const { page, limit, handlePageChange, handleLimitChange, reset: resetPagination } = usePagination(1, 20)
  const [paginationMeta, setPaginationMeta] = useState<PaginationMeta>({
    page: 1, limit: 20, total: 0, totalPages: 1, hasNextPage: false, hasPrevPage: false
  })

  // Debounce para búsqueda
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [debouncedSearch, setDebouncedSearch] = useState('')

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

  // Fetch cotizaciones con paginación
  const fetchCotizaciones = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const result = await getCotizacionesPaginated({
        page,
        limit,
        search: debouncedSearch || undefined,
        estado: statusFilter !== 'all' ? statusFilter : undefined,
        anio: yearFilter !== 'todos' ? yearFilter : undefined,
      })
      setCotizaciones(result.data)
      setPaginationMeta(result.pagination)
    } catch {
      setError('Error al cargar cotizaciones.')
    } finally {
      setLoading(false)
    }
  }, [page, limit, debouncedSearch, statusFilter, yearFilter])

  useEffect(() => {
    fetchCotizaciones()
  }, [fetchCotizaciones])

  // Reset page on filter change
  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value)
    resetPagination()
  }

  const handleYearFilterChange = (value: string) => {
    setYearFilter(value)
    resetPagination()
  }

  const handleCreated = () => {
    fetchCotizaciones()
  }

  const handleDelete = () => {
    fetchCotizaciones()
  }

  const handleUpdated = () => {
    fetchCotizaciones()
  }

  // KPI: monto total de la página visible
  const montoTotal = cotizaciones.reduce((sum, c) => {
    const monto = c.totalCliente || 0
    if (c.moneda === 'PEN' && c.tipoCambio) return sum + penToUSD(monto, c.tipoCambio)
    return sum + monto
  }, 0)

  return (
    <div className="p-4 space-y-4">
      {/* Compact Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold">Cotizaciones</h1>
          <Badge variant="secondary" className="text-xs">
            {paginationMeta.total}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Inline Stats */}
          <div className="hidden md:flex items-center gap-3 mr-4 text-xs">
            <div className="flex items-center gap-1 text-emerald-600" title="Monto Total (página)">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="font-semibold">{formatCurrencyKPI(montoTotal)}</span>
            </div>
          </div>

          <Button variant="outline" size="sm" className="h-8" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" />
            Importar Excel
          </Button>
          <Button variant="outline" size="sm" className="h-8">
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Exportar
          </Button>
          <CotizacionModal
            onCreated={handleCreated}
            trigger={
              <Button size="sm" className="h-8">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Nueva
              </Button>
            }
          />
        </div>
      </div>

      {/* Mobile Stats */}
      <div className="md:hidden grid grid-cols-2 gap-2">
        <div className="bg-gray-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-gray-600">{paginationMeta.total}</div>
          <div className="text-[10px] text-gray-700">Total</div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-emerald-600">{formatCurrencyKPI(montoTotal)}</div>
          <div className="text-[10px] text-emerald-700">Monto</div>
        </div>
      </div>

      {/* Cotizaciones List */}
      {error ? (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-600 mb-2">Error al cargar</h3>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={fetchCotizaciones} variant="outline">
              Reintentar
            </Button>
          </CardContent>
        </Card>
      ) : !loading && cotizaciones.length === 0 && !debouncedSearch && statusFilter === 'all' && yearFilter === 'todos' ? (
        <Card>
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay cotizaciones
            </h3>
            <p className="text-gray-500 mb-4">
              Comienza creando tu primera cotización
            </p>
            <CotizacionModal
              onCreated={handleCreated}
              trigger={
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Cotización
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <CotizacionList
          cotizaciones={cotizaciones}
          onDelete={handleDelete}
          onUpdated={handleUpdated}
          loading={loading}
          // Filtros server-side
          search={search}
          onSearchChange={setSearch}
          statusFilter={statusFilter}
          onStatusFilterChange={handleStatusFilterChange}
          yearFilter={yearFilter}
          onYearFilterChange={handleYearFilterChange}
          // Paginación
          paginationMeta={paginationMeta}
          onPageChange={handlePageChange}
          onLimitChange={handleLimitChange}
        />
      )}

      <ExcelImportWizard open={importOpen} onOpenChange={setImportOpen} />
    </div>
  )
}
