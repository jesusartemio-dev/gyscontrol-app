'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DollarSign,
  Zap,
  TrendingUp,
  BarChart3,
  RefreshCw,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface UsageStats {
  resumen: {
    costoTotal: number
    llamadasTotal: number
    tokensInputTotal: number
    tokensOutputTotal: number
  }
  porDia: Array<{ fecha: string; costo: number; llamadas: number }>
  porTipo: Array<{ tipo: string; costo: number; llamadas: number }>
  porModelo: Array<{ modelo: string; costo: number; llamadas: number }>
  porUsuario: Array<{ userId: string; nombre: string; costo: number; llamadas: number }>
}

type Periodo = 'hoy' | 'semana' | 'mes'

export default function UsoIAPage() {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/agente/usage?periodo=${periodo}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Error ${res.status}`)
      }
      setStats(await res.json())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const promedioDiario = stats && stats.porDia.length > 0
    ? stats.resumen.costoTotal / stats.porDia.length
    : 0

  const costoHoy = stats?.porDia.find(
    (d) => d.fecha === new Date().toISOString().split('T')[0]
  )?.costo ?? 0

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Uso de IA</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Monitoreo de costos y consumo de la API de Claude
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="hoy">Hoy</SelectItem>
              <SelectItem value="semana">Esta semana</SelectItem>
              <SelectItem value="mes">Este mes</SelectItem>
            </SelectContent>
          </Select>
          <button
            onClick={fetchStats}
            disabled={loading}
            className="p-2 rounded-lg border hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Costo {periodo === 'hoy' ? 'hoy' : periodo === 'semana' ? 'esta semana' : 'este mes'}
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.resumen.costoTotal.toFixed(2) ?? '—'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Llamadas
            </CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.resumen.llamadasTotal ?? '—'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Costo hoy
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${costoHoy.toFixed(2)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Promedio diario
            </CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${promedioDiario.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart: Cost per day */}
      {stats && stats.porDia.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Costo por día (USD)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.porDia}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="fecha"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => {
                      const parts = v.split('-')
                      return `${parts[2]}/${parts[1]}`
                    }}
                  />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `$${v.toFixed(1)}`} />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toFixed(3)}`, 'Costo']}
                    labelFormatter={(label: string) => `Fecha: ${label}`}
                  />
                  <Bar dataKey="costo" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* By type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por tipo de operación</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Tipo</th>
                  <th className="pb-2 font-medium text-right">Llamadas</th>
                  <th className="pb-2 font-medium text-right">Costo</th>
                </tr>
              </thead>
              <tbody>
                {stats?.porTipo.map((row) => (
                  <tr key={row.tipo} className="border-b last:border-0">
                    <td className="py-2">
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                        {row.tipo}
                      </span>
                    </td>
                    <td className="py-2 text-right">{row.llamadas}</td>
                    <td className="py-2 text-right font-medium">${row.costo.toFixed(3)}</td>
                  </tr>
                ))}
                {(!stats || stats.porTipo.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-muted-foreground">
                      Sin datos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* By model */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por modelo</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Modelo</th>
                  <th className="pb-2 font-medium text-right">Llamadas</th>
                  <th className="pb-2 font-medium text-right">Costo</th>
                </tr>
              </thead>
              <tbody>
                {stats?.porModelo.map((row) => (
                  <tr key={row.modelo} className="border-b last:border-0">
                    <td className="py-2">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ${
                        row.modelo === 'Sonnet'
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {row.modelo}
                      </span>
                    </td>
                    <td className="py-2 text-right">{row.llamadas}</td>
                    <td className="py-2 text-right font-medium">${row.costo.toFixed(3)}</td>
                  </tr>
                ))}
                {(!stats || stats.porModelo.length === 0) && (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-muted-foreground">
                      Sin datos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {/* By user */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Por usuario</CardTitle>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-muted-foreground">
                  <th className="pb-2 font-medium">Usuario</th>
                  <th className="pb-2 font-medium text-right">Llamadas</th>
                  <th className="pb-2 font-medium text-right">Costo</th>
                  <th className="pb-2 font-medium text-right">% del total</th>
                </tr>
              </thead>
              <tbody>
                {stats?.porUsuario.map((row) => (
                  <tr key={row.userId} className="border-b last:border-0">
                    <td className="py-2 font-medium">{row.nombre}</td>
                    <td className="py-2 text-right">{row.llamadas}</td>
                    <td className="py-2 text-right font-medium">${row.costo.toFixed(3)}</td>
                    <td className="py-2 text-right text-muted-foreground">
                      {stats.resumen.costoTotal > 0
                        ? ((row.costo / stats.resumen.costoTotal) * 100).toFixed(1)
                        : '0'}%
                    </td>
                  </tr>
                ))}
                {(!stats || stats.porUsuario.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-4 text-center text-muted-foreground">
                      Sin datos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>

      {/* Token details */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalle de tokens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Tokens de entrada</p>
                <p className="text-lg font-semibold">
                  {(stats.resumen.tokensInputTotal / 1000).toFixed(1)}K
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Tokens de salida</p>
                <p className="text-lg font-semibold">
                  {(stats.resumen.tokensOutputTotal / 1000).toFixed(1)}K
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
