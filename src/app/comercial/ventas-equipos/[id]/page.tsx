'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  Package,
  ArrowLeft,
  Building,
  Calendar,
  DollarSign,
  FileText,
  Loader2,
  ShoppingCart,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import type { VentaEquipo } from '@/types/modelos'

const ESTADO_LABELS: Record<string, string> = {
  creado: 'Creado',
  pedido_generado: 'Pedido Generado',
  en_entrega: 'En Entrega',
  entregado: 'Entregado',
  facturado: 'Facturado',
  cancelado: 'Cancelado',
}

const ESTADO_COLORS: Record<string, string> = {
  creado: 'bg-gray-100 text-gray-800',
  pedido_generado: 'bg-blue-100 text-blue-800',
  en_entrega: 'bg-yellow-100 text-yellow-800',
  entregado: 'bg-green-100 text-green-800',
  facturado: 'bg-purple-100 text-purple-800',
  cancelado: 'bg-red-100 text-red-800',
}

export default function VentaEquipoDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [venta, setVenta] = useState<VentaEquipo | null>(null)
  const [loading, setLoading] = useState(true)
  const [updatingEstado, setUpdatingEstado] = useState(false)

  useEffect(() => {
    fetch(`/api/venta-equipo/${id}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setVenta(data) })
      .finally(() => setLoading(false))
  }, [id])

  const handleEstadoChange = async (nuevoEstado: string) => {
    if (!venta) return
    setUpdatingEstado(true)
    try {
      const res = await fetch(`/api/venta-equipo/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ estado: nuevoEstado }),
      })
      if (!res.ok) throw new Error('Error al actualizar estado')
      const updated = await res.json()
      setVenta(updated)
      toast.success('Estado actualizado')
    } catch {
      toast.error('No se pudo actualizar el estado')
    } finally {
      setUpdatingEstado(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
      </div>
    )
  }

  if (!venta) {
    return (
      <div className="p-6 text-center text-gray-500">
        <p>Venta de equipos no encontrada</p>
        <Button variant="outline" className="mt-3" onClick={() => router.push('/comercial/ventas-equipos')}>
          Volver al listado
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <Button variant="ghost" size="sm" onClick={() => router.push('/comercial/ventas-equipos')} className="h-8 px-2">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{venta.codigo}</h1>
            <Badge className={`${ESTADO_COLORS[venta.estado]} border-0`}>
              {ESTADO_LABELS[venta.estado] || venta.estado}
            </Badge>
          </div>
          <p className="text-gray-600 text-sm mt-0.5">{venta.nombre}</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={venta.estado} onValueChange={handleEstadoChange} disabled={updatingEstado}>
            <SelectTrigger className="w-[160px] h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(ESTADO_LABELS).map(([val, label]) => (
                <SelectItem key={val} value={val}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Info cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-0 bg-gray-50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Building className="h-3.5 w-3.5" />
              Cliente
            </div>
            <p className="font-semibold text-sm">{venta.cliente?.nombre ?? '—'}</p>
            <p className="text-xs text-gray-500">{venta.cliente?.codigo}</p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gray-50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <DollarSign className="h-3.5 w-3.5" />
              Monto Total
            </div>
            <p className="font-semibold text-sm">
              {venta.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })} {venta.moneda}
            </p>
            {venta.descuento > 0 && (
              <p className="text-xs text-gray-500">Descuento: {venta.descuento}%</p>
            )}
          </CardContent>
        </Card>
        <Card className="border-0 bg-gray-50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Calendar className="h-3.5 w-3.5" />
              Entrega estimada
            </div>
            <p className="font-semibold text-sm">
              {venta.fechaEntregaEstimada
                ? new Date(venta.fechaEntregaEstimada).toLocaleDateString('es-PE')
                : '—'}
            </p>
          </CardContent>
        </Card>
        <Card className="border-0 bg-gray-50">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <FileText className="h-3.5 w-3.5" />
              Cotización origen
            </div>
            {venta.cotizacion ? (
              <button
                onClick={() => router.push(`/comercial/cotizaciones/${venta.cotizacion!.id}`)}
                className="font-semibold text-sm text-blue-600 hover:underline flex items-center gap-1"
              >
                {venta.cotizacion.codigo}
                <ExternalLink className="h-3 w-3" />
              </button>
            ) : (
              <p className="font-semibold text-sm">—</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Items */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Package className="h-4 w-4 text-orange-500" />
              Equipos ({venta.items?.length ?? venta._count?.items ?? 0})
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {venta.items && venta.items.length > 0 ? (
              <div className="space-y-2">
                {venta.items.map((item) => (
                  <div key={item.id} className="flex items-start justify-between gap-2 py-2 border-b last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.descripcion}</p>
                      <p className="text-xs text-gray-500">
                        {item.codigo && <span className="mr-2">{item.codigo}</span>}
                        {item.cantidad} {item.unidad || 'und'}
                      </p>
                    </div>
                    <p className="text-sm font-semibold text-gray-800 flex-shrink-0">
                      ${item.costoCliente.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Sin items cargados</p>
            )}
          </CardContent>
        </Card>

        {/* Pedidos y OCs */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-blue-500" />
                  Pedidos ({venta.pedidos?.length ?? venta._count?.pedidos ?? 0})
                </CardTitle>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs"
                  onClick={() => router.push(`/logistica/pedidos?ventaEquipoId=${venta.id}`)}
                >
                  Ver en Logística
                </Button>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {venta.pedidos && venta.pedidos.length > 0 ? (
                <div className="space-y-1.5">
                  {venta.pedidos.map((p) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 py-1.5 border-b last:border-0">
                      <button
                        onClick={() => router.push(`/logistica/pedidos/${p.id}`)}
                        className="text-sm text-blue-600 hover:underline font-medium"
                      >
                        {p.codigo}
                      </button>
                      <Badge variant="outline" className="text-xs">{p.estado}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-3">Sin pedidos generados</p>
              )}
            </CardContent>
          </Card>

          {venta.observacion && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Observaciones</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <p className="text-sm text-gray-600">{venta.observacion}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
