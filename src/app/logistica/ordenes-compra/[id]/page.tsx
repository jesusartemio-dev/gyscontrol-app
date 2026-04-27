'use client'

import React, { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { ArrowLeft, Loader2, CheckCircle, CheckCircle2, Send, Package, XCircle, FileDown, Building2, CreditCard, MapPin, AlertTriangle, ShoppingCart, Pencil, Clock, Receipt, Trash2, Plus, Search, Info, Settings2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { getOrdenCompraById, aprobarOC, enviarOC, confirmarOC, cancelarOC, deleteOrdenCompra, registrarRecepcionOC, completarOC } from '@/lib/services/ordenCompra'
import OCEstadoStepper from '@/components/logistica/OCEstadoStepper'
import { RollbackButton } from '@/components/RollbackButton'
import { useDeleteWithValidation } from '@/hooks/useDeleteWithValidation'
import { DeleteWithValidationDialog } from '@/components/DeleteWithValidationDialog'
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

const FORMAS_PAGO = [
  { value: 'contado', label: 'Contado' },
  { value: 'factura', label: 'Factura' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'letra', label: 'Letra' },
  { value: 'adelanto', label: 'Adelanto' },
  { value: 'otro', label: 'Otro...' },
]

const DIAS_PAGO = [
  { value: '7', label: '7 días' },
  { value: '15', label: '15 días' },
  { value: '30', label: '30 días' },
  { value: '45', label: '45 días' },
  { value: '60', label: '60 días' },
  { value: 'otro', label: 'Otro...' },
]

function parseCondicionPago(condicionPago: string): { formaPago: string; diasPago: string; formaPagoCustom: string; diasPagoCustom: string } {
  const lower = condicionPago.toLowerCase()
  // Legacy formats
  if (lower === 'contado') return { formaPago: 'contado', diasPago: '', formaPagoCustom: '', diasPagoCustom: '' }
  if (lower === 'adelanto' || lower.startsWith('adelanto')) return { formaPago: 'adelanto', diasPago: '', formaPagoCustom: '', diasPagoCustom: '' }
  if (lower === 'credito' || lower.startsWith('credito_')) return { formaPago: 'factura', diasPago: '', formaPagoCustom: '', diasPagoCustom: '' }

  // Parse "Forma X días" pattern
  const match = condicionPago.match(/^(Factura|Cheque|Letra)\s+(\d+)\s+días?$/i)
  if (match) {
    const forma = match[1].toLowerCase()
    const dias = match[2]
    const knownDias = DIAS_PAGO.find(d => d.value === dias)
    return {
      formaPago: forma,
      diasPago: knownDias ? dias : 'otro',
      formaPagoCustom: '',
      diasPagoCustom: knownDias ? '' : dias,
    }
  }

  // Fallback: treat as custom
  return { formaPago: 'otro', diasPago: '', formaPagoCustom: condicionPago, diasPagoCustom: '' }
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
  const [recepcion, setRecepcion] = useState<Record<string, number>>({})
  const [editingRecepcion, setEditingRecepcion] = useState(false)
  const [showFacturaModal, setShowFacturaModal] = useState(false)
  const [facturaForm, setFacturaForm] = useState({
    numeroFactura: '',
    monto: '',
    moneda: 'PEN',
    fechaRecepcion: new Date().toISOString().split('T')[0],
    fechaVencimiento: '',
    formaPago: 'contado',
    diasPago: '',
    diasPagoCustom: '',
    formaPagoCustom: '',
    observaciones: '',
  })
  const [savingFactura, setSavingFactura] = useState(false)
  // Edit item modal state
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editItemId, setEditItemId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ codigo: '', descripcion: '', unidad: '', cantidad: 1, precioUnitario: 0, descuento: 0 })
  const [savingEdit, setSavingEdit] = useState(false)

  // Add/delete item state
  const [catalogoOpen, setCatalogoOpen] = useState(false)
  const [catalogoQuery, setCatalogoQuery] = useState('')
  const [catalogoResults, setCatalogoResults] = useState<{ id: string; codigo: string; descripcion: string; marca: string; precioLogistica: number | null; precioReal: number | null; precioInterno: number; unidad: { nombre: string } }[]>([])
  const [catalogoLoading, setCatalogoLoading] = useState(false)
  const [catalogoSelectedIds, setCatalogoSelectedIds] = useState<Set<string>>(new Set())
  const [catalogoCantidades, setCatalogoCantidades] = useState<Record<string, number>>({})
  const [addingItems, setAddingItems] = useState(false)
  const [showAddManual, setShowAddManual] = useState(false)
  const [manualItem, setManualItem] = useState({ descripcion: '', unidad: 'UND', cantidad: 1, precioUnitario: 0, descuento: 0 })

  // Header edit modal state
  const [headerEditOpen, setHeaderEditOpen] = useState(false)
  const [headerForm, setHeaderForm] = useState({
    formaPago: 'contado',
    diasPago: '',
    diasPagoCustom: '',
    formaPagoCustom: '',
    moneda: 'PEN',
    lugarEntrega: '',
    tiempoEntrega: '',
    contactoEntrega: '',
    observaciones: '',
    requiereRecepcion: true,
  })
  const [savingHeader, setSavingHeader] = useState(false)

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

  const openHeaderEdit = () => {
    if (!oc || !esBorrador) return
    const parsed = parseCondicionPago(oc.condicionPago || 'contado')
    setHeaderForm({
      ...parsed,
      moneda: oc.moneda,
      lugarEntrega: oc.lugarEntrega || '',
      tiempoEntrega: oc.tiempoEntrega || '',
      contactoEntrega: oc.contactoEntrega || '',
      observaciones: oc.observaciones || '',
      requiereRecepcion: oc.requiereRecepcion,
    })
    setHeaderEditOpen(true)
  }

  const saveHeaderEdit = async () => {
    if (!oc) return
    setSavingHeader(true)
    try {
      const res = await fetch(`/api/orden-compra/${oc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          condicionPago: (() => {
            const { formaPago, diasPago, diasPagoCustom, formaPagoCustom } = headerForm
            if (formaPago === 'otro') return formaPagoCustom || null
            if (formaPago === 'contado') return 'Contado'
            if (formaPago === 'adelanto') return 'Adelanto'
            const forma = FORMAS_PAGO.find(f => f.value === formaPago)?.label || formaPago
            const dias = diasPago === 'otro' ? diasPagoCustom : diasPago
            return dias ? `${forma} ${dias} días` : forma
          })(),
          moneda: headerForm.moneda,
          lugarEntrega: headerForm.lugarEntrega || null,
          tiempoEntrega: headerForm.tiempoEntrega || null,
          contactoEntrega: headerForm.contactoEntrega || null,
          observaciones: headerForm.observaciones || null,
          requiereRecepcion: headerForm.requiereRecepcion,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar')
      }
      toast.success('Condiciones actualizadas')
      setHeaderEditOpen(false)
      loadData()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Error al guardar')
    } finally {
      setSavingHeader(false)
    }
  }

  const openEditItem = (item: { id: string; codigo: string; descripcion: string; unidad: string; cantidad: number; precioUnitario: number; descuento?: number }) => {
    if (!esBorrador) return
    setEditItemId(item.id)
    setEditForm({
      codigo: item.codigo,
      descripcion: item.descripcion,
      unidad: item.unidad,
      cantidad: item.cantidad,
      precioUnitario: item.precioUnitario,
      descuento: item.descuento ?? 0,
    })
    setEditModalOpen(true)
  }

  const saveEditItem = async () => {
    if (!editItemId || !oc) return
    if (!editForm.descripcion.trim()) return toast.error('La descripción es obligatoria')
    if (editForm.cantidad <= 0) return toast.error('La cantidad debe ser mayor a 0')
    if (editForm.precioUnitario < 0) return toast.error('El precio no puede ser negativo')
    if (editForm.descuento < 0 || editForm.descuento > 100) return toast.error('El descuento debe estar entre 0 y 100')
    setSavingEdit(true)
    try {
      const res = await fetch(`/api/orden-compra-item/${editItemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al guardar')
      }
      setEditModalOpen(false)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error al actualizar')
    } finally {
      setSavingEdit(false)
    }
  }

  // ── Delete item ──────────────────────────────────────────
  const handleDeleteItem = async (itemId: string) => {
    try {
      const res = await fetch(`/api/orden-compra-item/${itemId}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al eliminar')
      }
      toast.success('Item eliminado')
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error al eliminar item')
    }
  }

  // ── Catálogo search ──────────────────────────────────────
  const catalogoTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const searchCatalogo = async (q: string) => {
    if (q.length < 2) { setCatalogoResults([]); return }
    setCatalogoLoading(true)
    try {
      const res = await fetch(`/api/catalogo-equipo/search?q=${encodeURIComponent(q)}&limit=30`)
      const data = await res.json()
      setCatalogoResults(data)
    } catch {
      setCatalogoResults([])
    } finally {
      setCatalogoLoading(false)
    }
  }

  const handleCatalogoSearch = (val: string) => {
    setCatalogoQuery(val)
    if (catalogoTimerRef.current) clearTimeout(catalogoTimerRef.current)
    catalogoTimerRef.current = setTimeout(() => searchCatalogo(val), 300)
  }

  const toggleCatalogoSelect = (id: string) => {
    setCatalogoSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else { next.add(id); if (!catalogoCantidades[id]) setCatalogoCantidades(p => ({ ...p, [id]: 1 })) }
      return next
    })
  }

  const addCatalogoItems = async () => {
    if (!oc || catalogoSelectedIds.size === 0) return
    const toAdd = catalogoResults.filter(i => catalogoSelectedIds.has(i.id))
    const items = toAdd.map(item => ({
      codigo: item.codigo,
      descripcion: item.descripcion,
      unidad: item.unidad.nombre,
      cantidad: catalogoCantidades[item.id] || 1,
      precioUnitario: item.precioLogistica || item.precioReal || item.precioInterno || 0,
    }))
    setAddingItems(true)
    try {
      const res = await fetch('/api/orden-compra-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordenCompraId: oc.id, items }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error') }
      toast.success(`${items.length} item(s) agregados`)
      setCatalogoOpen(false)
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error al agregar items')
    } finally {
      setAddingItems(false)
    }
  }

  const addManualItemToOC = async () => {
    if (!oc) return
    if (!manualItem.descripcion.trim()) return toast.error('La descripción es obligatoria')
    if (manualItem.cantidad <= 0) return toast.error('La cantidad debe ser mayor a 0')
    if (manualItem.precioUnitario <= 0) return toast.error('El precio debe ser mayor a 0')
    setAddingItems(true)
    try {
      const res = await fetch('/api/orden-compra-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ordenCompraId: oc.id, items: [manualItem] }),
      })
      if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Error') }
      toast.success('Item agregado')
      setShowAddManual(false)
      setManualItem({ descripcion: '', unidad: 'UND', cantidad: 1, precioUnitario: 0, descuento: 0 })
      await loadData()
    } catch (err: any) {
      toast.error(err.message || 'Error al agregar item')
    } finally {
      setAddingItems(false)
    }
  }

  const handleAction = async (action: string, fn: () => Promise<any>) => {
    try {
      setActionLoading(action)
      await fn()
      await loadData()
      toast.success(`OC ${action} exitosamente`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Error al ${action}`)
    } finally {
      setActionLoading(null)
    }
  }

  const deleteValidation = useDeleteWithValidation({
    entity: 'ordenCompra',
    onConfirmDelete: async (id) => {
      await deleteOrdenCompra(id)
    },
    onSuccess: () => {
      toast.success(`OC ${oc?.numero ?? ''} eliminada`)
      router.push('/logistica/ordenes-compra')
    },
    onError: (message) => toast.error(message),
  })

  const calcularFechaVencimientoFromForm = (fechaRecepcion: string, formaPago: string, diasPago: string, diasPagoCustom: string): string => {
    if (!fechaRecepcion) return ''
    if (formaPago === 'contado' || formaPago === 'adelanto') return fechaRecepcion
    const diasStr = diasPago === 'otro' ? diasPagoCustom : diasPago
    const dias = parseInt(diasStr)
    if (isNaN(dias) || dias <= 0) return ''
    const fecha = new Date(fechaRecepcion + 'T00:00:00')
    fecha.setDate(fecha.getDate() + dias)
    return fecha.toISOString().split('T')[0]
  }

  const abrirModalFactura = () => {
    if (!oc) return
    const parsed = parseCondicionPago(oc.condicionPago || 'contado')
    const fechaRec = new Date().toISOString().split('T')[0]
    setFacturaForm({
      numeroFactura: '',
      monto: oc.total.toFixed(2),
      moneda: oc.moneda,
      fechaRecepcion: fechaRec,
      fechaVencimiento: calcularFechaVencimientoFromForm(fechaRec, parsed.formaPago, parsed.diasPago, parsed.diasPagoCustom),
      ...parsed,
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
          condicionPago: (() => {
            const { formaPago, diasPago, diasPagoCustom, formaPagoCustom } = facturaForm
            if (formaPago === 'otro') return formaPagoCustom || 'Otro'
            if (formaPago === 'contado') return 'Contado'
            if (formaPago === 'adelanto') return 'Adelanto'
            const forma = FORMAS_PAGO.find(f => f.value === formaPago)?.label || formaPago
            const dias = diasPago === 'otro' ? diasPagoCustom : diasPago
            return dias ? `${forma} ${dias} días` : forma
          })(),
          diasCredito: (() => {
            const diasStr = facturaForm.diasPago === 'otro' ? facturaForm.diasPagoCustom : facturaForm.diasPago
            const dias = parseInt(diasStr)
            return isNaN(dias) ? null : dias
          })(),
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
              onClick={() => deleteValidation.requestDelete(oc.id)}
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
            <RollbackButton
              entityType="ordenCompra"
              entityId={oc.id}
              currentEstado={oc.estado}
              targetEstado="borrador"
              targetLabel="Volver a Borrador"
              onSuccess={() => loadData()}
            />
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
          <>
            <Button
              size="sm"
              onClick={() => handleAction('confirmada', () => confirmarOC(oc.id))}
              disabled={!!actionLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {actionLoading === 'confirmada' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Package className="h-4 w-4 mr-1" />}
              Confirmar OC
            </Button>
            <RollbackButton
              entityType="ordenCompra"
              entityId={oc.id}
              currentEstado={oc.estado}
              targetEstado="aprobada"
              targetLabel="Volver a Aprobada"
              onSuccess={() => loadData()}
            />
          </>
        )}
        {['confirmada', 'parcial'].includes(oc.estado) && !editingRecepcion && (
          <>
            {oc.requiereRecepcion ? (
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
            ) : (
              <Button
                size="sm"
                onClick={() => handleAction('completada', () => completarOC(oc.id))}
                disabled={!!actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {actionLoading === 'completada' ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-1" />}
                Completar OC
              </Button>
            )}
            {['admin', 'gerente', 'coordinador_logistico'].includes(userRole) && (
              <RollbackButton
                entityType="ordenCompra"
                entityId={oc.id}
                currentEstado={oc.estado}
                targetEstado="enviada"
                targetLabel="Volver a Enviada"
                onSuccess={() => loadData()}
              />
            )}
          </>
        )}
        {['enviada', 'confirmada', 'parcial', 'completada'].includes(oc.estado) && (
          <DescargarOCPDFButton oc={oc} />
        )}
        {oc.estado === 'cancelada' && ['admin', 'gerente', 'coordinador_logistico'].includes(userRole) && (
          <RollbackButton
            entityType="ordenCompra"
            entityId={oc.id}
            currentEstado={oc.estado}
            targetEstado="borrador"
            targetLabel="Reactivar a Borrador"
            onSuccess={() => loadData()}
          />
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
            <span className="text-muted-foreground">IGV: <span className="font-mono text-foreground">{formatCurrency(oc.igv, oc.moneda)}</span></span>
            <span className="font-semibold">Total: <span className="font-mono">{formatCurrency(oc.total, oc.moneda)}</span></span>
            <span className="text-muted-foreground border-l pl-4">{displayCondicionPago(oc.condicionPago, oc.diasCredito)} · {oc.moneda}</span>
            {oc.centroCosto && <span className="text-muted-foreground">CC: {oc.centroCosto.nombre}</span>}
            {oc.proyecto && <span className="text-muted-foreground">{oc.proyecto.codigo}</span>}
            {esBorrador && (
              <button onClick={openHeaderEdit} className="p-1 rounded hover:bg-blue-50 ml-1" title="Editar condiciones">
                <Settings2 className="h-3.5 w-3.5 text-blue-500" />
              </button>
            )}
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
        {!oc.requiereRecepcion && (
          <span className="flex items-center gap-1 text-blue-600">
            <Info className="h-3 w-3" />
            Sin recepción física (servicio)
          </span>
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
      {(oc.lugarEntrega || oc.tiempoEntrega || oc.contactoEntrega || oc.fechaEntregaEstimada) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              Entrega
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-1">
            {oc.lugarEntrega && <div><span className="text-muted-foreground">Lugar:</span> {oc.lugarEntrega}</div>}
            {oc.tiempoEntrega && <div><span className="text-muted-foreground">Tiempo de entrega:</span> {oc.tiempoEntrega}</div>}
            {oc.contactoEntrega && <div><span className="text-muted-foreground">Contacto:</span> {oc.contactoEntrega}</div>}
            {oc.fechaEntregaEstimada && <div><span className="text-muted-foreground">Fecha estimada:</span> {formatDate(oc.fechaEntregaEstimada)}</div>}
          </CardContent>
        </Card>
      )}

      {/* Items Table */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">Items ({oc.items?.length || 0})</CardTitle>
          {esBorrador && (
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => { setCatalogoOpen(true); setCatalogoQuery(''); setCatalogoResults([]); setCatalogoSelectedIds(new Set()); setCatalogoCantidades({}) }}>
                <Search className="h-3.5 w-3.5 mr-1" /> Desde Catálogo
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowAddManual(true)}>
                <Plus className="h-3.5 w-3.5 mr-1" /> Item Manual
              </Button>
            </div>
          )}
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
                <TableHead className="w-[70px] text-right">Desc. %</TableHead>
                <TableHead className="w-[100px] text-right">Total</TableHead>
                {['confirmada', 'parcial', 'completada'].includes(oc.estado) && (
                  <TableHead className="w-[100px] text-right">Recibido</TableHead>
                )}
                {esBorrador && <TableHead className="w-[60px]"></TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {oc.items?.map((item, i) => (
                <TableRow key={item.id}>
                  <TableCell className="text-xs text-muted-foreground">{i + 1}</TableCell>
                  <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                  <TableCell className="text-sm">{item.descripcion}</TableCell>
                  <TableCell className="text-xs">{item.unidad}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{item.cantidad}</TableCell>
                  <TableCell className="text-right font-mono text-sm">{formatCurrency(item.precioUnitario, oc.moneda)}</TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {(item.descuento ?? 0) > 0 ? (
                      <span className="text-red-600">{Number(item.descuento).toFixed(2)}%</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
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
                  {esBorrador && (
                    <TableCell>
                      <div className="flex gap-0.5">
                        <button
                          onClick={() => openEditItem(item)}
                          className="p-1 rounded hover:bg-blue-50"
                          title="Editar item"
                        >
                          <Pencil className="h-3.5 w-3.5 text-blue-500" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1 rounded hover:bg-red-50"
                          title="Eliminar item"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        </button>
                      </div>
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
            Usa los iconos de editar/eliminar mientras la OC esté en borrador. Al aprobar quedan fijos.
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
                await registrarRecepcionOC(oc.id, items)
                await loadData()
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
        const puedeRegistrarFactura = ['admin', 'gerente', 'administracion'].includes(userRole)
        return (
          <Card className="border-amber-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-amber-700">
                <AlertTriangle className="h-4 w-4" />
                Esta OC no tiene factura registrada.
              </div>
              <Button
                size="sm"
                disabled={!puedeRegistrarFactura}
                variant={puedeRegistrarFactura ? 'default' : 'secondary'}
                onClick={() => {
                  if (!puedeRegistrarFactura) {
                    toast.error('Solo Administración puede registrar facturas')
                    return
                  }
                  abrirModalFactura()
                }}
                title={!puedeRegistrarFactura ? 'Solo Administración puede registrar facturas' : undefined}
              >
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
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Forma de Pago</Label>
                  <Select value={facturaForm.formaPago} onValueChange={v => {
                    setFacturaForm(f => {
                      const updated = { ...f, formaPago: v, diasPago: '', diasPagoCustom: '', formaPagoCustom: '' }
                      return { ...updated, fechaVencimiento: calcularFechaVencimientoFromForm(f.fechaRecepcion, v, '', '') }
                    })
                  }}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {FORMAS_PAGO.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                {facturaForm.formaPago === 'otro' && (
                  <div>
                    <Label>Especificar</Label>
                    <Input value={facturaForm.formaPagoCustom} onChange={e => setFacturaForm(f => ({ ...f, formaPagoCustom: e.target.value }))} placeholder="Ej: Transferencia 15 días" />
                  </div>
                )}
                {['factura', 'cheque', 'letra'].includes(facturaForm.formaPago) && (
                  <div>
                    <Label>Días</Label>
                    <Select value={facturaForm.diasPago} onValueChange={v => {
                      setFacturaForm(f => {
                        const updated = { ...f, diasPago: v, diasPagoCustom: v !== 'otro' ? '' : f.diasPagoCustom }
                        const dias = v === 'otro' ? f.diasPagoCustom : v
                        return { ...updated, fechaVencimiento: calcularFechaVencimientoFromForm(f.fechaRecepcion, f.formaPago, v, f.diasPagoCustom) }
                      })
                    }}>
                      <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                      <SelectContent>
                        {DIAS_PAGO.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {['factura', 'cheque', 'letra'].includes(facturaForm.formaPago) && facturaForm.diasPago === 'otro' && (
                  <div>
                    <Label>Días (personalizado)</Label>
                    <Input type="number" min={1} value={facturaForm.diasPagoCustom} onChange={e => {
                      const dias = e.target.value
                      setFacturaForm(f => ({
                        ...f,
                        diasPagoCustom: dias,
                        fechaVencimiento: calcularFechaVencimientoFromForm(f.fechaRecepcion, f.formaPago, 'otro', dias),
                      }))
                    }} placeholder="Ej: 90" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Fecha Recepción *</Label>
                  <Input type="date" value={facturaForm.fechaRecepcion} onChange={e => {
                    const fecha = e.target.value
                    setFacturaForm(f => ({
                      ...f,
                      fechaRecepcion: fecha,
                      fechaVencimiento: calcularFechaVencimientoFromForm(fecha, f.formaPago, f.diasPago, f.diasPagoCustom),
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

      {/* Delete Dialog con pre-validación de dependencias */}
      <DeleteWithValidationDialog
        open={deleteValidation.dialogOpen}
        onOpenChange={(open) => !open && deleteValidation.cancelDelete()}
        checking={deleteValidation.checking}
        deleting={deleteValidation.deleting}
        allowed={deleteValidation.canDeleteResult?.allowed ?? null}
        blockers={deleteValidation.canDeleteResult?.blockers ?? []}
        message={deleteValidation.canDeleteResult?.message ?? ''}
        onConfirm={deleteValidation.confirmDelete}
        onCancel={deleteValidation.cancelDelete}
        entityLabel="orden de compra"
      />

      {/* ── Catálogo Selector Dialog ────────────────────────── */}
      <Dialog open={catalogoOpen} onOpenChange={setCatalogoOpen}>
        <DialogContent className="max-w-4xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Buscar en catálogo de equipos</DialogTitle>
            <DialogDescription>Busca y selecciona items para agregar a la OC</DialogDescription>
          </DialogHeader>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={catalogoQuery}
              onChange={e => handleCatalogoSearch(e.target.value)}
              placeholder="Buscar por código o descripción... (mín. 2 caracteres)"
              className="pl-9"
              autoFocus
            />
          </div>

          <div className="flex-1 overflow-auto min-h-0">
            {catalogoLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : catalogoQuery.length < 2 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                Escribe al menos 2 caracteres para buscar
              </div>
            ) : catalogoResults.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground text-sm">
                No se encontraron items para &quot;{catalogoQuery}&quot;
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]"></TableHead>
                    <TableHead className="w-[140px]">Código</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead className="w-[80px]">Marca</TableHead>
                    <TableHead className="w-[60px]">Unid.</TableHead>
                    <TableHead className="w-[100px] text-right">Precio</TableHead>
                    <TableHead className="w-[80px] text-right">Cant.</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalogoResults.map(item => {
                    const isSelected = catalogoSelectedIds.has(item.id)
                    const precio = item.precioLogistica || item.precioReal || item.precioInterno || 0
                    return (
                      <TableRow
                        key={item.id}
                        className={isSelected ? 'bg-blue-50' : 'cursor-pointer hover:bg-muted/50'}
                        onClick={() => toggleCatalogoSelect(item.id)}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleCatalogoSelect(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-mono text-xs">{item.codigo}</TableCell>
                        <TableCell className="text-xs">{item.descripcion}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{item.marca || '-'}</TableCell>
                        <TableCell className="text-xs">{item.unidad.nombre}</TableCell>
                        <TableCell className="text-xs text-right font-mono">
                          {precio > 0 ? `S/ ${precio.toFixed(2)}` : '-'}
                        </TableCell>
                        <TableCell className="text-right" onClick={e => e.stopPropagation()}>
                          {isSelected && (
                            <Input
                              type="number"
                              min={1}
                              value={catalogoCantidades[item.id] || 1}
                              onChange={e => setCatalogoCantidades(p => ({ ...p, [item.id]: parseInt(e.target.value) || 1 }))}
                              className="h-7 w-16 text-xs text-right"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </div>

          {catalogoSelectedIds.size > 0 && (
            <div className="text-xs text-muted-foreground">{catalogoSelectedIds.size} item(s) seleccionado(s)</div>
          )}

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => setCatalogoOpen(false)}>Cancelar</Button>
            <Button
              onClick={addCatalogoItems}
              disabled={catalogoSelectedIds.size === 0 || addingItems}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {addingItems && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Agregar {catalogoSelectedIds.size} item(s)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Manual Item Dialog ──────────────────────────── */}
      <Dialog open={showAddManual} onOpenChange={setShowAddManual}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar item manual</DialogTitle>
            <DialogDescription>Item sin catálogo (ej: fabricación, servicio)</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Descripción <span className="text-red-500">*</span></Label>
              <Input value={manualItem.descripcion} onChange={e => setManualItem(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción del item" />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Unidad</Label>
                <Input value={manualItem.unidad} onChange={e => setManualItem(p => ({ ...p, unidad: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Cantidad <span className="text-red-500">*</span></Label>
                <Input type="number" min={1} value={manualItem.cantidad} onChange={e => setManualItem(p => ({ ...p, cantidad: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label className="text-xs">P. Unit. <span className="text-red-500">*</span></Label>
                <Input type="number" min={0} step={0.01} value={manualItem.precioUnitario} onChange={e => setManualItem(p => ({ ...p, precioUnitario: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label className="text-xs">Desc. %</Label>
                <Input type="number" min={0} max={100} step={0.01} value={manualItem.descuento} onChange={e => setManualItem(p => ({ ...p, descuento: parseFloat(e.target.value) || 0 }))} placeholder="0" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddManual(false)}>Cancelar</Button>
            <Button onClick={addManualItemToOC} disabled={addingItems} className="bg-orange-600 hover:bg-orange-700">
              {addingItems && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Agregar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Header Modal ────────────────────────────────── */}
      <Dialog open={headerEditOpen} onOpenChange={setHeaderEditOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Editar Condiciones</DialogTitle>
            <DialogDescription>Modifica las condiciones de la OC mientras está en borrador</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Forma de Pago</Label>
                <Select value={headerForm.formaPago} onValueChange={v => setHeaderForm(f => ({ ...f, formaPago: v, diasPago: '', diasPagoCustom: '', formaPagoCustom: '' }))}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FORMAS_PAGO.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {headerForm.formaPago === 'otro' && (
                <div>
                  <Label className="text-xs">Especificar</Label>
                  <Input value={headerForm.formaPagoCustom} onChange={e => setHeaderForm(f => ({ ...f, formaPagoCustom: e.target.value }))} placeholder="Ej: Transferencia 15 días" className="h-9" />
                </div>
              )}
              {['factura', 'cheque', 'letra'].includes(headerForm.formaPago) && (
                <div>
                  <Label className="text-xs">Días</Label>
                  <Select value={headerForm.diasPago} onValueChange={v => setHeaderForm(f => ({ ...f, diasPago: v, diasPagoCustom: v !== 'otro' ? '' : f.diasPagoCustom }))}>
                    <SelectTrigger className="h-9"><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                    <SelectContent>
                      {DIAS_PAGO.map(d => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {['factura', 'cheque', 'letra'].includes(headerForm.formaPago) && headerForm.diasPago === 'otro' && (
                <div>
                  <Label className="text-xs">Días (personalizado)</Label>
                  <Input type="number" min={1} value={headerForm.diasPagoCustom} onChange={e => setHeaderForm(f => ({ ...f, diasPagoCustom: e.target.value }))} placeholder="Ej: 90" className="h-9" />
                </div>
              )}
              <div>
                <Label className="text-xs">Moneda</Label>
                <Select value={headerForm.moneda} onValueChange={v => setHeaderForm(f => ({ ...f, moneda: v }))}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PEN">Soles (PEN)</SelectItem>
                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Lugar de Entrega</Label>
                <Input value={headerForm.lugarEntrega} onChange={e => setHeaderForm(f => ({ ...f, lugarEntrega: e.target.value }))} placeholder="Dirección" className="h-9" />
              </div>
              <div>
                <Label className="text-xs">Tiempo de Entrega</Label>
                <Input value={headerForm.tiempoEntrega} onChange={e => setHeaderForm(f => ({ ...f, tiempoEntrega: e.target.value }))} placeholder="Ej: 7 días, inmediato, stock" className="h-9" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Contacto de Entrega</Label>
                <Input value={headerForm.contactoEntrega} onChange={e => setHeaderForm(f => ({ ...f, contactoEntrega: e.target.value }))} placeholder="Nombre / teléfono" className="h-9" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Observaciones</Label>
              <Textarea value={headerForm.observaciones} onChange={e => setHeaderForm(f => ({ ...f, observaciones: e.target.value }))} placeholder="Notas adicionales..." rows={2} />
            </div>
            <div className="flex items-start gap-3 p-3 rounded-md border bg-muted/30">
              <Switch
                id="headerRequiereRecepcion"
                checked={headerForm.requiereRecepcion}
                onCheckedChange={v => setHeaderForm(f => ({ ...f, requiereRecepcion: v }))}
              />
              <div className="space-y-0.5">
                <Label htmlFor="headerRequiereRecepcion" className="text-sm font-medium cursor-pointer">
                  Requiere recepción física
                </Label>
                <p className="text-xs text-muted-foreground flex items-start gap-1">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  {headerForm.requiereRecepcion
                    ? 'Se registrará la recepción de materiales o entregables antes de completar la OC.'
                    : 'Para servicios sin entregable físico (transporte, alquiler, etc.). La OC se completa directamente al confirmar.'}
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHeaderEditOpen(false)}>Cancelar</Button>
            <Button onClick={saveHeaderEdit} disabled={savingHeader} className="bg-orange-600 hover:bg-orange-700">
              {savingHeader && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Item Modal ─────────────────────────────────── */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Item</DialogTitle>
            <DialogDescription>Modifica los datos del item</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs">Código</Label>
              <Input value={editForm.codigo} onChange={e => setEditForm(p => ({ ...p, codigo: e.target.value }))} placeholder="Código (opcional)" />
            </div>
            <div>
              <Label className="text-xs">Descripción <span className="text-red-500">*</span></Label>
              <Input value={editForm.descripcion} onChange={e => setEditForm(p => ({ ...p, descripcion: e.target.value }))} placeholder="Descripción del item" autoFocus />
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <Label className="text-xs">Unidad</Label>
                <Input value={editForm.unidad} onChange={e => setEditForm(p => ({ ...p, unidad: e.target.value }))} />
              </div>
              <div>
                <Label className="text-xs">Cantidad <span className="text-red-500">*</span></Label>
                <Input type="number" min={0.01} step="any" value={editForm.cantidad} onChange={e => setEditForm(p => ({ ...p, cantidad: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label className="text-xs">P. Unit. <span className="text-red-500">*</span></Label>
                <Input type="number" min={0} step={0.01} value={editForm.precioUnitario} onChange={e => setEditForm(p => ({ ...p, precioUnitario: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div>
                <Label className="text-xs">Desc. %</Label>
                <Input type="number" min={0} max={100} step={0.01} value={editForm.descuento} onChange={e => setEditForm(p => ({ ...p, descuento: parseFloat(e.target.value) || 0 }))} placeholder="0" />
              </div>
            </div>
            {(editForm.precioUnitario > 0 && editForm.cantidad > 0) && (
              <div className="text-[11px] text-muted-foreground bg-muted/50 px-3 py-2 rounded">
                Subtotal: <span className="font-mono">{(editForm.precioUnitario * editForm.cantidad).toFixed(2)}</span>
                {editForm.descuento > 0 && (
                  <>
                    {' · '}Descuento ({editForm.descuento}%):{' '}
                    <span className="font-mono text-red-600">-{(editForm.precioUnitario * editForm.cantidad * editForm.descuento / 100).toFixed(2)}</span>
                  </>
                )}
                {' · '}<strong>Neto: <span className="font-mono">{(editForm.precioUnitario * editForm.cantidad * (1 - editForm.descuento / 100)).toFixed(2)}</span></strong>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModalOpen(false)}>Cancelar</Button>
            <Button onClick={saveEditItem} disabled={savingEdit} className="bg-orange-600 hover:bg-orange-700">
              {savingEdit && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
