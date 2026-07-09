'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  DollarSign,
  Zap,
  TrendingUp,
  TrendingDown,
  Minus,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  ChevronLeft,
  ChevronRight,
  MessageSquare,
  FileSpreadsheet,
  ScanLine,
  FileSearch,
  MessagesSquare,
  Settings2,
  FileUp,
  Download,
  FileCheck,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LabelList,
} from 'recharts'
import { getTipoInfo } from '@/lib/agente/aiTipos'

interface MonthlyUsage {
  costoTotal: number
  llamadasTotal: number
  limiteMensual: number
  porcentajeUsado: number
  tendencia?: {
    costoMesAnteriorMismoRango: number
    cambioPorcentaje: number | null
    mesAnterior: string
  }
}

interface UsageStats {
  resumen: {
    costoTotal: number
    llamadasTotal: number
    tokensInputTotal: number
    tokensOutputTotal: number
    tokensCacheCreationTotal: number
    tokensCacheReadTotal: number
    /** Costo USD que se hubiera pagado SIN caching */
    costoSinCache: number
  }
  porDia: Array<{
    fecha: string
    costo: number
    llamadas: number
    porTipo: Record<string, number>
  }>
  porTipo: Array<{
    tipo: string
    costo: number
    llamadas: number
    tokensInput: number
    tokensOutput: number
    duracionMsPromedio: number | null
    costoPromedio: number
    modelos: Record<string, { llamadas: number; costo: number }>
  }>
  porModelo: Array<{ modelo: string; costo: number; llamadas: number }>
  porUsuario: Array<{ userId: string; nombre: string; costo: number; llamadas: number }>
  limite: MonthlyUsage
}

type Periodo = 'hoy' | 'semana' | 'mes'

interface IAFeatureFlags {
  chatGeneral: boolean
  chatCotizacion: boolean
  analisisTdr: boolean
  importacionExcel: boolean
  ocrComprobantes: boolean
  scanCotizacionPDF: boolean
  importCatalogoPDF: boolean
  matrizComunicacion: boolean
  planTrabajo: boolean
  iperc: boolean
  pets: boolean
  mpp: boolean
  importarValorizacionIA: boolean
  verificarCotizacionProyecto: boolean
}

const FEATURE_DEFS: { key: keyof IAFeatureFlags; label: string; desc: string; icon: React.ElementType }[] = [
  { key: 'chatGeneral', label: 'Chat General', desc: 'Boton flotante de asistente IA en toda la app', icon: MessageSquare },
  { key: 'chatCotizacion', label: 'Chat en Cotizacion', desc: 'Asistente IA contextual dentro de cotizaciones', icon: MessagesSquare },
  { key: 'analisisTdr', label: 'Analisis de TDR', desc: 'Herramientas de analisis de Terminos de Referencia', icon: FileSearch },
  { key: 'importacionExcel', label: 'Importacion Excel/PDF', desc: 'Wizard de importacion de cotizaciones con IA', icon: FileSpreadsheet },
  { key: 'ocrComprobantes', label: 'OCR Comprobantes', desc: 'Lectura automatica de facturas y boletas', icon: ScanLine },
  { key: 'scanCotizacionPDF', label: 'Escanear PDF Cotizacion', desc: 'Auto-deteccion de precios y entregas desde PDF del proveedor', icon: FileSearch },
  { key: 'importCatalogoPDF', label: 'Importar Catalogo PDF', desc: 'Extraer equipos de cotizaciones PDF con IA para agregar al catalogo', icon: FileUp },
  { key: 'matrizComunicacion', label: 'Matriz de Comunicaciones', desc: 'Generacion automatica de matriz con IA usando organigrama y EDTs del proyecto', icon: MessageSquare },
  { key: 'planTrabajo', label: 'Plan de Trabajo', desc: 'Generacion y regeneracion de secciones del Plan de Trabajo con IA', icon: FileSearch },
  { key: 'iperc', label: 'IPERC', desc: 'Generacion del IPERC (resumen e identificacion de peligros por lote) con IA', icon: ShieldCheck },
  { key: 'pets', label: 'PETS', desc: 'Generacion y regeneracion granular de etapas y pasos del PETS con IA', icon: ShieldCheck },
  { key: 'mpp', label: 'MPP', desc: 'Generacion de la Matriz de Proteccion Personal (MPP) con IA usando el IPERC', icon: FileSpreadsheet },
  { key: 'importarValorizacionIA', label: 'Importar Valorización con IA', desc: 'Interpretación automática de documentos de valorización del cliente para crear o verificar valorizaciones', icon: FileSpreadsheet },
  { key: 'verificarCotizacionProyecto', label: 'Verificar Cotización de Proyecto', desc: 'Extracción y verificación de totales de la Propuesta Económica origen contra costos reales del proyecto', icon: FileCheck },
]

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

function formatYearMonth(ym: string): string {
  const [year, month] = ym.split('-').map(Number)
  return `${MONTH_NAMES[month - 1]} ${year}`
}

function getCurrentYearMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function shiftMonth(ym: string, delta: number): string {
  const [year, month] = ym.split('-').map(Number)
  const d = new Date(year, month - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

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

// ── Drill-down ──────────────────────────────────────────

interface CallRow {
  id: string
  fecha: string
  usuario: string
  userId: string
  tipo: string
  modelo: string
  modeloFull: string
  tokensInput: number
  tokensOutput: number
  tokensCacheCreation: number
  tokensCacheRead: number
  costoEstimado: number
  duracionMs: number | null
  conversacionId: string | null
  fileName: string | null
  sheet: string | null
  pages: number | null
}

interface DrillFilter {
  tipo?: string
  userId?: string
  /** Texto que se muestra en el titulo del modal */
  label: string
}

function formatCallDate(iso: string): string {
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mn = String(d.getMinutes()).padStart(2, '0')
  return `${dd}/${mm} ${hh}:${mn}`
}

function formatTokensCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function UsoIAPage() {
  const [periodo, setPeriodo] = useState<Periodo>('mes')
  const [selectedMonth, setSelectedMonth] = useState(getCurrentYearMonth)
  const [stats, setStats] = useState<UsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [limitInput, setLimitInput] = useState('')
  const [savingLimit, setSavingLimit] = useState(false)
  const [limitMsg, setLimitMsg] = useState<string | null>(null)
  const [features, setFeatures] = useState<IAFeatureFlags | null>(null)
  const [savingFeature, setSavingFeature] = useState<string | null>(null)

  // Drill-down state
  const [drillFilter, setDrillFilter] = useState<DrillFilter | null>(null)
  const [drillRows, setDrillRows] = useState<CallRow[]>([])
  const [drillLoading, setDrillLoading] = useState(false)

  const isCurrentMonth = selectedMonth === getCurrentYearMonth()

  const fetchStats = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (isCurrentMonth) {
        params.set('periodo', periodo)
      } else {
        params.set('periodo', 'mes')
        params.set('mes', selectedMonth)
      }
      const res = await fetch(`/api/agente/usage?${params}`)
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
  }, [periodo, selectedMonth, isCurrentMonth])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  /** Construye los params del periodo actual para los endpoints de drill-down/CSV */
  const buildPeriodParams = useCallback(() => {
    const params = new URLSearchParams()
    if (isCurrentMonth) {
      params.set('periodo', periodo)
    } else {
      params.set('mes', selectedMonth)
    }
    return params
  }, [periodo, selectedMonth, isCurrentMonth])

  // Fetch del drill-down cuando cambia el filtro
  useEffect(() => {
    if (!drillFilter) return
    let cancelled = false
    setDrillLoading(true)
    const params = buildPeriodParams()
    if (drillFilter.tipo) params.set('tipo', drillFilter.tipo)
    if (drillFilter.userId) params.set('userId', drillFilter.userId)
    params.set('limit', '100')
    fetch(`/api/agente/usage/calls?${params}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => { if (!cancelled) setDrillRows(data.rows ?? []) })
      .catch(() => { if (!cancelled) setDrillRows([]) })
      .finally(() => { if (!cancelled) setDrillLoading(false) })
    return () => { cancelled = true }
  }, [drillFilter, buildPeriodParams])

  const handleExportCSV = useCallback((extra?: { tipo?: string; userId?: string }) => {
    const params = buildPeriodParams()
    params.set('format', 'csv')
    if (extra?.tipo) params.set('tipo', extra.tipo)
    if (extra?.userId) params.set('userId', extra.userId)
    window.location.href = `/api/agente/usage/calls?${params}`
  }, [buildPeriodParams])

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

  // ── Feature flags ──
  useEffect(() => {
    fetch('/api/agente/features')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setFeatures(data) })
      .catch(() => {})
  }, [])

  const toggleFeature = async (key: keyof IAFeatureFlags, value: boolean) => {
    setSavingFeature(key)
    try {
      const res = await fetch('/api/agente/features', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [key]: value }),
      })
      if (res.ok) {
        const updated = await res.json()
        setFeatures(updated)
      }
    } catch { /* ignore */ } finally {
      setSavingFeature(null)
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
          {/* Month picker */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedMonth((m) => shiftMonth(m, -1))}
              className="p-1.5 rounded-md border hover:bg-accent transition-colors"
              title="Mes anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium w-[140px] text-center select-none">
              {formatYearMonth(selectedMonth)}
            </span>
            <button
              onClick={() => setSelectedMonth((m) => {
                const next = shiftMonth(m, 1)
                return next > getCurrentYearMonth() ? m : next
              })}
              disabled={isCurrentMonth}
              className="p-1.5 rounded-md border hover:bg-accent transition-colors disabled:opacity-30"
              title="Mes siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* Period filter (only for current month) */}
          {isCurrentMonth && (
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
          )}

          <button
            onClick={() => handleExportCSV()}
            disabled={loading || !stats?.resumen.llamadasTotal}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm hover:bg-accent transition-colors disabled:opacity-50"
            title="Exportar todas las llamadas del periodo a CSV"
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">CSV</span>
          </button>

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

      {/* ── Feature Toggles ── */}
      {features && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Settings2 className="h-4 w-4" />
              Herramientas de IA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {FEATURE_DEFS.map(({ key, label, desc, icon: Icon }) => (
                <div
                  key={key}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                    features[key] ? 'bg-white' : 'bg-gray-50 opacity-60'
                  }`}
                >
                  <Icon className="h-5 w-5 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium leading-tight">{label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
                  </div>
                  <Switch
                    checked={features[key]}
                    disabled={savingFeature === key}
                    onCheckedChange={(v) => toggleFeature(key, v)}
                    className="shrink-0"
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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

            {/* Projection + Tendencia + Limit editor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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

              {/* Tendencia vs mes anterior */}
              {limite.tendencia && (() => {
                const t = limite.tendencia
                const change = t.cambioPorcentaje
                const isStable = change !== null && Math.abs(change) <= 5
                const isUp = change !== null && change > 5
                const isDown = change !== null && change < -5
                const Icon = isUp ? TrendingUp : isDown ? TrendingDown : Minus
                const colorClass = isUp
                  ? 'text-red-600'
                  : isDown
                  ? 'text-emerald-600'
                  : 'text-muted-foreground'
                return (
                  <div className="rounded-lg border bg-white p-3">
                    <p className="text-xs text-muted-foreground mb-1">
                      vs {formatYearMonth(t.mesAnterior)} (mismos dias)
                    </p>
                    {change === null ? (
                      <>
                        <p className="text-lg font-bold text-muted-foreground">—</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {t.costoMesAnteriorMismoRango === 0
                            ? 'Sin uso registrado el mes anterior'
                            : 'No comparable'}
                        </p>
                      </>
                    ) : (
                      <>
                        <p className={`text-lg font-bold flex items-center gap-1.5 ${colorClass}`}>
                          <Icon className="h-4 w-4" />
                          {isStable ? '~' : ''}{change > 0 ? '+' : ''}{change.toFixed(1)}%
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          ${t.costoMesAnteriorMismoRango.toFixed(2)} en el mismo periodo
                        </p>
                      </>
                    )}
                  </div>
                )
              })()}

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
              Costo {!isCurrentMonth ? formatYearMonth(selectedMonth) : periodo === 'hoy' ? 'hoy' : periodo === 'semana' ? 'esta semana' : 'este mes'}
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

        {isCurrentMonth && (
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
        )}

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

      {/* Chart: Cost per day stacked by tipo */}
      {stats && stats.porDia.length > 0 && (() => {
        // Tipos presentes en el período, ordenados por costo total desc
        const tipoTotals = new Map<string, number>()
        for (const d of stats.porDia) {
          for (const [tipo, c] of Object.entries(d.porTipo)) {
            tipoTotals.set(tipo, (tipoTotals.get(tipo) ?? 0) + c)
          }
        }
        const tiposOrdenados = Array.from(tipoTotals.entries())
          .sort((a, b) => b[1] - a[1])
          .map(([tipo]) => tipo)

        // Reshape: cada datapoint tiene { fecha, [label]: costo, ... } para recharts.
        // _total se usa para el LabelList encima de cada barra (suma del día).
        const chartData = stats.porDia.map((d) => {
          const row: Record<string, string | number> = { fecha: d.fecha, _total: d.costo }
          for (const tipo of tiposOrdenados) {
            row[getTipoInfo(tipo).label] = d.porTipo[tipo] ?? 0
          }
          return row
        })

        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Costo por día por herramienta (USD)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[340px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
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
                      formatter={(value: number, name: string) => [`$${value.toFixed(3)}`, name]}
                      labelFormatter={(label: string) => `Fecha: ${label}`}
                      contentStyle={{ fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                    {tiposOrdenados.map((tipo, idx) => {
                      const info = getTipoInfo(tipo)
                      const isLast = idx === tiposOrdenados.length - 1
                      return (
                        <Bar
                          key={tipo}
                          dataKey={info.label}
                          stackId="cost"
                          fill={info.color}
                          radius={isLast ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                        >
                          {isLast && (
                            <LabelList
                              dataKey="_total"
                              position="top"
                              formatter={(value) => {
                                const v = typeof value === 'number' ? value : Number(value)
                                if (!v || v <= 0) return ''
                                return v >= 0.1 ? `$${v.toFixed(2)}` : `$${v.toFixed(3)}`
                              }}
                              style={{ fontSize: 11, fontWeight: 600, fill: '#1f2937' }}
                            />
                          )}
                        </Bar>
                      )
                    })}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Tables */}
      <div className="space-y-6">
        {/* Por herramienta IA (unifica tipo + modelo + costo prom) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Por herramienta IA</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Herramienta</th>
                    <th className="pb-2 font-medium">Modelo</th>
                    <th className="pb-2 font-medium text-right">Llamadas</th>
                    <th className="pb-2 font-medium text-right">Costo prom / llamada</th>
                    <th className="pb-2 font-medium text-right">Costo total</th>
                    <th className="pb-2 font-medium text-right">% del total</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.porTipo.map((row) => {
                    const info = getTipoInfo(row.tipo)
                    const modeloEntries = Object.entries(row.modelos).sort(
                      ([, a], [, b]) => b.costo - a.costo
                    )
                    const pct = stats.resumen.costoTotal > 0
                      ? (row.costo / stats.resumen.costoTotal) * 100
                      : 0
                    return (
                      <tr
                        key={row.tipo}
                        className="border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors"
                        onClick={() => setDrillFilter({ tipo: row.tipo, label: info.label })}
                      >
                        <td className="py-2">
                          <div className="flex flex-col gap-0.5">
                            <span
                              className="inline-flex w-fit items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
                              style={{ backgroundColor: `${info.color}1a`, color: info.color }}
                            >
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: info.color }}
                              />
                              {info.label}
                            </span>
                            {row.duracionMsPromedio != null && (
                              <span className="pl-2 text-[11px] text-muted-foreground">
                                ~{(row.duracionMsPromedio / 1000).toFixed(1)}s prom
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-1">
                            {modeloEntries.map(([modelo, x]) => (
                              <span
                                key={modelo}
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                                  modelo === 'Sonnet'
                                    ? 'bg-purple-50 text-purple-700'
                                    : modelo === 'Haiku'
                                    ? 'bg-emerald-50 text-emerald-700'
                                    : 'bg-gray-100 text-gray-700'
                                }`}
                                title={`${x.llamadas} llamada${x.llamadas !== 1 ? 's' : ''} · $${x.costo.toFixed(3)}`}
                              >
                                {modelo}
                                {modeloEntries.length > 1 && (
                                  <span className="ml-1 opacity-70">({x.llamadas})</span>
                                )}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2 text-right">{row.llamadas}</td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">
                          ${row.costoPromedio.toFixed(4)}
                        </td>
                        <td className="py-2 text-right font-medium tabular-nums">
                          ${row.costo.toFixed(3)}
                        </td>
                        <td className="py-2 text-right tabular-nums text-muted-foreground">
                          {pct.toFixed(1)}%
                        </td>
                      </tr>
                    )
                  })}
                  {(!stats || stats.porTipo.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-4 text-center text-muted-foreground">
                        Sin datos
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* By user */}
        <Card>
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
                  <tr
                    key={row.userId}
                    className="border-b last:border-0 cursor-pointer hover:bg-muted/40 transition-colors"
                    onClick={() => setDrillFilter({ userId: row.userId, label: row.nombre })}
                  >
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

      {/* Tokens y caching */}
      {stats && (() => {
        const r = stats.resumen
        const totalInputEq = r.tokensInputTotal + r.tokensCacheCreationTotal + r.tokensCacheReadTotal
        const cacheTotal = r.tokensCacheCreationTotal + r.tokensCacheReadTotal
        const hitRate = totalInputEq > 0 ? (r.tokensCacheReadTotal / totalInputEq) * 100 : 0
        const ahorro = r.costoSinCache - r.costoTotal
        const ahorroPct = r.costoSinCache > 0 ? (ahorro / r.costoSinCache) * 100 : 0
        const formatTokens = (n: number) =>
          n >= 1_000_000 ? `${(n / 1_000_000).toFixed(2)}M`
          : n >= 1_000 ? `${(n / 1_000).toFixed(1)}K`
          : `${n}`
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tokens y caching de prompts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Input fresco</p>
                  <p className="text-lg font-semibold">{formatTokens(r.tokensInputTotal)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Output</p>
                  <p className="text-lg font-semibold">{formatTokens(r.tokensOutputTotal)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground" title="Tokens escritos al cache (cuestan 1.25x del input base)">
                    Cache creado
                  </p>
                  <p className="text-lg font-semibold text-amber-600">
                    {formatTokens(r.tokensCacheCreationTotal)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground" title="Tokens leidos del cache (cuestan 0.10x del input base)">
                    Cache leido
                  </p>
                  <p className="text-lg font-semibold text-emerald-600">
                    {formatTokens(r.tokensCacheReadTotal)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-3">
                {cacheTotal === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Caching de prompts aun no registra actividad en este periodo.
                    Una vez que el chat tenga llamadas dentro de los 5 min de TTL,
                    veras hit rate y ahorro acumulado aqui.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Hit rate del cache</p>
                      <p className="text-lg font-bold">
                        {hitRate.toFixed(1)}%
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          ({formatTokens(r.tokensCacheReadTotal)} de {formatTokens(totalInputEq)})
                        </span>
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Costo sin cache</p>
                      <p className="text-lg font-semibold text-muted-foreground line-through">
                        ${r.costoSinCache.toFixed(3)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Ahorro acumulado</p>
                      <p className={`text-lg font-bold ${ahorro > 0 ? 'text-emerald-600' : 'text-muted-foreground'}`}>
                        {ahorro > 0 ? '−' : ''}${Math.abs(ahorro).toFixed(3)}
                        <span className="ml-1 text-xs font-normal text-muted-foreground">
                          ({ahorroPct >= 0 ? '−' : '+'}{Math.abs(ahorroPct).toFixed(1)}%)
                        </span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {/* Drill-down sheet */}
      <Sheet open={!!drillFilter} onOpenChange={(open) => { if (!open) setDrillFilter(null) }}>
        <SheetContent side="right" className="w-full sm:max-w-2xl lg:max-w-3xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between gap-3">
              <span>Llamadas — {drillFilter?.label}</span>
              {drillFilter && (
                <button
                  onClick={() => handleExportCSV({ tipo: drillFilter.tipo, userId: drillFilter.userId })}
                  className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-accent transition-colors"
                  title="Exportar este detalle a CSV"
                >
                  <Download className="h-3.5 w-3.5" />
                  CSV
                </button>
              )}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            {drillLoading && (
              <p className="text-sm text-muted-foreground py-8 text-center">Cargando…</p>
            )}
            {!drillLoading && drillRows.length === 0 && (
              <p className="text-sm text-muted-foreground py-8 text-center">Sin llamadas en este periodo.</p>
            )}
            {!drillLoading && drillRows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 font-medium">Fecha</th>
                      {!drillFilter?.tipo && <th className="pb-2 font-medium">Herramienta</th>}
                      {!drillFilter?.userId && <th className="pb-2 font-medium">Usuario</th>}
                      <th className="pb-2 font-medium">Modelo</th>
                      <th className="pb-2 font-medium text-right">Tokens</th>
                      <th className="pb-2 font-medium text-right">Costo</th>
                      <th className="pb-2 font-medium text-right">Dur.</th>
                      <th className="pb-2 font-medium">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drillRows.map((r) => {
                      const tipoInfo = getTipoInfo(r.tipo)
                      const totalTokens = r.tokensInput + r.tokensOutput + r.tokensCacheCreation + r.tokensCacheRead
                      const cacheTokens = r.tokensCacheCreation + r.tokensCacheRead
                      return (
                        <tr key={r.id} className="border-b last:border-0 hover:bg-muted/40">
                          <td className="py-2 tabular-nums whitespace-nowrap">{formatCallDate(r.fecha)}</td>
                          {!drillFilter?.tipo && (
                            <td className="py-2">
                              <span
                                className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium"
                                style={{ backgroundColor: `${tipoInfo.color}1a`, color: tipoInfo.color }}
                              >
                                {tipoInfo.label}
                              </span>
                            </td>
                          )}
                          {!drillFilter?.userId && (
                            <td className="py-2">{r.usuario}</td>
                          )}
                          <td className="py-2">
                            <span className={`inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium ${
                              r.modelo === 'Sonnet' ? 'bg-purple-50 text-purple-700' :
                              r.modelo === 'Haiku' ? 'bg-emerald-50 text-emerald-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {r.modelo}
                            </span>
                          </td>
                          <td className="py-2 text-right tabular-nums">
                            {formatTokensCompact(totalTokens)}
                            {cacheTokens > 0 && (
                              <span className="block text-[10px] text-emerald-600" title={`Cache leido: ${r.tokensCacheRead} | Cache escrito: ${r.tokensCacheCreation}`}>
                                {formatTokensCompact(r.tokensCacheRead)} cache
                              </span>
                            )}
                          </td>
                          <td className="py-2 text-right tabular-nums font-medium">${r.costoEstimado.toFixed(4)}</td>
                          <td className="py-2 text-right tabular-nums text-muted-foreground">
                            {r.duracionMs != null ? `${(r.duracionMs / 1000).toFixed(1)}s` : '—'}
                          </td>
                          <td className="py-2 text-muted-foreground max-w-[180px] truncate" title={r.fileName ?? r.sheet ?? r.conversacionId ?? ''}>
                            {r.fileName ?? (r.sheet ? `hoja: ${r.sheet}` : null) ?? (r.conversacionId ? `conv: ${r.conversacionId.slice(0, 8)}` : '—')}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <p className="text-[11px] text-muted-foreground mt-3">
                  Mostrando las {drillRows.length} llamadas mas recientes.
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
