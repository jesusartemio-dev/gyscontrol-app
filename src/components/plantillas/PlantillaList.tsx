'use client'

import Link from 'next/link'
import { deletePlantilla, updatePlantilla } from '@/lib/services/plantilla'
import { useState } from 'react'
import type { Plantilla } from '@/app/comercial/plantillas/page'

interface Props {
  plantillas: Plantilla[]
  onDelete: (id: string) => void
  onUpdated: (actualizado: Plantilla) => void
}

export default function PlantillaList({ plantillas, onDelete, onUpdated }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleEdit = async (id: string, field: string, value: string) => {
    if (!value.trim()) return
    setError(null)
    setLoadingId(id)
    try {
      const actualizado = await updatePlantilla(id, { [field]: value })
      onUpdated(actualizado)
    } catch (err) {
      console.error(err)
      setError('Error al actualizar la plantilla.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setError(null)
    setLoadingId(id)
    try {
      await deletePlantilla(id)
      onDelete(id)
    } catch (err) {
      console.error(err)
      setError('Error al eliminar la plantilla.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <>
      {error && <p className="text-red-500 mb-2">{error}</p>}

      <table className="w-full border mt-4 text-sm">
        <thead className="bg-gray-100">
          <tr>
            <th className="border px-4 py-2 text-left">Nombre</th>
            <th className="border px-4 py-2 text-right">Total Cliente</th>
            <th className="border px-4 py-2 text-right">Total Interno</th>
            <th className="border px-4 py-2 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {plantillas.map((p) => (
            <tr key={p.id} className="hover:bg-gray-50">
              <td
                className="border px-4 py-2"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const value = e.currentTarget.textContent?.trim() || ''
                  if (value && value !== p.nombre) {
                    handleEdit(p.id, 'nombre', value)
                  }
                }}
              >
                {loadingId === p.id ? 'Guardando...' : p.nombre}
              </td>
              <td className="border px-4 py-2 text-right">S/ {p.totalCliente.toFixed(2)}</td>
              <td className="border px-4 py-2 text-right">S/ {p.totalInterno.toFixed(2)}</td>
              <td className="border px-4 py-2 text-center space-x-2">
                <Link
                  href={`/comercial/plantillas/${p.id}`}
                  className="text-blue-600 hover:underline"
                >
                  Ver
                </Link>
                <button
                  onClick={() => handleDelete(p.id)}
                  className="text-red-600 hover:underline"
                  disabled={loadingId === p.id}
                >
                  {loadingId === p.id ? 'Eliminando...' : '❌'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
