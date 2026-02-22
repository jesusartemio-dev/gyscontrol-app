/**
 * 📦 Página de Detalle de Pedido - Logística
 * Diseño minimalista y compacto para gestión eficiente
 * @author GYS Team
 */

'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import Link from 'next/link'

// 📡 Types & Services
import {
  PedidoEquipo,
  PedidoEquipoItem,
  PedidoEquipoItemUpdatePayload,
} from '@/types'
import { getPedidoEquipoById } from '@/lib/services/pedidoEquipo'
import {
  updatePedidoEquipoItem
} from '@/lib/services/pedidoEquipoItem'
import { generarOCsDesdePedido } from '@/lib/services/ordenCompra'
import PedidoEstadoStepper from '@/components/logistica/PedidoEstadoStepper'

// 🎨 UI Components
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'

// 🎯 Icons
import {
  Package,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Edit,
  Save,
  Activity,
  Calendar,
  User,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Building2,
  ExternalLink,
  List,
  History,
  ShoppingCart,
  PackageCheck,
  X,
  AlertCircle,
  Info,
  Truck,
  FileText,
  Warehouse,
} from 'lucide-react'

// 🔧 Utility functions
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

const formatDate = (dateString: string | Date): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit'
  })
}

const getEstadoBadgeClass = (estado: string): string => {
  const styles: Record<string, string> = {
    entregado: 'bg-green-100 text-green-700 border-green-200',
    parcial: 'bg-amber-100 text-amber-700 border-amber-200',
    atendido: 'bg-blue-100 text-blue-700 border-blue-200',
    pendiente: 'bg-gray-100 text-gray-700 border-gray-200',
    borrador: 'bg-gray-100 text-gray-600 border-gray-200',
    enviado: 'bg-blue-100 text-blue-700 border-blue-200',
    cancelado: 'bg-red-100 text-red-700 border-red-200',
    aprobada: 'bg-green-100 text-green-700 border-green-200',
    confirmada: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    recibida: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  }
  return styles[estado] || styles.pendiente
}

export default function PedidoLogisticaDetailPage() {
  const router = useRouter()
  const params = useParams()
  const { data: session } = useSession()
  const pedidoId = params?.pedidoId as string

  // 🔄 Estados principales
  const [pedido, setPedido] = useState<PedidoEquipo | null>(null)
  const [eventos, setEventos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  // 🛒 Estado para generar OCs
  const [showGenerarOC, setShowGenerarOC] = useState(false)
  const [generandoOC, setGenerandoOC] = useState(false)
  const [monedaOC, setMonedaOC] = useState('USD')
  const [condicionPagoOC, setCondicionPagoOC] = useState('contado')
  const [fechasEntregaOC, setFechasEntregaOC] = useState<Record<string, string>>({})
  const [proveedoresSeleccionados, setProveedoresSeleccionados] = useState<Set<string>>(new Set())

  // 📦 Estado para edición de items
  const [editingItem, setEditingItem] = useState<{
    item: PedidoEquipoItem | null
    cantidadAtendida: number
    estado: string
    fechaEntregaReal: string
    observacionesEntrega: string
  }>({ item: null, cantidadAtendida: 0, estado: 'pendiente', fechaEntregaReal: '', observacionesEntrega: '' })

  // 🔁 Cargar datos iniciales
  useEffect(() => {
    if (pedidoId) {
      cargarDatos()
    }
  }, [pedidoId])

  const cargarDatos = async () => {
    try {
      setLoading(true)
      setError(null)

      const pedidoData = await getPedidoEquipoById(pedidoId)
      setPedido(pedidoData)
      // Trazabilidad viene incluida en la respuesta del pedido
      setEventos((pedidoData as any)?.eventosTrazabilidad || [])
    } catch (err) {
      console.error('Error cargando datos:', err)
      setError('Error al cargar los datos del pedido')
      toast.error('Error al cargar los datos del pedido')
    } finally {
      setLoading(false)
    }
  }

  // 📝 Actualizar item
  const handleUpdateItem = async (itemId: string, data: PedidoEquipoItemUpdatePayload) => {
    try {
      await updatePedidoEquipoItem(itemId, data)
      toast.success('Item actualizado correctamente')
      await cargarDatos() // Recargar datos
    } catch (err) {
      console.error('Error actualizando item:', err)
      toast.error('Error al actualizar el item')
    }
  }

  // 📦 Abrir modal de edición de item
  const openItemEdit = (item: PedidoEquipoItem) => {
    // Formatear fecha para input type="date"
    const fechaReal = (item as any).fechaEntregaReal
      ? new Date((item as any).fechaEntregaReal).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0] // Por defecto, fecha actual

    setEditingItem({
      item,
      cantidadAtendida: item.cantidadAtendida || 0,
      estado: item.estado || 'pendiente',
      fechaEntregaReal: fechaReal,
      observacionesEntrega: (item as any).observacionesEntrega || ''
    })
  }

  // Clamp cantidadAtendida to valid range
  const setCantidadAtendida = (value: number) => {
    if (!editingItem.item) return
    const clamped = Math.max(0, Math.min(value, editingItem.item.cantidadPedida))
    setEditingItem(prev => ({ ...prev, cantidadAtendida: clamped }))
  }

  // 📦 Guardar cambios del item
  const saveItemEdit = async () => {
    if (!editingItem.item) return

    try {
      setUpdating(true)

      // Determinar estado basado en cantidades
      let nuevoEstado: 'pendiente' | 'entregado' | 'parcial' = 'pendiente'
      if (editingItem.cantidadAtendida === 0) {
        nuevoEstado = 'pendiente'
      } else if (editingItem.cantidadAtendida >= editingItem.item.cantidadPedida) {
        nuevoEstado = 'entregado'
      } else if (editingItem.cantidadAtendida > 0) {
        nuevoEstado = 'parcial'
      }

      // La API requiere cantidadPedida, enviamos el valor actual sin cambios
      await handleUpdateItem(editingItem.item.id, {
        cantidadPedida: editingItem.item.cantidadPedida,
        cantidadAtendida: editingItem.cantidadAtendida,
        estado: nuevoEstado,
        // Registrar fecha de entrega si hay cantidad atendida
        fechaEntregaReal: editingItem.cantidadAtendida > 0 ? editingItem.fechaEntregaReal : undefined,
        observacionesEntrega: editingItem.observacionesEntrega || undefined
      })

      setEditingItem({ item: null, cantidadAtendida: 0, estado: 'pendiente', fechaEntregaReal: '', observacionesEntrega: '' })
    } finally {
      setUpdating(false)
    }
  }

  // 🔄 Calcular métricas de progreso
  const calcularProgreso = () => {
    if (!pedido?.items || pedido.items.length === 0) {
      return { progreso: 0, itemsEntregados: 0, totalItems: 0 }
    }

    const totalItems = pedido.items.reduce((sum, item) => sum + item.cantidadPedida, 0)
    const itemsEntregados = pedido.items.reduce((sum, item) => {
      return sum + (item.estado === 'entregado' ? item.cantidadPedida : 0)
    }, 0)
    const progreso = totalItems > 0 ? (itemsEntregados / totalItems) * 100 : 0

    return { progreso, itemsEntregados, totalItems }
  }

  const { progreso, itemsEntregados, totalItems } = calcularProgreso()

  // 🛒 Calcular agrupación por proveedor para el dialog de OCs
  const calcularGruposProveedor = () => {
    if (!pedido?.items) return { grupos: [], sinProveedor: 0, conOC: 0 }

    const sinProveedor: any[] = []
    const conOC: any[] = []
    const elegibles: any[] = []

    for (const item of pedido.items) {
      // proveedorId directo o fallback desde listaEquipoItem
      const provId = (item as any).proveedorId || (item as any).listaEquipoItem?.proveedorId
      const ocItems = (item as any).ordenCompraItems || []

      if (!provId) {
        sinProveedor.push(item)
      } else if (ocItems.length > 0) {
        conOC.push(item)
      } else {
        elegibles.push(item)
      }
    }

    // Agrupar elegibles por proveedor
    const mapaProveedores = new Map<string, { nombre: string; items: any[]; monto: number; maxTiempoEntregaDias: number }>()
    for (const item of elegibles) {
      const provId = (item as any).proveedorId || (item as any).listaEquipoItem?.proveedorId
      const provNombre = (item as any).proveedor?.nombre || (item as any).proveedorNombre || (item as any).listaEquipoItem?.proveedor?.nombre || 'Sin nombre'
      if (!mapaProveedores.has(provId)) {
        mapaProveedores.set(provId, { nombre: provNombre, items: [], monto: 0, maxTiempoEntregaDias: 0 })
      }
      const grupo = mapaProveedores.get(provId)!
      grupo.items.push(item)
      grupo.monto += item.costoTotal || (item.cantidadPedida * (item.precioUnitario || 0))
      const ted = (item as any).tiempoEntregaDias || 0
      if (ted > grupo.maxTiempoEntregaDias) grupo.maxTiempoEntregaDias = ted
    }

    return {
      grupos: Array.from(mapaProveedores.entries()).map(([id, g]) => ({ id, ...g })),
      sinProveedor: sinProveedor.length,
      conOC: conOC.length,
    }
  }

  const handleGenerarOCs = async () => {
    if (!pedido) return
    try {
      setGenerandoOC(true)
      // Solo enviar items y fechas de proveedores seleccionados
      const { grupos } = calcularGruposProveedor()
      const gruposActivos = grupos.filter(g => proveedoresSeleccionados.has(g.id))
      const itemIds = gruposActivos.flatMap(g => g.items.map((i: any) => i.id))
      const fechasFiltradas: Record<string, string> = {}
      for (const g of gruposActivos) {
        if (fechasEntregaOC[g.id]) fechasFiltradas[g.id] = fechasEntregaOC[g.id]
      }
      const resultado = await generarOCsDesdePedido({
        pedidoId: pedido.id,
        itemIds,
        moneda: monedaOC,
        condicionPago: condicionPagoOC,
        fechasEntregaPorProveedor: fechasFiltradas,
      })
      toast.success(`Se generaron ${resultado.resumen.totalOCs} orden(es) de compra con ${resultado.resumen.totalItems} items`)
      setShowGenerarOC(false)
      await cargarDatos()
    } catch (err: any) {
      console.error('Error generando OCs:', err)
      toast.error(err.message || 'Error al generar órdenes de compra')
    } finally {
      setGenerandoOC(false)
    }
  }

  // Estado para rechazo de recepción
  const [rechazarDialog, setRechazarDialog] = useState<{ open: boolean; recepcionId: string | null }>({ open: false, recepcionId: null })
  const [rechazarObservaciones, setRechazarObservaciones] = useState('')
  const [procesandoRecepcion, setProcesandoRecepcion] = useState<string | null>(null)
  const [rechazoDetalleModal, setRechazoDetalleModal] = useState<any>(null)
  const [revertirRechazo, setRevertirRechazo] = useState<{ confirmando: boolean; motivo: string; procesando: boolean }>({ confirmando: false, motivo: '', procesando: false })

  // Recepciones pendientes (aplanar desde items)
  const recepcionesPendientes = (pedido?.items || []).flatMap((item: any) =>
    (item.recepcionesPendientes || []).map((r: any) => ({
      ...r,
      itemCodigo: item.codigo,
      itemDescripcion: item.descripcion,
    }))
  )

  const handleConfirmarRecepcion = useCallback(async (recepcionId: string, paso: 'almacen' | 'proyecto' = 'almacen') => {
    setProcesandoRecepcion(recepcionId)
    try {
      const res = await fetch(`/api/recepcion-pendiente/${recepcionId}/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paso, observaciones: null }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al confirmar')
      }
      toast.success(paso === 'almacen' ? 'Llegada a almacén confirmada' : 'Entrega a proyecto confirmada')
      await cargarDatos()
    } catch (err: any) {
      toast.error(err.message || 'Error al confirmar recepción')
    } finally {
      setProcesandoRecepcion(null)
    }
  }, [])

  const handleRechazarRecepcion = useCallback(async () => {
    if (!rechazarDialog.recepcionId || !rechazarObservaciones.trim()) return
    setProcesandoRecepcion(rechazarDialog.recepcionId)
    try {
      const res = await fetch(`/api/recepcion-pendiente/${rechazarDialog.recepcionId}/rechazar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ observaciones: rechazarObservaciones.trim() }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al rechazar')
      }
      toast.success('Recepción rechazada')
      setRechazarDialog({ open: false, recepcionId: null })
      setRechazarObservaciones('')
      await cargarDatos()
    } catch (err: any) {
      toast.error(err.message || 'Error al rechazar recepción')
    } finally {
      setProcesandoRecepcion(null)
    }
  }, [rechazarDialog.recepcionId, rechazarObservaciones])

  // Permisos para generar OCs
  const userRole = session?.user?.role || ''
  const puedeGenerarOC = ['admin', 'gerente', 'logistico'].includes(userRole)
    && pedido !== null
    && ['enviado', 'atendido', 'parcial'].includes(pedido?.estado || '')
  const puedeConfirmarRecepcion = ['admin', 'gerente', 'logistico', 'gestor'].includes(userRole)

  // 🔄 Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <div className="bg-white border-b px-4 py-3">
          <Skeleton className="h-4 w-48 mb-2" />
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-20 rounded-lg" />
            ))}
          </div>
          <Skeleton className="h-96 rounded-lg" />
        </div>
      </div>
    )
  }

  // ❌ Error state
  if (error || !pedido) {
    return (
      <div className="min-h-screen bg-gray-50/50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-10 w-10 text-red-400 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            {error || 'No se pudo cargar el pedido'}
          </p>
          <Button onClick={() => router.back()} variant="outline" size="sm" className="h-7 text-xs">
            <ArrowLeft className="h-3 w-3 mr-1" />
            Volver
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header compacto */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Link href="/logistica" className="hover:text-foreground">Logística</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href="/logistica/pedidos" className="hover:text-foreground">Pedidos</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{pedido.codigo}</span>
          </div>

          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild className="h-7 px-2">
                <Link href="/logistica/pedidos">
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-base font-semibold">{pedido.codigo}</h1>
                  <p className="text-[10px] text-muted-foreground">
                    {(pedido as any).proyecto?.nombre || 'Sin proyecto'}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={cn('text-[10px] h-5', getEstadoBadgeClass(pedido.estado))}>
                {pedido.estado}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              {puedeGenerarOC && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    const fn = pedido?.fechaNecesaria
                      ? new Date(pedido.fechaNecesaria).toISOString().split('T')[0]
                      : ''
                    const { grupos } = calcularGruposProveedor()
                    const fechasIniciales: Record<string, string> = {}
                    for (const g of grupos) {
                      fechasIniciales[g.id] = fn
                    }
                    setFechasEntregaOC(fechasIniciales)
                    setProveedoresSeleccionados(new Set(grupos.map(g => g.id)))
                    setShowGenerarOC(true)
                  }}
                  className="h-7 text-xs"
                >
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Generar OCs
                </Button>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={cargarDatos}
                disabled={loading}
                className="h-7 text-xs"
              >
                <RefreshCw className={cn('h-3 w-3 mr-1', loading && 'animate-spin')} />
                Actualizar
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Stepper de estado */}
        <div className="bg-white rounded-lg border px-4 py-3">
          <PedidoEstadoStepper estado={pedido.estado} />
        </div>

        {/* Banner recepciones — estado "pendiente" (llegaron, falta confirmar almacén) */}
        {(() => {
          const pendientes = recepcionesPendientes.filter((r: any) => r.estado === 'pendiente')
          if (pendientes.length === 0 || !puedeConfirmarRecepcion) return null
          return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <PackageCheck className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">
                  Recepciones por confirmar en almacén ({pendientes.length})
                </span>
              </div>
              <div className="space-y-2">
                {pendientes.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between bg-white rounded border px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm">
                        Llegaron <strong>{r.cantidadRecibida}</strong> x {r.itemDescripcion}
                        <span className="text-muted-foreground"> ({r.itemCodigo})</span>
                        {' '}desde{' '}
                        <span className="font-medium">{r.ordenCompraItem?.ordenCompra?.numero || 'OC'}</span>
                        {' '}el{' '}
                        <span className="text-muted-foreground">{formatDate(r.fechaRecepcion)}</span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs bg-green-600 hover:bg-green-700"
                        disabled={procesandoRecepcion === r.id}
                        onClick={() => handleConfirmarRecepcion(r.id, 'almacen')}
                      >
                        <Warehouse className="h-3 w-3 mr-1" />
                        Confirmar llegada a almacén
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                        disabled={procesandoRecepcion === r.id}
                        onClick={() => {
                          setRechazarDialog({ open: true, recepcionId: r.id })
                          setRechazarObservaciones('')
                        }}
                      >
                        <X className="h-3 w-3 mr-1" />
                        Rechazar
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Banner recepciones — estado "en_almacen" (informativo para logística) */}
        {(() => {
          const enAlmacen = recepcionesPendientes.filter((r: any) => r.estado === 'en_almacen')
          if (enAlmacen.length === 0) return null
          return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Warehouse className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-green-800">
                  En almacén — pendiente entrega a proyecto ({enAlmacen.length})
                </span>
              </div>
              <div className="space-y-2">
                {enAlmacen.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between bg-white rounded border px-3 py-2">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500 inline mr-1" />
                        <strong>{r.cantidadRecibida}</strong> x {r.itemDescripcion}
                        <span className="text-muted-foreground"> ({r.itemCodigo})</span>
                        {' — '}
                        <span className="text-muted-foreground">
                          En almacén desde {formatDate(r.fechaConfirmacion || r.fechaRecepcion)}
                          {r.confirmadoPor?.name && ` por ${r.confirmadoPor.name}`}
                          {' — pendiente que Proyectos confirme'}
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Dialog rechazar recepción */}
        <Dialog open={rechazarDialog.open} onOpenChange={(open) => { if (!open) setRechazarDialog({ open: false, recepcionId: null }) }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Rechazar recepción</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Indica el motivo del rechazo. Esta acción no actualizará las cantidades del pedido.
              </p>
              <Textarea
                placeholder="Motivo del rechazo (obligatorio)..."
                value={rechazarObservaciones}
                onChange={(e) => setRechazarObservaciones(e.target.value)}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRechazarDialog({ open: false, recepcionId: null })}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={!rechazarObservaciones.trim() || procesandoRecepcion !== null}
                onClick={handleRechazarRecepcion}
              >
                Rechazar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Panel: ¿Qué falta para completar este pedido? */}
        {!['entregado', 'cancelado'].includes(pedido.estado) && (() => {
          const items = pedido.items || []
          // 🔴 Sin proveedor
          const sinProveedor = items.filter((i: any) => {
            const provId = i.proveedorId || i.listaEquipoItem?.proveedorId
            return !provId
          })
          // Items con proveedor
          const conProveedor = items.filter((i: any) => {
            const provId = i.proveedorId || i.listaEquipoItem?.proveedorId
            return !!provId
          })
          // 🟡 Con proveedor pero sin OC
          const sinOC = conProveedor.filter((i: any) => !(i.ordenCompraItems?.length > 0))
          // Items con OC
          const conOC = conProveedor.filter((i: any) => i.ordenCompraItems?.length > 0)
          // 🔵 OC pendiente de confirmar (borrador/aprobada/enviada)
          const ocPendienteConfirmar = conOC.filter((i: any) => {
            const oc = i.ordenCompraItems?.[0]?.ordenCompra
            return oc && ['borrador', 'aprobada', 'enviada'].includes(oc.estado)
          })
          // 🟣 OC confirmada pero sin recepción (item no entregado)
          const ocEsperandoRecepcion = conOC.filter((i: any) => {
            const oc = i.ordenCompraItems?.[0]?.ordenCompra
            return oc && ['confirmada', 'parcial'].includes(oc.estado) && i.estado !== 'entregado'
          })
          // 🔴 Recepciones rechazadas
          const recepcionesRechazadas = items.flatMap((i: any) =>
            (i.recepcionesPendientes || [])
              .filter((r: any) => r.estado === 'rechazado')
              .map((r: any) => ({ ...r, itemCodigo: i.codigo, itemDescripcion: i.descripcion }))
          )

          const hayAlertas = sinProveedor.length > 0 || sinOC.length > 0 || ocPendienteConfirmar.length > 0 || ocEsperandoRecepcion.length > 0 || recepcionesRechazadas.length > 0
          const todoCompleto = !hayAlertas && items.length > 0

          if (todoCompleto) return null

          return (
            <Collapsible defaultOpen={hayAlertas}>
              <div className="bg-white rounded-lg border">
                <CollapsibleTrigger className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-medium">¿Qué falta para completar este pedido?</span>
                    {hayAlertas && (() => {
                        const total = sinProveedor.length + sinOC.length + ocPendienteConfirmar.length + ocEsperandoRecepcion.length + recepcionesRechazadas.length
                        return (
                          <Badge variant="outline" className={cn('text-[9px] h-4 px-1.5', recepcionesRechazadas.length > 0 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-amber-50 text-amber-700 border-amber-200')}>
                            {total} pendiente{total !== 1 ? 's' : ''}
                          </Badge>
                        )
                      })()}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-3 space-y-2">
                    {/* 🔴 Sin proveedor */}
                    {sinProveedor.length > 0 && (
                      <div className="flex items-start gap-2 text-[11px] bg-red-50 border border-red-100 rounded-md px-3 py-2">
                        <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-red-700">
                            {sinProveedor.length} item{sinProveedor.length !== 1 ? 's' : ''} sin proveedor asignado
                          </p>
                          <p className="text-red-600 mt-0.5">
                            Asigna proveedor desde la Lista de Equipo antes de generar OC.
                          </p>
                          <p className="text-red-500 mt-1 font-mono text-[10px]">
                            {sinProveedor.map((i: any) => i.codigo).join(', ')}
                          </p>
                        </div>
                      </div>
                    )}
                    {/* 🟡 Con proveedor pero sin OC */}
                    {sinOC.length > 0 && (
                      <div className="flex items-start gap-2 text-[11px] bg-amber-50 border border-amber-100 rounded-md px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-amber-700">
                            {sinOC.length} item{sinOC.length !== 1 ? 's' : ''} {sinOC.length !== 1 ? 'tienen' : 'tiene'} proveedor pero no {sinOC.length !== 1 ? 'tienen' : 'tiene'} OC generada
                          </p>
                          {puedeGenerarOC && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] mt-1.5 border-amber-300 text-amber-700 hover:bg-amber-100"
                              onClick={() => {
                                const fn = pedido?.fechaNecesaria
                                  ? new Date(pedido.fechaNecesaria).toISOString().split('T')[0]
                                  : ''
                                const { grupos } = calcularGruposProveedor()
                                const fechasIniciales: Record<string, string> = {}
                                for (const g of grupos) {
                                  fechasIniciales[g.id] = fn
                                }
                                setFechasEntregaOC(fechasIniciales)
                                setProveedoresSeleccionados(new Set(grupos.map(g => g.id)))
                                setShowGenerarOC(true)
                              }}
                            >
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Generar OCs pendientes
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                    {/* 🔵 OC pendiente de confirmar */}
                    {ocPendienteConfirmar.length > 0 && (
                      <div className="flex items-start gap-2 text-[11px] bg-blue-50 border border-blue-100 rounded-md px-3 py-2">
                        <Info className="h-3.5 w-3.5 text-blue-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-blue-700">
                            {ocPendienteConfirmar.length} item{ocPendienteConfirmar.length !== 1 ? 's' : ''} {ocPendienteConfirmar.length !== 1 ? 'tienen' : 'tiene'} OC pendiente de confirmar
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {(() => {
                              const ocMap = new Map<string, { id: string; numero: string; estado: string }>()
                              ocPendienteConfirmar.forEach((i: any) => {
                                const oc = i.ordenCompraItems?.[0]?.ordenCompra
                                if (oc && !ocMap.has(oc.id)) ocMap.set(oc.id, oc)
                              })
                              return Array.from(ocMap.values()).map(oc => (
                                <Link
                                  key={oc.id}
                                  href={`/logistica/ordenes-compra/${oc.id}`}
                                  className="inline-flex items-center gap-1 text-[10px] font-medium text-blue-600 hover:text-blue-800 bg-white border border-blue-200 rounded px-1.5 py-0.5"
                                >
                                  {oc.numero}
                                  <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-blue-200">{oc.estado}</Badge>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </Link>
                              ))
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* 🟣 OC confirmada esperando recepción */}
                    {ocEsperandoRecepcion.length > 0 && (
                      <div className="flex items-start gap-2 text-[11px] bg-purple-50 border border-purple-100 rounded-md px-3 py-2">
                        <Truck className="h-3.5 w-3.5 text-purple-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-purple-700">
                            {ocEsperandoRecepcion.length} item{ocEsperandoRecepcion.length !== 1 ? 's' : ''} {ocEsperandoRecepcion.length !== 1 ? 'tienen' : 'tiene'} OC confirmada esperando recepción
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {(() => {
                              const ocMap = new Map<string, { id: string; numero: string; estado: string }>()
                              ocEsperandoRecepcion.forEach((i: any) => {
                                const oc = i.ordenCompraItems?.[0]?.ordenCompra
                                if (oc && !ocMap.has(oc.id)) ocMap.set(oc.id, oc)
                              })
                              return Array.from(ocMap.values()).map(oc => (
                                <Link
                                  key={oc.id}
                                  href={`/logistica/ordenes-compra/${oc.id}`}
                                  className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-600 hover:text-purple-800 bg-white border border-purple-200 rounded px-1.5 py-0.5"
                                >
                                  {oc.numero}
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </Link>
                              ))
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* 🔴 Recepciones rechazadas */}
                    {recepcionesRechazadas.length > 0 && (
                      <div className="flex items-start gap-2 text-[11px] bg-red-50 border border-red-200 rounded-md px-3 py-2">
                        <AlertCircle className="h-3.5 w-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-red-700">
                            {recepcionesRechazadas.length} item{recepcionesRechazadas.length !== 1 ? 's' : ''} rechazado{recepcionesRechazadas.length !== 1 ? 's' : ''} en recepción — requieren atención
                          </p>
                          <div className="mt-1.5 space-y-1">
                            {recepcionesRechazadas.map((r: any) => (
                              <div key={r.id} className="flex items-center justify-between">
                                <span className="text-red-600">
                                  {r.cantidadRecibida} x {r.itemCodigo} — {r.motivoRechazo || r.observaciones || 'Sin motivo'}
                                </span>
                                <button
                                  onClick={() => setRechazoDetalleModal(r)}
                                  className="text-[10px] text-red-600 hover:text-red-800 underline ml-2 flex-shrink-0"
                                >
                                  Ver detalle
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )
        })()}

        {/* Stats cards compactas */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Progreso</span>
              <Activity className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <p className="text-xl font-bold mt-1 text-blue-600">{progreso.toFixed(0)}%</p>
            <Progress value={progreso} className="h-1.5 mt-1" />
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Items</span>
              <Package className="h-3.5 w-3.5 text-gray-500" />
            </div>
            <p className="text-xl font-bold mt-1">{pedido.items?.length || 0}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Entregados</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            </div>
            <p className="text-xl font-bold mt-1 text-green-600">{itemsEntregados}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Pendientes</span>
              <Clock className="h-3.5 w-3.5 text-orange-500" />
            </div>
            <p className="text-xl font-bold mt-1 text-orange-600">{totalItems - itemsEntregados}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Monto</span>
              <span className="text-[10px] text-emerald-600">$</span>
            </div>
            <p className="text-lg font-bold mt-1 text-emerald-600">
              {formatCurrency(pedido.items?.reduce((sum, item) => sum + (item.costoTotal || 0), 0) || 0)}
            </p>
          </div>
          <a href="#seccion-ocs" className="bg-white rounded-lg border p-3 hover:bg-gray-50 transition-colors block">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">OCs</span>
              <ShoppingCart className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <p className="text-xl font-bold mt-1 text-blue-600">{(pedido as any).ordenesCompra?.length || 0}</p>
          </a>
        </div>

        {/* Info rápida del pedido */}
        <div className="bg-white rounded-lg border p-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-gray-400" />
              <div>
                <span className="text-muted-foreground">Responsable</span>
                <p className="font-medium">{(pedido.responsable as any)?.name || (pedido.responsable as any)?.nombre || 'Sin asignar'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 text-gray-400" />
              <div>
                <span className="text-muted-foreground">Fecha Pedido</span>
                <p className="font-medium">{formatDate(pedido.fechaPedido)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-gray-400" />
              <div>
                <span className="text-muted-foreground">Fecha Necesaria</span>
                <p className="font-medium">{pedido.fechaNecesaria ? formatDate(pedido.fechaNecesaria) : '—'}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-gray-400" />
              <div>
                <span className="text-muted-foreground">Proyecto</span>
                <p className="font-medium truncate max-w-[150px]" title={(pedido as any).proyecto?.nombre}>
                  {(pedido as any).proyecto?.codigo || '—'}
                </p>
              </div>
            </div>
            {pedido.lista && (
              <div className="flex items-center gap-2">
                <List className="h-3.5 w-3.5 text-gray-400" />
                <div>
                  <span className="text-muted-foreground">Lista Origen</span>
                  <Link
                    href={`/logistica/listas/${pedido.lista.id}`}
                    className="font-medium text-blue-600 hover:underline flex items-center gap-1"
                  >
                    {pedido.lista.codigo || pedido.lista.nombre}
                    <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 📦 Items del Pedido */}
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-3 border-b bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Items del Pedido</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] h-5">
                {pedido.items?.filter(i => i.estado === 'entregado').length || 0} entregados
              </Badge>
              <Badge variant="outline" className="text-[10px] h-5">
                {pedido.items?.filter(i => i.estado === 'pendiente' || !i.estado).length || 0} pendientes
              </Badge>
            </div>
          </div>

          {pedido.items && pedido.items.length > 0 ? (
            <div>
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr className="border-b">
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Código</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Descripción</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Proveedor</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Unidad</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Pedido</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Atendido</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Estado</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">T. Entrega</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">F.Entrega</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Costo</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {pedido.items.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2">
                        <span className="font-mono font-medium">{item.codigo}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-600 max-w-[180px] truncate" title={item.descripcion}>
                        {item.descripcion}
                      </td>
                      <td className="px-3 py-2 text-gray-600 max-w-[140px]">
                        <div className="truncate">{(item as any).proveedor?.nombre || (item as any).proveedorNombre || (item as any).listaEquipoItem?.proveedor?.nombre || '—'}</div>
                        {(item as any).ordenCompraItems?.length > 0 && (
                          <Link
                            href={`/logistica/ordenes-compra/${(item as any).ordenCompraItems[0].ordenCompra?.id}`}
                            className="inline-flex items-center gap-0.5 text-[9px] text-blue-600 hover:underline mt-0.5"
                          >
                            <ShoppingCart className="h-2.5 w-2.5" />
                            {(item as any).ordenCompraItems[0].ordenCompra?.numero}
                          </Link>
                        )}
                        {((item as any).proveedorId || (item as any).listaEquipoItem?.proveedorId) && !((item as any).ordenCompraItems?.length > 0) && (
                          <span className="inline-flex items-center text-[9px] text-gray-400 mt-0.5">Sin OC</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500">{item.unidad}</td>
                      <td className="px-3 py-2 text-center font-medium text-blue-600">
                        {item.cantidadPedida}
                      </td>
                      <td className="px-3 py-2 text-center font-medium text-green-600">
                        {item.cantidadAtendida || 0}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] px-1.5 py-0', getEstadoBadgeClass(item.estado || 'pendiente'))}
                        >
                          {item.estado || 'pendiente'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {(() => {
                          const te = (item as any).tiempoEntrega
                          const ted = (item as any).tiempoEntregaDias
                          const focr = (item as any).fechaOrdenCompraRecomendada
                          const vencida = focr && new Date(focr) < new Date()
                          const texto = te || (ted ? `${ted}d` : null)

                          if (!texto) return <span className="text-gray-400">—</span>

                          if (vencida) {
                            return (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-[10px] font-medium text-red-600 cursor-help">
                                      {texto}
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p className="text-xs">OC debería haberse emitido el {formatDate(focr)}</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )
                          }

                          return <span className="text-[10px] text-gray-600">{texto}</span>
                        })()}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {(() => {
                          const fEstimada = (item as any).fechaEntregaEstimada
                          const fReal = (item as any).fechaEntregaReal
                          const fechaNec = pedido?.fechaNecesaria

                          if (fReal) {
                            return <span className="text-[10px] text-gray-600">{formatDate(fReal)}</span>
                          }
                          if (fEstimada) {
                            const superaFecha = fechaNec && new Date(fEstimada) > new Date(fechaNec)
                            if (superaFecha) {
                              return (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="text-[10px] font-medium text-red-600 cursor-help">
                                        {formatDate(fEstimada)}
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p className="text-xs">Supera la fecha necesaria del proyecto ({formatDate(fechaNec)})</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              )
                            }
                            return <span className="text-[10px] text-gray-600">{formatDate(fEstimada)}</span>
                          }
                          return <span className="text-gray-400">—</span>
                        })()}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-emerald-600">
                        {item.costoTotal ? formatCurrency(item.costoTotal) : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openItemEdit(item)}
                          className="h-6 text-[10px] px-2"
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Atender
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer resumen */}
              <div className="px-4 py-3 border-t bg-gray-50">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      <span className="text-muted-foreground">Entregados:</span>
                      <span className="font-medium">{pedido.items.filter(i => i.estado === 'entregado').length}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-muted-foreground">Parciales:</span>
                      <span className="font-medium">{pedido.items.filter(i => i.estado === 'parcial').length}</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-gray-400" />
                      <span className="text-muted-foreground">Pendientes:</span>
                      <span className="font-medium">{pedido.items.filter(i => i.estado === 'pendiente' || !i.estado).length}</span>
                    </span>
                  </div>
                  <span className="font-medium text-emerald-600">
                    Total: {formatCurrency(pedido.items.reduce((sum, item) => sum + (item.costoTotal || 0), 0))}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-muted-foreground">No hay items en este pedido</p>
            </div>
          )}
        </div>

        {/* 🛒 Órdenes de Compra vinculadas */}
        <div id="seccion-ocs" className="bg-white rounded-lg border">
          <div className="px-4 py-3 border-b bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Órdenes de Compra</span>
            </div>
            {(() => {
              const totalItemsPedido = pedido.items?.length || 0
              const itemsConOC = pedido.items?.filter((i: any) => (i as any).ordenCompraItems?.length > 0).length || 0
              return (
                <Badge variant="outline" className="text-[10px] h-5">
                  {itemsConOC} de {totalItemsPedido} items con OC
                </Badge>
              )
            })()}
          </div>
          {(pedido as any).ordenesCompra && (pedido as any).ordenesCompra.length > 0 ? (
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr className="border-b">
                  <th className="px-3 py-2 text-left font-medium text-gray-600">N° OC</th>
                  <th className="px-3 py-2 text-left font-medium text-gray-600">Proveedor</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600">Items</th>
                  <th className="px-3 py-2 text-right font-medium text-gray-600">Subtotal</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600">Estado</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600">F. Entrega Est.</th>
                  <th className="px-3 py-2 text-center font-medium text-gray-600">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {(pedido as any).ordenesCompra.map((oc: any) => (
                  <tr key={oc.id} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2 font-mono font-medium">{oc.numero}</td>
                    <td className="px-3 py-2 text-gray-600">{oc.proveedor?.nombre || '—'}</td>
                    <td className="px-3 py-2 text-center">{oc.items?.length || 0}</td>
                    <td className="px-3 py-2 text-right font-medium text-emerald-600">
                      {formatCurrency(oc.subtotal || 0)}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Badge variant="outline" className={cn('text-[10px] px-1.5 py-0', getEstadoBadgeClass(oc.estado))}>
                        {oc.estado}
                      </Badge>
                    </td>
                    <td className="px-3 py-2 text-center text-gray-500">
                      {oc.fechaEntregaEstimada ? formatDate(oc.fechaEntregaEstimada) : '—'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <Button variant="ghost" size="sm" asChild className="h-6 text-[10px] px-2">
                        <Link href={`/logistica/ordenes-compra/${oc.id}`}>
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Ver
                        </Link>
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <ShoppingCart className="h-8 w-8 text-gray-300 mb-2" />
              <p className="text-xs text-muted-foreground mb-3">No hay órdenes de compra generadas para este pedido.</p>
              {puedeGenerarOC && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const fn = pedido?.fechaNecesaria
                      ? new Date(pedido.fechaNecesaria).toISOString().split('T')[0]
                      : ''
                    const { grupos } = calcularGruposProveedor()
                    const fechasIniciales: Record<string, string> = {}
                    for (const g of grupos) {
                      fechasIniciales[g.id] = fn
                    }
                    setFechasEntregaOC(fechasIniciales)
                    setProveedoresSeleccionados(new Set(grupos.map(g => g.id)))
                    setShowGenerarOC(true)
                  }}
                  className="h-7 text-xs"
                >
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Generar OCs
                </Button>
              )}
            </div>
          )}
        </div>

        {/* 📈 Timeline de Trazabilidad - Colapsable */}
        {eventos.length > 0 && (
          <Collapsible open={timelineOpen} onOpenChange={setTimelineOpen}>
            <div className="bg-white rounded-lg border">
              <CollapsibleTrigger asChild>
                <button className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium">Timeline de Trazabilidad</span>
                    <Badge variant="outline" className="text-[10px] h-5 ml-1">
                      {eventos.length} eventos
                    </Badge>
                  </div>
                  <ChevronDown className={cn(
                    'h-4 w-4 text-gray-400 transition-transform',
                    timelineOpen && 'rotate-180'
                  )} />
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-4 pb-4 border-t">
                  <div className="pt-4 space-y-3">
                    {eventos.map((evento: any, idx: number) => {
                      const tipo = evento.tipo || ''
                      const iconMap: Record<string, { icon: typeof ShoppingCart; color: string }> = {
                        'oc_generada': { icon: ShoppingCart, color: 'text-blue-500' },
                        'recepcion_en_almacen': { icon: Warehouse, color: 'text-green-500' },
                        'entrega_a_proyecto': { icon: Package, color: 'text-purple-500' },
                        'recepcion_confirmada': { icon: PackageCheck, color: 'text-green-600' },
                        'rechazo_recepcion': { icon: X, color: 'text-red-600' },
                        'rechazo_revertido': { icon: RefreshCw, color: 'text-amber-500' },
                      }
                      const { icon: Icon, color } = iconMap[tipo] || { icon: Activity, color: 'text-gray-500' }

                      return (
                        <div key={evento.id || idx} className="flex items-start gap-3 text-xs">
                          <Icon className={cn('h-3.5 w-3.5 flex-shrink-0 mt-0.5', color)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-gray-700">{evento.descripcion}</p>
                            <p className="text-muted-foreground text-[10px]">
                              {formatDate(evento.fechaEvento || evento.fecha)} • {evento.user?.name || evento.usuario?.nombre || evento.usuario?.name || 'Sistema'}
                            </p>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        )}
      </div>

      {/* Modal de edición de item */}
      <Dialog
        open={!!editingItem.item}
        onOpenChange={(open) => !open && setEditingItem({ item: null, cantidadAtendida: 0, estado: 'pendiente', fechaEntregaReal: '', observacionesEntrega: '' })}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              Registrar Entrega
            </DialogTitle>
          </DialogHeader>
          {editingItem.item && (() => {
            const cantPedida = editingItem.item.cantidadPedida
            const cantAtendida = editingItem.cantidadAtendida
            const porcentaje = cantPedida > 0 ? Math.round((cantAtendida / cantPedida) * 100) : 0
            const esCompleta = cantAtendida >= cantPedida
            const esParcial = cantAtendida > 0 && cantAtendida < cantPedida
            const proveedor = (editingItem.item as any).listaEquipoItem?.proveedor?.nombre

            return (
              <div className="space-y-4">
                {/* Item info card */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-medium text-xs">{editingItem.item.codigo}</span>
                    <span className="text-[10px] text-muted-foreground bg-white px-1.5 py-0.5 rounded border">
                      {editingItem.item.unidad}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{editingItem.item.descripcion}</p>
                  {proveedor && (
                    <div className="flex items-center gap-1 text-[10px] text-blue-600">
                      <Building2 className="h-3 w-3" />
                      {proveedor}
                    </div>
                  )}
                </div>

                {/* Cantidad section */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium">Cantidad a entregar</label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-6 text-[10px] px-2"
                      onClick={() => setCantidadAtendida(cantPedida)}
                      disabled={esCompleta}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Entrega completa
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex-1">
                      <Input
                        type="number"
                        min={0}
                        max={cantPedida}
                        value={cantAtendida}
                        onChange={(e) => setCantidadAtendida(Number(e.target.value))}
                        className="h-9 text-sm font-medium"
                      />
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      / {cantPedida} {editingItem.item.unidad}
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-2">
                    <Progress
                      value={porcentaje}
                      className={cn('h-2', esCompleta && '[&>div]:bg-green-500', esParcial && '[&>div]:bg-amber-500')}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1 text-right">{porcentaje}%</p>
                  </div>
                </div>

                {/* Fecha de entrega - solo mostrar si hay cantidad atendida */}
                {cantAtendida > 0 && (
                  <div>
                    <label className="text-xs font-medium mb-1 block">Fecha de Entrega</label>
                    <Input
                      type="date"
                      value={editingItem.fechaEntregaReal}
                      onChange={(e) => setEditingItem(prev => ({
                        ...prev,
                        fechaEntregaReal: e.target.value
                      }))}
                      className="h-9 text-xs"
                    />
                  </div>
                )}

                {/* Observaciones */}
                <div>
                  <label className="text-xs font-medium mb-1 block">Observaciones</label>
                  <textarea
                    value={editingItem.observacionesEntrega}
                    onChange={(e) => setEditingItem(prev => ({
                      ...prev,
                      observacionesEntrega: e.target.value
                    }))}
                    placeholder="Ej: Entrega parcial, pendiente 2 unidades para la siguiente semana..."
                    rows={2}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                </div>

                {/* Estado resultante - banner prominente */}
                <div className={cn(
                  'rounded-lg px-3 py-2 flex items-center gap-2 text-xs font-medium border',
                  cantAtendida === 0 && 'bg-gray-50 text-gray-600 border-gray-200',
                  esParcial && 'bg-amber-50 text-amber-700 border-amber-200',
                  esCompleta && 'bg-green-50 text-green-700 border-green-200',
                )}>
                  <span className={cn(
                    'w-2 h-2 rounded-full',
                    cantAtendida === 0 && 'bg-gray-400',
                    esParcial && 'bg-amber-500',
                    esCompleta && 'bg-green-500',
                  )} />
                  Estado resultante: {cantAtendida === 0 ? 'Pendiente' : esCompleta ? 'Entregado' : 'Parcial'}
                </div>

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingItem({ item: null, cantidadAtendida: 0, estado: 'pendiente', fechaEntregaReal: '', observacionesEntrega: '' })}
                    className="h-8 text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={saveItemEdit}
                    disabled={updating}
                    className={cn(
                      'h-8 text-xs',
                      esCompleta && 'bg-green-600 hover:bg-green-700',
                    )}
                  >
                    <Save className="h-3 w-3 mr-1" />
                    {updating ? 'Guardando...' : esCompleta ? 'Confirmar Entrega' : 'Guardar'}
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog para Generar OCs */}
      <Dialog open={showGenerarOC} onOpenChange={setShowGenerarOC}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
              Generar Órdenes de Compra
            </DialogTitle>
          </DialogHeader>
          {(() => {
            const { grupos, sinProveedor, conOC } = calcularGruposProveedor()
            const gruposActivos = grupos.filter(g => proveedoresSeleccionados.has(g.id))
            const totalItems = gruposActivos.reduce((s, g) => s + g.items.length, 0)
            const totalMonto = gruposActivos.reduce((s, g) => s + g.monto, 0)
            const cantidadOCs = gruposActivos.length

            return (
              <div className="space-y-4">
                {/* Resumen */}
                <div className="bg-blue-50 rounded-lg p-3 text-xs">
                  <p className="font-medium text-blue-800 mb-1">
                    Se crearán {cantidadOCs} OC{cantidadOCs !== 1 ? 's' : ''} con {totalItems} items
                  </p>
                  <p className="text-blue-600">
                    Cada OC se genera por proveedor en estado borrador
                  </p>
                </div>

                {/* Fecha necesaria informativa */}
                {grupos.length > 0 && pedido?.fechaNecesaria && (
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-500 bg-gray-50 rounded px-2.5 py-1.5">
                    <Calendar className="h-3 w-3" />
                    <span>El proyecto necesita este pedido para: <strong className="text-gray-700">
                      {new Date(pedido.fechaNecesaria).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                    </strong></span>
                  </div>
                )}

                {/* Grupos por proveedor con fecha individual */}
                {grupos.length > 0 ? (
                  <div className="space-y-2.5 max-h-[340px] overflow-y-auto">
                    {grupos.map(grupo => {
                      const isChecked = proveedoresSeleccionados.has(grupo.id)
                      const fechaNecStr = pedido?.fechaNecesaria
                        ? new Date(pedido.fechaNecesaria).toISOString().split('T')[0]
                        : ''
                      const fechaProv = fechasEntregaOC[grupo.id] || ''
                      const superaFecha = fechaProv && fechaNecStr && fechaProv > fechaNecStr
                      const fechaSugerida = grupo.maxTiempoEntregaDias > 0
                        ? new Date(Date.now() + grupo.maxTiempoEntregaDias * 86400000).toISOString().split('T')[0]
                        : null

                      return (
                        <div key={grupo.id} className={cn(
                          'border rounded-lg px-3 py-2.5 space-y-2 transition-opacity',
                          isChecked ? 'bg-white' : 'bg-gray-50 opacity-60'
                        )}>
                          <div className="flex items-center gap-2.5">
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={(checked) => {
                                setProveedoresSeleccionados(prev => {
                                  const next = new Set(prev)
                                  if (checked) next.add(grupo.id)
                                  else next.delete(grupo.id)
                                  return next
                                })
                              }}
                              className="h-4 w-4 flex-shrink-0"
                            />
                            <div className="flex items-center gap-2 min-w-0 flex-1">
                              <Building2 className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-medium truncate">{grupo.nombre}</p>
                                <p className="text-[10px] text-muted-foreground">
                                  {grupo.items.length} item{grupo.items.length !== 1 ? 's' : ''} — {monedaOC} {formatCurrency(grupo.monto).replace('US$', '').trim()}
                                </p>
                              </div>
                            </div>
                          </div>
                          {isChecked && (
                            <div className="pl-6">
                              <label className="text-[10px] font-medium text-muted-foreground mb-0.5 block">
                                Fecha entrega estimada <span className="text-red-500">*</span>
                              </label>
                              <Input
                                type="date"
                                value={fechaProv}
                                onChange={(e) => setFechasEntregaOC(prev => ({ ...prev, [grupo.id]: e.target.value }))}
                                className="h-7 text-xs"
                              />
                              {!fechaProv && (
                                <p className="text-[9px] text-red-500 mt-0.5">Requerido</p>
                              )}
                              {superaFecha && (
                                <div className="flex items-center gap-1 text-[9px] text-amber-700 mt-0.5">
                                  <AlertTriangle className="h-2.5 w-2.5 flex-shrink-0" />
                                  <span>Supera la fecha necesaria del proyecto</span>
                                </div>
                              )}
                              {fechaSugerida && (
                                <p className="text-[9px] text-blue-600 mt-0.5">
                                  Sugerido por tiempo de entrega ({grupo.maxTiempoEntregaDias}d): {new Date(fechaSugerida).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}

                    {/* Info text */}
                    {grupos.length > 1 && (
                      <p className="text-[10px] text-muted-foreground italic px-1">
                        Los proveedores no seleccionados podrán generar su OC más adelante desde este mismo pedido.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-3">
                    <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto" />
                    <div>
                      <p className="text-xs font-medium text-gray-700">No hay items elegibles para generar OCs</p>
                      {sinProveedor > 0 && conOC === 0 && (
                        <p className="text-[11px] text-muted-foreground mt-2 max-w-xs mx-auto">
                          Los items de este pedido no tienen proveedor asignado. Para generar OCs, primero seleccione un proveedor en la cotización de cada item desde la Lista de Equipo.
                        </p>
                      )}
                      {conOC > 0 && sinProveedor === 0 && (
                        <p className="text-[11px] text-muted-foreground mt-2">
                          Todos los items ya tienen una Orden de Compra vinculada.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Warnings */}
                {(sinProveedor > 0 || conOC > 0) && (
                  <div className="space-y-1.5">
                    {sinProveedor > 0 && (
                      <div className="flex items-start gap-2 text-[10px] text-amber-700 bg-amber-50 rounded px-2.5 py-1.5">
                        <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                        <span>
                          <strong>{sinProveedor} item{sinProveedor !== 1 ? 's' : ''} sin proveedor</strong> — para incluirlos, asigne proveedor desde la Lista de Equipo (seleccionar cotización)
                        </span>
                      </div>
                    )}
                    {conOC > 0 && (
                      <div className="flex items-center gap-2 text-[10px] text-blue-600 bg-blue-50 rounded px-2.5 py-1.5">
                        <CheckCircle2 className="h-3 w-3 flex-shrink-0" />
                        {conOC} item{conOC !== 1 ? 's' : ''} ya tienen OC vinculada
                      </div>
                    )}
                  </div>
                )}

                {/* Opciones globales */}
                {grupos.length > 0 && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Moneda</label>
                      <select
                        value={monedaOC}
                        onChange={(e) => setMonedaOC(e.target.value)}
                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="USD">USD</option>
                        <option value="PEN">PEN</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-muted-foreground mb-1 block">Condición de Pago</label>
                      <select
                        value={condicionPagoOC}
                        onChange={(e) => setCondicionPagoOC(e.target.value)}
                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs"
                      >
                        <option value="contado">Contado</option>
                        <option value="credito">Crédito</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Total */}
                {grupos.length > 0 && (
                  <div className="flex items-center justify-between border-t pt-3">
                    <span className="text-xs text-muted-foreground">Total estimado</span>
                    <span className="text-sm font-bold text-emerald-600">{formatCurrency(totalMonto)}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGenerarOC(false)}
                    className="h-8 text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleGenerarOCs}
                    disabled={generandoOC || cantidadOCs === 0 || gruposActivos.some(g => !fechasEntregaOC[g.id])}
                    className="h-8 text-xs"
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    {generandoOC ? 'Generando...' : `Generar ${cantidadOCs} OC${cantidadOCs !== 1 ? 's' : ''}`}
                  </Button>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Modal detalle de rechazo */}
      <Dialog open={!!rechazoDetalleModal} onOpenChange={(open) => { if (!open) { setRechazoDetalleModal(null); setRevertirRechazo({ confirmando: false, motivo: '', procesando: false }) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium flex items-center gap-2 text-red-700">
              <AlertCircle className="h-4 w-4" />
              Recepción Rechazada
            </DialogTitle>
          </DialogHeader>
          {rechazoDetalleModal && (
            <div className="space-y-3 text-xs">
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                <div>
                  <span className="text-muted-foreground">Item rechazado</span>
                  <p className="font-medium">{rechazoDetalleModal.cantidadRecibida} x {rechazoDetalleModal.itemCodigo} — {rechazoDetalleModal.itemDescripcion}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Motivo del rechazo</span>
                  <p className="font-medium text-red-700">{rechazoDetalleModal.motivoRechazo || rechazoDetalleModal.observaciones || 'Sin motivo registrado'}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground">Rechazado por</span>
                  <p className="font-medium">{rechazoDetalleModal.rechazadoPor?.name || 'No registrado'}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Fecha de rechazo</span>
                  <p className="font-medium">{rechazoDetalleModal.fechaRechazo ? formatDate(rechazoDetalleModal.fechaRechazo) : 'No registrada'}</p>
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Desde OC</span>
                <p className="font-medium">{rechazoDetalleModal.ordenCompraItem?.ordenCompra?.numero || 'N/A'}</p>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-[10px] font-medium text-amber-800 mb-1">Posibles acciones:</p>
                <ul className="text-[10px] text-amber-700 space-y-0.5 list-disc list-inside">
                  <li>Contactar proveedor para reenvío</li>
                  <li>Solicitar nuevo pedido</li>
                  <li>Gestionar garantía / devolución</li>
                </ul>
              </div>
              {/* Revertir rechazo — solo admin/gerente */}
              {['admin', 'gerente'].includes(session?.user?.role || '') && (
                <>
                  {!revertirRechazo.confirmando ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full h-8 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                      onClick={() => setRevertirRechazo({ confirmando: true, motivo: '', procesando: false })}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Revertir rechazo
                    </Button>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                      <p className="text-[11px] font-medium text-amber-800">
                        ¿Revertir este rechazo? El item volverá a estado pendiente.
                      </p>
                      <Textarea
                        placeholder="Motivo de reversión (opcional)..."
                        value={revertirRechazo.motivo}
                        onChange={(e) => setRevertirRechazo(prev => ({ ...prev, motivo: e.target.value }))}
                        rows={2}
                        className="text-xs"
                      />
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[10px]"
                          disabled={revertirRechazo.procesando}
                          onClick={() => setRevertirRechazo({ confirmando: false, motivo: '', procesando: false })}
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 text-[10px] bg-amber-600 hover:bg-amber-700"
                          disabled={revertirRechazo.procesando}
                          onClick={async () => {
                            setRevertirRechazo(prev => ({ ...prev, procesando: true }))
                            try {
                              const res = await fetch(`/api/recepcion-pendiente/${rechazoDetalleModal.id}/revertir`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ observaciones: revertirRechazo.motivo }),
                              })
                              if (!res.ok) {
                                const data = await res.json()
                                throw new Error(data.error || 'Error al revertir')
                              }
                              toast.success('Rechazo revertido. Item vuelve a pendiente.')
                              setRechazoDetalleModal(null)
                              setRevertirRechazo({ confirmando: false, motivo: '', procesando: false })
                              await cargarDatos()
                            } catch (err: any) {
                              toast.error(err.message || 'Error al revertir rechazo')
                              setRevertirRechazo(prev => ({ ...prev, procesando: false }))
                            }
                          }}
                        >
                          Confirmar reversión
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => { setRechazoDetalleModal(null); setRevertirRechazo({ confirmando: false, motivo: '', procesando: false }) }}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}