'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ArrowLeft, Loader2, CheckCircle, Send, Package, XCircle, FileDown, Building2, CreditCard, MapPin, AlertTriangle, ShoppingCart, Pencil, Clock, Receipt } from 'lucide-react'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { getOrdenCompraById, aprobarOC, enviarOC, confirmarOC, cancelarOC, deleteOrdenCompra, registrarRecepcionOC } from '@/lib/services/ordenCompra'
import OCEstadoStepper from '@/components/logistica/OCEstadoStepper'
import dynamic from 'next/dynamic'
import type { OrdenCompra } from '@/types'

const DescargarOCPDFButton = dynamic(
  () => import('@/components/pdf/OrdenCompraPDF').then(mod => mod.DescargarOCPDFButton),
  { ssr: false, loading: () => <span className="text-xs text-muted-foreground">Cargando PDF...</span> }
)

const formatCurrency = (amount: number, moneda = 'PEN') =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: moneda }).format(amount)

const formatDate = (date: string | null | undefined) =>
  date ? new Date(date).toLocaleDateString('es-PE', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'

function displayCondicionPago(condicionPago: string, diasCredito?: number | null): string {
  if (condicionPago === 'contado') return 'Contado'
  if (condicionPago === 'credito' && diasCredito) return `Crédito ${diasCredito} días`
  if (condicionPago.startsWith('credito_')) return `Crédito ${condicionPago.split('_')[1]} días`
  return condicionPago
}

const condicionLabel: Record<string, string> = {
  contado: 'Contado',
  credito_15: 'Crédito 15 días',
  credito_30: 'Crédito 30 días',
  credito_60: 'Crédito 60 días',
}

export default function OrdenCompraDetallePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const { data: session } = useSession()
  const userRole = session?.user?.role || ''
  const puedeVerCxP = ['admin', 'gerente', 'socio', 'administracion'].includes(userRole)
  const [oc, setOC] = useState<OrdenCompra | null>(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [showCancel, setShowCancel] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [recepcion, setRecepcion] = useState<Record<string, number>>({})
  const [editingRecepcion, setEditingRecepcion] = useState(false)
  const [showFacturaModal, setShowFacturaModal] = useState(false)
  const [facturaForm, setFacturaForm] = useState({
    numeroFactura: '',
    monto: '',
    moneda: 'PEN',
    fechaRecepcion: new Date().toISOString().split('T')[0],
    fechaVencimiento: '',
    condicionPago: 'contado',
    diasCredito: '',
    observaciones: '',
  })
  const [savingFactura, setSavingFactura] = useState(false)
  const [inlineEdit, setInlineEdit] = useState<{ itemId: string; field: 'precioUnitario' | 'cantidad'; value: string } | null>(null)
  const [savingInline, setSavingInline] = useState(false)

  const esBorrador = oc?.estado === 'borrador'

  useEffect(() => { loadData() }, [id])

  const loadData = async () => {
    try {
      setLoading(true)
      const data = await getOrdenCompraById(id)
      setOC(data)
    } catch {
      toast.error('Error al cargar la orden de compra')
    } finally {
      setLoading(false)
    }
  }

  const startInlineEdit = (itemId: string, field: 'precioUnitario' | 'cantidad', currentValue: number) => {
    if (!esBorrador) return
    setInlineEdit({ itemId, field, value: String(currentValue) })
  }

  const saveInlineEdit = async () => {
    if (!inlineEdit || !oc) return
    const numVal = parseFloat(inlineEdit.value)
    if (isNaN(numVal) || (inlineEdit.field === 'cantidad' && numVal <= 0) || (inlineEdit.field === 'precioUnitario' && numVal < 0)) {
      toast.error(inlineEdit.field === 'cantidad' ? 'Cantidad debe ser mayor a 0' : 'Precio no puede ser negativo')
      return
    }
    setSavingInline(true)
    try {
      const res = await fetch(`/api/orden-compra-item/${inlineEdit.itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [inlineEdit.field]: numVal }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar')
      }
      setInlineEdit(null)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar')
    } finally {
      setSavingInline(false)
    }
  }

  const cancelInlineEdit = () => setInlineEdit(null)

  const handleAction = async (action: string, fn: () => Promise<any>) => {
    try {
      setActionLoading(action)
      const updated = await fn()
      setOC(updated)
      toast.success(`OC ${action} exitosamente`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Error al ${action}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async () => {
    if (!oc) return
    try {
      await deleteOrdenCompra(oc.id)
      toast.success(`OC ${oc.numero} eliminada`)
      router.push('/logistica/ordenes-compra')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al eliminar')
    }
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

  const abrirModalFactura = () => {
    if (!oc) return
    const dias = oc.diasCredito ? String(oc.diasCredito) :
      oc.condicionPago?.startsWith('credito_') ? oc.condicionPago.split('_')[1] : ''
    const fechaRec = new Date().toISOString().split('T')[0]
    setFacturaForm({
      numeroFactura: '',
      monto: oc.total.toFixed(2),
      moneda: oc.moneda,
      fechaRecepcion: fechaRec,
      fechaVencimiento: calcularFechaVencimiento(fechaRec, oc.condicionPago, dias),
      condicionPago: oc.condicionPago,
      diasCredito: dias,
      observaciones: '',
    })
    setShowFacturaModal(true)
  }

  const handleCrearFactura = async () => {
    if (!oc) return
    if (!facturaForm.numeroFactura.trim()) {
      toast.error('El número de factura es obligatorio')
      return
    }
    const monto = parseFloat(facturaForm.monto)
    if (isNaN(monto) || monto <= 0) {
      toast.error('El monto debe ser mayor a 0')
      return
    }
    if (!facturaForm.fechaRecepcion || !facturaForm.fechaVencimiento) {
      toast.error('Las fechas de recepción y vencimiento son requeridas')
      return
    }
    setSavingFactura(true)
    try {
      const res = await fetch('/api/administracion/cuentas-pagar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proveedorId: oc.proveedorId,
          proyectoId: oc.proyectoId || null,
          ordenCompraId: oc.id,
          numeroFactura: facturaForm.numeroFactura.trim(),
          monto,
          moneda: facturaForm.moneda,
          fechaRecepcion: facturaForm.fechaRecepcion,
          fechaVencimiento: facturaForm.fechaVencimiento,
          condicionPago: facturaForm.condicionPago,
          diasCredito: facturaForm.diasCredito ? parseInt(facturaForm.diasCredito) : null,
          descripcion: `OC ${oc.numero}`,
          observaciones: facturaForm.observaciones || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al crear')
      }
      toast.success('Factura registrada correctamente')
      setShowFacturaModal(false)
      await loadData()
    } catch (e: any) {
      toast.error(e.message || 'Error al registrar factura')
    } finally {
      setSavingFactura(false)
    }
  }

  const getEstadoCxPColor = (estado: string) => {
    const colors: Record<string, string> = {
      pendiente: 'bg-yellow-100 text-yellow-700',
      parcial: 'bg-blue-100 text-blue-700',
      pagada: 'bg-green-100 text-green-700',
      vencida: 'bg-red-100 text-red-700',
    }
    return colors[estado] || 'bg-gray-100 text-gray-700'
  }

  const CONDICIONES_PAGO = [
    { value: 'contado', label: 'Contado' },
    { value: 'credito_15', label: 'Crédito 15 días' },
    { value: 'credito_30', label: 'Crédito 30 días' },
    { value: 'credito_45', label: 'Crédito 45 días' },
    { value: 'credito_60', label: 'Crédito 60 días' },
    { value: 'credito_90', label: 'Crédito 90 días' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!oc) {
    return (
      <div className="text-center py-20 text-muted-foreground">
        Orden de compra no encontrada
      </div>
    )
  }

  const estadoColor: Record<string, string> = {
    borrador: 'bg-gray-100 text-gray-700',
    aprobada: 'bg-emerald-100 text-emerald-700',
    enviada: 'bg-blue-100 text-blue-700',
    confirmada: 'bg-purple-100 text-purple-700',
    parcial: 'bg-orange-100 text-orange-700',
    completada: 'bg-green-100 text-green-800',
    cancelada: 'bg-red-100 text-red-700',
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push('/logistica/ordenes-compra')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold font-mono">{oc.numero}</h1>
            <Badge className={`text-xs ${estadoColor[oc.estado] || ''}`}>{oc.estado}</Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            Creada {formatDate(oc.createdAt)} por {oc.solicitante?.name || oc.solicitante?.email}
          </p>
        </div>
      </div>

      {/* Stepper */}
      <Card>
        <CardContent className="py-3">
          <OCEstadoStepper estado={oc.estado} />
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        {oc.estado === 'borrador' && (
          <>
            <Button
              size="sm"
              onClick={() => handleAction('aprobada', () => aprobarOC(oc.id))}
              disabled={!!actionLoading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {actionLoading === 'aprobada' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
              Aprobar
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => setShowDelete(true)}
              disabled={!!actionLoading}
            >
              Eliminar
            </Button>
          </>
        )}
        {oc.estado === 'aprobada' && (
          <>
            <Button
              size="sm"
              onClick={() => handleAction('enviada', () => enviarOC(oc.id))}
              disabled={!!actionLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {actionLoading === 'enviada' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Send className="h-4 w-4 mr-1" />}
              Enviar al Proveedor
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowCancel(true)}
              disabled={!!actionLoading}
            >
              <XCircle className="h-4 w-4 mr-1" /> Cancelar OC
            </Button>
          </>
        )}
        {oc.estado === 'enviada' && (
          <Button
            size="sm"
            onClick={() => handleAction('confirmada', () => confirmarOC(oc.id))}
            disabled={!!actionLoading}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {actionLoading === 'confirmada' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Package className="h-4 w-4 mr-1" />}
            Confirmar OC
          </Button>
        )}
        {['confirmada', 'parcial'].includes(oc.estado) && !editingRecepcion && (
          <Button
            size="sm"
            onClick={() => {
              const initial: Record<string, number> = {}
              oc.items?.forEach(item => { initial[item.id] = item.cantidadRecibida })
              setRecepcion(initial)
              setEditingRecepcion(true)
            }}
            className="bg-teal-600 hover:bg-teal-700"
          >
            <Package className="h-4 w-4 mr-1" />
            Registrar Recepción
          </Button>
        )}
        {['enviada', 'confirmada', 'parcial', 'completada'].includes(oc.estado) && (
          <DescargarOCPDFButton oc={oc} />
        )}
      </div>

      {/* Info compacta: Proveedor + Montos */}
      <div className="bg-white border rounded-lg px-4 py-3">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-x-6 gap-y-2">
          {/* Proveedor — inline */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
            <div className="flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-gray-400" />
              <span className="font-medium">{oc.proveedor?.nombre}</span>
            </div>
            {oc.proveedor?.ruc && <span className="text-muted-foreground">RUC: {oc.proveedor.ruc}</span>}
            {oc.proveedor?.contactoNombre && <span className="text-muted-foreground">Contacto: {oc.proveedor.contactoNombre}</span>}
            {oc.proveedor?.contactoTelefono && <span className="text-muted-foreground">Tel: {oc.proveedor.contactoTelefono}</span>}
            {oc.proveedor?.banco && <span className="text-muted-foreground">Banco: {oc.proveedor.banco} | Cta: {oc.proveedor.numeroCuenta}</span>}
          </div>

          {/* Montos — compacto a la derecha */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:justify-end">
            <span className="text-muted-foreground">Subtotal: <span className="font-mono text-foreground">{formatCurrency(oc.subtotal, oc.moneda)}</span></span>
            {oc.moneda !== 'USD' && (
              <span className="text-muted-foreground">IGV: <span className="font-mono text-foreground">{formatCurrency(oc.igv, oc.moneda)}</span></span>
            )}
            <span className="font-semibold">Total: <span className="font-mono">{formatCurrency(oc.total, oc.moneda)}</span></span>
            <span className="text-muted-foreground border-l pl-4">{displayCondicionPago(oc.condicionPago, oc.diasCredito)} · {oc.moneda}</span>
            {oc.centroCosto && <span className="text-muted-foreground">CC: {oc.centroCosto.nombre}</span>}
            {oc.proyecto && <span className="text-muted-foreground">{oc.proyecto.codigo}</span>}
          </div>
        </div>
      </div>

      {/* Pedido origen + Estado de pago */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs px-1">
        {(oc as any).pedidoEquipo ? (
          <>
            <Link
              href={`/logistica/pedidos/${(oc as any).pedidoEquipo.id}`}
              className="flex items-center gap-1 text-blue-600 hover:underline font-medium"
            >
              <ShoppingCart className="h-3 w-3" />
              Pedido: {(oc as any).pedidoEquipo.codigo}
            </Link>
            {oc.proyecto && (
              <span className="text-muted-foreground">Proyecto: {oc.proyecto.codigo} — {oc.proyecto.nombre}</span>
            )}
          </>
        ) : (
          <span className="text-muted-foreground">OC manual — sin pedido vinculado</span>
        )}
        {/* Estado de facturación */}
        {(() => {
          const cxp = ((oc as any).cuentasPorPagar || [])[0]
          const content = !cxp ? (
            <span className="flex items-center gap-1 text-muted-foreground">
              <Receipt className="h-3 w-3" />
              Sin factura registrada
            </span>
          ) : cxp.numeroFactura ? (
            <span className="flex items-center gap-1">
              <Receipt className="h-3 w-3 text-gray-400" />
              <span>Factura: <strong>{cxp.numeroFactura}</strong></span>
              <span className="text-muted-foreground">—</span>
              {cxp.estado === 'pagada' ? (
                <span className="text-green-600 font-medium flex items-center gap-0.5">Pagada <CheckCircle className="h-3 w-3" /></span>
              ) : (
                <span className="text-amber-600 flex items-center gap-1">
                  Pendiente de pago
                  {cxp.saldoPendiente != null && cxp.saldoPendiente > 0 && (
                    <span className="text-[10px] bg-amber-100 px-1.5 py-0.5 rounded font-medium">
                      Saldo: {formatCurrency(cxp.saldoPendiente, cxp.moneda)}
                    </span>
                  )}
                </span>
              )}
            </span>
          ) : (
            <span className="flex items-center gap-1 text-amber-600">
              <Clock className="h-3 w-3" />
              CxP creada — factura pendiente
              {cxp.saldoPendiente != null && cxp.saldoPendiente > 0 && (
                <span className="text-[10px] bg-amber-100 px-1.5 py-0.5 rounded font-medium">
                  Saldo: {formatCurrency(cxp.saldoPendiente, cxp.moneda)}
                </span>
              )}
            </span>
          )
          return (
            <span className="border-l pl-4 flex items-center gap-1">
              {puedeVerCxP ? (
                <Link href="/administracion/cuentas-pagar" className="flex items-center gap-1 hover:underline">
                  {content}
                </Link>
              ) : content}
            </span>
          )
        })()}
      </div>

      {/* Delivery Info */}
      {(oc.lugarEntrega || oc.contactoEntrega || oc.fechaEntregaEstimada) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {oc.lugarEntrega && <div><span className="text-muted-foreground">Lugar:</span> {oc.lugarEntrega}</div>}
            {oc.contactoEntrega && <div><span className="text-muted-foreground">Contacto:</span> {oc.contactoEntrega}</div>}
            {oc.fechaEntregaEstimada && <div><span className="text-muted-foreground">Fecha estimada:</span> {formatDate(oc.fechaEntregaEstimada)}</div>}
          </CardContent>
        </Card>
      )}

      {/* Items Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Items ({oc.items?.length || 0})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">N°</TableHead>
                <TableHead className="w-[100px]">Código</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead className="w-[70px]">Unidad</TableHead>
                <TableHead className="w-[70px] text-right">Cant.</TableHead>
                <TableHead className="w-[100px] text-right">P. Unit.</TableHead>
                <TableHead className="w-[100px] text-right">Total</TableHead>
                {['confirmada', 'parcial', 'completada'].includes(oc.estado) && (
                  <TableHead className="w-[100px] text-right">Recibido</TableHead>
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {oc.items?.map((item, i) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                  <TableCell className="text-sm">{item.descripcion}</TableCell>
                  <TableCell className="text-xs">{item.unidad}</TableCell>
                  <TableCell className="text-right">
                    {inlineEdit?.itemId === item.id && inlineEdit.field === 'cantidad' ? (
                      <Input
                        type="number"
                        min={0.01}
                        step="any"
                        autoFocus
                        value={inlineEdit.value}
                        onChange={e => setInlineEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                        onBlur={saveInlineEdit}
                        onKeyDown={e => { if (e.key === 'Enter') saveInlineEdit(); if (e.key === 'Escape') cancelInlineEdit() }}
                        disabled={savingInline}
                        className="h-7 w-20 text-xs text-right font-mono ml-auto"
                      />
                    ) : (
                      <span
                        className={`font-mono text-sm ${esBorrador ? 'cursor-pointer hover:text-blue-600 group inline-flex items-center gap-1' : ''}`}
                        onClick={() => startInlineEdit(item.id, 'cantidad', item.cantidad)}
                      >
                        {item.cantidad}
                        {esBorrador && <Pencil className="h-2.5 w-2.5 text-gray-300 group-hover:text-blue-500" />}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {inlineEdit?.itemId === item.id && inlineEdit.field === 'precioUnitario' ? (
                      <Input
                        type="number"
                        min={0}
                        step="any"
                        autoFocus
                        value={inlineEdit.value}
                        onChange={e => setInlineEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                        onBlur={saveInlineEdit}
                        onKeyDown={e => { if (e.key === 'Enter') saveInlineEdit(); if (e.key === 'Escape') cancelInlineEdit() }}
                        disabled={savingInline}
                        className="h-7 w-24 text-xs text-right font-mono ml-auto"
                      />
                    ) : (
                      <span
                        className={`font-mono text-sm ${esBorrador ? 'cursor-pointer hover:text-blue-600 group inline-flex items-center gap-1' : ''}`}
                        onClick={() => startInlineEdit(item.id, 'precioUnitario', item.precioUnitario)}
                      >
                        {formatCurrency(item.precioUnitario, oc.moneda)}
                        {esBorrador && <Pencil className="h-2.5 w-2.5 text-gray-300 group-hover:text-blue-500" />}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(item.costoTotal, oc.moneda)}</TableCell>
                  {['confirmada', 'parcial', 'completada'].includes(oc.estado) && (
                    <TableCell className="text-right">
                      {editingRecepcion ? (
                        <Input
                          type="number"
                          min={0}
                          max={item.cantidad}
                          step={1}
                          value={recepcion[item.id] ?? 0}
                          onChange={(e) => setRecepcion(prev => ({ ...prev, [item.id]: Math.min(parseFloat(e.target.value) || 0, item.cantidad) }))}
                          className="h-8 w-20 text-xs text-right font-mono ml-auto"
                        />
                      ) : (
                        <span className={`font-mono text-sm ${item.cantidadRecibida >= item.cantidad ? 'text-green-600 font-medium' : item.cantidadRecibida > 0 ? 'text-orange-600' : ''}`}>
                          {item.cantidadRecibida} / {item.cantidad}
                        </span>
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
        {esBorrador && (
          <div className="px-4 py-2 border-t text-[11px] text-muted-foreground flex items-center gap-1.5">
            <Pencil className="h-3 w-3" />
            Los precios y cantidades son editables mientras la OC esté en borrador. Al aprobar quedan fijos.
          </div>
        )}
      </Card>

      {/* Recepción Actions */}
      {editingRecepcion && (
        <div className="flex items-center justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditingRecepcion(false)}
            disabled={!!actionLoading}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="bg-teal-600 hover:bg-teal-700"
            disabled={!!actionLoading}
            onClick={async () => {
              const items = Object.entries(recepcion)
                .map(([itemId, cantidadRecibida]) => ({ itemId, cantidadRecibida }))
                .filter(r => r.cantidadRecibida > 0)
              if (items.length === 0) {
                toast.error('Ingresa al menos una cantidad recibida')
                return
              }
              try {
                setActionLoading('recepcion')
                const updated = await registrarRecepcionOC(oc.id, items)
                setOC(updated)
                setEditingRecepcion(false)
                toast.success('Recepción registrada exitosamente')
              } catch (error) {
                toast.error(error instanceof Error ? error.message : 'Error al registrar recepción')
              } finally {
                setActionLoading(null)
              }
            }}
          >
            {actionLoading === 'recepcion' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
            Guardar Recepción
          </Button>
        </div>
      )}

      {/* Observations */}
      {oc.observaciones && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Observaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{oc.observaciones}</p>
          </CardContent>
        </Card>
      )}

      {/* Dates Timeline */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Historial</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-1">
          <div className="flex gap-2"><span className="text-muted-foreground w-32">Emisión:</span> {formatDate(oc.fechaEmision)}</div>
          {oc.fechaAprobacion && <div className="flex gap-2"><span className="text-muted-foreground w-32">Aprobación:</span> {formatDate(oc.fechaAprobacion)} por {oc.aprobador?.name}</div>}
          {oc.fechaEnvio && <div className="flex gap-2"><span className="text-muted-foreground w-32">Envío:</span> {formatDate(oc.fechaEnvio)}</div>}
          {oc.fechaConfirmacion && <div className="flex gap-2"><span className="text-muted-foreground w-32">Confirmación:</span> {formatDate(oc.fechaConfirmacion)}</div>}
        </CardContent>
      </Card>

      {/* Facturación */}
      {['confirmada', 'parcial', 'completada'].includes(oc.estado) && (() => {
        const cxps = (oc as any).cuentasPorPagar || []
        const cxp = cxps[0]

        if (cxp) {
          return (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Facturación
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="font-medium">Factura registrada</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>N° Factura: <strong>{cxp.numeroFactura || '—'}</strong></div>
                  <div>Monto: <strong>{formatCurrency(cxp.monto, cxp.moneda)}</strong></div>
                  <div className="flex items-center gap-1">Estado: <Badge className={getEstadoCxPColor(cxp.estado)}>{cxp.estado}</Badge></div>
                  <div>Vencimiento: <strong>{formatDate(cxp.fechaVencimiento)}</strong></div>
                  <div>Saldo pendiente: <strong>{formatCurrency(cxp.saldoPendiente, cxp.moneda)}</strong></div>
                </div>
                <Link href="/administracion/cuentas-pagar" className="text-xs text-blue-600 hover:underline inline-block mt-1">
                  Ver en CxP →
                </Link>
              </CardContent>
            </Card>
          )
        }

        if (!['confirmada', 'completada'].includes(oc.estado)) return null
        return (
          <Card className="border-amber-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                Esta OC no tiene factura registrada.
              </div>
              <Button size="sm" onClick={abrirModalFactura}>
                Registrar factura
              </Button>
            </CardContent>
          </Card>
        )
      })()}

      {/* Modal registrar factura */}
      <Dialog open={showFacturaModal} onOpenChange={open => { if (!open) setShowFacturaModal(false) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Factura</DialogTitle>
            <DialogDescription>Crear cuenta por pagar vinculada a OC {oc.numero}</DialogDescription>
          </DialogHeader>
          {oc && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
                <p className="font-medium text-blue-800 mb-1">Datos de la OC (referencia)</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-xs">
                  <span className="text-muted-foreground">Proveedor:</span>
                  <span className="font-medium">{oc.proveedor?.nombre}{(oc.proveedor as any)?.ruc ? ` (${(oc.proveedor as any).ruc})` : ''}</span>
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
              <div>
                <Label>N° Factura *</Label>
                <Input placeholder="F001-00123" value={facturaForm.numeroFactura} onChange={e => setFacturaForm(f => ({ ...f, numeroFactura: e.target.value }))} />
              </div>
              <div>
                <Label>Monto *</Label>
                <Input type="number" step="0.01" value={facturaForm.monto} onChange={e => setFacturaForm(f => ({ ...f, monto: e.target.value }))} />
              </div>
              <div>
                <Label>Condición de Pago</Label>
                <Select value={facturaForm.condicionPago} onValueChange={v => {
                  const diasFromCondicion = v.startsWith('credito_') ? v.split('_')[1] : ''
                  setFacturaForm(f => ({
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
              {facturaForm.condicionPago !== 'contado' && (
                <div>
                  <Label>Días de crédito</Label>
                  <Input type="number" placeholder="30" value={facturaForm.diasCredito} onChange={e => {
                    const dias = e.target.value
                    setFacturaForm(f => ({
                      ...f,
                      diasCredito: dias,
                      fechaVencimiento: calcularFechaVencimiento(f.fechaRecepcion, f.condicionPago, dias),
                    }))
                  }} />
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha Recepción *</Label>
                  <Input type="date" value={facturaForm.fechaRecepcion} onChange={e => {
                    const fecha = e.target.value
                    setFacturaForm(f => ({
                      ...f,
                      fechaRecepcion: fecha,
                      fechaVencimiento: calcularFechaVencimiento(fecha, f.condicionPago, f.diasCredito),
                    }))
                  }} />
                </div>
                <div>
                  <Label>Fecha Vencimiento *</Label>
                  <Input type="date" value={facturaForm.fechaVencimiento} onChange={e => setFacturaForm(f => ({ ...f, fechaVencimiento: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Observaciones</Label>
                <Input placeholder="Notas adicionales" value={facturaForm.observaciones} onChange={e => setFacturaForm(f => ({ ...f, observaciones: e.target.value }))} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFacturaModal(false)}>Cancelar</Button>
            <Button onClick={handleCrearFactura} disabled={savingFactura}>
              {savingFactura && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Registrar Factura
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <AlertDialog open={showCancel} onOpenChange={setShowCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Orden de Compra</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Cancelar la OC {oc.numero}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Volver</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setShowCancel(false); handleAction('cancelada', () => cancelarOC(oc.id)) }}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Confirmar Cancelación
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Orden de Compra</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Eliminar la OC {oc.numero}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 text-white">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
