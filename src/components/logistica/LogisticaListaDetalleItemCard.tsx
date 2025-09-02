'use client'

import { ListaEquipoItem } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import LogisticaListaDetalleItemComparativo from './LogisticaListaDetalleItemComparativo'

interface Props {
  item: ListaEquipoItem
  onUpdated?: () => void
}

export default function LogisticaListaDetalleItemCard({ item, onUpdated }: Props) {
  const cotizacionesCount = item.cotizaciones.length
  const selectedCot = item.cotizaciones.find(c => c.id === item.cotizacionSeleccionadaId)

  const minPrecio = item.cotizaciones.reduce(
    (min, c) =>
      typeof c.precioUnitario === 'number' && c.precioUnitario < min
        ? c.precioUnitario
        : min,
    Number.POSITIVE_INFINITY
  )

  const minTiempo = item.cotizaciones.reduce(
    (min, c) =>
      typeof c.tiempoEntregaDias === 'number' && c.tiempoEntregaDias < min
        ? c.tiempoEntregaDias
        : min,
    Number.POSITIVE_INFINITY
  )

  return (
    <Card className="w-full hover:shadow-md transition p-2">
      <CardHeader>
        <CardTitle className="flex justify-between items-center text-sm">
          <div>
            <span className="font-bold">{item.codigo}</span> - {item.descripcion}
            <div className="text-xs text-gray-500">
              Unidad: {item.unidad} • Cantidad: {item.cantidad}
            </div>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="text-xs space-y-2">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline">Cotizaciones: {cotizacionesCount}</Badge>
          <Badge variant={selectedCot ? 'default' : 'outline'}>
            {selectedCot ? '✅ Cotización Seleccionada' : 'Sin Selección'}
          </Badge>

          {isFinite(minPrecio) && (
            <Badge variant="outline" className="bg-green-200 text-green-800">
              Mín. Precio: $ {minPrecio.toFixed(2)}
            </Badge>
          )}

          {isFinite(minTiempo) && (
            <Badge variant="outline" className="bg-yellow-200 text-yellow-800">
              Mín. Tiempo: {minTiempo} días
            </Badge>
          )}

          <Badge variant="outline">Presupuesto: $ {(item.presupuesto ?? 0).toFixed(2)}</Badge>
          <Badge variant="outline">Precio Elegido: $ {(item.precioElegido ?? 0).toFixed(2)}</Badge>
          <Badge variant="outline">Costo Elegido: $ {(item.costoElegido ?? 0).toFixed(2)}</Badge>
          <Badge variant="outline">Cant. Pedida: {item.cantidadPedida}</Badge>
          <Badge variant="outline">Cant. Entregada: {item.cantidadEntregada}</Badge>
        </div>

        <LogisticaListaDetalleItemComparativo item={item} onUpdated={onUpdated} />
      </CardContent>
    </Card>
  )
}
