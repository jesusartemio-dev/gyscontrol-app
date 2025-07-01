'use client'

import { useState } from 'react'
import { Save, X, Pencil, Trash2, Filter } from 'lucide-react'
import type { CotizacionGastoItem } from '@/types'
import { toast } from 'sonner'

interface Props {
  items: CotizacionGastoItem[]
  onUpdate?: (item: CotizacionGastoItem) => void
  onDelete?: (id: string) => void
}

export default function CotizacionGastoItemTable({ items, onUpdate, onDelete }: Props) {
  const [editModeId, setEditModeId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Record<string, Partial<CotizacionGastoItem>>>({})
  const [filter, setFilter] = useState('')

  const handleChange = (id: string, field: keyof CotizacionGastoItem, value: any) => {
    setEditValues((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }))
  }

  const calcularCostosDesdeItem = (item: CotizacionGastoItem) => {
    const costoInterno = +(item.cantidad * item.precioUnitario * item.factorSeguridad).toFixed(2)
    const costoCliente = +(costoInterno * item.margen).toFixed(2)
    return { costoInterno, costoCliente }
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

  const filteredItems = items.filter((i) => i.nombre.toLowerCase().includes(filter.toLowerCase()))

  const totalHoras = filteredItems.reduce((sum, i) => sum + i.cantidad, 0)
  const totalInterno = filteredItems.reduce((sum, i) => sum + i.costoInterno, 0)
  const totalCliente = filteredItems.reduce((sum, i) => sum + i.costoCliente, 0)
  const avgFactor = filteredItems.length > 0 ? filteredItems.reduce((sum, i) => sum + i.factorSeguridad, 0) / filteredItems.length : 0
  const avgMargen = filteredItems.length > 0 ? filteredItems.reduce((sum, i) => sum + i.margen, 0) / filteredItems.length : 0
  const avgPrecio = filteredItems.length > 0 ? filteredItems.reduce((sum, i) => sum + i.precioUnitario, 0) / filteredItems.length : 0

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-500" />
        <input
          type="text"
          placeholder="Filtrar por nombre..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded px-2 py-1 text-sm w-full max-w-sm"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm border rounded shadow-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-2">Nombre</th>
              <th className="p-2">Descripción</th>
              <th className="p-2 text-center">$/Unidad</th>
              <th className="p-2 text-center">Cantidad</th>
              <th className="p-2 text-center">Factor</th>
              <th className="p-2 text-center">HH Totales</th>
              <th className="p-2 text-right text-blue-700">Costo Interno</th>
              <th className="p-2 text-center">Margen</th>
              <th className="p-2 text-right text-green-700">Costo Cliente</th>
              <th className="p-2 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((item) => {
              const isEdit = editModeId === item.id
              const edited = editValues[item.id] || {}
              const merged = { ...item, ...edited }
              const { costoInterno, costoCliente } = calcularCostosDesdeItem(merged)

              return (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="p-2">{item.nombre}</td>
                  <td className="p-2">{item.descripcion}</td>
                  <td className="p-2 text-center">${item.precioUnitario.toFixed(2)}</td>
                  <td className="p-2 text-center">
                    {isEdit ? (
                      <input
                        type="number"
                        value={merged.cantidad}
                        onChange={(e) => handleChange(item.id, 'cantidad', parseFloat(e.target.value))}
                        className="border rounded px-1 w-16 text-right"
                      />
                    ) : (
                      item.cantidad
                    )}
                  </td>
                  <td className="p-2 text-center">
                    {isEdit ? (
                      <input
                        type="number"
                        value={merged.factorSeguridad}
                        onChange={(e) => handleChange(item.id, 'factorSeguridad', parseFloat(e.target.value))}
                        className="border rounded px-1 w-16 text-right"
                      />
                    ) : (
                      item.factorSeguridad
                    )}
                  </td>
                  <td className="p-2 text-center text-green-700 font-semibold">{merged.cantidad.toFixed(2)}</td>
                  <td className="p-2 text-right text-blue-700 font-medium">${costoInterno.toFixed(2)}</td>
                  <td className="p-2 text-center">
                    {isEdit ? (
                      <input
                        type="number"
                        value={merged.margen}
                        onChange={(e) => handleChange(item.id, 'margen', parseFloat(e.target.value))}
                        className="border rounded px-1 w-16 text-right"
                      />
                    ) : (
                      item.margen
                    )}
                  </td>
                  <td className="p-2 text-right text-green-700 font-medium">${costoCliente.toFixed(2)}</td>
                  <td className="p-2 text-center space-x-1">
                    {isEdit ? (
                      <>
                        <button onClick={() => handleSave(item.id)}>
                          <Save className="w-5 h-5 text-blue-600" />
                        </button>
                        <button onClick={() => handleCancel(item.id)}>
                          <X className="w-5 h-5 text-gray-500" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => setEditModeId(item.id)}>
                          <Pencil className="w-5 h-5 text-yellow-600" />
                        </button>
                        <button onClick={() => onDelete?.(item.id)}>
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
              <td className="p-2" colSpan={3}>Totales / Promedios</td>
              <td className="p-2 text-center">{totalHoras}</td>
              <td className="p-2 text-center">{avgFactor.toFixed(2)}</td>
              <td className="p-2" />
              <td className="p-2 text-right text-blue-700">${totalInterno.toFixed(2)}</td>
              <td className="p-2 text-center">{avgMargen.toFixed(2)}</td>
              <td className="p-2 text-right text-green-700">${totalCliente.toFixed(2)}</td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
