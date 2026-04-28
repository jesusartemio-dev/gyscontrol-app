// ===================================================
// 📁 PedidosBloqueantesWarning.tsx
// 🔧 Banner que avisa al usuario cuando un lista item tiene pedidos
//    en estados que bloquean el reemplazo (no borrador, no cancelado).
// ===================================================

'use client'

import { AlertTriangle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export interface PedidoBloqueante {
  pedidoEquipoItemId: string
  pedidoId: string
  pedidoCodigo: string
  pedidoEstado: string
  cantidadPedida: number
  cantidadAtendida: number | null
  estadoItem: string
}

interface Props {
  pedidos: PedidoBloqueante[]
  loading?: boolean
}

export default function PedidosBloqueantesWarning({ pedidos, loading }: Props) {
  if (loading) return null
  if (pedidos.length === 0) return null

  return (
    <div className="mb-4 rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1 space-y-2">
          <h4 className="font-semibold text-amber-900 text-sm">
            No se puede reemplazar — el ítem tiene {pedidos.length === 1 ? 'un pedido' : `${pedidos.length} pedidos`} en curso
          </h4>
          <p className="text-xs text-amber-800">
            Para poder reemplazar este ítem primero debes pasar el pedido a <strong>borrador</strong> o
            eliminar el ítem del pedido. Pedidos involucrados:
          </p>
          <ul className="space-y-1 mt-2">
            {pedidos.map(p => (
              <li key={p.pedidoEquipoItemId} className="flex items-center gap-2 text-xs">
                <Badge variant="outline" className="font-mono bg-white border-amber-400 text-amber-900">
                  {p.pedidoCodigo}
                </Badge>
                <Badge variant="secondary" className="text-[10px] capitalize">
                  {p.pedidoEstado}
                </Badge>
                <span className="text-amber-800">
                  cant. pedida: <strong>{p.cantidadPedida}</strong>
                  {p.cantidadAtendida != null && p.cantidadAtendida > 0 && (
                    <> · atendida: <strong>{p.cantidadAtendida}</strong></>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
