'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Save, X, Pencil, Trash2 } from 'lucide-react'
import { CotizacionProveedorItem } from '@/types'
import {
  updateCotizacionProveedorItem,
  deleteCotizacionProveedorItem,
} from '@/lib/services/cotizacionProveedorItem'
import { toast } from 'sonner'

// ✅ Extendemos para incluir campos solo locales
type LocalEditCotizacion = Partial<CotizacionProveedorItem> & {
  tiempoEntregaModo?: 'stock' | 'dias' | 'semanas'
  tiempoEntregaValor?: number
}

interface Props {
  items: CotizacionProveedorItem[]
  onUpdated?: () => void
  onItemUpdated?: (updatedItem: CotizacionProveedorItem) => void // ✅ Nueva prop para actualización local
}

export default function CotizacionProveedorTabla({ items, onUpdated, onItemUpdated }: Props) {
  const [editModeId, setEditModeId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, LocalEditCotizacion>>({})
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({})

  const handleChange = (id: string, field: string, value: any) => {
    setEditValues((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  const handleSave = async (item: CotizacionProveedorItem) => {
    const updated = editValues[item.id]
    if (!updated) return

    try {
      setLoadingItems((prev) => ({ ...prev, [item.id]: true }))

      const precioUnitario = parseFloat(updated.precioUnitario as any) || 0
      const cantidad = item.cantidad ?? item.cantidadOriginal ?? 0

      const modo = updated.tiempoEntregaModo || 'stock'
      const rawValor = updated.tiempoEntregaValor
      const tiempoEntregaValor = Number.isFinite(rawValor) ? rawValor! : 0

      let tiempoEntregaDias = 0
      let tiempoEntrega = 'Stock'

      if (modo === 'dias') {
        tiempoEntregaDias = tiempoEntregaValor
        tiempoEntrega = `${tiempoEntregaValor} días`
      } else if (modo === 'semanas') {
        tiempoEntregaDias = tiempoEntregaValor * 7
        tiempoEntrega = `${tiempoEntregaValor} semanas`
      }

      const payload = {
        precioUnitario,
        cantidad,
        tiempoEntrega,
        tiempoEntregaDias,
        estado: updated.estado,
        costoTotal: precioUnitario * cantidad,
        esSeleccionada: item.esSeleccionada,
      }

      const updatedItem = await updateCotizacionProveedorItem(item.id, payload)
      toast.success(`✅ Ítem ${item.codigo} actualizado.`)

      setEditModeId(null)
      setEditValues((prev) => {
        const updatedPrev = { ...prev }
        delete updatedPrev[item.id]
        return updatedPrev
      })

      // ✅ Priorizar actualización local sobre refetch completo
      if (updatedItem && onItemUpdated) {
        onItemUpdated(updatedItem)
      } else {
        onUpdated?.()
      }
    } catch {
      toast.error('❌ Error al actualizar ítem.')
    } finally {
      setLoadingItems((prev) => ({ ...prev, [item.id]: false }))
    }
  }

  const handleCancel = (id: string) => {
    setEditModeId(null)
    setEditValues((prev) => {
      const updated = { ...prev }
      delete updated[id]
      return updated
    })
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCotizacionProveedorItem(id)
      toast.success('🗑️ Ítem eliminado correctamente')
      onUpdated?.()
    } catch {
      toast.error('❌ Error al eliminar ítem')
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Ítem
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Lista
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Estado
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Cantidad
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Precio Unit.
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Total
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Entrega
              </th>
              <th className="px-6 py-4 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {items
              .slice()
              .sort((a, b) => (a.listaEquipoItem?.codigo || '').localeCompare(b.listaEquipoItem?.codigo || ''))
              .map((item) => {
                const isEdit = editModeId === item.id
                const edited = editValues[item.id] || {}
                const isLoading = loadingItems[item.id] || false
                const cantidad = item.cantidad ?? item.cantidadOriginal ?? 0
                const precioEditado =
                  edited.precioUnitario !== undefined
                    ? parseFloat(edited.precioUnitario as any)
                    : item.precioUnitario || 0

                return (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    {/* Ítem Description */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="text-sm font-medium text-gray-900 leading-tight">
                          {item.descripcion}
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {item.codigo} • {item.unidad}
                        </div>
                      </div>
                    </td>

                    {/* Lista */}
                    <td className="px-6 py-4 text-center">
                      {item.lista ? (
                        <div className="text-xs">
                          <div className="font-medium text-gray-900">{item.lista.nombre}</div>
                          <div className="text-gray-500">{item.lista.codigo}</div>
                        </div>
                      ) : (
                        <Badge variant="destructive" className="text-xs">Eliminada</Badge>
                      )}
                    </td>

                    {/* Estado Combinado */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        {/* Estado del ítem */}
                        <Badge
                          variant={
                            item.estado === 'cotizado' ? 'default' :
                            item.estado === 'solicitado' ? 'secondary' :
                            item.estado === 'rechazado' ? 'destructive' :
                            'outline'
                          }
                          className="text-xs"
                        >
                          {item.estado || 'pendiente'}
                        </Badge>

                        {/* Estado de conexión */}
                        {item.listaEquipoItemId ? (
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            Conectado
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                            Eliminado
                          </Badge>
                        )}

                        {/* Estado de selección */}
                        {item.esSeleccionada && (
                          <Badge className="text-xs bg-indigo-100 text-indigo-800 border-indigo-200">
                            ✓ Seleccionada
                          </Badge>
                        )}
                      </div>
                    </td>

                    {/* Cantidad */}
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm font-medium text-gray-900">
                        {cantidad}
                      </div>
                      {item.cantidadOriginal !== cantidad && (
                        <div className="text-xs text-gray-500">
                          Orig: {item.cantidadOriginal}
                        </div>
                      )}
                    </td>

                    {/* Precio Unitario */}
                    <td className="px-6 py-4 text-center">
                      {isEdit && !item.esSeleccionada ? (
                        <Input
                          type="number"
                          step="0.01"
                          value={edited.precioUnitario ?? item.precioUnitario ?? ''}
                          onChange={(e) => handleChange(item.id, 'precioUnitario', e.target.value)}
                          className="w-24 text-center text-sm"
                          placeholder="0.00"
                        />
                      ) : (
                        <div className="text-sm font-medium text-gray-900">
                          ${item.precioUnitario?.toFixed(2) ?? '0.00'}
                        </div>
                      )}
                    </td>

                    {/* Costo Total */}
                    <td className="px-6 py-4 text-center">
                      <div className="text-sm font-semibold text-gray-900">
                        ${(precioEditado * cantidad).toFixed(2)}
                      </div>
                    </td>

                    {/* Tiempo de Entrega */}
                    <td className="px-6 py-4 text-center">
                      {isEdit && !item.esSeleccionada ? (
                        <div className="flex flex-col items-center gap-2">
                          <Select
                            value={edited.tiempoEntregaModo ?? 'stock'}
                            onValueChange={(value) => handleChange(item.id, 'tiempoEntregaModo', value)}
                          >
                            <SelectTrigger className="w-24 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="stock">Stock</SelectItem>
                              <SelectItem value="dias">Días</SelectItem>
                              <SelectItem value="semanas">Semanas</SelectItem>
                            </SelectContent>
                          </Select>
                          {(edited.tiempoEntregaModo === 'dias' || edited.tiempoEntregaModo === 'semanas') && (
                            <Input
                              type="number"
                              min="0"
                              value={edited.tiempoEntregaValor?.toString() ?? ''}
                              onChange={(e) =>
                                handleChange(item.id, 'tiempoEntregaValor', parseInt(e.target.value) || 0)
                              }
                              className="w-16 text-center text-xs"
                              placeholder="0"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-900">
                          {item.tiempoEntrega || 'Stock'}
                        </div>
                      )}
                    </td>

                    {/* Acciones */}
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        {isEdit ? (
                          <>
                            <Button
                              size="sm"
                              onClick={() => handleSave(item)}
                              disabled={isLoading}
                              className="bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              {isLoading ? (
                                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                              ) : (
                                <Save className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancel(item.id)}
                              className="border-gray-300"
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={item.esSeleccionada}
                              onClick={() => {
                                if (!item.esSeleccionada) {
                                  setEditModeId(item.id)
                                  setEditValues((prev) => ({
                                    ...prev,
                                    [item.id]: {
                                      precioUnitario: item.precioUnitario,
                                      tiempoEntregaModo: 'stock',
                                      tiempoEntregaValor: 0,
                                      estado: item.estado,
                                    },
                                  }))
                                }
                              }}
                              title={item.esSeleccionada ? 'No se puede editar una cotización seleccionada' : 'Editar cotización'}
                              className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(item.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                              title="Eliminar ítem"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
