'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Home,
  ChevronRight,
  Loader2,
  TrendingUp,
  DollarSign,
  Package,
  BarChart3,
  RefreshCw,
  Wrench,
  Users,
  Receipt,
} from 'lucide-react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from 'recharts'

// ─── Types ───

interface ProyectoMargen {
  id: string
  codigo: string
  nombre: string
  clienteNombre: string
  estado: string
  moneda: string
  ingreso: number
  equipos: number
  servicios: number
  gastos: number
  costoTotal: number
  margen: number
  margenPct: number
  porcentajeAvanceValorizacion: number
}

interface Resumen {
  totalProyectos: number
  totalIngreso: number
  totalCosto: number
  totalMargen: number
  margenPctPromedio: number
  moneda: string
  totalEquipos: number
  totalServicios: number
  totalGastos: number
}

interface DistribucionItem {
  rango: string
  cantidad: number
  total: number
}

interface MargenRealResult {
  proyectos: ProyectoMargen[]
  resumen: Resumen
  topMejores: ProyectoMargen[]
  topPeores: ProyectoMargen[]
  distribucion: DistribucionItem[]
  fechaCalculo: string
}

// ─── Helpers ───

function formatMoneda(n: number, moneda: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: moneda === 'PEN' ? 'PEN' : 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)
}

function formatMonedaCorta(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`
  if (Math.abs(n) >= 1_000) return `$${(n / 1_000).toFixed(1)}K`
  return `$${n.toFixed(0)}`
}

function colorMargen(pct: number): string {
  if (pct < 0) return 'text-red-700 bg-red-50 border-red-200'
  if (pct < 10) return 'text-orange-700 bg-orange-50 border-orange-200'
  if (pct < 25) return 'text-yellow-700 bg-yellow-50 border-yellow-200'
  return 'text-green-700 bg-green-50 border-green-200'
}

function colorMargenText(pct: number): string {
  if (pct < 0) return 'text-red-600'
  if (pct < 10) return 'text-orange-600'
  if (pct < 25) return 'text-yellow-700'
  return 'text-green-600'
}

const ESTADO_MAP: Record<string, { label: string; color: string }> = {
  creado: { label: 'Creado', color: 'bg-gray-100 text-gray-700' },
  en_planificacion: { label: 'Planificación', color: 'bg-gray-100 text-gray-700' },
  listas_pendientes: { label: 'Listas pend.', color: 'bg-gray-100 text-gray-700' },
  listas_aprobadas: { label: 'Listas aprob.', color: 'bg-gray-100 text-gray-700' },
  pedidos_creados: { label: 'Pedidos', color: 'bg-gray-100 text-gray-700' },
  en_ejecucion: { label: 'En ejecución', color: 'bg-blue-100 text-blue-700' },
  en_cierre: { label: 'En cierre', color: 'bg-purple-100 text-purple-700' },
  cerrado: { label: 'Cerrado', color: 'bg-green-100 text-green-700' },
  pausado: { label: 'Pausado', color: 'bg-yellow-100 text-yellow-700' },
  cancelado: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
}

const DIST_COLORS: Record<string, string> = {
  '<0%': '#EF4444',
  '0-10%': '#F97316',
  '10-25%': '#EAB308',
  '25-50%': '#22C55E',
  '>50%': '#15803D',
}

const ESTADOS_FILTRO = [
  { value: '__all__', label: 'Todos los estados' },
  { value: 'en_ejecucion', label: 'En ejecución' },
  { value: 'cerrado', label: 'Cerrado' },
  { value: 'en_cierre', label: 'En cierre' },
  { value: 'pausado', label: 'Pausado' },
]

// ─── Main Component ───

export default function MargenRealPage() {
  const [data, setData] = useState<MargenRealResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [moneda, setMoneda] = useState<'USD' | 'PEN'>('USD')
  const [estadoFiltro, setEstadoFiltro] = useState('__all__')
  const router = useRouter()

  const cargarDatos = () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    params.set('moneda', moneda)
    if (estadoFiltro !== '__all__') params.set('estado', estadoFiltro)
    fetch(`/api/reportes/margen-real?${params}`)
      .then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}))
          throw new Error(err.error || `Error ${r.status}`)
        }
        return r.json()
      })
      .then((result: MargenRealResult) => setData(result))
      .catch(e => setError(e.message || 'Error al cargar datos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    cargarDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moneda, estadoFiltro])

  const handleRowClick = (proyectoId: string) => {
    router.push(`/gestion/reportes/rentabilidad?proyectoId=${proyectoId}`)
  }

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
        <span className="text-foreground font-medium">Margen Real</span>
      </nav>

      {/* Header + Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Dashboard de Margen Real</h1>
          <p className="text-sm text-muted-foreground">
            Rentabilidad real: ingresos valorizados vs costos ejecutados por proyecto
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={moneda} onValueChange={(v) => setMoneda(v as 'USD' | 'PEN')}>
            <SelectTrigger className="w-[100px] text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD" className="text-xs">USD</SelectItem>
              <SelectItem value="PEN" className="text-xs">PEN</SelectItem>
            </SelectContent>
          </Select>
          <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
            <SelectTrigger className="w-[160px] text-xs h-8">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ESTADOS_FILTRO.map(e => (
                <SelectItem key={e.value} value={e.value} className="text-xs">{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={cargarDatos} disabled={loading} className="h-8 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <Card>
          <CardContent className="p-8 text-center">
            <BarChart3 className="h-8 w-8 text-red-400 mx-auto mb-2" />
            <p className="text-sm text-red-600">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Empty state */}
      {data && !loading && data.proyectos.length === 0 && (
        <Card>
          <CardContent className="p-16 text-center">
            <BarChart3 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">Sin datos de rentabilidad</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              No hay proyectos con datos de ingreso y costo calculados.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Data loaded */}
      {data && !loading && data.proyectos.length > 0 && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <KPICard
              icon={TrendingUp}
              iconColor="text-blue-500"
              label="Ingresos valorizados"
              value={formatMoneda(data.resumen.totalIngreso, moneda)}
            />
            <KPICard
              icon={Package}
              iconColor="text-orange-500"
              label="Costos ejecutados"
              value={formatMoneda(data.resumen.totalCosto, moneda)}
            />
            <KPICard
              icon={DollarSign}
              iconColor={data.resumen.totalMargen >= 0 ? 'text-green-500' : 'text-red-500'}
              label="Margen bruto"
              value={formatMoneda(data.resumen.totalMargen, moneda)}
              bgClass={data.resumen.totalMargen >= 0 ? 'bg-green-50' : 'bg-red-50'}
            />
            <KPICard
              icon={TrendingUp}
              iconColor={data.resumen.margenPctPromedio >= 0 ? 'text-green-500' : 'text-red-500'}
              label="Margen promedio ponderado"
              value={`${data.resumen.margenPctPromedio >= 0 ? '+' : ''}${data.resumen.margenPctPromedio.toFixed(1)}%`}
              bgClass={data.resumen.margenPctPromedio >= 0 ? 'bg-green-50' : 'bg-red-50'}
            />
          </div>

          {/* Charts row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Left: Bar chart — Top projects */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Ingresos vs Costos por Proyecto</CardTitle>
              </CardHeader>
              <CardContent>
                <TopProyectosChart
                  mejores={data.topMejores}
                  peores={data.topPeores}
                  moneda={moneda}
                />
              </CardContent>
            </Card>

            {/* Right: Pie chart — Distribution */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Distribución por Rango de Margen</CardTitle>
              </CardHeader>
              <CardContent>
                <DistribucionChart distribucion={data.distribucion} />
              </CardContent>
            </Card>
          </div>

          {/* Cost breakdown mini-cards */}
          <div className="grid grid-cols-3 gap-3">
            <CostoDesglose
              icon={Wrench}
              label="Equipos"
              value={formatMoneda(data.resumen.totalEquipos, moneda)}
              pct={data.resumen.totalCosto > 0 ? (data.resumen.totalEquipos / data.resumen.totalCosto * 100) : 0}
              color="text-blue-600"
            />
            <CostoDesglose
              icon={Users}
              label="Servicios HH"
              value={formatMoneda(data.resumen.totalServicios, moneda)}
              pct={data.resumen.totalCosto > 0 ? (data.resumen.totalServicios / data.resumen.totalCosto * 100) : 0}
              color="text-purple-600"
            />
            <CostoDesglose
              icon={Receipt}
              label="Gastos Op."
              value={formatMoneda(data.resumen.totalGastos, moneda)}
              pct={data.resumen.totalCosto > 0 ? (data.resumen.totalGastos / data.resumen.totalCosto * 100) : 0}
              color="text-orange-600"
            />
          </div>

          {/* Projects table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Detalle por Proyecto ({data.resumen.totalProyectos})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">Proyecto</TableHead>
                      <TableHead className="hidden md:table-cell">Cliente</TableHead>
                      <TableHead className="hidden sm:table-cell text-center">Estado</TableHead>
                      <TableHead className="text-right">Ingreso</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">Costo</TableHead>
                      <TableHead className="text-right">Margen</TableHead>
                      <TableHead className="text-center w-[80px]">Margen%</TableHead>
                      <TableHead className="text-center w-[90px] hidden sm:table-cell">Avance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.proyectos.map(p => {
                      const est = ESTADO_MAP[p.estado] || { label: p.estado, color: 'bg-gray-100 text-gray-700' }
                      return (
                        <TableRow
                          key={p.id}
                          className="cursor-pointer hover:bg-muted/40"
                          onClick={() => handleRowClick(p.id)}
                        >
                          <TableCell>
                            <div>
                              <span className="text-xs text-muted-foreground">{p.codigo}</span>
                              <p className="text-sm font-medium truncate max-w-[200px]">{p.nombre}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell text-xs text-muted-foreground truncate max-w-[150px]">
                            {p.clienteNombre}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-center">
                            <Badge className={`text-[9px] ${est.color} hover:${est.color}`}>
                              {est.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            {formatMoneda(p.ingreso, moneda)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs hidden lg:table-cell">
                            {formatMoneda(p.costoTotal, moneda)}
                          </TableCell>
                          <TableCell className={`text-right font-mono text-xs font-medium ${colorMargenText(p.margenPct)}`}>
                            {formatMoneda(p.margen, moneda)}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`text-[10px] font-mono border ${colorMargen(p.margenPct)}`}>
                              {p.margenPct >= 0 ? '+' : ''}{p.margenPct.toFixed(1)}%
                            </Badge>
                          </TableCell>
                          <TableCell className="hidden sm:table-cell">
                            <AvanceBar pct={p.porcentajeAvanceValorizacion} />
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    {/* Totals row */}
                    <TableRow className="bg-muted/60 font-bold border-t-2">
                      <TableCell className="text-sm">TOTAL</TableCell>
                      <TableCell className="hidden md:table-cell" />
                      <TableCell className="hidden sm:table-cell" />
                      <TableCell className="text-right font-mono text-xs">
                        {formatMoneda(data.resumen.totalIngreso, moneda)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs hidden lg:table-cell">
                        {formatMoneda(data.resumen.totalCosto, moneda)}
                      </TableCell>
                      <TableCell className={`text-right font-mono text-xs ${colorMargenText(data.resumen.margenPctPromedio)}`}>
                        {formatMoneda(data.resumen.totalMargen, moneda)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={`text-[10px] font-mono border ${colorMargen(data.resumen.margenPctPromedio)}`}>
                          {data.resumen.margenPctPromedio >= 0 ? '+' : ''}{data.resumen.margenPctPromedio.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell" />
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

// ─── Sub-components ───

function KPICard({
  icon: Icon,
  iconColor,
  label,
  value,
  bgClass,
}: {
  icon: React.ComponentType<{ className?: string }>
  iconColor: string
  label: string
  value: string
  bgClass?: string
}) {
  return (
    <Card className={bgClass}>
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

function CostoDesglose({
  icon: Icon,
  label,
  value,
  pct,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  pct: number
  color: string
}) {
  return (
    <Card>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-3.5 w-3.5 ${color}`} />
          <span className="text-xs text-muted-foreground">{label}</span>
        </div>
        <p className="text-sm font-bold font-mono">{value}</p>
        <p className="text-[10px] text-muted-foreground">{pct.toFixed(1)}% del costo total</p>
      </CardContent>
    </Card>
  )
}

function AvanceBar({ pct }: { pct: number }) {
  const clamped = Math.min(Math.max(pct, 0), 100)
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-14 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${clamped >= 100 ? 'bg-green-500' : 'bg-blue-500'}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      <span className="text-[10px] font-mono text-muted-foreground w-8">
        {pct.toFixed(0)}%
      </span>
    </div>
  )
}

function TopProyectosChart({
  mejores,
  peores,
  moneda,
}: {
  mejores: ProyectoMargen[]
  peores: ProyectoMargen[]
  moneda: string
}) {
  // Combine: peores first (ascending), then mejores
  const combined = [...peores.reverse(), ...mejores]
  // Deduplicate
  const seen = new Set<string>()
  const chartData = combined
    .filter(p => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
    .slice(0, 10)
    .map(p => ({
      nombre: p.codigo.length > 12 ? p.codigo.substring(0, 12) + '…' : p.codigo,
      ingreso: p.ingreso,
      costo: p.costoTotal,
      margenPct: p.margenPct,
    }))

  if (chartData.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Sin datos</p>
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={(v: number) => formatMonedaCorta(v)} tick={{ fontSize: 10 }} />
        <YAxis type="category" dataKey="nombre" width={80} tick={{ fontSize: 10 }} />
        <Tooltip
          formatter={(value: number, name: string) => [
            formatMoneda(value, moneda),
            name === 'ingreso' ? 'Ingreso' : 'Costo',
          ]}
        />
        <Legend />
        <Bar dataKey="ingreso" name="Ingreso" fill="#3B82F6" barSize={12} />
        <Bar dataKey="costo" name="Costo" fill="#F97316" barSize={12} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function DistribucionChart({ distribucion }: { distribucion: DistribucionItem[] }) {
  const conDatos = distribucion.filter(d => d.cantidad > 0)

  if (conDatos.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">Sin datos</p>
  }

  const chartData = conDatos.map(d => ({
    name: d.rango,
    value: d.cantidad,
    total: d.total,
    fill: DIST_COLORS[d.rango] || '#9CA3AF',
  }))

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width="100%" height={240}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={90}
            label={({ name, value }: { name?: string; value?: string | number }) => `${name ?? ''}: ${value ?? 0}`}
            labelLine={{ strokeWidth: 1 }}
          >
            {chartData.map((entry, idx) => (
              <Cell key={idx} fill={entry.fill} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number, name: string) => [`${value} proyecto(s)`, name]} />
        </PieChart>
      </ResponsiveContainer>
      {/* Legend */}
      <div className="flex flex-wrap gap-3 justify-center mt-2">
        {chartData.map(d => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.fill }} />
            <span>{d.name}: {d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
