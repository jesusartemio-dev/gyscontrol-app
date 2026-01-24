// ===================================================
// 📁 Archivo: CotizacionServicioItemTable.tsx
// 📌 Ubicación: src/components/cotizaciones/
// 🔧 Tabla compacta de ítems de servicio con columnas agrupadas
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import {
  CotizacionServicioItem,
  Recurso
} from '@/types'
import { Trash2, Pencil, Save, X, Loader2 } from 'lucide-react'
import { getRecursos } from '@/lib/services/recurso'
import { updateCotizacionServicioItem } from '@/lib/services/cotizacionServicioItem'
import { calcularHoras } from '@/lib/utils/formulas'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@/components/ui/tooltip'

interface Props {
  items: CotizacionServicioItem[]
  onUpdated: (item: CotizacionServicioItem) => void
  onDeleted: (id: string) => void
}

const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
}

const dificultadLabels: Record<number, string> = { 1: 'Baja', 2: 'Media', 3: 'Alta', 4: 'Crítica' }
const dificultadColors: Record<number, string> = {
  1: 'bg-green-100 text-green-700',
  2: 'bg-yellow-100 text-yellow-700',
  3: 'bg-orange-100 text-orange-700',
  4: 'bg-red-100 text-red-700'
}

export default function CotizacionServicioItemTable({ items, onUpdated, onDeleted }: Props) {
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editableItem, setEditableItem] = useState<Partial<CotizacionServicioItem>>({})
  const [saving, setSaving] = useState(false)

  // ✅ Ordenar items por campo 'orden' antes de renderizar
  const sortedItems = [...items].sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))

  useEffect(() => {
    getRecursos().then(setRecursos)
  }, [])

  const startEditing = (item: CotizacionServicioItem) => {
    setEditandoId(item.id)
    setEditableItem({ ...item })
  }

  const cancelEditing = () => {
    setEditandoId(null)
    setEditableItem({})
  }

  // ✅ Real-time calculation updates during editing
  const handleChange = (field: keyof CotizacionServicioItem, value: any) => {
    setEditableItem(prev => {
      const updated = { ...prev, [field]: value }

      // 🔁 Recalculate values when relevant fields change
      if (['cantidad', 'factorSeguridad', 'margen', 'recursoId', 'nivelDificultad'].includes(field)) {
        const original = items.find(i => i.id === editandoId)
        if (original) {
          const merged = { ...original, ...updated }

          // Calculate hours
          const horas = calcularHoras({
            formula: merged.formula,
            cantidad: merged.cantidad ?? 0,
            horaBase: merged.horaBase ?? 0,
            horaRepetido: merged.horaRepetido ?? 0,
            horaUnidad: merged.horaUnidad ?? 0,
            horaFijo: merged.horaFijo ?? 0
          })

          // Get resource cost
          const recurso = recursos.find(r => r.id === merged.recursoId)
          const costoHora = recurso?.costoHora ?? 0

          // Get difficulty multiplier
          const dificultadMultiplier = (() => {
            const dificultad = merged.nivelDificultad ?? 1
            switch (dificultad) {
              case 1: return 1.0  // Baja
              case 2: return 1.2  // Media
              case 3: return 1.5  // Alta
              case 4: return 2.0  // Crítica
              default: return 1.0
            }
          })()

          // Calculate costs with difficulty multiplier
          const costoInterno = horas * costoHora * (merged.factorSeguridad ?? 1) * dificultadMultiplier
          const costoCliente = costoInterno * (merged.margen ?? 1)

          // Update with calculated values (ensure they're valid numbers)
          updated.horaTotal = isNaN(horas) ? 0 : horas
          updated.costoInterno = isNaN(costoInterno) ? 0 : costoInterno
          updated.costoCliente = isNaN(costoCliente) ? 0 : costoCliente
          updated.costoHora = isNaN(costoHora) ? 0 : costoHora
          if (recurso) {
            updated.recursoNombre = recurso.nombre
          }
        }
      }

      return updated
    })
  }

  const handleSave = async () => {
    if (!editandoId) return
    const original = items.find(i => i.id === editandoId)
    if (!original) return

    setSaving(true)

    const updated: CotizacionServicioItem = {
      ...original,
      ...editableItem,
    }

    const horas = calcularHoras({
      formula: updated.formula,
      cantidad: updated.cantidad ?? 0,
      horaBase: updated.horaBase ?? 0,
      horaRepetido: updated.horaRepetido ?? 0,
      horaUnidad: updated.horaUnidad ?? 0,
      horaFijo: updated.horaFijo ?? 0
    })

    const recurso = recursos.find(r => r.id === updated.recursoId)
    const costoHora = recurso?.costoHora ?? 0

    // Get difficulty multiplier
    const dificultadMultiplier = (() => {
      const dificultad = updated.nivelDificultad ?? 1
      switch (dificultad) {
        case 1: return 1.0  // Baja
        case 2: return 1.2  // Media
        case 3: return 1.5  // Alta
        case 4: return 2.0  // Crítica
        default: return 1.0
      }
    })()

    const costoInterno = horas * costoHora * (updated.factorSeguridad ?? 1) * dificultadMultiplier
    const costoCliente = costoInterno * (updated.margen ?? 1)

    const finalUpdated = {
      ...updated,
      horaTotal: isNaN(horas) ? 0 : horas,
      costoInterno: isNaN(costoInterno) ? 0 : costoInterno,
      costoCliente: isNaN(costoCliente) ? 0 : costoCliente,
      recursoNombre: recurso?.nombre ?? '',
      costoHora: isNaN(costoHora) ? 0 : costoHora
    }

    try {
      // 📡 Save to database first
      await updateCotizacionServicioItem(editandoId, {
        recursoId: finalUpdated.recursoId,
        cantidad: finalUpdated.cantidad,
        factorSeguridad: finalUpdated.factorSeguridad,
        margen: finalUpdated.margen,
        horaTotal: finalUpdated.horaTotal,
        costoInterno: finalUpdated.costoInterno,
        costoCliente: finalUpdated.costoCliente,
        costoHora: finalUpdated.costoHora,
        orden: finalUpdated.orden
      })

      // ✅ Update local state after successful save
      onUpdated(finalUpdated)
      cancelEditing()
    } catch (error) {
      console.error('Error saving item:', error)
    } finally {
      setSaving(false)
    }
  }

  // ✅ Calculate totals including edited values for real-time updates
  const calculateTotals = () => {
    const allItems = items.map(item => {
      if (editandoId === item.id && editableItem) {
        return {
          ...item,
          horaTotal: editableItem.horaTotal ?? item.horaTotal ?? 0,
          factorSeguridad: editableItem.factorSeguridad ?? item.factorSeguridad ?? 1,
          margen: editableItem.margen ?? item.margen ?? 1,
          costoInterno: editableItem.costoInterno ?? item.costoInterno ?? 0,
          costoCliente: editableItem.costoCliente ?? item.costoCliente ?? 0
        }
      }
      return item
    })

    return {
      totalHH: allItems.reduce((sum, i) => sum + (i.horaTotal ?? 0), 0),
      totalCostoInterno: allItems.reduce((sum, i) => sum + (i.costoInterno ?? 0), 0),
      totalCostoCliente: allItems.reduce((sum, i) => sum + (i.costoCliente ?? 0), 0)
    }
  }

  const totals = calculateTotals()

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 table-fixed">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[20%]">
              Servicio
            </th>
            <th className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[12%]">
              Recurso
            </th>
            <th className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[8%]">
              Cant.
            </th>
            <th className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[8%]">
              Horas
            </th>
            <th className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[10%]">
              Factor
            </th>
            <th className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[10%]">
              Dificultad
            </th>
            <th className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[8%]">
              Margen
            </th>
            <th className="px-2 py-2 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[14%]">
              Precios
            </th>
            <th className="px-2 py-2 text-center text-[10px] font-medium text-gray-500 uppercase tracking-wider w-[6%]">
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {sortedItems.map((item, index) => {
            const editando = editandoId === item.id
            const key = item.id || `temp-${index}`
            const currentItem = editando ? { ...item, ...editableItem } : item

            return (
              <tr key={key} className="border-b hover:bg-gray-50">
                {/* Servicio - nombre + unidad */}
                <td className="p-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-medium text-gray-900 text-sm truncate max-w-[150px]">
                              {item.nombre}
                            </span>
                            <Badge variant="outline" className="text-[10px] px-1 py-0">
                              {item.unidadServicioNombre}
                            </Badge>
                          </div>
                          {item.edt?.nombre && (
                            <div className="text-[10px] text-gray-400">{item.edt.nombre}</div>
                          )}
                        </div>
                      </TooltipTrigger>
                      {item.descripcion && (
                        <TooltipContent side="right" className="max-w-xs">
                          <p className="text-xs">{item.descripcion}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </td>

                {/* Recurso + Costo/Hora */}
                <td className="p-2">
                  {editando ? (
                    <select
                      className="border rounded px-1 h-7 text-xs w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editableItem.recursoId ?? item.recursoId}
                      onChange={(e) => handleChange('recursoId', e.target.value)}
                      disabled={saving}
                    >
                      {recursos.map(r => (
                        <option key={r.id} value={r.id}>{r.nombre}</option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      <div className="text-sm text-gray-700">{item.recursoNombre}</div>
                      <div className="text-xs text-gray-500">${item.costoHora}/h</div>
                    </div>
                  )}
                </td>

                {/* Cantidad - editable con altura fija */}
                <td className="p-2">
                  <div className="h-8 flex items-center justify-center">
                    {editando ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={editableItem.cantidad ?? item.cantidad}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9]/g, '')
                          handleChange('cantidad', parseInt(val) || 0)
                        }}
                        className="w-14 h-7 text-sm text-center border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={saving}
                      />
                    ) : (
                      <span className="font-semibold">{item.cantidad}</span>
                    )}
                  </div>
                </td>

                {/* Horas con tooltip */}
                <td className="p-2 text-center">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help">
                          <div className="font-medium text-purple-600">
                            {(currentItem.horaTotal ?? 0).toFixed(1)}h
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {item.horaBase || 0}+{item.horaRepetido || 0}
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-xs">
                        <div className="text-xs space-y-1">
                          <p className="font-semibold">Fórmula: {item.formula || 'Escalonada'}</p>
                          <p><span className="text-gray-500">Hora Base:</span> {item.horaBase || 0}h</p>
                          <p><span className="text-gray-500">Hora Repetido:</span> {item.horaRepetido || 0}h</p>
                          <p className="pt-1 border-t mt-1">
                            <span className="text-gray-500">Total:</span>{' '}
                            <span className="font-semibold text-purple-600">
                              {(currentItem.horaTotal ?? 0).toFixed(2)}h
                            </span>
                          </p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </td>

                {/* Factor Seguridad - editable con altura fija */}
                <td className="p-2 text-center">
                  <div className="h-8 flex items-center justify-center">
                    {editando ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editableItem.factorSeguridad ?? item.factorSeguridad}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '')
                          handleChange('factorSeguridad', parseFloat(val) || 1)
                        }}
                        className="w-14 h-7 text-sm text-center border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={saving}
                      />
                    ) : (
                      <span className="text-sm font-medium">
                        {(item.factorSeguridad ?? 1).toFixed(1)}x
                      </span>
                    )}
                  </div>
                </td>

                {/* Dificultad - editable con altura fija */}
                <td className="p-2 text-center">
                  <div className="h-8 flex items-center justify-center">
                    {editando ? (
                      <select
                        className="border rounded px-1 h-7 text-xs w-16 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={editableItem.nivelDificultad ?? item.nivelDificultad ?? 1}
                        onChange={(e) => handleChange('nivelDificultad', parseInt(e.target.value))}
                        disabled={saving}
                      >
                        <option value={1}>Baja</option>
                        <option value={2}>Media</option>
                        <option value={3}>Alta</option>
                        <option value={4}>Crítica</option>
                      </select>
                    ) : (
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-1.5 py-0 ${dificultadColors[item.nivelDificultad || 1]}`}
                      >
                        {dificultadLabels[item.nivelDificultad || 1]}
                      </Badge>
                    )}
                  </div>
                </td>

                {/* Margen - editable con altura fija */}
                <td className="p-2 text-center">
                  <div className="h-8 flex items-center justify-center">
                    {editando ? (
                      <input
                        type="text"
                        inputMode="decimal"
                        value={editableItem.margen ?? item.margen}
                        onChange={(e) => {
                          const val = e.target.value.replace(/[^0-9.]/g, '')
                          handleChange('margen', parseFloat(val) || 1)
                        }}
                        className="w-14 h-7 text-sm text-center border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={saving}
                      />
                    ) : (
                      <span className="text-sm">{(item.margen ?? 1).toFixed(2)}x</span>
                    )}
                  </div>
                </td>

                {/* Precios agrupados: Interno / Cliente */}
                <td className="p-2 text-right">
                  <div className="text-xs text-blue-600">
                    {formatCurrency(currentItem.costoInterno ?? 0)}
                  </div>
                  <div className="font-semibold text-green-600">
                    {formatCurrency(currentItem.costoCliente ?? 0)}
                  </div>
                </td>

                {/* Acciones */}
                <td className="p-2 text-center">
                  <div className="h-8 flex items-center justify-center gap-1">
                    {editando ? (
                      <>
                        <Button
                          size="sm"
                          onClick={handleSave}
                          disabled={saving}
                          className="h-7 w-7 p-0"
                        >
                          {saving ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Save className="h-3 w-3" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={cancelEditing}
                          disabled={saving}
                          className="h-7 w-7 p-0"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => startEditing(item)}
                          className="h-7 w-7 p-0 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                        >
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDeleted(item.id)}
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot className="bg-gray-100 font-semibold text-sm">
          <tr>
            <td className="p-2" colSpan={3}>Totales</td>
            <td className="p-2 text-center text-purple-600">{totals.totalHH.toFixed(1)}h</td>
            <td className="p-2 text-center" colSpan={3}></td>
            <td className="p-2 text-right">
              <div className="text-xs text-blue-600">{formatCurrency(totals.totalCostoInterno)}</div>
              <div className="text-green-600">{formatCurrency(totals.totalCostoCliente)}</div>
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
