// ===================================================
// 📁 Archivo: PlantillaServicioForm.tsx
// 📌 Ubicación: src/components/plantillas/
// 🔧 Descripción: Formulario para crear una sección de servicios en la plantilla
//
// 🧠 Uso: Se muestra encima del listado de secciones
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-04-21
// ===================================================

'use client'

import { useState } from 'react'
import { createPlantillaServicio } from '@/lib/services/plantillaServicio'
import type { PlantillaServicioPayload } from '@/types'

interface Props {
  plantillaId: string
  onCreated: (nuevo: any) => void
}

export default function PlantillaServicioForm({ plantillaId, onCreated }: Props) {
  const [nombre, setNombre] = useState('')
  const [categoria, setCategoria] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!nombre.trim()) {
      setError('El nombre es obligatorio.')
      return
    }

    if (!categoria.trim()) {
      setError('La categoría es obligatoria.')
      return
    }

    const payload: PlantillaServicioPayload = {
      plantillaId,
      nombre,
      categoria,
      descripcion,
      subtotalInterno: 0,
      subtotalCliente: 0
    }

    try {
      setLoading(true)
      const nuevo = await createPlantillaServicio(payload)
      onCreated(nuevo)
      setNombre('')
      setCategoria('')
      setDescripcion('')
    } catch {
      setError('Error al crear la sección.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_1fr_auto] gap-2 items-center mt-2">
      {error && <p className="text-red-500 text-sm sm:col-span-4">{error}</p>}

      <input
        value={nombre}
        onChange={(e) => setNombre(e.target.value)}
        placeholder="Nombre del servicio"
        className="border px-3 py-2 rounded text-sm ring-1 ring-gray-300 focus:outline-none focus:ring-blue-500"
        disabled={loading}
      />
      <input
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        placeholder="Categoría"
        className="border px-3 py-2 rounded text-sm ring-1 ring-gray-300 focus:outline-none focus:ring-blue-500"
        disabled={loading}
      />
      <input
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        placeholder="Descripción (opcional)"
        className="border px-3 py-2 rounded text-sm ring-1 ring-gray-300 focus:outline-none focus:ring-blue-500"
        disabled={loading}
      />
      <button
        type="submit"
        className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded text-sm disabled:opacity-50"
        disabled={loading}
      >
        {loading ? 'Agregando...' : '➕ Servicio'}
      </button>
    </form>
  )
}
