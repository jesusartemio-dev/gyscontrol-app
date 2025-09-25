// ===================================================
// 📁 Archivo: ProveedorTableView.tsx
// 📌 Ubicación: src/components/logistica/ProveedorTableView.tsx
// 🔧 Descripción: Vista de tabla para proveedores con funcionalidades avanzadas
// 🧠 Uso: Tabla responsive con filtros, ordenamiento y acciones
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { deleteProveedor } from '@/lib/services/proveedor'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import ConfirmDialog from '@/components/ConfirmDialog'
import {
  Building2,
  Hash,
  Edit,
  Trash2,
  Phone,
  Mail,
  MapPin
} from 'lucide-react'
import { toast } from 'sonner'
import type { Proveedor } from '@/types'

interface Props {
  proveedores: Proveedor[]
  onDeleted: (id: string) => void
  onEdit: (proveedor: Proveedor) => void
  loading?: boolean
}

export default function ProveedorTableView({ proveedores, onDeleted, onEdit, loading = false }: Props) {
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

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-16 bg-gray-200 rounded"></div>
          </div>
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
        <Building2 className="mx-auto h-12 w-12 text-gray-400 mb-4" />
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="space-y-4"
    >
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[250px]">Nombre</TableHead>
              <TableHead>RUC</TableHead>
              <TableHead>Contacto</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {proveedores.map((proveedor) => (
              <TableRow key={proveedor.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-600" />
                    <span className="truncate max-w-[200px]" title={proveedor.nombre}>
                      {proveedor.nombre}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  {proveedor.ruc ? (
                    <Badge variant="secondary" className="font-mono">
                      {proveedor.ruc}
                    </Badge>
                  ) : (
                    <span className="text-gray-400 text-sm">Sin RUC</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="space-y-1">
                    {proveedor.telefono && (
                      <div className="flex items-center gap-1 text-sm">
                        <Phone className="h-3 w-3 text-gray-500" />
                        <span>{proveedor.telefono}</span>
                      </div>
                    )}
                    {proveedor.correo && (
                      <div className="flex items-center gap-1 text-sm">
                        <Mail className="h-3 w-3 text-gray-500" />
                        <a
                          href={`mailto:${proveedor.correo}`}
                          className="text-blue-600 hover:text-blue-800 underline truncate max-w-[150px]"
                          title={proveedor.correo}
                        >
                          {proveedor.correo}
                        </a>
                      </div>
                    )}
                    {!proveedor.telefono && !proveedor.correo && (
                      <span className="text-gray-400 text-sm">Sin contacto</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  {proveedor.direccion ? (
                    <div className="flex items-start gap-1 text-sm max-w-[200px]">
                      <MapPin className="h-3 w-3 text-gray-500 mt-0.5 flex-shrink-0" />
                      <span className="truncate" title={proveedor.direccion}>
                        {proveedor.direccion}
                      </span>
                    </div>
                  ) : (
                    <span className="text-gray-400 text-sm">Sin dirección</span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
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
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

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
