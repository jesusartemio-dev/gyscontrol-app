/**
 * 📦 Página de Detalle de Pedido
 * Diseño minimalista y compacto
 * @author GYS Team
 */

'use client'

import { useEffect, useState } from 'react'
import { notFound } from 'next/navigation'
import { getProyectoById } from '@/lib/services/proyecto'
import { getPedidoEquipoById } from '@/lib/services/pedidoEquipo'
import { useSession } from 'next-auth/react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Progress } from '@/components/ui/progress'
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
  ChevronRight,
  FileText,
} from 'lucide-react'
import Link from 'next/link'
import type { Proyecto, PedidoEquipo } from '@/types'
import PedidoEquipoHistorial from '@/components/equipos/PedidoEquipoHistorial'
import PedidoEstadoFlujoBanner from '@/components/equipos/PedidoEstadoFlujoBanner'
import PedidoEquipoEditModal from '@/components/equipos/PedidoEquipoEditModal'
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
                        <span className="font-mono font-medium">{item.codigo}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-600 max-w-[180px] truncate">
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
      </div>

      {/* Modal de edición */}
      <PedidoEquipoEditModal
        pedido={pedido}
        open={showEditModal}
        onOpenChange={setShowEditModal}
        onUpdated={(pedidoActualizado) => setPedido(pedidoActualizado)}
        fields={['fechaNecesaria', 'observacion']}
      />
    </div>
  )
}
