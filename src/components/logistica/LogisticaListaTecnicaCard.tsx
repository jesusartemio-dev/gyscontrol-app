'use client'

import { useRouter } from 'next/navigation'
import { ListaEquipo } from '@/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Props {
  lista: ListaEquipo & {
    resumen?: {
      totalItems: number
      cotizados: number
      respondidos: number
      pendientes: number
    }
  }
  onRefresh?: () => void
}

export default function LogisticaListaTecnicaCard({ lista, onRefresh }: Props) {
  const router = useRouter()

  const handleViewDetail = () => {
    router.push(`/logistica/listas/${lista.id}`)
  }

  // 🔵 Semáforo de estado
  const total = lista.resumen?.totalItems || 0
  const cotizados = lista.resumen?.cotizados || 0
  const respondidos = lista.resumen?.respondidos || 0

  const allResponded = total > 0 && respondidos === total
  const someCotizados = cotizados > 0

  const statusBadge = allResponded
    ? { color: 'bg-green-500', label: 'Respondido' }
    : someCotizados
    ? { color: 'bg-yellow-400', label: 'Parcial' }
    : { color: 'bg-red-500', label: 'Sin Cotizar' }

  return (
    <Card className="w-full hover:shadow-lg transition">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>{lista.nombre}</span>
          <div className="flex gap-2">
            <Badge variant="outline">{lista.estado}</Badge>
            <span
              className={`text-white text-xs px-2 py-1 rounded ${statusBadge.color}`}
            >
              {statusBadge.label}
            </span>
          </div>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-2 text-sm text-gray-700">
        <div>
          <strong>Proyecto:</strong> {lista.proyecto?.nombre || 'Sin proyecto'}
        </div>
        <div>
          <strong>Descripción:</strong> {lista.nombre || '—'}
        </div>
        <div>
          <strong>Fecha creación:</strong> {new Date(lista.createdAt).toLocaleDateString()}
        </div>
        <div>
          <strong>Resumen:</strong>
          {lista.resumen ? (
            <ul className="list-disc list-inside">
              <li>Total ítems: {lista.resumen.totalItems}</li>
              <li>Cotizados: {lista.resumen.cotizados}</li>
              <li>Respondidos: {lista.resumen.respondidos}</li>
              <li>Pendientes: {lista.resumen.pendientes}</li>
            </ul>
          ) : (
            ' No disponible'
          )}
        </div>
        <div className="flex justify-between items-center">
          <Button size="sm" onClick={handleViewDetail}>
            Ver Detalle
          </Button>
          {onRefresh && (
            <Button size="sm" variant="outline" onClick={onRefresh}>
              🔄 Refrescar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
