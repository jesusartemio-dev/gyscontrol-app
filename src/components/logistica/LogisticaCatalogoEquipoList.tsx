'use client'

import { Pencil, Trash2 } from 'lucide-react'
import { useState } from 'react'
import type { CatalogoEquipo } from '@/types'

interface Props {
  data: CatalogoEquipo[]
  onUpdate: (id: string, data: Partial<CatalogoEquipo>) => void
  onDelete: (id: string) => void
}

export default function LogisticaCatalogoEquipoList({ data, onUpdate, onDelete }: Props) {
  const [editId, setEditId] = useState<string | null>(null)
  const [editValues, setEditValues] = useState<Partial<CatalogoEquipo>>({})

  const startEdit = (equipo: CatalogoEquipo) => {
    setEditId(equipo.id)
    setEditValues(equipo)
  }

  const handleSave = () => {
    if (editId) {
      onUpdate(editId, editValues)
      setEditId(null)
      setEditValues({})
    }
  }

  return (
    <table className="w-full text-sm text-left text-gray-500">
      <thead className="text-xs text-gray-700 uppercase bg-gray-50">
        <tr>
          <th className="px-4 py-2">Código</th>
          <th className="px-4 py-2">Descripción</th>
          <th className="px-4 py-2">Categoría</th>
          <th className="px-4 py-2">Unidad</th>
          <th className="px-4 py-2">Marca</th>
          <th className="px-4 py-2">Precio Interno</th>
          <th className="px-4 py-2">Estado</th>
          <th className="px-4 py-2">Acciones</th>
        </tr>
      </thead>
      <tbody>
        {data.map((eq) => (
          <tr key={eq.id} className="bg-white border-b hover:bg-gray-50">
            <td className="px-4 py-2">{eq.codigo}</td>
            <td className="px-4 py-2">
              {editId === eq.id ? (
                <input
                  type="text"
                  value={editValues.descripcion || ''}
                  onChange={(e) =>
                    setEditValues((prev) => ({ ...prev, descripcion: e.target.value }))
                  }
                  className="border px-2 py-1 rounded"
                />
              ) : (
                eq.descripcion
              )}
            </td>
            <td className="px-4 py-2">{eq.categoria.nombre}</td>
            <td className="px-4 py-2">{eq.unidad.nombre}</td>
            <td className="px-4 py-2">
              {editId === eq.id ? (
                <input
                  type="text"
                  value={editValues.marca || ''}
                  onChange={(e) =>
                    setEditValues((prev) => ({ ...prev, marca: e.target.value }))
                  }
                  className="border px-2 py-1 rounded"
                />
              ) : (
                eq.marca
              )}
            </td>
            <td className="px-4 py-2">
              {editId === eq.id ? (
                <input
                  type="number"
                  value={editValues.precioInterno || ''}
                  onChange={(e) =>
                    setEditValues((prev) => ({
                      ...prev,
                      precioInterno: parseFloat(e.target.value),
                    }))
                  }
                  className="border px-2 py-1 rounded"
                />
              ) : (
                eq.precioInterno
              )}
            </td>
            <td className="px-4 py-2">{eq.estado}</td>
            <td className="px-4 py-2 flex gap-2">
              {editId === eq.id ? (
                <button
                  onClick={handleSave}
                  className="text-blue-600 hover:text-blue-800"
                >
                  Guardar
                </button>
              ) : (
                <button
                  onClick={() => startEdit(eq)}
                  className="text-yellow-500 hover:text-yellow-700"
                >
                  <Pencil size={16} />
                </button>
              )}
              <button
                onClick={() => onDelete(eq.id)}
                className="text-red-600 hover:text-red-800"
              >
                <Trash2 size={16} />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
