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
import { Loader2, Search, ArrowDownCircle, AlertTriangle, DollarSign, Clock, CheckCircle, Plus, Ban, Download, Upload } from 'lucide-react'
import toast from 'react-hot-toast'
import CxCImportExcelModal from '@/components/administracion/CxCImportExcelModal'
import { exportarCxCAExcel } from '@/lib/utils/cuentasCobrarExcel'

interface CuentaBancaria {
  id: string
  nombreBanco: string
  numeroCuenta: string
}

interface PagoCobro {
  id: string
  monto: number
  fechaPago: string
  medioPago: string
  numeroOperacion: string | null
  observaciones: string | null
  cuentaBancaria: CuentaBancaria | null
}

interface Cliente {
  id: string
  nombre: string
  ruc: string | null
}

interface Proyecto {
  id: string
  codigo: string
  nombre: string
  clienteId?: string
}

interface Valorizacion {
  id: string
  codigo: string
  numero?: number
}

interface CuentaPorCobrar {
  id: string
  proyectoId: string
  clienteId: string
  valorizacionId: string | null
  numeroDocumento: string | null
  descripcion: string | null
  monto: number
  moneda: string
  montoPagado: number
  saldoPendiente: number
  fechaEmision: string
  fechaVencimiento: string
  estado: string
  observaciones: string | null
  proyecto?: Proyecto
  cliente?: Cliente
  valorizacion?: Valorizacion | null
  pagos?: PagoCobro[]
}

const ESTADOS_CXC = [
  { value: 'pendiente', label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'parcial', label: 'Parcial', color: 'bg-blue-100 text-blue-700' },
  { value: 'pagada', label: 'Pagada', color: 'bg-green-100 text-green-700' },
  { value: 'vencida', label: 'Vencida', color: 'bg-red-100 text-red-700' },
  { value: 'anulada', label: 'Anulada', color: 'bg-gray-100 text-gray-700' },
]

const getEstadoColor = (estado: string) =>
  ESTADOS_CXC.find(e => e.value === estado)?.color || 'bg-gray-100 text-gray-700'

const formatCurrency = (amount: number, moneda = 'PEN') =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda }).format(amount)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

const isVencida = (fecha: string, estado: string) => {
  if (estado === 'pagada' || estado === 'anulada') return false
  return new Date(fecha) < new Date()
}

export default function CuentasCobrarPage() {
  const [items, setItems] = useState<CuentaPorCobrar[]>([])
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancaria[]>([])
  const [clientes, setClientes] = useState<Cliente[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState<string>('all')

  // Create dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createForm, setCreateForm] = useState({
    clienteId: '',
    proyectoId: '',
    numeroDocumento: '',
    monto: '',
    moneda: 'PEN',
    fechaEmision: new Date().toISOString().split('T')[0],
    fechaVencimiento: '',
    valorizacionId: '',
    descripcion: '',
    observaciones: '',
  })

  // Pago dialog
  const [showPagoDialog, setShowPagoDialog] = useState(false)
  const [pagoCuenta, setPagoCuenta] = useState<CuentaPorCobrar | null>(null)
  const [pagoMonto, setPagoMonto] = useState('')
  const [pagoFecha, setPagoFecha] = useState(new Date().toISOString().split('T')[0])
  const [pagoMedio, setPagoMedio] = useState('transferencia')
  const [pagoOperacion, setPagoOperacion] = useState('')
  const [pagoBancoId, setPagoBancoId] = useState('none')
  const [pagoObs, setPagoObs] = useState('')

  // Detail dialog
  const [showDetail, setShowDetail] = useState<CuentaPorCobrar | null>(null)

  // Import dialog
  const [showImportDialog, setShowImportDialog] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [cxcRes, bancoRes, clienteRes, proyRes] = await Promise.all([
        fetch('/api/administracion/cuentas-cobrar'),
        fetch('/api/administracion/cuentas-bancarias'),
        fetch('/api/clientes'),
        fetch('/api/proyectos?fields=id,codigo,nombre'),
      ])
      if (cxcRes.ok) setItems(await cxcRes.json())
      if (bancoRes.ok) {
        const bancos = await bancoRes.json()
        setCuentasBancarias(bancos.filter((b: any) => b.activa))
      }
      if (clienteRes.ok) {
        const clienteData = await clienteRes.json()
        setClientes(Array.isArray(clienteData) ? clienteData : clienteData.data || [])
      }
      if (proyRes.ok) setProyectos(await proyRes.json())
    } catch {
      toast.error('Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  const resumen = useMemo(() => {
    const pendientes = items.filter(i => i.estado === 'pendiente' || i.estado === 'parcial')
    const vencidas = pendientes.filter(i => isVencida(i.fechaVencimiento, i.estado))
    const pagadas = items.filter(i => i.estado === 'pagada')

    const byMoneda = (arr: CuentaPorCobrar[], field: 'saldoPendiente' | 'monto') => {
      const pen = arr.filter(i => i.moneda === 'PEN').reduce((s, i) => s + i[field], 0)
      const usd = arr.filter(i => i.moneda === 'USD').reduce((s, i) => s + i[field], 0)
      return { pen, usd }
    }

    return {
      pendiente: byMoneda(pendientes, 'saldoPendiente'),
      countPendiente: pendientes.length,
      vencido: byMoneda(vencidas, 'saldoPendiente'),
      countVencido: vencidas.length,
      cobrado: byMoneda(pagadas, 'monto'),
    }
  }, [items])

  const filtered = useMemo(() => {
    let result = items
    if (filterEstado !== 'all') result = result.filter(i => i.estado === filterEstado)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(i =>
        i.numeroDocumento?.toLowerCase().includes(term) ||
        i.cliente?.nombre.toLowerCase().includes(term) ||
        i.proyecto?.codigo.toLowerCase().includes(term) ||
        i.proyecto?.nombre.toLowerCase().includes(term) ||
        i.descripcion?.toLowerCase().includes(term)
      )
    }
    return result
  }, [items, filterEstado, searchTerm])

  // --- Create ---
  const resetCreateForm = () => {
    setCreateForm({
      clienteId: '',
      proyectoId: '',
      numeroDocumento: '',
      monto: '',
      moneda: 'PEN',
      fechaEmision: new Date().toISOString().split('T')[0],
      fechaVencimiento: '',
      valorizacionId: '',
      descripcion: '',
      observaciones: '',
    })
  }

  const handleCreate = async () => {
    if (!createForm.clienteId || !createForm.proyectoId || !createForm.monto || !createForm.fechaEmision || !createForm.fechaVencimiento) {
      toast.error('Cliente, proyecto, monto, fecha emisión y fecha vencimiento son requeridos')
      return
    }
    const monto = parseFloat(createForm.monto)
    if (isNaN(monto) || monto <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }
    if (new Date(createForm.fechaVencimiento) < new Date(createForm.fechaEmision)) {
      toast.error('La fecha de vencimiento debe ser posterior a la de emisión')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/administracion/cuentas-cobrar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clienteId: createForm.clienteId,
          proyectoId: createForm.proyectoId,
          numeroDocumento: createForm.numeroDocumento || null,
          monto,
          moneda: createForm.moneda,
          fechaEmision: createForm.fechaEmision,
          fechaVencimiento: createForm.fechaVencimiento,
          valorizacionId: createForm.valorizacionId || null,
          descripcion: createForm.descripcion || null,
          observaciones: createForm.observaciones || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error')
      }
      toast.success('Cuenta por cobrar creada')
      setShowCreateDialog(false)
      resetCreateForm()
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Error al crear cuenta')
    } finally {
      setSaving(false)
    }
  }

  // --- Anular ---
  const handleAnular = async (cuenta: CuentaPorCobrar) => {
    if (!confirm(`¿Anular la cuenta ${cuenta.numeroDocumento || cuenta.id.slice(0, 8)}?`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/administracion/cuentas-cobrar/${cuenta.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: 'anulada' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error')
      }
      toast.success('Cuenta anulada')
      setShowDetail(null)
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Error al anular')
    } finally {
      setSaving(false)
    }
  }

  // --- Pago ---
  const openPago = (cuenta: CuentaPorCobrar) => {
    setPagoCuenta(cuenta)
    setPagoMonto(cuenta.saldoPendiente.toFixed(2))
    setPagoFecha(new Date().toISOString().split('T')[0])
    setPagoMedio('transferencia')
    setPagoOperacion('')
    setPagoBancoId('none')
    setPagoObs('')
    setShowPagoDialog(true)
  }

  const handlePago = async () => {
    if (!pagoCuenta || !pagoMonto || !pagoFecha) {
      toast.error('Monto y fecha son requeridos')
      return
    }
    const monto = parseFloat(pagoMonto)
    if (isNaN(monto) || monto <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }
    if (monto > pagoCuenta.saldoPendiente) {
      toast.error(`El monto no puede ser mayor al saldo pendiente (${formatCurrency(pagoCuenta.saldoPendiente, pagoCuenta.moneda)})`)
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/administracion/cuentas-cobrar/${pagoCuenta.id}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto,
          fechaPago: pagoFecha,
          medioPago: pagoMedio,
          numeroOperacion: pagoOperacion || null,
          cuentaBancariaId: pagoBancoId === 'none' ? null : pagoBancoId,
          observaciones: pagoObs || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error')
      }
      toast.success('Pago registrado')
      setShowPagoDialog(false)
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Error al registrar pago')
    } finally {
      setSaving(false)
    }
  }

  const renderMonedaTotals = (pen: number, usd: number) => {
    const parts: string[] = []
    if (pen > 0) parts.push(`PEN: ${formatCurrency(pen, 'PEN')}`)
    if (usd > 0) parts.push(`USD: ${formatCurrency(usd, 'USD')}`)
    if (parts.length === 0) return formatCurrency(0, 'PEN')
    return parts.join(' | ')
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
          <h1 className="text-2xl font-bold">Cuentas por Cobrar</h1>
          <p className="text-muted-foreground">Gestión de facturas y cobros pendientes</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportarCxCAExcel(filtered)}>
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
            <Upload className="h-4 w-4 mr-1" />
            Importar
          </Button>
          <Button onClick={() => { resetCreateForm(); setShowCreateDialog(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cuenta por Cobrar
          </Button>
        </div>
      </div>

      {/* Resumen cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-50">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <div className="text-lg font-bold">{renderMonedaTotals(resumen.pendiente.pen, resumen.pendiente.usd)}</div>
                <div className="text-xs text-muted-foreground">{resumen.countPendiente} pendientes</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-50">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <div className="text-lg font-bold text-red-600">{renderMonedaTotals(resumen.vencido.pen, resumen.vencido.usd)}</div>
                <div className="text-xs text-muted-foreground">{resumen.countVencido} vencidas</div>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-50">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <div className="text-lg font-bold text-green-600">{renderMonedaTotals(resumen.cobrado.pen, resumen.cobrado.usd)}</div>
                <div className="text-xs text-muted-foreground">cobrado total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar cliente, proyecto, factura..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {ESTADOS_CXC.map(e => (
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
                <TableHead>Documento</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Proyecto</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="text-right">Pagado</TableHead>
                <TableHead className="text-right">Saldo</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No hay cuentas por cobrar
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(item => {
                  const vencida = isVencida(item.fechaVencimiento, item.estado)
                  return (
                    <TableRow key={item.id} className={`${item.estado === 'anulada' ? 'opacity-50' : ''} ${vencida ? 'bg-red-50/50' : ''}`}>
                      <TableCell className="font-mono text-sm">{item.numeroDocumento || '—'}</TableCell>
                      <TableCell className="text-sm font-medium">{item.cliente?.nombre || '—'}</TableCell>
                      <TableCell className="text-sm">
                        <div className="font-mono">{item.proyecto?.codigo}</div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {formatCurrency(item.monto, item.moneda)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-green-600">
                        {item.montoPagado > 0 ? formatCurrency(item.montoPagado, item.moneda) : '—'}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {formatCurrency(item.saldoPendiente, item.moneda)}
                      </TableCell>
                      <TableCell className={`text-sm ${vencida ? 'text-red-600 font-semibold' : ''}`}>
                        {formatDate(item.fechaVencimiento)}
                        {vencida && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                      </TableCell>
                      <TableCell>
                        <Badge className={getEstadoColor(item.estado)}>
                          {ESTADOS_CXC.find(e => e.value === item.estado)?.label || item.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="sm" onClick={() => setShowDetail(item)}>
                            Ver
                          </Button>
                          {(item.estado === 'pendiente' || item.estado === 'parcial') && (
                            <>
                              <Button variant="outline" size="sm" onClick={() => openPago(item)}>
                                <ArrowDownCircle className="h-3 w-3 mr-1" />
                                Pago
                              </Button>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700" onClick={() => handleAnular(item)}>
                                <Ban className="h-3 w-3" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Dialog crear cuenta por cobrar */}
      <Dialog open={showCreateDialog} onOpenChange={open => { if (!open) setShowCreateDialog(false) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Cuenta por Cobrar</DialogTitle>
            <DialogDescription>Registrar una factura o documento de cobro a cliente</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Cliente *</Label>
              <Select value={createForm.clienteId} onValueChange={v => setCreateForm(f => ({ ...f, clienteId: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cliente" /></SelectTrigger>
                <SelectContent>
                  {clientes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.nombre}{c.ruc ? ` (${c.ruc})` : ''}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Proyecto *</Label>
              <Select value={createForm.proyectoId} onValueChange={v => setCreateForm(f => ({ ...f, proyectoId: v }))}>
                <SelectTrigger><SelectValue placeholder="Seleccionar proyecto" /></SelectTrigger>
                <SelectContent>
                  {proyectos.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.nombre}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>N° Documento</Label>
              <Input placeholder="F001-00123" value={createForm.numeroDocumento} onChange={e => setCreateForm(f => ({ ...f, numeroDocumento: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monto *</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={createForm.monto} onChange={e => setCreateForm(f => ({ ...f, monto: e.target.value }))} />
              </div>
              <div>
                <Label>Moneda</Label>
                <Select value={createForm.moneda} onValueChange={v => setCreateForm(f => ({ ...f, moneda: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PEN">PEN (S/)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha Emisión *</Label>
                <Input type="date" value={createForm.fechaEmision} onChange={e => setCreateForm(f => ({ ...f, fechaEmision: e.target.value }))} />
              </div>
              <div>
                <Label>Fecha Vencimiento *</Label>
                <Input type="date" value={createForm.fechaVencimiento} onChange={e => setCreateForm(f => ({ ...f, fechaVencimiento: e.target.value }))} />
              </div>
            </div>
            <div>
              <Label>Valorización (opcional)</Label>
              <Input placeholder="ID de valorización" value={createForm.valorizacionId} onChange={e => setCreateForm(f => ({ ...f, valorizacionId: e.target.value }))} />
            </div>
            <div>
              <Label>Descripción</Label>
              <Input placeholder="Descripción del cobro" value={createForm.descripcion} onChange={e => setCreateForm(f => ({ ...f, descripcion: e.target.value }))} />
            </div>
            <div>
              <Label>Observaciones</Label>
              <Input placeholder="Notas adicionales" value={createForm.observaciones} onChange={e => setCreateForm(f => ({ ...f, observaciones: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Crear Cuenta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog registrar pago */}
      <Dialog open={showPagoDialog} onOpenChange={open => { if (!open) setShowPagoDialog(false) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Cobro</DialogTitle>
            <DialogDescription>
              {pagoCuenta && `${pagoCuenta.numeroDocumento || 'Sin documento'} — Saldo: ${formatCurrency(pagoCuenta.saldoPendiente, pagoCuenta.moneda)}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Monto * (máx: {pagoCuenta ? formatCurrency(pagoCuenta.saldoPendiente, pagoCuenta.moneda) : ''})</Label>
              <Input type="number" step="0.01" value={pagoMonto} onChange={e => setPagoMonto(e.target.value)} max={pagoCuenta?.saldoPendiente} />
            </div>
            <div>
              <Label>Fecha de Pago *</Label>
              <Input type="date" value={pagoFecha} onChange={e => setPagoFecha(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Medio de Pago</Label>
                <Select value={pagoMedio} onValueChange={setPagoMedio}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="transferencia">Transferencia</SelectItem>
                    <SelectItem value="cheque">Cheque</SelectItem>
                    <SelectItem value="efectivo">Efectivo</SelectItem>
                    <SelectItem value="detraccion">Detracción</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>N° Operación</Label>
                <Input placeholder="Número de operación" value={pagoOperacion} onChange={e => setPagoOperacion(e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Cuenta Bancaria</Label>
              <Select value={pagoBancoId} onValueChange={setPagoBancoId}>
                <SelectTrigger><SelectValue placeholder="Seleccionar cuenta" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin especificar</SelectItem>
                  {cuentasBancarias.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.nombreBanco} - {b.numeroCuenta}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Observaciones</Label>
              <Input placeholder="Observaciones del pago" value={pagoObs} onChange={e => setPagoObs(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPagoDialog(false)}>Cancelar</Button>
            <Button onClick={handlePago} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar Cobro
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import modal */}
      <CxCImportExcelModal
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        clientes={clientes}
        proyectos={proyectos}
        onImported={loadData}
      />

      {/* Dialog detalle */}
      <Dialog open={!!showDetail} onOpenChange={open => { if (!open) setShowDetail(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle CxC</DialogTitle>
            <DialogDescription>
              {showDetail?.numeroDocumento || 'Sin documento'} — {showDetail?.cliente?.nombre}
            </DialogDescription>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto">
              <div className="flex items-center gap-2">
                <Badge className={getEstadoColor(showDetail.estado)}>
                  {ESTADOS_CXC.find(e => e.value === showDetail.estado)?.label || showDetail.estado}
                </Badge>
                {isVencida(showDetail.fechaVencimiento, showDetail.estado) && (
                  <Badge className="bg-red-100 text-red-700">Vencida</Badge>
                )}
              </div>
              <Card>
                <CardContent className="p-3 space-y-1">
                  <div className="flex justify-between"><span>Cliente</span><span className="font-medium">{showDetail.cliente?.nombre}</span></div>
                  <div className="flex justify-between"><span>Proyecto</span><span className="font-mono">{showDetail.proyecto?.codigo}</span></div>
                  {showDetail.valorizacion && <div className="flex justify-between"><span>Valorización</span><span className="font-mono">{showDetail.valorizacion.codigo}</span></div>}
                  {showDetail.descripcion && <div className="flex justify-between"><span>Descripción</span><span className="text-right max-w-[200px] truncate">{showDetail.descripcion}</span></div>}
                  <div className="flex justify-between"><span>Emisión</span><span>{formatDate(showDetail.fechaEmision)}</span></div>
                  <div className="flex justify-between"><span>Vencimiento</span><span className={isVencida(showDetail.fechaVencimiento, showDetail.estado) ? 'text-red-600 font-bold' : ''}>{formatDate(showDetail.fechaVencimiento)}</span></div>
                  <div className="flex justify-between border-t pt-1"><span>Monto Total</span><span className="font-mono font-bold">{formatCurrency(showDetail.monto, showDetail.moneda)}</span></div>
                  <div className="flex justify-between text-green-600"><span>Pagado</span><span className="font-mono">{formatCurrency(showDetail.montoPagado, showDetail.moneda)}</span></div>
                  <div className="flex justify-between font-bold border-t pt-1"><span>Saldo Pendiente</span><span className="font-mono">{formatCurrency(showDetail.saldoPendiente, showDetail.moneda)}</span></div>
                </CardContent>
              </Card>

              {showDetail.pagos && showDetail.pagos.length > 0 && (
                <div>
                  <div className="font-medium mb-2">Historial de Pagos</div>
                  <div className="space-y-2">
                    {showDetail.pagos.map(p => (
                      <Card key={p.id}>
                        <CardContent className="p-3">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-mono font-medium">{formatCurrency(p.monto, showDetail.moneda)}</div>
                              <div className="text-xs text-muted-foreground">{formatDate(p.fechaPago)} · {p.medioPago}</div>
                              {p.numeroOperacion && <div className="text-xs text-muted-foreground">Op: {p.numeroOperacion}</div>}
                              {p.cuentaBancaria && <div className="text-xs text-muted-foreground">{p.cuentaBancaria.nombreBanco}</div>}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {showDetail && (showDetail.estado === 'pendiente' || showDetail.estado === 'parcial') && (
              <Button variant="destructive" size="sm" onClick={() => handleAnular(showDetail)} disabled={saving}>
                <Ban className="h-4 w-4 mr-1" />
                Anular
              </Button>
            )}
            <div className="flex-1" />
            <Button variant="outline" onClick={() => setShowDetail(null)}>Cerrar</Button>
            {showDetail && (showDetail.estado === 'pendiente' || showDetail.estado === 'parcial') && (
              <Button onClick={() => { setShowDetail(null); openPago(showDetail) }}>
                <ArrowDownCircle className="h-4 w-4 mr-2" />
                Registrar Cobro
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
