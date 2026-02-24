'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Search, Eye, Receipt, DollarSign, FileSpreadsheet, Check, Ban } from 'lucide-react'
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

const FLOW_STEPS = [
  { value: 'borrador', label: 'Borrador' },
  { value: 'enviada', label: 'Enviada' },
  { value: 'observada', label: 'Observada' },
  { value: 'corregida', label: 'Corregida' },
  { value: 'aprobada_cliente', label: 'Aprobada Cliente' },
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

type TabFilter = 'pendientes' | 'facturadas' | 'pagadas' | 'todas'

export default function FacturacionPage() {
  const [items, setItems] = useState<Valorizacion[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showDetail, setShowDetail] = useState<Valorizacion | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [tabFilter, setTabFilter] = useState<TabFilter>('pendientes')

  // Facturar dialog
  const [showFacturarDialog, setShowFacturarDialog] = useState(false)
  const [facturarTarget, setFacturarTarget] = useState<Valorizacion | null>(null)
  const [numFactura, setNumFactura] = useState('')
  const [fechaVencimiento, setFechaVencimiento] = useState('')
  const [factCondicionPago, setFactCondicionPago] = useState('contado')
  const [factDiasCredito, setFactDiasCredito] = useState<number | ''>('')
  const [factMetodoPago, setFactMetodoPago] = useState('')
  const [factBancoFinanciera, setFactBancoFinanciera] = useState('')

  // Generic estado dialog (pagada, anulada)
  const [showEstadoDialog, setShowEstadoDialog] = useState(false)
  const [estadoTarget, setEstadoTarget] = useState<{ val: Valorizacion; estado: string } | null>(null)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetch('/api/gestion/valorizaciones')
      if (res.ok) {
        const data = await res.json()
        // Only show valorizaciones that are relevant to admin: aprobada_cliente, facturada, pagada
        setItems(data.filter((v: Valorizacion) => ['aprobada_cliente', 'facturada', 'pagada'].includes(v.estado)))
      }
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let result = items
    if (tabFilter === 'pendientes') result = result.filter(i => i.estado === 'aprobada_cliente')
    else if (tabFilter === 'facturadas') result = result.filter(i => i.estado === 'facturada')
    else if (tabFilter === 'pagadas') result = result.filter(i => i.estado === 'pagada')
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(i =>
        i.codigo.toLowerCase().includes(term) ||
        i.proyecto?.nombre.toLowerCase().includes(term) ||
        i.proyecto?.codigo.toLowerCase().includes(term)
      )
    }
    return result
  }, [items, tabFilter, searchTerm])

  const counts = useMemo(() => ({
    pendientes: items.filter(i => i.estado === 'aprobada_cliente').length,
    facturadas: items.filter(i => i.estado === 'facturada').length,
    pagadas: items.filter(i => i.estado === 'pagada').length,
    todas: items.length,
  }), [items])

  // Open facturar dialog
  const openFacturar = (val: Valorizacion) => {
    setFacturarTarget(val)
    setNumFactura('')
    const venc = new Date()
    venc.setDate(venc.getDate() + 30)
    setFechaVencimiento(venc.toISOString().split('T')[0])
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
          fechaVencimiento,
          condicionPago: factCondicionPago,
          diasCredito: factCondicionPago === 'credito' && factDiasCredito ? Number(factDiasCredito) : undefined,
          metodoPago: factMetodoPago || undefined,
          bancoFinanciera: factBancoFinanciera || undefined,
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
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar código, proyecto..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-1">
          {([
            { key: 'pendientes', label: 'Por Facturar' },
            { key: 'facturadas', label: 'Facturadas' },
            { key: 'pagadas', label: 'Pagadas' },
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
                          <Button variant="ghost" size="icon" onClick={() => openFacturar(item)} title="Facturar">
                            <Receipt className="h-4 w-4 text-purple-600" />
                          </Button>
                        )}
                        {item.estado === 'facturada' && (
                          <Button variant="ghost" size="icon" onClick={() => openEstadoTransition(item, 'pagada')} title="Marcar pagada">
                            <DollarSign className="h-4 w-4 text-green-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
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
                  <span className="text-muted-foreground">Monto Neto a Recibir</span>
                  <span className="font-mono font-bold text-purple-700">{formatCurrency(facturarTarget.netoARecibir, facturarTarget.moneda)}</span>
                </div>
                <p className="text-xs text-muted-foreground">Se creará automáticamente una Cuenta por Cobrar por este monto.</p>
              </div>
              <div>
                <Label>N° Factura *</Label>
                <Input placeholder="F001-00123" value={numFactura} onChange={e => setNumFactura(e.target.value)} />
              </div>
              <div>
                <Label>Fecha Vencimiento CxC</Label>
                <Input type="date" value={fechaVencimiento} onChange={e => setFechaVencimiento(e.target.value)} />
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Método de Pago</Label>
                  <Select value={factMetodoPago} onValueChange={setFactMetodoPago}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="transferencia">Transferencia</SelectItem>
                      <SelectItem value="cheque">Cheque</SelectItem>
                      <SelectItem value="letra">Letra</SelectItem>
                      <SelectItem value="factura_negociable">Factura Negociable</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Banco / Financiera</Label>
                  <Input placeholder="Ej: BCP, BBVA..." value={factBancoFinanciera} onChange={e => setFactBancoFinanciera(e.target.value)} />
                </div>
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

      {/* Generic estado change dialog (pagada) */}
      <Dialog open={showEstadoDialog} onOpenChange={open => { if (!open) { setShowEstadoDialog(false); setEstadoTarget(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Estado</DialogTitle>
            <DialogDescription>
              {estadoTarget && `${estadoTarget.val.codigo} → ${getEstadoLabel(estadoTarget.estado)}`}
            </DialogDescription>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            ¿Confirmar cambio de estado a <strong>{estadoTarget && getEstadoLabel(estadoTarget.estado)}</strong>?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEstadoDialog(false); setEstadoTarget(null) }}>Cancelar</Button>
            <Button onClick={handleEstadoChange} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirmar
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
