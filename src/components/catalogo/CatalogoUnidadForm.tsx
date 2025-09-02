'use client'

import { useState } from 'react'
import { createUnidad } from '@/lib/services/unidad'
import { Plus } from 'lucide-react'

interface CatalogoUnidadFormProps {
  onCreated: (nueva: { id: string; nombre: string }) => void
}

export default function CatalogoUnidadForm({ onCreated }: CatalogoUnidadFormProps) {
  const [nombre, setNombre] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }

    try {
      const nueva = await createUnidad({ nombre: nombre.trim() })
      onCreated(nueva)
      setNombre('')
    } catch (err) {
      console.error('❌ Error al crear unidad:', err)
      setError('Error al crear la unidad. Intenta nuevamente.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 items-center mb-4">
      <input
        type="text"
        value={nombre}
        onChange={e => setNombre(e.target.value)}
        placeholder="Nueva unidad (ej. und, m, l)"
        className="border px-2 py-1 rounded text-sm"
      />
      <button
        type="submit"
        className="flex items-center gap-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
      >
        <Plus size={16} />
        Agregar
      </button>
      {error && <span className="text-red-500 text-sm ml-2">{error}</span>}
    </form>
  )
}
