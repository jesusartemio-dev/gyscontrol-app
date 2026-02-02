// ===================================================
// 📁 Archivo: UnidadCardView.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Vista de cards para unidades
//
// 🧠 Uso: Vista de tarjetas de unidades con edición inline
// ✍️ Autor: Jesús Artemio
// 📅 Creación: 2025-09-25
// ===================================================

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Unidad } from '@/types'
import { deleteUnidad, updateUnidad } from '@/lib/services/unidad'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
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

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 }
  },
  exit: {
    opacity: 0,
    x: -100,
    transition: { duration: 0.2 }
  }
}

export default function UnidadCardView({ data, onUpdate, onDelete, loading = false, error = null }: Props) {
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="flex space-x-2">
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <AnimatePresence>
        {data.map((unidad) => (
          <motion.div
            key={unidad.id}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            layout
          >
            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-4">
                {editando === unidad.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Edit className="h-3 w-3 text-blue-600" />
                      <span className="text-xs font-medium text-blue-600">
                        Editando unidad
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">
                          Nombre de la unidad
                        </label>
                        <Input
                          value={nombre}
                          onChange={(e) => setNombre(e.target.value)}
                          placeholder="Nombre de la unidad"
                          className="w-full h-8 text-sm"
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-1 pt-1">
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
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <div className="p-1.5 bg-blue-100 rounded-md">
                        <Calculator className="h-4 w-4 text-blue-600" />
                      </div>
                      <h3 className="font-medium text-gray-900 text-sm flex-1 truncate">
                        {unidad.nombre}
                      </h3>
                    </div>

                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-50 rounded-full">
                        <Calculator className="h-6 w-6 text-blue-600" />
                      </div>
                    </div>

                    <div className="flex items-center space-x-1 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => iniciarEdicion(unidad)}
                        disabled={editando !== null || eliminando !== null}
                        className="h-8 px-3 text-xs flex-1"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => eliminar(unidad.id)}
                        disabled={editando !== null || eliminando === unidad.id}
                        className="h-8 px-3 text-xs flex-1"
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
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}