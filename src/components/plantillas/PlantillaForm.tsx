'use client'

import { useState } from 'react'
import { createPlantilla } from '@/lib/services/plantilla'
import type { Plantilla } from '@/app/comercial/plantillas/page'

interface Props {
  onCreated: (nueva: Plantilla) => void
}

export default function PlantillaForm({ onCreated }: Props) {
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

    setLoading(true)
    try {
      const nueva = await createPlantilla({
        nombre: nombre.trim(),
        totalInterno: 0,
        totalCliente: 0
      })
      onCreated(nueva)
      setNombre('')
    } catch (err) {
      console.error('Error al crear plantilla:', err)
      setError('Ocurrió un error al crear la plantilla.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 max-w-md">
      {error && <p className="text-red-500">{error}</p>}

      <input
        type="text"
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre de la plantilla"
        className="border px-3 py-2 rounded w-full"
        disabled={loading}
      />

      <button
        type="submit"
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        disabled={loading}
      >
        {loading ? 'Creando...' : '➕ Crear Plantilla'}
      </button>
    </form>
  )
}
