// ===================================================
// 📁 Archivo: RecursoCardView.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Vista de cards para recursos
//
// 🧠 Uso: Vista de tarjetas de recursos con edición inline
// ✍️ Autor: Jesús Artemio
// 📅 Creación: 2025-09-25
// ===================================================

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Recurso } from '@/types'
import { deleteRecurso, updateRecurso } from '@/lib/services/recurso'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import {
  Edit,
  Trash2,
  Save,
  X,
  DollarSign,
  Package,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface Props {
  data?: Recurso[]
  onUpdate?: (r: Recurso) => void
  onDelete?: (id: string) => void
  loading?: boolean
  error?: string | null
}

// Currency formatter
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(amount)
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

export default function RecursoCardView({ data, onUpdate, onDelete, loading = false, error = null }: Props) {
  const [editando, setEditando] = useState<string | null>(null)
  const [nombre, setNombre] = useState('')
  const [costoHora, setCostoHora] = useState(0)
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState<string | null>(null)

  const iniciarEdicion = (r: Recurso) => {
    setEditando(r.id)
    setNombre(r.nombre)
    setCostoHora(r.costoHora)
  }

  const cancelarEdicion = () => {
    setEditando(null)
    setNombre('')
    setCostoHora(0)
  }

  const guardar = async (id: string) => {
    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio')
      return
    }

    if (costoHora <= 0) {
      toast.error('El costo por hora debe ser mayor a 0')
      return
    }

    setGuardando(true)
    try {
      const actualizado = await updateRecurso(id, { nombre: nombre.trim(), costoHora })
      toast.success('Recurso actualizado correctamente')
      onUpdate?.(actualizado)
      setEditando(null)
      setNombre('')
      setCostoHora(0)
    } catch (error) {
      console.error('Error al actualizar recurso:', error)
      toast.error('Error al actualizar el recurso')
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (id: string) => {
    setEliminando(id)
    try {
      await deleteRecurso(id)
      toast.success('Recurso eliminado correctamente')
      onDelete?.(id)
    } catch (error) {
      console.error('Error al eliminar recurso:', error)
      toast.error('Error al eliminar el recurso')
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
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
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
        <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay recursos disponibles
        </h3>
        <p className="text-gray-500">
          Los recursos que agregues aparecerán aquí para su gestión.
        </p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <AnimatePresence>
        {data.map((recurso) => (
          <motion.div
            key={recurso.id}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            layout
          >
            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-4">
                {editando === recurso.id ? (
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2 mb-2">
                      <Edit className="h-3 w-3 text-blue-600" />
                      <span className="text-xs font-medium text-blue-600">
                        Editando recurso
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">
                          Nombre del recurso
                        </label>
                        <Input
                          value={nombre}
                          onChange={(e) => setNombre(e.target.value)}
                          placeholder="Ingrese el nombre del recurso"
                          className="w-full h-8 text-sm"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-700">
                          Costo por hora
                        </label>
                        <div className="relative">
                          <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                          <Input
                            type="number"
                            value={costoHora}
                            onChange={(e) => setCostoHora(parseFloat(e.target.value) || 0)}
                            placeholder="0.00"
                            className="pl-8 h-8 text-sm"
                            min="0"
                            step="0.01"
                          />
                        </div>
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
                        onClick={() => guardar(recurso.id)}
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
                      <div className="p-1.5 bg-gray-100 rounded-md">
                        <Package className="h-4 w-4 text-gray-600" />
                      </div>
                      <h3 className="font-medium text-gray-900 text-sm flex-1 truncate">
                        {recurso.nombre}
                      </h3>
                    </div>

                    <div className="flex items-center space-x-1">
                      <DollarSign className="h-4 w-4 text-gray-400" />
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(recurso.costoHora)}
                      </span>
                      <span className="text-xs text-gray-500">por hora</span>
                    </div>

                    <div className="flex items-center space-x-1 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => iniciarEdicion(recurso)}
                        disabled={editando !== null || eliminando !== null}
                        className="h-8 px-3 text-xs flex-1"
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => eliminar(recurso.id)}
                        disabled={editando !== null || eliminando === recurso.id}
                        className="h-8 px-3 text-xs flex-1"
                      >
                        {eliminando === recurso.id ? (
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