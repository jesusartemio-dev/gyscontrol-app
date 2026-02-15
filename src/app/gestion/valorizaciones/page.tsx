'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Plus, FileSpreadsheet, Loader2, Search, Eye, Send, CheckCircle, Receipt, ChevronDown, ChevronUp } from 'lucide-react'
import toast from 'react-hot-toast'

interface Proyecto {
  id: string
  codigo: string
  nombre: string
  totalCliente: number | null
}

interface Valorizacion {
  id: string
  proyectoId: string
  numero: number
  codigo: string
  periodoInicio: string
  periodoFin: string
  moneda: string
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
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda }).format(amount)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

const formatPeriod = (start: string, end: string) =>
  `${formatDate(start)} — ${formatDate(end)}`

export default function ValorizacionesPage() {
  const [items, setItems] = useState<Valorizacion[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [showDetail, setShowDetail] = useState<Valorizacion | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterProyecto, setFilterProyecto] = useState<string>('all')
  const [filterEstado, setFilterEstado] = useState<string>('all')

  // Form fields
  const [formProyectoId, setFormProyectoId] = useState('')
  const [formMontoValorizacion, setFormMontoValorizacion] = useState('')
  const [formPeriodoInicio, setFormPeriodoInicio] = useState('')
  const [formPeriodoFin, setFormPeriodoFin] = useState('')
  const [formDescuento, setFormDescuento] = useState('0')
  const [formAdelanto, setFormAdelanto] = useState('0')
  const [formIgv, setFormIgv] = useState('18')
  const [formFondoGarantia, setFormFondoGarantia] = useState('0')
  const [formObservaciones, setFormObservaciones] = useState('')

  // Estado transition dialog
  const [showEstadoDialog, setShowEstadoDialog] = useState(false)
  const [estadoTarget, setEstadoTarget] = useState<{ val: Valorizacion; estado: string } | null>(null)
  const [crearCxC, setCrearCxC] = useState(true)
  const [fechaVencCxC, setFechaVencCxC] = useState('')
  const [numDocCxC, setNumDocCxC] = useState('')

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [vRes, pRes] = await Promise.all([
        fetch('/api/gestion/valorizaciones'),
        fetch('/api/proyectos?simple=true'),
      ])
      if (vRes.ok) setItems(await vRes.json())
      if (pRes.ok) {
        const data = await pRes.json()
        setProyectos(Array.isArray(data) ? data : data.proyectos || [])
      }
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let result = items
    if (filterProyecto !== 'all') result = result.filter(i => i.proyectoId === filterProyecto)
    if (filterEstado !== 'all') result = result.filter(i => i.estado === filterEstado)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(i =>
        i.codigo.toLowerCase().includes(term) ||
        i.proyecto?.nombre.toLowerCase().includes(term) ||
        i.proyecto?.codigo.toLowerCase().includes(term)
      )
    }
    return result
  }, [items, filterProyecto, filterEstado, searchTerm])

  const resetForm = () => {
    setFormProyectoId('')
    setFormMontoValorizacion('')
    setFormPeriodoInicio('')
    setFormPeriodoFin('')
    setFormDescuento('0')
    setFormAdelanto('0')
    setFormIgv('18')
    setFormFondoGarantia('0')
    setFormObservaciones('')
  }

  const handleCreate = async () => {
    if (!formProyectoId || !formMontoValorizacion || !formPeriodoInicio || !formPeriodoFin) {
      toast.error('Proyecto, monto y periodo son requeridos')
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/proyectos/${formProyectoId}/valorizaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          montoValorizacion: parseFloat(formMontoValorizacion),
          periodoInicio: formPeriodoInicio,
          periodoFin: formPeriodoFin,
          descuentoComercialPorcentaje: parseFloat(formDescuento) || 0,
          adelantoPorcentaje: parseFloat(formAdelanto) || 0,
          igvPorcentaje: parseFloat(formIgv) || 18,
          fondoGarantiaPorcentaje: parseFloat(formFondoGarantia) || 0,
          observaciones: formObservaciones || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error')
      }
      toast.success('Valorización creada')
      setShowForm(false)
      resetForm()
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Error al crear')
    } finally {
      setSaving(false)
    }
  }

  const openEstadoTransition = (val: Valorizacion, nuevoEstado: string) => {
    setEstadoTarget({ val, estado: nuevoEstado })
    if (nuevoEstado === 'facturada') {
      setCrearCxC(true)
      const venc = new Date()
      venc.setDate(venc.getDate() + 30)
      setFechaVencCxC(venc.toISOString().split('T')[0])
      setNumDocCxC('')
    }
    setShowEstadoDialog(true)
  }

  const handleEstadoChange = async () => {
    if (!estadoTarget) return
    setSaving(true)
    try {
      const body: any = { estado: estadoTarget.estado }
      if (estadoTarget.estado === 'facturada' && crearCxC) {
        body.crearCuentaCobrar = true
        body.fechaVencimiento = fechaVencCxC
        body.numeroDocumento = numDocCxC || null
      }
      const res = await fetch(`/api/proyectos/${estadoTarget.val.proyectoId}/valorizaciones/${estadoTarget.val.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
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

  // Preview calculation
  const preview = useMemo(() => {
    const monto = parseFloat(formMontoValorizacion) || 0
    const desc = monto * (parseFloat(formDescuento) || 0) / 100
    const adel = monto * (parseFloat(formAdelanto) || 0) / 100
    const sub = monto - desc - adel
    const igv = sub * (parseFloat(formIgv) || 18) / 100
    const fg = sub * (parseFloat(formFondoGarantia) || 0) / 100
    const neto = sub + igv - fg
    return { descuento: desc, adelanto: adel, subtotal: sub, igv, fondoGarantia: fg, netoARecibir: neto }
  }, [formMontoValorizacion, formDescuento, formAdelanto, formIgv, formFondoGarantia])

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
        <Button onClick={() => { resetForm(); setShowForm(true) }}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Valorización
        </Button>
      </div>

      {/* Filtros */}
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
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {ESTADOS.map(e => (
              <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                          <div
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${Math.min(item.porcentajeAvance, 100)}%` }}
                          />
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
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => setShowDetail(item)} title="Ver detalle">
                          <Eye className="h-4 w-4" />
                        </Button>
                        {item.estado === 'borrador' && (
                          <Button variant="ghost" size="icon" onClick={() => openEstadoTransition(item, 'enviada')} title="Enviar">
                            <Send className="h-4 w-4 text-blue-600" />
                          </Button>
                        )}
                        {item.estado === 'enviada' && (
                          <Button variant="ghost" size="icon" onClick={() => openEstadoTransition(item, 'aprobada_cliente')} title="Aprobar">
                            <CheckCircle className="h-4 w-4 text-emerald-600" />
                          </Button>
                        )}
                        {item.estado === 'aprobada_cliente' && (
                          <Button variant="ghost" size="icon" onClick={() => openEstadoTransition(item, 'facturada')} title="Facturar">
                            <Receipt className="h-4 w-4 text-purple-600" />
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

      {/* Dialog crear */}
      <Dialog open={showForm} onOpenChange={open => { if (!open) { setShowForm(false); resetForm() } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Nueva Valorización</DialogTitle>
            <DialogDescription>Selecciona un proyecto y completa los datos. Los montos se calculan automáticamente.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto">
            <div>
              <Label>Proyecto *</Label>
              <Select value={formProyectoId} onValueChange={setFormProyectoId}>
                <SelectTrigger><SelectValue placeholder="Selecciona un proyecto" /></SelectTrigger>
                <SelectContent>
                  {proyectos.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Monto Valorización *</Label>
              <Input type="number" step="0.01" placeholder="0.00" value={formMontoValorizacion} onChange={e => setFormMontoValorizacion(e.target.value)} />
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
                <Label>Descuento Comercial %</Label>
                <Input type="number" step="0.01" value={formDescuento} onChange={e => setFormDescuento(e.target.value)} />
              </div>
              <div>
                <Label>Adelanto %</Label>
                <Input type="number" step="0.01" value={formAdelanto} onChange={e => setFormAdelanto(e.target.value)} />
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

            {/* Preview cálculos */}
            {parseFloat(formMontoValorizacion) > 0 && (
              <Card className="bg-muted/50">
                <CardContent className="p-3 space-y-1 text-sm">
                  <div className="font-medium mb-2">Vista previa de cálculos</div>
                  <div className="flex justify-between">
                    <span>Monto Valorización</span>
                    <span className="font-mono">{formatCurrency(parseFloat(formMontoValorizacion) || 0)}</span>
                  </div>
                  {preview.descuento > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>(-) Descuento Comercial</span>
                      <span className="font-mono">-{formatCurrency(preview.descuento)}</span>
                    </div>
                  )}
                  {preview.adelanto > 0 && (
                    <div className="flex justify-between text-red-600">
                      <span>(-) Adelanto</span>
                      <span className="font-mono">-{formatCurrency(preview.adelanto)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1">
                    <span>Subtotal</span>
                    <span className="font-mono">{formatCurrency(preview.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>(+) IGV</span>
                    <span className="font-mono">+{formatCurrency(preview.igv)}</span>
                  </div>
                  {preview.fondoGarantia > 0 && (
                    <div className="flex justify-between text-orange-600">
                      <span>(-) Fondo Garantía</span>
                      <span className="font-mono">-{formatCurrency(preview.fondoGarantia)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t pt-1 font-bold text-base">
                    <span>Neto a Recibir</span>
                    <span className="font-mono">{formatCurrency(preview.netoARecibir)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForm(false); resetForm() }}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog detalle */}
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
              <div className="flex items-center gap-2">
                <Badge className={getEstadoColor(showDetail.estado)}>{getEstadoLabel(showDetail.estado)}</Badge>
                <span className="text-muted-foreground">
                  {formatPeriod(showDetail.periodoInicio, showDetail.periodoFin)}
                </span>
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDetail(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog cambio de estado */}
      <Dialog open={showEstadoDialog} onOpenChange={open => { if (!open) { setShowEstadoDialog(false); setEstadoTarget(null) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar Estado</DialogTitle>
            <DialogDescription>
              {estadoTarget && `${estadoTarget.val.codigo} → ${getEstadoLabel(estadoTarget.estado)}`}
            </DialogDescription>
          </DialogHeader>
          {estadoTarget?.estado === 'facturada' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="crearCxC"
                  checked={crearCxC}
                  onChange={e => setCrearCxC(e.target.checked)}
                  className="h-4 w-4"
                />
                <Label htmlFor="crearCxC">Crear Cuenta por Cobrar automáticamente</Label>
              </div>
              {crearCxC && (
                <>
                  <div>
                    <Label>N° Documento / Factura</Label>
                    <Input placeholder="F001-00123" value={numDocCxC} onChange={e => setNumDocCxC(e.target.value)} />
                  </div>
                  <div>
                    <Label>Fecha Vencimiento CxC</Label>
                    <Input type="date" value={fechaVencCxC} onChange={e => setFechaVencCxC(e.target.value)} />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Monto: <span className="font-mono font-medium">{estadoTarget && formatCurrency(estadoTarget.val.netoARecibir, estadoTarget.val.moneda)}</span>
                  </div>
                </>
              )}
            </div>
          )}
          {estadoTarget?.estado !== 'facturada' && (
            <p className="text-sm text-muted-foreground">
              ¿Confirmar cambio de estado a <strong>{estadoTarget && getEstadoLabel(estadoTarget.estado)}</strong>?
            </p>
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
