// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/catalogo/recursos/
// 🔧 Descripción: Página de Recursos para crear, listar, editar, eliminar.
// 🧠 Uso: Accesible desde el menú lateral → Catálogo → Recursos
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-04-20
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import { getRecursos } from '@/lib/services/recurso'
import { Recurso } from '@/types'
import RecursoForm from '@/components/catalogo/RecursoForm'
import RecursoList from '@/components/catalogo/RecursoList'

export default function Page() {
  const [recursos, setRecursos] = useState<Recurso[]>([])

  useEffect(() => {
    getRecursos().then(setRecursos)
  }, [])

  const handleCreated = (nuevo: Recurso) => {
    setRecursos((prev) => [nuevo, ...prev])
  }

  const handleUpdated = (actualizado: Recurso) => {
    setRecursos((prev) =>
      prev.map((r) => (r.id === actualizado.id ? actualizado : r))
    )
  }

  const handleDeleted = (id: string) => {
    setRecursos((prev) => prev.filter((r) => r.id !== id))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">👷 Recursos</h1>

      <RecursoForm onCreated={handleCreated} />

      <div className="bg-white p-4 rounded shadow">
        <RecursoList
          data={recursos}
          onUpdate={handleUpdated}
          onDelete={handleDeleted}
        />
      </div>
    </div>
  )
}
