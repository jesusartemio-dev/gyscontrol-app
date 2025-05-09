'use client'

import { useState } from 'react'
import { createPlantillaEquipo } from '@/lib/services/plantillaEquipo'
import type { PlantillaEquipoPayload } from '@/types'

interface Props {
  plantillaId: string
  onCreated: (nuevo: any) => void
}

export default function PlantillaEquipoForm({ plantillaId, onCreated }: Props) {
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }

    const payload: PlantillaEquipoPayload = {
      plantillaId,
      nombre,
      descripcion: '',
      subtotalInterno: 0,
      subtotalCliente: 0
    }

    try {
      setLoading(true)
      const nuevo = await createPlantillaEquipo(payload)
      onCreated(nuevo)
      setNombre('')
    } catch (err) {
      console.error('❌ Error al crear sección de equipo:', err)
      setError('Error al crear la sección.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2 items-center mt-2"
    >
      {error && <p className="text-red-500 text-sm sm:col-span-2">{error}</p>}

      <input
        type="text"
        placeholder="Nombre del equipo"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        className="border px-3 py-2 rounded text-sm ring-1 ring-gray-300 focus:outline-none focus:ring-blue-500"
        disabled={loading}
      />

      <button
        type="submit"
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50 whitespace-nowrap"
        disabled={loading}
      >
        {loading ? 'Agregando...' : '➕ Equipo'}
      </button>
    </form>
  )
}
