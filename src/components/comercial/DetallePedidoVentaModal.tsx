'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'

interface PedidoItem {
  id: string
  codigo?: string | null
  descripcion?: string | null
  unidad?: string | null
  cantidadPedida: number
  precioUnitario?: number | null
  costoTotal?: number | null
}

interface PedidoDetalle {
  id: string
  codigo: string
  estado: string
  fechaNecesaria?: string | null
  items?: PedidoItem[]
}

interface Props {
  pedidoId: string | null
  onClose: () => void
}

const fmt = (n?: number | null) =>
  `$${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

export default function DetallePedidoVentaModal({ pedidoId, onClose }: Props) {
  const [pedido, setPedido] = useState<PedidoDetalle | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!pedidoId) {
      setPedido(null)
      return
    }
    setLoading(true)
    fetch(`/api/pedido-equipo/${pedidoId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPedido(d))
      .catch(() => setPedido(null))
      .finally(() => setLoading(false))
  }, [pedidoId])

  const total = (pedido?.items ?? []).reduce(
    (s, it) => s + (it.costoTotal ?? (it.precioUnitario ?? 0) * it.cantidadPedida),
    0,
  )

  return (
    <Dialog open={!!pedidoId} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            {pedido?.codigo ?? 'Detalle del pedido'}
            {pedido && <Badge variant="outline" className="text-xs">{pedido.estado}</Badge>}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : !pedido ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No se pudo cargar el pedido.</p>
          ) : (
            <div className="space-y-3">
              {pedido.fechaNecesaria && (
                <p className="text-xs text-muted-foreground">
                  Fecha necesaria:{' '}
                  <span className="font-medium text-foreground">
                    {new Date(pedido.fechaNecesaria).toLocaleDateString('es-PE', { timeZone: 'UTC' })}
                  </span>
                </p>
              )}
              <div className="rounded-md border">
                {(pedido.items ?? []).map((it) => (
                  <div key={it.id} className="flex items-start justify-between gap-2 border-b px-3 py-2 last:border-0">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium leading-snug">{it.descripcion}</p>
                      <p className="text-xs text-muted-foreground">
                        {it.codigo && <span className="mr-1">{it.codigo}</span>}
                        {it.cantidadPedida} {it.unidad || 'und'} · {fmt(it.precioUnitario)} c/u
                      </p>
                    </div>
                    <p className="shrink-0 text-sm font-semibold">
                      {fmt(it.costoTotal ?? (it.precioUnitario ?? 0) * it.cantidadPedida)}
                    </p>
                  </div>
                ))}
                {(pedido.items ?? []).length === 0 && (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">Sin ítems</p>
                )}
              </div>
              <div className="flex items-center justify-between border-t pt-2 text-sm font-semibold">
                <span>Total</span>
                <span>{fmt(total)}</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
