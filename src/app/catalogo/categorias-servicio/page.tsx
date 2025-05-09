'use client'

import { useEffect, useState } from 'react'
import CategoriaServicioForm from '@/components/catalogo/CategoriaServicioForm'
import CategoriaServicioList from '@/components/catalogo/CategoriaServicioList'
import { CategoriaServicio } from '@/types'
import { getCategoriasServicio } from '@/lib/services/categoriaServicio'

export default function Page() {
  const [categorias, setCategorias] = useState<CategoriaServicio[]>([])

  const cargarCategorias = async () => {
    const data = await getCategoriasServicio()
    setCategorias(data)
  }

  useEffect(() => {
    cargarCategorias()
  }, [])

  const handleCreated = (nueva: CategoriaServicio) => {
    setCategorias((prev) => [nueva, ...prev])
  }

  const handleUpdated = (actualizada: CategoriaServicio) => {
    setCategorias((prev) =>
      prev.map((c) => (c.id === actualizada.id ? actualizada : c))
    )
  }

  const handleDeleted = (id: string) => {
    setCategorias((prev) => prev.filter((c) => c.id !== id))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📁 Categorías de Servicio</h1>

      {/* 🧾 Formulario de creación */}
      <CategoriaServicioForm onCreated={handleCreated} />

      {/* 📋 Lista */}
      <div className="bg-white p-4 rounded shadow">
        <CategoriaServicioList
          data={categorias}
          onUpdate={handleUpdated}
          onDelete={handleDeleted}
        />
      </div>
    </div>
  )
}
