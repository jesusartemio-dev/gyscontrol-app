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
  reportado: number | null
  consumoAcum: number | null
}

interface CurvaAvanceResponse {
  weeks: AvanceWeek[]
  hasBaseline: boolean
  tieneSerieReal: boolean
  tieneReportados: boolean
  cronogramaPlanId: string | null
  cronogramaEjecId: string | null
  proyecto: { id: string; codigo: string; nombre: string }
  historico: {
    porcentajeActual: number
    porcentajeDerivado: number
    brecha: number
    tareasConAvance: number
    tareasConHistorico: number
  }
  preparacion: {
    estado: string
    listo: boolean
    titulo: string
    detalle: string
    pasos: string[]
  }
  jornadasAbiertas: { id: string; fechaTrabajo: string; semanaIso: string }[]
  consumo: {
    tieneDatos: boolean
    horasPresupuestadas: number
    horasConsumidas: number
    eficiencia: number | null
  }
}

const pct = (n: number | null | undefined) => (n == null ? '—' : `${n.toFixed(1)}%`)

// ─── Componente principal ─────────────────────────────────────────────────────
export function CurvaSAvanceChart({ proyectoId, refreshKey }: { proyectoId: string; refreshKey?: number | string }) {
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [proyectoId, refreshKey])

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
            {data.preparacion.estado !== 'listo' && (
              <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                data.preparacion.listo
                  ? 'bg-yellow-50 border-yellow-200 text-yellow-900'
                  : 'bg-slate-50 border-slate-300 text-slate-800'
              }`}>
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium">{data.preparacion.titulo}.</span>{' '}
                  {data.preparacion.detalle}
                </div>
              </div>
            )}
            {!data.tieneSerieReal && data.preparacion.listo && (
              <div className="flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <Camera className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  La línea Real aparecerá cuando se registre avance fechado: al cerrar una
                  jornada de campo o al actualizar el % de una tarea.
                </span>
              </div>
            )}
            {data.tieneSerieReal && data.historico.brecha > 1 && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  La curva Real llega a {data.historico.porcentajeDerivado.toFixed(1)}% pero el
                  avance actual es {data.historico.porcentajeActual.toFixed(1)}%:{' '}
                  {data.historico.tareasConHistorico} de {data.historico.tareasConAvance} tareas
                  con avance tienen fecha registrada.
                </span>
              </div>
            )}
            {data.jornadasAbiertas.length > 0 && (
              <div className="flex items-start gap-2 bg-orange-50 border border-orange-200 rounded-lg p-3 text-sm text-orange-900">
                <Calendar className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  {data.jornadasAbiertas.length}{' '}
                  {data.jornadasAbiertas.length === 1 ? 'jornada sin cerrar' : 'jornadas sin cerrar'}
                  {' '}({data.jornadasAbiertas.map((j) => j.fechaTrabajo).join(', ')}). Su avance
                  corregirá las semanas a las que pertenece cuando se cierren.
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
                    // El consumo de horas puede superar el 100%: el eje crece con él.
                    domain={[0, (dataMax: number) => Math.max(100, Math.ceil(dataMax / 10) * 10)]}
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
                  {/* Reportado: snapshots congelados, puntos sueltos sin línea */}
                  <Line
                    type="monotone"
                    dataKey="reportado"
                    name="Reportado"
                    stroke="#7C3AED"
                    strokeWidth={0}
                    dot={{ r: 5, fill: '#7C3AED', stroke: '#7C3AED' }}
                    legendType="circle"
                    connectNulls={false}
                    isAnimationActive={false}
                  />
                  {/* Consumo de horas: cuánto del presupuesto se gastó, no cuánto se avanzó */}
                  <Line
                    type="monotone"
                    dataKey="consumoAcum"
                    name="Horas consumidas"
                    stroke="#C2410C"
                    strokeWidth={2}
                    strokeDasharray="2 3"
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

            {data.consumo.tieneDatos && data.consumo.eficiencia != null && (
              <p className="text-xs text-muted-foreground">
                Horas: {data.consumo.horasConsumidas.toLocaleString('es-PE')} de{' '}
                {data.consumo.horasPresupuestadas.toLocaleString('es-PE')} presupuestadas ·
                eficiencia {data.consumo.eficiencia.toFixed(2)} (avance por punto de horas gastado)
              </p>
            )}
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
