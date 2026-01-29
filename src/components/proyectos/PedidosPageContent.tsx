'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ShoppingCart, Clock, DollarSign, CheckCircle, FileText, Calendar, Package } from 'lucide-react'
import { PedidoEquipoTableWrapper } from '@/components/finanzas/aprovisionamiento/PedidoEquipoTableWrapper'
import { PedidosHeaderActions, type ViewMode } from './PedidosHeaderActions'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { PedidoEquipo, EstadoPedido } from '@/types/modelos'

interface Props {
  pedidos: PedidoEquipo[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  stats: {
    total: number
    pendientes: number
    completados: number
    montoTotal: number
  }
}

const estadoColors: Record<string, string> = {
  borrador: 'bg-gray-100 text-gray-700 border-gray-200',
  enviado: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  confirmado: 'bg-blue-50 text-blue-700 border-blue-200',
  parcial: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  en_transito: 'bg-purple-50 text-purple-700 border-purple-200',
  entregado: 'bg-green-50 text-green-700 border-green-200',
  atendido: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelado: 'bg-red-50 text-red-700 border-red-200',
  retrasado: 'bg-orange-50 text-orange-700 border-orange-200',
}

const estadoLabels: Record<string, string> = {
  borrador: 'Borrador',
  enviado: 'Enviado',
  confirmado: 'Confirmado',
  parcial: 'Parcial',
  en_transito: 'En Tránsito',
  entregado: 'Entregado',
  atendido: 'Atendido',
  cancelado: 'Cancelado',
  retrasado: 'Retrasado',
}

const formatCurrency = (amount: number): string => {
  if (amount >= 1000000) {
    return `$${(amount / 1000000).toFixed(1)}M`
  }
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(0)}K`
  }
  return `$${amount.toFixed(0)}`
}

export function PedidosPageContent({ pedidos, pagination, stats }: Props) {
  const router = useRouter()
  const [viewMode, setViewMode] = useState<ViewMode>('table')

  const handlePedidoClick = (pedido: PedidoEquipo) => {
    if (pedido.proyectoId) {
      router.push(`/proyectos/${pedido.proyectoId}/equipos/pedidos/${pedido.id}`)
    } else {
      router.push(`/finanzas/aprovisionamiento/pedidos/${pedido.id}`)
    }
  }

  const calcularMonto = (pedido: PedidoEquipo): number => {
    return pedido.items?.reduce((sum: number, item: any) =>
      sum + (item.costoTotal || (item.cantidadPedida * (item.precioUnitario || 0))), 0) || 0
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShoppingCart className="h-6 w-6 text-blue-600" />
          <h1 className="text-xl font-bold">Pedidos</h1>
          <Badge variant="secondary" className="text-xs">
            {stats.total}
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Inline Stats - Desktop */}
          <div className="hidden md:flex items-center gap-3 mr-4 text-xs">
            <div className="flex items-center gap-1 text-yellow-600" title="Pendientes">
              <Clock className="h-3.5 w-3.5" />
              <span className="font-medium">{stats.pendientes}</span>
            </div>
            <div className="flex items-center gap-1 text-green-600" title="Completados">
              <CheckCircle className="h-3.5 w-3.5" />
              <span className="font-medium">{stats.completados}</span>
            </div>
            <div className="w-px h-4 bg-gray-200" />
            <div className="flex items-center gap-1 text-emerald-600" title="Monto Total">
              <DollarSign className="h-3.5 w-3.5" />
              <span className="font-semibold">{formatCurrency(stats.montoTotal)}</span>
            </div>
          </div>

          <PedidosHeaderActions
            pedidos={pedidos}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
          />
        </div>
      </div>

      {/* Mobile Stats */}
      <div className="md:hidden grid grid-cols-3 gap-2">
        <div className="bg-yellow-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-yellow-600">{stats.pendientes}</div>
          <div className="text-[10px] text-yellow-700">Pendientes</div>
        </div>
        <div className="bg-green-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-green-600">{stats.completados}</div>
          <div className="text-[10px] text-green-700">Completados</div>
        </div>
        <div className="bg-emerald-50 rounded-lg p-2 text-center">
          <div className="text-lg font-bold text-emerald-600">{formatCurrency(stats.montoTotal)}</div>
          <div className="text-[10px] text-emerald-700">Total</div>
        </div>
      </div>

      {/* Content based on view mode */}
      {viewMode === 'table' ? (
        <PedidoEquipoTableWrapper
          data={pedidos}
          pagination={pagination}
        />
      ) : (
        /* Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {pedidos.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-muted-foreground">No hay pedidos</p>
            </div>
          ) : (
            pedidos.map((pedido) => {
              const monto = calcularMonto(pedido)
              return (
                <Card
                  key={pedido.id}
                  className="cursor-pointer hover:shadow-md transition-shadow hover:border-blue-300"
                  onClick={() => handlePedidoClick(pedido)}
                >
                  <CardContent className="p-3">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="font-mono text-sm font-semibold text-blue-600">
                          {pedido.codigo}
                        </span>
                        <Badge
                          variant="outline"
                          className={cn('ml-2 text-[10px] px-1.5 py-0', estadoColors[pedido.estado])}
                        >
                          {estadoLabels[pedido.estado] || pedido.estado}
                        </Badge>
                      </div>
                    </div>

                    {/* Proyecto */}
                    <div className="flex items-center gap-1.5 mb-2 text-xs">
                      <FileText className="h-3.5 w-3.5 text-gray-400" />
                      <span className="font-medium truncate">
                        {(pedido as any).proyecto?.codigo || 'N/A'}
                      </span>
                      <span className="text-muted-foreground truncate">
                        {(pedido as any).proyecto?.nombre || ''}
                      </span>
                    </div>

                    {/* Fechas */}
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-2">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>
                          {pedido.fechaPedido
                            ? format(new Date(pedido.fechaPedido), 'dd/MM/yy')
                            : '-'}
                        </span>
                      </div>
                      {pedido.fechaEntregaEstimada && (
                        <div className="flex items-center gap-1 text-green-600">
                          <Package className="h-3 w-3" />
                          <span>
                            {format(new Date(pedido.fechaEntregaEstimada), 'dd/MM/yy')}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-[11px] text-muted-foreground">
                        {pedido.items?.length || 0} items
                      </span>
                      <span className="font-mono text-sm font-semibold">
                        {formatCurrency(monto)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
