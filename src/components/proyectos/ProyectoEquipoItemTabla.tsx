'use client'

import { ProyectoEquipoItem } from '@/types'
import { Badge } from '@/components/ui/badge'

interface Props {
  items: ProyectoEquipoItem[]
  onUpdated?: () => void
}

export default function ProyectoEquipoItemTabla({ items }: Props) {
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'pendiente':
        return 'bg-gray-300 text-gray-800'
      case 'revisado_tecnico':
        return 'bg-yellow-400 text-gray-900'
      case 'aprobado_coordinador':
        return 'bg-blue-500 text-white'
      case 'aprobado_gestor':
        return 'bg-green-500 text-white'
      case 'en_lista':
        return 'bg-indigo-500 text-white'
      case 'comprado':
        return 'bg-purple-600 text-white'
      case 'reemplazado':
        return 'bg-orange-500 text-white'
      case 'entregado':
        return 'bg-emerald-600 text-white'
      default:
        return 'bg-zinc-400 text-white'
    }
  }

  return (
    <div className="border rounded-md overflow-x-auto">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100 text-gray-800 text-left">
            <th className="p-2">Código</th>
            <th className="p-2">Descripción</th>
            <th className="p-2">Unidad</th>
            <th className="p-2 text-center">Cantidad</th>
            <th className="p-2 text-right text-blue-700">Presupuesto</th>
            <th className="p-2 text-right text-green-700">Costo Real</th>
            <th className="p-2 text-center">Estado</th>
            <th className="p-2 text-center">Cambio</th>
            <th className="p-2 text-center">¿Nuevo?</th>
            <th className="p-2 text-center">Lista Técnica</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const fueReemplazo = !!item.equipoOriginalId
            const estadoVisual = fueReemplazo ? 'pendiente' : item.estado

            return (
              <tr key={item.id} className="border-t hover:bg-gray-50">
                <td className="p-2">
                  {item.codigo}{' '}
                  {fueReemplazo && (
                    <Badge className="ml-1 text-xs" variant="outline" title="Reemplaza al equipo original">
                      Reemplazo
                    </Badge>
                  )}
                </td>
                <td className="p-2">{item.descripcion}</td>
                <td className="p-2">{item.unidad}</td>
                <td className="p-2 text-center">{item.cantidad}</td>
                <td className="p-2 text-right text-blue-700">${item.costoInterno.toFixed(2)}</td>
                <td className="p-2 text-right text-green-700">${item.costoReal.toFixed(2)}</td>
                <td className="p-2 text-center">
                  <Badge className={`${getEstadoColor(estadoVisual)} text-xs px-2 py-1 rounded`}>
                    {estadoVisual.replace('_', ' ')}
                  </Badge>
                </td>
                <td className="p-2 text-center text-gray-600">{item.motivoCambio || '—'}</td>
                <td className="p-2 text-center">
                  {item.nuevo ? (
                    <Badge className="bg-green-100 text-green-700 border border-green-400 text-xs">Nuevo</Badge>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="p-2 text-center text-gray-600">{item.lista?.nombre || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
