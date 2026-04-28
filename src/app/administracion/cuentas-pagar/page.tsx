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
import { Loader2, Search, ArrowUpCircle, AlertTriangle, DollarSign, Clock, CheckCircle, Plus, Ban, Package, ChevronRight, ChevronDown, FileSpreadsheet, Upload, Download, Trash2, Pencil, MoreHorizontal, Eye } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import toast from 'react-hot-toast'
import CxPImportExcelModal from '@/components/administracion/CxPImportExcelModal'
import { exportarCxPAExcel } from '@/lib/utils/cuentasPagarExcel'
import { CONDICIONES_PAGO, FORMAS_PAGO, formatPago } from '@/lib/utils/formaPago'

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
  esDetraccion?: boolean
  numeroConstanciaBN?: string | null
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
  formaPago?: string | null
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
  formaPago?: string | null
  diasCredito?: number | null
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


const getEstadoColor = (estado: string) =>
  ESTADOS_CXP.find(e => e.value === estado)?.color || 'bg-gray-100 text-gray-700'

const formatCurrency = (amount: number, moneda = 'PEN') =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda }).format(amount)

const formatDate = (date: string) => {
  const d = new Date(date)
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())
    .toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' })
}

const isVencida = (fecha: string, estado: string) => {
  if (estado === 'pagada' || estado === 'anulada') return false
  return new Date(fecha) < new Date()
}

const diasParaVencer = (fecha: string, estado: string): number | null => {
  if (estado === 'pagada' || estado === 'anulada') return null
  const d = new Date(fecha)
  const hoy = new Date()
  hoy.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.round((d.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24))
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
    formaPago: '',
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
  const [numeroConstanciaBN, setNumeroConstanciaBN] = useState('')

  // Detail dialog
  const [showDetail, setShowDetail] = useState<CuentaPorPagar | null>(null)
  const [editingObs, setEditingObs] = useState<string | null>(null)

  // OCs sin factura panel
  const [ocsSinFacturaExpanded, setOcsSinFacturaExpanded] = useState(false)

  const [filterProyectoId, setFilterProyectoId] = useState<string>('all')
  const [filterFechaDesde, setFilterFechaDesde] = useState<string>('')
  const [filterFechaHasta, setFilterFechaHasta] = useState<string>('')
  const [sortField, setSortField] = useState<string>('fechaVencimiento')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  // Confirm dialog (anular/eliminar)
  const [confirmDialog, setConfirmDialog] = useState<{
    tipo: 'anular' | 'eliminar'
    cuenta: CuentaPorPagar
  } | null>(null)

  // Import dialog
  const [showImportDialog, setShowImportDialog] = useState(false)

  const toggleSort = (field: string) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

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
    if (filterProyectoId !== 'all') result = result.filter(i => i.proyectoId === filterProyectoId)
    if (filterFechaDesde) result = result.filter(i => i.fechaVencimiento >= filterFechaDesde)
    if (filterFechaHasta) result = result.filter(i => i.fechaVencimiento <= filterFechaHasta + 'T23:59:59')
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
    result = [...result].sort((a, b) => {
      let va: any, vb: any
      if (sortField === 'fechaVencimiento') { va = a.fechaVencimiento; vb = b.fechaVencimiento }
      else if (sortField === 'fechaRecepcion') { va = a.fechaRecepcion; vb = b.fechaRecepcion }
      else if (sortField === 'monto') { va = a.monto; vb = b.monto }
      else if (sortField === 'saldo') { va = a.saldoPendiente; vb = b.saldoPendiente }
      else if (sortField === 'proveedor') { va = a.proveedor?.nombre || ''; vb = b.proveedor?.nombre || '' }
      else if (sortField === 'estado') { va = a.estado; vb = b.estado }
      else { va = a.fechaVencimiento; vb = b.fechaVencimiento }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
    return result
  }, [items, filterEstado, filterProyectoId, filterFechaDesde, filterFechaHasta, searchTerm, sortField, sortDir])

  const filteredTotals = useMemo(() => {
    const active = filtered.filter(i => i.estado !== 'anulada')
    const pen = active.filter(i => i.moneda === 'PEN')
    const usd = active.filter(i => i.moneda === 'USD')
    return {
      montoPEN: pen.reduce((s, i) => s + i.monto, 0),
      saldoPEN: pen.reduce((s, i) => s + i.saldoPendiente, 0),
      montoUSD: usd.reduce((s, i) => s + i.monto, 0),
      saldoUSD: usd.reduce((s, i) => s + i.saldoPendiente, 0),
      count: active.length,
    }
  }, [filtered])

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
      formaPago: '',
      diasCredito: '',
      proyectoId: '',
      ordenCompraId: '',
      descripcion: '',
      observaciones: '',
    })
  }

  const calcularFechaVencimiento = (fechaRecepcion: string, condicionPago: string, diasCredito: string): string => {
    if (!fechaRecepcion) return ''
    if (condicionPago !== 'credito') return fechaRecepcion
    const dias = parseInt(diasCredito)
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
          formaPago: createForm.formaPago || null,
          diasCredito: createForm.condicionPago === 'credito' && createForm.diasCredito ? parseInt(createForm.diasCredito) : null,
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

  // --- Guardar observaciones ---
  const saveObservaciones = async () => {
    if (!showDetail || editingObs === null) return
    try {
      const res = await fetch(`/api/administracion/cuentas-pagar/${showDetail.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observaciones: editingObs }),
      })
      if (!res.ok) throw new Error('Error al guardar')
      setShowDetail(prev => prev ? { ...prev, observaciones: editingObs || null } : prev)
      setItems(prev => prev.map(i => i.id === showDetail.id ? { ...i, observaciones: editingObs || null } : i))
      setEditingObs(null)
      toast.success('Observaciones guardadas')
    } catch {
      toast.error('Error al guardar observaciones')
    }
  }

  // --- Anular ---
  const handleAnular = (cuenta: CuentaPorPagar) => {
    setConfirmDialog({ tipo: 'anular', cuenta })
  }

  const executeAnular = async (cuenta: CuentaPorPagar) => {
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

  // --- Eliminar ---
  const handleEliminar = (cuenta: CuentaPorPagar) => {
    setConfirmDialog({ tipo: 'eliminar', cuenta })
  }

  const executeEliminar = async (cuenta: CuentaPorPagar) => {
    setSaving(true)
    try {
      const res = await fetch(`/api/administracion/cuentas-pagar/${cuenta.id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al eliminar')
      }
      toast.success('Cuenta eliminada')
      setShowDetail(null)
      loadData()
    } catch (e: any) {
      toast.error(e.message || 'Error al eliminar')
    } finally {
      setSaving(false)
    }
  }

  const handleConfirmAction = async () => {
    if (!confirmDialog) return
    const { tipo, cuenta } = confirmDialog
    setConfirmDialog(null)
    if (tipo === 'anular') await executeAnular(cuenta)
    else await executeEliminar(cuenta)
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
          numeroConstanciaBN: conDetraccion && numeroConstanciaBN ? numeroConstanciaBN : undefined,
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
          <CardContent className="p-0">
            <button
              className="w-full flex items-center justify-between px-4 py-3 hover:bg-orange-100/50 transition-colors rounded-lg"
              onClick={() => setOcsSinFacturaExpanded(v => !v)}
            >
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-orange-600" />
                <span className="font-medium text-orange-800 text-sm">
                  {ocsSinFactura.length} OC{ocsSinFactura.length > 1 ? 's' : ''} sin factura registrada
                </span>
                <Badge className="bg-orange-200 text-orange-800 text-xs">{ocsSinFactura.length}</Badge>
              </div>
              <ChevronDown className={`h-4 w-4 text-orange-600 transition-transform ${ocsSinFacturaExpanded ? 'rotate-180' : ''}`} />
            </button>
            {ocsSinFacturaExpanded && (
              <div className="px-4 pb-3 space-y-1.5">
            <div className="max-h-64 overflow-y-auto space-y-1.5">
            {ocsSinFactura.map(oc => (
                  <div key={oc.id} className="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-orange-100">
                    <div className="flex items-center gap-2 text-sm min-w-0">
                      <span className="font-mono font-medium text-xs shrink-0">{oc.numero}</span>
                      <span className="text-muted-foreground truncate max-w-[180px]">{oc.proveedor?.nombre}</span>
                      {oc.proyecto && <Badge variant="outline" className="text-xs shrink-0">{oc.proyecto.codigo}</Badge>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-mono text-xs font-medium">{formatCurrency(oc.total, oc.moneda)}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-orange-700 hover:text-orange-900 hover:bg-orange-100 px-2"
                        onClick={() => {
                          resetCreateForm()
                          const diasStr = oc.diasCredito ? String(oc.diasCredito) : ''
                          const fechaRec = new Date().toISOString().split('T')[0]
                          const cond = ['contado', 'credito', 'adelanto'].includes(oc.condicionPago || '') ? (oc.condicionPago || 'contado') : 'contado'
                          setCreateForm(f => ({
                            ...f,
                            ordenCompraId: oc.id,
                            proveedorId: oc.proveedorId,
                            monto: oc.total.toFixed(2),
                            moneda: oc.moneda,
                            proyectoId: oc.proyectoId || '',
                            condicionPago: cond,
                            formaPago: (oc as any).formaPago || '',
                            diasCredito: diasStr,
                            descripcion: `OC ${oc.numero}`,
                            fechaVencimiento: calcularFechaVencimiento(fechaRec, cond, diasStr),
                          }))
                          setShowCreateDialog(true)
                        }}
                      >
                        Registrar <ChevronRight className="h-3 w-3 ml-0.5" />
                      </Button>
                    </div>
                  </div>
                ))}
            </div>
              </div>
            )}
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
      <div className="space-y-2">
        <div className="flex gap-2 items-center flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar proveedor, RUC, factura, proyecto..." className="pl-9" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
          </div>
          <Select value={filterEstado} onValueChange={setFilterEstado}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              {ESTADOS_CXP.map(e => (
                <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterProyectoId} onValueChange={setFilterProyectoId}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Proyecto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los proyectos</SelectItem>
              {proyectos.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.codigo}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            <Input type="date" className="w-36 h-9" value={filterFechaDesde} onChange={e => setFilterFechaDesde(e.target.value)} title="Vencimiento desde" />
            <span className="text-muted-foreground text-xs">—</span>
            <Input type="date" className="w-36 h-9" value={filterFechaHasta} onChange={e => setFilterFechaHasta(e.target.value)} title="Vencimiento hasta" />
          </div>
          {(filterEstado !== 'all' || filterProyectoId !== 'all' || filterFechaDesde || filterFechaHasta || searchTerm) && (
            <Button variant="ghost" size="sm" className="text-muted-foreground h-9" onClick={() => { setFilterEstado('all'); setFilterProyectoId('all'); setFilterFechaDesde(''); setFilterFechaHasta(''); setSearchTerm('') }}>
              Limpiar filtros
            </Button>
          )}
        </div>
        <div className="text-xs text-muted-foreground">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</div>
      </div>

      {/* Tabla */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('numeroFactura')}>Factura</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('proveedor')}>
                  Proveedor {sortField === 'proveedor' && (sortDir === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead>OC</TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('monto')}>
                  Monto {sortField === 'monto' && (sortDir === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-right cursor-pointer select-none" onClick={() => toggleSort('saldo')}>
                  Saldo {sortField === 'saldo' && (sortDir === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('fechaVencimiento')}>
                  Fechas {sortField === 'fechaVencimiento' || sortField === 'fechaRecepcion' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => toggleSort('estado')}>
                  Estado {sortField === 'estado' && (sortDir === 'asc' ? '↑' : '↓')}
                </TableHead>
                <TableHead className="text-right w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    No hay cuentas por pagar
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map(item => {
                  const vencida = isVencida(item.fechaVencimiento, item.estado)
                  return (
                    <TableRow key={item.id} className={`${item.estado === 'anulada' ? 'opacity-50' : ''} ${vencida ? 'bg-red-50/50' : ''}`}>
                      <TableCell className="font-mono text-sm">
                        <div>{item.numeroFactura || <span className="text-muted-foreground italic text-xs">Sin factura</span>}</div>
                        {item.proyecto && <div className="text-xs text-muted-foreground font-sans">{item.proyecto.codigo}</div>}
                      </TableCell>
                      <TableCell className="text-sm max-w-[180px]">
                        <div className="font-medium truncate">{item.proveedor?.nombre}</div>
                        {item.proveedor?.ruc && <div className="text-xs text-muted-foreground">{item.proveedor.ruc}</div>}
                      </TableCell>
                      <TableCell className="text-xs font-mono text-muted-foreground">{item.ordenCompra?.numero || <span className="text-gray-300">—</span>}</TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        <div>{formatCurrency(item.monto, item.moneda)}</div>
                        {item.montoPagado > 0 && <div className="text-xs text-green-600">-{formatCurrency(item.montoPagado, item.moneda)}</div>}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {formatCurrency(item.saldoPendiente, item.moneda)}
                      </TableCell>
                      <TableCell className="text-xs">
                        <div className="text-muted-foreground">{formatDate(item.fechaRecepcion)}</div>
                        <div className={`font-medium ${vencida ? 'text-red-600' : ''}`}>
                          {formatDate(item.fechaVencimiento)}
                          {vencida && <AlertTriangle className="inline h-3 w-3 ml-1" />}
                        </div>
                        {(() => {
                          const dias = diasParaVencer(item.fechaVencimiento, item.estado)
                          if (dias === null) return null
                          if (dias < 0) return <div className="text-red-500 font-medium">vencida hace {Math.abs(dias)}d</div>
                          if (dias === 0) return <div className="text-orange-500 font-medium">vence hoy</div>
                          if (dias <= 7) return <div className="text-orange-400">en {dias}d</div>
                          if (dias <= 30) return <div className="text-muted-foreground">en {dias}d</div>
                          return null
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getEstadoColor(item.estado)} text-xs`}>
                          {ESTADOS_CXP.find(e => e.value === item.estado)?.label || item.estado}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setTimeout(() => setShowDetail(item), 0)}>
                              <Eye className="h-4 w-4 mr-2" /> Ver detalle
                            </DropdownMenuItem>
                            {(item.estado === 'pendiente' || item.estado === 'parcial') && (
                              <>
                                <DropdownMenuItem onClick={() => setTimeout(() => openPago(item), 0)}>
                                  <ArrowUpCircle className="h-4 w-4 mr-2" /> Registrar pago
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => setTimeout(() => handleAnular(item), 0)}>
                                  <Ban className="h-4 w-4 mr-2" /> Anular
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })
              )}
            </TableBody>
            {filtered.length > 0 && (
              <tfoot>
                <tr className="border-t bg-muted/30 text-xs font-medium">
                  <td colSpan={3} className="px-4 py-2 text-muted-foreground">{filteredTotals.count} registros</td>
                  <td className="px-4 py-2 text-right font-mono">
                    {filteredTotals.montoPEN > 0 && <div>S/ {filteredTotals.montoPEN.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>}
                    {filteredTotals.montoUSD > 0 && <div>$ {filteredTotals.montoUSD.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>}
                  </td>
                  <td className="px-4 py-2 text-right font-mono font-bold">
                    {filteredTotals.saldoPEN > 0 && <div>S/ {filteredTotals.saldoPEN.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>}
                    {filteredTotals.saldoUSD > 0 && <div>$ {filteredTotals.saldoUSD.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</div>}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </Table>
        </CardContent>
      </Card>

      {/* Dialog crear cuenta por pagar */}
      <Dialog open={showCreateDialog} onOpenChange={open => { if (!open) setShowCreateDialog(false) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onCloseAutoFocus={e => e.preventDefault()}>
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
                        const cond = ['contado', 'credito', 'adelanto'].includes(oc.condicionPago || '') ? (oc.condicionPago || 'contado') : 'contado'
                        setCreateForm(f => ({
                          ...f,
                          ordenCompraId: ocId,
                          proveedorId: oc.proveedorId,
                          monto: oc.total.toFixed(2),
                          moneda: oc.moneda,
                          proyectoId: oc.proyectoId || '',
                          condicionPago: cond,
                          formaPago: (oc as any).formaPago || '',
                          diasCredito: diasStr,
                          descripcion: f.descripcion || `OC ${oc.numero}`,
                          fechaVencimiento: calcularFechaVencimiento(f.fechaRecepcion, cond, diasStr),
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
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Condición</Label>
                <Select value={createForm.condicionPago} onValueChange={v => {
                  setCreateForm(f => ({
                    ...f,
                    condicionPago: v,
                    diasCredito: v === 'credito' ? f.diasCredito : '',
                    fechaVencimiento: calcularFechaVencimiento(f.fechaRecepcion, v, f.diasCredito),
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
              <div>
                <Label>Forma de Pago</Label>
                <Select value={createForm.formaPago || '__none__'} onValueChange={v => setCreateForm(f => ({ ...f, formaPago: v === '__none__' ? '' : v }))}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__"><span className="text-muted-foreground">— Ninguna —</span></SelectItem>
                    {FORMAS_PAGO.map(f => (
                      <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {createForm.condicionPago === 'credito' && (
                <div>
                  <Label>Días</Label>
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
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha Emisión *</Label>
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
        <DialogContent onCloseAutoFocus={e => e.preventDefault()}>
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
                <div>
                  <Label className="text-xs">N° Constancia depósito BN</Label>
                  <Input placeholder="Ej: 00123456789" value={numeroConstanciaBN} onChange={e => setNumeroConstanciaBN(e.target.value)} />
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
      <Dialog open={!!showDetail} onOpenChange={open => { if (!open) { setShowDetail(null); setEditingObs(null) } }}>
        <DialogContent className="max-w-lg" onCloseAutoFocus={e => e.preventDefault()}>
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
                <Badge variant="outline">{formatPago(showDetail.condicionPago, (showDetail as any).formaPago, showDetail.diasCredito)}</Badge>
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
                  <div className="flex justify-between"><span>Emisión</span><span>{formatDate(showDetail.fechaRecepcion)}</span></div>
                  <div className="flex justify-between items-start gap-2">
                    <span className="shrink-0">Observaciones</span>
                    {editingObs !== null ? (
                      <div className="flex flex-col gap-1 items-end flex-1">
                        <Input className="h-7 text-xs" value={editingObs} onChange={e => setEditingObs(e.target.value)} placeholder="Notas adicionales" autoFocus />
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => setEditingObs(null)}>Cancelar</Button>
                          <Button size="sm" className="h-6 px-2 text-xs" onClick={saveObservaciones}>Guardar</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-right text-sm text-muted-foreground">{showDetail.observaciones || <span className="italic text-xs text-muted-foreground/60">Sin observaciones</span>}</span>
                        <Button size="sm" variant="ghost" className="h-5 w-5 p-0 shrink-0" onClick={() => setEditingObs(showDetail.observaciones || '')}><Pencil className="h-3 w-3" /></Button>
                      </div>
                    )}
                  </div>
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
                              {p.esDetraccion && p.numeroConstanciaBN && <div className="text-xs text-amber-700 font-medium">N° Constancia BN: {p.numeroConstanciaBN}</div>}
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
            {showDetail && showDetail.estado !== 'anulada' && (
              <Button variant="destructive" size="sm" onClick={() => handleAnular(showDetail)} disabled={saving}>
                <Ban className="h-4 w-4 mr-1" />
                Anular
              </Button>
            )}
            {showDetail && (showDetail.estado === 'anulada' || (showDetail.montoPagado === 0 && showDetail.estado !== 'pagada')) && (
              <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50" onClick={() => handleEliminar(showDetail)} disabled={saving}>
                <Trash2 className="h-4 w-4 mr-1" />
                Eliminar
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

      {/* Dialog confirmación anular/eliminar */}
      <Dialog open={!!confirmDialog} onOpenChange={open => { if (!open) setConfirmDialog(null) }}>
        <DialogContent className="max-w-md" onCloseAutoFocus={e => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className={`h-5 w-5 ${confirmDialog?.tipo === 'eliminar' ? 'text-red-600' : 'text-amber-600'}`} />
              {confirmDialog?.tipo === 'anular' ? 'Anular Cuenta por Pagar' : 'Eliminar Cuenta por Pagar'}
            </DialogTitle>
            <DialogDescription>
              {confirmDialog?.cuenta.numeroFactura || 'Sin factura'} — {confirmDialog?.cuenta.proveedor?.nombre}
            </DialogDescription>
          </DialogHeader>
          {confirmDialog && (
            <div className="space-y-3 text-sm">
              <Card>
                <CardContent className="p-3 space-y-1">
                  <div className="flex justify-between"><span>Factura</span><span className="font-mono">{confirmDialog.cuenta.numeroFactura || '—'}</span></div>
                  <div className="flex justify-between"><span>Monto</span><span className="font-mono font-bold">{formatCurrency(confirmDialog.cuenta.monto, confirmDialog.cuenta.moneda)}</span></div>
                  {confirmDialog.cuenta.montoPagado > 0 && (
                    <div className="flex justify-between text-green-600"><span>Pagado</span><span className="font-mono">{formatCurrency(confirmDialog.cuenta.montoPagado, confirmDialog.cuenta.moneda)}</span></div>
                  )}
                  <div className="flex justify-between"><span>Estado actual</span>
                    <Badge className={getEstadoColor(confirmDialog.cuenta.estado)}>
                      {ESTADOS_CXP.find(e => e.value === confirmDialog.cuenta.estado)?.label || confirmDialog.cuenta.estado}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
              {confirmDialog.tipo === 'anular' ? (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 space-y-1">
                  <p className="font-medium">La cuenta pasará a estado &quot;Anulada&quot;.</p>
                  <p>No se podrán registrar más pagos. Los pagos existentes se mantendrán como historial.</p>
                  {confirmDialog.cuenta.estado === 'pagada' && (
                    <p className="font-semibold mt-2">Esta cuenta ya fue pagada en su totalidad. Al anularla podrá eliminarla después si es necesario.</p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 space-y-1">
                  <p className="font-medium">Se eliminará permanentemente esta cuenta por pagar.</p>
                  {confirmDialog.cuenta.montoPagado > 0 && (
                    <p>Se eliminarán también los <strong>{confirmDialog.cuenta.pagos?.length || 0} pago(s)</strong> registrados y sus adjuntos asociados.</p>
                  )}
                  <p className="font-semibold">Esta acción no se puede deshacer.</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDialog(null)}>Cancelar</Button>
            <Button
              variant={confirmDialog?.tipo === 'eliminar' ? 'destructive' : 'default'}
              onClick={handleConfirmAction}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {confirmDialog?.tipo === 'anular' ? (
                <><Ban className="h-4 w-4 mr-1" /> Sí, anular</>
              ) : (
                <><Trash2 className="h-4 w-4 mr-1" /> Sí, eliminar</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
