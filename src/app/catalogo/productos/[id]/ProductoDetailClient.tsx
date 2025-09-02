// ===================================================
// 📁 Archivo: ProductoDetailClient.tsx
// 📌 Ubicación: src/app/catalogo/productos/[id]/
// 🔧 Descripción: Componente cliente para detalle de producto
// 🎨 Mejoras UX/UI: Cards informativas, Estados, Animaciones
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import type { Producto } from '@prisma/client'
import { ProductoForm } from '@/components/catalogo/productos'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
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
  Edit,
  Trash2,
  ArrowLeft,
  DollarSign,
  Tag,
  Ruler,
  FileText,
  Calendar,
  User,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Hash
} from 'lucide-react'

// 📋 Props del componente
interface ProductoDetailClientProps {
  producto: Producto
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
 * 🎯 Componente ProductoDetailClient
 * Maneja la visualización detallada de un producto
 */
export default function ProductoDetailClient({ 
  producto: initialProducto, 
  userRole 
}: ProductoDetailClientProps) {
  const router = useRouter()
  
  // 🔄 Estados del componente
  const [producto, setProducto] = useState(initialProducto)
  const [showEditForm, setShowEditForm] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [loading, setLoading] = useState(false)

  // ✅ Verificar permisos
  const canEdit = ['Admin', 'Gerente', 'Logistica'].includes(userRole)
  const canDelete = ['Admin', 'Gerente'].includes(userRole)

  // 🔙 Volver a la lista
  const handleBack = () => {
    router.push('/catalogo/productos')
  }

  // ✏️ Manejar edición
  const handleEdit = () => {
    if (!canEdit) {
      toast.error('No tienes permisos para editar productos')
      return
    }
    setShowEditForm(true)
  }

  // 🗑️ Manejar eliminación
  const handleDelete = () => {
    if (!canDelete) {
      toast.error('No tienes permisos para eliminar productos')
      return
    }
    setShowDeleteDialog(true)
  }

  // ✅ Confirmar eliminación
  const confirmDelete = async () => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/catalogo/productos/${producto.id}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Error al eliminar producto')
      }
      
      toast.success('Producto eliminado exitosamente')
      router.push('/catalogo/productos')
    } catch (error: any) {
      console.error('Error eliminando producto:', error)
      toast.error(error.message || 'Error al eliminar producto')
    } finally {
      setLoading(false)
      setShowDeleteDialog(false)
    }
  }

  // 💾 Manejar éxito de edición
  const handleEditSuccess = (updatedProducto: Producto) => {
    setProducto(updatedProducto)
    setShowEditForm(false)
    toast.success('Producto actualizado exitosamente')
  }

  // ❌ Manejar cancelación de edición
  const handleEditCancel = () => {
    setShowEditForm(false)
  }

  // 🎨 Obtener badge de estado
  const getEstadoBadge = (activo: boolean) => {
    return activo ? (
      <Badge variant="default" className="bg-green-100 text-green-800">
        <CheckCircle className="h-3 w-3 mr-1" />
        Activo
      </Badge>
    ) : (
      <Badge variant="secondary" className="bg-red-100 text-red-800">
        <XCircle className="h-3 w-3 mr-1" />
        Inactivo
      </Badge>
    )
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
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Volver a Productos
              </Button>
              
              <div className="flex gap-2">
                {canEdit && (
                  <Button
                    onClick={handleEdit}
                    className="flex items-center gap-2"
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                )}
                
                {canDelete && (
                  <Button
                    variant="destructive"
                    onClick={handleDelete}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Eliminar
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* 📊 Información principal */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 📝 Información básica */}
        <motion.div variants={cardVariants} className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Información Básica
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 🔢 Código y nombre */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Hash className="h-4 w-4" />
                    Código
                  </label>
                  <p className="font-mono text-lg bg-muted p-3 rounded-md">
                    {producto.codigo}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nombre</label>
                  <p className="text-lg font-semibold bg-muted p-3 rounded-md">
                    {producto.nombre}
                  </p>
                </div>
              </div>

              {/* 📄 Descripción */}
              {producto.descripcion && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descripción</label>
                  <p className="text-muted-foreground bg-muted p-3 rounded-md leading-relaxed">
                    {producto.descripcion}
                  </p>
                </div>
              )}

              {/* 📊 Clasificación */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Tag className="h-4 w-4" />
                    Categoría
                  </label>
                  <Badge variant="outline" className="text-sm p-2">
                    {producto.categoria}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Precio
                  </label>
                  <p className="text-xl font-bold text-green-600">
                    S/ {producto.precio.toFixed(2)}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Ruler className="h-4 w-4" />
                    Unidad
                  </label>
                  <Badge variant="secondary" className="text-sm p-2">
                    {producto.unidad}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* ⚙️ Estado y metadatos */}
        <motion.div variants={cardVariants}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5" />
                Estado y Metadatos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* ✅ Estado */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Estado</label>
                <div>{getEstadoBadge(producto.activo)}</div>
              </div>

              <Separator />

              {/* 📅 Fechas */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Fecha de Creación
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(producto.creadoEn).toLocaleDateString('es-PE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Última Actualización
                  </label>
                  <p className="text-sm text-muted-foreground">
                    {new Date(producto.actualizadoEn).toLocaleDateString('es-PE', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* 📝 Modal de edición */}
      <Dialog open={showEditForm} onOpenChange={setShowEditForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Producto</DialogTitle>
          </DialogHeader>
          
          <ProductoForm
            producto={producto}
            mode="edit"
            onSuccess={handleEditSuccess}
            onCancel={handleEditCancel}
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
              ¿Estás seguro de que deseas eliminar el producto <strong>{producto.nombre}</strong>? 
              Esta acción no se puede deshacer y puede afectar otros registros relacionados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Eliminando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Trash2 className="h-4 w-4" />
                  Eliminar
                </div>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  )
}