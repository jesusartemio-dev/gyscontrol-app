'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, FileSpreadsheet, Loader2, Search, Eye, Upload, Download, Clock, Info, CalendarDays } from 'lucide-react'
import toast from 'react-hot-toast'
import ValorizacionImportExcelModal from '@/components/gestion/ValorizacionImportExcelModal'
import { exportarValAExcel } from '@/lib/utils/valorizacionExcel'

interface Proyecto {
  id: string
  codigo: string
  nombre: string
  totalCliente: number | null
  moneda: string | null
  tipoCambio: number | null
  cotizacionId?: string | null
  adelantoPorcentaje?: number
  adelantoMonto?: number
  adelantoAmortizado?: number
  descuentoComercialPct?: number
  igvPct?: number
  fondoGarantiaPct?: number
}

interface Valorizacion {
  id: string
  proyectoId: string
  numero: number
  codigo: string
  periodoInicio: string
  periodoFin: string
  moneda: string
  tipoCambio: number | null
  presupuestoContractual: number
  acumuladoAnterior: number
  montoValorizacion: number
  acumuladoActual: number
  saldoPorValorizar: number
  porcentajeAvance: number
  descuentoComercialPorcentaje: number
  descuentoComercialMonto: number
  adelantoPorcentaje: number
  adelantoMonto: number
  subtotal: number
  igvPorcentaje: number
  igvMonto: number
  fondoGarantiaPorcentaje: number
  fondoGarantiaMonto: number
  netoARecibir: number
  estado: string
  fechaEnvio: string | null
  fechaAprobacion: string | null
  fechaObservacion: string | null
  fechaCorreccion: string | null
  motivoObservacion: string | null
  ciclosAprobacion: number
  observaciones: string | null
  createdAt: string
  updatedAt: string
  proyecto?: Proyecto
}

const ESTADOS = [
  { value: 'borrador', label: 'Borrador', color: 'bg-gray-100 text-gray-700' },
  { value: 'enviada', label: 'Enviada', color: 'bg-blue-100 text-blue-700' },
  { value: 'observada', label: 'Observada', color: 'bg-orange-100 text-orange-700' },
  { value: 'corregida', label: 'Corregida', color: 'bg-violet-100 text-violet-700' },
  { value: 'aprobada_cliente', label: 'Aprobada', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'hes_pendiente', label: 'HES', color: 'bg-amber-100 text-amber-800' },
  { value: 'facturada', label: 'Facturada', color: 'bg-purple-100 text-purple-700' },
  { value: 'pagada', label: 'Pagada', color: 'bg-green-100 text-green-800' },
  { value: 'anulada', label: 'Anulada', color: 'bg-red-100 text-red-700' },
]

const getEstadoColor = (estado: string) =>
  ESTADOS.find(e => e.value === estado)?.color || 'bg-gray-100 text-gray-700'

const getEstadoLabel = (estado: string) =>
  ESTADOS.find(e => e.value === estado)?.label || estado

const formatCurrency = (amount: number, moneda = 'PEN') =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda === 'USD' ? 'USD' : 'PEN' }).format(amount)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

const formatPeriod = (start: string, end: string) =>
  `${formatDate(start)} — ${formatDate(end)}`

function getRangoFechas(preset: string, desde: string, hasta: string): { desde: Date | null; hasta: Date | null } {
  const now = new Date()
  if (preset === 'this_month') return { desde: new Date(now.getFullYear(), now.getMonth(), 1), hasta: new Date(now.getFullYear(), now.getMonth() + 1, 0) }
  if (preset === 'last_month') return { desde: new Date(now.getFullYear(), now.getMonth() - 1, 1), hasta: new Date(now.getFullYear(), now.getMonth(), 0) }
  if (preset === 'this_quarter') { const q = Math.floor(now.getMonth() / 3); return { desde: new Date(now.getFullYear(), q * 3, 1), hasta: new Date(now.getFullYear(), (q + 1) * 3, 0) } }
  if (preset === 'this_year') return { desde: new Date(now.getFullYear(), 0, 1), hasta: new Date(now.getFullYear(), 11, 31) }
  if (preset === 'custom') return { desde: desde ? new Date(desde) : null, hasta: hasta ? new Date(hasta) : null }
  return { desde: null, hasta: null }
}

// Estados visibles para el rol administracion (desde enviada en adelante)
const ESTADOS_ADMIN = ['enviada', 'observada', 'corregida', 'aprobada_cliente', 'hes_pendiente', 'facturada', 'pagada', 'anulada']

export default function ValorizacionesPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const userRole = session?.user?.role ?? ''
  const esAdmin = userRole === 'administracion'
  const [items, setItems] = useState<Valorizacion[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [savedFilters] = useState<Record<string, string>>(() => {
    try { const s = localStorage.getItem('gyscontrol:valorizaciones:filtros'); return s ? JSON.parse(s) : {} } catch { return {} }
  })
  const [searchTerm, setSearchTerm] = useState<string>(savedFilters.searchTerm ?? '')
  const [filterProyecto, setFilterProyecto] = useState<string>(savedFilters.filterProyecto ?? 'all')
  const [filterEstado, setFilterEstado] = useState<string>(savedFilters.filterEstado ?? 'all')
  const [filterCondicionPago, setFilterCondicionPago] = useState<string>(savedFilters.filterCondicionPago ?? 'all')
  const [filterPeriodPreset, setFilterPeriodPreset] = useState<string>(savedFilters.filterPeriodPreset ?? 'all')
  const [filterPeriodDesde, setFilterPeriodDesde] = useState<string>(savedFilters.filterPeriodDesde ?? '')
  const [filterPeriodHasta, setFilterPeriodHasta] = useState<string>(savedFilters.filterPeriodHasta ?? '')

  // Form fields (create only)
  const [formProyectoId, setFormProyectoId] = useState('')
  const [formPeriodoInicio, setFormPeriodoInicio] = useState('')
  const [formPeriodoFin, setFormPeriodoFin] = useState('')
  const [formDescuento, setFormDescuento] = useState('0')
  const [formAdelanto, setFormAdelanto] = useState('0')
  const [formIgv, setFormIgv] = useState('18')
  const [formFondoGarantia, setFormFondoGarantia] = useState('0')
  const [formMoneda, setFormMoneda] = useState('USD')
  const [formTipoCambio, setFormTipoCambio] = useState('')
  const [showTipoCambio, setShowTipoCambio] = useState(false)
  const [formObservaciones, setFormObservaciones] = useState('')

  const [showImportDialog, setShowImportDialog] = useState(false)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    try {
      localStorage.setItem('gyscontrol:valorizaciones:filtros', JSON.stringify({
        searchTerm, filterProyecto, filterEstado, filterCondicionPago,
        filterPeriodPreset, filterPeriodDesde, filterPeriodHasta,
      }))
    } catch {}
  }, [searchTerm, filterProyecto, filterEstado, filterCondicionPago, filterPeriodPreset, filterPeriodDesde, filterPeriodHasta])

  const loadData = async () => {
    try {
      setLoading(true)
      const [vRes, pRes] = await Promise.all([
        fetch('/api/gestion/valorizaciones'),
        fetch('/api/proyectos?fields=id,codigo,nombre'),
      ])
      let valorizaciones: Valorizacion[] = []
      if (vRes.ok) {
        valorizaciones = await vRes.json()
        setItems(valorizaciones)
      }
      if (pRes.ok) {
        const data = await pRes.json()
        const proyList: Proyecto[] = Array.isArray(data) ? data : data.proyectos || []
        // Enriquecer proyectos con datos de adelanto desde las valorizaciones
        const adelantoMap = new Map<string, { adelantoPorcentaje: number; adelantoMonto: number; adelantoAmortizado: number }>()
        for (const v of valorizaciones) {
          if (v.proyecto && !adelantoMap.has(v.proyecto.id)) {
            const p = v.proyecto as any
            if (p.adelantoPorcentaje !== undefined) {
              adelantoMap.set(p.id, {
                adelantoPorcentaje: p.adelantoPorcentaje ?? 0,
                adelantoMonto: p.adelantoMonto ?? 0,
                adelantoAmortizado: p.adelantoAmortizado ?? 0,
              })
            }
          }
        }
        setProyectos(proyList.map(p => ({
          ...p,
          ...adelantoMap.get(p.id),
        })))
      }
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let result = esAdmin ? items.filter(i => ESTADOS_ADMIN.includes(i.estado)) : items
    if (filterProyecto !== 'all') result = result.filter(i => i.proyectoId === filterProyecto)
    if (filterEstado !== 'all') result = result.filter(i => i.estado === filterEstado)
    if (filterCondicionPago !== 'all') {
      result = filterCondicionPago === '__none__'
        ? result.filter(i => !(i as any).condicionPago)
        : result.filter(i => (i as any).condicionPago === filterCondicionPago)
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(i =>
        i.codigo.toLowerCase().includes(term) ||
        i.proyecto?.nombre.toLowerCase().includes(term) ||
        i.proyecto?.codigo.toLowerCase().includes(term)
      )
    }
    if (filterPeriodPreset !== 'all') {
      const { desde, hasta } = getRangoFechas(filterPeriodPreset, filterPeriodDesde, filterPeriodHasta)
      if (desde || hasta) {
        result = result.filter(i => {
          const fin = new Date(i.periodoFin)
          const inicio = new Date(i.periodoInicio)
          return (!desde || fin >= desde) && (!hasta || inicio <= hasta)
        })
      }
    }
    return result
  }, [items, filterProyecto, filterEstado, filterCondicionPago, searchTerm, filterPeriodPreset, filterPeriodDesde, filterPeriodHasta])

  const estadoCounts = useMemo(() => {
    const base = esAdmin ? items.filter(i => ESTADOS_ADMIN.includes(i.estado)) : items
    const counts: Record<string, number> = {}
    for (const i of base) counts[i.estado] = (counts[i.estado] || 0) + 1
    return counts
  }, [items, esAdmin])

  const totals = useMemo(() => {
    const activas = filtered.filter(i => i.estado !== 'anulada')
    const byMoneda: Record<string, { montoVal: number; neto: number }> = {}
    for (const i of activas) {
      const m = i.moneda || 'PEN'
      if (!byMoneda[m]) byMoneda[m] = { montoVal: 0, neto: 0 }
      byMoneda[m].montoVal += i.montoValorizacion
      byMoneda[m].neto += i.netoARecibir
    }
    return { byMoneda, total: filtered.length, activas: activas.length }
  }, [filtered])

  // Preview info: qué número de valorización se creará y si hay partidas anteriores
  const formPreview = useMemo(() => {
    if (!formProyectoId) return null
    const valsProyecto = items
      .filter(v => v.proyectoId === formProyectoId)
      .sort((a, b) => b.numero - a.numero)
    const ultimaNoAnulada = valsProyecto.find(v => v.estado !== 'anulada')
    const maxNumero = valsProyecto.length > 0 ? valsProyecto[0].numero : 0
    return {
      siguienteNumero: maxNumero + 1,
      ultimaVal: ultimaNoAnulada ? { codigo: ultimaNoAnulada.codigo, numero: ultimaNoAnulada.numero } : null,
      totalExistentes: valsProyecto.length,
    }
  }, [formProyectoId, items])

  const resetForm = () => {
    setFormProyectoId('')
    setFormPeriodoInicio('')
    setFormPeriodoFin('')
    setFormDescuento('0')
    setFormAdelanto('0')
    setFormIgv('18')
    setFormFondoGarantia('0')
    setFormMoneda('USD')
    setFormTipoCambio('')
    setShowTipoCambio(false)
    setFormObservaciones('')
  }

  const openCreate = () => { resetForm(); setShowForm(true) }

  const handleCreate = async () => {
    if (!formPeriodoInicio || !formPeriodoFin) {
      toast.error('Periodo inicio y fin son requeridos')
      return
    }
    if (new Date(formPeriodoFin) <= new Date(formPeriodoInicio)) {
      toast.error('Periodo Fin debe ser posterior a Periodo Inicio')
      return
    }
    if (!formProyectoId) {
      toast.error('Selecciona un proyecto')
      return
    }
    setSaving(true)
    try {
      const payload = {
        montoValorizacion: 0,
        periodoInicio: formPeriodoInicio,
        periodoFin: formPeriodoFin,
        descuentoComercialPorcentaje: parseFloat(formDescuento) || 0,
        adelantoPorcentaje: parseFloat(formAdelanto) || 0,
        igvPorcentaje: parseFloat(formIgv) || 18,
        fondoGarantiaPorcentaje: parseFloat(formFondoGarantia) || 0,
        moneda: formMoneda,
        tipoCambio: formTipoCambio ? parseFloat(formTipoCambio) : null,
        observaciones: formObservaciones || null,
      }

      const res = await fetch(`/api/proyectos/${formProyectoId}/valorizaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error')
      }
      const creada: Valorizacion = await res.json()
      toast.success('Valorización creada — ahora agrega las partidas')
      setShowForm(false)
      resetForm()
      // Navigate to edit page
      router.push(`/gestion/valorizaciones/${creada.id}`)
    } catch (e: any) {
      toast.error(e.message || 'Error al guardar')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Valorizaciones</h1>
          <p className="text-muted-foreground">Gestión de valorizaciones de todos los proyectos</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportarValAExcel(filtered as any)}
          >
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowImportDialog(true)}
          >
            <Upload className="h-4 w-4 mr-1" />
            Importar
          </Button>
          <Button variant="outline" onClick={() => router.push('/gestion/valorizaciones-hh/nueva')}>
            <Clock className="h-4 w-4 mr-2" />
            Nueva Val. HH
          </Button>
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Valorización
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="space-y-2">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar código, proyecto..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Select value={filterProyecto} onValueChange={setFilterProyecto}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Proyecto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los proyectos</SelectItem>
              {proyectos.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.nombre}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos ({esAdmin ? items.filter(i => ESTADOS_ADMIN.includes(i.estado)).length : items.length})</SelectItem>
              {ESTADOS.filter(e => !esAdmin || ESTADOS_ADMIN.includes(e.value)).map(e => {
                const cnt = estadoCounts[e.value] ?? 0
                return (
                  <SelectItem key={e.value} value={e.value}>
                    {e.label}{cnt > 0 ? ` (${cnt})` : ''}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
          <Select value={filterCondicionPago} onValueChange={setFilterCondicionPago}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Condición de pago" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las condiciones</SelectItem>
              <SelectItem value="contado">Contado</SelectItem>
              <SelectItem value="credito">Crédito</SelectItem>
              <SelectItem value="adelanto">Adelanto</SelectItem>
              <SelectItem value="__none__">Sin definir</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterPeriodPreset} onValueChange={v => { setFilterPeriodPreset(v); if (v !== 'custom') { setFilterPeriodDesde(''); setFilterPeriodHasta('') } }}>
            <SelectTrigger className="w-44">
              <CalendarDays className="h-4 w-4 mr-1 text-muted-foreground shrink-0" />
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo el tiempo</SelectItem>
              <SelectItem value="this_month">Este mes</SelectItem>
              <SelectItem value="last_month">Mes pasado</SelectItem>
              <SelectItem value="this_quarter">Este trimestre</SelectItem>
              <SelectItem value="this_year">Este año</SelectItem>
              <SelectItem value="custom">Rango personalizado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {filterPeriodPreset === 'custom' && (
          <div className="flex gap-2 items-center">
            <span className="text-sm text-muted-foreground">Desde</span>
            <Input type="date" className="w-40" value={filterPeriodDesde} onChange={e => setFilterPeriodDesde(e.target.value)} />
            <span className="text-sm text-muted-foreground">Hasta</span>
            <Input type="date" className="w-40" value={filterPeriodHasta} onChange={e => setFilterPeriodHasta(e.target.value)} />
          </div>
        )}
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead className="text-right">Monto Val.</TableHead>
                <TableHead className="text-right">Acumulado</TableHead>
                <TableHead className="text-right">% Avance</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Neto a Recibir</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No hay valorizaciones registradas
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(item => (
                  <TableRow key={item.id} className={item.estado === 'anulada' ? 'opacity-50' : ''}>
                    <TableCell className="font-mono text-sm font-medium">{item.codigo}</TableCell>
                    <TableCell className="text-sm">
                      <div className="font-medium">{item.proyecto?.codigo}</div>
                      <div className="text-muted-foreground text-xs truncate max-w-[200px]">{item.proyecto?.nombre}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatPeriod(item.periodoInicio, item.periodoFin)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(item.montoValorizacion, item.moneda)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">
                      {formatCurrency(item.acumuladoActual, item.moneda)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 bg-gray-200 rounded-full h-2">
                          <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${Math.min(item.porcentajeAvance, 100)}%` }} />
                        </div>
                        <span className="text-xs font-mono">{item.porcentajeAvance.toFixed(1)}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getEstadoColor(item.estado)}>{getEstadoLabel(item.estado)}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {formatCurrency(item.netoARecibir, item.moneda)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => router.push(`/gestion/valorizaciones/${item.id}?mode=view`)} title="Ver detalle">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {filtered.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="py-2 text-sm text-muted-foreground">
                    {totals.activas} valorización{totals.activas !== 1 ? 'es' : ''} activa{totals.activas !== 1 ? 's' : ''}
                    {totals.total !== totals.activas && ` · ${totals.total - totals.activas} anulada${totals.total - totals.activas !== 1 ? 's' : ''}`}
                  </TableCell>
                  <TableCell className="py-2 text-right font-mono text-sm">
                    {Object.entries(totals.byMoneda).map(([m, t]) => (
                      <div key={m}>{formatCurrency(t.montoVal, m)}</div>
                    ))}
                  </TableCell>
                  <TableCell className="py-2" />
                  <TableCell className="py-2" />
                  <TableCell className="py-2" />
                  <TableCell className="py-2 text-right font-mono text-sm font-semibold">
                    {Object.entries(totals.byMoneda).map(([m, t]) => (
                      <div key={m}>{formatCurrency(t.neto, m)}</div>
                    ))}
                  </TableCell>
                  <TableCell className="py-2" />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      {/* Dialog crear */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) { setShowForm(false); resetForm() } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Valorización</DialogTitle>
            <DialogDescription>
              Selecciona un proyecto y completa los datos. Luego podrás agregar las partidas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            <div>
              <Label>Proyecto *</Label>
              <Select value={formProyectoId} onValueChange={id => {
                setFormProyectoId(id)
                const proy = proyectos.find(p => p.id === id)
                if (proy) {
                  setFormMoneda(proy.moneda || 'USD')
                  if (proy.tipoCambio) {
                    setFormTipoCambio(proy.tipoCambio.toString())
                    setShowTipoCambio(true)
                  } else {
                    setFormTipoCambio('')
                    setShowTipoCambio(false)
                  }
                  setFormDescuento((proy.descuentoComercialPct ?? 0).toString())
                  setFormIgv((proy.igvPct ?? 18).toString())
                  setFormFondoGarantia((proy.fondoGarantiaPct ?? 0).toString())
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Selecciona un proyecto" /></SelectTrigger>
                <SelectContent>
                  {proyectos.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formPreview && (
                <div className="mt-2 flex items-start gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
                  <Info className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                  <div className="text-xs text-blue-800 space-y-0.5">
                    <p className="font-medium">Se creará la Valorización #{formPreview.siguienteNumero}</p>
                    {formPreview.ultimaVal ? (
                      <p>Las partidas y configuración de <span className="font-semibold">{formPreview.ultimaVal.codigo}</span> se precargarán automáticamente.</p>
                    ) : (
                      <p>Primera valorización del proyecto — sin partidas previas para precargar.</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Periodo Inicio *</Label>
                <Input type="date" value={formPeriodoInicio} onChange={e => setFormPeriodoInicio(e.target.value)} />
              </div>
              <div>
                <Label>Periodo Fin *</Label>
                <Input type="date" value={formPeriodoFin} onChange={e => setFormPeriodoFin(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Moneda</Label>
                <Select value={formMoneda} onValueChange={setFormMoneda}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                    <SelectItem value="PEN">Soles (PEN)</SelectItem>
                  </SelectContent>
                </Select>
                {!showTipoCambio ? (
                  <button type="button" className="text-xs text-blue-600 hover:underline mt-1" onClick={() => setShowTipoCambio(true)}>
                    ¿Registrar tipo de cambio?
                  </button>
                ) : (
                  <div className="mt-2">
                    <Label>Tipo de Cambio</Label>
                    <Input type="number" step="0.001" placeholder="Ej: 3.75" value={formTipoCambio} onChange={e => setFormTipoCambio(e.target.value)} />
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <Label>Descuento Comercial %</Label>
                  <Input type="number" step="0.01" value={formDescuento} onChange={e => setFormDescuento(e.target.value)} />
                </div>
                <div>
                  <Label>Adelanto %</Label>
                  <Input type="number" step="0.01" value={formAdelanto} onChange={e => setFormAdelanto(e.target.value)} />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>IGV %</Label>
                <Input type="number" step="0.01" value={formIgv} onChange={e => setFormIgv(e.target.value)} />
              </div>
              <div>
                <Label>Fondo de Garantía %</Label>
                <Input type="number" step="0.01" value={formFondoGarantia} onChange={e => setFormFondoGarantia(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Observaciones</Label>
              <Input placeholder="Observaciones..." value={formObservaciones} onChange={e => setFormObservaciones(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm() }}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear y agregar partidas
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ValorizacionImportExcelModal
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        proyectos={proyectos}
        onImported={loadData}
      />
    </div>
  )
}

