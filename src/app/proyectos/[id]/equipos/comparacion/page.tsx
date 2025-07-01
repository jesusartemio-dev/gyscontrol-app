'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { getProyectoById } from '@/lib/services/proyecto'
import { getListaEquiposPorProyecto } from '@/lib/services/listaEquipo'
import type { Proyecto, ListaEquipoItem } from '@/types'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

export default function ComparacionEquiposPage() {
  const { id } = useParams<{ id: string }>()
  const [proyecto, setProyecto] = useState<Proyecto | null>(null)
  const [listaItems, setListaItems] = useState<ListaEquipoItem[]>([])
  const [loading, setLoading] = useState(true)

  const [totalPEI, setTotalPEI] = useState(0)
  const [totalLEI, setTotalLEI] = useState(0)

  useEffect(() => {
    if (!id) return
    const fetchData = async () => {
      const p = await getProyectoById(id)
      const listas = await getListaEquiposPorProyecto(id)
      const items = listas.flatMap((l) => l.items)
      setProyecto(p)
      setListaItems(items)
      setLoading(false)

      const totalPEI = p.equipos.reduce((acc, grupo) => {
        return acc + grupo.items.reduce((suma, item) =>
          suma + (item.precioInterno || 0) * (item.cantidad || 0), 0)
      }, 0)
      const totalLEI = items.reduce((acc, item) =>
        acc + (item.precioElegido || 0) * (item.cantidad || 0), 0)

      setTotalPEI(totalPEI)
      setTotalLEI(totalLEI)
    }
    fetchData()
  }, [id])

  if (loading) return <Skeleton className="h-32 w-full" />
  if (!proyecto) return <p className="p-4">Proyecto no encontrado</p>

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold text-blue-700">
        🔍 Comparación de Equipos por Grupo - {proyecto.nombre}
      </h1>

      {proyecto.equipos.map((grupo) => {
        const itemsPEI = grupo.items
        const itemsLEI = listaItems.filter(
          (item) =>
            item.proyectoEquipoId === grupo.id ||
            (item.estado === 'reemplazo' && grupo.items.some(i => i.id === item.reemplazaAId))
        )
        const itemsNuevos = listaItems.filter(
          (item) =>
            !item.proyectoEquipoItemId &&
            item.estado === 'nuevo' &&
            item.proyectoEquipoId === grupo.id
        )

        const subtotalPEI = itemsPEI.reduce(
          (sum, i) => sum + (i.precioInterno || 0) * (i.cantidad || 0), 0)
        const subtotalLEI = itemsLEI.reduce(
          (sum, i) => sum + (i.precioElegido || 0) * (i.cantidad || 0), 0)

        return (
          <div key={grupo.id} className="border rounded-lg bg-white shadow-sm p-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">{grupo.nombre}</h2>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border">
                <thead className="bg-gray-100">
                  <tr>
                    <th colSpan={4} className="text-center border-r">Cotización (ProyectoEquipoItem)</th>
                    <th className="w-2"></th>
                    <th colSpan={4} className="text-center">Lista Técnica (ListaEquipoItem)</th>
                  </tr>
                  <tr>
                    <th className="p-2">Código</th>
                    <th className="p-2">Descripción</th>
                    <th className="p-2 text-right">Costo</th>
                    <th className="p-2">Estado</th>
                    <th></th>
                    <th className="p-2">Código</th>
                    <th className="p-2">Descripción</th>
                    <th className="p-2 text-right">Costo</th>
                    <th className="p-2">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {itemsPEI.map((pei) => {
                    const relacionados = listaItems.filter((lei) => lei.proyectoEquipoItemId === pei.id)
                    const reemplazos = listaItems.filter((lei) => lei.reemplazaAId === pei.id)
                    const costoPEI = (pei.precioInterno || 0) * (pei.cantidad || 0)

                    if (pei.estado === 'descartado' || pei.estado === 'reemplazado') {
                      return (
                        <tr key={pei.id} className="border-t bg-gray-100">
                          <td className="p-2">{pei.codigo}</td>
                          <td className="p-2">{pei.descripcion}</td>
                          <td className="p-2 text-right text-blue-700">US$ {costoPEI.toFixed(2)}</td>
                          <td className="p-2">
                            <Badge className="w-[80px] justify-center bg-gray-200 text-gray-700">
                              {pei.estado}
                            </Badge>
                          </td>
                          <td className="text-center text-gray-400">→</td>
                          <td className="p-2 italic text-gray-400" colSpan={4}>Ítem {pei.estado}</td>
                        </tr>
                      )
                    }

                    if (relacionados.length === 0 && reemplazos.length === 0) {
                      return (
                        <tr key={pei.id} className="border-t bg-red-50">
                          <td className="p-2">{pei.codigo}</td>
                          <td className="p-2">{pei.descripcion}</td>
                          <td className="p-2 text-right text-blue-700">US$ {costoPEI.toFixed(2)}</td>
                          <td className="p-2">
                            <Badge className="w-[80px] justify-center bg-red-100 text-red-700">
                              no_incluido
                            </Badge>
                          </td>
                          <td className="text-center text-gray-400">→</td>
                          <td className="p-2 italic text-gray-400" colSpan={4}>No incluido</td>
                        </tr>
                      )
                    }

                    const itemsRelacionados = [...relacionados, ...reemplazos]

                    return itemsRelacionados.map((lei) => {
                      const costoLEI = (lei.precioElegido || 0) * (lei.cantidad || 0)
                      return (
                        <tr key={lei.id} className="border-t">
                          <td className="p-2">{pei.codigo}</td>
                          <td className="p-2">{pei.descripcion}</td>
                          <td className="p-2 text-right text-blue-700">US$ {costoPEI.toFixed(2)}</td>
                          <td className="p-2">
                            <Badge className="w-[80px] justify-center bg-green-100 text-green-700">
                              {pei.estado}
                            </Badge>
                          </td>
                          <td className="text-center text-gray-400">→</td>
                          <td className="p-2">{lei.codigo}</td>
                          <td className="p-2">
                            {lei.descripcion}
                            {lei.reemplazaAId && (
                              <div className="text-xs text-gray-500">
                                (Reemplazo de: {grupo.items.find(i => i.id === lei.reemplazaAId)?.codigo || '¿?'})
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-right text-green-700">US$ {costoLEI.toFixed(2)}</td>
                          <td className="p-2">
                            <Badge
                              className={`w-[80px] justify-center ${
                                lei.estado === 'nuevo'
                                  ? 'bg-orange-100 text-orange-700'
                                  : lei.estado === 'reemplazo'
                                  ? 'bg-purple-100 text-purple-700'
                                  : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {lei.estado}
                            </Badge>
                          </td>
                        </tr>
                      )
                    })
                  })}

                  {itemsNuevos.map((lei) => {
                    const costoLEI = (lei.precioElegido || 0) * (lei.cantidad || 0)
                    return (
                      <tr key={lei.id} className="border-t bg-yellow-50">
                        <td className="p-2 italic text-gray-400" colSpan={4}>Nuevo ítem</td>
                        <td className="text-center text-gray-400">→</td>
                        <td className="p-2">{lei.codigo}</td>
                        <td className="p-2">{lei.descripcion}</td>
                        <td className="p-2 text-right text-orange-600">US$ {costoLEI.toFixed(2)}</td>
                        <td className="p-2">
                          <Badge className="w-[80px] justify-center bg-orange-100 text-orange-700">
                            {lei.estado}
                          </Badge>
                        </td>
                      </tr>
                    )
                  })}

                  <tr className="bg-gray-50 font-bold border-t">
                    <td colSpan={3} className="p-2 text-right">Subtotal PEI:</td>
                    <td className="p-2 text-blue-800 text-right">US$ {subtotalPEI.toFixed(2)}</td>
                    <td></td>
                    <td colSpan={2} className="p-2 text-right">Subtotal LEI:</td>
                    <td className="p-2 text-green-800 text-right">US$ {subtotalLEI.toFixed(2)}</td>
                    <td></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      <div className="border-t pt-4 mt-6 text-right text-lg font-semibold text-gray-700">
        Total Cotización (PEI): <span className="text-blue-700">US$ {totalPEI.toFixed(2)}</span> &nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;
        Total Lista Técnica (LEI): <span className="text-green-700">US$ {totalLEI.toFixed(2)}</span>
      </div>
    </div>
  )
}
