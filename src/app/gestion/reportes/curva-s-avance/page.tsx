'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Home, ChevronRight, TrendingUp, Loader2, Activity, AlertTriangle, Calendar, Camera, Target,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts'

// ─── Tipos ───
interface ProyectoLight { id: string; codigo: string; nombre: string }
interface AvanceWeek {
  weekStart: string
  weekLabel: string
  planificadoAcum: number | null
  realAcum: number | null
}
interface CurvaAvanceResponse {
  weeks: AvanceWeek[]
  hasBaseline: boolean
  tieneSnapshots: boolean
  cronogramaPlanId: string | null
  cronogramaEjecId: string | null
  proyecto: ProyectoLight
}

const pct = (n: number | null | undefined) => (n == null ? '—' : `${n.toFixed(1)}%`)

export default function CurvaSAvancePage() {
  const [proyectos, setProyectos] = useState<ProyectoLight[]>([])
  const [proyectoId, setProyectoId] = useState('')
  const [data, setData] = useState<CurvaAvanceResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [loadingProyectos, setLoadingProyectos] = useState(true)
  const [error, setError] = useState('')

  // Lista de proyectos (sin filtrar por cotización: aplica a cualquier proyecto).
  useEffect(() => {
    setLoadingProyectos(true)
    fetch('/api/proyectos?fields=id,codigo,nombre')
      .then((r) => r.json())
      .then((list: ProyectoLight[]) => setProyectos(Array.isArray(list) ? list : []))
      .catch(() => setProyectos([]))
      .finally(() => setLoadingProyectos(false))
  }, [])

  // Datos de la curva al seleccionar proyecto.
  useEffect(() => {
    if (!proyectoId) { setData(null); setError(''); return }
    setLoading(true); setError(''); setData(null)
    fetch(`/api/proyectos/${proyectoId}/curva-avance`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Error ${r.status}`)
        return r.json()
      })
      .then((result: CurvaAvanceResponse) => setData(result))
      .catch((e) => setError(e.message || 'Error al cargar datos'))
      .finally(() => setLoading(false))
  }, [proyectoId])

  // Punto de referencia "a la fecha" = última semana con valor real (último snapshot).
  let refReal: number | null = null
  let refPlan: number | null = null
  if (data) {
    for (const w of data.weeks) if (w.realAcum != null) { refReal = w.realAcum; refPlan = w.planificadoAcum }
  }
  const indice = refReal != null && refPlan != null && refPlan > 0 ? refReal / refPlan : null

  return (
    <div className="p-4 space-y-4">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-foreground transition-colors"><Home className="h-3.5 w-3.5" /></Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/gestion" className="hover:text-foreground transition-colors">Gestión</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <Link href="/gestion/reportes" className="hover:text-foreground transition-colors">Reportes</Link>
        <ChevronRight className="h-3.5 w-3.5" />
        <span className="text-foreground font-medium">Curva S — Avance</span>
      </nav>

      {/* Header + Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Curva S — Avance físico</h1>
          <p className="text-sm text-muted-foreground">
            % planificado (línea base) vs % real (snapshots) por semana
          </p>
        </div>
        <Select value={proyectoId} onValueChange={setProyectoId} disabled={loadingProyectos}>
          <SelectTrigger className="w-[320px] text-xs h-9">
            <SelectValue placeholder={loadingProyectos ? 'Cargando proyectos...' : 'Seleccionar proyecto...'} />
          </SelectTrigger>
          <SelectContent>
            {proyectos.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">{p.codigo} — {p.nombre}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {error && !loading && (
        <Card><CardContent className="p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-red-600">{error}</p>
        </CardContent></Card>
      )}

      {!proyectoId && !loading && (
        <Card><CardContent className="p-16 text-center">
          <TrendingUp className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground mb-2">Selecciona un proyecto</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Compara el avance planificado (cronograma línea base) vs el avance real
            registrado en los snapshots semanales.
          </p>
        </CardContent></Card>
      )}

      {data && !loading && (
        <>
          {/* Avisos */}
          {!data.hasBaseline && (
            <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">Sin línea base.</span>{' '}
                Este proyecto no tiene cronograma de planificación marcado como línea base,
                por lo que no se puede dibujar la curva planeada.
              </div>
            </div>
          )}
          {!data.tieneSnapshots && (
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
              <Camera className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <span className="font-medium">Aún no hay snapshots de avance.</span>{' '}
                Toma uno desde el reporte semanal del proyecto para empezar a trazar la curva real.
              </div>
            </div>
          )}

          {/* Chart */}
          {data.weeks.length > 0 ? (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">{data.proyecto.codigo} — Curva S de avance</CardTitle>
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
                        data.weeks.length > 30 ? (idx % 4 === 0 ? val : '') : val}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tickFormatter={(v: number) => `${v}%`}
                      width={48}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [value == null ? '—' : `${value.toFixed(1)}%`, name]}
                      labelFormatter={(label: string) => `Semana del ${label}`}
                    />
                    <Legend verticalAlign="top" />

                    {/* Planificado (azul punteada) */}
                    <Line
                      type="monotone"
                      dataKey="planificadoAcum"
                      name="Planificado"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      strokeDasharray="6 3"
                      dot={false}
                      connectNulls
                    />
                    {/* Real (verde sólida) */}
                    <Line
                      type="monotone"
                      dataKey="realAcum"
                      name="Real"
                      stroke="#10B981"
                      strokeWidth={2.5}
                      dot={false}
                      connectNulls
                    />
                    {/* Meta 100% */}
                    <ReferenceLine
                      y={100}
                      stroke="#9CA3AF"
                      strokeDasharray="4 2"
                      label={{ value: 'Meta 100%', position: 'insideTopRight', fill: '#6B7280', fontSize: 11 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          ) : (
            <Card><CardContent className="p-8 text-center">
              <TrendingUp className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">
                Sin datos suficientes para generar la curva. Verifica que el proyecto tenga
                cronograma con tareas o algún snapshot de avance.
              </p>
            </CardContent></Card>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <SummaryCard icon={Calendar} iconColor="text-blue-500" label="Planeado a la fecha" value={pct(refPlan)} />
            <SummaryCard icon={TrendingUp} iconColor="text-emerald-500" label="Real a la fecha" value={pct(refReal)} />
            <IndiceCard indice={indice} />
          </div>
        </>
      )}
    </div>
  )
}

// ─── Sub-components ───

function SummaryCard({
  icon: Icon, iconColor, label, value,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  label: string
  value: string
}) {
  return (
    <Card><CardContent className="p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${iconColor}`} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-lg font-bold font-mono">{value}</p>
    </CardContent></Card>
  )
}

function indiceColor(i: number) {
  if (i >= 1.0) return { bg: 'bg-green-50', text: 'text-green-700' }
  if (i >= 0.9) return { bg: 'bg-yellow-50', text: 'text-yellow-700' }
  return { bg: 'bg-red-50', text: 'text-red-700' }
}

function IndiceCard({ indice }: { indice: number | null }) {
  const c = indice != null ? indiceColor(indice) : { bg: 'bg-gray-50', text: 'text-gray-500' }
  return (
    <Card className={indice != null ? c.bg : ''}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-1">
          {indice != null ? <Activity className={`h-4 w-4 ${c.text}`} /> : <Target className="h-4 w-4 text-gray-400" />}
          <span className="text-xs text-muted-foreground">Índice de avance (real / plan)</span>
        </div>
        <p className={`text-2xl font-bold font-mono ${indice != null ? c.text : 'text-gray-400'}`}>
          {indice != null ? indice.toFixed(2) : '—'}
        </p>
        {indice != null && (
          <p className={`text-xs ${c.text}`}>
            {indice >= 1.0 ? 'En tiempo o adelantado' : indice >= 0.9 ? 'Leve retraso' : 'Retraso significativo'}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
