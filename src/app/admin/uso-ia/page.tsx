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
  AlertTriangle,
  ShieldCheck,
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

interface MonthlyUsage {
  costoTotal: number
  llamadasTotal: number
  limiteMensual: number
  porcentajeUsado: number
}

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
  limite: MonthlyUsage
}

type Periodo = 'hoy' | 'semana' | 'mes'

function getProgressColor(pct: number): string {
  if (pct < 60) return 'bg-emerald-500'
  if (pct < 80) return 'bg-amber-500'
  return 'bg-red-500'
}

function getProgressBgColor(pct: number): string {
  if (pct < 60) return 'bg-emerald-100'
  if (pct < 80) return 'bg-amber-100'
  return 'bg-red-100'
}

function getProgressTextColor(pct: number): string {
  if (pct < 60) return 'text-emerald-700'
  if (pct < 80) return 'text-amber-700'
  return 'text-red-700'
}

export default function UsoIAPage() {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [limitInput, setLimitInput] = useState('')
  const [savingLimit, setSavingLimit] = useState(false)
  const [limitMsg, setLimitMsg] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/agente/usage?periodo=${periodo}`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Error ${res.status}`)
      }
      const data = await res.json()
      setStats(data)
      setLimitInput(String(data.limite?.limiteMensual ?? 25))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [periodo])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  const handleSaveLimit = async () => {
    const value = parseFloat(limitInput)
    if (isNaN(value) || value <= 0) {
      setLimitMsg('Ingresa un valor valido mayor a 0')
      return
    }
    setSavingLimit(true)
    setLimitMsg(null)
    try {
      const res = await fetch('/api/agente/usage/limit', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limite: value }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error guardando limite')
      }
      setLimitMsg('Limite actualizado')
      fetchStats()
    } catch (err) {
      setLimitMsg(err instanceof Error ? err.message : 'Error')
    } finally {
      setSavingLimit(false)
    }
  }

  const promedioDiario = stats && stats.porDia.length > 0
    ? stats.resumen.costoTotal / stats.porDia.length
    : 0

  const costoHoy = stats?.porDia.find(
    (d) => d.fecha === new Date().toISOString().split('T')[0]
  )?.costo ?? 0

  // Projection: at current daily average, estimated month-end cost
  const now = new Date()
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  const dayOfMonth = now.getDate()
  const projection = promedioDiario > 0 ? promedioDiario * daysInMonth : 0

  const limite = stats?.limite
  const pctUsado = limite?.porcentajeUsado ?? 0

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

      {/* ── Monthly Limit Card ── */}
      {limite && (
        <Card className={pctUsado >= 80 ? 'border-red-200 bg-red-50/30' : pctUsado >= 60 ? 'border-amber-200 bg-amber-50/30' : ''}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                {pctUsado >= 80 ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : (
                  <ShieldCheck className="h-4 w-4 text-emerald-500" />
                )}
                Limite mensual de uso (empresa)
              </CardTitle>
              <span className={`text-sm font-bold ${getProgressTextColor(pctUsado)}`}>
                {pctUsado.toFixed(1)}%
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Progress bar */}
            <div>
              <div className={`h-3 w-full rounded-full ${getProgressBgColor(pctUsado)} overflow-hidden`}>
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(pctUsado)}`}
                  style={{ width: `${Math.min(pctUsado, 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs text-muted-foreground">
                <span>${limite.costoTotal.toFixed(2)} usado</span>
                <span>${limite.limiteMensual.toFixed(2)} limite</span>
              </div>
            </div>

            {/* Projection + Limit editor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Projection */}
              <div className="rounded-lg border bg-white p-3">
                <p className="text-xs text-muted-foreground mb-1">Proyeccion fin de mes</p>
                <p className="text-lg font-bold">
                  ${projection.toFixed(2)}
                  <span className="text-xs font-normal text-muted-foreground ml-1">
                    ({dayOfMonth}/{daysInMonth} dias)
                  </span>
                </p>
                {projection > limite.limiteMensual && (
                  <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    Al ritmo actual, excederas el limite
                  </p>
                )}
              </div>

              {/* Limit editor */}
              <div className="rounded-lg border bg-white p-3">
                <p className="text-xs text-muted-foreground mb-1">Limite mensual USD</p>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={limitInput}
                      onChange={(e) => { setLimitInput(e.target.value); setLimitMsg(null) }}
                      className="w-full rounded-md border px-2 py-1.5 pl-6 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleSaveLimit}
                    disabled={savingLimit}
                    className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shrink-0"
                  >
                    {savingLimit ? '...' : 'Guardar'}
                  </button>
                </div>
                {limitMsg && (
                  <p className={`text-xs mt-1 ${limitMsg.includes('actualizado') ? 'text-emerald-600' : 'text-red-600'}`}>
                    {limitMsg}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
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
              ${stats?.resumen.costoTotal.toFixed(2) ?? '--'}
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
              {stats?.resumen.llamadasTotal ?? '--'}
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
            <CardTitle className="text-base">Costo por dia (USD)</CardTitle>
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
            <CardTitle className="text-base">Por tipo de operacion</CardTitle>
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
