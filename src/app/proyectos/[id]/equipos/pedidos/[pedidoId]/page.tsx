/**
 * 📦 Página de Detalle de Pedido
 * Diseño minimalista y compacto
 * @author GYS Team
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { notFound } from 'next/navigation'
import { getProyectoById } from '@/lib/services/proyecto'
import { getPedidoEquipoById } from '@/lib/services/pedidoEquipo'
import { useSession } from 'next-auth/react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
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
import { cn } from '@/lib/utils'
import {
  ArrowLeft,
  Package,
  Calendar,
  Edit,
  Truck,
  User,
  Clock,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  PackageCheck,
  X,
  ChevronRight,
  ChevronDown,
  FileText,
  Plus,
  Warehouse,
  History,
  Activity,
  ShoppingCart,
  RefreshCw,
} from 'lucide-react'
import Link from 'next/link'
import type { Proyecto, PedidoEquipo } from '@/types'
import PedidoEquipoHistorial from '@/components/equipos/PedidoEquipoHistorial'
import PedidoEstadoFlujoBanner from '@/components/equipos/PedidoEstadoFlujoBanner'
import TipoItemBadge from '@/components/shared/TipoItemBadge'
import PedidoEquipoEditModal from '@/components/equipos/PedidoEquipoEditModal'
import { PedidoItemDirectoModal } from '@/components/equipos/PedidoItemDirectoModal'
import { formatCurrency, formatDate } from '@/lib/utils'

interface PageProps {
  params: Promise<{
    id: string
    pedidoId: string
  }>
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 p-4">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export default function ProjectPedidoDetailPage({ params }: PageProps) {
  const { data: session } = useSession()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [pedido, setPedido] = useState<PedidoEquipo | null>(null)
  const [loading, setLoading] = useState(true)
  const [proyectoId, setProyectoId] = useState('')
  const [pedidoId, setPedidoId] = useState('')
  const [showEditModal, setShowEditModal] = useState(false)
  const [showItemDirectoModal, setShowItemDirectoModal] = useState(false)
  const [rechazarDialog, setRechazarDialog] = useState<{ open: boolean; recepcionId: string | null }>({ open: false, recepcionId: null })
  const [rechazarObservaciones, setRechazarObservaciones] = useState('')
  const [procesandoRecepcion, setProcesandoRecepcion] = useState<string | null>(null)
  const [rechazoDetalleModal, setRechazoDetalleModal] = useState<any>(null)
  const [revertirRechazo, setRevertirRechazo] = useState<{ confirmando: boolean; motivo: string; procesando: boolean }>({ confirmando: false, motivo: '', procesando: false })

  useEffect(() => {
    params.then((p) => {
      setProyectoId(p.id)
      setPedidoId(p.pedidoId)
    })
  }, [params])

  useEffect(() => {
    if (!proyectoId || !pedidoId) return
    const fetchData = async () => {
      try {
        const [proyectoData, pedidoData] = await Promise.all([
          getProyectoById(proyectoId),
          getPedidoEquipoById(pedidoId),
        ])
        if (!proyectoData || !pedidoData) {
          notFound()
          return
        }
        setProyecto(proyectoData)
        setPedido(pedidoData)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [proyectoId, pedidoId])

  // Recepciones pendientes (aplanar desde items)
  const recepcionesPendientes = (pedido?.items || []).flatMap((item: any) =>
    (item.recepcionesPendientes || []).map((r: any) => ({
      ...r,
      itemCodigo: item.codigo,
      itemDescripcion: item.descripcion,
    }))
  )

  const reloadPedido = useCallback(async () => {
    const pedidoData = await getPedidoEquipoById(pedidoId)
    if (pedidoData) setPedido(pedidoData)
  }, [pedidoId])

  const handleConfirmarRecepcion = useCallback(async (recepcionId: string, paso: 'almacen' | 'proyecto' = 'proyecto') => {
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
      await reloadPedido()
    } catch (err: any) {
      toast.error(err.message || 'Error al confirmar recepción')
    } finally {
      setProcesandoRecepcion(null)
    }
  }, [reloadPedido])

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
      await reloadPedido()
    } catch (err: any) {
      toast.error(err.message || 'Error al rechazar recepción')
    } finally {
      setProcesandoRecepcion(null)
    }
  }, [rechazarDialog.recepcionId, rechazarObservaciones, reloadPedido])

  const userRole = session?.user?.role || ''
  const puedeConfirmarRecepcion = ['admin', 'gerente', 'logistico', 'gestor', 'coordinador'].includes(userRole)

  if (loading) return <LoadingSkeleton />
  if (!proyecto || !pedido) notFound()

  const stats = {
    totalItems: pedido.items?.length || 0,
    totalCost: pedido.items?.reduce((sum, item) => sum + (item.costoTotal || 0), 0) || 0,
    entregados: pedido.items?.filter((i) => i.estado === 'entregado').length || 0,
    parciales: pedido.items?.filter((i) => i.estado === 'parcial').length || 0,
    pendientes: pedido.items?.filter((i) => i.estado === 'pendiente').length || 0,
    progress: pedido.items?.length
      ? ((pedido.items.filter((i) => i.estado === 'entregado').length / pedido.items.length) * 100)
      : 0,
  }

  const getEstadoBadge = (estado: string) => {
    const styles: Record<string, string> = {
      entregado: 'bg-green-100 text-green-700 border-green-200',
      parcial: 'bg-amber-100 text-amber-700 border-amber-200',
      atendido: 'bg-blue-100 text-blue-700 border-blue-200',
      pendiente: 'bg-gray-100 text-gray-700 border-gray-200',
    }
    return styles[estado] || styles.pendiente
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header compacto */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="px-4 py-3">
          {/* Breadcrumb */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-2">
            <Link href="/proyectos" className="hover:text-foreground">Proyectos</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/proyectos/${proyectoId}`} className="hover:text-foreground">{proyecto.codigo}</Link>
            <ChevronRight className="h-3 w-3" />
            <Link href={`/proyectos/${proyectoId}/equipos/pedidos`} className="hover:text-foreground">Pedidos</Link>
            <ChevronRight className="h-3 w-3" />
            <span className="text-foreground font-medium">{pedido.codigo}</span>
          </div>

          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" asChild className="h-7 px-2">
                <Link href={`/proyectos/${proyectoId}/equipos/pedidos`}>
                  <ArrowLeft className="h-3.5 w-3.5" />
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center">
                  <Package className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <h1 className="text-base font-semibold">{pedido.codigo}</h1>
                  <p className="text-[10px] text-muted-foreground">{proyecto.nombre}</p>
                </div>
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={() => setShowEditModal(true)} className="h-7 text-xs">
              <Edit className="h-3 w-3 mr-1" />
              Editar
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Estado del Pedido */}
        <PedidoEstadoFlujoBanner
          estado={pedido.estado || 'borrador'}
          pedidoId={pedidoId}
          pedidoNombre={pedido.codigo}
          usuarioId={session?.user?.id}
          onUpdated={(nuevoEstado) => {
            setPedido((prev) => (prev ? { ...prev, estado: nuevoEstado as any } : null))
          }}
        />

        {/* Banner recepciones — estado "pendiente" (solo informativo en proyectos, logística confirma) */}
        {(() => {
          const pendientes = recepcionesPendientes.filter((r: any) => r.estado === 'pendiente')
          if (pendientes.length === 0) return null
          return (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <PackageCheck className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">
                  Recepciones reportadas — pendiente confirmación de Logística ({pendientes.length})
                </span>
              </div>
              <div className="space-y-2">
                {pendientes.map((r: any) => (
                  <div key={r.id} className="flex items-center bg-white rounded border px-3 py-2">
                    <span className="text-sm">
                      <strong>{r.cantidadRecibida}</strong> x {r.itemDescripcion}
                      <span className="text-muted-foreground"> ({r.itemCodigo})</span>
                      {' '}desde{' '}
                      <span className="font-medium">{r.ordenCompraItem?.ordenCompra?.numero || 'OC'}</span>
                      {' '}el{' '}
                      <span className="text-muted-foreground">{formatDate(r.fechaRecepcion)}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* Banner recepciones — estado "en_almacen" (proyectos puede confirmar entrega) */}
        {(() => {
          const enAlmacen = recepcionesPendientes.filter((r: any) => r.estado === 'en_almacen')
          if (enAlmacen.length === 0 || !puedeConfirmarRecepcion) return null
          return (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Warehouse className="h-4 w-4 text-green-600" />
                <span className="text-sm font-semibold text-green-800">
                  En almacén — confirmar entrega a proyecto ({enAlmacen.length})
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
                          Recibido en almacén{r.confirmadoPor?.name && ` por ${r.confirmadoPor.name}`}
                          {' el '}{formatDate(r.fechaConfirmacion || r.fechaRecepcion)}
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 ml-3 flex-shrink-0">
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 text-xs bg-green-600 hover:bg-green-700"
                        disabled={procesandoRecepcion === r.id}
                        onClick={() => handleConfirmarRecepcion(r.id, 'proyecto')}
                      >
                        <Package className="h-3 w-3 mr-1" />
                        Confirmar entrega a proyecto
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

        {/* Banner recepciones rechazadas */}
        {(() => {
          const rechazadas = recepcionesPendientes.filter((r: any) => r.estado === 'rechazado')
          if (rechazadas.length === 0) return null
          return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-semibold text-red-800">
                  {rechazadas.length} item{rechazadas.length !== 1 ? 's' : ''} rechazado{rechazadas.length !== 1 ? 's' : ''} en recepción — requieren atención
                </span>
              </div>
              <div className="space-y-2">
                {rechazadas.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between bg-white rounded border px-3 py-2">
                    <span className="text-sm text-red-700">
                      <strong>{r.cantidadRecibida}</strong> x {r.itemDescripcion}
                      <span className="text-muted-foreground"> ({r.itemCodigo})</span>
                      {' — '}{r.motivoRechazo || r.observaciones || 'Sin motivo'}
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
          )
        })()}

        {/* Stats cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Items</span>
              <Package className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <p className="text-xl font-bold mt-1">{stats.totalItems}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Costo Total</span>
              <span className="text-[10px] text-emerald-600">$</span>
            </div>
            <p className="text-xl font-bold mt-1 text-emerald-600">{formatCurrency(stats.totalCost)}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Entregados</span>
              <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            </div>
            <p className="text-xl font-bold mt-1 text-green-600">{stats.entregados}</p>
          </div>
          <div className="bg-white rounded-lg border p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Progreso</span>
              <span className="text-[10px] font-medium">{stats.progress.toFixed(0)}%</span>
            </div>
            <Progress value={stats.progress} className="h-2 mt-2" />
          </div>
        </div>

        {/* 🟤 Alerta: items entregados sin costo */}
        {!['entregado', 'cancelado'].includes(pedido.estado) && (() => {
          const sinCosto = (pedido.items || []).filter((i: any) => (i.cantidadAtendida || 0) > 0 && (!i.costoTotal || i.costoTotal === 0))
          if (sinCosto.length === 0) return null
          return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2 text-[11px]">
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="font-medium text-yellow-800">
                    {sinCosto.length} item{sinCosto.length !== 1 ? 's' : ''} entregado{sinCosto.length !== 1 ? 's' : ''} sin costo registrado — el costo del proyecto puede estar subestimado
                  </p>
                  <div className="mt-1.5 space-y-0.5">
                    {sinCosto.map((i: any) => (
                      <div key={i.id} className="text-yellow-700">
                        {i.codigo} — {i.descripcion}
                      </div>
                    ))}
                  </div>
                  <Link
                    href={`/logistica/pedidos/${pedidoId}`}
                    className="inline-flex items-center gap-1 text-[10px] font-medium text-yellow-700 hover:text-yellow-900 underline mt-1.5"
                  >
                    Registrar costos en Logística
                  </Link>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Info del pedido */}
        <div className="bg-white rounded-lg border p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
            <div className="flex items-center gap-2">
              <User className="h-3.5 w-3.5 text-gray-400" />
              <div>
                <span className="text-muted-foreground">Responsable</span>
                <p className="font-medium">{pedido.responsable?.name || 'Sin asignar'}</p>
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
              <Truck className="h-3.5 w-3.5 text-gray-400" />
              <div>
                <span className="text-muted-foreground">Entrega Estimada</span>
                <p className="font-medium">{pedido.fechaEntregaEstimada ? formatDate(pedido.fechaEntregaEstimada) : '—'}</p>
              </div>
            </div>
          </div>

          {pedido.observacion && (
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-start gap-2 text-xs">
                <FileText className="h-3.5 w-3.5 text-gray-400 mt-0.5" />
                <p className="text-muted-foreground">{pedido.observacion}</p>
              </div>
            </div>
          )}
        </div>

        {/* Items del pedido */}
        <div className="bg-white rounded-lg border">
          <div className="px-4 py-3 border-b bg-gray-50/50 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Package className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-medium">Items del Pedido</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[10px] h-5">
                {stats.entregados} entregados
              </Badge>
              <Badge variant="outline" className="text-[10px] h-5">
                {stats.pendientes} pendientes
              </Badge>
              <Button
                variant="outline"
                size="sm"
                className="h-6 text-[10px] gap-1"
                onClick={() => setShowItemDirectoModal(true)}
              >
                <Plus className="h-3 w-3" />
                Item Directo
              </Button>
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
                    <th className="px-3 py-2 text-right font-medium text-gray-600">Costo</th>
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
                      <td className="px-3 py-2 text-gray-600 max-w-[180px] truncate">
                        {item.descripcion}
                      </td>
                      <td className="px-3 py-2 text-gray-600 max-w-[120px] truncate">
                        {(item as any).proveedorNombre || (item as any).listaEquipoItem?.proveedor?.nombre || '—'}
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
                          className={cn('text-[10px] px-1.5 py-0', getEstadoBadge(item.estado))}
                        >
                          {item.estado}
                        </Badge>
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-emerald-600">
                        {item.costoTotal ? formatCurrency(item.costoTotal) : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Package className="h-10 w-10 text-gray-300 mb-3" />
              <p className="text-sm text-muted-foreground">No hay items en este pedido</p>
            </div>
          )}

          {/* Resumen footer */}
          {pedido.items && pedido.items.length > 0 && (
            <div className="px-4 py-3 border-t bg-gray-50">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    <span className="text-muted-foreground">Entregados:</span>
                    <span className="font-medium">{stats.entregados}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span className="text-muted-foreground">Parciales:</span>
                    <span className="font-medium">{stats.parciales}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    <span className="text-muted-foreground">Pendientes:</span>
                    <span className="font-medium">{stats.pendientes}</span>
                  </span>
                </div>
                <span className="font-medium text-emerald-600">
                  Total: {formatCurrency(stats.totalCost)}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Historial */}
        <PedidoEquipoHistorial pedidoId={pedidoId} className="w-full" />

        {/* Timeline de Trazabilidad */}
        {(() => {
          const eventos = (pedido as any)?.eventosTrazabilidad || []
          if (eventos.length === 0) return null
          return (
            <Collapsible defaultOpen>
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
                    <ChevronDown className="h-4 w-4 text-gray-400" />
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
                                {formatDate(evento.fechaEvento)} • {evento.user?.name || 'Sistema'}
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
          )
        })()}
      </div>

      {/* Modal de edición */}
      <PedidoEquipoEditModal
        pedido={pedido}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onUpdated={(pedidoActualizado) => setPedido(pedidoActualizado)}
        fields={['fechaNecesaria', 'observacion']}
      />

      {/* Modal de item directo */}
      <PedidoItemDirectoModal
        open={showItemDirectoModal}
        onClose={() => setShowItemDirectoModal(false)}
        pedidoId={pedidoId}
        onCreated={async () => {
          // Refresh pedido data
          const pedidoData = await getPedidoEquipoById(pedidoId)
          if (pedidoData) setPedido(pedidoData)
        }}
      />

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
                              await reloadPedido()
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
