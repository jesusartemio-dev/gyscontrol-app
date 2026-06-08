'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Send, CheckCircle2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface PedidoItem {
  id: string
  codigo?: string | null
  descripcion?: string | null
  unidad?: string | null
  cantidadPedida: number
  cantidadAtendida?: number | null
  estadoEntrega?: string | null
  precioUnitario?: number | null
  costoTotal?: number | null
}

interface PedidoDetalle {
  id: string
  codigo: string
  estado: string
  ventaEquipoId?: string | null
  fechaNecesaria?: string | null
  items?: PedidoItem[]
}

interface Props {
  pedidoId: string | null
  onClose: () => void
  onUpdated?: () => void
}

const fmt = (n?: number | null) =>
  `$${(n ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}`

// Flujo del pedido (los estados después de "aprobado" los gestiona logística).
const FLUJO: { key: string; label: string }[] = [
  { key: 'borrador', label: 'Borrador' },
  { key: 'enviado', label: 'Enviado' },
  { key: 'aprobado', label: 'Aprobado' },
  { key: 'atendido', label: 'Atendido' },
  { key: 'parcial', label: 'Parcial' },
  { key: 'entregado', label: 'Entregado' },
]

const ENTREGA_COLOR: Record<string, string> = {
  pendiente: 'bg-gray-100 text-gray-600',
  en_proceso: 'bg-blue-100 text-blue-700',
  parcial: 'bg-amber-100 text-amber-700',
  entregado: 'bg-emerald-100 text-emerald-700',
  retrasado: 'bg-red-100 text-red-700',
  cancelado: 'bg-red-100 text-red-700',
}

export default function DetallePedidoVentaModal({ pedidoId, onClose, onUpdated }: Props) {
  const [pedido, setPedido] = useState<PedidoDetalle | null>(null)
  const [loading, setLoading] = useState(false)
  const [accion, setAccion] = useState(false)

  const cargar = (id: string) => {
    setLoading(true)
    fetch(`/api/pedido-equipo/${id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setPedido(d))
      .catch(() => setPedido(null))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    if (!pedidoId) {
      setPedido(null)
      return
    }
    cargar(pedidoId)
  }, [pedidoId])

  const cambiarEstado = async (nuevoEstado: string, mensaje: string) => {
    if (!pedido) return
    setAccion(true)
    try {
      const res = await fetch(`/api/pedido-equipo/${pedido.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error ?? 'No se pudo actualizar el pedido')
        return
      }
      toast.success(mensaje)
      cargar(pedido.id)
      onUpdated?.()
    } catch {
      toast.error('No se pudo actualizar el pedido')
    } finally {
      setAccion(false)
    }
  }

  const items = pedido?.items ?? []
  const total = items.reduce((s, it) => s + (it.costoTotal ?? (it.precioUnitario ?? 0) * it.cantidadPedida), 0)
  const totalPedida = items.reduce((s, it) => s + it.cantidadPedida, 0)
  const totalAtendida = items.reduce((s, it) => s + (it.cantidadAtendida ?? 0), 0)
  const pctEntrega = totalPedida > 0 ? Math.min(100, Math.round((totalAtendida / totalPedida) * 100)) : 0
  const estadoIdx = pedido ? FLUJO.findIndex((s) => s.key === pedido.estado) : -1
  const cancelado = pedido?.estado === 'cancelado'

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
            <div className="space-y-4">
              {/* Flujo de estados */}
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Flujo del pedido</p>
                {cancelado ? (
                  <Badge variant="outline" className="bg-red-100 text-red-700">Cancelado</Badge>
                ) : (
                  <div className="flex flex-wrap items-center gap-1">
                    {FLUJO.map((s, i) => (
                      <span key={s.key} className="flex items-center gap-1">
                        <span
                          className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                            i < estadoIdx
                              ? 'bg-emerald-100 text-emerald-700'
                              : i === estadoIdx
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-100 text-gray-400'
                          }`}
                        >
                          {s.label}
                        </span>
                        {i < FLUJO.length - 1 && <span className="text-gray-300">›</span>}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Acción de comercial según el estado */}
              {pedido.estado === 'borrador' && (
                <Button size="sm" className="w-full" onClick={() => cambiarEstado('enviado', 'Pedido enviado a logística')} disabled={accion}>
                  {accion ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  Enviar a logística
                </Button>
              )}
              {pedido.estado === 'enviado' && (
                <Button size="sm" className="w-full" onClick={() => cambiarEstado('aprobado', 'Pedido aprobado')} disabled={accion}>
                  {accion ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Aprobar pedido
                </Button>
              )}
              {['aprobado', 'atendido', 'parcial'].includes(pedido.estado) && (
                <p className="rounded-md bg-blue-50 px-3 py-2 text-xs text-blue-700">
                  En gestión de <span className="font-medium">logística</span> (compra y entrega). El avance se refleja abajo.
                </p>
              )}

              {pedido.fechaNecesaria && (
                <p className="text-xs text-muted-foreground">
                  Fecha necesaria:{' '}
                  <span className="font-medium text-foreground">
                    {new Date(pedido.fechaNecesaria).toLocaleDateString('es-PE', { timeZone: 'UTC' })}
                  </span>
                </p>
              )}

              {/* Progreso de entrega */}
              <div>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="font-medium text-muted-foreground">Entrega</span>
                  <span className="font-medium">{pctEntrega}% ({totalAtendida}/{totalPedida})</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pctEntrega}%` }} />
                </div>
              </div>

              {/* Ítems */}
              <div className="rounded-md border">
                {items.map((it) => {
                  const atend = it.cantidadAtendida ?? 0
                  const estadoEnt = it.estadoEntrega || 'pendiente'
                  return (
                    <div key={it.id} className="border-b px-3 py-2 last:border-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium leading-snug">{it.descripcion}</p>
                          <p className="text-xs text-muted-foreground">
                            {it.codigo && <span className="mr-1">{it.codigo}</span>}
                            {it.cantidadPedida} {it.unidad || 'und'} · {fmt(it.precioUnitario)} c/u
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          <p className="text-sm font-semibold">
                            {fmt(it.costoTotal ?? (it.precioUnitario ?? 0) * it.cantidadPedida)}
                          </p>
                          <Badge variant="outline" className={`text-[10px] ${ENTREGA_COLOR[estadoEnt] ?? ''}`}>
                            {atend}/{it.cantidadPedida} · {estadoEnt.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {items.length === 0 && (
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
