// ===================================================
// 📁 Archivo: ProveedorList.tsx
// 📌 Ubicación: src/components/logistica/ProveedorList.tsx
// 🔧 Descripción: Lista moderna de proveedores con cards profesionales
// 🧠 Uso: Cards con animaciones, estados vacíos y acciones mejoradas
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { deleteProveedor } from '@/lib/services/proveedor'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Building2, 
  Hash, 
  Edit, 
  Trash2, 
  Users
} from 'lucide-react'
import { toast } from 'sonner'
import type { Proveedor } from '@/types'

interface Props {
  proveedores: Proveedor[]
  onDeleted: (id: string) => void
  onEdit: (proveedor: Proveedor) => void
  loading?: boolean
}

export default function ProveedorList({ proveedores, onDeleted, onEdit, loading = false }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = async (proveedor: Proveedor) => {
    if (!confirm(`¿Estás seguro de eliminar a ${proveedor.nombre}?`)) {
      return
    }

    setDeletingId(proveedor.id)
    try {
      await deleteProveedor(proveedor.id)
      onDeleted(proveedor.id)
      toast.success(`Proveedor ${proveedor.nombre} eliminado correctamente`)
    } catch (error) {
      toast.error('Error al eliminar el proveedor')
    } finally {
      setDeletingId(null)
    }
  }

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
    visible: { opacity: 1, y: 0 }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (proveedores.length === 0) {
    return (
      <motion.div 
        className="text-center py-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay proveedores registrados
        </h3>
        <p className="text-gray-500">
          Comienza agregando tu primer proveedor usando el formulario de arriba.
        </p>
      </motion.div>
    )
  }

  return (
    <motion.div 
      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence>
        {proveedores.map((proveedor) => (
          <motion.div
            key={proveedor.id}
            variants={itemVariants}
            layout
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="h-full hover:shadow-lg transition-shadow duration-200">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  <span className="truncate">{proveedor.nombre}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* RUC */}
                {proveedor.ruc && (
                  <div className="flex items-center gap-2 text-sm">
                    <Hash className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">RUC:</span>
                    <Badge variant="secondary" className="font-mono">
                      {proveedor.ruc}
                    </Badge>
                  </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(proveedor)}
                    className="flex items-center gap-1"
                  >
                    <Edit className="h-3 w-3" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(proveedor)}
                    disabled={deletingId === proveedor.id}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    {deletingId === proveedor.id ? 'Eliminando...' : 'Eliminar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  )
}
