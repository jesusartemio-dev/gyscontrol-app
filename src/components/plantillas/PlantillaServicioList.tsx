// ===================================================
// 📁 Archivo: PlantillaServicioList.tsx
// 📌 Ubicación: src/components/plantillas/
// 🔧 Descripción: Muestra lista de secciones de servicios creadas
//
// 🧠 Uso: Se muestra debajo del formulario de creación
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-04-21
// ===================================================

'use client'

import { useState } from 'react'
import {
  deletePlantillaServicio,
  updatePlantillaServicio
} from '@/lib/services/plantillaServicio'

interface Props {
  servicios: any[]
  plantillaId: string
  onDeleted: (id: string) => void
  onUpdated: (actualizado: any) => void
}

export default function PlantillaServicioList({
  servicios,
  plantillaId,
  onDeleted,
  onUpdated
}: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState<string | null>(null)

  const handleEdit = async (id: string, field: string, value: string) => {
    if (!value.trim()) {
      setError('El campo no puede estar vacío.')
      return
    }

    try {
      setError(null)
      setLoading(id)
      const actualizado = await updatePlantillaServicio(id, { [field]: value })
      onUpdated(actualizado)
    } catch {
      setError('Error al actualizar la sección.')
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      setError(null)
      setLoading(id)
      await deletePlantillaServicio(id)
      onDeleted(id)
    } catch {
      setError('Error al eliminar la sección.')
    } finally {
      setLoading(null)
    }
  }

  return (
    <>
      {error && <p className="text-red-500">{error}</p>}

      <table className="w-full border mt-4">
        <thead>
          <tr>
            <th className="border px-4 py-2">Nombre</th>
            <th className="border px-4 py-2">Categoría</th>
            <th className="border px-4 py-2">Subtotal Cliente</th>
            <th className="border px-4 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {servicios.map((s) => (
            <tr key={s.id}>
              <td
                className="border px-4 py-2"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const value = e.currentTarget.textContent?.trim() || ''
                  if (value !== s.nombre) {
                    handleEdit(s.id, 'nombre', value)
                  }
                }}
              >
                {loading === s.id ? 'Actualizando...' : s.nombre}
              </td>
              <td
                className="border px-4 py-2"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const value = e.currentTarget.textContent?.trim() || ''
                  if (value !== s.categoria) {
                    handleEdit(s.id, 'categoria', value)
                  }
                }}
              >
                {loading === s.id ? 'Actualizando...' : s.categoria}
              </td>
              <td className="border px-4 py-2">$ {s.subtotalCliente.toFixed(2)}</td>
              <td className="border px-4 py-2 space-x-2">
                <a
                  href={`/comercial/plantillas/${plantillaId}/servicio/${s.id}`}
                  className="text-blue-600 hover:underline"
                >
                  Ver Ítems
                </a>
                <button
                  onClick={() => handleDelete(s.id)}
                  className="text-red-600"
                  disabled={loading === s.id}
                >
                  {loading === s.id ? 'Eliminando...' : '❌'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
