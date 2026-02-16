'use client'

import { Suspense, useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Package,
  FileText,
  ShoppingCart,
  DollarSign,
  AlertTriangle,
  TrendingUp,
  ArrowRight,
  RefreshCw,
  Search,
  X,
  Calendar,
  Loader2,
  Eye,
  CheckCircle,
  Filter
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { buildApiUrl } from '@/lib/utils'
import type {
  ProyectoConsolidado,
  KPIsConsolidados,
} from '@/lib/services/aprovisionamientoFinanciero'

interface ConsolidatedResponse {
  success: boolean
  data: ProyectoConsolidado[]
  pagination: { page: number; limit: number; total: number; pages: number }
  kpis: KPIsConsolidados
}

export default function AprovisionamientoPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-64"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
      <AprovisionamientoContent />
    </Suspense>
  )
}

function AprovisionamientoContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [data, setData] = useState<ConsolidatedResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Filters from URL
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const estado = searchParams.get('estado') || 'all'
  const page = parseInt(searchParams.get('page') || '1')

  const fetchData = async () => {
    try {
      setRefreshing(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '20')
      if (searchParams.get('search')) params.set('search', searchParams.get('search')!)
      if (estado !== 'all') params.set('estado', estado)

      const res = await fetch(buildApiUrl(`/api/finanzas/aprovisionamiento/proyectos?${params.toString()}`))
      if (!res.ok) throw new Error('Error al cargar datos')
      const json: ConsolidatedResponse = await res.json()
      setData(json)
    } catch (error) {
      console.error('Error fetching aprovisionamiento:', error)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [searchParams.toString()])

  const kpis = data?.kpis
  const proyectos = data?.data || []
  const pagination = data?.pagination

  // Derived stats
  const desviacion = useMemo(() => {
    if (!kpis || kpis.montoTotalListas === 0) return 0
    return Math.round(((kpis.montoTotalPedidos - kpis.montoTotalListas) / kpis.montoTotalListas) * 100)
  }, [kpis])

  const handleSearch = () => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')
    if (search) params.set('search', search)
    else params.delete('search')
    router.push(`/finanzas/aprovisionamiento?${params.toString()}`)
  }

  const handleEstadoChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', '1')
    if (value !== 'all') params.set('estado', value)
    else params.delete('estado')
    router.push(`/finanzas/aprovisionamiento?${params.toString()}`)
  }

  const clearFilters = () => {
    setSearch('')
    router.push('/finanzas/aprovisionamiento')
  }

  const hasFilters = search || estado !== 'all'

  const formatMonto = (monto: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(monto)

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
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
              <div className="h-8 w-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h1 className="text-base font-semibold">Aprovisionamiento Financiero</h1>
                <p className="text-[10px] text-muted-foreground">Previsión de gastos: listas vs pedidos</p>
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
              <Button variant="outline" size="sm" className="h-7 text-xs" asChild>
                <Link href="/finanzas/aprovisionamiento/timeline">
                  <Calendar className="h-3 w-3 mr-1" />
                  Timeline
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* KPIs + navegacion consolidados */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* Listas Tecnicas */}
          <Link href="/finanzas/aprovisionamiento/listas">
            <Card className="border-l-4 border-l-emerald-400 hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 text-emerald-500" />
                    <span className="text-[11px] font-medium text-muted-foreground">Listas</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="text-lg font-bold text-emerald-600">{formatMonto(kpis?.montoTotalListas || 0)}</div>
                <div className="text-[10px] text-muted-foreground">{kpis?.totalListas || 0} listas en {kpis?.totalProyectos || 0} proyectos</div>
              </CardContent>
            </Card>
          </Link>

          {/* Pedidos */}
          <Link href="/finanzas/aprovisionamiento/pedidos">
            <Card className="border-l-4 border-l-purple-400 hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <ShoppingCart className="h-3.5 w-3.5 text-purple-500" />
                    <span className="text-[11px] font-medium text-muted-foreground">Pedidos</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="text-lg font-bold text-purple-600">{formatMonto(kpis?.montoTotalPedidos || 0)}</div>
                <div className="text-[10px] text-muted-foreground">{kpis?.totalPedidos || 0} pedidos</div>
              </CardContent>
            </Card>
          </Link>

          {/* Desviacion (Listas vs Pedidos) */}
          <Card className={`border-l-4 ${desviacion > 5 ? 'border-l-red-400' : desviacion < -5 ? 'border-l-amber-400' : 'border-l-green-400'}`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp className={`h-3.5 w-3.5 ${desviacion > 5 ? 'text-red-500' : desviacion < -5 ? 'text-amber-500' : 'text-green-500'}`} />
                <span className="text-[11px] font-medium text-muted-foreground">Desviacion</span>
              </div>
              <div className={`text-lg font-bold ${desviacion > 5 ? 'text-red-600' : desviacion < -5 ? 'text-amber-600' : 'text-green-600'}`}>
                {desviacion !== 0 ? `${desviacion > 0 ? '+' : ''}${desviacion}%` : '0%'}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {formatMonto(Math.abs((kpis?.montoTotalPedidos || 0) - (kpis?.montoTotalListas || 0)))} diferencia
              </div>
            </CardContent>
          </Card>

          {/* Alertas + Progreso */}
          <Link href="/finanzas/aprovisionamiento/timeline">
            <Card className={`border-l-4 ${(kpis?.totalAlertas || 0) > 0 ? 'border-l-red-400' : 'border-l-green-400'} hover:shadow-md transition-shadow cursor-pointer h-full`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {(kpis?.totalAlertas || 0) > 0
                      ? <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                      : <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    }
                    <span className="text-[11px] font-medium text-muted-foreground">Estado</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={`text-lg font-bold ${(kpis?.totalAlertas || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {kpis?.totalAlertas || 0} alerta{(kpis?.totalAlertas || 0) !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {kpis?.progresoPromedio || 0}% progreso promedio
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                placeholder="Buscar proyecto por nombre, código..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <Select value={estado} onValueChange={handleEstadoChange}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <Filter className="h-3 w-3 mr-1.5 text-gray-400" />
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos</SelectItem>
                <SelectItem value="activo" className="text-xs">Activo</SelectItem>
                <SelectItem value="pausado" className="text-xs">Pausado</SelectItem>
                <SelectItem value="completado" className="text-xs">Completado</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleSearch}>
              Buscar
            </Button>

            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 px-2 text-xs text-red-600">
                <X className="h-3 w-3 mr-1" />
                Limpiar
              </Button>
            )}

            <div className="ml-auto text-xs text-muted-foreground">
              {proyectos.length} de {pagination?.total || 0}
            </div>
          </div>
        </div>

        {/* Tabla de proyectos */}
        <div className="bg-white rounded-lg border overflow-hidden">
          {proyectos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-muted-foreground">
                {hasFilters ? 'No se encontraron proyectos con los filtros aplicados' : 'No hay proyectos con aprovisionamiento'}
              </p>
              {hasFilters && (
                <Button variant="link" size="sm" className="text-xs mt-2" onClick={clearFilters}>
                  Limpiar filtros
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-medium">Proyecto</TableHead>
                  <TableHead className="text-xs font-medium">Cliente</TableHead>
                  <TableHead className="text-xs font-medium w-20">Estado</TableHead>
                  <TableHead className="text-xs font-medium text-right">Pres. Listas</TableHead>
                  <TableHead className="text-xs font-medium text-right">Monto Pedidos</TableHead>
                  <TableHead className="text-xs font-medium text-center w-16">Listas</TableHead>
                  <TableHead className="text-xs font-medium text-center w-16">Pedidos</TableHead>
                  <TableHead className="text-xs font-medium text-center w-16">Alertas</TableHead>
                  <TableHead className="text-xs font-medium text-center w-16">Prog.</TableHead>
                  <TableHead className="text-xs font-medium w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proyectos.map(proy => {
                  const devProy = proy.listas.montoTotal > 0
                    ? Math.round(((proy.pedidos.montoTotal - proy.listas.montoTotal) / proy.listas.montoTotal) * 100)
                    : 0

                  return (
                    <TableRow key={proy.id} className="hover:bg-gray-50/50">
                      <TableCell className="py-2">
                        <div>
                          <p className="text-xs font-medium truncate max-w-[180px]">{proy.nombre}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{proy.codigo}</p>
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-xs truncate max-w-[120px] block">{proy.cliente}</span>
                      </TableCell>
                      <TableCell className="py-2">
                        <Badge className={`text-[10px] h-5 border-0 ${
                          proy.estado === 'activo' ? 'bg-green-100 text-green-700' :
                          proy.estado === 'pausado' ? 'bg-amber-100 text-amber-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {proy.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <span className="text-xs font-medium">{formatMonto(proy.listas.montoTotal)}</span>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <div>
                          <span className="text-xs font-medium">{formatMonto(proy.pedidos.montoTotal)}</span>
                          {devProy !== 0 && (
                            <span className={`text-[10px] ml-1 ${devProy > 5 ? 'text-red-500' : devProy < -5 ? 'text-amber-500' : 'text-green-500'}`}>
                              {devProy > 0 ? '+' : ''}{devProy}%
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">{proy.listas.total}</Badge>
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5">{proy.pedidos.total}</Badge>
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        {proy.alertas > 0 ? (
                          <Badge className="bg-red-100 text-red-700 text-[10px] h-5 px-1.5 border-0">{proy.alertas}</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 text-[10px] h-5 px-1.5 border-0">0</Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <Badge className={`text-[10px] h-5 px-1.5 border-0 ${
                          proy.progreso >= 80 ? 'bg-green-100 text-green-700' :
                          proy.progreso >= 40 ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {proy.progreso}%
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" asChild>
                          <Link href={`/finanzas/aprovisionamiento/proyectos/${proy.id}`}>
                            <Eye className="h-3.5 w-3.5 text-blue-600" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}

          {pagination && pagination.pages > 1 && (
            <div className="flex items-center justify-between px-4 py-2 border-t text-xs text-muted-foreground">
              <span>
                {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.total)} de {pagination.total}
              </span>
              <div className="flex items-center gap-1">
                {pagination.page > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString())
                      params.set('page', String(pagination.page - 1))
                      router.push(`/finanzas/aprovisionamiento?${params.toString()}`)
                    }}
                  >
                    Anterior
                  </Button>
                )}
                <span>Página {pagination.page} de {pagination.pages}</span>
                {pagination.page < pagination.pages && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-6 text-[10px] px-2"
                    onClick={() => {
                      const params = new URLSearchParams(searchParams.toString())
                      params.set('page', String(pagination.page + 1))
                      router.push(`/finanzas/aprovisionamiento?${params.toString()}`)
                    }}
                  >
                    Siguiente
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
