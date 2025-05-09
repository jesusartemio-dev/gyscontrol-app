// src/app/catalogo/unidades/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { getUnidades, createUnidad } from '@/lib/services/unidad'
import { Unidad } from '@/types'
import { Plus } from 'lucide-react'

export default function CatalogoUnidadesPage() {
  const [unidades, setUnidades] = useState<Unidad[]>([])
  const [nuevaUnidad, setNuevaUnidad] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getUnidades()
      .then(setUnidades)
      .catch(() => setError('Error al cargar unidades'))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!nuevaUnidad.trim()) {
      setError('Debes ingresar un nombre de unidad')
      return
    }

    try {
      const creada = await createUnidad({ nombre: nuevaUnidad })
      setUnidades(prev => [...prev, creada])
      setNuevaUnidad('')
    } catch (err) {
      setError('Error al crear unidad')
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4 bg-white rounded shadow space-y-4">
      <h1 className="text-xl font-semibold">Catálogo: Unidades</h1>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={nuevaUnidad}
          onChange={e => setNuevaUnidad(e.target.value)}
          placeholder="Ej: und, m, l"
          className="border px-3 py-2 rounded w-full"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-3 py-2 rounded hover:bg-blue-700 flex items-center gap-1"
        >
          <Plus size={16} />
          Agregar
        </button>
      </form>

      {error && <p className="text-red-500">{error}</p>}

      <ul className="list-disc pl-5 space-y-1">
        {unidades.map((u) => (
          <li key={u.id} className="text-sm">{u.nombre}</li>
        ))}
      </ul>
    </div>
  )
}
