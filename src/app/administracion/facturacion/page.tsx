'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Search, Eye, Receipt, DollarSign, FileSpreadsheet, Check, Ban, Undo2, CalendarDays, ClipboardCheck, Upload } from 'lucide-react'
import toast from 'react-hot-toast'

interface Proyecto {
  id: string
  codigo: string
  nombre: string
  totalCliente: number | null
  clienteId: string | null
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
  observaciones: string | null
  numeroHES: string | null
  numeroGuiaRemision: string | null
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

function getRangoFechas(preset: string, desde: string, hasta: string): { desde: Date | null; hasta: Date | null } {
  const now = new Date()
  if (preset === 'this_month') return { desde: new Date(now.getFullYear(), now.getMonth(), 1), hasta: new Date(now.getFullYear(), now.getMonth() + 1, 0) }
  if (preset === 'last_month') return { desde: new Date(now.getFullYear(), now.getMonth() - 1, 1), hasta: new Date(now.getFullYear(), now.getMonth(), 0) }
  if (preset === 'this_quarter') { const q = Math.floor(now.getMonth() / 3); return { desde: new Date(now.getFullYear(), q * 3, 1), hasta: new Date(now.getFullYear(), (q + 1) * 3, 0) } }
  if (preset === 'this_year') return { desde: new Date(now.getFullYear(), 0, 1), hasta: new Date(now.getFullYear(), 11, 31) }
  if (preset === 'custom') return { desde: desde ? new Date(desde) : null, hasta: hasta ? new Date(hasta) : null }
  return { desde: null, hasta: null }
}

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

const FLOW_STEPS = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'observada', label: 'Observada' },
  { value: 'corregida', label: 'Corregida' },
  { value: 'aprobada_cliente', label: 'Aprobada' },
  { value: 'hes_pendiente', label: 'HES' },
  { value: 'facturada', label: 'Facturada' },
  { value: 'pagada', label: 'Pagada' },
]

function FlowBanner({ estado }: { estado: string }) {
  if (estado === 'anulada') {
    return (
      <div className="flex items-center justify-center py-2">
        <Badge className="bg-red-100 text-red-700 text-sm px-4 py-1">Anulada</Badge>
      </div>
    )
  }

  const currentIdx = FLOW_STEPS.findIndex(s => s.value === estado)

  return (
    <div className="flex items-center gap-1 py-2 overflow-x-auto">
      {FLOW_STEPS.map((step, idx) => {
        const isPast = idx < currentIdx
        const isCurrent = idx === currentIdx

        return (
          <React.Fragment key={step.value}>
            {idx > 0 && (
              <div className={`h-0.5 w-4 flex-shrink-0 ${isPast || isCurrent ? 'bg-emerald-400' : 'bg-gray-200'}`} />
            )}
            <div
              className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap flex-shrink-0 ${
                isCurrent
                  ? 'bg-emerald-100 text-emerald-700 ring-2 ring-emerald-400'
                  : isPast
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-gray-100 text-gray-400'
              }`}
            >
              {(isPast || isCurrent) && <Check className="h-3 w-3" />}
              {step.label}
            </div>
          </React.Fragment>
        )
      })}
    </div>
  )
}

type TabFilter = 'pendientes' | 'facturadas' | 'pagadas' | 'anuladas' | 'todas'

export default function FacturacionPage() {
  const [items, setItems] = useState<Valorizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDetail, setShowDetail] = useState<Valorizacion | null>(null)

  const [savedFilters] = useState<Record<string, string>>(() => {
    try { const s = localStorage.getItem('gyscontrol:facturacion:filtros'); return s ? JSON.parse(s) : {} } catch { return {} }
  })
  const [searchTerm, setSearchTerm] = useState<string>(savedFilters.searchTerm ?? '')
  const [tabFilter, setTabFilter] = useState<TabFilter>((savedFilters.tabFilter as TabFilter) ?? 'pendientes')
  const [filterPeriodPreset, setFilterPeriodPreset] = useState<string>(savedFilters.filterPeriodPreset ?? 'all')
  const [filterPeriodDesde, setFilterPeriodDesde] = useState<string>(savedFilters.filterPeriodDesde ?? '')
  const [filterPeriodHasta, setFilterPeriodHasta] = useState<string>(savedFilters.filterPeriodHasta ?? '')
  const [filterMoneda, setFilterMoneda] = useState<string>(savedFilters.filterMoneda ?? 'all')

  // Facturar dialog
  const [showFacturarDialog, setShowFacturarDialog] = useState(false)
  const [facturarTarget, setFacturarTarget] = useState<Valorizacion | null>(null)
  const [numFactura, setNumFactura] = useState('')
  const [fechaEmisionFactura, setFechaEmisionFactura] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [factCondicionPago, setFactCondicionPago] = useState('contado')
  const [factDiasCredito, setFactDiasCredito] = useState<number | ''>('')

  // Registrar HES dialog
  const [showHESDialog, setShowHESDialog] = useState(false)
  const [hesTarget, setHesTarget] = useState<Valorizacion | null>(null)
  const [hesTipo, setHesTipo] = useState('hes')
  const [hesNumero, setHesNumero] = useState('')
  const [hesFecha, setHesFecha] = useState('')
  const [hesArchivo, setHesArchivo] = useState<File | null>(null)
  const [uploadingHES, setUploadingHES] = useState(false)

  // Generic estado dialog (pagada)
  const [showEstadoDialog, setShowEstadoDialog] = useState(false)
  const [estadoTarget, setEstadoTarget] = useState<{ val: Valorizacion; estado: string } | null>(null)

  // Anular confirm dialog
  const [confirmAnular, setConfirmAnular] = useState<Valorizacion | null>(null)

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    try {
      localStorage.setItem('gyscontrol:facturacion:filtros', JSON.stringify({
        searchTerm, tabFilter, filterPeriodPreset, filterPeriodDesde, filterPeriodHasta, filterMoneda,
      }))
    } catch {}
  }, [searchTerm, tabFilter, filterPeriodPreset, filterPeriodDesde, filterPeriodHasta, filterMoneda])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/gestion/valorizaciones')
      if (res.ok) {
        const data = await res.json()
        setItems(data.filter((v: Valorizacion) =>
          ['aprobada_cliente', 'hes_pendiente', 'facturada', 'pagada', 'anulada'].includes(v.estado)
        ))
      }
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let result = items
    if (tabFilter === 'pendientes') result = result.filter(i => ['aprobada_cliente', 'hes_pendiente'].includes(i.estado))
    else if (tabFilter === 'facturadas') result = result.filter(i => i.estado === 'facturada')
    else if (tabFilter === 'pagadas') result = result.filter(i => i.estado === 'pagada')
    else if (tabFilter === 'anuladas') result = result.filter(i => i.estado === 'anulada')
    if (filterMoneda !== 'all') result = result.filter(i => i.moneda === filterMoneda)
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
  }, [items, tabFilter, searchTerm, filterPeriodPreset, filterPeriodDesde, filterPeriodHasta, filterMoneda])

  const counts = useMemo(() => ({
    pendientes: items.filter(i => ['aprobada_cliente', 'hes_pendiente'].includes(i.estado)).length,
    facturadas: items.filter(i => i.estado === 'facturada').length,
    pagadas: items.filter(i => i.estado === 'pagada').length,
    anuladas: items.filter(i => i.estado === 'anulada').length,
    todas: items.length,
  }), [items])

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

  // Open registrar HES dialog
  const openRegistrarHES = (val: Valorizacion) => {
    setHesTarget(val)
    setHesTipo('hes')
    setHesNumero('')
    setHesFecha(new Date().toISOString().split('T')[0])
    setHesArchivo(null)
    setShowHESDialog(true)
  }

  // Handle registrar HES: sube archivo (opcional) + avanza a hes_pendiente
  const handleRegistrarHES = async () => {
    if (!hesTarget) return
    if (!hesNumero.trim()) {
      toast.error('Ingresa el número de documento HES')
      return
    }
    setUploadingHES(true)
    try {
      // 1. Guardar datos de conformidad en la valorización y avanzar a hes_pendiente
      const res = await fetch(`/api/proyectos/${hesTarget.proyectoId}/valorizaciones/${hesTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'hes_pendiente',
          tipoConformidad: hesTipo,
          numeroHES: hesTipo === 'hes' ? hesNumero.trim() : undefined,
          numeroGuiaRemision: hesTipo === 'guia_remision' ? hesNumero.trim() : undefined,
          fechaConformidad: hesFecha || undefined,
        }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => null)
        throw new Error(err?.error || 'Error al registrar HES')
      }

      // 2. Si hay archivo adjunto, subirlo
      if (hesArchivo) {
        const formData = new FormData()
        formData.append('file', hesArchivo)
        formData.append('categoria', hesTipo === 'guia_remision' ? 'guia_almacen' : 'hes')
        const uploadRes = await fetch(
          `/api/proyectos/${hesTarget.proyectoId}/valorizaciones/${hesTarget.id}/adjuntos`,
          { method: 'POST', body: formData }
        )
        if (!uploadRes.ok) toast.error('Datos guardados pero falló la subida del archivo')
      }

      toast.success('HES registrado — listo para facturar')
      setShowHESDialog(false)
      setHesTarget(null)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar HES')
    } finally {
      setUploadingHES(false)
    }
  }

  // Open facturar dialog
  const openFacturar = (val: Valorizacion) => {
    setFacturarTarget(val)
    setNumFactura('')
    setFechaEmisionFactura(new Date().toISOString().split('T')[0])
    const venc = new Date()
    venc.setDate(venc.getDate() + 30)
    setFechaVencimiento(venc.toISOString().split('T')[0])
    setFactCondicionPago('contado')
    setFactDiasCredito('')
    setShowFacturarDialog(true)
  }

  // Handle facturar with CxC creation
  const handleFacturar = async () => {
    if (!facturarTarget) return
    if (!numFactura.trim()) {
      toast.error('Ingresa el N° de factura')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/proyectos/${facturarTarget.proyectoId}/valorizaciones/${facturarTarget.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: 'facturada',
          crearCuentaCobrar: true,
          numeroDocumento: numFactura.trim(),
          fechaEmision: fechaEmisionFactura || undefined,
          fechaVencimiento,
          condicionPago: factCondicionPago,
          diasCredito: factCondicionPago === 'credito' && factDiasCredito ? Number(factDiasCredito) : undefined,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Valorización facturada y CxC creada')
      setShowFacturarDialog(false)
      setFacturarTarget(null)
      loadData()
    } catch {
      toast.error('Error al facturar')
    } finally {
      setSaving(false)
    }
  }

  // Open generic estado transition
  const openEstadoTransition = (val: Valorizacion, nuevoEstado: string) => {
    setEstadoTarget({ val, estado: nuevoEstado })
    setShowEstadoDialog(true)
  }

  const handleEstadoChange = async () => {
    if (!estadoTarget) return
    setSaving(true)
    try {
      const res = await fetch(`/api/proyectos/${estadoTarget.val.proyectoId}/valorizaciones/${estadoTarget.val.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: estadoTarget.estado }),
      })
      if (!res.ok) throw new Error()
      toast.success(`Estado cambiado a ${getEstadoLabel(estadoTarget.estado)}`)
      setShowEstadoDialog(false)
      setEstadoTarget(null)
      loadData()
    } catch {
      toast.error('Error al cambiar estado')
    } finally {
      setSaving(false)
    }
  }

  // Anular
  const handleAnular = (val: Valorizacion) => {
    setConfirmAnular(val)
  }

  const executeAnular = async () => {
    if (!confirmAnular) return
    setSaving(true)
    try {
      const res = await fetch(`/api/proyectos/${confirmAnular.proyectoId}/valorizaciones/${confirmAnular.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'anulada' }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => null)
        throw new Error(data?.error || 'Error al anular')
      }
      toast.success('Valorización anulada correctamente')
      setConfirmAnular(null)
      loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error al anular')
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
      <div>
        <h1 className="text-2xl font-bold">Facturación</h1>
        <p className="text-muted-foreground">Gestión de facturación de valorizaciones aprobadas</p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTabFilter('pendientes')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Por Facturar</p>
                <p className="text-2xl font-bold text-purple-600">{counts.pendientes}</p>
              </div>
              <Receipt className="h-8 w-8 text-purple-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTabFilter('facturadas')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Facturadas (por cobrar)</p>
                <p className="text-2xl font-bold text-blue-600">{counts.facturadas}</p>
              </div>
              <FileSpreadsheet className="h-8 w-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setTabFilter('pagadas')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pagadas</p>
                <p className="text-2xl font-bold text-emerald-600">{counts.pagadas}</p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex gap-3 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar código, proyecto..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Select value={filterMoneda} onValueChange={setFilterMoneda}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Moneda" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las monedas</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="PEN">PEN</SelectItem>
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
          <div className="flex gap-1 flex-wrap">
            {([
              { key: 'pendientes', label: 'Por Facturar' },
              { key: 'facturadas', label: 'Facturadas' },
              { key: 'pagadas', label: 'Pagadas' },
              { key: 'anuladas', label: 'Anuladas' },
              { key: 'todas', label: 'Todas' },
            ] as { key: TabFilter; label: string }[]).map(tab => (
              <Button
                key={tab.key}
                variant={tabFilter === tab.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTabFilter(tab.key)}
              >
                {tab.label} ({counts[tab.key]})
              </Button>
            ))}
          </div>
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead>Periodo</TableHead>
                <TableHead className="text-right">Monto Val.</TableHead>
                <TableHead className="text-right">Neto a Recibir</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <FileSpreadsheet className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No hay valorizaciones en esta categoría
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(item => (
                  <TableRow key={item.id}>
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
                    <TableCell className="text-right font-mono text-sm font-semibold">
                      {formatCurrency(item.netoARecibir, item.moneda)}
                    </TableCell>
                    <TableCell>
                      <Badge className={getEstadoColor(item.estado)}>{getEstadoLabel(item.estado)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setShowDetail(item)} title="Ver detalle">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {item.estado === 'aprobada_cliente' && (
                          <Button variant="ghost" size="icon" onClick={() => openRegistrarHES(item)} title="Registrar HES">
                            <ClipboardCheck className="h-4 w-4 text-amber-600" />
                          </Button>
                        )}
                        {item.estado === 'hes_pendiente' && (
                          <Button variant="ghost" size="icon" onClick={() => openFacturar(item)} title="Facturar">
                            <Receipt className="h-4 w-4 text-purple-600" />
                          </Button>
                        )}
                        {item.estado === 'facturada' && (
                          <Button variant="ghost" size="icon" onClick={() => openEstadoTransition(item, 'pagada')} title="Marcar pagada">
                            <DollarSign className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                        {item.estado === 'pagada' && (
                          <Button variant="ghost" size="icon" onClick={() => openEstadoTransition(item, 'facturada')} title="Revertir pago">
                            <Undo2 className="h-4 w-4 text-amber-600" />
                          </Button>
                        )}
                        {item.estado === 'facturada' && (
                          <Button variant="ghost" size="icon" onClick={() => openEstadoTransition(item, 'aprobada_cliente')} title="Revertir factura">
                            <Undo2 className="h-4 w-4 text-amber-600" />
                          </Button>
                        )}
                        {(['facturada', 'pagada'].includes(item.estado)) && (
                          <Button variant="ghost" size="icon" onClick={() => handleAnular(item)} title="Anular">
                            <Ban className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
            {filtered.length > 0 && (
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="py-2 text-sm text-muted-foreground">
                    {totals.activas} valorización{totals.activas !== 1 ? 'es' : ''}
                    {totals.total !== totals.activas && ` · ${totals.total - totals.activas} anulada${totals.total - totals.activas !== 1 ? 's' : ''}`}
                  </TableCell>
                  <TableCell className="py-2 text-right font-mono text-sm">
                    {Object.entries(totals.byMoneda).map(([m, t]) => (
                      <div key={m}>{formatCurrency(t.montoVal, m)}</div>
                    ))}
                  </TableCell>
                  <TableCell className="py-2 text-right font-mono text-sm font-semibold">
                    {Object.entries(totals.byMoneda).map(([m, t]) => (
                      <div key={m}>{formatCurrency(t.neto, m)}</div>
                    ))}
                  </TableCell>
                  <TableCell className="py-2" />
                  <TableCell className="py-2" />
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!showDetail} onOpenChange={open => { if (!open) setShowDetail(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Valorización {showDetail?.codigo}</DialogTitle>
            <DialogDescription>
              {showDetail?.proyecto?.codigo} — {showDetail?.proyecto?.nombre}
            </DialogDescription>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-3 text-sm max-h-[60vh] overflow-y-auto">
              <FlowBanner estado={showDetail.estado} />

              <div className="flex items-center gap-2">
                <Badge variant="outline">{showDetail.moneda}</Badge>
                {showDetail.tipoCambio && <span className="text-xs text-muted-foreground">TC: {showDetail.tipoCambio}</span>}
                <span className="text-muted-foreground">{formatPeriod(showDetail.periodoInicio, showDetail.periodoFin)}</span>
              </div>

              <Card>
                <CardContent className="p-3 space-y-1">
                  <div className="font-medium mb-2">Avance del Proyecto</div>
                  <Row label="Presupuesto Contractual" value={formatCurrency(showDetail.presupuestoContractual, showDetail.moneda)} />
                  <Row label="Acumulado Anterior" value={formatCurrency(showDetail.acumuladoAnterior, showDetail.moneda)} />
                  <Row label="Monto Valorización" value={formatCurrency(showDetail.montoValorizacion, showDetail.moneda)} bold />
                  <Row label="Acumulado Actual" value={formatCurrency(showDetail.acumuladoActual, showDetail.moneda)} />
                  <Row label="Saldo por Valorizar" value={formatCurrency(showDetail.saldoPorValorizar, showDetail.moneda)} />
                  <div className="flex items-center gap-2 pt-1">
                    <div className="flex-1 bg-gray-200 rounded-full h-2.5">
                      <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${Math.min(showDetail.porcentajeAvance, 100)}%` }} />
                    </div>
                    <span className="font-mono text-xs">{showDetail.porcentajeAvance.toFixed(1)}%</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-3 space-y-1">
                  <div className="font-medium mb-2">Montos Financieros</div>
                  <Row label="Monto Valorización" value={formatCurrency(showDetail.montoValorizacion, showDetail.moneda)} />
                  {showDetail.descuentoComercialMonto > 0 && (
                    <Row label={`(-) Descuento (${showDetail.descuentoComercialPorcentaje}%)`} value={`-${formatCurrency(showDetail.descuentoComercialMonto, showDetail.moneda)}`} color="text-red-600" />
                  )}
                  {showDetail.adelantoMonto > 0 && (
                    <Row label={`(-) Adelanto (${showDetail.adelantoPorcentaje}%)`} value={`-${formatCurrency(showDetail.adelantoMonto, showDetail.moneda)}`} color="text-red-600" />
                  )}
                  <Row label="Subtotal" value={formatCurrency(showDetail.subtotal, showDetail.moneda)} border />
                  <Row label={`(+) IGV (${showDetail.igvPorcentaje}%)`} value={`+${formatCurrency(showDetail.igvMonto, showDetail.moneda)}`} />
                  {showDetail.fondoGarantiaMonto > 0 && (
                    <Row label={`(-) Fondo Garantía (${showDetail.fondoGarantiaPorcentaje}%)`} value={`-${formatCurrency(showDetail.fondoGarantiaMonto, showDetail.moneda)}`} color="text-orange-600" />
                  )}
                  <Row label="Neto a Recibir" value={formatCurrency(showDetail.netoARecibir, showDetail.moneda)} bold border />
                </CardContent>
              </Card>

              {showDetail.observaciones && (
                <div>
                  <span className="font-medium">Observaciones:</span>
                  <p className="text-muted-foreground mt-1">{showDetail.observaciones}</p>
                </div>
              )}
              {showDetail.fechaEnvio && <Row label="Fecha Envío" value={formatDate(showDetail.fechaEnvio)} />}
              {showDetail.fechaAprobacion && <Row label="Fecha Aprobación" value={formatDate(showDetail.fechaAprobacion)} />}
            </div>
          )}
          <DialogFooter className="gap-2">
            {showDetail?.estado === 'aprobada_cliente' && (
              <Button onClick={() => { setShowDetail(null); openRegistrarHES(showDetail!) }} className="bg-amber-500 hover:bg-amber-600">
                <ClipboardCheck className="h-4 w-4 mr-2" />
                Registrar HES
              </Button>
            )}
            {showDetail?.estado === 'hes_pendiente' && (
              <Button onClick={() => { setShowDetail(null); openFacturar(showDetail!) }} className="bg-purple-600 hover:bg-purple-700">
                <Receipt className="h-4 w-4 mr-2" />
                Facturar
              </Button>
            )}
            {showDetail?.estado === 'facturada' && (
              <Button onClick={() => { setShowDetail(null); openEstadoTransition(showDetail!, 'pagada') }} className="bg-emerald-600 hover:bg-emerald-700">
                <DollarSign className="h-4 w-4 mr-2" />
                Marcar Pagada
              </Button>
            )}
            {showDetail?.estado === 'pagada' && (
              <Button variant="outline" onClick={() => { setShowDetail(null); openEstadoTransition(showDetail!, 'facturada') }}>
                <Undo2 className="h-4 w-4 mr-2" />
                Revertir Pago
              </Button>
            )}
            {showDetail?.estado === 'facturada' && (
              <Button variant="outline" onClick={() => { setShowDetail(null); openEstadoTransition(showDetail!, 'aprobada_cliente') }}>
                <Undo2 className="h-4 w-4 mr-2" />
                Revertir Factura
              </Button>
            )}
            {showDetail && ['facturada', 'pagada'].includes(showDetail.estado) && (
              <Button variant="destructive" onClick={() => { setShowDetail(null); handleAnular(showDetail!) }}>
                <Ban className="h-4 w-4 mr-2" />
                Anular
              </Button>
            )}
            <Button variant="outline" onClick={() => setShowDetail(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Facturar dialog */}
      <Dialog open={showFacturarDialog} onOpenChange={open => { if (!open) { setShowFacturarDialog(false); setFacturarTarget(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Facturar Valorización</DialogTitle>
            <DialogDescription>
              {facturarTarget && `${facturarTarget.codigo} — ${facturarTarget.proyecto?.codigo}`}
            </DialogDescription>
          </DialogHeader>
          {facturarTarget && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-muted-foreground">Subtotal sin IGV</span>
                  <span className="font-mono font-bold text-purple-700">{formatCurrency(facturarTarget.subtotal, facturarTarget.moneda)}</span>
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Neto a Recibir (con IGV)</span>
                  <span className="font-mono">{formatCurrency(facturarTarget.netoARecibir, facturarTarget.moneda)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Se creará automáticamente una Cuenta por Cobrar por el monto neto.</p>
              </div>
              {(facturarTarget.numeroHES || facturarTarget.numeroGuiaRemision) && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm flex justify-between items-center">
                  <span className="text-amber-700 font-medium">HES / Conformidad</span>
                  <span className="font-mono text-amber-800">{facturarTarget.numeroHES || facturarTarget.numeroGuiaRemision}</span>
                </div>
              )}
              <div>
                <Label>N° Factura *</Label>
                <Input placeholder="F001-00123" value={numFactura} onChange={e => setNumFactura(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Fecha de Emisión</Label>
                  <Input type="date" value={fechaEmisionFactura} onChange={e => setFechaEmisionFactura(e.target.value)} />
                </div>
                <div>
                  <Label>Fecha Vencimiento CxC</Label>
                  <Input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Condición de Pago</Label>
                  <Select value={factCondicionPago} onValueChange={(v) => { setFactCondicionPago(v); if (v === 'contado') setFactDiasCredito('') }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contado">Contado</SelectItem>
                      <SelectItem value="credito">Crédito</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {factCondicionPago === 'credito' && (
                  <div>
                    <Label>Días de crédito</Label>
                    <Input type="number" min={1} placeholder="30" value={factDiasCredito} onChange={e => setFactDiasCredito(e.target.value ? Number(e.target.value) : '')} />
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowFacturarDialog(false); setFacturarTarget(null) }}>Cancelar</Button>
            <Button onClick={handleFacturar} disabled={saving} className="bg-purple-600 hover:bg-purple-700">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Facturar y Crear CxC
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generic estado change dialog */}
      <Dialog open={showEstadoDialog} onOpenChange={open => { if (!open) { setShowEstadoDialog(false); setEstadoTarget(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {estadoTarget && (
                estadoTarget.estado === 'facturada' && estadoTarget.val.estado === 'pagada' ? 'Revertir Pago' :
                estadoTarget.estado === 'aprobada_cliente' && estadoTarget.val.estado === 'facturada' ? 'Revertir Factura' :
                'Cambiar Estado'
              )}
            </DialogTitle>
            <DialogDescription>
              {estadoTarget && `${estadoTarget.val.codigo} — ${getEstadoLabel(estadoTarget.val.estado)} → ${getEstadoLabel(estadoTarget.estado)}`}
            </DialogDescription>
          </DialogHeader>
          {estadoTarget && (
            <div className="space-y-3">
              <Card>
                <CardContent className="p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Código</span>
                    <span className="font-mono font-medium">{estadoTarget.val.codigo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Proyecto</span>
                    <span>{estadoTarget.val.proyecto?.codigo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Neto a Recibir</span>
                    <span className="font-mono font-bold">{formatCurrency(estadoTarget.val.netoARecibir, estadoTarget.val.moneda)}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Revertir factura warning */}
              {estadoTarget.val.estado === 'facturada' && estadoTarget.estado === 'aprobada_cliente' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm space-y-1">
                  <p className="font-medium text-amber-700">Al revertir la facturación:</p>
                  <ul className="list-disc pl-5 text-amber-600 space-y-0.5">
                    <li>La valorización volverá a <strong>Aprobada Cliente</strong></li>
                    <li>Las CxC asociadas serán <strong>anuladas</strong></li>
                    <li>Podrá volver a facturarse después</li>
                  </ul>
                </div>
              )}

              {/* Revertir pago warning */}
              {estadoTarget.val.estado === 'pagada' && estadoTarget.estado === 'facturada' && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm space-y-1">
                  <p className="font-medium text-amber-700">Al revertir el pago:</p>
                  <ul className="list-disc pl-5 text-amber-600 space-y-0.5">
                    <li>La valorización volverá a <strong>Facturada</strong></li>
                    <li>Las CxC asociadas no se modifican</li>
                  </ul>
                </div>
              )}

              {/* Marcar pagada info */}
              {estadoTarget.estado === 'pagada' && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 text-sm">
                  <p className="text-emerald-700">La valorización se marcará como <strong>Pagada</strong>.</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEstadoDialog(false); setEstadoTarget(null) }}>Cancelar</Button>
            <Button onClick={handleEstadoChange} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Anular confirm dialog */}
      <Dialog open={!!confirmAnular} onOpenChange={open => { if (!open) setConfirmAnular(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Anular Valorización</DialogTitle>
            <DialogDescription>
              Esta acción cambiará el estado de la valorización a Anulada
            </DialogDescription>
          </DialogHeader>
          {confirmAnular && (
            <div className="space-y-3">
              <Card>
                <CardContent className="p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Código</span>
                    <span className="font-mono font-medium">{confirmAnular.codigo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Proyecto</span>
                    <span>{confirmAnular.proyecto?.codigo}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Estado actual</span>
                    <Badge className={getEstadoColor(confirmAnular.estado)}>{getEstadoLabel(confirmAnular.estado)}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Neto a Recibir</span>
                    <span className="font-mono font-bold">{formatCurrency(confirmAnular.netoARecibir, confirmAnular.moneda)}</span>
                  </div>
                </CardContent>
              </Card>

              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm space-y-1">
                <p className="font-medium text-red-700">Al anular esta valorización:</p>
                <ul className="list-disc pl-5 text-red-600 space-y-0.5">
                  <li>La valorización pasará a estado <strong>Anulada</strong> de forma irreversible</li>
                  <li>Se revertirá la amortización de adelanto asociada</li>
                  {(['facturada', 'pagada'].includes(confirmAnular.estado)) && (
                    <li>Las Cuentas por Cobrar (CxC) asociadas también serán <strong>anuladas</strong></li>
                  )}
                </ul>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmAnular(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={executeAnular} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Sí, Anular
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Registrar HES dialog */}
      <Dialog open={showHESDialog} onOpenChange={open => { if (!open) { setShowHESDialog(false); setHesTarget(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-amber-600" />
              Registrar HES / Conformidad
            </DialogTitle>
            <DialogDescription>
              {hesTarget?.codigo} — {hesTarget?.proyecto?.nombre}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label className="text-sm">Tipo de documento *</Label>
              <Select value={hesTipo} onValueChange={setHesTipo}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hes">HES (Hoja de Entrada de Servicios)</SelectItem>
                  <SelectItem value="guia_remision">Guía de Remisión</SelectItem>
                  <SelectItem value="acta">Acta de conformidad</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">
                Número de {hesTipo === 'hes' ? 'HES' : hesTipo === 'guia_remision' ? 'Guía de Remisión' : 'Acta'} *
              </Label>
              <Input
                className="mt-1"
                placeholder={hesTipo === 'hes' ? 'Ej: HES-2026-001' : hesTipo === 'guia_remision' ? 'Ej: GR-001-00123' : 'Ej: ACTA-001'}
                value={hesNumero}
                onChange={e => setHesNumero(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-sm">Fecha de conformidad</Label>
              <Input type="date" className="mt-1" value={hesFecha} onChange={e => setHesFecha(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm">Adjuntar documento (opcional)</Label>
              <label className="mt-1 flex items-center gap-2 cursor-pointer border border-dashed rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted/30 transition-colors">
                <Upload className="h-4 w-4 shrink-0" />
                {hesArchivo ? hesArchivo.name : 'Seleccionar archivo PDF / imagen'}
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={e => setHesArchivo(e.target.files?.[0] ?? null)}
                />
              </label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowHESDialog(false); setHesTarget(null) }}>Cancelar</Button>
            <Button onClick={handleRegistrarHES} disabled={uploadingHES || !hesNumero.trim()} className="bg-amber-500 hover:bg-amber-600">
              {uploadingHES ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ClipboardCheck className="h-4 w-4 mr-2" />}
              Registrar HES
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function Row({ label, value, bold, border, color }: { label: string; value: string; bold?: boolean; border?: boolean; color?: string }) {
  return (
    <div className={`flex justify-between ${border ? 'border-t pt-1' : ''} ${bold ? 'font-bold' : ''} ${color || ''}`}>
      <span>{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  )
}
