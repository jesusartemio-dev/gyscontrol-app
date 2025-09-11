// ===================================================
// 📁 Archivo: PedidoSelector.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Componente para mostrar pedidos en formato similar a CotizacionCodigoSimple
// ===================================================

'use client'

import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { Check, Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ListaEquipoItem } from '@/types'
import { obtenerTodosLosPedidos } from '@/lib/utils/pedidoDisplayHelpers'

interface PedidoCodigoSimpleProps {
  item: ListaEquipoItem
  interactive?: boolean
  onPedidoClick?: (pedidoId: string) => void
}

/**
 * Componente que muestra los pedidos de un item en formato compacto
 * Similar a CotizacionCodigoSimple pero para pedidos
 */
export function PedidoCodigoSimple({
  item,
  interactive = false,
  onPedidoClick
}: PedidoCodigoSimpleProps) {
  const pedidos = obtenerTodosLosPedidos(item)
  
  // 🔍 Si no hay pedidos
  if (!pedidos || pedidos.length === 0) {
    return (
      <Badge variant="outline" className="text-[10px] px-2 py-1 flex items-center gap-1">
        <Package className="w-3 h-3 text-muted-foreground" />
        Disponible
      </Badge>
    )
  }

  // ✅ Mostrar todos los pedidos en lista vertical
  return (
    <div className="flex flex-col gap-1">
      {pedidos.map((codigo, index) => {
        // Buscar el pedido correspondiente para obtener más información
        const pedidoItem = item.pedidos?.find(p => p.pedido?.codigo === codigo)
        const pedidoId = pedidoItem?.pedido?.id
        const estado = pedidoItem?.pedido?.estado || 'pendiente'
        const fechaEntrega = pedidoItem?.pedido?.fechaEntregaEstimada
        
        return (
          <Tooltip key={index}>
            <TooltipTrigger asChild>
              <Badge 
                variant="default"
                className={cn(
                  "text-[10px] px-2 py-1 flex items-center gap-1 cursor-help transition-all duration-200",
                  "bg-gray-700 hover:bg-gray-800 text-white",
                  interactive && "cursor-pointer"
                )}
                onClick={() => {
                  if (interactive && onPedidoClick && pedidoId) {
                    onPedidoClick(pedidoId)
                  }
                }}
              >
                <Check className="w-3 h-3" />
                {codigo}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="right" className="max-w-xs">
              <div className="space-y-1">
                <p className="font-semibold text-sm">{codigo}</p>
                <p className="text-xs text-muted-foreground">
                  <span className="font-medium">Estado:</span> {estado}
                </p>
                {fechaEntrega && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Entrega estimada:</span> {new Date(fechaEntrega).toLocaleDateString()}
                  </p>
                )}
                {interactive && (
                  <p className="text-xs text-blue-400">
                    Click para ver detalles del pedido
                  </p>
                )}
              </div>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

export default PedidoCodigoSimple
