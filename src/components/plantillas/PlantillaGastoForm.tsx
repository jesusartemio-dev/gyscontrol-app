'use client'

import { useState } from 'react'
import { createPlantillaGasto } from '@/lib/services/plantillaGasto'
import type { PlantillaGastoPayload } from '@/types'

interface Props {
  plantillaId: string
  onCreated?: (nuevo: any) => void
}

export default function PlantillaGastoForm({ plantillaId, onCreated }: Props) {
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!nombre.trim()) {
      setError('El nombre del grupo de gastos es obligatorio.')
      return
    }

    const payload: PlantillaGastoPayload = {
      plantillaId,
      nombre: nombre.trim(),
      descripcion: descripcion.trim() || '',
      subtotalInterno: 0,
      subtotalCliente: 0
    }

    try {
      setLoading(true)
      const nuevo = await createPlantillaGasto(payload)
      if (!nuevo) {
        setError('Error inesperado al crear grupo de gastos.')
        return
      }

      onCreated?.({ ...nuevo, items: [] })
      setNombre('')
      setDescripcion('')
    } catch (err) {
      console.error('❌ Error al crear grupo de gastos:', err)
      setError('No se pudo crear el grupo de gastos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_auto] gap-2 items-end mt-4"
    >
      {error && <p className="text-red-500 text-sm sm:col-span-3">{error}</p>}

      <div className="flex flex-col">
        <label htmlFor="nombre-gasto" className="text-sm font-medium text-gray-700 mb-1">
          Nombre del grupo
        </label>
        <input
          id="nombre-gasto"
          type="text"
          placeholder="Ej: Fletes, Logística..."
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          className="border px-3 py-2 rounded text-sm ring-1 ring-gray-300 focus:outline-none focus:ring-blue-500"
          disabled={loading}
        />
      </div>

      <div className="flex flex-col">
        <label htmlFor="descripcion-gasto" className="text-sm font-medium text-gray-700 mb-1">
          Descripción (opcional)
        </label>
        <input
          id="descripcion-gasto"
          type="text"
          placeholder="Ej: Costos asociados al transporte"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          className="border px-3 py-2 rounded text-sm ring-1 ring-gray-300 focus:outline-none focus:ring-blue-500"
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50 whitespace-nowrap"
        disabled={loading}
      >
        {loading ? 'Agregando...' : '➕ Gasto'}
      </button>
    </form>
  )
}
