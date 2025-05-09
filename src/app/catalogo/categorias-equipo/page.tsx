'use client'

import { useEffect, useState } from 'react'
import {
  getCategoriaEquipo,
  createCategoriaEquipo,
  deleteCategoriaEquipo
} from '@/lib/services/categoriaEquipo'

interface Categoria {
  id: string
  nombre: string
}

export default function CategoriasEquipoPage() {
  const [categorias, setCategorias] = useState<Categoria[]>([])
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getCategoriaEquipo()
      .then(setCategorias)
      .catch(() => setError('Error al cargar categorías'))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!nuevaCategoria.trim()) {
      setError('Debes ingresar un nombre')
      return
    }

    try {
      const creada = await createCategoriaEquipo({ nombre: nuevaCategoria })
      setCategorias(prev => [...prev, creada])
      setNuevaCategoria('')
    } catch (err) {
      console.error(err)
      setError('Error al crear la categoría')
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await deleteCategoriaEquipo(id)
      setCategorias(prev => prev.filter(cat => cat.id !== id))
    } catch (err) {
      console.error(err)
      setError('Error al eliminar la categoría')
    }
  }

  return (
    <div className="max-w-xl mx-auto mt-8">
      <h1 className="text-2xl font-bold mb-4">Categorías de Equipos</h1>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-4">
        <input
          value={nuevaCategoria}
          onChange={e => setNuevaCategoria(e.target.value)}
          placeholder="Nueva categoría"
          className="border px-2 py-1 rounded w-full"
        />
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
        >
          Agregar
        </button>
      </form>

      {error && <p className="text-red-500 mb-2">{error}</p>}

      <ul className="pl-5 space-y-1">
        {categorias.map(c => (
          <li key={c.id} className="flex justify-between items-center border-b py-1">
            <span>{c.nombre}</span>
            <button
              onClick={() => handleDelete(c.id)}
              className="text-red-500 hover:text-red-700 text-sm"
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
