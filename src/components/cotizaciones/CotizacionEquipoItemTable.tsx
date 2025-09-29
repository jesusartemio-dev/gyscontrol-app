'use client'

import { useState } from 'react'
import { Save, X, Pencil, Trash2, Filter } from 'lucide-react'
import type { CotizacionEquipoItem } from '@/types'
import { toast } from 'sonner'

interface Props {
  items: CotizacionEquipoItem[]
  onUpdated?: (item: CotizacionEquipoItem) => void
  onDeleted?: (id: string) => void
}

export default function CotizacionEquipoItemTable({ items, onUpdated, onDeleted }: Props) {
  const [editModeId, setEditModeId] = useState<string | null>(null)
  const [editCantidad, setEditCantidad] = useState<number>(0)
  const [filter, setFilter] = useState('')

  const iniciarEdicion = (item: CotizacionEquipoItem) => {
    setEditModeId(item.id)
    setEditCantidad(item.cantidad)
  }

  const cancelarEdicion = () => {
    setEditModeId(null)
    setEditCantidad(0)
  }

  const guardarCambios = (item: CotizacionEquipoItem) => {
    if (editCantidad <= 0) {
      toast.warning('Cantidad debe ser mayor que cero.')
      return
    }

    const costoInterno = +(editCantidad * item.precioInterno).toFixed(2)
    const costoCliente = +(editCantidad * item.precioCliente).toFixed(2)

    const actualizado: CotizacionEquipoItem = {
      ...item,
      cantidad: editCantidad,
      costoInterno,
      costoCliente
    }

    onUpdated?.(actualizado)
    cancelarEdicion()
  }

  const totalInterno = items.reduce((sum, i) => sum + i.costoInterno, 0)
  const totalCliente = items.reduce((sum, i) => sum + i.costoCliente, 0)

  const filteredItems = items.filter(i =>
    i.descripcion.toLowerCase().includes(filter.toLowerCase()) ||
    i.codigo.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Filtrar por código o descripción..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded px-2 py-1 text-sm w-full max-w-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border rounded shadow-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-2">Código</th>
              <th className="p-2">Descripción</th>
              <th className="p-2 text-center">Cantidad</th>
              <th className="p-2 text-center">Unidad</th>
              <th className="p-2 text-right">P. Interno (USD)</th>
              <th className="p-2 text-right">P. Cliente (USD)</th>
              <th className="p-2 text-right text-blue-700">Costo Interno</th>
              <th className="p-2 text-right text-green-700">Costo Cliente</th>
              <th className="p-2 text-right">% Margen</th>
              <th className="p-2 text-center">Acción</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map(item => {
              const isEdit = editModeId === item.id
              const margen = item.costoInterno > 0
                ? ((item.costoCliente - item.costoInterno) / item.costoInterno) * 100
                : 0

              return (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{item.codigo}</td>
                  <td className="p-2">{item.descripcion}</td>
                  <td className="p-2 text-center">
                    {isEdit ? (
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={editCantidad}
                        onChange={(e) => setEditCantidad(parseFloat(e.target.value))}
                        className="border rounded px-1 w-16 text-right"
                      />
                    ) : (
                      item.cantidad
                    )}
                  </td>
                  <td className="p-2 text-center">{item.unidad}</td>
                  <td className="p-2 text-right">USD {item.precioInterno.toFixed(2)}</td>
                  <td className="p-2 text-right">USD {item.precioCliente.toFixed(2)}</td>
                  <td className="p-2 text-right text-blue-700 font-medium">
                    USD {item.costoInterno.toFixed(2)}
                  </td>
                  <td className="p-2 text-right text-green-700 font-medium">
                    USD {item.costoCliente.toFixed(2)}
                  </td>
                  <td className="p-2 text-right text-purple-700">
                    {margen.toFixed(1)}%
                  </td>
                  <td className="p-2 text-center space-x-1">
                    {isEdit ? (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            guardarCambios(item)
                          }}
                          className="p-1 hover:bg-blue-50 rounded"
                        >
                          <Save className="w-5 h-5 text-blue-600" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            cancelarEdicion()
                          }}
                          className="p-1 hover:bg-gray-50 rounded"
                        >
                          <X className="w-5 h-5 text-gray-500" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            iniciarEdicion(item)
                          }}
                          className="p-1 hover:bg-yellow-50 rounded"
                        >
                          <Pencil className="w-5 h-5 text-yellow-600" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault()
                            e.stopPropagation()
                            onDeleted?.(item.id)
                          }}
                          className="p-1 hover:bg-red-50 rounded"
                        >
                          <Trash2 className="w-5 h-5 text-red-500" />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot className="bg-gray-100 font-semibold">
            <tr>
              <td className="p-2" colSpan={6}>Totales</td>
              <td className="p-2 text-right text-blue-700">USD {totalInterno.toFixed(2)}</td>
              <td className="p-2 text-right text-green-700">USD {totalCliente.toFixed(2)}</td>
              <td />
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
