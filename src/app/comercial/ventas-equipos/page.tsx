'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Package,
  Search,
  Loader2,
  ChevronRight,
  Building,
  Calendar,
  DollarSign,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  creado: 'bg-gray-100 text-gray-800 border-gray-200',
  pedido_generado: 'bg-blue-100 text-blue-800 border-blue-200',
  en_entrega: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  entregado: 'bg-green-100 text-green-800 border-green-200',
  facturado: 'bg-purple-100 text-purple-800 border-purple-200',
  cancelado: 'bg-red-100 text-red-800 border-red-200',
}

export default function VentasEquiposPage() {
  const router = useRouter()
  const [ventas, setVentas] = useState<VentaEquipo[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [estadoFilter, setEstadoFilter] = useState('all')

  const fetchVentas = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('searchText', search)
      if (estadoFilter !== 'all') params.set('estado', estadoFilter)
      const res = await fetch(`/api/venta-equipo?${params}`)
      if (res.ok) {
        const data = await res.json()
        setVentas(data)
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [search, estadoFilter])

  useEffect(() => { fetchVentas() }, [fetchVentas])

  const totalMonto = ventas.reduce((s, v) => s + (v.grandTotal || 0), 0)

  return (
    <div className="p-4 md:p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Package className="h-5 w-5 text-orange-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Ventas de Equipos</h1>
            <p className="text-sm text-gray-500">{ventas.length} registros · ${totalMonto.toLocaleString('en-US', { minimumFractionDigits: 0 })} USD</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por código, nombre o cliente..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={estadoFilter} onValueChange={setEstadoFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="creado">Creado</SelectItem>
            <SelectItem value="pedido_generado">Pedido Generado</SelectItem>
            <SelectItem value="en_entrega">En Entrega</SelectItem>
            <SelectItem value="entregado">Entregado</SelectItem>
            <SelectItem value="facturado">Facturado</SelectItem>
            <SelectItem value="cancelado">Cancelado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-orange-500" />
        </div>
      ) : ventas.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-gray-500">
            <Package className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No hay ventas de equipos</p>
            <p className="text-sm mt-1">Las ventas se crean desde cotizaciones aprobadas con equipos</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {ventas.map((venta) => (
            <Card
              key={venta.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/comercial/ventas-equipos/${venta.id}`)}
            >
              <CardContent className="py-3 px-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="p-1.5 bg-orange-50 rounded">
                      <Package className="h-4 w-4 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-gray-900">{venta.codigo}</span>
                        <Badge className={`text-xs border ${ESTADO_COLORS[venta.estado] || ''}`}>
                          {ESTADO_LABELS[venta.estado] || venta.estado}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 truncate">{venta.nombre}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                        {(venta as any).cliente?.nombre && (
                          <span className="flex items-center gap-1">
                            <Building className="h-3 w-3" />
                            {(venta as any).cliente.nombre}
                          </span>
                        )}
                        {venta.fechaEntregaEstimada && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(venta.fechaEntregaEstimada).toLocaleDateString('es-PE')}
                          </span>
                        )}
                        {venta.grandTotal != null && (
                          <span className="flex items-center gap-1 font-medium text-gray-600">
                            <DollarSign className="h-3 w-3" />
                            {venta.grandTotal.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
