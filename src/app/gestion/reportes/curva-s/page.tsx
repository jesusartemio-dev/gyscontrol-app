'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Home,
  ChevronRight,
  TrendingUp,
  Loader2,
  DollarSign,
  Calendar,
  Activity,
  AlertTriangle,
} from 'lucide-react'
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import type { CurvaSResult } from '@/lib/utils/curvaS'

// ─── Helpers de formato ───

function formatMoneda(n: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(n)
}

function formatMonedaCorta(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

// ─── Tipos ───

interface ProyectoLight {
  id: string
  codigo: string
  nombre: string
  cotizacionId: string | null
}

// ─── Componente principal ───

export default function CurvaSPage() {
  const [proyectos, setProyectos] = useState<ProyectoLight[]>([])
  const [proyectoId, setProyectoId] = useState('')
  const [data, setData] = useState<CurvaSResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingProyectos, setLoadingProyectos] = useState(true)
  const [error, setError] = useState('')

  // Cargar lista de proyectos con cotización
  useEffect(() => {
    setLoadingProyectos(true)
    fetch('/api/proyectos?fields=id,codigo,nombre')
      .then(r => r.json())
      .then((list: ProyectoLight[]) => {
        const conCotizacion = (Array.isArray(list) ? list : []).filter(p => p.cotizacionId)
        setProyectos(conCotizacion)
      })
      .catch(() => setProyectos([]))
      .finally(() => setLoadingProyectos(false))
  }, [])

  // Cargar datos de Curva S al seleccionar proyecto
  useEffect(() => {
    if (!proyectoId) {
      setData(null)
      setError('')
      return
    }
    setLoading(true)
    setError('')
    setData(null)
    fetch(`/api/proyectos/${proyectoId}/curva-s`)
      .then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}))
          throw new Error(err.error || `Error ${r.status}`)
        }
        return r.json()
      })
      .then((result: CurvaSResult) => setData(result))
      .catch(e => setError(e.message || 'Error al cargar datos'))
      .finally(() => setLoading(false))
  }, [proyectoId])

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
        <span className="text-foreground font-medium">Curva S</span>
      </nav>

      {/* Header + Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Curva S — Earned Value</h1>
          <p className="text-sm text-muted-foreground">
            Avance planificado vs real por semana
          </p>
        </div>

        <Select
          value={proyectoId}
          onValueChange={setProyectoId}
          disabled={loadingProyectos}
        >
          <SelectTrigger className="w-[320px] text-xs h-9">
            <SelectValue placeholder={loadingProyectos ? 'Cargando proyectos...' : 'Seleccionar proyecto...'} />
          </SelectTrigger>
          <SelectContent>
            {proyectos.map(p => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                {p.codigo} — {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error state */}
      {error && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Placeholder state */}
      {!proyectoId && !loading && (
        <Card>
          <CardContent className="p-16 text-center">
            <TrendingUp className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">Selecciona un proyecto</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Compara el avance planificado (línea base del cronograma) vs el valor real
              ejecutado semana a semana.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Data loaded */}
      {data && !loading && (
        <>
          {/* Banner hasBaseline warning */}
          {!data.hasBaseline && (
            <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">Sin línea base.</span>{' '}
                Este proyecto no tiene cronograma marcado como línea base.
                Se usa el cronograma más reciente como referencia.
                Para resultados precisos, marca un cronograma como línea base
                en la sección de Cronograma del proyecto.
              </div>
            </div>
          )}

          {/* Chart */}
          {data.weeks.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  {data.proyecto.codigo} — Curva S
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={420}>
                  <ComposedChart data={data.weeks} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis
                      dataKey="weekLabel"
                      tick={{ fontSize: 11 }}
                      interval="preserveStartEnd"
                      tickFormatter={(val: string, idx: number) =>
                        data.weeks.length > 30 ? (idx % 4 === 0 ? val : '') : val
                      }
                    />
                    <YAxis
                      tickFormatter={(v: number) => formatMonedaCorta(v)}
                      width={70}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [formatMoneda(value), name]}
                      labelFormatter={(label: string) => `Semana del ${label}`}
                    />
                    <Legend verticalAlign="top" />

                    {/* PV — Planificado (azul punteada) */}
                    <Line
                      type="monotone"
                      dataKey="pvAcum"
                      name="Planificado (PV)"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={false}
                      connectNulls
                    />

                    {/* EV — Real ejecutado (verde sólida) */}
                    <Line
                      type="monotone"
                      dataKey="evAcum"
                      name="Real ejecutado (EV)"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      dot={false}
                      connectNulls
                    />

                    {/* BAC — Presupuesto total (gris horizontal) */}
                    {data.bac > 0 && (
                      <ReferenceLine
                        y={data.bac}
                        stroke="#9CA3AF"
                        strokeDasharray="4 2"
                        label={{
                          value: `BAC ${formatMonedaCorta(data.bac)}`,
                          position: 'insideTopRight',
                          fill: '#6B7280',
                          fontSize: 11,
                        }}
                      />
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Sin datos suficientes para generar la curva.
                  Verifica que el proyecto tenga cronograma con tareas y/o valorizaciones aprobadas.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <SummaryCard
              icon={DollarSign}
              iconColor="text-gray-500"
              label="Presupuesto Total (BAC)"
              value={formatMoneda(data.bac)}
            />
            <SummaryCard
              icon={Calendar}
              iconColor="text-blue-500"
              label="Planificado a la fecha (PV)"
              value={formatMoneda(data.evm.pvTotal)}
            />
            <SummaryCard
              icon={TrendingUp}
              iconColor="text-emerald-500"
              label="Real ejecutado (EV)"
              value={formatMoneda(data.evm.evTotal)}
            />
            <SPICard spi={data.evm.spi} />
          </div>

          {/* Schedule Variance Table */}
          {(data.evm.pvTotal > 0 || data.evm.evTotal > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Variación de Cronograma (EVM)</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Métrica</TableHead>
                      <TableHead className="text-right">Valor</TableHead>
                      <TableHead className="text-center">Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="text-sm">Schedule Variance (SV)</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatMoneda(data.evm.sv)}
                      </TableCell>
                      <TableCell className="text-center">
                        {data.evm.sv >= 0 ? (
                          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 text-xs">En tiempo</Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-700 hover:bg-red-100 text-xs">Retrasado</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-sm">SV %</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {data.evm.pvTotal > 0
                          ? `${((data.evm.sv / data.evm.pvTotal) * 100).toFixed(1)}%`
                          : '—'}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-sm">SPI (Schedule Performance Index)</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {data.evm.spi !== null ? data.evm.spi.toFixed(2) : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        {data.evm.spi !== null && (
                          <Badge className={`text-xs ${spiColor(data.evm.spi).badge}`}>
                            {data.evm.spi >= 1 ? 'Adelantado' : data.evm.spi >= 0.9 ? 'Leve retraso' : 'Retrasado'}
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-sm">EV acumulado</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatMoneda(data.evm.evTotal)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-sm">PV a la fecha</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatMoneda(data.evm.pvTotal)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                    <TableRow>
                      <TableCell className="text-sm">BAC (Presupuesto Total)</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatMoneda(data.evm.bac)}
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}

// ─── Sub-components ───

function SummaryCard({
  icon: Icon,
  iconColor,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  label: string
  value: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${iconColor}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-lg font-bold font-mono">{value}</p>
      </CardContent>
    </Card>
  )
}

function spiColor(spi: number) {
  if (spi >= 1.0) return { bg: 'bg-green-50', text: 'text-green-700', badge: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-100' }
  if (spi >= 0.9) return { bg: 'bg-yellow-50', text: 'text-yellow-700', badge: 'bg-yellow-100 text-yellow-700 hover:bg-yellow-100' }
  return { bg: 'bg-red-50', text: 'text-red-700', badge: 'bg-red-100 text-red-700 hover:bg-red-100' }
}

function SPICard({ spi }: { spi: number | null }) {
  const colors = spi !== null ? spiColor(spi) : { bg: 'bg-gray-50', text: 'text-gray-500', badge: '' }
  return (
    <Card className={spi !== null ? colors.bg : ''}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          <Activity className={`h-4 w-4 ${spi !== null ? colors.text : 'text-gray-400'}`} />
          <span className="text-xs text-muted-foreground">Índice de Performance (SPI)</span>
        </div>
        <p className={`text-2xl font-bold font-mono ${spi !== null ? colors.text : 'text-gray-400'}`}>
          {spi !== null ? spi.toFixed(2) : '—'}
        </p>
        {spi !== null && (
          <p className={`text-xs ${colors.text}`}>
            {spi >= 1.0 ? 'En tiempo o adelantado' : spi >= 0.9 ? 'Leve retraso' : 'Retraso significativo'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
