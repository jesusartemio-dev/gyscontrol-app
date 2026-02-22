'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Loader2, Search, ArrowUpCircle, AlertTriangle, DollarSign, Clock, CheckCircle, Plus, Ban, Package, ChevronRight, FileSpreadsheet, Upload, Download } from 'lucide-react'
import toast from 'react-hot-toast'
import CxPImportExcelModal from '@/components/administracion/CxPImportExcelModal'
import { exportarCxPAExcel } from '@/lib/utils/cuentasPagarExcel'

interface CuentaBancaria {
  id: string
  nombreBanco: string
  numeroCuenta: string
}

interface PagoPagar {
  id: string
  monto: number
  fechaPago: string
  medioPago: string
  numeroOperacion: string | null
  observaciones: string | null
  cuentaBancaria: CuentaBancaria | null
}

interface Proveedor {
  id: string
  nombre: string
  ruc: string | null
}

interface Proyecto {
  id: string
  codigo: string
  nombre: string
}

interface OrdenCompra {
  id: string
  numero: string
  proveedorId: string
  proyectoId: string | null
  moneda: string
  total: number
  condicionPago: string
  diasCredito: number | null
  estado: string
  proveedor?: { id: string; nombre: string; ruc?: string | null }
  proyecto?: { id: string; codigo: string; nombre: string } | null
}

interface CuentaPorPagar {
  id: string
  proveedorId: string
  proyectoId: string | null
  ordenCompraId: string | null
  numeroFactura: string | null
  descripcion: string | null
  monto: number
  moneda: string
  montoPagado: number
  saldoPendiente: number
  fechaRecepcion: string
  fechaVencimiento: string
  condicionPago: string
  estado: string
  observaciones: string | null
  pedidoEquipoId?: string | null
  pedidoEquipoItemId?: string | null
  tipoOrigen?: string | null
  proveedor?: Proveedor
  proyecto?: Proyecto | null
  ordenCompra?: OrdenCompra | null
  pedidoEquipo?: { id: string; codigo: string } | null
  pedidoEquipoItem?: { id: string; codigo: string; descripcion: string } | null
  pagos?: PagoPagar[]
  adjuntos?: Array<{
    id: string
    nombreArchivo: string
    urlArchivo: string
    tipoArchivo: string | null
    createdAt: string
    subidoPor?: { id: string; name: string | null }
  }>
}

const ESTADOS_CXP = [
  { value: 'pendiente_documentos', label: 'Pend. Documentos', color: 'bg-purple-100 text-purple-700' },
  { value: 'pendiente', label: 'Pendiente', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'parcial', label: 'Parcial', color: 'bg-blue-100 text-blue-700' },
  { value: 'pagada', label: 'Pagada', color: 'bg-green-100 text-green-700' },
  { value: 'vencida', label: 'Vencida', color: 'bg-red-100 text-red-700' },
  { value: 'anulada', label: 'Anulada', color: 'bg-gray-100 text-gray-700' },
]

const CONDICIONES_PAGO = [
  { value: 'contado', label: 'Contado' },
  { value: 'credito_15', label: 'Crédito 15 días' },
  { value: 'credito_30', label: 'Crédito 30 días' },
  { value: 'credito_45', label: 'Crédito 45 días' },
  { value: 'credito_60', label: 'Crédito 60 días' },
  { value: 'credito_90', label: 'Crédito 90 días' },
]

const getEstadoColor = (estado: string) =>
  ESTADOS_CXP.find(e => e.value === estado)?.color || 'bg-gray-100 text-gray-700'

const formatCurrency = (amount: number, moneda = 'PEN') =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda }).format(amount)

const formatDate = (date: string) =>
  new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })

const isVencida = (fecha: string, estado: string) => {
  if (estado === 'pagada' || estado === 'anulada') return false
  return new Date(fecha) < new Date()
}

export default function CuentasPagarPage() {
  const [items, setItems] = useState<CuentaPorPagar[]>([])
  const [cuentasBancarias, setCuentasBancarias] = useState<CuentaBancaria[]>([])
  const [proveedores, setProveedores] = useState<Proveedor[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [ordenesCompra, setOrdenesCompra] = useState<OrdenCompra[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterEstado, setFilterEstado] = useState<string>('all')

  // Create dialog
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [createForm, setCreateForm] = useState({
    proveedorId: '',
    numeroFactura: '',
    monto: '',
    moneda: 'PEN',
    fechaRecepcion: new Date().toISOString().split('T')[0],
    fechaVencimiento: '',
    condicionPago: 'contado',
    diasCredito: '',
    proyectoId: '',
    ordenCompraId: '',
    descripcion: '',
    observaciones: '',
  })

  // Pago dialog
  const [showPagoDialog, setShowPagoDialog] = useState(false)
  const [pagoCuenta, setPagoCuenta] = useState<CuentaPorPagar | null>(null)
  const [pagoMonto, setPagoMonto] = useState('')
  const [pagoFecha, setPagoFecha] = useState(new Date().toISOString().split('T')[0])
  const [pagoMedio, setPagoMedio] = useState('transferencia')
  const [pagoOperacion, setPagoOperacion] = useState('')
  const [pagoBancoId, setPagoBancoId] = useState('none')
  const [pagoObs, setPagoObs] = useState('')
  const [conDetraccion, setConDetraccion] = useState(false)
  const [detraccionPorcentaje, setDetraccionPorcentaje] = useState('12')
  const [detraccionCodigo, setDetraccionCodigo] = useState('')
  const [detraccionFechaPago, setDetraccionFechaPago] = useState('')
  const [cuentaBNId, setCuentaBNId] = useState('none')

  // Detail dialog
  const [showDetail, setShowDetail] = useState<CuentaPorPagar | null>(null)

  // Import dialog
  const [showImportDialog, setShowImportDialog] = useState(false)

  useEffect(() => { loadData() }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      const [cxpRes, bancoRes, provRes, proyRes, ocRes] = await Promise.all([
        fetch('/api/administracion/cuentas-pagar'),
        fetch('/api/administracion/cuentas-bancarias'),
        fetch('/api/proveedores'),
        fetch('/api/proyectos?fields=id,codigo,nombre'),
        fetch('/api/orden-compra'),
      ])
      if (cxpRes.ok) setItems(await cxpRes.json())
      if (bancoRes.ok) {
        const bancos = await bancoRes.json()
        setCuentasBancarias(bancos.filter((b: any) => b.activa))
      }
      if (provRes.ok) {
        const provData = await provRes.json()
        setProveedores(provData.data || provData)
      }
      if (proyRes.ok) setProyectos(await proyRes.json())
      if (ocRes.ok) setOrdenesCompra(await ocRes.json())
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

    const byMoneda = (arr: CuentaPorPagar[], field: 'saldoPendiente' | 'monto') => {
      const pen = arr.filter(i => i.moneda === 'PEN').reduce((s, i) => s + i[field], 0)
      const usd = arr.filter(i => i.moneda === 'USD').reduce((s, i) => s + i[field], 0)
      return { pen, usd }
    }

    return {
      pendiente: byMoneda(pendientes, 'saldoPendiente'),
      countPendiente: pendientes.length,
      vencido: byMoneda(vencidas, 'saldoPendiente'),
      countVencido: vencidas.length,
      pagado: byMoneda(pagadas, 'monto'),
    }
  }, [items])

  // OCs confirmadas/completadas sin CxP vinculada
  const ocsSinFactura = useMemo(() => {
    const ocIdsConCxP = new Set(items.filter(i => i.ordenCompraId && i.estado !== 'anulada').map(i => i.ordenCompraId))
    return ordenesCompra.filter(oc =>
      ['confirmada', 'completada'].includes(oc.estado) && !ocIdsConCxP.has(oc.id)
    )
  }, [items, ordenesCompra])

  const filtered = useMemo(() => {
    let result = items
    if (filterEstado !== 'all') result = result.filter(i => i.estado === filterEstado)
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      result = result.filter(i =>
        i.numeroFactura?.toLowerCase().includes(term) ||
        i.proveedor?.nombre.toLowerCase().includes(term) ||
        i.proveedor?.ruc?.includes(term) ||
        i.proyecto?.codigo.toLowerCase().includes(term) ||
        i.descripcion?.toLowerCase().includes(term)
      )
    }
    return result
  }, [items, filterEstado, searchTerm])

  // --- Create ---
  const resetCreateForm = () => {
    setCreateForm({
      proveedorId: '',
      numeroFactura: '',
      monto: '',
      moneda: 'PEN',
      fechaRecepcion: new Date().toISOString().split('T')[0],
      fechaVencimiento: '',
      condicionPago: 'contado',
      diasCredito: '',
      proyectoId: '',
      ordenCompraId: '',
      descripcion: '',
      observaciones: '',
    })
  }

  const calcularFechaVencimiento = (fechaRecepcion: string, condicionPago: string, diasCredito: string): string => {
    if (!fechaRecepcion) return ''
    if (condicionPago === 'contado') return fechaRecepcion
    let dias = parseInt(diasCredito)
    if (isNaN(dias) && condicionPago.startsWith('credito_')) {
      dias = parseInt(condicionPago.split('_')[1])
    }
    if (isNaN(dias) || dias <= 0) return ''
    const fecha = new Date(fechaRecepcion + 'T00:00:00')
    fecha.setDate(fecha.getDate() + dias)
    return fecha.toISOString().split('T')[0]
  }

  const handleCreate = async () => {
    if (!createForm.proveedorId || !createForm.monto || !createForm.fechaRecepcion || !createForm.fechaVencimiento) {
      toast.error('Proveedor, monto, fecha recepción y fecha vencimiento son requeridos')
      return
    }
    if (createForm.ordenCompraId && !createForm.numeroFactura.trim()) {
      toast.error('El número de factura es obligatorio al registrar desde OC')
      return
    }
    const monto = parseFloat(createForm.monto)
    if (isNaN(monto) || monto <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }
    if (new Date(createForm.fechaVencimiento) < new Date(createForm.fechaRecepcion)) {
      toast.error('La fecha de vencimiento debe ser posterior a la de recepción')
      return
    }
    setSaving(true)
    try {
      const res = await fetch('/api/administracion/cuentas-pagar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proveedorId: createForm.proveedorId,
          numeroFactura: createForm.numeroFactura || null,
          monto,
          moneda: createForm.moneda,
          fechaRecepcion: createForm.fechaRecepcion,
          fechaVencimiento: createForm.fechaVencimiento,
          condicionPago: createForm.condicionPago,
          diasCredito: createForm.diasCredito ? parseInt(createForm.diasCredito) : null,
          proyectoId: createForm.proyectoId || null,
          ordenCompraId: createForm.ordenCompraId || null,
          descripcion: createForm.descripcion || null,
          observaciones: createForm.observaciones || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error')
      }
      toast.success('Cuenta por pagar creada')
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
  const handleAnular = async (cuenta: CuentaPorPagar) => {
    if (!confirm(`¿Anular la cuenta ${cuenta.numeroFactura || cuenta.id.slice(0, 8)}?`)) return
    setSaving(true)
    try {
      const res = await fetch(`/api/administracion/cuentas-pagar/${cuenta.id}`, {
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
  const openPago = (cuenta: CuentaPorPagar) => {
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
      const res = await fetch(`/api/administracion/cuentas-pagar/${pagoCuenta.id}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          monto,
          fechaPago: pagoFecha,
          medioPago: pagoMedio,
          numeroOperacion: pagoOperacion || null,
          cuentaBancariaId: pagoBancoId === 'none' ? null : pagoBancoId,
          observaciones: pagoObs || null,
          conDetraccion,
          detraccionPorcentaje: conDetraccion ? parseFloat(detraccionPorcentaje) : undefined,
          detraccionCodigo: conDetraccion ? detraccionCodigo || undefined : undefined,
          detraccionFechaPago: conDetraccion ? detraccionFechaPago || undefined : undefined,
          cuentaBNId: conDetraccion && cuentaBNId !== 'none' ? cuentaBNId : undefined,
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
          <h1 className="text-2xl font-bold">Cuentas por Pagar</h1>
          <p className="text-muted-foreground">Gestión de facturas y pagos a proveedores</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => exportarCxPAExcel(filtered)}>
            <Download className="h-4 w-4 mr-1" />
            Exportar
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowImportDialog(true)}>
            <Upload className="h-4 w-4 mr-1" />
            Importar
          </Button>
          <Button onClick={() => { resetCreateForm(); setShowCreateDialog(true) }}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Cuenta por Pagar
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
                <div className="text-lg font-bold text-green-600">{renderMonedaTotals(resumen.pagado.pen, resumen.pagado.usd)}</div>
                <div className="text-xs text-muted-foreground">pagado total</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* OCs sin factura registrada */}
      {ocsSinFactura.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Package className="h-5 w-5 text-orange-600" />
              <span className="font-medium text-orange-800">OCs sin factura registrada ({ocsSinFactura.length})</span>
            </div>
            <div className="space-y-2">
              {ocsSinFactura.slice(0, 5).map(oc => (
                <div key={oc.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-orange-100">
                  <div className="flex items-center gap-3 text-sm">
                    <span className="font-mono font-medium">{oc.numero}</span>
                    <span className="text-muted-foreground">{oc.proveedor?.nombre}</span>
                    {oc.proyecto && <Badge variant="outline" className="text-xs">{oc.proyecto.codigo}</Badge>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-medium">{formatCurrency(oc.total, oc.moneda)}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-orange-700 hover:text-orange-900 hover:bg-orange-100"
                      onClick={() => {
                        resetCreateForm()
                        const diasStr = oc.diasCredito ? String(oc.diasCredito) : ''
                        const fechaRec = new Date().toISOString().split('T')[0]
                        setCreateForm(f => ({
                          ...f,
                          ordenCompraId: oc.id,
                          proveedorId: oc.proveedorId,
                          monto: oc.total.toFixed(2),
                          moneda: oc.moneda,
                          proyectoId: oc.proyectoId || '',
                          condicionPago: oc.condicionPago || 'contado',
                          diasCredito: diasStr,
                          descripcion: `OC ${oc.numero}`,
                          fechaVencimiento: calcularFechaVencimiento(fechaRec, oc.condicionPago || 'contado', diasStr),
                        }))
                        setShowCreateDialog(true)
                      }}
                    >
                      Registrar factura
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              ))}
              {ocsSinFactura.length > 5 && (
                <p className="text-xs text-orange-600 text-center">y {ocsSinFactura.length - 5} más...</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* CxP pendientes de documentos */}
      {items.filter(i => i.estado === 'pendiente_documentos').length > 0 && (
        <Card className="border-purple-200 bg-purple-50/50">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-purple-600 shrink-0" />
            <div>
              <span className="font-medium text-purple-800">{items.filter(i => i.estado === 'pendiente_documentos').length} CxP requieren documentos de respaldo</span>
              <p className="text-xs text-purple-600 mt-0.5">Importaciones directas sin factura adjunta. Adjunte los comprobantes en el detalle de cada cuenta.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filtros */}
      <div className="flex gap-3 items-center flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar proveedor, RUC, factura..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
        </div>
        <Select value={filterEstado} onValueChange={setFilterEstado}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {ESTADOS_CXP.map(e => (
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
                <TableHead>Factura</TableHead>
                <TableHead>Proveedor</TableHead>
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
                    No hay cuentas por pagar
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(item => {
                  const vencida = isVencida(item.fechaVencimiento, item.estado)
                  return (
                    <TableRow key={item.id} className={`${item.estado === 'anulada' ? 'opacity-50' : ''} ${vencida ? 'bg-red-50/50' : ''}`}>
                      <TableCell className="font-mono text-sm">{item.numeroFactura || '—'}</TableCell>
                      <TableCell className="text-sm">
                        <div className="font-medium">{item.proveedor?.nombre}</div>
                        {item.proveedor?.ruc && <div className="text-xs text-muted-foreground">{item.proveedor.ruc}</div>}
                      </TableCell>
                      <TableCell className="text-sm font-mono">{item.proyecto?.codigo || '—'}</TableCell>
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
                          {ESTADOS_CXP.find(e => e.value === item.estado)?.label || item.estado}
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
                                <ArrowUpCircle className="h-3 w-3 mr-1" />
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

      {/* Dialog crear cuenta por pagar */}
      <Dialog open={showCreateDialog} onOpenChange={open => { if (!open) setShowCreateDialog(false) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Cuenta por Pagar</DialogTitle>
            <DialogDescription>Registrar una factura o cuenta pendiente de pago a proveedor</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Card informativa OC (solo cuando viene de una OC) */}
            {createForm.ordenCompraId ? (() => {
              const oc = ordenesCompra.find(o => o.id === createForm.ordenCompraId)
              if (!oc) return null
              return (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-blue-800">Datos de la OC (referencia)</p>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px] text-blue-600" onClick={() => setCreateForm(f => ({ ...f, ordenCompraId: '', diasCredito: '' }))}>
                      Desvincular OC
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                    <span className="text-muted-foreground">Proveedor:</span>
                    <span className="font-medium">{oc.proveedor?.nombre}{oc.proveedor?.ruc ? ` (${oc.proveedor.ruc})` : ''}</span>
                    <span className="text-muted-foreground">OC vinculada:</span>
                    <span className="font-mono font-medium">{oc.numero}</span>
                    {oc.proyecto && <>
                      <span className="text-muted-foreground">Proyecto:</span>
                      <span className="font-medium">{oc.proyecto.nombre}</span>
                    </>}
                    <span className="text-muted-foreground">Moneda:</span>
                    <span className="font-medium">{oc.moneda}</span>
                  </div>
                </div>
              )
            })() : (
              <>
                <div>
                  <Label>Orden de Compra (opcional)</Label>
                  <Select value="none" onValueChange={v => {
                    const ocId = v === 'none' ? '' : v
                    if (ocId) {
                      const oc = ordenesCompra.find(o => o.id === ocId)
                      if (oc) {
                        const diasStr = oc.diasCredito ? String(oc.diasCredito) : ''
                        setCreateForm(f => ({
                          ...f,
                          ordenCompraId: ocId,
                          proveedorId: oc.proveedorId,
                          monto: oc.total.toFixed(2),
                          moneda: oc.moneda,
                          proyectoId: oc.proyectoId || '',
                          condicionPago: oc.condicionPago || 'contado',
                          diasCredito: diasStr,
                          descripcion: f.descripcion || `OC ${oc.numero}`,
                          fechaVencimiento: calcularFechaVencimiento(f.fechaRecepcion, oc.condicionPago || 'contado', diasStr),
                        }))
                      }
                    }
                  }}>
                    <SelectTrigger><SelectValue placeholder="Sin OC" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin OC</SelectItem>
                      {ordenesCompra.map(oc => (
                        <SelectItem key={oc.id} value={oc.id}>
                          {oc.numero} — {oc.proveedor?.nombre || 'Proveedor'} — {formatCurrency(oc.total, oc.moneda)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Proveedor *</Label>
                  <Select value={createForm.proveedorId} onValueChange={v => setCreateForm(f => ({ ...f, proveedorId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar proveedor" /></SelectTrigger>
                    <SelectContent>
                      {proveedores.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.nombre}{p.ruc ? ` (${p.ruc})` : ''}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Proyecto (opcional)</Label>
                  <Select value={createForm.proyectoId || 'none'} onValueChange={v => setCreateForm(f => ({ ...f, proyectoId: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Sin proyecto" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin proyecto</SelectItem>
                      {proyectos.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.codigo} - {p.nombre}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            <div>
              <Label>N° Factura {createForm.ordenCompraId ? '*' : ''}</Label>
              <Input placeholder="F001-00123" value={createForm.numeroFactura} onChange={e => setCreateForm(f => ({ ...f, numeroFactura: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monto *</Label>
                <Input type="number" step="0.01" placeholder="0.00" value={createForm.monto} onChange={e => setCreateForm(f => ({ ...f, monto: e.target.value }))} />
              </div>
              {!createForm.ordenCompraId && (
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
              )}
            </div>
            <div>
              <Label>Condición de Pago</Label>
              <Select value={createForm.condicionPago} onValueChange={v => {
                const diasFromCondicion = v.startsWith('credito_') ? v.split('_')[1] : ''
                setCreateForm(f => ({
                  ...f,
                  condicionPago: v,
                  diasCredito: diasFromCondicion || f.diasCredito,
                  fechaVencimiento: calcularFechaVencimiento(f.fechaRecepcion, v, diasFromCondicion || f.diasCredito),
                }))
              }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CONDICIONES_PAGO.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {createForm.condicionPago !== 'contado' && (
              <div>
                <Label>Días de crédito</Label>
                <Input
                  type="number"
                  placeholder="30"
                  value={createForm.diasCredito}
                  onChange={e => {
                    const dias = e.target.value
                    setCreateForm(f => ({
                      ...f,
                      diasCredito: dias,
                      fechaVencimiento: calcularFechaVencimiento(f.fechaRecepcion, f.condicionPago, dias),
                    }))
                  }}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha Recepción *</Label>
                <Input type="date" value={createForm.fechaRecepcion} onChange={e => {
                  const fecha = e.target.value
                  setCreateForm(f => ({
                    ...f,
                    fechaRecepcion: fecha,
                    fechaVencimiento: calcularFechaVencimiento(fecha, f.condicionPago, f.diasCredito),
                  }))
                }} />
              </div>
              <div>
                <Label>Fecha Vencimiento *</Label>
                <Input type="date" value={createForm.fechaVencimiento} onChange={e => setCreateForm(f => ({ ...f, fechaVencimiento: e.target.value }))} />
              </div>
            </div>
            {!createForm.ordenCompraId && (
              <div>
                <Label>Descripción</Label>
                <Input placeholder="Descripción del gasto o servicio" value={createForm.descripcion} onChange={e => setCreateForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>
            )}
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
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              {pagoCuenta && `${pagoCuenta.proveedor?.nombre} — ${pagoCuenta.numeroFactura || 'Sin factura'} — Saldo: ${formatCurrency(pagoCuenta.saldoPendiente, pagoCuenta.moneda)}`}
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

            {/* Detracción */}
            <div className="flex items-center space-x-2 pt-2 border-t">
              <Checkbox id="conDetraccionP" checked={conDetraccion} onCheckedChange={(v) => setConDetraccion(!!v)} />
              <Label htmlFor="conDetraccionP" className="text-sm font-medium cursor-pointer">¿Incluye detracción?</Label>
            </div>
            {conDetraccion && (
              <div className="space-y-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Porcentaje detracción (%)</Label>
                    <Input type="number" step="0.01" min={0} max={100} value={detraccionPorcentaje} onChange={e => setDetraccionPorcentaje(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Código SUNAT</Label>
                    <Input placeholder="Ej: 012" value={detraccionCodigo} onChange={e => setDetraccionCodigo(e.target.value)} />
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Fecha depósito BN</Label>
                  <Input type="date" value={detraccionFechaPago} onChange={e => setDetraccionFechaPago(e.target.value)} />
                </div>
                <div>
                  <Label className="text-xs">Cuenta Banco de la Nación</Label>
                  <Select value={cuentaBNId} onValueChange={setCuentaBNId}>
                    <SelectTrigger><SelectValue placeholder="Seleccionar cuenta BN" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin especificar</SelectItem>
                      {cuentasBancarias.map(b => (
                        <SelectItem key={b.id} value={b.id}>{b.nombreBanco} - {b.numeroCuenta}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {pagoMonto && detraccionPorcentaje && (
                  <div className="text-xs space-y-1 pt-2 border-t border-amber-300">
                    <div className="flex justify-between">
                      <span>Monto total:</span>
                      <span className="font-mono">{pagoCuenta ? formatCurrency(parseFloat(pagoMonto), pagoCuenta.moneda) : pagoMonto}</span>
                    </div>
                    <div className="flex justify-between text-amber-700">
                      <span>Detracción ({detraccionPorcentaje}%):</span>
                      <span className="font-mono">{pagoCuenta ? formatCurrency(Math.round(parseFloat(pagoMonto) * parseFloat(detraccionPorcentaje) / 100 * 100) / 100, pagoCuenta.moneda) : ''}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Neto a pagar:</span>
                      <span className="font-mono">{pagoCuenta ? formatCurrency(Math.round((parseFloat(pagoMonto) - parseFloat(pagoMonto) * parseFloat(detraccionPorcentaje) / 100) * 100) / 100, pagoCuenta.moneda) : ''}</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPagoDialog(false)}>Cancelar</Button>
            <Button onClick={handlePago} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {conDetraccion ? 'Registrar con Detracción' : 'Registrar Pago'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import modal */}
      <CxPImportExcelModal
        isOpen={showImportDialog}
        onClose={() => setShowImportDialog(false)}
        proveedores={proveedores}
        proyectos={proyectos}
        onImported={loadData}
      />

      {/* Dialog detalle */}
      <Dialog open={!!showDetail} onOpenChange={open => { if (!open) setShowDetail(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalle CxP</DialogTitle>
            <DialogDescription>
              {showDetail?.proveedor?.nombre} — {showDetail?.numeroFactura || 'Sin factura'}
            </DialogDescription>
          </DialogHeader>
          {showDetail && (
            <div className="space-y-4 text-sm max-h-[60vh] overflow-y-auto">
              <div className="flex items-center gap-2">
                <Badge className={getEstadoColor(showDetail.estado)}>
                  {ESTADOS_CXP.find(e => e.value === showDetail.estado)?.label || showDetail.estado}
                </Badge>
                {isVencida(showDetail.fechaVencimiento, showDetail.estado) && (
                  <Badge className="bg-red-100 text-red-700">Vencida</Badge>
                )}
                <Badge variant="outline">{showDetail.condicionPago}</Badge>
              </div>
              <Card>
                <CardContent className="p-3 space-y-1">
                  <div className="flex justify-between"><span>Proveedor</span><span className="font-medium">{showDetail.proveedor?.nombre}</span></div>
                  {showDetail.proveedor?.ruc && <div className="flex justify-between"><span>RUC</span><span className="font-mono">{showDetail.proveedor.ruc}</span></div>}
                  {showDetail.proyecto && <div className="flex justify-between"><span>Proyecto</span><span className="font-mono">{showDetail.proyecto.codigo}</span></div>}
                  {showDetail.ordenCompra && <div className="flex justify-between"><span>Orden Compra</span><span className="font-mono">{showDetail.ordenCompra.numero}</span></div>}
                  {showDetail.pedidoEquipo && <div className="flex justify-between"><span>Pedido origen</span><a href={`/logistica/pedidos/${showDetail.pedidoEquipo.id}`} className="text-blue-600 hover:underline font-mono">{showDetail.pedidoEquipo.codigo}</a></div>}
                  {showDetail.tipoOrigen && <div className="flex justify-between"><span>Tipo origen</span><Badge variant="outline" className="text-xs">{showDetail.tipoOrigen === 'importacion_gerencia' ? 'Importación Gerencia' : showDetail.tipoOrigen === 'atencion_directa' ? 'Atención Directa' : showDetail.tipoOrigen}</Badge></div>}
                  {showDetail.descripcion && <div className="flex justify-between"><span>Descripción</span><span className="text-right max-w-[200px] truncate">{showDetail.descripcion}</span></div>}
                  <div className="flex justify-between"><span>Recepción</span><span>{formatDate(showDetail.fechaRecepcion)}</span></div>
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

              {/* Documentos de respaldo */}
              <div>
                <div className="font-medium mb-2 flex items-center gap-2">
                  Documentos de Respaldo
                  {showDetail.tipoOrigen === 'importacion_gerencia' && showDetail.estado === 'pendiente_documentos' && (
                    <Badge className="bg-purple-100 text-purple-700 text-[10px]">Obligatorio</Badge>
                  )}
                </div>
                {showDetail.adjuntos && showDetail.adjuntos.length > 0 ? (
                  <div className="space-y-1">
                    {showDetail.adjuntos.map((adj) => (
                      <div key={adj.id} className="flex items-center justify-between text-xs border rounded p-2">
                        <a href={adj.urlArchivo} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline truncate max-w-[250px]">{adj.nombreArchivo}</a>
                        <Badge variant="outline" className="text-[10px] shrink-0 ml-2">{adj.tipoArchivo || 'otro'}</Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Sin documentos adjuntos</p>
                )}
                {(showDetail.estado === 'pendiente_documentos' || showDetail.estado === 'pendiente') && (
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <select
                        id="adjuntoTipo"
                        defaultValue="factura"
                        className="h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="factura">Factura proveedor</option>
                        <option value="transferencia">Comprobante transferencia</option>
                        <option value="dua">DUA Aduanas</option>
                        <option value="otro">Otro</option>
                      </select>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs text-blue-600 hover:text-blue-800">
                        <Upload className="h-3.5 w-3.5" />
                        Adjuntar
                        <input
                          type="file"
                          accept=".pdf,.png,.jpg,.jpeg,.webp"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file || !showDetail) return
                            const tipoSelect = document.getElementById('adjuntoTipo') as HTMLSelectElement
                            const tipoArchivo = tipoSelect?.value || 'otro'
                            const fd = new FormData()
                            fd.append('file', file)
                            fd.append('cuentaPorPagarId', showDetail.id)
                            fd.append('tipoArchivo', tipoArchivo)
                            try {
                              const res = await fetch('/api/cxp-adjunto', { method: 'POST', credentials: 'include', body: fd })
                              if (!res.ok) throw new Error('Error al subir')
                              toast.success('Documento adjuntado')
                              loadData()
                              // Refresh detail
                              const updated = await res.json()
                              setShowDetail(prev => prev ? {
                                ...prev,
                                adjuntos: [...(prev.adjuntos || []), updated],
                                estado: prev.estado === 'pendiente_documentos' && ['factura', 'transferencia'].includes(tipoArchivo) ? 'pendiente' : prev.estado,
                              } : null)
                            } catch {
                              toast.error('Error al adjuntar documento')
                            }
                            e.target.value = ''
                          }}
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>
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
                <ArrowUpCircle className="h-4 w-4 mr-2" />
                Registrar Pago
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
