// ===================================================
// 📁 Archivo: EdtCardView.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Vista de cards para EDTs
//
// 🧠 Uso: Vista de tarjetas con edición inline para EDTs
// ✍️ Autor: Jesús Artemio
// 📅 Creación: 2025-10-15
// ===================================================

'use client'

import { useState } from 'react'
import { FolderOpen, Edit, Trash2, Save, X, Loader2, Package, ShieldAlert } from 'lucide-react'
import { Edt } from '@/types'
import { updateEdt, deleteEdt } from '@/lib/services/edt'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'

interface Props {
  data?: Edt[]
  onUpdate?: (edt: Edt) => void
  onDelete?: (id: string) => void
  loading?: boolean
  error?: string | null
}

export default function EdtCardView({ data, onUpdate, onDelete, loading = false, error = null }: Props) {
  const [editando, setEditando] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)

  const iniciarEdicion = (edt: Edt) => {
    setEditando(edt.id)
    setNombre(edt.nombre)
    setDescripcion(edt.descripcion || '')
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
      const actualizada = await updateEdt(id, {
        nombre: nombre.trim(),
        descripcion: descripcion.trim() || undefined
      })
      toast.success('EDT actualizado exitosamente')
      onUpdate?.(actualizada)
      setEditando(null)
      setNombre('')
      setDescripcion('')
    } catch (err) {
      console.error('Error updating edt:', err)
      toast.error('Error al actualizar el EDT')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id: string) => {
    setEliminando(id)
    try {
      const res = await fetch(`/api/edt/${id}`, { method: 'DELETE' })
      if (res.status === 409) {
        const data = await res.json()
        toast.error(data.error || 'EDT en uso, no se puede eliminar')
        return
      }
      if (!res.ok) throw new Error('Error al eliminar')
      toast.success('EDT eliminado exitosamente')
      onDelete?.(id)
    } catch (err) {
      console.error('Error deleting edt:', err)
      toast.error('Error al eliminar el EDT')
    } finally {
      setEliminando(null)
    }
  }

  const getUsoTotal = (edt: Edt) => {
    if (!edt._count) return 0
    return edt._count.cotizacionEdt + edt._count.proyectoEdt
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
        <div className="text-red-500 mb-2">Error al cargar los EDTs</div>
        <div className="text-sm text-gray-500">{error}</div>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <FolderOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">No hay EDTs registrados</h3>
        <p className="text-muted-foreground">
          Los EDTs aparecerán aquí una vez que sean creados
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {data.map((edt) => (
        <Card key={edt.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <FolderOpen className="h-4 w-4 text-blue-600" />
                </div>
                {editando === edt.id ? (
                  <div className="flex-1 space-y-2">
                    <Input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="h-8 text-sm"
                      placeholder="Nombre del EDT"
                    />
                  </div>
                ) : (
                  <div className="flex-1">
                    <CardTitle className="text-base">{edt.nombre}</CardTitle>
                    <CardDescription className="text-xs">
                      {edt.servicios?.length || 0} servicios
                    </CardDescription>
                  </div>
                )}
              </div>
              {editando === edt.id ? (
                <div className="flex space-x-1">
                  <Button
                    size="sm"
                    onClick={() => guardar(edt.id)}
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
                    onClick={() => iniciarEdicion(edt)}
                    disabled={editando !== null || eliminando !== null}
                    className="h-7 px-2"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant={getUsoTotal(edt) > 0 ? "outline" : "destructive"}
                    onClick={() => eliminar(edt.id)}
                    disabled={editando !== null || eliminando === edt.id || getUsoTotal(edt) > 0}
                    className="h-7 px-2"
                    title={getUsoTotal(edt) > 0 ? 'EDT en uso, no se puede eliminar' : 'Eliminar'}
                  >
                    {eliminando === edt.id ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : getUsoTotal(edt) > 0 ? (
                      <ShieldAlert className="h-3 w-3 text-muted-foreground" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {editando === edt.id ? (
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
                  {edt.descripcion || 'Sin descripción'}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5">
                    <Badge variant="secondary" className="text-xs">
                      <Package className="h-3 w-3 mr-1" />
                      {edt.servicios?.length || 0}
                    </Badge>
                    {getUsoTotal(edt) > 0 && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                        En uso: {getUsoTotal(edt)}
                      </Badge>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">
                    {new Date(edt.createdAt).toLocaleDateString()}
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