// ===================================================
// 📁 Archivo: RecursoList.tsx
// 📌 Ubicación: src/components/catalogo/
// 🔧 Descripción: Lista editable de recursos con UX/UI mejorada
//
// 🎨 Mejoras aplicadas:
// - Framer Motion animations
// - Shadcn/UI components (Card, Badge, Separator)
// - Loading states y skeleton loaders
// - Formateo de moneda profesional
// - Estados vacíos informativos
// - Responsive design
// - Iconografía descriptiva
//
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-01-20
// ===================================================

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Recurso } from '@/types'
import { deleteRecurso, updateRecurso } from '@/lib/services/recurso'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Edit, 
  Trash2, 
  Save, 
  X, 
  DollarSign, 
  Clock, 
  Package,
  AlertCircle,
  Loader2
} from 'lucide-react'
import { toast } from 'react-hot-toast'

// Animation variants for Framer Motion
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

interface Props {
  data?: Recurso[]
  onUpdate?: (r: Recurso) => void
  onDelete?: (id: string) => void
  loading?: boolean
  error?: string | null
}

// Currency formatter
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2
  }).format(amount)
}

export default function RecursoList({ data, onUpdate, onDelete, loading = false, error = null }: Props) {
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

  // Loading skeleton component
  const SkeletonLoader = () => (
    <div className="space-y-3">
      {[...Array(3)].map((_, i) => (
        <Card key={i} className="animate-pulse">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                  <div className="h-3 bg-gray-200 rounded w-24"></div>
                </div>
              </div>
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

  // Empty state component
  const EmptyState = () => (
    <Card className="text-center py-12">
      <CardContent>
        <Package className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay recursos disponibles
        </h3>
        <p className="text-gray-500 mb-4">
          Los recursos que agregues aparecerán aquí para su gestión.
        </p>
      </CardContent>
    </Card>
  )

  return (
    <div className="space-y-4">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-blue-100 rounded-md">
            <Package className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Gestión de Recursos
            </h2>
            <p className="text-xs text-gray-500">
              {data?.length || 0} recursos disponibles
            </p>
          </div>
        </div>
        
        {data && data.length > 0 && (
          <Badge variant="secondary" className="px-2 py-0.5 text-xs">
            <Clock className="h-3 w-3 mr-1" />
            Total: {formatCurrency(data.reduce((sum, r) => sum + r.costoHora, 0))}/hora
          </Badge>
        )}
      </div>

      <Separator className="my-3" />

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading ? (
        <SkeletonLoader />
      ) : (
        /* Content */
        <AnimatePresence mode="wait">
          {!data || data.length === 0 ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
            >
              <EmptyState />
            </motion.div>
          ) : (
            <motion.div
               key="list"
               variants={containerVariants}
               initial="hidden"
               animate="visible"
               className="space-y-2"
             >
               {data.map((recurso) => (
                 <motion.div
                   key={recurso.id}
                   variants={itemVariants}
                   layout
                 >
                   <Card className="hover:shadow-md transition-shadow duration-200">
                     <CardContent className="p-3">
                      {editando === recurso.id ? (
                         /* Edit Mode */
                         <div className="space-y-3">
                           <div className="flex items-center space-x-2 mb-2">
                             <Edit className="h-3 w-3 text-blue-600" />
                             <span className="text-xs font-medium text-blue-600">
                               Editando recurso
                             </span>
                           </div>
                           
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
                        /* View Mode */
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="p-1.5 bg-gray-100 rounded-md">
                              <Package className="h-3 w-3 text-gray-600" />
                            </div>
                            <div>
                              <h3 className="font-medium text-gray-900 text-sm">
                                {recurso.nombre}
                              </h3>
                              <div className="flex items-center space-x-1 mt-0.5">
                                <DollarSign className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  {formatCurrency(recurso.costoHora)} por hora
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => iniciarEdicion(recurso)}
                              disabled={editando !== null || eliminando !== null}
                              className="h-7 px-2 text-xs"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Editar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => eliminar(recurso.id)}
                              disabled={editando !== null || eliminando === recurso.id}
                              className="h-7 px-2 text-xs"
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
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  )
}
