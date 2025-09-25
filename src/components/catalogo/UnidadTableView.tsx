// ===================================================
// 📁 Archivo: UnidadTableView.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Vista de tabla para unidades
//
// 🧠 Uso: Vista tabular de unidades con edición inline
// ✍️ Autor: Jesús Artemio
// 📅 Creación: 2025-09-25
// ===================================================

'use client'

import { useState } from 'react'
import { Unidad } from '@/types'
import { deleteUnidad, updateUnidad } from '@/lib/services/unidad'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  Edit,
  Trash2,
  Save,
  X,
  Calculator,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  data?: Unidad[]
  onUpdate?: (unidad: Unidad) => void
  onDelete?: (id: string) => void
  loading?: boolean
  error?: string | null
}

export default function UnidadTableView({ data, onUpdate, onDelete, loading = false, error = null }: Props) {
  const [editando, setEditando] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)

  const iniciarEdicion = (u: Unidad) => {
    setEditando(u.id)
    setNombre(u.nombre)
  }

  const cancelarEdicion = () => {
    setEditando(null)
    setNombre('')
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
      const actualizada = await updateUnidad(id, { nombre: nombre.trim() })
      toast.success('Unidad actualizada correctamente')
      onUpdate?.(actualizada)
      setEditando(null)
      setNombre('')
    } catch (error) {
      console.error('Error al actualizar unidad:', error)
      toast.error('Error al actualizar la unidad')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id: string) => {
    setEliminando(id)
    try {
      await deleteUnidad(id)
      toast.success('Unidad eliminada correctamente')
      onDelete?.(id)
    } catch (error) {
      console.error('Error al eliminar unidad:', error)
      toast.error('Error al eliminar la unidad')
    } finally {
      setEliminando(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay unidades disponibles
        </h3>
        <p className="text-gray-500">
          Las unidades que agregues aparecerán aquí para su gestión.
        </p>
      </div>
    )
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[60%]">Nombre de la Unidad</TableHead>
            <TableHead className="w-[40%] text-right">Acciones</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((unidad) => (
            <TableRow key={unidad.id}>
              {editando === unidad.id ? (
                <>
                  <TableCell>
                    <Input
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Nombre de la unidad"
                      className="h-8"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={cancelarEdicion}
                        disabled={guardando}
                        className="h-7 px-2 text-xs"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => guardar(unidad.id)}
                        disabled={guardando}
                        className="h-7 px-2 text-xs"
                      >
                        {guardando ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Save className="h-3 w-3 mr-1" />
                            Guardar
                          </>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </>
              ) : (
                <>
                  <TableCell className="font-medium">{unidad.nombre}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => iniciarEdicion(unidad)}
                        disabled={editando !== null || eliminando !== null}
                        className="h-7 px-2 text-xs"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => eliminar(unidad.id)}
                        disabled={editando !== null || eliminando === unidad.id}
                        className="h-7 px-2 text-xs"
                      >
                        {eliminando === unidad.id ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Eliminando...
                          </>
                        ) : (
                          <>
                            <Trash2 className="h-3 w-3 mr-1" />
                            Eliminar
                          </>
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}