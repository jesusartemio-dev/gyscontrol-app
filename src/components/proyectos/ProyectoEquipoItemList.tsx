'use client'

import { useEffect, useState } from 'react'
import type { ProyectoEquipoCotizadoItem, EstadoEquipoItem } from '@/types'
import { getProyectoEquipoItems } from '@/lib/services/proyectoEquipoItem'

import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface Props {
  proyectoId: string
  filtroEquipoId?: string
  modoRevision?: boolean
  onUpdated?: (item: ProyectoEquipoCotizadoItem) => void
}

const coloresEstado: Record<EstadoEquipoItem, string> = {
  pendiente: 'bg-gray-300',
  en_lista: 'bg-blue-400',
  reemplazado: 'bg-yellow-400 text-black',
  descartado: 'bg-red-600',
}

export default function ProyectoEquipoItemList({ proyectoId, filtroEquipoId, modoRevision }: Props) {
  const [items, setItems] = useState<ProyectoEquipoCotizadoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetch = async () => {
      try {
        const data = await getProyectoEquipoItems(proyectoId)
        const filtrados = filtroEquipoId
          ? data.filter((item) => item.proyectoEquipoId === filtroEquipoId)
          : data
        setItems(filtrados)
      } catch (err) {
        console.error('Error al cargar ítems:', err)
        setError('Error al cargar ítems del proyecto')
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [proyectoId, filtroEquipoId])

  if (loading) return <Skeleton className="h-32 w-full rounded-xl" />
  if (error) return <p className="text-red-500 text-sm">{error}</p>
  if (items.length === 0) return <p className="text-gray-500 italic">No hay ítems de equipos técnicos registrados.</p>

  return (
    <div className="overflow-auto border rounded-md">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-2 text-left">Código</th>
            <th className="p-2 text-left">Descripción</th>
            <th className="p-2">Unidad</th>
            <th className="p-2">Cant.</th>
            <th className="p-2">Estado</th>
            <th className="p-2">Cambio</th>
            <th className="p-2">Precio</th>
            <th className="p-2 text-left">Lista Técnica</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-t hover:bg-gray-50">
              <td className="p-2 font-medium">{item.codigo}</td>
              <td className="p-2 text-gray-700">{item.descripcion}</td>
              <td className="p-2 text-center">{item.unidad}</td>
              <td className="p-2 text-center">{item.cantidad}</td>
              <td className="p-2 text-center">
                <Badge className={`text-white px-2 py-1 text-xs rounded ${coloresEstado[item.estado]}`}>{item.estado.replaceAll('_', ' ')}</Badge>
              </td>
              <td className="p-2 text-center">{item.motivoCambio || '—'}</td>
              <td className="p-2 text-center">$ {item.precioInterno.toFixed(2)}</td>
              <td className="p-2 text-sm text-gray-600">
                {item.lista?.nombre ?? '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
