// ===================================================
// 📁 Archivo: CotizacionServicioItemTable.tsx
// 📌 Ubicación: src/components/cotizaciones/
// 🔧 Tabla editable de ítems de servicio con tooltip elegante
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import {
  CotizacionServicioItem,
  Recurso,
  UnidadServicio
} from '@/types'
import { Trash2, Pencil, Save, X, Info } from 'lucide-react'
import { getRecursos } from '@/lib/services/recurso'
import { getUnidadesServicio } from '@/lib/services/unidadServicio'
import { updateCotizacionServicioItem } from '@/lib/services/cotizacionServicioItem'
import { calcularHoras } from '@/lib/utils/formulas'
import * as Tooltip from '@radix-ui/react-tooltip'

interface Props {
  items: CotizacionServicioItem[]
  onUpdated: (item: CotizacionServicioItem) => void
  onDeleted: (id: string) => void
}

export default function CotizacionServicioItemTable({ items, onUpdated, onDeleted }: Props) {
  const [recursos, setRecursos] = useState<Recurso[]>([])
  const [unidades, setUnidades] = useState<UnidadServicio[]>([])
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [editableItem, setEditableItem] = useState<Partial<CotizacionServicioItem>>({})

  useEffect(() => {
    getRecursos().then(setRecursos)
    getUnidadesServicio().then(setUnidades)
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
      if (['cantidad', 'factorSeguridad', 'margen', 'recursoId'].includes(field)) {
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
          
          // Calculate costs
          const costoInterno = horas * costoHora * (merged.factorSeguridad ?? 1)
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
    const costoInterno = horas * costoHora * (updated.factorSeguridad ?? 1)
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
        costoHora: finalUpdated.costoHora
      })

      // ✅ Update local state after successful save
      onUpdated(finalUpdated)
      cancelEditing()
    } catch (error) {
      console.error('Error saving item:', error)
      // TODO: Show error toast to user
    }
  }

  // ✅ Calculate totals including edited values for real-time updates
  const calculateTotals = () => {
    const allItems = items.map(item => {
      if (editandoId === item.id && editableItem) {
        // Use edited values for the item being edited
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
      promedioFactor: allItems.length ? allItems.reduce((sum, i) => sum + (i.factorSeguridad ?? 1), 0) / allItems.length : 0,
      promedioMargen: allItems.length ? allItems.reduce((sum, i) => sum + (i.margen ?? 1), 0) / allItems.length : 0,
      totalCostoInterno: allItems.reduce((sum, i) => sum + (i.costoInterno ?? 0), 0),
      totalCostoCliente: allItems.reduce((sum, i) => sum + (i.costoCliente ?? 0), 0)
    }
  }

  const totals = calculateTotals()

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border rounded shadow-sm">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="p-2">Nombre</th>
            <th className="p-2">Categoría</th>
            <th className="p-2">Recurso</th>
            <th className="p-2">Unidad</th>
            <th className="p-2 text-center">Cantidad</th>
            <th className="p-2 text-center">Costo/Hora</th>
            <th className="p-2 text-center">HH Totales</th>
            <th className="p-2 text-center">Factor</th>
            <th className="p-2 text-center text-blue-700">Costo Interno</th>
            <th className="p-2 text-center">Margen</th>
            <th className="p-2 text-right text-green-700">Costo Cliente</th>
            <th className="p-2 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, index) => {
            const editando = editandoId === item.id
            const key = item.id || `temp-${index}`
            return (
              <tr key={key} className="border-t hover:bg-gray-50">
                <td className="p-2 flex items-center gap-1">
                  <span>{item.nombre}</span>
                  {item.descripcion && (
                    <Tooltip.Provider>
                      <Tooltip.Root>
                        <Tooltip.Trigger asChild>
                          <button className="text-gray-400 hover:text-blue-600">
                            <Info className="w-4 h-4" />
                          </button>
                        </Tooltip.Trigger>
                        <Tooltip.Portal>
                          <Tooltip.Content
                            side="right"
                            sideOffset={6}
                            className="bg-black text-white px-2 py-1 rounded text-xs shadow-md max-w-xs z-50"
                          >
                            {item.descripcion}
                            <Tooltip.Arrow className="fill-black" />
                          </Tooltip.Content>
                        </Tooltip.Portal>
                      </Tooltip.Root>
                    </Tooltip.Provider>
                  )}
                </td>
                <td className="p-2">{item.categoria}</td>
                <td className="p-2">
                  {editando ? (
                    <select
                      className="border rounded px-2 py-1 text-sm"
                      value={editableItem.recursoId}
                      onChange={(e) => handleChange('recursoId', e.target.value)}
                    >
                      {recursos.map(r => (
                        <option key={r.id} value={r.id}>{r.nombre}</option>
                      ))}
                    </select>
                  ) : (
                    item.recursoNombre
                  )}
                </td>
                <td className="p-2">{item.unidadServicioNombre}</td>
                <td className="p-2 text-center">
                  {editando ? (
                    <input
                      type="number"
                      className="border rounded px-2 py-1 w-20"
                      value={editableItem.cantidad ?? item.cantidad}
                      onChange={(e) => handleChange('cantidad', +e.target.value)}
                    />
                  ) : (
                    item.cantidad
                  )}
                </td>
                <td className="p-2 text-center text-blue-700">${(editando && editableItem.costoHora !== undefined ? editableItem.costoHora : item.costoHora)?.toFixed(2)}</td>
                <td className="p-2 text-center">{(editando && editableItem.horaTotal !== undefined ? editableItem.horaTotal : item.horaTotal)?.toFixed(2)}</td>
                <td className="p-2 text-center">
                  {editando ? (
                    <input
                      type="number"
                      step="0.01"
                      className="border rounded px-2 py-1 w-20"
                      value={editableItem.factorSeguridad ?? item.factorSeguridad}
                      onChange={(e) => handleChange('factorSeguridad', +e.target.value)}
                    />
                  ) : (
                    item.factorSeguridad
                  )}
                </td>
                <td className="p-2 text-center text-blue-700">${(editando && editableItem.costoInterno !== undefined ? editableItem.costoInterno : item.costoInterno)?.toFixed(2)}</td>
                <td className="p-2 text-center">
                  {editando ? (
                    <input
                      type="number"
                      step="0.01"
                      className="border rounded px-2 py-1 w-20"
                      value={editableItem.margen ?? item.margen}
                      onChange={(e) => handleChange('margen', +e.target.value)}
                    />
                  ) : (
                    item.margen
                  )}
                </td>
                <td className="p-2 text-right text-green-700">${(editando && editableItem.costoCliente !== undefined ? editableItem.costoCliente : item.costoCliente)?.toFixed(2)}</td>
                <td className="p-2 text-center space-x-1">
                  {editando ? (
                    <>
                      <button onClick={handleSave}><Save className="w-5 h-5 text-green-600" /></button>
                      <button onClick={cancelEditing}><X className="w-5 h-5 text-gray-500" /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEditing(item)}><Pencil className="w-5 h-5 text-blue-600" /></button>
                      <button onClick={() => onDeleted(item.id)}><Trash2 className="w-5 h-5 text-red-500" /></button>
                    </>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot className="bg-gray-100 font-semibold text-sm">
          <tr>
            <td className="p-2" colSpan={6}>Totales</td>
            <td className="p-2 text-center">{totals.totalHH.toFixed(2)}</td>
            <td className="p-2 text-center">{totals.promedioFactor.toFixed(2)}</td>
            <td className="p-2 text-center text-blue-700">${totals.totalCostoInterno.toFixed(2)}</td>
            <td className="p-2 text-center">{totals.promedioMargen.toFixed(2)}</td>
            <td className="p-2 text-right text-green-700">${totals.totalCostoCliente.toFixed(2)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
