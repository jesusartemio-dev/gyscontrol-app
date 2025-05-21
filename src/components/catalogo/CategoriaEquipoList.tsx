// ===================================================
// 📁 Archivo: CategoriaEquipoList.tsx
// 📌 Lista de categorías con edición inline y eliminación
// ===================================================

'use client'

import { useState } from 'react'
import { CategoriaEquipo } from '@/types'
import { updateCategoriaEquipo, deleteCategoriaEquipo } from '@/lib/services/categoriaEquipo'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'react-hot-toast'

interface Props {
  data: CategoriaEquipo[]
  onUpdate?: (categoria: CategoriaEquipo) => void
  onDelete?: (id: string) => void
  onRefresh?: () => void
}

export default function CategoriaEquipoList({ data, onUpdate, onDelete, onRefresh }: Props) {
  const [editando, setEditando] = useState<string | null>(null)
  const [nombreEditado, setNombreEditado] = useState('')

  const handleEditar = (categoria: CategoriaEquipo) => {
    setEditando(categoria.id)
    setNombreEditado(categoria.nombre)
  }

  const handleGuardar = async (id: string) => {
    try {
      const actualizado = await updateCategoriaEquipo(id, { nombre: nombreEditado })
      toast.success('Actualizado')
      onUpdate?.(actualizado)
      onRefresh?.()
      setEditando(null)
    } catch (error) {
      toast.error('Error al actualizar')
    }
  }

  const handleEliminar = async (id: string) => {
    try {
      await deleteCategoriaEquipo(id)
      toast.success('Eliminado')
      onDelete?.(id)
      onRefresh?.()
    } catch (error) {
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">📋 Lista de Categorías</h2>
      <ul className="space-y-2">
        {data.map((cat) => (
          <li
            key={cat.id}
            className="p-3 bg-gray-100 rounded shadow flex justify-between items-center gap-2"
          >
            {editando === cat.id ? (
              <Input
                value={nombreEditado}
                onChange={(e) => setNombreEditado(e.target.value)}
                className="flex-1"
              />
            ) : (
              <span className="flex-1">{cat.nombre}</span>
            )}

            {editando === cat.id ? (
              <Button size="sm" onClick={() => handleGuardar(cat.id)}>
                Guardar
              </Button>
            ) : (
              <Button size="sm" onClick={() => handleEditar(cat)}>
                Editar
              </Button>
            )}

            <Button variant="destructive" size="sm" onClick={() => handleEliminar(cat.id)}>
              Eliminar
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
