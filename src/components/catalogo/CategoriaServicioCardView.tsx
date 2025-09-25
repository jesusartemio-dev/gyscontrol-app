// ===================================================
// 📁 Archivo: CategoriaServicioCardView.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Vista de cards para categorías de servicio
//
// 🧠 Uso: Vista de tarjetas con edición inline para categorías
// ✍️ Autor: Jesús Artemio
// 📅 Creación: 2025-09-25
// ===================================================

'use client'

import { useState } from 'react'
import { FolderOpen, Edit, Trash2, Save, X, Loader2, Package } from 'lucide-react'
import { CategoriaServicio } from '@/types'
import { updateCategoriaServicio, deleteCategoriaServicio } from '@/lib/services/categoriaServicio'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Props {
  data?: CategoriaServicio[]
  onUpdate?: (categoria: CategoriaServicio) => void
  onDelete?: (id: string) => void
  loading?: boolean
  error?: string | null
}

export default function CategoriaServicioCardView({ data, onUpdate, onDelete, loading = false, error = null }: Props) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="space-y-1">
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                  <div className="h-3 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded"></div>
                <div className="h-3 bg-gray-200 rounded w-3/4"></div>
              </div>
            </CardContent>
          </Card>
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((categoria) => (
        <Card key={categoria.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FolderOpen className="h-4 w-4 text-blue-600" />
                </div>
                {editando === categoria.id ? (
                  <div className="flex-1 space-y-2">
                    <Input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="h-8 text-sm"
                      placeholder="Nombre de la categoría"
                    />
                  </div>
                ) : (
                  <div className="flex-1">
                    <CardTitle className="text-base">{categoria.nombre}</CardTitle>
                    <CardDescription className="text-xs">
                      {categoria.servicios?.length || 0} servicios
                    </CardDescription>
                  </div>
                )}
              </div>
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
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {editando === categoria.id ? (
              <Textarea
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
                className="min-h-16 resize-none text-sm"
                placeholder="Descripción opcional"
                rows={3}
              />
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-gray-600 line-clamp-3">
                  {categoria.descripcion || 'Sin descripción'}
                </p>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-xs">
                    <Package className="h-3 w-3 mr-1" />
                    {categoria.servicios?.length || 0}
                  </Badge>
                  <span className="text-xs text-gray-500">
                    {new Date(categoria.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}