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
  Filter,
  ClipboardList,
  Receipt,
  Wallet,
  Truck,
  Banknote,
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

interface PipelineKPI {
  count: number
  monto: number
}

interface PipelineResponse {
  listasSinPedido: PipelineKPI
  pedidosSinOC: PipelineKPI
  ocsSinRecepcion: PipelineKPI
  ocsSinFactura: PipelineKPI
  facturasSinPagar: PipelineKPI
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
  const [pipeline, setPipeline] = useState<PipelineResponse | null>(null)
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

      const [resProyectos, resPipeline] = await Promise.all([
        fetch(buildApiUrl(`/api/finanzas/aprovisionamiento/proyectos?${params.toString()}`)),
        fetch(buildApiUrl('/api/finanzas/aprovisionamiento/pipeline')),
      ])
      if (!resProyectos.ok) throw new Error('Error al cargar datos')
      const json: ConsolidatedResponse = await resProyectos.json()
      setData(json)
      if (resPipeline.ok) {
        const pipelineJson: PipelineResponse = await resPipeline.json()
        setPipeline(pipelineJson)
      }
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

  const formatMonto = (monto: number, moneda: string = 'USD') =>
    new Intl.NumberFormat(moneda === 'PEN' ? 'es-PE' : 'en-US', {
      style: 'currency',
      currency: moneda,
      maximumFractionDigits: 0,
    }).format(monto)

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
        {/* Flujo financiero: Listas → Pedidos → OCs → Facturado → Pagado / Pendiente */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. Listas */}
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
                <div className="text-base font-bold text-emerald-600">{formatMonto(kpis?.montoTotalListas || 0)}</div>
                <div className="text-[10px] text-muted-foreground">{kpis?.totalListas || 0} listas</div>
              </CardContent>
            </Card>
          </Link>

          {/* 2. Pedidos */}
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
                <div className="text-base font-bold text-purple-600">{formatMonto(kpis?.montoTotalPedidos || 0)}</div>
                <div className="text-[10px] text-muted-foreground">{kpis?.totalPedidos || 0} pedidos</div>
              </CardContent>
            </Card>
          </Link>

          {/* 3. Comprometido (OCs activas) */}
          <Link href="/logistica/ordenes-compra">
            <Card className="border-l-4 border-l-blue-400 hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <ClipboardList className="h-3.5 w-3.5 text-blue-500" />
                    <span className="text-[11px] font-medium text-muted-foreground">Comprometido</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="text-base font-bold text-blue-600">{formatMonto(kpis?.montoComprometido || 0)}</div>
                <div className="text-[10px] text-muted-foreground">{kpis?.totalOrdenes || 0} OCs activas</div>
              </CardContent>
            </Card>
          </Link>

          {/* 4. Facturado */}
          <Link href="/administracion/cuentas-pagar">
            <Card className="border-l-4 border-l-indigo-400 hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <Receipt className="h-3.5 w-3.5 text-indigo-500" />
                    <span className="text-[11px] font-medium text-muted-foreground">Facturado</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="text-base font-bold text-indigo-600">{formatMonto(kpis?.montoFacturado || 0)}</div>
                <div className="text-[10px] text-muted-foreground">{kpis?.totalFacturas || 0} facturas</div>
              </CardContent>
            </Card>
          </Link>

          {/* 5. Pagado */}
          <Card className="border-l-4 border-l-green-400">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Wallet className="h-3.5 w-3.5 text-green-500" />
                <span className="text-[11px] font-medium text-muted-foreground">Pagado</span>
              </div>
              <div className="text-base font-bold text-green-600">{formatMonto(kpis?.montoPagado || 0)}</div>
              <div className="text-[10px] text-muted-foreground">
                {kpis?.montoFacturado
                  ? `${Math.round(((kpis.montoPagado || 0) / kpis.montoFacturado) * 100)}% del facturado`
                  : 'sin facturas'}
              </div>
            </CardContent>
          </Card>

          {/* 6. Pendiente de pago */}
          <Card className={`border-l-4 ${(kpis?.saldoPendientePago || 0) > 0 ? 'border-l-amber-400' : 'border-l-gray-300'}`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Banknote className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-[11px] font-medium text-muted-foreground">Pendiente</span>
              </div>
              <div className="text-base font-bold text-amber-600">{formatMonto(kpis?.saldoPendientePago || 0)}</div>
              <div className="text-[10px] text-muted-foreground">por pagar</div>
            </CardContent>
          </Card>
        </div>

        {/* Pipeline: qué quedó stuck en cada etapa */}
        <Card>
          <CardContent className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Pipeline · pendientes en cada etapa
                </span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <AlertTriangle className="h-3 w-3" /> Indica posibles cuellos de botella
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <PipelineItem
                icon={<FileText className="h-3 w-3" />}
                label="Listas sin pedido"
                count={pipeline?.listasSinPedido.count}
                monto={pipeline?.listasSinPedido.monto}
                formatMonto={formatMonto}
                href="/finanzas/aprovisionamiento/listas?sinPedido=1"
              />
              <PipelineItem
                icon={<ShoppingCart className="h-3 w-3" />}
                label="Pedidos sin OC"
                count={pipeline?.pedidosSinOC.count}
                monto={pipeline?.pedidosSinOC.monto}
                formatMonto={formatMonto}
                href="/finanzas/aprovisionamiento/pedidos?sinOC=1"
              />
              <PipelineItem
                icon={<Truck className="h-3 w-3" />}
                label="OCs sin recepción"
                count={pipeline?.ocsSinRecepcion.count}
                monto={pipeline?.ocsSinRecepcion.monto}
                formatMonto={formatMonto}
                href="/logistica/ordenes-compra?estado=confirmada"
              />
              <PipelineItem
                icon={<Receipt className="h-3 w-3" />}
                label="OCs sin factura"
                count={pipeline?.ocsSinFactura.count}
                monto={pipeline?.ocsSinFactura.monto}
                formatMonto={formatMonto}
                href="/logistica/ordenes-compra?estado=completada"
              />
              <PipelineItem
                icon={<Banknote className="h-3 w-3" />}
                label="Facturas sin pagar"
                count={pipeline?.facturasSinPagar.count}
                monto={pipeline?.facturasSinPagar.monto}
                formatMonto={formatMonto}
                href="/administracion/cuentas-pagar"
                tone="warn"
              />
            </div>
          </CardContent>
        </Card>

        {/* Desviación + alertas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Card className={`border-l-4 ${desviacion > 5 ? 'border-l-red-400' : desviacion < -5 ? 'border-l-amber-400' : 'border-l-green-400'}`}>
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <TrendingUp className={`h-3.5 w-3.5 ${desviacion > 5 ? 'text-red-500' : desviacion < -5 ? 'text-amber-500' : 'text-green-500'}`} />
                <span className="text-[11px] font-medium text-muted-foreground">Desviación pedidos vs listas</span>
              </div>
              <div className={`text-lg font-bold ${desviacion > 5 ? 'text-red-600' : desviacion < -5 ? 'text-amber-600' : 'text-green-600'}`}>
                {desviacion !== 0 ? `${desviacion > 0 ? '+' : ''}${desviacion}%` : '0%'}
              </div>
              <div className="text-[10px] text-muted-foreground">
                {formatMonto(Math.abs((kpis?.montoTotalPedidos || 0) - (kpis?.montoTotalListas || 0)))} de diferencia
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-orange-400">
            <CardContent className="p-3">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Truck className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-[11px] font-medium text-muted-foreground">Recepciones pendientes</span>
              </div>
              <div className="text-lg font-bold text-orange-600">{kpis?.recepcionesPendientes || 0}</div>
              <div className="text-[10px] text-muted-foreground">items por recibir/almacenar</div>
            </CardContent>
          </Card>

          <Link href="/finanzas/aprovisionamiento/timeline">
            <Card className={`border-l-4 ${(kpis?.totalAlertas || 0) > 0 ? 'border-l-red-400' : 'border-l-green-400'} hover:shadow-md transition-shadow cursor-pointer h-full`}>
              <CardContent className="p-3">
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5">
                    {(kpis?.totalAlertas || 0) > 0
                      ? <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                      : <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                    }
                    <span className="text-[11px] font-medium text-muted-foreground">Alertas / progreso</span>
                  </div>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
                <div className="text-lg font-bold">
                  <span className={(kpis?.totalAlertas || 0) > 0 ? 'text-red-600' : 'text-green-600'}>
                    {kpis?.totalAlertas || 0} alertas
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
                        <span className="text-xs font-medium">{formatMonto(proy.listas.montoTotal, proy.moneda)}</span>
                      </TableCell>
                      <TableCell className="py-2 text-right">
                        <div>
                          <span className="text-xs font-medium">{formatMonto(proy.pedidos.montoTotal, proy.moneda)}</span>
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

interface PipelineItemProps {
  icon: React.ReactNode
  label: string
  count: number | undefined
  monto: number | undefined
  formatMonto: (n: number, m?: string) => string
  href: string
  tone?: 'default' | 'warn'
}

function PipelineItem({ icon, label, count, monto, formatMonto, href, tone = 'default' }: PipelineItemProps) {
  const c = count ?? 0
  const m = monto ?? 0
  const isEmpty = c === 0
  return (
    <Link href={href}>
      <div
        className={`rounded-md border p-2 transition-colors hover:bg-muted/40 cursor-pointer ${
          isEmpty ? 'opacity-60' : tone === 'warn' && c > 0 ? 'border-amber-300 bg-amber-50/30' : ''
        }`}
      >
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mb-0.5">
          {icon}
          <span className="truncate">{label}</span>
        </div>
        <div className="text-base font-bold leading-tight">{c}</div>
        <div className="text-[10px] text-muted-foreground font-mono">
          {m > 0 ? formatMonto(m) : '—'}
        </div>
      </div>
    </Link>
  )
}
