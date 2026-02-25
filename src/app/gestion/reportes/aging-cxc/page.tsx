'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Home,
  ChevronRight,
  Clock,
  Loader2,
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Users,
  Calendar,
  RefreshCw,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import type { AgingResumen, AgingBucket, AgingRow } from '@/lib/utils/agingUtils'
import { BUCKETS, BUCKET_LABELS } from '@/lib/utils/agingUtils'

// ─── Helpers de formato ───

function formatMoneda(n: number, moneda: string = 'PEN'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: moneda === 'USD' ? 'USD' : 'PEN',
    minimumFractionDigits: 2,
  }).format(n)
}

function formatMonedaCorta(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `S/${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `S/${(n / 1_000).toFixed(1)}K`
  return `S/${n.toFixed(0)}`
}

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatDias(dias: number): { texto: string; color: string } {
  if (dias < 0) return { texto: `vence en ${Math.abs(dias)}d`, color: 'text-green-600' }
  if (dias === 0) return { texto: 'vence hoy', color: 'text-yellow-600' }
  if (dias <= 30) return { texto: `${dias}d vencido`, color: 'text-yellow-700' }
  if (dias <= 60) return { texto: `${dias}d vencido`, color: 'text-orange-600' }
  return { texto: `${dias}d vencido`, color: 'text-red-700 font-bold' }
}

const BUCKET_COLORS: Record<AgingBucket, { bg: string; border: string; text: string }> = {
  vigente: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
  '1-30': { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
  '31-60': { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700' },
  '61-90': { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-600' },
  '90+': { bg: 'bg-red-100', border: 'border-red-300', text: 'text-red-800' },
}

const ESTADO_BADGE: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
  parcial: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
  vencida: 'bg-red-100 text-red-700 hover:bg-red-100',
}

// ─── Componente principal ───

export default function AgingCxCPage() {
  const [data, setData] = useState<AgingResumen | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [monedaFiltro, setMonedaFiltro] = useState<'TODAS' | 'PEN' | 'USD'>('TODAS')
  const [expandedClientes, setExpandedClientes] = useState<Set<string>>(new Set())

  const cargarDatos = () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    if (monedaFiltro !== 'TODAS') params.set('moneda', monedaFiltro)
    fetch(`/api/reportes/aging-cxc${params.toString() ? `?${params}` : ''}`)
      .then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}))
          throw new Error(err.error || `Error ${r.status}`)
        }
        return r.json()
      })
      .then((result: AgingResumen) => setData(result))
      .catch(e => setError(e.message || 'Error al cargar datos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    cargarDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [monedaFiltro])

  const toggleExpand = (clienteId: string) => {
    setExpandedClientes(prev => {
      const next = new Set(prev)
      if (next.has(clienteId)) next.delete(clienteId)
      else next.add(clienteId)
      return next
    })
  }

  const tieneMultiplesBuckets = data
    ? data.grafico.filter(g => g.PEN > 0 || g.USD > 0).length > 1
    : false

  return (
    <div className="p-4 space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors">
          <Home className="h-3.5 w-3.5" />
        </Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/gestion" className="hover:text-foreground transition-colors">Gestión</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/gestion/reportes" className="hover:text-foreground transition-colors">Reportes</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Aging CxC</span>
      </nav>

      {/* Header + filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Aging de Cuentas por Cobrar</h1>
          <p className="text-sm text-muted-foreground">
            Antigüedad de saldos pendientes
            {data ? ` al ${formatFecha(data.fechaCorte)}` : ''}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={monedaFiltro}
            onValueChange={(v) => setMonedaFiltro(v as 'TODAS' | 'PEN' | 'USD')}
          >
            <SelectTrigger className="w-[130px] text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="TODAS" className="text-xs">Todas las monedas</SelectItem>
              <SelectItem value="PEN" className="text-xs">Solo PEN</SelectItem>
              <SelectItem value="USD" className="text-xs">Solo USD</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="sm"
            onClick={cargarDatos}
            disabled={loading}
            className="h-8 text-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {data && !loading && data.totalDocumentos === 0 && (
        <Card>
          <CardContent className="p-16 text-center">
            <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">Sin cuentas pendientes</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Todas las cuentas por cobrar están al día. No hay saldos pendientes de cobro.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Data loaded */}
      {data && !loading && data.totalDocumentos > 0 && (
        <>
          {/* Badges resumen */}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <Badge variant="outline" className="gap-1">
              <FileText className="h-3 w-3" />
              {data.totalDocumentos} documentos
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Users className="h-3 w-3" />
              {data.totalClientes} clientes
            </Badge>
            <Badge variant="outline" className="gap-1">
              <Calendar className="h-3 w-3" />
              Corte: {formatFecha(data.fechaCorte)}
            </Badge>
          </div>

          {/* Cards por bucket */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {BUCKETS.map(b => {
              const colors = BUCKET_COLORS[b]
              const penVal = data.totales.PEN[b]
              const usdVal = data.totales.USD[b]
              const hasValue = penVal > 0 || usdVal > 0
              return (
                <Card key={b} className={`border ${hasValue ? colors.border : ''}`}>
                  <CardContent className={`p-3 ${hasValue ? colors.bg : ''}`}>
                    <p className={`text-xs font-medium mb-1 ${hasValue ? colors.text : 'text-muted-foreground'}`}>
                      {BUCKET_LABELS[b]}
                    </p>
                    {hasValue ? (
                      <div className="space-y-0.5">
                        {penVal > 0 && (
                          <p className={`text-sm font-bold font-mono ${colors.text}`}>
                            {formatMoneda(penVal, 'PEN')}
                          </p>
                        )}
                        {usdVal > 0 && (
                          <p className={`text-sm font-bold font-mono ${colors.text}`}>
                            {formatMoneda(usdVal, 'USD')}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm font-mono text-muted-foreground">—</p>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* Gráfico stacked bar */}
          {tieneMultiplesBuckets && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Distribución por Antigüedad</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={data.grafico} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="bucket" tick={{ fontSize: 11 }} />
                    <YAxis tickFormatter={(v: number) => formatMonedaCorta(v)} width={70} tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value: number, name: string) => [formatMoneda(value, name === 'USD' ? 'USD' : 'PEN'), name]} />
                    <Legend />
                    <Bar dataKey="PEN" name="PEN" fill="#3B82F6" stackId="a" />
                    <Bar dataKey="USDenPEN" name="USD (en PEN)" fill="#10B981" stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Tabla principal */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Aging por Cliente</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[200px]">Cliente</TableHead>
                      {BUCKETS.map(b => (
                        <TableHead key={b} className="text-right min-w-[100px]">
                          {BUCKET_LABELS[b]}
                        </TableHead>
                      ))}
                      <TableHead className="text-right min-w-[110px] font-bold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.filas.map(fila => (
                      <ClienteRow
                        key={fila.clienteId}
                        fila={fila}
                        expanded={expandedClientes.has(fila.clienteId)}
                        onToggle={() => toggleExpand(fila.clienteId)}
                        monedaFiltro={monedaFiltro}
                      />
                    ))}
                    {/* Fila de totales */}
                    <TableRow className="bg-muted/60 font-bold border-t-2">
                      <TableCell className="text-sm">TOTAL GENERAL</TableCell>
                      {BUCKETS.map(b => (
                        <TableCell key={b} className="text-right">
                          <BucketCellValue
                            pen={data.totales.PEN[b]}
                            usd={data.totales.USD[b]}
                            monedaFiltro={monedaFiltro}
                            bold
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <BucketCellValue
                          pen={data.totales.PEN.total}
                          usd={data.totales.USD.total}
                          monedaFiltro={monedaFiltro}
                          bold
                        />
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ─── Sub-componentes ───

function BucketCellValue({
  pen,
  usd,
  monedaFiltro,
  bold,
}: {
  pen: number
  usd: number
  monedaFiltro: 'TODAS' | 'PEN' | 'USD'
  bold?: boolean
}) {
  const cls = `text-xs font-mono ${bold ? 'font-bold' : ''}`
  const showPen = monedaFiltro !== 'USD' && pen > 0
  const showUsd = monedaFiltro !== 'PEN' && usd > 0

  if (!showPen && !showUsd) return <span className="text-xs text-muted-foreground">—</span>

  return (
    <div className="space-y-0.5">
      {showPen && <p className={cls}>{formatMoneda(pen, 'PEN')}</p>}
      {showUsd && <p className={`${cls} text-emerald-700`}>{formatMoneda(usd, 'USD')}</p>}
    </div>
  )
}

function ClienteRow({
  fila,
  expanded,
  onToggle,
  monedaFiltro,
}: {
  fila: AgingRow
  expanded: boolean
  onToggle: () => void
  monedaFiltro: 'TODAS' | 'PEN' | 'USD'
}) {
  return (
    <>
      <TableRow
        className="cursor-pointer hover:bg-muted/40"
        onClick={onToggle}
      >
        <TableCell className="text-sm">
          <div className="flex items-center gap-1.5">
            {expanded
              ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
            <span className="font-medium">{fila.clienteNombre}</span>
            <Badge variant="outline" className="text-[9px] ml-1">
              {fila.documentos.length} doc
            </Badge>
          </div>
        </TableCell>
        {BUCKETS.map(b => (
          <TableCell key={b} className="text-right">
            <BucketCellValue
              pen={fila.PEN[b]}
              usd={fila.USD[b]}
              monedaFiltro={monedaFiltro}
            />
          </TableCell>
        ))}
        <TableCell className="text-right">
          <BucketCellValue
            pen={fila.totalPEN}
            usd={fila.totalUSD}
            monedaFiltro={monedaFiltro}
            bold
          />
        </TableCell>
      </TableRow>

      {/* Sub-tabla de documentos expandida */}
      {expanded && (
        <TableRow>
          <TableCell colSpan={7} className="p-0 bg-muted/20">
            <div className="px-6 py-2">
              <Table>
                <TableHeader>
                  <TableRow className="text-[10px]">
                    <TableHead>Nro Doc</TableHead>
                    <TableHead>Proyecto</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-right">Saldo</TableHead>
                    <TableHead className="text-center">F. Emisión</TableHead>
                    <TableHead className="text-center">F. Vencimiento</TableHead>
                    <TableHead className="text-center">Días</TableHead>
                    <TableHead className="text-center">Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fila.documentos.map(doc => {
                    const diasInfo = formatDias(doc.diasVencido)
                    return (
                      <TableRow key={doc.id} className="text-xs">
                        <TableCell className="font-mono text-xs">
                          {doc.numeroDocumento || '—'}
                        </TableCell>
                        <TableCell>
                          <span className="text-muted-foreground">{doc.proyectoCodigo}</span>
                          {' '}
                          <span className="hidden sm:inline">{doc.proyectoNombre}</span>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {formatMoneda(doc.monto, doc.moneda)}
                        </TableCell>
                        <TableCell className="text-right font-mono font-medium">
                          {formatMoneda(doc.saldoPendiente, doc.moneda)}
                        </TableCell>
                        <TableCell className="text-center">
                          {formatFecha(doc.fechaEmision)}
                        </TableCell>
                        <TableCell className="text-center">
                          {formatFecha(doc.fechaVencimiento)}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={diasInfo.color}>{diasInfo.texto}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className={`text-[9px] ${ESTADO_BADGE[doc.estado] || ''}`}>
                            {doc.estado}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}
