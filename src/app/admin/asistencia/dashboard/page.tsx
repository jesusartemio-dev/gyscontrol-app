'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { Loader2, TrendingUp, Clock, AlertTriangle, MapPinOff, Home } from 'lucide-react'
import { formatearTardanza } from '@/lib/utils/formatTardanza'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

interface DashData {
  kpis: {
    total: number
    aTiempo: number
    tarde: number
    muyTarde: number
    fueraZona: number
    dispositivoNuevo: number
    remotos: number
    presenciales: number
    porcentajePuntualidad: number
    minutosTardeTotales: number
  }
  ranking: Array<{ userId: string; minutos: number; veces: number; user?: { name: string | null; email: string } }>
  tendencia: Array<{ fecha: string; aTiempo: number; tarde: number; muyTarde: number }>
  departamentos: Array<{ nombre: string; aTiempo: number; tarde: number; muyTarde: number }>
}

export default function DashboardAsistencia() {
  const [data, setData] = useState<DashData | null>(null)
  const [loading, setLoading] = useState(true)
  const [dias, setDias] = useState('30')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/asistencia/dashboard?dias=${dias}`)
      .then(r => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [dias])

  if (loading || !data) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const { kpis } = data

  return (
    <div className="container mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard de Asistencia</h1>
          <p className="text-sm text-muted-foreground">Puntualidad y tardanzas</p>
        </div>
        <Select value={dias} onValueChange={setDias}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Últimos 7 días</SelectItem>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="90">Últimos 90 días</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" /> % Puntualidad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{kpis.porcentajePuntualidad}%</p>
            <Progress value={kpis.porcentajePuntualidad} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" /> Tardanzas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-amber-600">{kpis.tarde + kpis.muyTarde}</p>
            <p className="text-xs text-muted-foreground">
              {formatearTardanza(kpis.minutosTardeTotales)} totales
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPinOff className="h-4 w-4" /> Fuera zona
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{kpis.fueraZona}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" /> Dispositivos nuevos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{kpis.dispositivoNuevo}</p>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <Home className="h-4 w-4" /> Marcajes remotos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-purple-600">{kpis.remotos}</p>
            <p className="text-xs text-muted-foreground">
              {kpis.total > 0 ? Math.round((kpis.remotos / kpis.total) * 100) : 0}% del total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm text-muted-foreground">
              <TrendingUp className="h-4 w-4" /> Marcajes presenciales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{kpis.presenciales}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tendencia diaria</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.tendencia}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line dataKey="aTiempo" stroke="#10b981" name="A tiempo" />
                <Line dataKey="tarde" stroke="#f59e0b" name="Tarde" />
                <Line dataKey="muyTarde" stroke="#ef4444" name="Muy tarde" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Por departamento</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={data.departamentos}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="aTiempo" stackId="a" fill="#10b981" name="A tiempo" />
                <Bar dataKey="tarde" stackId="a" fill="#f59e0b" name="Tarde" />
                <Bar dataKey="muyTarde" stackId="a" fill="#ef4444" name="Muy tarde" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Ranking de tardanzas</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {data.ranking.map((r, i) => (
                <li
                  key={r.userId}
                  className="flex items-center justify-between rounded-md border p-2"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <p className="text-sm font-medium">
                        {r.user?.name || r.user?.email || r.userId}
                      </p>
                      <p className="text-xs text-muted-foreground">{r.veces} veces tarde</p>
                    </div>
                  </div>
                  <span className="font-semibold text-red-600">{formatearTardanza(r.minutos)}</span>
                </li>
              ))}
              {data.ranking.length === 0 && (
                <li className="py-6 text-center text-muted-foreground">
                  Sin tardanzas registradas en el periodo.
                </li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
