// ===================================================
// 📁 Archivo: page.tsx
// 📌 Ubicación: src/app/catalogo/unidades-servicio/
// 🔧 Descripción: Página cliente que muestra formulario y listado
//    de unidades de servicio para el catálogo.
//
// 🧠 Uso: Se accede desde el menú lateral → Catálogo → Unidades Servicio
// ✍️ Autor: Jesús Artemio (Master Experto 🧙‍♂️)
// 📅 Última actualización: 2025-04-20
// ===================================================

'use client'

import { useEffect, useState } from 'react'
import UnidadServicioForm from '@/components/catalogo/UnidadServicioForm'
import UnidadServicioList from '@/components/catalogo/UnidadServicioList'
import { UnidadServicio } from '@/types'
import { getUnidadesServicio } from '@/lib/services/unidadServicio'

export default function Page() {
  const [unidades, setUnidades] = useState<UnidadServicio[]>([])

  // 🔁 Carga inicial de unidades
  const cargarUnidades = async () => {
    const data = await getUnidadesServicio()
    setUnidades(data)
  }

  useEffect(() => {
    cargarUnidades()
  }, [])

  // ✅ Crear
  const handleCreated = (nueva: UnidadServicio) => {
    setUnidades((prev) => [nueva, ...prev])
  }

  // 🔁 Actualizar
  const handleUpdated = (actualizada: UnidadServicio) => {
    setUnidades((prev) =>
      prev.map((u) => (u.id === actualizada.id ? actualizada : u))
    )
  }

  // ❌ Eliminar
  const handleDeleted = (id: string) => {
    setUnidades((prev) => prev.filter((u) => u.id !== id))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📏 Unidades de Servicio</h1>

      {/* 🧾 Formulario de creación */}
      <UnidadServicioForm onCreated={handleCreated} />

      {/* 📋 Lista de unidades */}
      <div className="bg-white p-4 rounded shadow">
        <UnidadServicioList
          data={unidades}
          onUpdate={handleUpdated}
          onDelete={handleDeleted}
          onRefresh={cargarUnidades}
        />
      </div>
    </div>
  )
}
