'use client'

import { useEffect, useState } from 'react'
import { notFound, useRouter } from 'next/navigation'
import Link from 'next/link'
import { getCotizacionProveedorById } from '@/lib/services/cotizacionProveedor'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  Building2,
  FileText,
  Package,
  Mail,
  Plus,
  ChevronRight,
  ChevronDown,
  History,
  CheckCircle2,
  ScanSearch,
  UserPlus,
  DollarSign,
  CreditCard,
  MapPin,
  Truck,
  Phone,
  NotebookText,
  Pencil,
  Check,
  X,
} from 'lucide-react'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import type { CotizacionProveedor } from '@/types'
import CotizacionProveedorHistorial from '@/components/logistica/CotizacionProveedorHistorial'
import CotizacionEstadoFlujoBanner from '@/components/logistica/CotizacionEstadoFlujoBanner'
import CotizacionProveedorTabla from '@/components/logistica/CotizacionProveedorTabla'
import ModalAgregarItemCotizacionProveedor from '@/components/logistica/ModalAgregarItemCotizacionProveedor'
import ModalSeleccionarCotizacionCompleta from '@/components/logistica/ModalSeleccionarCotizacionCompleta'
import ModalEscanearCotizacionPDF from '@/components/logistica/ModalEscanearCotizacionPDF'
import ModalSolicitarOtroProveedor from '@/components/logistica/ModalSolicitarOtroProveedor'

interface PageProps {
  params: Promise<{ id: string }>
}

export default function CotizacionProveedorDetailPage({ params }: PageProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [cotizacion, setCotizacion] = useState<CotizacionProveedor | null>(null)
  const [loading, setLoading] = useState(true)
  const [cotizacionId, setCotizacionId] = useState('')
  const [showAgregarItems, setShowAgregarItems] = useState(false)
  const [showSeleccionarCompleta, setShowSeleccionarCompleta] = useState(false)
  const [showHistorial, setShowHistorial] = useState(false)
  const [showScanPdf, setShowScanPdf] = useState(false)
  const [showSolicitarOtro, setShowSolicitarOtro] = useState(false)
  const [savingMoneda, setSavingMoneda] = useState(false)
  const [editingCondiciones, setEditingCondiciones] = useState(false)
  const [condicionesForm, setCondicionesForm] = useState({
    condicionPago: '',
    diasCredito: '',
    lugarEntrega: '',
    tiempoEntrega: '',
    contactoEntrega: '',
    observaciones: '',
  })

  useEffect(() => {
    params.then((p) => setCotizacionId(p.id))
  }, [params])

  useEffect(() => {
    if (!cotizacionId) return

    const fetchData = async () => {
      try {
        const data = await getCotizacionProveedorById(cotizacionId)
        if (!data) {
          notFound()
          return
        }
        setCotizacion(data)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [cotizacionId])

  const handleRefresh = async () => {
    if (!cotizacionId) return
    try {
      const updated = await getCotizacionProveedorById(cotizacionId)
      if (updated) setCotizacion(updated)
    } catch (error) {
      console.error('Error:', error)
    }
  }

  const handleSolicitarCotizacion = () => {
    if (!cotizacion?.proveedor?.correo) {
      toast.error('El proveedor no tiene correo')
      return
    }

    const subject = `Solicitud de Cotización - ${cotizacion.codigo}`
    const itemsList = cotizacion.items?.map(item =>
      `• ${item.descripcion} (${item.codigo}) - ${item.cantidad} ${item.unidad}`
    ).join('\n') || ''

    const body = `Estimado ${cotizacion.proveedor.nombre},

Solicitamos cotización para:

${itemsList}

Proyecto: ${cotizacion.proyecto?.codigo} - ${cotizacion.proyecto?.nombre}
Cotización: ${cotizacion.codigo}

Saludos,
Equipo de Compras`

    const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(cotizacion.proveedor.correo)}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.open(gmailUrl, '_blank')
  }

  const handleMonedaChange = async (field: 'moneda' | 'tipoCambio', value: string | number | null) => {
    if (!cotizacion) return
    const patch: Record<string, any> = { [field]: value }
    if (field === 'moneda' && value === 'USD') patch.tipoCambio = null
    setCotizacion(prev => prev ? { ...prev, ...patch } : null)
    try {
      setSavingMoneda(true)
      await fetch(`/api/cotizacion-proveedor/${cotizacionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
    } catch {
      toast.error('Error al guardar moneda')
    } finally {
      setSavingMoneda(false)
    }
  }

  const handleTipoCambioChange = (value: string) => {
    const v = value === '' ? null : parseFloat(value)
    setCotizacion(prev => prev ? { ...prev, tipoCambio: v } : null)
  }

  const handleEditCondiciones = () => {
    if (!cotizacion) return
    setCondicionesForm({
      condicionPago: cotizacion.condicionPago || '',
      diasCredito: cotizacion.diasCredito?.toString() || '',
      lugarEntrega: cotizacion.lugarEntrega || '',
      tiempoEntrega: cotizacion.tiempoEntrega || '',
      contactoEntrega: cotizacion.contactoEntrega || '',
      observaciones: cotizacion.observaciones || '',
    })
    setEditingCondiciones(true)
  }

  const handleSaveCondiciones = async () => {
    if (!cotizacion) return
    const patch = {
      condicionPago: condicionesForm.condicionPago || null,
      diasCredito: condicionesForm.diasCredito ? parseInt(condicionesForm.diasCredito) : null,
      lugarEntrega: condicionesForm.lugarEntrega || null,
      tiempoEntrega: condicionesForm.tiempoEntrega || null,
      contactoEntrega: condicionesForm.contactoEntrega || null,
      observaciones: condicionesForm.observaciones || null,
    }
    try {
      await fetch(`/api/cotizacion-proveedor/${cotizacionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      setCotizacion(prev => prev ? { ...prev, ...patch } : null)
      setEditingCondiciones(false)
      toast.success('Condiciones guardadas')
    } catch {
      toast.error('Error al guardar condiciones')
    }
  }

  const getEstadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      pendiente: 'bg-gray-100 text-gray-700',
      solicitado: 'bg-blue-100 text-blue-700',
      cotizado: 'bg-purple-100 text-purple-700',
      seleccionado: 'bg-green-100 text-green-700',
      rechazado: 'bg-red-100 text-red-700',
    }
    return styles[estado] || 'bg-gray-100 text-gray-700'
  }

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!cotizacion) notFound()

  const stats = {
    totalItems: cotizacion.items?.length || 0,
    totalCost: cotizacion.items?.reduce((sum, item) => {
      const precio = item.precioUnitario || 0
      const cantidad = item.cantidad ?? item.cantidadOriginal ?? 0
      return sum + (item.costoTotal || precio * cantidad)
    }, 0) || 0,
    selectedItems: cotizacion.items?.filter(item => item.esSeleccionada).length || 0,
    itemsSinPrecio: cotizacion.items?.filter(item => !item.precioUnitario).length || 0,
  }

  const estado = cotizacion.estado || 'pendiente'
  const esEstadoFinal = estado === 'rechazado'

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Link href="/logistica" className="hover:text-foreground">Logística</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/logistica/cotizaciones" className="hover:text-foreground">Cotizaciones</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{cotizacion.codigo}</span>
          </div>

          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => router.back()}>
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <FileText className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-semibold">{cotizacion.codigo}</h1>
                    <Badge className={`text-[10px] h-5 ${getEstadoBadge(estado)}`}>
                      {estado}
                    </Badge>
                    {stats.totalItems > 0 && stats.selectedItems > 0 && (
                      <Badge
                        variant="outline"
                        className={`text-[10px] h-5 px-1.5 ${
                          stats.selectedItems === stats.totalItems
                            ? 'border-green-300 bg-green-50 text-green-700'
                            : 'border-amber-300 bg-amber-50 text-amber-700'
                        }`}
                      >
                        <CheckCircle2 className="h-2.5 w-2.5 mr-0.5" />
                        {stats.selectedItems === stats.totalItems
                          ? 'Selección completa'
                          : `${stats.selectedItems}/${stats.totalItems} seleccionados`
                        }
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Building2 className="h-3 w-3" />
                    <span>{cotizacion.proveedor?.nombre || 'Sin proveedor'}</span>
                    <span>·</span>
                    <span>{cotizacion.proyecto?.nombre}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!esEstadoFinal && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAgregarItems(true)}
                  className="h-7 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Items
                </Button>
              )}
              {!esEstadoFinal && stats.totalItems > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowScanPdf(true)}
                  className="h-7 text-xs"
                >
                  <ScanSearch className="h-3 w-3 mr-1" />
                  Escanear PDF
                </Button>
              )}
              {stats.totalItems > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowSolicitarOtro(true)}
                  className="h-7 text-xs"
                >
                  <UserPlus className="h-3 w-3 mr-1" />
                  Otro proveedor
                </Button>
              )}
              {(estado === 'cotizado' || estado === 'seleccionado') && stats.totalItems > 0 && (
                <Button
                  size="sm"
                  onClick={() => setShowSeleccionarCompleta(true)}
                  className="h-7 text-xs bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Seleccionar
                </Button>
              )}
              {(estado === 'pendiente' || estado === 'solicitado') && cotizacion.proveedor?.correo && (
                <Button
                  size="sm"
                  onClick={handleSolicitarCotizacion}
                  className="h-7 text-xs bg-blue-600 hover:bg-blue-700"
                >
                  <Mail className="h-3 w-3 mr-1" />
                  Solicitar
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Stats inline */}
        <div className="px-4 py-1.5 border-t bg-gray-50/50 flex items-center gap-6 text-xs flex-wrap">
          <div className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Items:</span>
            <span className="font-semibold">{stats.totalItems}</span>
          </div>

          {/* Moneda + Tipo de cambio */}
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <Select
              value={cotizacion.moneda || 'USD'}
              onValueChange={(v) => handleMonedaChange('moneda', v)}
              disabled={savingMoneda}
            >
              <SelectTrigger className="h-6 w-20 text-xs border-dashed">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD $</SelectItem>
                <SelectItem value="PEN">PEN S/</SelectItem>
              </SelectContent>
            </Select>
            {cotizacion.moneda === 'PEN' && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">TC:</span>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={cotizacion.tipoCambio ?? ''}
                  onChange={(e) => handleTipoCambioChange(e.target.value)}
                  onBlur={(e) => {
                    const v = e.target.value === '' ? null : parseFloat(e.target.value)
                    handleMonedaChange('tipoCambio', v)
                  }}
                  placeholder="3.75"
                  className="h-6 w-20 text-xs"
                  disabled={savingMoneda}
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Total:</span>
            <span className="font-semibold">
              {cotizacion.moneda === 'PEN' ? 'S/' : '$'}{stats.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </span>
            {cotizacion.moneda === 'PEN' && cotizacion.tipoCambio && cotizacion.tipoCambio > 0 && (
              <span className="text-muted-foreground">
                ≈ ${(stats.totalCost / cotizacion.tipoCambio).toLocaleString('en-US', { minimumFractionDigits: 2 })} USD
              </span>
            )}
            {cotizacion.moneda === 'USD' && cotizacion.tipoCambio && cotizacion.tipoCambio > 0 && (
              <span className="text-muted-foreground">
                ≈ S/{(stats.totalCost * cotizacion.tipoCambio).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-muted-foreground">Selección:</span>
            <span className={`font-semibold ${
              stats.selectedItems === stats.totalItems && stats.totalItems > 0
                ? 'text-green-600'
                : stats.selectedItems > 0
                ? 'text-amber-600'
                : 'text-muted-foreground'
            }`}>
              {stats.selectedItems}/{stats.totalItems}
            </span>
          </div>
          {stats.itemsSinPrecio > 0 && (
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">Sin precio:</span>
              <span className="font-semibold text-amber-600">{stats.itemsSinPrecio}</span>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 space-y-3">
        {/* Condiciones Comerciales */}
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-2.5 flex items-center justify-between border-b">
            <div className="flex items-center gap-2">
              <CreditCard className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-600">Condiciones Comerciales</span>
            </div>
            {!editingCondiciones ? (
              <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-gray-500" onClick={handleEditCondiciones}>
                <Pencil className="h-3 w-3 mr-1" />Editar
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-green-600" onClick={handleSaveCondiciones}>
                  <Check className="h-3 w-3 mr-1" />Guardar
                </Button>
                <Button variant="ghost" size="sm" className="h-6 px-2 text-xs text-gray-500" onClick={() => setEditingCondiciones(false)}>
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
          <div className="px-4 py-3">
            {!editingCondiciones ? (
              <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-3 w-3 text-gray-400 shrink-0" />
                  <span className="text-gray-500">Pago:</span>
                  <span className="font-medium">
                    {cotizacion.condicionPago
                      ? `${cotizacion.condicionPago}${cotizacion.diasCredito ? ` (${cotizacion.diasCredito} días)` : ''}`
                      : <span className="text-gray-400 italic">No especificado</span>}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="h-3 w-3 text-gray-400 shrink-0" />
                  <span className="text-gray-500">Entrega:</span>
                  <span className="font-medium">{cotizacion.tiempoEntrega || <span className="text-gray-400 italic">No especificado</span>}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-3 w-3 text-gray-400 shrink-0" />
                  <span className="text-gray-500">Lugar:</span>
                  <span className="font-medium">{cotizacion.lugarEntrega || <span className="text-gray-400 italic">No especificado</span>}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="h-3 w-3 text-gray-400 shrink-0" />
                  <span className="text-gray-500">Contacto:</span>
                  <span className="font-medium">{cotizacion.contactoEntrega || <span className="text-gray-400 italic">No especificado</span>}</span>
                </div>
                {cotizacion.observaciones && (
                  <div className="col-span-2 flex items-start gap-2">
                    <NotebookText className="h-3 w-3 text-gray-400 shrink-0 mt-0.5" />
                    <span className="text-gray-500">Obs:</span>
                    <span className="font-medium">{cotizacion.observaciones}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Condición de pago</label>
                  <select
                    className="w-full h-7 text-xs border rounded px-2 bg-white"
                    value={condicionesForm.condicionPago}
                    onChange={(e) => setCondicionesForm(p => ({ ...p, condicionPago: e.target.value }))}
                  >
                    <option value="">Sin especificar</option>
                    <option value="contado">Contado</option>
                    <option value="factura">Factura</option>
                    <option value="cheque">Cheque</option>
                    <option value="letra">Letra</option>
                    <option value="adelanto">Adelanto</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Días de crédito</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="Ej: 30"
                    className="h-7 text-xs"
                    value={condicionesForm.diasCredito}
                    onChange={(e) => setCondicionesForm(p => ({ ...p, diasCredito: e.target.value }))}
                    disabled={!condicionesForm.condicionPago || condicionesForm.condicionPago === 'contado'}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Tiempo de entrega</label>
                  <Input
                    placeholder="Ej: 15 días, Stock"
                    className="h-7 text-xs"
                    value={condicionesForm.tiempoEntrega}
                    onChange={(e) => setCondicionesForm(p => ({ ...p, tiempoEntrega: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Lugar de entrega</label>
                  <Input
                    placeholder="Ej: Almacén Lima"
                    className="h-7 text-xs"
                    value={condicionesForm.lugarEntrega}
                    onChange={(e) => setCondicionesForm(p => ({ ...p, lugarEntrega: e.target.value }))}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Contacto entrega</label>
                  <Input
                    placeholder="Nombre / teléfono"
                    className="h-7 text-xs"
                    value={condicionesForm.contactoEntrega}
                    onChange={(e) => setCondicionesForm(p => ({ ...p, contactoEntrega: e.target.value }))}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <label className="text-[10px] font-medium text-gray-500 uppercase tracking-wide">Observaciones</label>
                  <Input
                    placeholder="Notas adicionales"
                    className="h-7 text-xs"
                    value={condicionesForm.observaciones}
                    onChange={(e) => setCondicionesForm(p => ({ ...p, observaciones: e.target.value }))}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Estado flujo */}
        <CotizacionEstadoFlujoBanner
          estado={estado}
          cotizacionId={cotizacionId}
          cotizacionNombre={cotizacion.codigo}
          usuarioId={session?.user?.id}
          onUpdated={(nuevoEstado: string) => {
            setCotizacion(prev => prev ? { ...prev, estado: nuevoEstado as any } : null)
          }}
        />

        {/* Items table */}
        <div className="bg-white rounded-lg border overflow-hidden">
          {cotizacion.items && cotizacion.items.length > 0 ? (
            <CotizacionProveedorTabla
              items={cotizacion.items}
              moneda={cotizacion.moneda || 'USD'}
              onItemUpdated={(updatedItem) => {
                setCotizacion(prev => prev ? {
                  ...prev,
                  items: prev.items?.map(item =>
                    item.id === updatedItem.id ? updatedItem : item
                  ) || []
                } : null)
              }}
              onUpdated={handleRefresh}
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-muted-foreground">No hay items</p>
              <Button
                variant="link"
                size="sm"
                className="text-xs mt-2"
                onClick={() => setShowAgregarItems(true)}
              >
                Agregar items
              </Button>
            </div>
          )}
        </div>

        {/* Historial colapsable */}
        <div className="bg-white rounded-lg border">
          <button
            onClick={() => setShowHistorial(!showHistorial)}
            className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <History className="h-3.5 w-3.5 text-gray-400" />
              <span className="text-xs font-medium text-gray-600">Historial</span>
            </div>
            <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${showHistorial ? 'rotate-180' : ''}`} />
          </button>
          {showHistorial && (
            <div className="px-4 pb-4 border-t">
              <CotizacionProveedorHistorial
                cotizacionId={cotizacionId}
                entidadTipo="COTIZACION_PROVEEDOR"
              />
            </div>
          )}
        </div>
      </div>

      {/* Modal agregar items */}
      <ModalAgregarItemCotizacionProveedor
        open={showAgregarItems}
        onClose={() => {
          setShowAgregarItems(false)
          handleRefresh()
        }}
        cotizacion={cotizacion}
        proyectoId={cotizacion.proyectoId || ''}
        onAdded={handleRefresh}
      />

      {/* Modal escanear PDF */}
      <ModalEscanearCotizacionPDF
        open={showScanPdf}
        onClose={() => setShowScanPdf(false)}
        cotizacion={cotizacion}
        onApplied={handleRefresh}
      />

      {/* Modal solicitar a otro proveedor */}
      <ModalSolicitarOtroProveedor
        open={showSolicitarOtro}
        onClose={() => setShowSolicitarOtro(false)}
        cotizacion={cotizacion}
      />

      {/* Modal seleccionar cotización completa */}
      {cotizacion.items && (
        <ModalSeleccionarCotizacionCompleta
          open={showSeleccionarCompleta}
          onClose={() => setShowSeleccionarCompleta(false)}
          items={cotizacion.items}
          cotizacionCodigo={cotizacion.codigo || ''}
          proveedorNombre={cotizacion.proveedor?.nombre || ''}
          onCompleted={handleRefresh}
        />
      )}
    </div>
  )
}
