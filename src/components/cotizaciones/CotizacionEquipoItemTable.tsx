'use client'

import { useState } from 'react'
import { Save, X, Edit, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CotizacionEquipoItem } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

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
    i.codigo.toLowerCase().includes(filter.toLowerCase()) ||
    i.marca?.toLowerCase().includes(filter.toLowerCase())
  )

  return (
    <div className="space-y-2">
      {/* Search filter - only show if more than 3 items */}
      {items.length > 3 && (
        <div className="relative max-w-xs">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
          <Input
            type="text"
            placeholder="Buscar..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-7 h-7 text-xs"
          />
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50/80 border-b">
                <th className="px-2 py-1.5 text-left font-semibold text-gray-700 w-20">Código</th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Descripción</th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-700 w-24">Marca</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-16">Cant.</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-12">Und.</th>
                <th className="px-2 py-1.5 text-right font-semibold text-gray-700 w-20">P.Int</th>
                <th className="px-2 py-1.5 text-right font-semibold text-gray-700 w-20">P.Cli</th>
                <th className="px-2 py-1.5 text-right font-semibold text-gray-700 w-24">Interno</th>
                <th className="px-2 py-1.5 text-right font-semibold text-gray-700 w-24">Cliente</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-14">%</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-16"></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredItems.map((item, idx) => {
                const isEdit = editModeId === item.id
                // Usar el campo margen si existe, sino calcular
                const margenPct = (item.margen ?? 0) * 100 || (item.costoInterno > 0
                  ? ((item.costoCliente - item.costoInterno) / item.costoInterno) * 100
                  : 0)

                return (
                  <tr
                    key={item.id}
                    className={cn(
                      'hover:bg-orange-50/50 transition-colors',
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    )}
                  >
                    <td className="px-2 py-1.5">
                      <span className="font-mono text-gray-600">{item.codigo}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="line-clamp-1" title={item.descripcion}>{item.descripcion}</span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="line-clamp-1 text-gray-600" title={item.marca}>{item.marca || '-'}</span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {isEdit ? (
                        <input
                          type="number"
                          min={1}
                          step={1}
                          value={editCantidad}
                          onChange={(e) => setEditCantidad(parseFloat(e.target.value))}
                          className="w-12 h-5 text-xs text-center border rounded"
                          autoFocus
                        />
                      ) : (
                        <div
                          className="flex items-center justify-center gap-1 cursor-pointer group"
                          onClick={() => iniciarEdicion(item)}
                        >
                          <span className="font-medium">{item.cantidad}</span>
                          <Edit className="h-2.5 w-2.5 text-gray-400 opacity-0 group-hover:opacity-100" />
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-center text-gray-500">{item.unidad}</td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-500">
                      {formatCurrency(item.precioInterno)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-500">
                      {formatCurrency(item.precioCliente)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-700">
                      {formatCurrency(item.costoInterno)}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-medium text-green-600">
                      {formatCurrency(item.costoCliente)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={cn(
                        'font-medium',
                        margenPct >= 20 ? 'text-emerald-600' : margenPct >= 10 ? 'text-amber-600' : 'text-red-500'
                      )}>
                        {margenPct.toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {isEdit ? (
                        <div className="flex items-center justify-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              guardarCambios(item)
                            }}
                            className="h-5 w-5 p-0"
                          >
                            <Save className="h-3 w-3 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              cancelarEdicion()
                            }}
                            className="h-5 w-5 p-0"
                          >
                            <X className="h-3 w-3 text-gray-500" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              iniciarEdicion(item)
                            }}
                            className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                          >
                            <Edit className="h-3 w-3 text-gray-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.preventDefault()
                              e.stopPropagation()
                              onDeleted?.(item.id)
                            }}
                            className="h-5 w-5 p-0 hover:bg-red-100"
                          >
                            <Trash2 className="h-3 w-3 text-gray-500" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100/80 border-t-2">
                <td colSpan={7} className="px-2 py-1.5 text-right font-medium text-gray-700">
                  Total ({filteredItems.length} items):
                </td>
                <td className="px-2 py-1.5 text-right font-mono font-medium text-gray-700">
                  {formatCurrency(totalInterno)}
                </td>
                <td className="px-2 py-1.5 text-right font-mono font-bold text-green-700">
                  {formatCurrency(totalCliente)}
                </td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
