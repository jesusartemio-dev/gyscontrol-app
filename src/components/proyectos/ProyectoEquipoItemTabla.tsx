'use client'

import { useState } from 'react'
import { ProyectoEquipoItem } from '@/types'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface Props {
  items: ProyectoEquipoItem[]
  onUpdated?: () => void
}

export default function ProyectoEquipoItemTabla({ items, onUpdated }: Props) {
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
          <tr className="bg-gray-100 text-gray-800">
            <th className="p-2 text-left">Código</th>
            <th className="p-2 text-left">Descripción</th>
            <th className="p-2 text-left">Unidad</th>
            <th className="p-2 text-left">Cantidad</th>
            <th className="p-2 text-left">Presupuesto</th>
            <th className="p-2 text-left">Costo Real</th>
            <th className="p-2 text-left">Estado</th>
            <th className="p-2 text-left">Cambio</th>
            <th className="p-2 text-left">¿Nuevo?</th>
            <th className="p-2 text-left">Lista Técnica</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const fueReemplazo = !!item.equipoOriginalId
            const estadoVisual = fueReemplazo ? 'pendiente' : item.estado
            return (
              <tr key={item.id} className="border-t">
                <td className="p-2">
                  {item.codigo}{' '}
                  {fueReemplazo && (
                    <Badge className="ml-1 text-xs" variant="outline" title={`Reemplaza al equipo original`}>
                      Reemplazo
                    </Badge>
                  )}
                </td>
                <td className="p-2">{item.descripcion}</td>
                <td className="p-2">{item.unidad}</td>
                <td className="p-2">{item.cantidad}</td>
                <td className="p-2">S/. {item.costoInterno.toFixed(2)}</td>
                <td className="p-2">S/. {item.costoReal.toFixed(2)}</td>
                <td className="p-2">
                  <Badge className={getEstadoColor(estadoVisual)}>{estadoVisual}</Badge>
                </td>
                <td className="p-2 text-center text-gray-700">{item.motivoCambio || '—'}</td>
                <td className="p-2 text-center">
                  {item.nuevo ? (
                    <Badge className="bg-green-100 text-green-700 border border-green-400">Nuevo</Badge>
                  ) : (
                    '—'
                  )}
                </td>
                <td className="p-2 text-center text-gray-700">{item.lista?.nombre || '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
