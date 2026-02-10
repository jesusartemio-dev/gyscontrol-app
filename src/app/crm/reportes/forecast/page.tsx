'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import {
  ArrowLeft,
  DollarSign,
  TrendingUp,
  Target,
  CheckCircle,
  Loader2,
  BarChart3,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface OportunidadForecast {
  id: string
  nombre: string
  cliente: { nombre: string }
  valorEstimado: number
  probabilidad: number
  estado: string
  fechaCierreEstimada: string | null
}

interface MesBucket {
  mes: string
  mesLabel: string
  count: number
  valorBruto: number
  valorPonderado: number
  oportunidades: OportunidadForecast[]
}

interface Resumen {
  totalBruto: number
  totalPonderado: number
  oportunidadesActivas: number
  valorRealGanado: number
  precisionEstimada: number | null
}

interface Comercial {
  id: string
  name: string | null
}

interface ForecastData {
  forecast: MesBucket[]
  resumen: Resumen
  comerciales: Comercial[]
}

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount)

export default function ForecastReportPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<ForecastData | null>(null)
  const [comercialId, setComercialId] = useState<string>('todos')

  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams()
        if (comercialId && comercialId !== 'todos') {
          params.set('comercialId', comercialId)
        }
        const response = await fetch(`/api/crm/reportes/forecast?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Error al cargar datos del forecast')
        }
        const json = await response.json()
        setData(json)
      } catch (err) {
        console.error('Error loading forecast data:', err)
        setError(err instanceof Error ? err.message : 'Error desconocido')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [comercialId])

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-8" />
          <div>
            <Skeleton className="h-7 w-56" />
            <Skeleton className="h-4 w-72 mt-1" />
          </div>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="pt-4 pb-3">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-32 mt-1" />
                <Skeleton className="h-3 w-20 mt-1" />
              </CardContent>
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="pt-6">
            <Skeleton className="h-[350px] w-full" />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 space-y-4">
        <Button variant="ghost" size="sm" onClick={() => router.push('/crm/reportes')}>
          <ArrowLeft className="h-4 w-4 mr-1" />
          Volver
        </Button>
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!data) return null

  const { forecast, resumen, comerciales } = data

  // Chart data (exclude "Sin Fecha" from the chart)
  const chartData = forecast
    .filter((b) => b.mes !== 'Sin Fecha')
    .map((b) => ({
      mesLabel: b.mesLabel,
      valorBruto: Math.round(b.valorBruto),
      valorPonderado: Math.round(b.valorPonderado),
    }))

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/crm/reportes')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Forecast Ponderado</h1>
            <p className="text-sm text-muted-foreground">
              Proyeccion de ingresos por probabilidad
            </p>
          </div>
        </div>
        <div className="w-48">
          <Select value={comercialId} onValueChange={setComercialId}>
            <SelectTrigger>
              <SelectValue placeholder="Comercial" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos</SelectItem>
              {comerciales.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name || 'Sin nombre'}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <p className="text-xs text-muted-foreground">Pipeline Total</p>
            </div>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(resumen.totalBruto)}
            </p>
            <p className="text-xs text-muted-foreground">valor bruto</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <p className="text-xs text-muted-foreground">Valor Ponderado</p>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(resumen.totalPonderado)}
            </p>
            <p className="text-xs text-muted-foreground">por probabilidad</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-purple-500" />
              <p className="text-xs text-muted-foreground">Oportunidades</p>
            </div>
            <p className="text-2xl font-bold text-purple-600">
              {resumen.oportunidadesActivas}
            </p>
            <p className="text-xs text-muted-foreground">activas en pipeline</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <p className="text-xs text-muted-foreground">Ganado (3 meses)</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">
              {formatCurrency(resumen.valorRealGanado)}
            </p>
            <p className="text-xs text-muted-foreground">valor real cerrado</p>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Forecast por Mes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-16">
              Sin datos para el periodo seleccionado
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="mesLabel" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) =>
                    value >= 1000 ? `$${(value / 1000).toFixed(0)}k` : `$${value}`
                  }
                />
                <Tooltip
                  formatter={(value: number, name: string) => [
                    formatCurrency(value),
                    name === 'valorBruto' ? 'Valor Bruto' : 'Valor Ponderado',
                  ]}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Legend
                  formatter={(value: string) =>
                    value === 'valorBruto' ? 'Valor Bruto' : 'Valor Ponderado'
                  }
                />
                <Bar dataKey="valorBruto" fill="#cbd5e1" name="valorBruto" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="valorPonderado"
                  fill="#3b82f6"
                  name="valorPonderado"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Detail Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Detalle por Mes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {forecast.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Sin oportunidades activas en el forecast
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Mes</th>
                    <th className="text-right p-3 font-medium">Oportunidades</th>
                    <th className="text-right p-3 font-medium">Valor Bruto</th>
                    <th className="text-right p-3 font-medium">Valor Ponderado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {forecast.map((bucket) => (
                    <tr key={bucket.mes} className="hover:bg-muted/30">
                      <td className="p-3 font-medium">{bucket.mesLabel}</td>
                      <td className="p-3 text-right">{bucket.count}</td>
                      <td className="p-3 text-right">{formatCurrency(bucket.valorBruto)}</td>
                      <td className="p-3 text-right text-blue-600 font-medium">
                        {formatCurrency(bucket.valorPonderado)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-muted/30 font-semibold">
                  <tr>
                    <td className="p-3">Total</td>
                    <td className="p-3 text-right">{resumen.oportunidadesActivas}</td>
                    <td className="p-3 text-right">{formatCurrency(resumen.totalBruto)}</td>
                    <td className="p-3 text-right text-blue-600">
                      {formatCurrency(resumen.totalPonderado)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
