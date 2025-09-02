// ===================================================
// 📁 Archivo: ProductosClient.tsx
// 📌 Ubicación: src/app/catalogo/productos/
// 🔧 Descripción: Componente cliente para gestión de productos
// 🎨 Mejoras UX/UI: Modal, Estados, Animaciones
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import type { Producto } from '@prisma/client'
import { ProductoList, ProductoForm } from '@/components/catalogo/productos'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { 
  Plus,
  Eye,
  Edit,
  Trash2,
  AlertTriangle
} from 'lucide-react'

// 📋 Props del componente
interface ProductosClientProps {
  userRole: string
}

// 🎨 Variantes de animación
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1
    }
  }
}

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
}

/**
 * 🎯 Componente ProductosClient
 * Maneja toda la lógica del lado del cliente para productos
 */
export default function ProductosClient({ userRole }: ProductosClientProps) {
  const router = useRouter()
  
  // 🔄 Estados del componente
  const [selectedProducto, setSelectedProducto] = useState<Producto | null>(null)
  const [formMode, setFormMode] = useState<'create' | 'edit' | 'view'>('create')
  const [showForm, setShowForm] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [productoToDelete, setProductoToDelete] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  // ✅ Verificar permisos
  const canCreate = ['Admin', 'Gerente', 'Logistica'].includes(userRole)
  const canEdit = ['Admin', 'Gerente', 'Logistica'].includes(userRole)
  const canDelete = ['Admin', 'Gerente'].includes(userRole)
  const canView = true // Todos pueden ver

  // 🆕 Manejar creación
  const handleCreate = () => {
    setSelectedProducto(null)
    setFormMode('create')
    setShowForm(true)
  }

  // 👁️ Manejar visualización
  const handleView = (producto: Producto) => {
    router.push(`/catalogo/productos/${producto.id}`)
  }

  // ✏️ Manejar edición
  const handleEdit = (producto: Producto) => {
    if (!canEdit) {
      toast.error('No tienes permisos para editar productos')
      return
    }
    
    setSelectedProducto(producto)
    setFormMode('edit')
    setShowForm(true)
  }

  // 🗑️ Manejar eliminación
  const handleDelete = (id: string) => {
    if (!canDelete) {
      toast.error('No tienes permisos para eliminar productos')
      return
    }
    
    setProductoToDelete(id)
    setShowDeleteDialog(true)
  }

  // ✅ Confirmar eliminación
  const confirmDelete = async () => {
    if (!productoToDelete) return
    
    try {
      const response = await fetch(`/api/catalogo/productos/${productoToDelete}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al eliminar producto')
      }
      
      toast.success('Producto eliminado exitosamente')
      setRefreshKey(prev => prev + 1) // Forzar actualización de la lista
    } catch (error: any) {
      console.error('Error eliminando producto:', error)
      toast.error(error.message || 'Error al eliminar producto')
    } finally {
      setShowDeleteDialog(false)
      setProductoToDelete(null)
    }
  }

  // 💾 Manejar éxito del formulario
  const handleFormSuccess = (producto: Producto) => {
    setShowForm(false)
    setSelectedProducto(null)
    setRefreshKey(prev => prev + 1) // Forzar actualización de la lista
    
    if (formMode === 'create') {
      toast.success('Producto creado exitosamente')
    } else {
      toast.success('Producto actualizado exitosamente')
    }
  }

  // ❌ Manejar cancelación del formulario
  const handleFormCancel = () => {
    setShowForm(false)
    setSelectedProducto(null)
  }

  // 🎨 Renderizado
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* 🚀 Acciones principales */}
      <motion.div variants={cardVariants}>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold mb-2">Acciones Rápidas</h2>
                <p className="text-sm text-muted-foreground">
                  Gestiona los productos del catálogo del sistema
                </p>
              </div>
              
              <div className="flex gap-2">
                {canCreate && (
                  <Button onClick={handleCreate} className="flex items-center gap-2">
                    <Plus className="h-4 w-4" />
                    Nuevo Producto
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 📋 Lista de productos */}
      <motion.div variants={cardVariants}>
        <ProductoList
          key={refreshKey} // Forzar re-render cuando cambie
          onView={canView ? handleView : undefined}
          onEdit={canEdit ? handleEdit : undefined}
          onDelete={canDelete ? handleDelete : undefined}
          showActions={canView || canEdit || canDelete}
        />
      </motion.div>

      {/* 📝 Modal de formulario */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {formMode === 'create' ? 'Nuevo Producto' : 
               formMode === 'edit' ? 'Editar Producto' : 'Ver Producto'}
            </DialogTitle>
          </DialogHeader>
          
          <ProductoForm
            producto={selectedProducto || undefined}
            mode={formMode === 'view' ? 'edit' : formMode}
            onSuccess={handleFormSuccess}
            onCancel={handleFormCancel}
          />
        </DialogContent>
      </Dialog>

      {/* 🗑️ Dialog de confirmación de eliminación */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              Confirmar Eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar este producto? Esta acción no se puede deshacer y puede afectar otros registros relacionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}