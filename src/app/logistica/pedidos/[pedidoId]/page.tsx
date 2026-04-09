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
import PedidoEstadoFlujoBanner from '@/components/equipos/PedidoEstadoFlujoBanner'

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Wrench,
} from 'lucide-react'
import TipoItemBadge from '@/components/shared/TipoItemBadge'

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

  // 📋 Estado para crear Requerimiento de Materiales
  const [showCrearREQ, setShowCrearREQ] = useState(false)
  const [reqItemsSelected, setReqItemsSelected] = useState<Set<string>>(new Set())

  // Inicializar items del modal REQ al abrirlo
  useEffect(() => {
    if (showCrearREQ && pedido?.items) {
      const initial = new Set<string>()
      for (const item of pedido.items) {
        const tieneOC = ((item as any).ordenCompraItems?.length ?? 0) > 0
        const tieneREQ = itemTieneREQActivo(item as any)
        const estadoItem = (item as any).estado
        if (!tieneOC && !tieneREQ && !['cancelado', 'entregado'].includes(estadoItem)) initial.add(item.id)
      }
      setReqItemsSelected(initial)
    }
  }, [showCrearREQ])

  const handleIrACrearREQ = () => {
    if (reqItemsSelected.size === 0) { toast.error('Selecciona al menos un item'); return }
    const itemIds = Array.from(reqItemsSelected).join(',')
    window.open(
      `/gastos/mis-requerimientos/nuevo?tipo=compra_materiales&pedidoCodigo=${encodeURIComponent(pedido!.codigo)}&itemIds=${itemIds}`,
      '_blank',
      'noopener,noreferrer'
    )
    setShowCrearREQ(false)
  }

  // 🛒 Estado para generar OCs
  const [showGenerarOC, setShowGenerarOC] = useState(false)
  const [generandoOC, setGenerandoOC] = useState(false)
  const [monedaOC, setMonedaOC] = useState('USD')
  const [condicionPagoOC, setCondicionPagoOC] = useState('contado')
  const [ocFechaGlobal, setOcFechaGlobal] = useState('')
  const [ocItemsState, setOcItemsState] = useState<Record<string, { selected: boolean; proveedorId: string; proveedorNombre: string }>>({})
  const [ocProveedorFiltro, setOcProveedorFiltro] = useState('__all__')

  // Estados de REQ que bloquean la creación de OC para ese item
  // Solo 'rechazado' libera el item — borrador/enviado también bloquean
  const REQ_ESTADOS_ACTIVOS = ['borrador', 'enviado', 'aprobado', 'depositado', 'rendido', 'validado', 'cerrado']

  const itemTieneREQActivo = (item: any) =>
    ((item.requerimientoMaterialItems || []) as any[]).some(
      r => REQ_ESTADOS_ACTIVOS.includes(r.hojaDeGastos?.estado)
    )

  // Inicializar items del modal al abrirlo
  useEffect(() => {
    if (showGenerarOC && pedido?.items) {
      const initial: Record<string, { selected: boolean; proveedorId: string; proveedorNombre: string }> = {}
      for (const item of pedido.items) {
        const tieneOC = ((item as any).ordenCompraItems?.length ?? 0) > 0
        const tieneREQ = itemTieneREQActivo(item as any)
        const estadoItem = (item as any).estado
        if (!tieneOC && !tieneREQ && !['cancelado', 'entregado'].includes(estadoItem)) {
          const provId = (item as any).proveedorId || (item as any).listaEquipoItem?.proveedorId || ''
          const provNombre = (item as any).proveedor?.nombre || (item as any).proveedorNombre || (item as any).listaEquipoItem?.proveedor?.nombre || ''
          initial[item.id] = { selected: !!provId, proveedorId: provId, proveedorNombre: provNombre }
        }
      }
      setOcItemsState(initial)
      setOcProveedorFiltro('__all__')
    }
  }, [showGenerarOC])

  // 📦 Estado para edición de items
  const [editingItem, setEditingItem] = useState<{
    item: PedidoEquipoItem | null
    cantidadAtendida: number
    estado: string
    fechaEntregaReal: string
    observacionesEntrega: string
    motivoAtencionDirecta: string
    costoRealUnitario: string
    costoRealMoneda: string
    precioUnitario: string
    precioMoneda: string
    tipoCambio: string
    tiempoEntregaDias: string
  }>({ item: null, cantidadAtendida: 0, estado: 'pendiente', fechaEntregaReal: '', observacionesEntrega: '', motivoAtencionDirecta: '', costoRealUnitario: '', costoRealMoneda: 'USD', precioUnitario: '', precioMoneda: 'USD', tipoCambio: '', tiempoEntregaDias: '' })

  const resetEditingItem = () => setEditingItem({ item: null, cantidadAtendida: 0, estado: 'pendiente', fechaEntregaReal: '', observacionesEntrega: '', motivoAtencionDirecta: '', costoRealUnitario: '', costoRealMoneda: 'USD', precioUnitario: '', precioMoneda: 'USD', tipoCambio: '', tiempoEntregaDias: '' })

  // ✏️ Estado para edición inline de T.Entrega y F.Entrega
  const [inlineEdit, setInlineEdit] = useState<{ itemId: string; field: 'tiempoEntrega' | 'fechaEntregaEstimada'; value: string } | null>(null)
  const [savingInline, setSavingInline] = useState(false)

  const startInlineEdit = (itemId: string, field: 'tiempoEntrega' | 'fechaEntregaEstimada', currentValue: string) => {
    setInlineEdit({ itemId, field, value: currentValue })
  }

  const saveInlineEdit = async () => {
    if (!inlineEdit || savingInline) return
    const item = pedido?.items?.find(i => i.id === inlineEdit.itemId)
    if (!item) return

    setSavingInline(true)
    try {
      const tieneOC = ((item as any).ordenCompraItems?.length ?? 0) > 0

      if (inlineEdit.field === 'tiempoEntrega') {
        if (tieneOC) {
          // Items with OC: save as text (tiempoEntrega)
          await updatePedidoEquipoItem(inlineEdit.itemId, {
            cantidadPedida: item.cantidadPedida,
            tiempoEntrega: inlineEdit.value || undefined,
          })
        } else {
          // Items without OC: save as days (tiempoEntregaDias + tiempoEntrega text)
          const dias = inlineEdit.value ? parseInt(inlineEdit.value) : undefined
          await updatePedidoEquipoItem(inlineEdit.itemId, {
            cantidadPedida: item.cantidadPedida,
            tiempoEntregaDias: dias,
            tiempoEntrega: dias != null ? `${dias} día${dias !== 1 ? 's' : ''}` : undefined,
          })
        }
      } else {
        await updatePedidoEquipoItem(inlineEdit.itemId, {
          cantidadPedida: item.cantidadPedida,
          fechaEntregaEstimada: inlineEdit.value || undefined,
        })
      }

      toast.success(inlineEdit.field === 'tiempoEntrega' ? 'T. Entrega actualizado' : 'F. Entrega actualizada')
      await cargarDatos()
    } catch {
      toast.error('Error al guardar')
    } finally {
      setSavingInline(false)
      setInlineEdit(null)
    }
  }

  const cancelInlineEdit = () => setInlineEdit(null)

  // 🏪 Estado para asignación de proveedor inline
  const [proveedores, setProveedores] = useState<{ id: string; nombre: string }[]>([])
  const [proveedoresCargados, setProveedoresCargados] = useState(false)
  const [savingProveedor, setSavingProveedor] = useState<string | null>(null)

  const cargarProveedores = async () => {
    if (proveedoresCargados) return
    try {
      const res = await fetch('/api/proveedor')
      const data = await res.json()
      setProveedores(data)
      setProveedoresCargados(true)
    } catch {
      toast.error('Error al cargar proveedores')
    }
  }

  const handleAsignarProveedor = async (itemId: string, proveedorId: string, cantidadPedida: number) => {
    const prov = proveedores.find(p => p.id === proveedorId)
    if (!prov) return
    setSavingProveedor(itemId)
    try {
      await updatePedidoEquipoItem(itemId, {
        cantidadPedida,
        proveedorId: prov.id,
        proveedorNombre: prov.nombre,
      })
      toast.success(`Proveedor "${prov.nombre}" asignado`)
      await cargarDatos()
    } catch {
      toast.error('Error al asignar proveedor')
    } finally {
      setSavingProveedor(null)
    }
  }

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
    const fechaReal = (item as any).fechaEntregaReal
      ? new Date((item as any).fechaEntregaReal).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    setEditingItem({
      item,
      cantidadAtendida: item.cantidadAtendida || 0,
      estado: item.estado || 'pendiente',
      fechaEntregaReal: fechaReal,
      observacionesEntrega: (item as any).observacionesEntrega || '',
      motivoAtencionDirecta: (item as any).motivoAtencionDirecta || '',
      costoRealUnitario: (item as any).costoRealUnitario ? String((item as any).costoRealUnitario) : '',
      costoRealMoneda: (item as any).costoRealMoneda || 'USD',
      precioUnitario: item.precioUnitario ? String(item.precioUnitario) : '',
      precioMoneda: (item as any).precioUnitarioMoneda || 'USD',
      tipoCambio: (item as any).tipoCambioEntrega ? String((item as any).tipoCambioEntrega) : '',
      tiempoEntregaDias: (item as any).tiempoEntregaDias ? String((item as any).tiempoEntregaDias) : '',
    })
  }

  // Allow values above cantidadPedida (excess delivery) but not below 0
  const setCantidadAtendida = (value: number) => {
    if (!editingItem.item) return
    const clamped = Math.max(0, value)
    setEditingItem(prev => ({ ...prev, cantidadAtendida: clamped }))
  }

  // 📦 Guardar cambios del item (POST /entrega para trazabilidad completa)
  const saveItemEdit = async () => {
    if (!editingItem.item) return

    const tieneOC = ((editingItem.item as any).ordenCompraItems?.length ?? 0) > 0
    const esServicio = (editingItem.item as any).tipoItem === 'servicio'

    // Validaciones para atención directa (solo equipos/consumibles sin OC)
    if (!esServicio && !tieneOC && editingItem.cantidadAtendida > 0 && !editingItem.motivoAtencionDirecta) {
      toast.error('Debe seleccionar un motivo de atención directa')
      return
    }
    if (editingItem.motivoAtencionDirecta === 'importacion_gerencia' && editingItem.cantidadAtendida > 0) {
      if (!editingItem.costoRealUnitario || parseFloat(editingItem.costoRealUnitario) <= 0) {
        toast.error('El costo real de adquisición es obligatorio para importaciones de gerencia')
        return
      }
    }

    // Validación servicio: requiere fecha y costo
    if (esServicio && !editingItem.fechaEntregaReal) {
      toast.error('Debe indicar la fecha de ejecución del servicio')
      return
    }
    if (esServicio && (!editingItem.precioUnitario || parseFloat(editingItem.precioUnitario) <= 0)) {
      toast.error('Debe indicar el costo del servicio')
      return
    }

    try {
      setUpdating(true)

      let estadoEntrega: string = 'pendiente'
      let cantidadFinal = editingItem.cantidadAtendida

      if (esServicio) {
        // Servicios: confirmar ejecución completa directamente
        cantidadFinal = editingItem.item.cantidadPedida
        estadoEntrega = 'entregado'
      } else if (cantidadFinal === 0) {
        estadoEntrega = 'pendiente'
      } else if (cantidadFinal >= editingItem.item.cantidadPedida) {
        estadoEntrega = 'entregado'
      } else if (cantidadFinal > 0) {
        estadoEntrega = 'parcial'
      }

      const payload: Record<string, any> = {
        pedidoEquipoItemId: editingItem.item.id,
        estadoEntrega,
        cantidadAtendida: cantidadFinal,
        fechaEntregaReal: (cantidadFinal > 0 || esServicio) ? editingItem.fechaEntregaReal : undefined,
        observacionesEntrega: editingItem.observacionesEntrega || undefined,
      }

      // Precio unitario
      if (editingItem.precioUnitario && parseFloat(editingItem.precioUnitario) > 0) {
        const precioIngresado = parseFloat(editingItem.precioUnitario)
        const tc = parseFloat(editingItem.tipoCambio)
        const esPEN = editingItem.precioMoneda === 'PEN'

        if (esPEN && tc > 0) {
          // Guardar en USD para presupuesto (precio ÷ TC)
          payload.precioUnitario = Math.round((precioIngresado / tc) * 10000) / 10000
          // Guardar precio original en soles para administración
          payload.costoRealUnitario = precioIngresado
          payload.costoRealMoneda = 'PEN'
        } else if (esPEN && !(tc > 0)) {
          toast.error('Debes ingresar el tipo de cambio para registrar un precio en soles')
          return
        } else {
          payload.precioUnitario = precioIngresado
        }

        payload.precioUnitarioMoneda = editingItem.precioMoneda || 'USD'
        if (esPEN && tc > 0) payload.tipoCambioEntrega = tc
      }

      // Tiempo de entrega en días
      if (editingItem.tiempoEntregaDias && parseInt(editingItem.tiempoEntregaDias) >= 0) {
        const dias = parseInt(editingItem.tiempoEntregaDias)
        payload.tiempoEntregaDias = dias
        payload.tiempoEntrega = `${dias} día${dias !== 1 ? 's' : ''}`
      }

      // Campos de atención directa (solo sin OC y no servicio)
      if (!esServicio && !tieneOC && editingItem.motivoAtencionDirecta) {
        payload.motivoAtencionDirecta = editingItem.motivoAtencionDirecta
        if (editingItem.motivoAtencionDirecta === 'importacion_gerencia' && editingItem.costoRealUnitario) {
          payload.costoRealUnitario = parseFloat(editingItem.costoRealUnitario)
          payload.costoRealMoneda = editingItem.costoRealMoneda
        }
      }

      const res = await fetch(`/api/pedido-equipo-item/${editingItem.item.id}/entrega`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || 'Error al registrar entrega')
      }

      toast.success('Entrega registrada correctamente')
      await cargarDatos()
      resetEditingItem()
    } catch (err: any) {
      toast.error(err.message || 'Error al registrar entrega')
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
    const progreso = totalItems > 0 ? Math.min(100, (itemsEntregados / totalItems) * 100) : 0

    return { progreso, itemsEntregados, totalItems }
  }

  const { progreso, itemsEntregados, totalItems } = calcularProgreso()

  const handleIrACrearOC = () => {
    const seleccionados = Object.entries(ocItemsState).filter(([, v]) => v.selected)
    if (seleccionados.length === 0) { toast.error('Selecciona al menos un item'); return }
    const itemIds = seleccionados.map(([id]) => id).join(',')
    const proyectoId = (pedido as any)?.proyecto?.id || ''
    router.push(`/logistica/ordenes-compra/nueva?proyectoId=${proyectoId}&pedidoItems=${itemIds}`)
  }

  // Estado para rechazo de recepción
  const [rechazarDialog, setRechazarDialog] = useState<{ open: boolean; recepcionId: string | null }>({ open: false, recepcionId: null })
  const [rechazarObservaciones, setRechazarObservaciones] = useState('')
  const [procesandoRecepcion, setProcesandoRecepcion] = useState<string | null>(null)
  const [rechazoDetalleModal, setRechazoDetalleModal] = useState<any>(null)
  const [revertirRechazo, setRevertirRechazo] = useState<{ confirmando: boolean; motivo: string; procesando: boolean }>({ confirmando: false, motivo: '', procesando: false })

  // Revertir entrega directa
  const [revirtiendoItemId, setRevirtiendoItemId] = useState<string | null>(null)
  const handleRevertirEntrega = async (itemId: string, itemDescripcion: string) => {
    if (!confirm(`¿Revertir la entrega de "${itemDescripcion}"?\n\nEl item volverá a estado Pendiente y podrás crear la OC correctamente.`)) return
    setRevirtiendoItemId(itemId)
    try {
      const res = await fetch(`/api/pedido-equipo-item/${itemId}/revertir-entrega`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: 'Reversión para regularización con Orden de Compra' }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Error al revertir')
      }
      toast.success('Entrega revertida. El item está nuevamente pendiente.')
      await cargarDatos()
    } catch (err: any) {
      toast.error(err.message || 'Error al revertir entrega')
    } finally {
      setRevirtiendoItemId(null)
    }
  }

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
  const puedeGenerarOC = ['admin', 'gerente', 'logistico', 'coordinador_logistico'].includes(userRole)
    && pedido !== null
    && ['enviado', 'atendido', 'parcial'].includes(pedido?.estado || '')
  const puedeConfirmarRecepcion = ['admin', 'gerente', 'logistico', 'coordinador_logistico', 'gestor'].includes(userRole)

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
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowCrearREQ(true)}
                    className="h-7 text-xs"
                  >
                    <FileText className="h-3 w-3 mr-1" />
                    Crear Requerimiento
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowGenerarOC(true)}
                    className="h-7 text-xs"
                  >
                    <ShoppingCart className="h-3 w-3 mr-1" />
                    Crear OC
                  </Button>
                </>
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
        {/* Flujo de estado + rollback */}
        <PedidoEstadoFlujoBanner
          estado={pedido.estado}
          pedidoId={pedido.id}
          contexto="logistica"
          onUpdated={() => cargarDatos()}
        />

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

          // Helper: REQ activo (aprobado en adelante)
          const getREQActivo = (i: any) =>
            ((i.requerimientoMaterialItems || []) as any[]).find(
              r => REQ_ESTADOS_ACTIVOS.includes(r.hojaDeGastos?.estado)
            )

          // 🔴 Sin proveedor (excluyendo items con REQ activo)
          const sinProveedor = items.filter((i: any) => {
            const provId = i.proveedorId || i.listaEquipoItem?.proveedorId
            return !provId && !getREQActivo(i)
          })
          // Items con proveedor
          const conProveedor = items.filter((i: any) => {
            const provId = i.proveedorId || i.listaEquipoItem?.proveedorId
            return !!provId
          })
          // 🟡 Con proveedor pero sin OC y sin REQ activo
          const sinOC = conProveedor.filter((i: any) => !(i.ordenCompraItems?.length > 0) && !getREQActivo(i))
          // Items con OC
          const conOC = items.filter((i: any) => i.ordenCompraItems?.length > 0)
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
          // 🟦 Items gestionados por REQ — por estado
          const reqEnBorrador = items.filter((i: any) => {
            const req = getREQActivo(i)
            return req && ['borrador', 'enviado'].includes(req.hojaDeGastos?.estado)
          })
          const reqEnProceso = items.filter((i: any) => {
            const req = getREQActivo(i)
            return req && ['aprobado', 'depositado', 'rendido', 'validado'].includes(req.hojaDeGastos?.estado)
          })
          const reqEsperandoRecepcion = items.filter((i: any) => {
            const req = getREQActivo(i)
            return req && req.hojaDeGastos?.estado === 'cerrado' && i.estado !== 'entregado'
          })
          // 🔴 Recepciones rechazadas
          const recepcionesRechazadas = items.flatMap((i: any) =>
            (i.recepcionesPendientes || [])
              .filter((r: any) => r.estado === 'rechazado')
              .map((r: any) => ({ ...r, itemCodigo: i.codigo, itemDescripcion: i.descripcion }))
          )
          // 🟤 Items entregados sin costo
          const sinCosto = items.filter((i: any) => (i.cantidadAtendida || 0) > 0 && (!i.costoTotal || i.costoTotal === 0))

          const hayAlertas = sinProveedor.length > 0 || sinOC.length > 0 || ocPendienteConfirmar.length > 0 || ocEsperandoRecepcion.length > 0 || reqEnBorrador.length > 0 || reqEnProceso.length > 0 || reqEsperandoRecepcion.length > 0 || recepcionesRechazadas.length > 0 || sinCosto.length > 0
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
                        const total = sinProveedor.length + sinOC.length + ocPendienteConfirmar.length + ocEsperandoRecepcion.length + reqEnBorrador.length + reqEnProceso.length + reqEsperandoRecepcion.length + recepcionesRechazadas.length + sinCosto.length
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
                            {(pedido as any).listaId
                              ? 'Asigna proveedor desde la Lista de Equipo antes de generar OC.'
                              : 'Asigna proveedor directamente en cada item o genera la OC y el sistema asignará el proveedor al confirmarla.'}
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
                              onClick={() => setShowGenerarOC(true)}
                            >
                              <ShoppingCart className="h-3 w-3 mr-1" />
                              Crear OC
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
                    {/* 🟠 REQ en borrador/enviado — bloquea OC, debe cancelarse primero */}
                    {reqEnBorrador.length > 0 && (
                      <div className="flex items-start gap-2 text-[11px] bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-amber-700">
                            {reqEnBorrador.length} item{reqEnBorrador.length !== 1 ? 's' : ''} {reqEnBorrador.length !== 1 ? 'tienen' : 'tiene'} un Requerimiento de dinero pendiente de aprobación
                          </p>
                          <p className="text-amber-600 mt-0.5">
                            Para crear una OC para {reqEnBorrador.length !== 1 ? 'estos items' : 'este item'}, el REQ debe ser rechazado o eliminado primero.
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {(() => {
                              const reqMap = new Map<string, { id: string; numero: string; estado: string }>()
                              reqEnBorrador.forEach((i: any) => {
                                const req = getREQActivo(i)
                                if (req && !reqMap.has(req.hojaDeGastos.id)) reqMap.set(req.hojaDeGastos.id, req.hojaDeGastos)
                              })
                              return Array.from(reqMap.values()).map(hoja => (
                                <Link
                                  key={hoja.id}
                                  href={`/gastos/mis-requerimientos/${hoja.id}`}
                                  className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 hover:text-amber-900 bg-white border border-amber-300 rounded px-1.5 py-0.5"
                                >
                                  {hoja.numero}
                                  <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-amber-300 capitalize">{hoja.estado}</Badge>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </Link>
                              ))
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* 🟦 REQ en proceso (empleado comprando) */}
                    {reqEnProceso.length > 0 && (
                      <div className="flex items-start gap-2 text-[11px] bg-cyan-50 border border-cyan-100 rounded-md px-3 py-2">
                        <Info className="h-3.5 w-3.5 text-cyan-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-cyan-700">
                            {reqEnProceso.length} item{reqEnProceso.length !== 1 ? 's' : ''} en proceso de compra por Requerimiento de dinero
                          </p>
                          <div className="flex flex-wrap gap-1.5 mt-1">
                            {(() => {
                              const reqMap = new Map<string, { id: string; numero: string; estado: string }>()
                              reqEnProceso.forEach((i: any) => {
                                const req = getREQActivo(i)
                                if (req && !reqMap.has(req.hojaDeGastos.id)) reqMap.set(req.hojaDeGastos.id, req.hojaDeGastos)
                              })
                              return Array.from(reqMap.values()).map(hoja => (
                                <Link
                                  key={hoja.id}
                                  href={`/gastos/mis-requerimientos/${hoja.id}`}
                                  className="inline-flex items-center gap-1 text-[10px] font-medium text-cyan-700 hover:text-cyan-900 bg-white border border-cyan-200 rounded px-1.5 py-0.5"
                                >
                                  {hoja.numero}
                                  <Badge variant="outline" className="text-[8px] h-3.5 px-1 border-cyan-200 capitalize">{hoja.estado}</Badge>
                                  <ExternalLink className="h-2.5 w-2.5" />
                                </Link>
                              ))
                            })()}
                          </div>
                        </div>
                      </div>
                    )}
                    {/* 🟦 REQ cerrado esperando recepción en almacén */}
                    {reqEsperandoRecepcion.length > 0 && (
                      <div className="flex items-start gap-2 text-[11px] bg-violet-50 border border-violet-100 rounded-md px-3 py-2">
                        <Warehouse className="h-3.5 w-3.5 text-violet-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-violet-700">
                            {reqEsperandoRecepcion.length} item{reqEsperandoRecepcion.length !== 1 ? 's' : ''} pendientes de recepción en almacén (compra por REQ)
                          </p>
                          <p className="text-violet-600 mt-0.5">
                            Confirma la llegada en <Link href="/logistica/recepciones" className="underline font-medium">Recepciones</Link>.
                          </p>
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
                    {/* 🟤 Items entregados sin costo */}
                    {sinCosto.length > 0 && (
                      <div className="flex items-start gap-2 text-[11px] bg-yellow-50 border border-yellow-200 rounded-md px-3 py-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-medium text-yellow-800">
                            {sinCosto.length} item{sinCosto.length !== 1 ? 's' : ''} entregado{sinCosto.length !== 1 ? 's' : ''} sin costo registrado — el costo del proyecto puede estar subestimado
                          </p>
                          <div className="mt-1.5 space-y-1">
                            {sinCosto.map((i: any) => (
                              <div key={i.id} className="flex items-center justify-between">
                                <span className="text-yellow-700">
                                  {i.codigo} — {i.descripcion}
                                </span>
                                <button
                                  onClick={() => openItemEdit(i)}
                                  className="text-[10px] text-yellow-700 hover:text-yellow-900 underline ml-2 flex-shrink-0"
                                >
                                  Registrar costo
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
                    <th className="px-3 py-2 text-center font-medium text-gray-600">En Req.</th>
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
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-medium">{item.codigo}</span>
                          <TipoItemBadge tipoItem={(item as any).tipoItem} catalogoEquipoId={(item as any).catalogoEquipoId} />
                        </div>
                      </td>
                      <td className="px-3 py-2 text-gray-600 max-w-[180px] truncate" title={item.descripcion}>
                        {item.descripcion}
                      </td>
                      <td className="px-3 py-2 text-gray-600 max-w-[160px]">
                        {(() => {
                          const provNombre = (item as any).proveedor?.nombre || (item as any).proveedorNombre || (item as any).listaEquipoItem?.proveedor?.nombre
                          const tieneProveedor = !!provNombre
                          const tieneOC = (item as any).ordenCompraItems?.length > 0
                          const atendido = (item.cantidadAtendida || 0) > 0
                          const motivo = (item as any).motivoAtencionDirecta
                          const reqItems: { id: string; hojaDeGastos: { id: string; numero: string; estado: string } }[] =
                            (item as any).requerimientoMaterialItems || []
                          const hdgEstadoStyles: Record<string, string> = {
                            borrador: 'bg-gray-100 text-gray-600',
                            enviado: 'bg-blue-100 text-blue-700',
                            aprobado: 'bg-green-100 text-green-700',
                            rechazado: 'bg-red-100 text-red-700',
                            depositado: 'bg-cyan-100 text-cyan-700',
                            rendido: 'bg-purple-100 text-purple-700',
                            validado: 'bg-emerald-100 text-emerald-700',
                            cerrado: 'bg-gray-100 text-gray-500',
                          }

                          return (
                            <>
                              {tieneProveedor ? (
                                <div className="truncate text-xs">{provNombre}</div>
                              ) : (
                                <div className="truncate text-gray-400 text-xs">—</div>
                              )}
                              {tieneOC && (
                                <Link
                                  href={`/logistica/ordenes-compra/${(item as any).ordenCompraItems[0].ordenCompra?.id}`}
                                  className="inline-flex items-center gap-0.5 text-[9px] text-blue-600 hover:underline mt-0.5"
                                >
                                  <ShoppingCart className="h-2.5 w-2.5" />
                                  {(item as any).ordenCompraItems[0].ordenCompra?.numero}
                                </Link>
                              )}
                              {reqItems.map(req => (
                                <Link
                                  key={req.id}
                                  href={`/gastos/mis-requerimientos/${req.hojaDeGastos.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={`inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5 rounded-full mt-0.5 font-medium hover:opacity-80 transition-opacity ${hdgEstadoStyles[req.hojaDeGastos.estado] || 'bg-gray-100 text-gray-600'}`}
                                >
                                  <FileText className="h-2.5 w-2.5" />
                                  {req.hojaDeGastos.numero} · {req.hojaDeGastos.estado}
                                </Link>
                              ))}
                              {!tieneOC && (() => {
                                if (atendido && motivo === 'importacion_gerencia') {
                                  return (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex items-center gap-0.5 text-[9px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full mt-0.5 font-medium">
                                            Importación
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent><p className="text-xs">Compra directa por gerencia / importación</p></TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )
                                }
                                if (atendido && motivo) {
                                  const motivoLabels: Record<string, string> = {
                                    'compra_directa': 'Compra directa en tienda / caja chica',
                                    'urgencia': 'Urgencia — sin tiempo para OC',
                                    'otro': 'Otro motivo',
                                  }
                                  return (
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <span className="inline-flex items-center gap-0.5 text-[9px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full mt-0.5 font-medium">
                                            Directo
                                          </span>
                                        </TooltipTrigger>
                                        <TooltipContent><p className="text-xs">{motivoLabels[motivo] || motivo}</p></TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  )
                                }
                                if ((item as any).proveedorId || (item as any).listaEquipoItem?.proveedorId) {
                                  return <span className="inline-flex items-center text-[9px] text-gray-400 mt-0.5">Sin OC</span>
                                }
                                return null
                              })()}
                            </>
                          )
                        })()}
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500">{item.unidad}</td>
                      <td className="px-3 py-2 text-center font-medium text-blue-600">
                        {item.cantidadPedida}
                      </td>
                      <td className={cn('px-3 py-2 text-center font-medium', (item.cantidadAtendida || 0) > item.cantidadPedida ? 'text-amber-600' : 'text-green-600')}>
                        {item.cantidadAtendida || 0}
                        {(item.cantidadAtendida || 0) > item.cantidadPedida && (
                          <span className="text-[9px] text-amber-500 ml-0.5">(+{(item.cantidadAtendida || 0) - item.cantidadPedida})</span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {(() => {
                          const reqs: { cantidadSolicitada?: number; hojaDeGastos: { estado: string } }[] =
                            (item as any).requerimientoMaterialItems || []
                          const enReq = reqs
                            .filter(r => REQ_ESTADOS_ACTIVOS.includes(r.hojaDeGastos?.estado))
                            .reduce((s, r) => s + (r.cantidadSolicitada || 0), 0)
                          if (enReq === 0) return <span className="text-gray-300">—</span>
                          return (
                            <span className="font-medium text-amber-600">{enReq}</span>
                          )
                        })()}
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
                          const tieneOC = ((item as any).ordenCompraItems?.length ?? 0) > 0

                          // Display text: prefer tiempoEntregaDias with singular/plural
                          const texto = ted != null
                            ? `${ted} día${ted !== 1 ? 's' : ''}`
                            : te || null

                          // Inline edit: numeric for items without OC, text for items with OC
                          if (inlineEdit?.itemId === item.id && inlineEdit.field === 'tiempoEntrega') {
                            return tieneOC ? (
                              <Input
                                autoFocus
                                type="text"
                                value={inlineEdit.value}
                                onChange={(e) => setInlineEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                                onBlur={saveInlineEdit}
                                onKeyDown={(e) => { if (e.key === 'Enter') saveInlineEdit(); if (e.key === 'Escape') cancelInlineEdit() }}
                                placeholder="Ej: Stock, 15d"
                                className="h-6 text-[10px] w-20 text-center px-1"
                                disabled={savingInline}
                              />
                            ) : (
                              <Input
                                autoFocus
                                type="number"
                                min={0}
                                step={1}
                                value={inlineEdit.value}
                                onChange={(e) => setInlineEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                                onBlur={saveInlineEdit}
                                onKeyDown={(e) => { if (e.key === 'Enter') saveInlineEdit(); if (e.key === 'Escape') cancelInlineEdit() }}
                                placeholder="días"
                                className="h-6 text-[10px] w-16 text-center px-1"
                                disabled={savingInline}
                              />
                            )
                          }

                          const focr = (item as any).fechaOrdenCompraRecomendada
                          const vencida = focr && new Date(focr) < new Date()
                          const editValue = tieneOC ? (te || '') : (ted != null ? String(ted) : '')

                          return (
                            <span
                              className={cn(
                                'text-[10px] cursor-pointer hover:bg-blue-50 hover:text-blue-700 rounded px-1.5 py-0.5 transition-colors',
                                !texto && 'text-gray-400',
                                texto && vencida && 'font-medium text-red-600',
                                texto && !vencida && 'text-gray-600',
                              )}
                              title="Click para editar"
                              onClick={() => startInlineEdit(item.id, 'tiempoEntrega', editValue)}
                            >
                              {texto || '—'}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {inlineEdit?.itemId === item.id && inlineEdit.field === 'fechaEntregaEstimada' ? (
                          <Input
                            autoFocus
                            type="date"
                            value={inlineEdit.value}
                            onChange={(e) => setInlineEdit(prev => prev ? { ...prev, value: e.target.value } : null)}
                            onBlur={saveInlineEdit}
                            onKeyDown={(e) => { if (e.key === 'Enter') saveInlineEdit(); if (e.key === 'Escape') cancelInlineEdit() }}
                            className="h-6 text-[10px] w-28 text-center px-1"
                            disabled={savingInline}
                          />
                        ) : (() => {
                          const fEstimada = (item as any).fechaEntregaEstimada
                          const fReal = (item as any).fechaEntregaReal
                          const fechaNec = pedido?.fechaNecesaria

                          // If already delivered, show real date (not editable)
                          if (fReal) {
                            return <span className="text-[10px] text-green-600">{formatDate(fReal)}</span>
                          }

                          const fEstStr = fEstimada ? new Date(fEstimada).toISOString().split('T')[0] : ''
                          const superaFecha = fEstimada && fechaNec && new Date(fEstimada) > new Date(fechaNec)

                          return (
                            <span
                              className={cn(
                                'text-[10px] cursor-pointer hover:bg-blue-50 hover:text-blue-700 rounded px-1.5 py-0.5 transition-colors',
                                !fEstimada && 'text-gray-400',
                                fEstimada && superaFecha && 'font-medium text-red-600',
                                fEstimada && !superaFecha && 'text-gray-600',
                              )}
                              title="Click para editar"
                              onClick={() => startInlineEdit(item.id, 'fechaEntregaEstimada', fEstStr)}
                            >
                              {fEstimada ? formatDate(fEstimada) : '—'}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-emerald-600">
                        {item.costoTotal ? formatCurrency(item.costoTotal) : '—'}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openItemEdit(item)}
                            className="h-6 text-[10px] px-2"
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Atender
                          </Button>
                          {['admin', 'gerente'].includes(userRole) &&
                            ['atendido', 'parcial', 'entregado'].includes(item.estado) &&
                            !(item as any).recepcionesPendientes?.some((r: any) => ['en_almacen', 'entregado_proyecto'].includes(r.estado)) && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRevertirEntrega(item.id, item.descripcion)}
                              disabled={revirtiendoItemId === item.id}
                              className="h-6 text-[10px] px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                              title="Revertir entrega directa para regularizar con OC"
                            >
                              {revirtiendoItemId === item.id
                                ? <span className="animate-spin">↻</span>
                                : '↩'}
                              {' '}Revertir
                            </Button>
                          )}
                        </div>
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
                  onClick={() => setShowGenerarOC(true)}
                  className="h-7 text-xs"
                >
                  <ShoppingCart className="h-3 w-3 mr-1" />
                  Crear OC
                </Button>
              )}
            </div>
          )}
        </div>

        {/* 📄 Requerimientos de Materiales vinculados */}
        {(() => {
          const items = pedido.items || []
          // Deduplicar hojas de gastos desde requerimientoMaterialItems de todos los items
          const hojasMap = new Map<string, { id: string; numero: string; estado: string }>()
          for (const item of items) {
            for (const req of ((item as any).requerimientoMaterialItems || []) as any[]) {
              if (req.hojaDeGastos && !hojasMap.has(req.hojaDeGastos.id)) {
                hojasMap.set(req.hojaDeGastos.id, req.hojaDeGastos)
              }
            }
          }
          const hojas = Array.from(hojasMap.values())
          const itemsConREQ = items.filter((i: any) =>
            ((i as any).requerimientoMaterialItems || []).length > 0
          ).length

          const hdgEstadoStyles: Record<string, string> = {
            borrador: 'bg-gray-100 text-gray-600 border-gray-200',
            enviado: 'bg-blue-100 text-blue-700 border-blue-200',
            aprobado: 'bg-green-100 text-green-700 border-green-200',
            rechazado: 'bg-red-100 text-red-700 border-red-200',
            depositado: 'bg-cyan-100 text-cyan-700 border-cyan-200',
            rendido: 'bg-purple-100 text-purple-700 border-purple-200',
            validado: 'bg-emerald-100 text-emerald-700 border-emerald-200',
            cerrado: 'bg-gray-100 text-gray-500 border-gray-200',
          }

          return (
            <div className="bg-white rounded-lg border">
              <div className="px-4 py-3 border-b bg-gray-50/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium">Requerimientos de Materiales</span>
                </div>
                <Badge variant="outline" className="text-[10px] h-5">
                  {itemsConREQ} de {items.length} items con REQ
                </Badge>
              </div>
              {hojas.length > 0 ? (
                <table className="w-full text-xs">
                  <thead className="bg-gray-50">
                    <tr className="border-b">
                      <th className="px-3 py-2 text-left font-medium text-gray-600">N° REQ</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600">Estado</th>
                      <th className="px-3 py-2 text-center font-medium text-gray-600">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {hojas.map(hoja => (
                      <tr key={hoja.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2 font-mono font-medium">{hoja.numero}</td>
                        <td className="px-3 py-2 text-center">
                          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 capitalize ${hdgEstadoStyles[hoja.estado] || ''}`}>
                            {hoja.estado}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <Button variant="ghost" size="sm" asChild className="h-6 text-[10px] px-2">
                            <Link href={`/gastos/mis-requerimientos/${hoja.id}`}>
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
                  <FileText className="h-8 w-8 text-gray-300 mb-2" />
                  <p className="text-xs text-muted-foreground">No hay requerimientos de dinero para este pedido.</p>
                </div>
              )}
            </div>
          )
        })()}

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
        onOpenChange={(open) => !open && resetEditingItem()}
      >
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              Registrar Entrega
            </DialogTitle>
          </DialogHeader>
          {editingItem.item && (() => {
            const cantPedida = editingItem.item.cantidadPedida
            const cantAtendida = editingItem.cantidadAtendida
            const porcentaje = cantPedida > 0 ? Math.min(100, Math.round((cantAtendida / cantPedida) * 100)) : 0
            const esExceso = cantAtendida > cantPedida
            const esCompleta = cantAtendida >= cantPedida
            const esParcial = cantAtendida > 0 && cantAtendida < cantPedida
            const proveedor = (editingItem.item as any).proveedor?.nombre || (editingItem.item as any).proveedorNombre || (editingItem.item as any).listaEquipoItem?.proveedor?.nombre
            const tieneOC = ((editingItem.item as any).ordenCompraItems?.length ?? 0) > 0
            const ocNumero = tieneOC ? (editingItem.item as any).ordenCompraItems[0]?.ordenCompra?.numero : null
            const userRole = session?.user?.role || ''
            const puedeEditarCosto = ['admin', 'gerente', 'socio'].includes(userRole)
            const esServicio = (editingItem.item as any).tipoItem === 'servicio'

            return (
              <div className="space-y-4">
                {/* Item info card */}
                <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-medium text-xs">{editingItem.item.codigo}</span>
                      <TipoItemBadge tipoItem={(editingItem.item as any).tipoItem} catalogoEquipoId={(editingItem.item as any).catalogoEquipoId} />
                    </div>
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

                {/* Aviso OC vinculada */}
                {tieneOC && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-700 flex items-start gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>Este item tiene OC <strong>{ocNumero}</strong> vinculada. Se recomienda usar el flujo de recepción de OC.</span>
                  </div>
                )}

                {esServicio ? (
                  <>
                    {/* Flujo servicio: confirmar ejecución */}
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 space-y-3">
                      <div className="flex items-center gap-2 text-purple-700 text-xs font-medium">
                        <Wrench className="h-3.5 w-3.5" />
                        Confirmar ejecución del servicio
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block text-purple-700">Fecha de ejecución *</label>
                        <Input
                          type="date"
                          value={editingItem.fechaEntregaReal}
                          onChange={(e) => setEditingItem(prev => ({ ...prev, fechaEntregaReal: e.target.value }))}
                          className="h-9 text-xs"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block text-purple-700">
                          Costo del servicio {!editingItem.precioUnitario && !editingItem.item?.precioUnitario ? '*' : ''}
                          {!editingItem.precioUnitario && !editingItem.item?.precioUnitario && (
                            <span className="ml-1 text-[10px] text-amber-600 font-normal">(sin costo registrado)</span>
                          )}
                        </label>
                        <div className={cn(
                          'flex items-center gap-2 rounded-md border px-3 py-1.5',
                          !editingItem.precioUnitario && !editingItem.item?.precioUnitario
                            ? 'border-amber-300 bg-amber-50'
                            : 'border-purple-200 bg-white'
                        )}>
                          <span className="text-xs text-muted-foreground">$</span>
                          <Input
                            type="number"
                            min={0}
                            step="0.01"
                            value={editingItem.precioUnitario}
                            onChange={(e) => setEditingItem(prev => ({ ...prev, precioUnitario: e.target.value }))}
                            placeholder="0.00"
                            className="h-7 text-sm font-medium border-0 p-0 focus-visible:ring-0 shadow-none"
                          />
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            × 1 global = <span className="font-medium text-emerald-600">
                              ${(parseFloat(editingItem.precioUnitario) || 0).toFixed(2)}
                            </span>
                          </span>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium mb-1 block text-purple-700">Observaciones</label>
                        <textarea
                          value={editingItem.observacionesEntrega}
                          onChange={(e) => setEditingItem(prev => ({ ...prev, observacionesEntrega: e.target.value }))}
                          placeholder="Ej: Servicio completado, incluye materiales..."
                          rows={2}
                          className="w-full rounded-md border border-purple-200 bg-white px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 resize-none"
                        />
                      </div>
                    </div>

                    {/* Estado resultante servicio */}
                    <div className="rounded-lg px-3 py-2 flex items-center gap-2 text-xs font-medium border bg-green-50 text-green-700 border-green-200">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Al confirmar, el servicio pasará a estado: Entregado
                    </div>

                    {/* Actions servicio */}
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetEditingItem}
                        className="h-8 text-xs"
                      >
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={saveItemEdit}
                        disabled={updating || !editingItem.fechaEntregaReal || !editingItem.precioUnitario || parseFloat(editingItem.precioUnitario) <= 0}
                        className="h-8 text-xs bg-purple-600 hover:bg-purple-700"
                      >
                        <Wrench className="h-3 w-3 mr-1" />
                        {updating ? 'Confirmando...' : 'Confirmar Ejecución'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Flujo equipo/consumible: atención directa + cantidad */}

                    {/* Motivo de atención directa (solo sin OC) */}
                    {!tieneOC && (
                      <>
                        <div>
                          <label className="text-xs font-medium mb-1 block">Motivo de atención directa *</label>
                          <select
                            value={editingItem.motivoAtencionDirecta}
                            onChange={(e) => setEditingItem(prev => ({ ...prev, motivoAtencionDirecta: e.target.value }))}
                            className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            <option value="">Seleccionar motivo...</option>
                            <option value="compra_caja_chica">Compra directa en tienda / caja chica</option>
                            <option value="urgencia_proyecto">Urgencia — sin tiempo para OC</option>
                            <option value="importacion_gerencia">Compra directa por gerencia / importación</option>
                            <option value="otro">Otro</option>
                          </select>
                        </div>

                        {/* Costo real para importación gerencia */}
                        {editingItem.motivoAtencionDirecta === 'importacion_gerencia' && (
                          <div className="space-y-2">
                            <label className="text-xs font-medium block">Costo real de adquisición *</label>
                            {puedeEditarCosto ? (
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  value={editingItem.costoRealUnitario}
                                  onChange={(e) => setEditingItem(prev => ({ ...prev, costoRealUnitario: e.target.value }))}
                                  placeholder="Costo unitario"
                                  className="h-9 text-sm flex-1"
                                />
                                <select
                                  value={editingItem.costoRealMoneda}
                                  onChange={(e) => setEditingItem(prev => ({ ...prev, costoRealMoneda: e.target.value }))}
                                  className="h-9 rounded-md border border-input bg-background px-2 text-xs w-20"
                                >
                                  <option value="USD">USD</option>
                                  <option value="PEN">PEN</option>
                                </select>
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground italic bg-gray-50 rounded p-2">Solo Gerencia puede completar este campo.</p>
                            )}
                            <p className="text-[10px] text-red-600 bg-red-50 border border-red-200 rounded p-2">
                              Este dato es visible para socios y directivos. Ingresar el costo total real (incluye flete, impuestos, aduanas). Se creará automáticamente una CxP pendiente de documentos.
                            </p>
                          </div>
                        )}

                        {/* Aviso informativo */}
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5 text-[10px] text-blue-700 flex items-start gap-2">
                          <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>Recuerda registrar el gasto en Finanzas → Requerimientos con categoría &quot;equipos&quot;.</span>
                        </div>
                      </>
                    )}

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
                            value={cantAtendida}
                            onChange={(e) => setCantidadAtendida(Number(e.target.value))}
                            className={cn('h-9 text-sm font-medium', esExceso && 'border-amber-400 bg-amber-50')}
                          />
                        </div>
                        <span className={cn('text-xs whitespace-nowrap', esExceso ? 'text-amber-600 font-medium' : 'text-muted-foreground')}>
                          / {cantPedida} {editingItem.item.unidad}
                        </span>
                      </div>

                      {/* Excess delivery warning */}
                      {esExceso && (
                        <div className="mt-2 bg-amber-50 border border-amber-300 rounded-lg p-2.5 text-xs text-amber-700 flex items-start gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                          <span>
                            La cantidad ({cantAtendida}) supera lo pedido ({cantPedida}).
                            Se registrará como entrega con exceso de <strong>{cantAtendida - cantPedida}</strong> {editingItem.item.unidad}.
                          </span>
                        </div>
                      )}

                      {/* Progress bar */}
                      <div className="mt-2">
                        <Progress
                          value={porcentaje}
                          className={cn('h-2', esExceso && '[&>div]:bg-amber-500', !esExceso && esCompleta && '[&>div]:bg-green-500', esParcial && '[&>div]:bg-amber-500')}
                        />
                        <p className={cn('text-[10px] mt-1 text-right', esExceso ? 'text-amber-600 font-medium' : 'text-muted-foreground')}>{porcentaje}%</p>
                      </div>
                    </div>

                    {/* Precio unitario */}
                    <div>
                      <label className="text-xs font-medium mb-1 block">
                        Precio unitario
                        {!editingItem.precioUnitario && !editingItem.item?.precioUnitario && (
                          <span className="ml-1.5 text-[10px] text-amber-600 font-normal">(sin precio registrado)</span>
                        )}
                      </label>
                      <div className={cn(
                        'flex items-center gap-2 rounded-md border px-3 py-1.5',
                        !editingItem.precioUnitario && !editingItem.item?.precioUnitario
                          ? 'border-amber-300 bg-amber-50'
                          : 'border-input bg-background'
                      )}>
                        {/* Selector moneda */}
                        <select
                          value={editingItem.precioMoneda}
                          onChange={(e) => setEditingItem(prev => ({ ...prev, precioMoneda: e.target.value, tipoCambio: e.target.value === 'USD' ? '' : prev.tipoCambio }))}
                          className="h-6 rounded border border-input bg-background text-[10px] px-1 focus:outline-none"
                        >
                          <option value="USD">USD $</option>
                          <option value="PEN">PEN S/</option>
                        </select>
                        <Input
                          type="number"
                          min={0}
                          step="0.01"
                          value={editingItem.precioUnitario}
                          onChange={(e) => setEditingItem(prev => ({ ...prev, precioUnitario: e.target.value }))}
                          placeholder="0.00"
                          className="h-7 text-sm font-medium border-0 p-0 focus-visible:ring-0 shadow-none flex-1"
                        />
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          × {cantAtendida || editingItem.item?.cantidadPedida || 0} = <span className="font-medium text-emerald-600">
                            {editingItem.precioMoneda === 'PEN' ? 'S/' : '$'}{((parseFloat(editingItem.precioUnitario) || 0) * (cantAtendida || editingItem.item?.cantidadPedida || 0)).toFixed(2)}
                          </span>
                        </span>
                      </div>

                      {/* Tipo de cambio (solo si PEN) */}
                      {editingItem.precioMoneda === 'PEN' && (
                        <div className="mt-2 space-y-1">
                          <div className="flex items-center gap-2">
                            <label className="text-[10px] text-muted-foreground whitespace-nowrap">Tipo de cambio: *</label>
                            <Input
                              type="number"
                              min={0}
                              step="0.01"
                              value={editingItem.tipoCambio}
                              onChange={(e) => setEditingItem(prev => ({ ...prev, tipoCambio: e.target.value }))}
                              placeholder="ej: 3.75"
                              className="h-7 text-xs w-24"
                            />
                            {editingItem.tipoCambio && parseFloat(editingItem.tipoCambio) > 0 && editingItem.precioUnitario && parseFloat(editingItem.precioUnitario) > 0 && (
                              <span className="text-[10px] text-green-700 font-medium">
                                = ${(parseFloat(editingItem.precioUnitario) / parseFloat(editingItem.tipoCambio)).toFixed(4)} USD c/u (se guardará en USD)
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            El precio en soles quedará en "Costo real" para administración. El presupuesto del pedido usará el equivalente en USD.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Tiempo real de obtención (días) — solo si no tiene tiempoEntregaDias */}
                    {!(editingItem.item as any)?.tiempoEntregaDias && (
                      <div>
                        <label className="text-xs font-medium mb-1 block">
                          Tiempo real de obtención (días)
                          {!editingItem.tiempoEntregaDias && (
                            <span className="ml-1.5 text-[10px] text-amber-600 font-normal">(sin registrar)</span>
                          )}
                        </label>
                        <Input
                          type="number"
                          min={0}
                          step={1}
                          value={editingItem.tiempoEntregaDias}
                          onChange={(e) => setEditingItem(prev => ({ ...prev, tiempoEntregaDias: e.target.value }))}
                          placeholder="ej: 1 = llegó al día siguiente, 3 = tardó 3 días, 7 = una semana"
                          className="h-9 text-xs"
                        />
                      </div>
                    )}

                    {/* Fecha de entrega */}
                    {cantAtendida > 0 && (
                      <div>
                        <label className="text-xs font-medium mb-1 block">Fecha de Entrega</label>
                        <Input
                          type="date"
                          value={editingItem.fechaEntregaReal}
                          onChange={(e) => setEditingItem(prev => ({ ...prev, fechaEntregaReal: e.target.value }))}
                          className="h-9 text-xs"
                        />
                      </div>
                    )}

                    {/* Observaciones */}
                    <div>
                      <label className="text-xs font-medium mb-1 block">Observaciones</label>
                      <textarea
                        value={editingItem.observacionesEntrega}
                        onChange={(e) => setEditingItem(prev => ({ ...prev, observacionesEntrega: e.target.value }))}
                        placeholder="Ej: Entrega parcial, pendiente 2 unidades para la siguiente semana..."
                        rows={2}
                        className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                      />
                    </div>

                    {/* Estado resultante */}
                    <div className={cn(
                      'rounded-lg px-3 py-2 flex items-center gap-2 text-xs font-medium border',
                      cantAtendida === 0 && 'bg-gray-50 text-gray-600 border-gray-200',
                      esParcial && 'bg-amber-50 text-amber-700 border-amber-200',
                      esExceso && 'bg-amber-50 text-amber-700 border-amber-300',
                      esCompleta && !esExceso && 'bg-green-50 text-green-700 border-green-200',
                    )}>
                      <span className={cn(
                        'w-2 h-2 rounded-full',
                        cantAtendida === 0 && 'bg-gray-400',
                        esParcial && 'bg-amber-500',
                        esExceso && 'bg-amber-500',
                        esCompleta && !esExceso && 'bg-green-500',
                      )} />
                      Estado resultante: {cantAtendida === 0 ? 'Pendiente' : esExceso ? `Entregado (exceso +${cantAtendida - cantPedida})` : esCompleta ? 'Entregado' : 'Parcial'}
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-2 pt-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={resetEditingItem}
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
                          esExceso && 'bg-amber-600 hover:bg-amber-700',
                          esCompleta && !esExceso && 'bg-green-600 hover:bg-green-700',
                        )}
                      >
                        <Save className="h-3 w-3 mr-1" />
                        {updating ? 'Registrando...' : esExceso ? 'Registrar con exceso' : esCompleta ? 'Confirmar Entrega' : 'Registrar'}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog para Crear Requerimiento de Materiales desde Pedido */}
      <Dialog open={showCrearREQ} onOpenChange={setShowCrearREQ}>
        <DialogContent className="max-w-xl max-h-[80vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-sm font-medium flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-600" />
              Crear Requerimiento de Materiales
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground pt-1">
              Selecciona los items a incluir. Se abrirá el formulario en una nueva pestaña con estos items pre-cargados.
            </p>
          </DialogHeader>
          {(() => {
            const itemsElegibles = (pedido?.items || []).filter((item: any) => {
              const tieneOC = (item.ordenCompraItems?.length ?? 0) > 0
              const tieneREQ = itemTieneREQActivo(item)
              return !tieneOC && !tieneREQ && !['cancelado', 'entregado'].includes(item.estado)
            })
            const itemsExcluidos = (pedido?.items || []).length - itemsElegibles.length
            const todosSeleccionados = itemsElegibles.length > 0 && itemsElegibles.every((i: any) => reqItemsSelected.has(i.id))

            return (
              <div className="flex flex-col gap-2.5 overflow-hidden min-h-0">
                {itemsElegibles.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-xs font-medium text-gray-700">Todos los items ya tienen OC o Requerimiento activo</p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto border rounded-lg min-h-0">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 text-left w-8">
                            <Checkbox
                              checked={todosSeleccionados}
                              onCheckedChange={(checked) => {
                                setReqItemsSelected(checked
                                  ? new Set(itemsElegibles.map((i: any) => i.id))
                                  : new Set()
                                )
                              }}
                              className="h-3.5 w-3.5"
                            />
                          </th>
                          <th className="px-3 py-2 text-left font-medium text-gray-600">Item</th>
                          <th className="px-3 py-2 text-right font-medium text-gray-600 w-24">Cant. disp.</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {itemsElegibles.map((item: any) => (
                          <tr
                            key={item.id}
                            className={`cursor-pointer transition-colors ${reqItemsSelected.has(item.id) ? 'bg-purple-50/40' : 'hover:bg-gray-50'}`}
                            onClick={() => setReqItemsSelected(prev => {
                              const next = new Set(prev)
                              next.has(item.id) ? next.delete(item.id) : next.add(item.id)
                              return next
                            })}
                          >
                            <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                              <Checkbox
                                checked={reqItemsSelected.has(item.id)}
                                onCheckedChange={(checked) => setReqItemsSelected(prev => {
                                  const next = new Set(prev)
                                  checked ? next.add(item.id) : next.delete(item.id)
                                  return next
                                })}
                                className="h-3.5 w-3.5"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <div className="font-medium truncate" title={item.descripcion}>{item.descripcion}</div>
                              <div className="text-[11px] text-gray-400 font-mono">{item.codigo}</div>
                            </td>
                            <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                              {Math.max(0, item.cantidadPedida - (item.cantidadAtendida || 0))} <span className="text-gray-400 font-normal">{item.unidad}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {itemsExcluidos > 0 && (
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-gray-50 rounded px-2.5 py-1.5 flex-shrink-0">
                    <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-emerald-500" />
                    {itemsExcluidos} item{itemsExcluidos !== 1 ? 's' : ''} ya tienen OC o REQ activo — no aparecen en la lista
                  </div>
                )}

                <div className="flex justify-between items-center pt-1 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {reqItemsSelected.size} de {itemsElegibles.length} items seleccionados
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowCrearREQ(false)} className="h-8 text-xs">
                      Cancelar
                    </Button>
                    {itemsElegibles.length > 0 && (
                      <Button
                        size="sm"
                        onClick={handleIrACrearREQ}
                        disabled={reqItemsSelected.size === 0}
                        className="h-8 text-xs bg-purple-600 hover:bg-purple-700"
                      >
                        <FileText className="h-3 w-3 mr-1" />
                        Crear REQ con {reqItemsSelected.size > 0 ? reqItemsSelected.size : ''} item{reqItemsSelected.size !== 1 ? 's' : ''} →
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog para Crear OC desde Pedido */}
      <Dialog open={showGenerarOC} onOpenChange={setShowGenerarOC}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="text-sm font-medium flex items-center gap-2">
              <ShoppingCart className="h-4 w-4 text-blue-600" />
              Crear Orden de Compra desde Pedido
            </DialogTitle>
            <p className="text-[11px] text-muted-foreground pt-1">
              Filtra por proveedor para seleccionar rápido. Completa proveedor, moneda y condiciones en la siguiente pantalla.
            </p>
          </DialogHeader>
          {(() => {
            const itemsSinOC = Object.entries(ocItemsState)
            const seleccionados = itemsSinOC.filter(([, v]) => v.selected)
            const conOC = (pedido?.items || []).filter(
              (i: any) => (i.ordenCompraItems?.length ?? 0) > 0 || itemTieneREQActivo(i)
            ).length

            // Construir pills de proveedores desde los items
            const provMap = new Map<string, { nombre: string; count: number }>()
            for (const [itemId] of itemsSinOC) {
              const item = pedido?.items?.find((i: any) => i.id === itemId) as any
              if (!item) continue
              const provNombre = item.proveedor?.nombre || item.proveedorNombre || item.listaEquipoItem?.proveedor?.nombre || ''
              const key = provNombre || '__sin__'
              const label = provNombre || 'Sin proveedor'
              provMap.set(key, { nombre: label, count: (provMap.get(key)?.count || 0) + 1 })
            }
            const provPills = [
              { key: '__all__', nombre: 'Todos', count: itemsSinOC.length },
              ...Array.from(provMap.entries()).map(([key, v]) => ({ key, ...v }))
            ]

            // Filtrar items visibles según pill activo
            const itemsFiltrados = ocProveedorFiltro === '__all__'
              ? itemsSinOC
              : itemsSinOC.filter(([itemId]) => {
                  const item = pedido?.items?.find((i: any) => i.id === itemId) as any
                  if (!item) return false
                  const provNombre = item.proveedor?.nombre || item.proveedorNombre || item.listaEquipoItem?.proveedor?.nombre || ''
                  return ocProveedorFiltro === '__sin__' ? !provNombre : provNombre === ocProveedorFiltro
                })

            const todosFiltradosSeleccionados = itemsFiltrados.length > 0 && itemsFiltrados.every(([, v]) => v.selected)

            return (
              <div className="flex flex-col gap-2.5 overflow-hidden min-h-0">
                {itemsSinOC.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                    <p className="text-xs font-medium text-gray-700">Todos los items ya tienen OC o Requerimiento de dinero activo</p>
                  </div>
                ) : (
                  <>
                    {/* Pills de proveedor */}
                    <div className="flex flex-wrap gap-1.5 flex-shrink-0">
                      {provPills.map(pill => (
                        <button
                          key={pill.key}
                          onClick={() => {
                            setOcProveedorFiltro(pill.key)
                            // Seleccionar todos los items de ese proveedor automáticamente
                            if (pill.key !== '__all__') {
                              setOcItemsState(prev => {
                                const next = { ...prev }
                                for (const [itemId] of itemsSinOC) {
                                  const item = pedido?.items?.find((i: any) => i.id === itemId) as any
                                  if (!item) continue
                                  const provNombre = item.proveedor?.nombre || item.proveedorNombre || item.listaEquipoItem?.proveedor?.nombre || ''
                                  const matchKey = provNombre || '__sin__'
                                  if (matchKey === pill.key) next[itemId] = { ...next[itemId], selected: true }
                                }
                                return next
                              })
                            }
                          }}
                          className={cn(
                            'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                            ocProveedorFiltro === pill.key
                              ? 'bg-blue-600 text-white border-blue-600'
                              : pill.key === '__sin__'
                                ? 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                          )}
                        >
                          {pill.nombre} <span className="opacity-70">({pill.count})</span>
                        </button>
                      ))}
                    </div>

                    {/* Tabla */}
                    <div className="flex-1 overflow-y-auto border rounded-lg min-h-0">
                      <table className="w-full text-xs">
                        <thead className="bg-gray-50 sticky top-0 z-10">
                          <tr>
                            <th className="px-3 py-2 text-left w-8">
                              <Checkbox
                                checked={todosFiltradosSeleccionados}
                                onCheckedChange={(checked) => {
                                  setOcItemsState(prev => {
                                    const next = { ...prev }
                                    itemsFiltrados.forEach(([id]) => { next[id] = { ...next[id], selected: !!checked } })
                                    return next
                                  })
                                }}
                                className="h-3.5 w-3.5"
                              />
                            </th>
                            <th className="px-3 py-2 text-left font-medium text-gray-600">Item</th>
                            <th className="px-3 py-2 text-right font-medium text-gray-600 w-20">Cant.</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {itemsFiltrados.map(([itemId, state]) => {
                            const item = pedido?.items?.find((i: any) => i.id === itemId) as any
                            if (!item) return null
                            return (
                              <tr
                                key={itemId}
                                className={cn('cursor-pointer transition-colors', state.selected ? 'bg-blue-50/40' : 'hover:bg-gray-50')}
                                onClick={() => setOcItemsState(prev => ({ ...prev, [itemId]: { ...prev[itemId], selected: !prev[itemId].selected } }))}
                              >
                                <td className="px-3 py-2" onClick={e => e.stopPropagation()}>
                                  <Checkbox
                                    checked={state.selected}
                                    onCheckedChange={(checked) => setOcItemsState(prev => ({ ...prev, [itemId]: { ...prev[itemId], selected: !!checked } }))}
                                    className="h-3.5 w-3.5"
                                  />
                                </td>
                                <td className="px-3 py-2">
                                  <div className="font-medium truncate" title={item.descripcion}>{item.descripcion}</div>
                                  <div className="text-[11px] text-gray-400 font-mono">{item.codigo}</div>
                                </td>
                                <td className="px-3 py-2 text-right font-medium whitespace-nowrap">{item.cantidadPedida} <span className="text-gray-400 font-normal">{item.unidad}</span></td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {conOC > 0 && (
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground bg-gray-50 rounded px-2.5 py-1.5 flex-shrink-0">
                    <CheckCircle2 className="h-3 w-3 flex-shrink-0 text-emerald-500" />
                    {conOC} item{conOC !== 1 ? 's' : ''} ya tienen OC — no aparecen en la lista
                  </div>
                )}

                <div className="flex justify-between items-center pt-1 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">
                    {seleccionados.length} de {itemsSinOC.length} items seleccionados
                  </span>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowGenerarOC(false)} className="h-8 text-xs">
                      Cancelar
                    </Button>
                    {itemsSinOC.length > 0 && (
                      <Button
                        size="sm"
                        onClick={handleIrACrearOC}
                        disabled={seleccionados.length === 0}
                        className="h-8 text-xs"
                      >
                        <ShoppingCart className="h-3 w-3 mr-1" />
                        Crear OC con {seleccionados.length > 0 ? seleccionados.length : ''} item{seleccionados.length !== 1 ? 's' : ''} →
                      </Button>
                    )}
                  </div>
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