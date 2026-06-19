'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  TrendingUp, Loader2, Activity, AlertTriangle, Calendar, Camera, Target,
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts'

// ─── Tipos ───────────────────────────────────────────────────────────────────
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
  proyecto: { id: string; codigo: string; nombre: string }
}

const pct = (n: number | null | undefined) => (n == null ? '—' : `${n.toFixed(1)}%`)

// ─── Componente principal ─────────────────────────────────────────────────────
export function CurvaSAvanceChart({ proyectoId }: { proyectoId: string }) {
  const [data, setData] = useState<CurvaAvanceResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!proyectoId) { setData(null); setError(''); return }
    setLoading(true); setError(''); setData(null)
    fetch(`/api/proyectos/${proyectoId}/curva-avance`, { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Error ${r.status}`)
        return r.json()
      })
      .then((result: CurvaAvanceResponse) => setData(result))
      .catch((e: Error) => setError(e.message || 'Error al cargar datos'))
      .finally(() => setLoading(false))
  }, [proyectoId])

  if (!proyectoId) return null

  // Punto de referencia "a la fecha" = última semana con valor real
  let refReal: number | null = null
  let refPlan: number | null = null
  if (data) {
    for (const w of data.weeks) if (w.realAcum != null) { refReal = w.realAcum; refPlan = w.planificadoAcum }
  }
  const indice = refReal != null && refPlan != null && refPlan > 0 ? refReal / refPlan : null

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Curva S de Avance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {loading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {error && !loading && (
          <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
            <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {data && !loading && (
          <>
            {/* Avisos de estado */}
            {!data.hasBaseline && (
              <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-800">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">Sin baseline planificado para comparar.</span>{' '}
                  Este proyecto no tiene cronograma de planificación marcado como línea base.
                </div>
              </div>
            )}
            {!data.tieneSnapshots && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <Camera className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  La línea Real aparecerá cuando tomes el primer snapshot de avance.
                </span>
              </div>
            )}

            {/* Gráfico */}
            {data.weeks.length > 0 ? (
              <ResponsiveContainer width="100%" height={360}>
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

                  {/* Planificado: azul punteada */}
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
                  {/* Real: verde sólida */}
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
            ) : (
              <div className="flex items-center justify-center py-12 text-sm text-muted-foreground gap-2">
                <TrendingUp className="h-6 w-6 opacity-30" />
                Sin datos suficientes para generar la curva. Verifica que el proyecto tenga
                cronograma con tareas o algún snapshot de avance.
              </div>
            )}

            {/* Tarjetas de resumen */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <SummaryCard icon={Calendar} iconColor="text-blue-500" label="Planeado a la fecha" value={pct(refPlan)} />
              <SummaryCard icon={TrendingUp} iconColor="text-emerald-500" label="Real a la fecha" value={pct(refReal)} />
              <IndiceCard indice={indice} />
            </div>
          </>
        )}

      </CardContent>
    </Card>
  )
}

// ─── Sub-components (mismos estilos que curva-s-avance/page.tsx) ──────────────

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
          {indice != null
            ? <Activity className={`h-4 w-4 ${c.text}`} />
            : <Target className="h-4 w-4 text-gray-400" />}
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
