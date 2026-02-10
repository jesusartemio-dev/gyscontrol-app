'use client'

import { useState } from 'react'
import { Save, X, Edit, Trash2, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { CotizacionGastoItem } from '@/types'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { formatMoneda } from '@/lib/utils/currency'

interface Props {
  items: CotizacionGastoItem[]
  onUpdate?: (item: CotizacionGastoItem) => void
  onDelete?: (id: string) => void
  isLocked?: boolean
  moneda?: string
}

export default function CotizacionGastoItemTable({ items, onUpdate, onDelete, isLocked = false, moneda }: Props) {
  const formatCurrency = (amount: number) => formatMoneda(amount, moneda)
  const [editModeId, setEditModeId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, Partial<CotizacionGastoItem>>>({})
  const [filter, setFilter] = useState('')

  const handleChange = (id: string, field: keyof CotizacionGastoItem, value: number) => {
    setEditValues((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  const calcularCostosDesdeItem = (item: CotizacionGastoItem) => {
    // Nueva fórmula: costoCliente es el cálculo directo, costoInterno se deriva del margen
    const costoCliente = +(item.cantidad * item.precioUnitario * item.factorSeguridad).toFixed(2)
    const costoInterno = +(costoCliente / (item.margen || 1.25)).toFixed(2)
    return { costoInterno, costoCliente }
  }

  const iniciarEdicion = (item: CotizacionGastoItem) => {
    setEditModeId(item.id)
    setEditValues((prev) => ({
      ...prev,
      [item.id]: {
        cantidad: item.cantidad,
        factorSeguridad: item.factorSeguridad,
        margen: item.margen
      }
    }))
  }

  const handleSave = (id: string) => {
    const changes = editValues[id]
    if (!changes || Object.keys(changes).length === 0) {
      toast.warning('No se han hecho cambios.')
      return
    }

    const itemOriginal = items.find(i => i.id === id)
    if (!itemOriginal) return

    const itemCompleto = { ...itemOriginal, ...changes }
    const nuevosCostos = calcularCostosDesdeItem(itemCompleto)

    onUpdate?.({
      ...itemCompleto,
      ...nuevosCostos
    })

    setEditModeId(null)
    setEditValues((prev) => {
      const updated = { ...prev }
      delete updated[id]
      return updated
    })
  }

  const handleCancel = (id: string) => {
    setEditModeId(null)
    setEditValues((prev) => {
      const updated = { ...prev }
      delete updated[id]
      return updated
    })
  }

  const filteredItems = items.filter((i) =>
    i.nombre.toLowerCase().includes(filter.toLowerCase()) ||
    i.descripcion?.toLowerCase().includes(filter.toLowerCase())
  )

  const totalInterno = filteredItems.reduce((sum, i) => sum + i.costoInterno, 0)
  const totalCliente = filteredItems.reduce((sum, i) => sum + i.costoCliente, 0)

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
                <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Nombre</th>
                <th className="px-2 py-1.5 text-left font-semibold text-gray-700">Descripción</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-16">Cant.</th>
                <th className="px-2 py-1.5 text-right font-semibold text-gray-700 w-20">$/Und</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-16">Factor</th>
                <th className="px-2 py-1.5 text-right font-semibold text-gray-700 w-24">Interno</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-16">Margen</th>
                <th className="px-2 py-1.5 text-right font-semibold text-gray-700 w-24">Cliente</th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-14">%</th>
                {!isLocked && <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-16"></th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredItems.map((item, idx) => {
                const isEdit = editModeId === item.id
                const edited = editValues[item.id] || {}
                const merged = { ...item, ...edited }
                const { costoInterno, costoCliente } = calcularCostosDesdeItem(merged)
                const margenPct = costoInterno > 0
                  ? ((costoCliente - costoInterno) / costoInterno) * 100
                  : 0

                return (
                  <tr
                    key={item.id}
                    className={cn(
                      'hover:bg-purple-50/50 transition-colors',
                      idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'
                    )}
                  >
                    <td className="px-2 py-1.5">
                      <span className="font-medium text-gray-900 line-clamp-1" title={item.nombre}>
                        {item.nombre}
                      </span>
                    </td>
                    <td className="px-2 py-1.5">
                      <span className="line-clamp-1 text-gray-600" title={item.descripcion || ''}>
                        {item.descripcion || '-'}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {isEdit ? (
                        <input
                          type="number"
                          min={0.01}
                          step={0.01}
                          value={merged.cantidad}
                          onChange={(e) => handleChange(item.id, 'cantidad', parseFloat(e.target.value) || 0)}
                          className="w-14 h-5 text-xs text-center border rounded"
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
                    <td className="px-2 py-1.5 text-right font-mono text-gray-500">
                      {formatCurrency(item.precioUnitario)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {isEdit ? (
                        <input
                          type="number"
                          min={1}
                          step={0.1}
                          value={merged.factorSeguridad}
                          onChange={(e) => handleChange(item.id, 'factorSeguridad', parseFloat(e.target.value) || 1)}
                          className="w-14 h-5 text-xs text-center border rounded"
                        />
                      ) : (
                        <span className="text-gray-600">{item.factorSeguridad.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono text-gray-700">
                      {formatCurrency(costoInterno)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      {isEdit ? (
                        <input
                          type="number"
                          min={1}
                          step={0.1}
                          value={merged.margen}
                          onChange={(e) => handleChange(item.id, 'margen', parseFloat(e.target.value) || 1)}
                          className="w-14 h-5 text-xs text-center border rounded"
                        />
                      ) : (
                        <span className="text-gray-600">{item.margen.toFixed(2)}</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right font-mono font-medium text-green-600">
                      {formatCurrency(costoCliente)}
                    </td>
                    <td className="px-2 py-1.5 text-center">
                      <span className={cn(
                        'font-medium',
                        margenPct >= 20 ? 'text-emerald-600' : margenPct >= 10 ? 'text-amber-600' : 'text-red-500'
                      )}>
                        {margenPct.toFixed(0)}%
                      </span>
                    </td>
                    {!isLocked && (
                      <td className="px-2 py-1.5 text-center">
                        {isEdit ? (
                          <div className="flex items-center justify-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                handleSave(item.id)
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
                                handleCancel(item.id)
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
                                onDelete?.(item.id)
                              }}
                              className="h-5 w-5 p-0 hover:bg-red-100"
                            >
                              <Trash2 className="h-3 w-3 text-gray-500" />
                            </Button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100/80 border-t-2">
                <td colSpan={5} className="px-2 py-1.5 text-right font-medium text-gray-700">
                  Total ({filteredItems.length} items):
                </td>
                <td className="px-2 py-1.5 text-right font-mono font-medium text-gray-700">
                  {formatCurrency(totalInterno)}
                </td>
                <td></td>
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
