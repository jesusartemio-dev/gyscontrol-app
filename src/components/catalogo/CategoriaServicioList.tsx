'use client'

// ===================================================
// 📁 Archivo: CategoriaServicioList.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Lista de categorías de servicio con edición inline y eliminación
// ===================================================

import { useState } from 'react'
import { CategoriaServicio } from '@/types'
import { deleteCategoriaServicio, updateCategoriaServicio } from '@/lib/services/categoriaServicio'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'react-hot-toast'

interface Props {
  data?: CategoriaServicio[]
  onDelete?: (id: string) => void
  onUpdate?: (actualizada: CategoriaServicio) => void
}

export default function CategoriaServicioList({ data, onDelete, onUpdate }: Props) {
  const [editando, setEditando] = useState<string | null>(null)
  const [nombreEditado, setNombreEditado] = useState('')

  const handleEditar = (categoria: CategoriaServicio) => {
    setEditando(categoria.id)
    setNombreEditado(categoria.nombre)
  }

  const handleGuardar = async (id: string) => {
    try {
      const actualizada = await updateCategoriaServicio(id, { nombre: nombreEditado })
      toast.success('Categoría actualizada')
      onUpdate?.(actualizada)
      setEditando(null)
    } catch (error) {
      console.error('❌ Error al actualizar categoría', error)
      toast.error('Error al actualizar')
    }
  }

  const handleEliminar = async (id: string) => {
    try {
      await deleteCategoriaServicio(id)
      toast.success('Categoría eliminada')
      onDelete?.(id)
    } catch (error) {
      console.error('❌ Error al eliminar categoría', error)
      toast.error('Error al eliminar')
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">📂 Lista de Categorías de Servicio</h2>
      <ul className="space-y-2">
        {data?.map((cat) => (
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

            <Button
              variant="destructive"
              size="sm"
              onClick={() => handleEliminar(cat.id)}
            >
              Eliminar
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
