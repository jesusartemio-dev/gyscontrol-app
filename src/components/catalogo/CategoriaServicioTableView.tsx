// ===================================================
// 📁 Archivo: CategoriaServicioTableView.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Vista de tabla para categorías de servicio
//
// 🧠 Uso: Vista tabular con edición inline para categorías
// ✍️ Autor: Jesús Artemio
// 📅 Creación: 2025-09-25
// ===================================================

'use client'

import { useState } from 'react'
import { FolderOpen, Edit, Trash2, Save, X, Loader2 } from 'lucide-react'
import { CategoriaServicio } from '@/types'
import { updateCategoriaServicio, deleteCategoriaServicio } from '@/lib/services/categoriaServicio'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'

interface Props {
  data?: CategoriaServicio[]
  onUpdate?: (categoria: CategoriaServicio) => void
  onDelete?: (id: string) => void
  loading?: boolean
  error?: string | null
}

export default function CategoriaServicioTableView({ data, onUpdate, onDelete, loading = false, error = null }: Props) {
  const [editando, setEditando] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)

  const iniciarEdicion = (categoria: CategoriaServicio) => {
    setEditando(categoria.id)
    setNombre(categoria.nombre)
    setDescripcion(categoria.descripcion || '')
  }

  const cancelarEdicion = () => {
    setEditando(null)
    setNombre('')
    setDescripcion('')
  }

  const guardar = async (id: string) => {
    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    if (nombre.trim().length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres')
      return
    }

    setGuardando(true)
    try {
      const actualizada = await updateCategoriaServicio(id, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined
      })
      toast.success('Categoría actualizada exitosamente')
      onUpdate?.(actualizada)
      setEditando(null)
      setNombre('')
      setDescripcion('')
    } catch (err) {
      console.error('Error updating categoria:', err)
      toast.error('Error al actualizar la categoría')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id: string) => {
    setEliminando(id)
    try {
      await deleteCategoriaServicio(id)
      toast.success('Categoría eliminada exitosamente')
      onDelete?.(id)
    } catch (err) {
      console.error('Error deleting categoria:', err)
      toast.error('Error al eliminar la categoría')
    } finally {
      setEliminando(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="flex items-center space-x-4 p-4 border rounded-lg">
            <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-200 rounded animate-pulse w-1/4"></div>
              <div className="h-3 bg-gray-200 rounded animate-pulse w-3/4"></div>
            </div>
            <div className="flex space-x-2">
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
              <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-500 mb-2">Error al cargar las categorías</div>
        <div className="text-sm text-gray-500">{error}</div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay categorías registradas</h3>
        <p className="text-muted-foreground">
          Las categorías aparecerán aquí una vez que sean creadas
        </p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12"></TableHead>
            <TableHead>Nombre</TableHead>
            <TableHead>Descripción</TableHead>
            <TableHead className="w-32">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((categoria) => (
            <TableRow key={categoria.id}>
              <TableCell>
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FolderOpen className="h-4 w-4 text-blue-600" />
                </div>
              </TableCell>
              <TableCell>
                {editando === categoria.id ? (
                  <Input
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="h-8"
                    placeholder="Nombre de la categoría"
                  />
                ) : (
                  <div className="font-medium">{categoria.nombre}</div>
                )}
              </TableCell>
              <TableCell>
                {editando === categoria.id ? (
                  <Textarea
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    className="min-h-8 resize-none"
                    placeholder="Descripción opcional"
                    rows={2}
                  />
                ) : (
                  <div className="text-sm text-gray-600 max-w-xs truncate">
                    {categoria.descripcion || 'Sin descripción'}
                  </div>
                )}
              </TableCell>
              <TableCell>
                {editando === categoria.id ? (
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      onClick={() => guardar(categoria.id)}
                      disabled={guardando}
                      className="h-7 px-2"
                    >
                      {guardando ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Save className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelarEdicion}
                      disabled={guardando}
                      className="h-7 px-2"
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex space-x-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => iniciarEdicion(categoria)}
                      disabled={editando !== null || eliminando !== null}
                      className="h-7 px-2"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => eliminar(categoria.id)}
                      disabled={editando !== null || eliminando === categoria.id}
                      className="h-7 px-2"
                    >
                      {eliminando === categoria.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}