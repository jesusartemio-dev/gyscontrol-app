// ===================================================
// 📁 Archivo: UnidadServicioList.tsx
// 📌 Descripción: Lista moderna de unidades de servicio con diseño tipo tarjeta
// ===================================================

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { UnidadServicio } from '@/types'
import { deleteUnidadServicio, updateUnidadServicio } from '@/lib/services/unidadServicio'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog'
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form'
import { toast } from 'sonner'
import { Settings, Edit3, Trash2, Save, X, Loader2, Package } from 'lucide-react'

// Validation schema for editing
const editUnidadServicioSchema = z.object({
  nombre: z.string()
    .min(1, 'El nombre es obligatorio')
    .min(2, 'Mínimo 2 caracteres')
    .max(50, 'Máximo 50 caracteres')
    .regex(/^[a-zA-Z0-9\s\-\.]+$/, 'Solo letras, números, espacios, guiones y puntos')
    .trim()
})

type EditUnidadServicioForm = z.infer<typeof editUnidadServicioSchema>

interface Props {
  data?: UnidadServicio[]
  onDelete?: (id: string) => void
  onUpdate?: (unidad: UnidadServicio) => void
  onRefresh?: () => void
  loading?: boolean
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { 
    opacity: 1, 
    y: 0,
    transition: {
      duration: 0.3
    }
  },
  exit: { 
    opacity: 0, 
    x: -100,
    transition: {
      duration: 0.2
    }
  }
}

export default function UnidadServicioList({ data = [], onDelete, onUpdate, onRefresh, loading }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const form = useForm<EditUnidadServicioForm>({
    resolver: zodResolver(editUnidadServicioSchema),
    defaultValues: {
      nombre: ''
    }
  })

  const handleEdit = (unidad: UnidadServicio) => {
    setEditingId(unidad.id)
    form.reset({ nombre: unidad.nombre })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    form.reset()
  }

  const handleSaveEdit = async (formData: EditUnidadServicioForm) => {
    if (!editingId) return
    
    setIsUpdating(true)
    try {
      const updated = await updateUnidadServicio(editingId, { nombre: formData.nombre })
      toast.success('Unidad de servicio actualizada correctamente')
      onUpdate?.(updated)
      onRefresh?.()
      setEditingId(null)
      form.reset()
    } catch (error) {
      console.error('Error updating unidad servicio:', error)
      toast.error('Error al actualizar la unidad de servicio')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleDelete = async (id: string) => {
    setIsDeleting(id)
    try {
      await deleteUnidadServicio(id)
      toast.success('Unidad de servicio eliminada correctamente')
      onDelete?.(id)
      onRefresh?.()
    } catch (error) {
      console.error('Error deleting unidad servicio:', error)
      toast.error('Error al eliminar la unidad de servicio')
    } finally {
      setIsDeleting(null)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
          <span className="text-gray-600">Cargando unidades de servicio...</span>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-16 h-8 bg-gray-200 rounded"></div>
                    <div className="w-16 h-8 bg-gray-200 rounded"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
          <Settings className="h-12 w-12 text-gray-400" />
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">No hay unidades de servicio registradas</h3>
        <p className="text-gray-500 mb-4">Comienza agregando tu primera unidad de servicio</p>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-2"
    >
      <AnimatePresence mode="popLayout">
        {data.map((unidad) => (
          <motion.div
            key={unidad.id}
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            layout
          >
            <Card className="transition-all duration-200 hover:shadow-md border-l-4 border-l-green-500">
              <CardContent className="p-3">
                {editingId === unidad.id ? (
                  // Edit mode
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSaveEdit)} className="space-y-4">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-green-100 rounded-md">
                          <Settings className="h-3 w-3 text-green-600" />
                        </div>
                        <FormField
                          control={form.control}
                          name="nombre"
                          render={({ field }) => (
                            <FormItem className="flex-1">
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Nombre de la unidad de servicio"
                                  className="text-sm h-8"
                                  autoFocus
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <div className="flex items-center gap-2 pt-1">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isUpdating}
                          className="bg-green-600 hover:bg-green-700 h-7 px-2 text-xs"
                        >
                          {isUpdating ? (
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
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleCancelEdit}
                          disabled={isUpdating}
                          className="h-7 px-2 text-xs"
                        >
                          <X className="h-3 w-3 mr-1" />
                          Cancelar
                        </Button>
                      </div>
                    </form>
                  </Form>
                ) : (
                  // View mode
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-100 rounded-md">
                        <Settings className="h-3 w-3 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900 text-sm">{unidad.nombre}</h3>
                        <p className="text-xs text-gray-500">ID: {unidad.id}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                        Activa
                      </Badge>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(unidad)}
                        className="h-7 px-1.5"
                      >
                        <Edit3 className="h-3 w-3" />
                      </Button>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-1.5 text-red-600 hover:text-red-700 hover:bg-red-50"
                            disabled={isDeleting === unidad.id}
                          >
                            {isDeleting === unidad.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Trash2 className="h-3 w-3" />
                            )}
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>¿Eliminar unidad de servicio?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción no se puede deshacer. La unidad de servicio "{unidad.nombre}" será eliminada permanentemente.
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
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
