'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { deleteCliente } from '@/lib/services/cliente'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import ConfirmDialog from '@/components/ConfirmDialog'
import { 
  Building2, 
  FileText, 
  MapPin, 
  Phone, 
  Mail, 
  Edit, 
  Trash2, 
  Users,
  AlertTriangle
} from 'lucide-react'
import { toast } from 'react-hot-toast'
import type { Cliente } from '@/types'

interface Props {
  clientes: Cliente[]
  onDeleted: (id: string) => void
  onEdit: (cliente: Cliente) => void
  loading?: boolean
}

export default function ClienteList({ clientes, onDeleted, onEdit, loading }: Props) {
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    cliente: Cliente | null
  }>({ open: false, cliente: null })

  const handleDeleteClick = (cliente: Cliente) => {
    setConfirmDialog({ open: true, cliente })
  }

  const handleConfirmDelete = async () => {
    const cliente = confirmDialog.cliente
    if (!cliente) return

    setConfirmDialog({ open: false, cliente: null })
    setDeletingId(cliente.id)
    
    const result = await deleteCliente(cliente.id)
    
    if (result.success) {
      onDeleted(cliente.id)
      toast.success(`Cliente ${cliente.nombre} eliminado correctamente`, {
        duration: 4000,
        icon: '✅'
      })
    } else {
      // 🚫 Mostrar mensaje específico para clientes con proyectos
      if (result.error?.includes('proyectos asociados')) {
        toast.error(`${result.error}\n${result.details || 'Para eliminar este cliente, primero debe finalizar o reasignar sus proyectos.'}`, {
          duration: 8000,
          id: `delete-error-${cliente.id}`,
          style: {
            maxWidth: '450px',
            whiteSpace: 'pre-line'
          },
          icon: '⚠️'
        })
      } else {
        toast.error(result.error || 'Error al eliminar el cliente', {
          icon: '❌'
        })
      }
    }
    
    setDeletingId(null)
  }

  const handleCancelDelete = () => {
    setConfirmDialog({ open: false, cliente: null })
  }

  // ✅ Generate detailed confirmation message
  const getConfirmationMessage = (cliente: Cliente) => {
    const details = []
    if (cliente.ruc) details.push(`RUC: ${cliente.ruc}`)
    if (cliente.telefono) details.push(`Teléfono: ${cliente.telefono}`)
    if (cliente.correo) details.push(`Email: ${cliente.correo}`)
    
    const baseMessage = `Se eliminará permanentemente el cliente "${cliente.nombre}"`
    const detailsText = details.length > 0 ? `\n\nDetalles del cliente:\n• ${details.join('\n• ')}` : ''
    const warningText = '\n\n⚠️ Esta acción no se puede deshacer. Si el cliente tiene proyectos asociados, la eliminación fallará.'
    
    return baseMessage + detailsText + warningText
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

  if (clientes.length === 0) {
    return (
      <motion.div 
        className="text-center py-12"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          No hay clientes registrados
        </h3>
        <p className="text-gray-500">
          Comienza agregando tu primer cliente usando el formulario de arriba.
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
        {clientes.map((cliente) => (
          <motion.div
            key={cliente.id}
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
                  <span className="truncate">{cliente.nombre}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* RUC */}
                {cliente.ruc && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">RUC:</span>
                    <Badge variant="secondary" className="font-mono">
                      {cliente.ruc}
                    </Badge>
                  </div>
                )}

                {/* Dirección */}
                {cliente.direccion && (
                  <div className="flex items-start gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-gray-500 mt-0.5" />
                    <span className="text-gray-600 min-w-fit">Dirección:</span>
                    <span className="text-gray-800 text-right flex-1">
                      {cliente.direccion}
                    </span>
                  </div>
                )}

                {/* Teléfono */}
                {cliente.telefono && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Teléfono:</span>
                    <span className="text-gray-800 font-medium">
                      {cliente.telefono}
                    </span>
                  </div>
                )}

                {/* Correo */}
                {cliente.correo && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-gray-500" />
                    <span className="text-gray-600">Correo:</span>
                    <span className="text-blue-600 font-medium truncate">
                      {cliente.correo}
                    </span>
                  </div>
                )}

                {/* Status Badges */}
                <div className="flex gap-2 pt-2">
                  {cliente.ruc && (
                    <Badge variant="outline" className="text-xs">
                      Con RUC
                    </Badge>
                  )}
                  {cliente.correo && (
                    <Badge variant="outline" className="text-xs">
                      Con Email
                    </Badge>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(cliente)}
                    className="flex-1"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteClick(cliente)}
                    disabled={deletingId === cliente.id}
                    className="flex-1"
                  >
                    {deletingId === cliente.id ? (
                      <>
                        <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Eliminando...
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* ✅ Enhanced Confirmation Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={(open) => {
          if (!open) handleCancelDelete()
        }}
        title="Confirmar Eliminación"
        description={confirmDialog.cliente ? getConfirmationMessage(confirmDialog.cliente) : ''}
        onConfirm={handleConfirmDelete}
        confirmText="Eliminar Cliente"
        cancelText="Cancelar"
        variant="destructive"
      />
    </motion.div>
  )
}
