'use client'

import { useState } from 'react'
import { deleteCotizacionEquipoItem, updateCotizacionEquipoItem } from '@/lib/services/cotizacionEquipoItem'
import type { CotizacionEquipoItem } from '@/types'

interface Props {
  items: CotizacionEquipoItem[]
  onDeleted: (id: string) => void
  onUpdated: (item: CotizacionEquipoItem) => void
}

export default function CotizacionEquipoItemList({ items, onDeleted, onUpdated }: Props) {
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [nuevaCantidad, setNuevaCantidad] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const iniciarEdicion = (item: CotizacionEquipoItem) => {
    setEditandoId(item.id)
    setNuevaCantidad(item.cantidad)
    setError(null)
  }

  const cancelarEdicion = () => {
    setEditandoId(null)
    setNuevaCantidad(0)
    setError(null)
  }

  const guardarEdicion = async (item: CotizacionEquipoItem) => {
    if (nuevaCantidad <= 0 || isNaN(nuevaCantidad)) {
      setError('La cantidad debe ser mayor a cero.')
      return
    }

    setLoadingId(item.id)
    try {
      const costoCliente = nuevaCantidad * (item.precioCliente ?? item.costoCliente / item.cantidad)

      const actualizado = await updateCotizacionEquipoItem(item.id, {
        cantidad: nuevaCantidad,
        costoCliente
      })

      onUpdated(actualizado)
      cancelarEdicion()
    } catch (err) {
      console.error('❌ Error al actualizar ítem:', err)
      setError('Error al actualizar ítem.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setLoadingId(id)
    setError(null)
    try {
      await deleteCotizacionEquipoItem(id)
      onDeleted(id)
    } catch (err) {
      console.error('❌ Error al eliminar ítem:', err)
      setError('Error al eliminar ítem.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="mt-2 space-y-2">
      {error && <p className="text-red-500 text-sm">{error}</p>}

      {items.map(item => (
        <div
          key={item.id}
          className="flex items-center justify-between bg-gray-50 border rounded-lg px-4 py-2 hover:shadow transition"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-6 text-sm text-gray-800 flex-1">
            <div className="font-semibold">🛠️ {item.codigo}</div>
            <div className="text-gray-600">{item.descripcion}</div>

            <div className="flex items-center gap-1 text-sm text-gray-700">
              Cantidad:
              {editandoId === item.id ? (
                <input
                  type="number"
                  min={1}
                  value={nuevaCantidad}
                  onChange={(e) => setNuevaCantidad(parseFloat(e.target.value))}
                  className="ml-2 border rounded px-2 py-0.5 w-20 text-right"
                />
              ) : (
                <span className="ml-2">{item.cantidad} {item.unidad ?? ''}</span>
              )}
            </div>

            <div className="text-green-600 font-semibold ml-auto">
              $ {item.costoCliente.toFixed(2)}
            </div>
          </div>

          <div className="flex items-center gap-2 ml-4">
            {editandoId === item.id ? (
              <>
                <button
                  onClick={() => guardarEdicion(item)}
                  disabled={loadingId === item.id}
                  className="text-blue-600 hover:text-blue-800 transition text-sm"
                  title="Guardar"
                >
                  💾
                </button>
                <button
                  onClick={cancelarEdicion}
                  className="text-gray-500 hover:text-gray-700 transition text-sm"
                  title="Cancelar"
                >
                  ❌
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => iniciarEdicion(item)}
                  className="text-blue-600 hover:text-blue-800 transition text-sm"
                  title="Editar"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(item.id)}
                  disabled={loadingId === item.id}
                  className="text-red-500 hover:text-red-700 transition text-sm"
                  title="Eliminar"
                >
                  🗑️
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
