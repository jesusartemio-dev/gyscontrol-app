/**
 * 📦 Página de Detalle de Pedido - Logística
 * Diseño minimalista y compacto para gestión eficiente
 * @author GYS Team
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import Link from 'next/link'

// 📡 Types & Services
import {
  PedidoEquipo,
  PedidoEquipoItem,
  PedidoEquipoItemUpdatePayload,
  TrazabilidadEvent
} from '@/types'
import { getPedidoEquipoById } from '@/lib/services/pedidoEquipo'
import {
  updatePedidoEquipoItem
} from '@/lib/services/pedidoEquipoItem'
import { obtenerEventosTrazabilidad } from '@/lib/services/trazabilidad'

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
} from '@/components/ui/dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
  History
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
  const [eventos, setEventos] = useState<TrazabilidadEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [timelineOpen, setTimelineOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

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

      const [pedidoData, eventosData] = await Promise.all([
        getPedidoEquipoById(pedidoId),
        obtenerEventosTrazabilidad({ entidadId: pedidoId, entidadTipo: 'PEDIDO' })
      ])

      setPedido(pedidoData)
      setEventos(eventosData)
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
                    {pedido.proyecto?.nombre || 'Sin proyecto'}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={cn('text-[10px] h-5', getEstadoBadgeClass(pedido.estado))}>
                {pedido.estado}
              </Badge>
            </div>

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

      <div className="p-4 space-y-4">
        {/* Stats cards compactas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
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
                <p className="font-medium truncate max-w-[150px]" title={pedido.proyecto?.nombre}>
                  {pedido.proyecto?.codigo || '—'}
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
                      <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate">
                        {(item as any).listaEquipoItem?.proveedor?.nombre || '—'}
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
                      <td className="px-3 py-2 text-center text-gray-500">
                        {(item as any).fechaEntregaReal
                          ? formatDate((item as any).fechaEntregaReal)
                          : '—'}
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
                    {eventos.map((evento, idx) => (
                      <div key={evento.id || idx} className="flex items-start gap-3 text-xs">
                        <div className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-gray-700">{evento.descripcion}</p>
                          <p className="text-muted-foreground text-[10px]">
                            {formatDate(evento.fecha)} • {(evento.usuario as any)?.nombre || (evento.usuario as any)?.name || (typeof evento.usuario === 'string' ? evento.usuario : 'Sistema')}
                          </p>
                        </div>
                      </div>
                    ))}
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
            <DialogTitle className="text-sm font-medium">Registrar Entrega</DialogTitle>
          </DialogHeader>
          {editingItem.item && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-3 text-xs">
                <p className="font-mono font-medium">{editingItem.item.codigo}</p>
                <p className="text-muted-foreground truncate">{editingItem.item.descripcion}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Cant. Pedida</label>
                  <Input
                    value={editingItem.item.cantidadPedida}
                    disabled
                    className="h-8 text-xs bg-gray-50"
                  />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Cant. Atendida</label>
                  <Input
                    type="number"
                    min={0}
                    max={editingItem.item.cantidadPedida}
                    value={editingItem.cantidadAtendida}
                    onChange={(e) => setEditingItem(prev => ({
                      ...prev,
                      cantidadAtendida: Number(e.target.value)
                    }))}
                    className="h-8 text-xs"
                  />
                </div>
              </div>

              {/* Fecha de entrega - solo mostrar si hay cantidad atendida */}
              {editingItem.cantidadAtendida > 0 && (
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Fecha de Entrega</label>
                  <Input
                    type="date"
                    value={editingItem.fechaEntregaReal}
                    onChange={(e) => setEditingItem(prev => ({
                      ...prev,
                      fechaEntregaReal: e.target.value
                    }))}
                    className="h-8 text-xs"
                  />
                </div>
              )}

              {/* Observaciones */}
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Observaciones (opcional)</label>
                <Input
                  value={editingItem.observacionesEntrega}
                  onChange={(e) => setEditingItem(prev => ({
                    ...prev,
                    observacionesEntrega: e.target.value
                  }))}
                  placeholder="Ej: Entrega parcial, falta 2 unidades..."
                  className="h-8 text-xs"
                />
              </div>

              <div className="text-xs text-muted-foreground">
                {editingItem.cantidadAtendida === 0 && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    Estado resultante: <span className="font-medium">Pendiente</span>
                  </span>
                )}
                {editingItem.cantidadAtendida > 0 && editingItem.cantidadAtendida < editingItem.item.cantidadPedida && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    Estado resultante: <span className="font-medium">Parcial</span>
                  </span>
                )}
                {editingItem.cantidadAtendida >= editingItem.item.cantidadPedida && (
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Estado resultante: <span className="font-medium">Entregado</span>
                  </span>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingItem({ item: null, cantidadAtendida: 0, estado: 'pendiente', fechaEntregaReal: '', observacionesEntrega: '' })}
                  className="h-7 text-xs"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={saveItemEdit}
                  disabled={updating}
                  className="h-7 text-xs"
                >
                  <Save className="h-3 w-3 mr-1" />
                  {updating ? 'Guardando...' : 'Guardar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}