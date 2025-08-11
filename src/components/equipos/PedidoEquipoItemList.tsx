'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Pencil, Trash2, Save, X } from 'lucide-react'
import { PedidoEquipoItem, PedidoEquipoItemUpdatePayload } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Props {
  items: PedidoEquipoItem[]
  onUpdate?: (id: string, payload: PedidoEquipoItemUpdatePayload) => void
  onDelete?: (id: string) => void
}

export default function PedidoEquipoItemList({ items, onUpdate, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [cantidad, setCantidad] = useState<number | ''>('')

  const handleEdit = (item: PedidoEquipoItem) => {
    setEditingId(item.id)
    setCantidad(item.cantidadPedida)
  }

  const handleCancel = () => {
    setEditingId(null)
    setCantidad('')
  }

  const handleSave = async (id: string) => {
    if (onUpdate && cantidad !== '' && cantidad > 0) {
      await onUpdate(id, { cantidadPedida: cantidad })
      setEditingId(null)
    }
  }

  const handleDelete = async (item: PedidoEquipoItem) => {
    if (onDelete) await onDelete(item.id)
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="px-3 py-2">#</th>
            <th className="px-3 py-2">Código</th>
            <th className="px-3 py-2">Descripción</th>
            <th className="px-3 py-2">Unidad</th>
            <th className="px-3 py-2">Cantidad</th>
            <th className="px-3 py-2">Precio Unit. (USD)</th>
            <th className="px-3 py-2">Costo Total (USD)</th>
            <th className="px-3 py-2">F. OC Recomendada</th>
            <th className="px-3 py-2">Entrega</th>
            <th className="px-3 py-2">Estado</th>
            {(onUpdate || onDelete) && <th className="px-3 py-2 text-right">Acciones</th>}
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => {
            const isEditing = editingId === item.id

            return (
              <tr key={item.id} className={`border-t ${isEditing ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                <td className="px-3 py-2">{i + 1}</td>
                <td className="px-3 py-2">{item.codigo || '-'}</td>
                <td className="px-3 py-2 font-semibold truncate max-w-[200px]" title={item.descripcion}>{item.descripcion || '-'}</td>
                <td className="px-3 py-2">{item.unidad || '-'}</td>

                {/* Campo editable para cantidad */}
                <td className="px-3 py-2">
                  {isEditing ? (
                    <Input
                      type="number"
                      value={cantidad}
                      onChange={e => setCantidad(Number(e.target.value))}
                      className="w-20"
                    />
                  ) : (
                    item.cantidadPedida
                  )}
                </td>

                {/* Precio unitario formateado */}
                <td className="px-3 py-2">
                  USD {item.precioUnitario?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '-'}
                </td>

                {/* Costo total formateado */}
                <td className="px-3 py-2">
                  USD {item.costoTotal?.toLocaleString('en-US', { minimumFractionDigits: 2 }) ?? '-'}
                </td>

                {/* Fecha recomendada para emitir OC */}
                <td className="px-3 py-2">
                  {item.fechaOrdenCompraRecomendada
                    ? format(new Date(item.fechaOrdenCompraRecomendada), 'dd/MM/yyyy')
                    : '-'}
                </td>

                {/* Tiempo de entrega, ya sea directo o por días */}
                <td className="px-3 py-2">
                  {item.tiempoEntrega
                    ? item.tiempoEntrega
                    : item.tiempoEntregaDias !== null && item.tiempoEntregaDias !== undefined
                    ? `${item.tiempoEntregaDias} días`
                    : '-'}
                </td>

                {/* Estado del ítem con estilo de color según valor */}
                <td className="px-3 py-2">
                  <span className={`capitalize font-medium px-2 py-1 rounded text-xs whitespace-nowrap ${
                    item.estado === 'pendiente'
                      ? 'bg-yellow-100 text-yellow-700'
                      : item.estado === 'atendido'
                      ? 'bg-blue-100 text-blue-700'
                      : item.estado === 'parcial'
                      ? 'bg-orange-100 text-orange-700'
                      : item.estado === 'entregado'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {item.estado}
                  </span>
                </td>

                {/* Acciones: editar, guardar, cancelar, eliminar */}
                {(onUpdate || onDelete) && (
                  <td className="px-3 py-2 text-right space-x-2">
                    {isEditing ? (
                      <>
                        <Button size="sm" onClick={() => handleSave(item.id)} title="Guardar" aria-label="Guardar">
                          <Save className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handleCancel}
                          className="text-gray-500"
                          title="Cancelar"
                          aria-label="Cancelar"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        {onUpdate && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(item)}
                            title="Editar"
                            aria-label="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-red-600"
                            onClick={() => handleDelete(item)}
                            title="Eliminar"
                            aria-label="Eliminar"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
