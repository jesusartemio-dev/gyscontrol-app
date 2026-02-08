'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'
import { Save, X, Pencil, Trash2, Check, UserCheck } from 'lucide-react'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import { CotizacionProveedorItem } from '@/types'
import {
  updateCotizacionProveedorItem,
  deleteCotizacionProveedorItem,
} from '@/lib/services/cotizacionProveedorItem'
import { toast } from 'sonner'

type LocalEditCotizacion = Partial<CotizacionProveedorItem> & {
  tiempoEntregaModo?: 'stock' | 'dias' | 'semanas'
  tiempoEntregaValor?: number
}

interface Props {
  items: CotizacionProveedorItem[]
  onUpdated?: () => void
  onItemUpdated?: (updatedItem: CotizacionProveedorItem) => void
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
      toast.success(`Ítem ${item.codigo} actualizado`)

      setEditModeId(null)
      setEditValues((prev) => {
        const updatedPrev = { ...prev }
        delete updatedPrev[item.id]
        return updatedPrev
      })

      if (updatedItem && onItemUpdated) {
        onItemUpdated(updatedItem)
      } else {
        onUpdated?.()
      }
    } catch {
      toast.error('Error al actualizar ítem')
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
      toast.success('Ítem eliminado')
      onUpdated?.()
    } catch {
      toast.error('Error al eliminar ítem')
    }
  }

  const formatCurrency = (value: number) =>
    value > 0 ? `$${value.toLocaleString('en-US', { minimumFractionDigits: 2 })}` : '—'

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-gray-50 border-b">
            <th className="px-3 py-2 text-left font-semibold text-gray-700">Descripción</th>
            <th className="px-3 py-2 text-left font-semibold text-gray-700 w-28">Lista</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-700 w-16">Cant.</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-700 w-24">P.Unit.</th>
            <th className="px-3 py-2 text-right font-semibold text-gray-700 w-24">Total</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-700 w-28">Entrega</th>
            <th className="px-3 py-2 text-center font-semibold text-gray-700 w-20">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items
            .slice()
            .sort((a, b) => (a.listaEquipoItem?.codigo || '').localeCompare(b.listaEquipoItem?.codigo || ''))
            .map((item, idx) => {
              const isEdit = editModeId === item.id
              const edited = editValues[item.id] || {}
              const isLoading = loadingItems[item.id] || false
              const cantidad = item.cantidad ?? item.cantidadOriginal ?? 0
              const precioEditado =
                edited.precioUnitario !== undefined
                  ? parseFloat(edited.precioUnitario as any)
                  : item.precioUnitario || 0

              return (
                <tr
                  key={item.id}
                  className={`border-b hover:bg-gray-50 transition-colors ${
                    idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                  }`}
                >
                  {/* Descripción + código + estado */}
                  <td className="px-3 py-2">
                    <div className="space-y-0.5">
                      <div className="font-medium text-gray-900 text-xs line-clamp-1" title={item.descripcion}>
                        {item.descripcion}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="font-mono">{item.codigo}</span>
                        <span>·</span>
                        <span>{item.unidad}</span>
                        {item.esSeleccionada && (
                          <>
                            <span>·</span>
                            <span className="text-green-600 flex items-center gap-0.5">
                              <Check className="h-2.5 w-2.5" />
                              Seleccionada
                            </span>
                          </>
                        )}
                        {!item.esSeleccionada && item.listaEquipoItem?.cotizacionSeleccionadaId && (
                          (() => {
                            const selProv = (item.listaEquipoItem as any)?.cotizacionSeleccionada?.cotizacionProveedor?.proveedor?.nombre
                            return (
                              <>
                                <span>·</span>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-orange-600 flex items-center gap-0.5 cursor-help">
                                      <UserCheck className="h-2.5 w-2.5" />
                                      Asignado
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="text-xs">
                                    {selProv
                                      ? `Seleccionado para: ${selProv}`
                                      : 'Asignado a otro proveedor'
                                    }
                                  </TooltipContent>
                                </Tooltip>
                              </>
                            )
                          })()
                        )}
                        {!item.listaEquipoItemId && (
                          <>
                            <span>·</span>
                            <span className="text-red-500">Huérfano</span>
                          </>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Lista */}
                  <td className="px-3 py-2">
                    {item.listaEquipo ? (
                      <span className="text-[10px] text-muted-foreground truncate" title={item.listaEquipo.nombre}>
                        {item.listaEquipo.codigo}
                      </span>
                    ) : (
                      <span className="text-[10px] text-red-500">Eliminada</span>
                    )}
                  </td>

                  {/* Cantidad */}
                  <td className="px-3 py-2 text-center">
                    <span className="font-mono">{cantidad}</span>
                    {item.cantidadOriginal !== cantidad && (
                      <div className="text-[10px] text-muted-foreground">
                        orig: {item.cantidadOriginal}
                      </div>
                    )}
                  </td>

                  {/* Precio Unitario */}
                  <td className="px-3 py-2 text-right">
                    {isEdit && !item.esSeleccionada ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={edited.precioUnitario ?? item.precioUnitario ?? ''}
                        onChange={(e) => handleChange(item.id, 'precioUnitario', e.target.value)}
                        className="w-24 h-7 text-xs text-right ml-auto"
                        placeholder="0.00"
                      />
                    ) : (
                      <span className="font-mono text-gray-900">
                        {formatCurrency(item.precioUnitario || 0)}
                      </span>
                    )}
                  </td>

                  {/* Total */}
                  <td className="px-3 py-2 text-right">
                    <span className="font-mono font-medium text-gray-900">
                      {formatCurrency(precioEditado * cantidad)}
                    </span>
                  </td>

                  {/* Entrega */}
                  <td className="px-3 py-2 text-center">
                    {isEdit && !item.esSeleccionada ? (
                      <div className="flex flex-col items-center gap-1">
                        <Select
                          value={edited.tiempoEntregaModo ?? 'stock'}
                          onValueChange={(value) => handleChange(item.id, 'tiempoEntregaModo', value)}
                        >
                          <SelectTrigger className="w-24 h-7 text-[10px]">
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
                            className="w-16 h-7 text-center text-[10px]"
                            placeholder="0"
                          />
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">
                        {item.tiempoEntrega || 'Stock'}
                      </span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      {isEdit ? (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleSave(item)}
                            disabled={isLoading}
                            className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            {isLoading ? (
                              <div className="w-3 h-3 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                            ) : (
                              <Save className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancel(item.id)}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                          >
                            <X className="w-3 h-3" />
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
                            title={item.esSeleccionada ? 'No se puede editar una cotización seleccionada' : 'Editar'}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-gray-600"
                          >
                            <Pencil className="w-3 h-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDelete(item.id)}
                            className="h-7 w-7 p-0 text-gray-400 hover:text-red-500 hover:bg-red-50"
                            title="Eliminar"
                          >
                            <Trash2 className="w-3 h-3" />
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
  )
}
