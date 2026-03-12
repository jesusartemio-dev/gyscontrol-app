'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Home,
  ChevronRight,
  ChevronDown,
  Loader2,
  DollarSign,
  Package,
  Users,
  Receipt,
  RefreshCw,
  BarChart3,
  Clock,
} from 'lucide-react'

// ─── Types ───

interface UsuarioDetalle {
  usuarioId: string
  nombre: string
  horas: number
  costoHora: number
  subtotal: number
}

interface ProyectoCosto {
  id: string
  codigo: string
  nombre: string
  clienteNombre: string
  estado: string
  moneda: string
  equipos: number
  servicios: number
  gastos: number
  total: number
  horas: number
  usuariosDetalle: UsuarioDetalle[]
}

interface Resumen {
  totalProyectos: number
  totalEquipos: number
  totalServicios: number
  totalGastos: number
  totalGeneral: number
  totalHoras: number
  moneda: string
}

interface CostosRealesResult {
  proyectos: ProyectoCosto[]
  resumen: Resumen
  fechaCalculo: string
}

// ─── Helpers ───

function formatMoneda(n: number, moneda: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: moneda === 'PEN' ? 'PEN' : 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
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

const ESTADOS_FILTRO = [
  { value: '__all__', label: 'Todos los estados' },
  { value: 'en_ejecucion', label: 'En ejecución' },
  { value: 'cerrado', label: 'Cerrado' },
  { value: 'en_cierre', label: 'En cierre' },
  { value: 'pausado', label: 'Pausado' },
]

// ─── Main Component ───

export default function CostosRealesPage() {
  const [data, setData] = useState<CostosRealesResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [moneda, setMoneda] = useState<'USD' | 'PEN'>('USD')
  const [estadoFiltro, setEstadoFiltro] = useState('__all__')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const cargarDatos = () => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    params.set('moneda', moneda)
    if (estadoFiltro !== '__all__') params.set('estado', estadoFiltro)
    fetch(`/api/reportes/costos-reales?${params}`)
      .then(async r => {
        if (!r.ok) {
          const err = await r.json().catch(() => ({}))
          throw new Error(err.error || `Error ${r.status}`)
        }
        return r.json()
      })
      .then((result: CostosRealesResult) => setData(result))
      .catch(e => setError(e.message || 'Error al cargar datos'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    cargarDatos()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moneda, estadoFiltro])

  const toggleRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const simbolo = moneda === 'PEN' ? 'S/' : '$'

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
        <span className="text-foreground font-medium">Costos Reales</span>
      </nav>

      {/* Header + Filtros */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Costos Reales</h1>
          <p className="text-sm text-muted-foreground">
            Desglose de costos ejecutados por proyecto: equipos, servicios (HH) y gastos
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
            <DollarSign className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground mb-2">Sin costos registrados</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              No hay proyectos con costos reales ejecutados.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Data loaded */}
      {data && !loading && data.proyectos.length > 0 && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-red-500" />
                  <span className="text-xs text-muted-foreground">Costo Total</span>
                </div>
                <p className="text-lg font-bold font-mono">{formatMoneda(data.resumen.totalGeneral, moneda)}</p>
                <p className="text-[10px] text-muted-foreground">{data.resumen.totalProyectos} proyectos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Package className="h-4 w-4 text-blue-500" />
                  <span className="text-xs text-muted-foreground">Equipos</span>
                </div>
                <p className="text-lg font-bold font-mono">{formatMoneda(data.resumen.totalEquipos, moneda)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {data.resumen.totalGeneral > 0 ? ((data.resumen.totalEquipos / data.resumen.totalGeneral) * 100).toFixed(1) : 0}% del total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Users className="h-4 w-4 text-purple-500" />
                  <span className="text-xs text-muted-foreground">Servicios HH</span>
                </div>
                <p className="text-lg font-bold font-mono">{formatMoneda(data.resumen.totalServicios, moneda)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {data.resumen.totalGeneral > 0 ? ((data.resumen.totalServicios / data.resumen.totalGeneral) * 100).toFixed(1) : 0}% del total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Receipt className="h-4 w-4 text-orange-500" />
                  <span className="text-xs text-muted-foreground">Gastos Op.</span>
                </div>
                <p className="text-lg font-bold font-mono">{formatMoneda(data.resumen.totalGastos, moneda)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {data.resumen.totalGeneral > 0 ? ((data.resumen.totalGastos / data.resumen.totalGeneral) * 100).toFixed(1) : 0}% del total
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-cyan-500" />
                  <span className="text-xs text-muted-foreground">Total Horas</span>
                </div>
                <p className="text-lg font-bold font-mono">{data.resumen.totalHoras.toLocaleString('en-US', { maximumFractionDigits: 1 })}h</p>
                <p className="text-[10px] text-muted-foreground">Horas registradas</p>
              </CardContent>
            </Card>
          </div>

          {/* Projects table with expandable rows */}
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
                      <TableHead className="w-[30px]"></TableHead>
                      <TableHead className="min-w-[180px]">Proyecto</TableHead>
                      <TableHead className="hidden md:table-cell">Cliente</TableHead>
                      <TableHead className="hidden sm:table-cell text-center">Estado</TableHead>
                      <TableHead className="text-right">Equipos</TableHead>
                      <TableHead className="text-right">Servicios</TableHead>
                      <TableHead className="text-right hidden lg:table-cell">Gastos</TableHead>
                      <TableHead className="text-center hidden lg:table-cell">Horas</TableHead>
                      <TableHead className="text-right font-semibold">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.proyectos.map(p => {
                      const est = ESTADO_MAP[p.estado] || { label: p.estado, color: 'bg-gray-100 text-gray-700' }
                      const isExpanded = expandedRows.has(p.id)
                      const hasDetalle = p.usuariosDetalle.length > 0

                      return (
                        <>
                          <TableRow
                            key={p.id}
                            className={`cursor-pointer hover:bg-muted/40 ${isExpanded ? 'bg-muted/20' : ''}`}
                            onClick={() => hasDetalle && toggleRow(p.id)}
                          >
                            <TableCell className="px-2">
                              {hasDetalle && (
                                <ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`} />
                              )}
                            </TableCell>
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
                              {p.equipos > 0 ? formatMoneda(p.equipos, moneda) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              {p.servicios > 0 ? (
                                <span className="text-purple-700 font-medium">{formatMoneda(p.servicios, moneda)}</span>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs hidden lg:table-cell">
                              {p.gastos > 0 ? formatMoneda(p.gastos, moneda) : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-center font-mono text-xs hidden lg:table-cell">
                              {p.horas > 0 ? `${p.horas.toLocaleString('en-US', { maximumFractionDigits: 1 })}h` : <span className="text-muted-foreground">—</span>}
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs font-bold">
                              {formatMoneda(p.total, moneda)}
                            </TableCell>
                          </TableRow>

                          {/* Expanded: user detail for Servicios */}
                          {isExpanded && p.usuariosDetalle.map(u => (
                            <TableRow key={`${p.id}-${u.usuarioId}`} className="bg-purple-50/50 hover:bg-purple-50">
                              <TableCell />
                              <TableCell colSpan={2} className="pl-8">
                                <div className="flex items-center gap-2">
                                  <Users className="h-3 w-3 text-purple-400" />
                                  <span className="text-xs font-medium">{u.nombre}</span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden sm:table-cell" />
                              <TableCell className="text-right text-xs text-muted-foreground">—</TableCell>
                              <TableCell className="text-right font-mono text-xs text-purple-700">
                                {formatMoneda(u.subtotal, moneda)}
                              </TableCell>
                              <TableCell className="text-right text-xs text-muted-foreground hidden lg:table-cell">
                                {simbolo}{u.costoHora.toFixed(2)}/h
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs hidden lg:table-cell">
                                {u.horas.toLocaleString('en-US', { maximumFractionDigits: 1 })}h
                              </TableCell>
                              <TableCell className="text-right font-mono text-xs text-muted-foreground">
                                {formatMoneda(u.subtotal, moneda)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </>
                      )
                    })}

                    {/* Totals row */}
                    <TableRow className="bg-muted/60 font-bold border-t-2">
                      <TableCell />
                      <TableCell className="text-sm">TOTAL</TableCell>
                      <TableCell className="hidden md:table-cell" />
                      <TableCell className="hidden sm:table-cell" />
                      <TableCell className="text-right font-mono text-xs">
                        {formatMoneda(data.resumen.totalEquipos, moneda)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-purple-700">
                        {formatMoneda(data.resumen.totalServicios, moneda)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs hidden lg:table-cell">
                        {formatMoneda(data.resumen.totalGastos, moneda)}
                      </TableCell>
                      <TableCell className="text-center font-mono text-xs hidden lg:table-cell">
                        {data.resumen.totalHoras.toLocaleString('en-US', { maximumFractionDigits: 1 })}h
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatMoneda(data.resumen.totalGeneral, moneda)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-[10px] text-muted-foreground text-right">
            Calculado: {new Date(data.fechaCalculo).toLocaleString('es-PE')}
          </p>
        </>
      )}
    </div>
  )
}
