'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  Trophy,
  Target,
  DollarSign,
  Clock,
  Loader2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react'
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

interface Resumen {
  winCount: number
  lossCount: number
  winRate: number
  avgDealSizeWon: number
  avgDealSizeLost: number
  avgTimeToCloseWon: number
  avgTimeToCloseLost: number
}

interface SectorItem {
  sector: string
  ganadas: number
  perdidas: number
  winRate: number
  valorGanado: number
  valorPerdido: number
}

interface ComercialItem {
  comercialId: string | null
  nombre: string
  ganadas: number
  perdidas: number
  winRate: number
  valorGanado: number
}

interface FuenteItem {
  fuente: string
  ganadas: number
  perdidas: number
  winRate: number
}

interface PrioridadItem {
  prioridad: string
  ganadas: number
  perdidas: number
  winRate: number
}

interface RangoValorItem {
  rango: string
  ganadas: number
  perdidas: number
  winRate: number
}

interface MotivoItem {
  motivo: string
  cantidad: number
}

interface CompetidorItem {
  nombre: string
  cantidad: number
}

interface WinLossData {
  resumen: Resumen
  porSector: SectorItem[]
  porComercial: ComercialItem[]
  porFuente: FuenteItem[]
  porPrioridad: PrioridadItem[]
  porRangoValor: RangoValorItem[]
  motivosPerdida: MotivoItem[]
  competidores: CompetidorItem[]
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount)

const PIE_COLORS = ['#22c55e', '#ef4444'] // green-500, red-500
const BAR_GREEN = '#22c55e'
const BAR_RED = '#ef4444'

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function WinLossReportPage() {
  const router = useRouter()

  // Default: last 12 months
  const now = new Date()
  const defaultDesde = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
    .toISOString()
    .split('T')[0]
  const defaultHasta = now.toISOString().split('T')[0]

  const [fechaDesde, setFechaDesde] = useState(defaultDesde)
  const [fechaHasta, setFechaHasta] = useState(defaultHasta)
  const [data, setData] = useState<WinLossData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (fechaDesde) params.set('fechaDesde', fechaDesde)
        if (fechaHasta) params.set('fechaHasta', fechaHasta)
        const response = await fetch(`/api/crm/reportes/win-loss?${params.toString()}`)
        if (!response.ok) throw new Error('Error al cargar datos')
        const json = await response.json()
        setData(json)
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [fechaDesde, fechaHasta])

  // -------------------------------------------------------------------------
  // Loading state
  // -------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="p-4 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // -------------------------------------------------------------------------
  // Error state
  // -------------------------------------------------------------------------
  if (error) {
    return (
      <div className="p-4 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/crm/reportes')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!data) return null

  const { resumen, porSector, porComercial, motivosPerdida, competidores } = data

  // Pie data
  const pieData = [
    { name: 'Ganadas', value: resumen.winCount },
    { name: 'Perdidas', value: resumen.lossCount },
  ]

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Win/Loss Analysis</h1>
          <p className="text-sm text-muted-foreground">
            Analisis de oportunidades ganadas vs perdidas
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => router.push('/crm/reportes')}>
          <ArrowLeft className="h-4 w-4 mr-2" /> Volver
        </Button>
      </div>

      {/* Date range filter */}
      <Card>
        <CardContent className="pt-4 pb-3">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1">
              <Label htmlFor="fechaDesde" className="text-xs">
                Desde
              </Label>
              <Input
                id="fechaDesde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="w-40"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="fechaHasta" className="text-xs">
                Hasta
              </Label>
              <Input
                id="fechaHasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="w-40"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Win Rate */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Trophy className="h-4 w-4 text-green-600" />
              <p className="text-xs text-muted-foreground">Win Rate</p>
            </div>
            <p className="text-2xl font-bold text-green-600">{resumen.winRate}%</p>
            <p className="text-xs text-muted-foreground">
              {resumen.winCount + resumen.lossCount} oportunidades cerradas
            </p>
          </CardContent>
        </Card>

        {/* Ganadas / Perdidas */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Target className="h-4 w-4 text-blue-600" />
              <p className="text-xs text-muted-foreground">Ganadas / Perdidas</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {resumen.winCount} / {resumen.lossCount}
            </p>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              {resumen.winCount >= resumen.lossCount ? (
                <TrendingUp className="h-3 w-3 text-green-500" />
              ) : (
                <TrendingDown className="h-3 w-3 text-red-500" />
              )}
              ratio {resumen.lossCount > 0 ? (resumen.winCount / resumen.lossCount).toFixed(1) : 'N/A'}
            </div>
          </CardContent>
        </Card>

        {/* Avg Deal Ganado */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-emerald-600" />
              <p className="text-xs text-muted-foreground">Avg Deal Ganado</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(resumen.avgDealSizeWon)}
            </p>
            <p className="text-xs text-muted-foreground">
              vs {formatCurrency(resumen.avgDealSizeLost)} perdido
            </p>
          </CardContent>
        </Card>

        {/* Tiempo Cierre Prom. */}
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="h-4 w-4 text-purple-600" />
              <p className="text-xs text-muted-foreground">Tiempo Cierre Prom.</p>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {resumen.avgTimeToCloseWon} dias
            </p>
            <p className="text-xs text-muted-foreground">
              perdidas: {resumen.avgTimeToCloseLost} dias
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Pie Chart: Win / Loss split */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Distribucion Win / Loss</CardTitle>
          </CardHeader>
          <CardContent>
            {resumen.winCount + resumen.lossCount === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sin datos en el periodo seleccionado
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }: any) =>
                      `${name} ${(percent * 100).toFixed(0)}%`
                    }
                  >
                    {pieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Bar Chart: Por Sector */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Por Sector</CardTitle>
          </CardHeader>
          <CardContent>
            {porSector.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sin datos de sector
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(200, porSector.length * 44)}>
                <BarChart data={porSector} layout="vertical" margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="sector"
                    width={120}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="ganadas" name="Ganadas" fill={BAR_GREEN} />
                  <Bar dataKey="perdidas" name="Perdidas" fill={BAR_RED} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bar Chart: Por Comercial */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Por Comercial</CardTitle>
        </CardHeader>
        <CardContent>
          {porComercial.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Sin datos de comerciales
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(200, porComercial.length * 44)}>
              <BarChart data={porComercial} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  width={140}
                  tick={{ fontSize: 12 }}
                />
                <Tooltip />
                <Legend />
                <Bar dataKey="ganadas" name="Ganadas" fill={BAR_GREEN} />
                <Bar dataKey="perdidas" name="Perdidas" fill={BAR_RED} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Lists Row: Motivos de Perdida + Competidores */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Motivos de Perdida */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Motivos de Perdida</CardTitle>
          </CardHeader>
          <CardContent>
            {motivosPerdida.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sin motivos registrados
              </p>
            ) : (
              <div className="space-y-2">
                {motivosPerdida.map((m, index) => {
                  const maxCount = motivosPerdida[0]?.cantidad || 1
                  const barWidth = (m.cantidad / maxCount) * 100
                  return (
                    <div key={m.motivo} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                        {index + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm truncate">{m.motivo}</span>
                          <Badge variant="secondary" className="ml-2 shrink-0">
                            {m.cantidad}
                          </Badge>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-400 rounded-full transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Competidores */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Competidores</CardTitle>
          </CardHeader>
          <CardContent>
            {competidores.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                Sin competidores registrados
              </p>
            ) : (
              <div className="space-y-2">
                {competidores.map((c, index) => {
                  const maxCount = competidores[0]?.cantidad || 1
                  const barWidth = (c.cantidad / maxCount) * 100
                  return (
                    <div key={c.nombre} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-5 text-right shrink-0">
                        {index + 1}.
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm truncate">{c.nombre}</span>
                          <Badge variant="secondary" className="ml-2 shrink-0">
                            {c.cantidad}
                          </Badge>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-400 rounded-full transition-all"
                            style={{ width: `${barWidth}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
