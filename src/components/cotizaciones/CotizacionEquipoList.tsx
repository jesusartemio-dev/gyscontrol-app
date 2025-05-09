'use client'

import Link from 'next/link'
import { useState } from 'react'
import { deleteCotizacionEquipo, updateCotizacionEquipo } from '@/lib/services/cotizacionEquipo'

interface CotizacionEquipo {
  id: string
  nombre: string
  subtotalCliente: number
}

interface Props {
  equipos: CotizacionEquipo[]
  cotizacionId: string
  onDeleted: (id: string) => void
  onUpdated: (actualizado: CotizacionEquipo) => void
}

export default function CotizacionEquipoList({ equipos, cotizacionId, onDeleted, onUpdated }: Props) {
  const [error, setError] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)

  const handleEdit = async (id: string, field: string, value: string) => {
    if (!value.trim()) return
    setError(null)
    setLoadingId(id)
    try {
      const actualizado = await updateCotizacionEquipo(id, { [field]: value })
      onUpdated(actualizado)
    } catch (err) {
      console.error(err)
      setError('Error al actualizar la sección.')
    } finally {
      setLoadingId(null)
    }
  }

  const handleDelete = async (id: string) => {
    setError(null)
    setLoadingId(id)
    try {
      await deleteCotizacionEquipo(id)
      onDeleted(id)
    } catch (err) {
      console.error(err)
      setError('Error al eliminar la sección.')
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <>
      {error && <p className="text-red-500">{error}</p>}
      <table className="w-full border mt-4">
        <thead>
          <tr>
            <th className="border px-4 py-2">Nombre</th>
            <th className="border px-4 py-2">Subtotal Cliente</th>
            <th className="border px-4 py-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {equipos.map((eq) => (
            <tr key={eq.id}>
              <td
                className="border px-4 py-2"
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) => {
                  const value = e.currentTarget.textContent?.trim() || ''
                  if (value && value !== eq.nombre) {
                    handleEdit(eq.id, 'nombre', value)
                  }
                }}
              >
                {loadingId === eq.id ? 'Guardando...' : eq.nombre}
              </td>
              <td className="border px-4 py-2">S/ {eq.subtotalCliente.toFixed(2)}</td>
              <td className="border px-4 py-2 space-x-2">
                <Link
                  href={`/comercial/cotizaciones/${cotizacionId}/equipo/${eq.id}`}
                  className="text-blue-600 hover:underline"
                >
                  Ver Ítems
                </Link>
                <button
                  onClick={() => handleDelete(eq.id)}
                  className="text-red-600"
                  disabled={loadingId === eq.id}
                >
                  {loadingId === eq.id ? 'Eliminando...' : '❌'}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}
