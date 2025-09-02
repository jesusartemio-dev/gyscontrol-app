// ===================================================
// 📁 Archivo: UnidadList.tsx
// 📌 Descripción: Lista moderna de unidades con diseño tipo tarjeta
// ===================================================

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Unidad } from '@/types'
import { deleteUnidad, updateUnidad } from '@/lib/services/unidad'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { toast } from 'sonner'
import { Calculator, Edit3, Trash2, Save, X, Loader2, Package } from 'lucide-react'

// Validation schema for editing
const editUnidadSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es obligatorio')
    .min(2, 'Mínimo 2 caracteres')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[a-zA-Z0-9\s\-\.]+$/, 'Solo letras, números, espacios, guiones y puntos')
    .trim()
})

type EditUnidadFormData = z.infer<typeof editUnidadSchema>

interface Props {
  data?: Unidad[]
  onDelete?: (id: string) => void
  onUpdate?: (unidad: Unidad) => void
  onRefresh?: () => void
  loading?: boolean
}

export default function UnidadList({ data, onDelete, onUpdate, onRefresh, loading }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  const form = useForm<EditUnidadFormData>({
    resolver: zodResolver(editUnidadSchema)
  })

  const handleEdit = (unidad: Unidad) => {
    setEditingId(unidad.id)
    form.reset({ nombre: unidad.nombre })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    form.reset()
  }

  const handleSaveEdit = async (data: EditUnidadFormData) => {
    if (!editingId) return

    setIsUpdating(true)
    try {
      const updatedUnidad = await updateUnidad(editingId, data)
      onUpdate?.(updatedUnidad)
      setEditingId(null)
      form.reset()
      toast.success('Unidad actualizada correctamente')
    } catch (error) {
      console.error('Error updating unidad:', error)
      toast.error('Error al actualizar la unidad')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await deleteUnidad(id)
      onDelete?.(id)
      toast.success('Unidad eliminada correctamente')
    } catch (error) {
      console.error('Error deleting unidad:', error)
      toast.error('Error al eliminar la unidad')
    } finally {
      setDeletingId(null)
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                  <div className="space-y-2">
                    <div className="h-4 bg-gray-200 rounded w-24"></div>
                    <div className="h-3 bg-gray-200 rounded w-16"></div>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Package className="w-12 h-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay unidades registradas
        </h3>
        <p className="text-gray-500 mb-6">
          Comienza agregando tu primera unidad de medida
        </p>
      </motion.div>
    )
  }

  return (
    <div className="space-y-4">
      <AnimatePresence>
        {data.map((unidad, index) => (
          <motion.div
            key={unidad.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card className="hover:shadow-md transition-shadow duration-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calculator className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      {editingId === unidad.id ? (
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(handleSaveEdit)} className="space-y-2">
                            <FormField
                              control={form.control}
                              name="nombre"
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      className="w-48"
                                      placeholder="Nombre de la unidad"
                                      autoFocus
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </form>
                        </Form>
                      ) : (
                        <>
                          <h3 className="font-semibold text-gray-900">
                            {unidad.nombre}
                          </h3>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="secondary" className="text-xs">
                              ID: {unidad.id.slice(0, 8)}
                            </Badge>
                            <span className="text-sm text-gray-500">
                              Creado: {new Date(unidad.createdAt).toLocaleDateString()}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    {editingId === unidad.id ? (
                      <>
                        <Button
                          type="submit"
                          size="sm"
                          onClick={form.handleSubmit(handleSaveEdit)}
                          disabled={isUpdating}
                          className="h-8 w-8 p-0"
                        >
                          {isUpdating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                          disabled={isUpdating}
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(unidad)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit3 className="w-4 h-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              {deletingId === unidad.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>¿Eliminar unidad?</AlertDialogTitle>
                              <AlertDialogDescription>
                                Esta acción no se puede deshacer. Se eliminará permanentemente la unidad "{unidad.nombre}".
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDelete(unidad.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Eliminar
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
