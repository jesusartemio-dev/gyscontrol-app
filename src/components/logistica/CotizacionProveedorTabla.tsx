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
import { Save, X, Pencil } from 'lucide-react'
import { CotizacionProveedorItem } from '@/types'
import { updateCotizacionProveedorItem } from '@/lib/services/cotizacionProveedorItem'
import { toast } from 'sonner'

// ✅ Extendemos para incluir campos solo locales
type LocalEditCotizacion = Partial<CotizacionProveedorItem> & {
  tiempoEntregaModo?: 'stock' | 'dias' | 'semanas'
  tiempoEntregaValor?: number
}

interface Props {
  items: CotizacionProveedorItem[]
  onUpdated?: () => void
}

export default function CotizacionProveedorTabla({ items, onUpdated }: Props) {
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

      await updateCotizacionProveedorItem(item.id, payload)
      toast.success(`✅ Ítem ${item.codigo} actualizado.`)

      setEditModeId(null)
      setEditValues((prev) => {
        const updatedPrev = { ...prev }
        delete updatedPrev[item.id]
        return updatedPrev
      })

      onUpdated?.()
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border">
        <thead className="bg-gray-100 text-gray-700">
          <tr>
            <th className="p-2 text-left">Descripción</th>
            <th className="p-2 text-center">Cantidad</th>
            <th className="p-2 text-center">Presupuesto (USD)</th>
            <th className="p-2 text-center">Precio Unitario (USD)</th>
            <th className="p-2 text-center">Costo Total (USD)</th>
            <th className="p-2 text-center">Tiempo Entrega</th>
            <th className="p-2 text-center">Estado</th>
            <th className="p-2 text-center">¿Seleccionada?</th>
            <th className="p-2 text-center">Acción</th>
          </tr>
        </thead>
        <tbody>
          {items
            .slice()
            .sort((a, b) => a.codigo.localeCompare(b.codigo))
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
                <tr key={item.id} className="border-t">
                  <td className="p-2">
                    <strong>{item.descripcion}</strong>
                    <div className="text-xs text-gray-600">
                      {item.codigo} • {item.unidad}
                    </div>
                  </td>
                  <td className="p-2 text-center">
                    {cantidad} / Orig. {item.cantidadOriginal}
                  </td>
                  <td className="p-2 text-center">
                    ${item.presupuesto?.toFixed(2) ?? '0.00'}
                  </td>
                  <td className="p-2 text-center">
                    {isEdit ? (
                      <Input
                        type="number"
                        value={edited.precioUnitario ?? item.precioUnitario ?? ''}
                        onChange={(e) => handleChange(item.id, 'precioUnitario', e.target.value)}
                        className="w-24 text-center"
                      />
                    ) : (
                      `$${item.precioUnitario?.toFixed(2) ?? '0.00'}`
                    )}
                  </td>
                  <td className="p-2 text-center">
                    ${(precioEditado * cantidad).toFixed(2)}
                  </td>
                  <td className="p-2 text-center">
                    {isEdit ? (
                      <div className="flex gap-1 items-center">
                        <Select
                          value={edited.tiempoEntregaModo ?? 'stock'}
                          onValueChange={(value) => handleChange(item.id, 'tiempoEntregaModo', value)}
                        >
                          <SelectTrigger className="w-28 text-xs">
                            <SelectValue placeholder="Modo" />
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
                            value={
                              edited.tiempoEntregaValor !== undefined && edited.tiempoEntregaValor !== null
                                ? edited.tiempoEntregaValor.toString()
                                : ''
                            }
                            onChange={(e) =>
                              handleChange(item.id, 'tiempoEntregaValor', parseInt(e.target.value) || 0)
                            }
                            className="w-20 text-center"
                          />
                        )}
                      </div>
                    ) : (
                      item.tiempoEntrega || 'N/D'
                    )}
                  </td>
                  <td className="p-2 text-center capitalize">
                    {isEdit ? (
                      <Select
                        value={edited.estado ?? item.estado}
                        onValueChange={(value) => handleChange(item.id, 'estado', value)}
                      >
                        <SelectTrigger className="w-28 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['pendiente', 'solicitado', 'cotizado', 'rechazado', 'seleccionado'].map(
                            (estado) => (
                              <SelectItem key={estado} value={estado}>
                                {estado}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge>{item.estado || 'N/D'}</Badge>
                    )}
                  </td>
                  <td className="p-2 text-center">
                    {item.esSeleccionada ? (
                      <Badge className="bg-green-600 text-white">✅ Sí</Badge>
                    ) : (
                      <Badge className="bg-gray-400 text-white">—</Badge>
                    )}
                  </td>
                  <td className="p-2 text-center space-x-1">
                    {isEdit ? (
                      <>
                        <Button
                          size="sm"
                          className="bg-green-600 text-white"
                          onClick={() => handleSave(item)}
                          disabled={isLoading}
                        >
                          {isLoading ? 'Guardando...' : <Save className="w-4 h-4" />}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleCancel(item.id)}>
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
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
                        }}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
        </tbody>
      </table>
    </div>
  )
}
