// ===================================================
// 📁 Archivo: PedidoEquipoAccordion.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Accordion para mostrar pedidos de equipo con UX/UI mejorada
// 🎨 Mejoras aplicadas: Framer Motion, mejor diseño, animaciones, estados visuales
// ✍️ Autor: Jesús Artemio + IA GYS
// 📅 Última actualización: 2025-01-27
// ===================================================

'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  PedidoEquipo,
  PedidoEquipoItemUpdatePayload,
  PedidoEquipoUpdatePayload,
  PedidoEquipoItemPayload,
  ListaEquipoItem,
} from '@/types'

import { format } from 'date-fns'

// Helper function for date formatting
const formatDate = (date: string | Date) => {
  return format(new Date(date), 'dd/MM/yyyy')
}
import {
  ChevronDown,
  ChevronUp,
  Pencil,
  Trash2,
  PlusCircle,
  Calendar,
  User,
  FileText,
  Package,
  DollarSign,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

import PedidoEquipoItemList from './PedidoEquipoItemList'
import PedidoEquipoItemModalAgregar from './PedidoEquipoItemModalAgregar'

interface Props {
  pedido: PedidoEquipo
  responsableId: string
  onUpdateItem?: (id: string, payload: PedidoEquipoItemUpdatePayload) => void
  onDeleteItem?: (id: string) => void
  onUpdate?: (id: string, payload: PedidoEquipoUpdatePayload) => void
  onDelete?: (id: string) => void
  onCreateItem?: (payload: PedidoEquipoItemPayload) => Promise<void>
  onRefresh?: () => Promise<void>
}

export default function PedidoEquipoAccordion({
  pedido,
  responsableId,
  onUpdateItem,
  onDeleteItem,
  onUpdate,
  onDelete,
  onCreateItem,
  onRefresh,
}: Props) {
  const [expanded, setExpanded] = useState(false)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const lista = pedido.lista

  const itemsDisponibles: ListaEquipoItem[] = lista?.items?.length
    ? lista.items.filter(
        (item) => item.cantidad - (item.cantidadPedida || 0) > 0
      )
    : []

  const totalPedido = pedido.items?.reduce(
    (total, item) => total + (item.costoTotal || 0),
    0
  ) || 0

  // Calcular estadísticas del pedido
  const totalItems = pedido.items?.length || 0
  const itemsCompletos = pedido.items?.filter(item => 
    (item.cantidadAtendida || 0) >= (item.cantidadPedida || 0)
  ).length || 0
  const progreso = totalItems > 0 ? (itemsCompletos / totalItems) * 100 : 0

  const handleCreateItem = async (payload: PedidoEquipoItemPayload) => {
    try {
      setLoading(true)
      await onCreateItem?.(payload)
      setMostrarModal(false)
    } catch (error) {
      console.error('Error creating item:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = () => {
    if (progreso === 100) return 'bg-green-100 text-green-800 border-green-200'
    if (progreso > 0) return 'bg-yellow-100 text-yellow-800 border-yellow-200'
    return 'bg-gray-100 text-gray-800 border-gray-200'
  }

  const getStatusText = () => {
    if (progreso === 100) return 'Completado'
    if (progreso > 0) return 'En Progreso'
    return 'Pendiente'
  }

  const getStatusIcon = () => {
    if (progreso === 100) return <CheckCircle2 className="w-4 h-4" />
    if (progreso > 0) return <Clock className="w-4 h-4" />
    return <AlertCircle className="w-4 h-4" />
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mb-6"
    >
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
        {/* Encabezado del acordeón */}
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div
              onClick={() => setExpanded(!expanded)}
              className="flex items-center space-x-3 cursor-pointer flex-1"
            >
              <motion.div
                animate={{ rotate: expanded ? 90 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown className="h-5 w-5 text-gray-500" />
              </motion.div>
              <div className="text-left flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="font-bold text-xl text-gray-900">
                    Pedido #{pedido.codigo || pedido.id.slice(-8)}
                  </h3>
                  <Badge className={getStatusColor()}>
                    {getStatusIcon()}
                    <span className="ml-1">{getStatusText()}</span>
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <FileText className="w-4 h-4" />
                    <span>{lista?.nombre || 'Lista no encontrada'}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(pedido.fechaNecesaria)}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Package className="w-4 h-4" />
                    <span>{totalItems} items</span>
                  </div>
                  <div className="flex items-center gap-1 text-green-600 font-medium">
                    <DollarSign className="w-4 h-4" />
                    <span>${totalPedido.toLocaleString('es-AR', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="flex items-center space-x-2">
              {onCreateItem && lista && lista.items?.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setMostrarModal(true)}
                  disabled={loading}
                  className="text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                  title="Agregar ítem al pedido"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <PlusCircle className="h-4 w-4 mr-1" />
                  )}
                  Agregar Item
                </Button>
              )}
              {onUpdate && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onUpdate(pedido.id, {})}
                  disabled={loading}
                  className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200"
                  title="Editar pedido"
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onDelete(pedido.id)}
                  disabled={loading}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  title="Eliminar pedido"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          {totalItems > 0 && (
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
                <span>Progreso del pedido</span>
                <span>{itemsCompletos}/{totalItems} items completados</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progreso}%` }}
                  transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                />
              </div>
            </div>
          )}
        </CardHeader>

        {/* Contenido expandido del acordeón */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <CardContent className="pt-0">
                <Separator className="mb-6" />
                
                {/* Order Details */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-blue-900">Lista Técnica</span>
                    </div>
                    <p className="text-sm text-blue-800">
                      {lista?.nombre || 'No especificada'}
                    </p>
                  </div>
                  
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-green-900">Fecha Necesaria</span>
                    </div>
                    <p className="text-sm text-green-800">
                      {formatDate(pedido.fechaNecesaria)}
                    </p>
                  </div>
                  
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="flex items-center gap-2 mb-2">
                      <User className="w-5 h-5 text-purple-600" />
                      <span className="font-medium text-purple-900">Estado</span>
                    </div>
                    <p className="text-sm text-purple-800">
                      {pedido.estado || 'Pendiente'}
                    </p>
                  </div>
                  
                  <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                    <div className="flex items-center gap-2 mb-2">
                      <DollarSign className="w-5 h-5 text-yellow-600" />
                      <span className="font-medium text-yellow-900">Total Estimado</span>
                    </div>
                    <p className="text-lg font-bold text-yellow-800">
                      ${totalPedido.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>

                {/* Fechas adicionales */}
                {(pedido.fechaEntregaEstimada || pedido.fechaEntregaReal) && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {pedido.fechaEntregaEstimada && (
                      <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                        <div className="flex items-center gap-2 mb-2">
                          <Clock className="w-5 h-5 text-orange-600" />
                          <span className="font-medium text-orange-900">Entrega Estimada</span>
                        </div>
                        <p className="text-sm text-orange-800">
                          {formatDate(pedido.fechaEntregaEstimada)}
                        </p>
                      </div>
                    )}
                    {pedido.fechaEntregaReal && (
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                        <div className="flex items-center gap-2 mb-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span className="font-medium text-green-900">Entregado</span>
                        </div>
                        <p className="text-sm text-green-800">
                          {formatDate(pedido.fechaEntregaReal)}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Observaciones */}
                {pedido.observacion && (
                  <div className="bg-gray-50 p-4 rounded-lg border mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <span className="font-medium text-gray-900">Observaciones</span>
                    </div>
                    <p className="text-sm text-gray-700">{pedido.observacion}</p>
                  </div>
                )}

                {/* Items List */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Items del Pedido
                    </h4>
                    <Badge variant="outline" className="bg-gray-100 text-gray-700">
                      {totalItems} items
                    </Badge>
                  </div>
                  
                  <PedidoEquipoItemList
                    items={pedido.items}
                    onUpdate={onUpdateItem}
                    onDelete={onDeleteItem}
                  />
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Modal de agregar ítems */}
      {lista && onCreateItem && (
        <PedidoEquipoItemModalAgregar
          open={mostrarModal}
          onClose={() => setMostrarModal(false)}
          pedidoId={pedido.id}
          responsableId={responsableId}
          items={lista.items || []}
          onCreateItem={handleCreateItem}
          onRefresh={onRefresh}
        />
      )}
    </motion.div>
  )
}
