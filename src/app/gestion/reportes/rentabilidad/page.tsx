'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Home,
  ChevronRight,
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  Loader2,
  ArrowLeft,
  Package,
  Users,
  Receipt,
  AlertCircle,
  Download,
} from 'lucide-react'
import { toast } from 'sonner'

const fmt = (amount: number, moneda: string = 'USD') =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda === 'USD' ? 'USD' : 'PEN' }).format(amount)

const fmtPct = (pct: number) => `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`

interface ProyectoLightweight {
  id: string
  codigo: string
  nombre: string
}

interface ProyectoResumen {
  id: string
  codigo: string
  nombre: string
  moneda: string
  estado: string
  cliente?: string
  ingreso: number
  presupuestoTotal: number
  costoEquipos: number
  costoServicios: number
  costoGastos: number
  costoTotal: number
  margen: number
  margenPorcentaje: number
}

interface CostoCategoria {
  presupuesto: number
  real: number
  diferencia: number
}

interface ProyectoDetalle {
  proyecto: {
    id: string
    codigo: string
    nombre: string
    moneda: string
    estado: string
    cliente?: string
  }
  ingreso: number
  costos: {
    equipos: CostoCategoria
    servicios: CostoCategoria
    gastos: CostoCategoria
    total: CostoCategoria
  }
  margen: number
  margenPorcentaje: number
}

const ESTADO_LABELS: Record<string, string> = {
  creado: 'Creado',
  en_planificacion: 'Planificación',
  listas_pendientes: 'Listas Pend.',
  listas_aprobadas: 'Listas Aprob.',
  pedidos_creados: 'Pedidos',
  en_ejecucion: 'Ejecución',
  en_cierre: 'Cierre',
  cerrado: 'Cerrado',
  pausado: 'Pausado',
  cancelado: 'Cancelado',
}

export default function RentabilidadPage() {
  const [proyectos, setProyectos] = useState<ProyectoLightweight[]>([])
  const [selectedProyectoId, setSelectedProyectoId] = useState<string>('')
  const [resumen, setResumen] = useState<ProyectoResumen[]>([])
  const [detalle, setDetalle] = useState<ProyectoDetalle | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingDetalle, setLoadingDetalle] = useState(false)

  // Load project list for selector
  useEffect(() => {
    fetch('/api/proyectos?fields=id,codigo,nombre')
      .then(r => r.json())
      .then(data => setProyectos(Array.isArray(data) ? data : []))
      .catch(() => setProyectos([]))
  }, [])

  // Load all projects summary
  useEffect(() => {
    setLoading(true)
    fetch('/api/gestion/reportes/rentabilidad')
      .then(r => r.json())
      .then(data => setResumen(data.proyectos || []))
      .catch(() => setResumen([]))
      .finally(() => setLoading(false))
  }, [])

  // Load project detail when selected
  const cargarDetalle = useCallback((id: string) => {
    setSelectedProyectoId(id)
    setLoadingDetalle(true)
    setDetalle(null)
    fetch(`/api/gestion/reportes/rentabilidad?proyectoId=${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.proyecto) setDetalle(data)
      })
      .catch(() => setDetalle(null))
      .finally(() => setLoadingDetalle(false))
  }, [])

  const volverAResumen = () => {
    setSelectedProyectoId('')
    setDetalle(null)
  }

  // Compute totals for summary view
  const totales = resumen.reduce(
    (acc, p) => ({
      ingresos: acc.ingresos + p.ingreso,
      costos: acc.costos + p.costoTotal,
      presupuesto: acc.presupuesto + p.presupuestoTotal,
    }),
    { ingresos: 0, costos: 0, presupuesto: 0 }
  )
  const margenTotal = totales.ingresos - totales.costos
  const margenTotalPct = totales.ingresos > 0 ? (margenTotal / totales.ingresos) * 100 : 0
  const proyectosConSobrecosto = resumen.filter(p => p.margen < 0).length

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
        <span className="text-foreground font-medium">Rentabilidad</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Rentabilidad por Proyecto</h1>
          <p className="text-sm text-muted-foreground">
            Análisis P&L: ingresos, costos reales y margen por proyecto
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedProyectoId && (
            <Button variant="outline" size="sm" onClick={volverAResumen} className="text-xs">
              <ArrowLeft className="h-3.5 w-3.5 mr-1" />
              Todos
            </Button>
          )}
          <Select
            value={selectedProyectoId}
            onValueChange={(val) => {
              if (val === '__all__') volverAResumen()
              else cargarDetalle(val)
            }}
          >
            <SelectTrigger className="w-[280px] text-xs h-9">
              <SelectValue placeholder="Seleccionar proyecto..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los proyectos</SelectItem>
              {proyectos.map(p => (
                <SelectItem key={p.id} value={p.id} className="text-xs">
                  {p.codigo} - {p.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : selectedProyectoId ? (
        /* ==================== DETAIL VIEW ==================== */
        loadingDetalle ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : detalle ? (
          <DetalleProyecto detalle={detalle} proyectoId={selectedProyectoId} />
        ) : (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No se pudo cargar el detalle del proyecto.</p>
            </CardContent>
          </Card>
        )
      ) : (
        /* ==================== SUMMARY VIEW ==================== */
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Ingresos Totales</span>
                </div>
                <p className="text-lg font-bold">{fmt(totales.ingresos)}</p>
                <p className="text-xs text-muted-foreground">{resumen.length} proyectos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="h-4 w-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">Costos Totales</span>
                </div>
                <p className="text-lg font-bold">{fmt(totales.costos)}</p>
                <p className="text-xs text-muted-foreground">
                  Presup: {fmt(totales.presupuesto)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  {margenTotal >= 0 ? (
                    <TrendingUp className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-xs text-muted-foreground">Margen Bruto</span>
                </div>
                <p className={`text-lg font-bold ${margenTotal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {fmt(margenTotal)}
                </p>
                <p className={`text-xs font-medium ${margenTotalPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {fmtPct(margenTotalPct)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-muted-foreground">Con Sobrecosto</span>
                </div>
                <p className="text-lg font-bold">{proyectosConSobrecosto}</p>
                <p className="text-xs text-muted-foreground">
                  de {resumen.length} proyectos
                </p>
              </CardContent>
            </Card>
          </div>

          {/* All Projects Table */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Todos los Proyectos</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="text-left p-2 pl-4 font-medium">Proyecto</th>
                      <th className="text-left p-2 font-medium hidden md:table-cell">Cliente</th>
                      <th className="text-left p-2 font-medium hidden lg:table-cell">Estado</th>
                      <th className="text-right p-2 font-medium">Ingreso</th>
                      <th className="text-right p-2 font-medium hidden sm:table-cell">Equipos</th>
                      <th className="text-right p-2 font-medium hidden sm:table-cell">Servicios</th>
                      <th className="text-right p-2 font-medium hidden sm:table-cell">Gastos</th>
                      <th className="text-right p-2 font-medium">Costo Total</th>
                      <th className="text-right p-2 font-medium">Margen</th>
                      <th className="text-right p-2 pr-4 font-medium">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {resumen.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center p-8 text-muted-foreground">
                          No hay proyectos con datos financieros.
                        </td>
                      </tr>
                    ) : (
                      resumen.map(p => (
                        <tr
                          key={p.id}
                          className="border-b hover:bg-muted/30 cursor-pointer transition-colors"
                          onClick={() => cargarDetalle(p.id)}
                        >
                          <td className="p-2 pl-4">
                            <div className="font-medium">{p.codigo}</div>
                            <div className="text-muted-foreground truncate max-w-[200px]">{p.nombre}</div>
                          </td>
                          <td className="p-2 hidden md:table-cell text-muted-foreground truncate max-w-[150px]">
                            {p.cliente || '-'}
                          </td>
                          <td className="p-2 hidden lg:table-cell">
                            <Badge variant="outline" className="text-[10px]">
                              {ESTADO_LABELS[p.estado] || p.estado}
                            </Badge>
                          </td>
                          <td className="p-2 text-right font-medium">
                            {fmt(p.ingreso, p.moneda)}
                          </td>
                          <td className="p-2 text-right hidden sm:table-cell text-muted-foreground">
                            {fmt(p.costoEquipos, p.moneda)}
                          </td>
                          <td className="p-2 text-right hidden sm:table-cell text-muted-foreground">
                            {fmt(p.costoServicios, p.moneda)}
                          </td>
                          <td className="p-2 text-right hidden sm:table-cell text-muted-foreground">
                            {fmt(p.costoGastos, p.moneda)}
                          </td>
                          <td className="p-2 text-right font-medium">
                            {fmt(p.costoTotal, p.moneda)}
                          </td>
                          <td className={`p-2 text-right font-semibold ${p.margen >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {fmt(p.margen, p.moneda)}
                          </td>
                          <td className={`p-2 pr-4 text-right font-semibold ${p.margenPorcentaje >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                            {fmtPct(p.margenPorcentaje)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}

/* ==================== DETALLE PROYECTO ==================== */

function DetalleProyecto({ detalle, proyectoId }: { detalle: ProyectoDetalle; proyectoId: string }) {
  const { proyecto, ingreso, costos, margen, margenPorcentaje } = detalle
  const moneda = proyecto.moneda || 'USD'
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch(`/api/gestion/reportes/rentabilidad/exportar?proyectoId=${proyectoId}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al exportar')
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `PL_${proyecto.codigo}_${new Date().toISOString().split('T')[0]}.xlsx`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      toast.success('Reporte P&L exportado')
    } catch (error: any) {
      toast.error(error.message || 'Error al exportar')
    } finally {
      setExporting(false)
    }
  }

  const categorias = [
    { label: 'Equipos', icon: Package, data: costos.equipos, color: 'text-blue-500' },
    { label: 'Servicios', icon: Users, data: costos.servicios, color: 'text-purple-500' },
    { label: 'Gastos Operativos', icon: Receipt, data: costos.gastos, color: 'text-orange-500' },
  ]

  return (
    <div className="space-y-4">
      {/* Project Info */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="outline" className="text-xs">{proyecto.codigo}</Badge>
          <span className="text-sm font-medium">{proyecto.nombre}</span>
          {proyecto.cliente && (
            <span className="text-xs text-muted-foreground">| {proyecto.cliente}</span>
          )}
          <Badge variant="outline" className="text-[10px]">
            {ESTADO_LABELS[proyecto.estado] || proyecto.estado}
          </Badge>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5 mr-1" />
          )}
          Exportar Excel
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="h-4 w-4 text-blue-500" />
              <span className="text-xs text-muted-foreground">Ingreso (Contrato)</span>
            </div>
            <p className="text-lg font-bold">{fmt(ingreso, moneda)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <Receipt className="h-4 w-4 text-orange-500" />
              <span className="text-xs text-muted-foreground">Costo Total Real</span>
            </div>
            <p className="text-lg font-bold">{fmt(costos.total.real, moneda)}</p>
            <p className="text-xs text-muted-foreground">
              Presup: {fmt(costos.total.presupuesto, moneda)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              {margen >= 0 ? (
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              ) : (
                <TrendingDown className="h-4 w-4 text-red-500" />
              )}
              <span className="text-xs text-muted-foreground">Margen Bruto</span>
            </div>
            <p className={`text-lg font-bold ${margen >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {fmt(margen, moneda)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <BarChart3 className="h-4 w-4 text-cyan-500" />
              <span className="text-xs text-muted-foreground">Margen %</span>
            </div>
            <p className={`text-2xl font-bold ${margenPorcentaje >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
              {fmtPct(margenPorcentaje)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget vs Real Comparison Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Comparativa Presupuesto vs Real</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left p-3 font-medium">Categoría</th>
                <th className="text-right p-3 font-medium">Presupuesto</th>
                <th className="text-right p-3 font-medium">Real</th>
                <th className="text-right p-3 font-medium">Diferencia</th>
                <th className="text-center p-3 font-medium">Estado</th>
              </tr>
            </thead>
            <tbody>
              {categorias.map(({ label, icon: Icon, data, color }) => (
                <tr key={label} className="border-b">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-3.5 w-3.5 ${color}`} />
                      <span className="font-medium">{label}</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">{fmt(data.presupuesto, moneda)}</td>
                  <td className="p-3 text-right font-medium">{fmt(data.real, moneda)}</td>
                  <td className={`p-3 text-right font-semibold ${data.diferencia >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {data.diferencia >= 0 ? '+' : ''}{fmt(data.diferencia, moneda)}
                  </td>
                  <td className="p-3 text-center">
                    <DiferenciaIndicador diferencia={data.diferencia} presupuesto={data.presupuesto} />
                  </td>
                </tr>
              ))}
              {/* Total Row */}
              <tr className="bg-muted/30 font-semibold">
                <td className="p-3">
                  <span className="font-bold">TOTAL</span>
                </td>
                <td className="p-3 text-right">{fmt(costos.total.presupuesto, moneda)}</td>
                <td className="p-3 text-right">{fmt(costos.total.real, moneda)}</td>
                <td className={`p-3 text-right ${costos.total.diferencia >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {costos.total.diferencia >= 0 ? '+' : ''}{fmt(costos.total.diferencia, moneda)}
                </td>
                <td className="p-3 text-center">
                  <DiferenciaIndicador diferencia={costos.total.diferencia} presupuesto={costos.total.presupuesto} />
                </td>
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Visual Bars */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Distribución de Costos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {categorias.map(({ label, data, color }) => {
            const maxVal = Math.max(data.presupuesto, data.real, 1)
            const pctPresupuesto = (data.presupuesto / maxVal) * 100
            const pctReal = (data.real / maxVal) * 100
            return (
              <div key={label} className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium">{label}</span>
                  <span className={`text-xs font-semibold ${data.diferencia >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {data.presupuesto > 0
                      ? `${((data.real / data.presupuesto) * 100).toFixed(0)}% del presupuesto`
                      : 'Sin presupuesto'}
                  </span>
                </div>
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-12">Presup.</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div className="bg-blue-400 h-2 rounded-full transition-all" style={{ width: `${pctPresupuesto}%` }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground w-12">Real</span>
                    <div className="flex-1 bg-muted rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${data.diferencia >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`}
                        style={{ width: `${pctReal}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

function DiferenciaIndicador({ diferencia, presupuesto }: { diferencia: number; presupuesto: number }) {
  if (presupuesto === 0 && diferencia === 0) {
    return <Badge variant="outline" className="text-[10px]">Sin dato</Badge>
  }
  if (diferencia > 0) {
    return <Badge className="text-[10px] bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Ahorro</Badge>
  }
  if (diferencia < 0) {
    return <Badge className="text-[10px] bg-red-100 text-red-700 hover:bg-red-100">Sobrecosto</Badge>
  }
  return <Badge variant="outline" className="text-[10px]">En línea</Badge>
}
