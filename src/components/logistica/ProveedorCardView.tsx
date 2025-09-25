// ===================================================
// 📁 Archivo: ProveedorCardView.tsx
// 📌 Ubicación: src/components/logistica/ProveedorCardView.tsx
// 🔧 Descripción: Vista de cards para proveedores con animaciones
// 🧠 Uso: Cards profesionales con información completa de proveedores
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
import ConfirmDialog from '@/components/ConfirmDialog'
import {
  Building2,
  Hash,
  Edit,
  Trash2,
  Users,
  MapPin,
  Phone,
  Mail
} from 'lucide-react'
import { toast } from 'sonner'
import type { Proveedor } from '@/types'

interface Props {
  proveedores: Proveedor[]
  onDeleted: (id: string) => void
  onEdit: (proveedor: Proveedor) => void
  loading?: boolean
}

export default function ProveedorCardView({ proveedores, onDeleted, onEdit, loading = false }: Props) {
  // ✅ State for enhanced confirmation dialog
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    proveedor: Proveedor | null
    isDeleting: boolean
  }>({ open: false, proveedor: null, isDeleting: false })

  // 🔁 Enhanced delete handler with confirmation dialog
  const handleDeleteClick = (proveedor: Proveedor) => {
    setDeleteDialog({ open: true, proveedor, isDeleting: false })
  }

  const handleConfirmDelete = async () => {
    if (!deleteDialog.proveedor) return

    setDeleteDialog(prev => ({ ...prev, isDeleting: true }))

    try {
      const success = await deleteProveedor(deleteDialog.proveedor.id)

      if (success) {
        toast.success(`Proveedor "${deleteDialog.proveedor.nombre}" eliminado correctamente`, {
          description: 'El proveedor ha sido removido de la base de datos'
        })
        onDeleted(deleteDialog.proveedor.id)
      } else {
        toast.error('No se pudo eliminar el proveedor', {
          description: 'Inténtalo nuevamente o contacta al administrador'
        })
      }
    } catch (error) {
      console.error('Error deleting proveedor:', error)
      toast.error('Error inesperado al eliminar', {
        description: 'Ocurrió un problema durante la eliminación'
      })
    } finally {
      setDeleteDialog({ open: false, proveedor: null, isDeleting: false })
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
          Comienza agregando tu primer proveedor usando el botón de arriba.
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

                {/* Dirección */}
                {proveedor.direccion && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <div>
                      <span className="text-gray-600">Dirección:</span>
                      <p className="text-gray-800 mt-1">{proveedor.direccion}</p>
                    </div>
                  </div>
                )}

                {/* Teléfono */}
                {proveedor.telefono && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Teléfono:</span>
                    <span className="text-gray-800 font-medium">{proveedor.telefono}</span>
                  </div>
                )}

                {/* Correo */}
                {proveedor.correo && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Correo:</span>
                    <a
                      href={`mailto:${proveedor.correo}`}
                      className="text-blue-600 hover:text-blue-800 underline"
                    >
                      {proveedor.correo}
                    </a>
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
                    onClick={() => handleDeleteClick(proveedor)}
                    disabled={deleteDialog.isDeleting && deleteDialog.proveedor?.id === proveedor.id}
                    className="flex items-center gap-1"
                  >
                    <Trash2 className="h-3 w-3" />
                    {deleteDialog.isDeleting && deleteDialog.proveedor?.id === proveedor.id ? 'Eliminando...' : 'Eliminar'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 📡 Enhanced Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.open}
        onOpenChange={(open) => !deleteDialog.isDeleting && setDeleteDialog(prev => ({ ...prev, open }))}
        title="Confirmar eliminación de proveedor"
        description={
          deleteDialog.proveedor ? (
            <div className="space-y-3">
              <div className="text-sm text-gray-600">
                ¿Estás seguro de que deseas eliminar este proveedor? Esta acción no se puede deshacer.
              </div>
              <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  <span className="font-medium text-gray-900">{deleteDialog.proveedor.nombre}</span>
                </div>
                {deleteDialog.proveedor.ruc && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Hash className="h-3 w-3" />
                    <span className="font-mono">{deleteDialog.proveedor.ruc}</span>
                  </div>
                )}
                {deleteDialog.proveedor.telefono && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="h-3 w-3" />
                    <span>{deleteDialog.proveedor.telefono}</span>
                  </div>
                )}
                {deleteDialog.proveedor.correo && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="h-3 w-3" />
                    <span className="break-all">{deleteDialog.proveedor.correo}</span>
                  </div>
                )}
              </div>
            </div>
          ) : ''
        }
        onConfirm={handleConfirmDelete}
        confirmText={deleteDialog.isDeleting ? 'Eliminando...' : 'Eliminar proveedor'}
        cancelText="Cancelar"
        variant="destructive"
        disabled={deleteDialog.isDeleting}
      />
    </motion.div>
  )
}
