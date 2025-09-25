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
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'react-hot-toast'

interface Props {
  data: CategoriaEquipo[]
  onUpdate?: (categoria: CategoriaEquipo) => void
  onDelete?: (id: string) => void
  onRefresh?: () => void
  viewMode?: 'table' | 'card'
}

export default function CategoriaEquipoList({ data, onUpdate, onDelete, onRefresh, viewMode = 'table' }: Props) {
  const [editando, setEditando] = useState<string | null>(null)
  const [nombreEditado, setNombreEditado] = useState('')
  const [descripcionEditada, setDescripcionEditada] = useState('')

  const handleEditar = (categoria: CategoriaEquipo) => {
    setEditando(categoria.id)
    setNombreEditado(categoria.nombre)
    setDescripcionEditada(categoria.descripcion || '')
  }

  const handleGuardar = async (id: string) => {
    try {
      const actualizado = await updateCategoriaEquipo(id, {
        nombre: nombreEditado,
        descripcion: descripcionEditada || undefined
      })
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

  if (viewMode === 'card') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((cat) => (
          <div
            key={cat.id}
            className="p-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold text-lg">{cat.nombre}</h3>
                {cat.descripcion && (
                  <p className="text-sm text-muted-foreground mt-1">{cat.descripcion}</p>
                )}
              </div>
              <div className="flex gap-2">
                <Button size="sm" onClick={() => handleEditar(cat)}>
                  Editar
                </Button>
                <Button variant="destructive" size="sm" onClick={() => handleEliminar(cat.id)}>
                  Eliminar
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="text-left p-2 font-semibold">Nombre</th>
              <th className="text-left p-2 font-semibold">Descripción</th>
              <th className="text-left p-2 font-semibold w-32">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data.map((cat) => (
              <tr key={cat.id} className="border-b hover:bg-muted/50">
                <td className="p-2">
                  {editando === cat.id ? (
                    <Input
                      value={nombreEditado}
                      onChange={(e) => setNombreEditado(e.target.value)}
                      className="w-full"
                    />
                  ) : (
                    <span>{cat.nombre}</span>
                  )}
                </td>
                <td className="p-2">
                  {editando === cat.id ? (
                    <Textarea
                      value={descripcionEditada}
                      onChange={(e) => setDescripcionEditada(e.target.value)}
                      className="w-full min-h-[60px]"
                      rows={2}
                    />
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {cat.descripcion || 'Sin descripción'}
                    </span>
                  )}
                </td>
                <td className="p-2">
                  <div className="flex gap-2">
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
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
