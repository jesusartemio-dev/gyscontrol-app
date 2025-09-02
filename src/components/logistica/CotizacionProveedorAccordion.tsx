'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CotizacionProveedor,
  CotizacionProveedorItem,
  CotizacionProveedorUpdatePayload,
  EstadoCotizacionProveedor,
} from '@/types'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { 
  Pencil, 
  Trash2, 
  Plus, 
  Building2, 
  FileText, 
  Calendar,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Send,
  CheckCircle2,
  DollarSign,
  Loader2
} from 'lucide-react'
import { LoadingState, ErrorState, EmptyState, StatusBadge } from '@/components/ui/visual-states'
import { toast } from 'sonner'

import CotizacionEnviarCorreoButton from './CotizacionEnviarCorreoButton'
import CotizacionProveedorTabla from './CotizacionProveedorTabla'
import ModalAgregarItemCotizacionProveedor from './ModalAgregarItemCotizacionProveedor'
import { getCotizacionProveedorById } from '@/lib/services/cotizacionProveedor'

interface Props {
  cotizacion: CotizacionProveedor
  onUpdate?: (id: string, payload: CotizacionProveedorUpdatePayload) => void
  onDelete?: (id: string) => void
  onUpdatedItem?: () => void
  onEstadoUpdated?: (cotizacionId: string, nuevoEstado: EstadoCotizacionProveedor) => void // ✅ Nueva prop para actualización local de estado
}

const ESTADOS: EstadoCotizacionProveedor[] = [
  'pendiente',
  'solicitado',
  'cotizado',
  'rechazado',
  'seleccionado',
]

// Función para obtener el variant del badge según el estado
const getEstadoBadgeVariant = (estado: string): "default" | "outline" => {
  switch (estado?.toLowerCase()) {
    case 'seleccionado':
    case 'cotizado':
      return 'default'
    case 'pendiente':
    case 'solicitado':
    case 'rechazado':
    default:
      return 'outline'
  }
}

// Función para obtener el color del badge según el estado
const getEstadoBadgeColor = (estado: string): string => {
  switch (estado?.toLowerCase()) {
    case 'pendiente': return 'text-orange-600 border-orange-200 bg-orange-50'
    case 'solicitado': return 'text-blue-600 border-blue-200 bg-blue-50'
    case 'cotizado': return 'text-green-600 border-green-200 bg-green-50'
    case 'rechazado': return 'text-red-600 border-red-200 bg-red-50'
    case 'seleccionado': return 'text-purple-600 border-purple-200 bg-purple-50'
    default: return 'text-gray-600 border-gray-200 bg-gray-50'
  }
}

// Función para obtener el icono según el estado
const getEstadoIcon = (estado: string) => {
  switch (estado?.toLowerCase()) {
    case 'pendiente': return <Clock className="h-3 w-3" />
    case 'solicitado': return <Send className="h-3 w-3" />
    case 'cotizado': return <CheckCircle className="h-3 w-3" />
    case 'rechazado': return <XCircle className="h-3 w-3" />
    case 'seleccionado': return <CheckCircle className="h-3 w-3" />
    default: return <AlertCircle className="h-3 w-3" />
  }
}

// Función para formatear fecha
const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export default function CotizacionProveedorAccordion({
  cotizacion,
  onUpdate,
  onDelete,
  onUpdatedItem,
  onEstadoUpdated,
}: Props) {
  const [cotizacionData, setCotizacionData] = useState(cotizacion)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAgregarItems, setShowAgregarItems] = useState(false)
  const [updatingEstado, setUpdatingEstado] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actionState, setActionState] = useState<'idle' | 'updating' | 'success' | 'error'>('idle')

  useEffect(() => {
    setCotizacionData(cotizacion)
  }, [cotizacion])

  const handleChangeEstado = async (nuevoEstado: EstadoCotizacionProveedor) => {
    if (nuevoEstado === cotizacionData.estado) return
    
    try {
      setActionState('updating')
      setUpdatingEstado(true)
      
      // ✅ Actualizar estado local inmediatamente para mejor UX
      setCotizacionData(prev => ({
        ...prev,
        estado: nuevoEstado
      }))
      
      // ✅ Priorizar actualización local sobre refetch completo
      if (onEstadoUpdated) {
        onEstadoUpdated(cotizacionData.id, nuevoEstado)
      } else if (onUpdate) {
        onUpdate(cotizacionData.id, { estado: nuevoEstado })
      }
      
      setActionState('success')
      toast.success(`✅ Estado actualizado a ${nuevoEstado.toUpperCase()}`)
      
      // Reset success state after animation
      setTimeout(() => {
        setActionState('idle')
      }, 2000)
    } catch (error) {
      console.error('Error updating estado:', error)
      
      // ✅ Revertir cambio local en caso de error
      setCotizacionData(prev => ({
        ...prev,
        estado: cotizacion.estado // Revertir al estado original
      }))
      
      setActionState('error')
      toast.error('❌ Error al actualizar el estado')
      
      // Reset error state after delay
      setTimeout(() => {
        setActionState('idle')
      }, 3000)
    } finally {
      setUpdatingEstado(false)
    }
  }

  const handleRefetch = async () => {
    try {
      const updated = await getCotizacionProveedorById(cotizacion.id)
      if (updated) {
        setCotizacionData(updated)
        onUpdatedItem?.()
      } else {
        console.warn('⚠️ Cotización no encontrada tras refetch.')
      }
    } catch (error) {
      console.error('❌ Error en refetch de cotización:', error)
    }
  }

  // ✅ Nueva función para actualización local de items
  const handleItemUpdated = (updatedItem: CotizacionProveedorItem) => {
    setCotizacionData(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === updatedItem.id ? updatedItem : item
      )
    }))
    // No llamamos onUpdatedItem para evitar refetch completo
  }

  const proyectoId = cotizacionData.proyecto?.id || ''

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="w-full shadow-md hover:shadow-lg transition-shadow duration-200 border-l-4 border-l-blue-500">
        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value={cotizacionData.id} className="border-none">
            <AccordionTrigger className="p-6 hover:no-underline">
              <div className="flex flex-col md:flex-row md:justify-between w-full gap-4">
                <div className="flex flex-col items-start space-y-2">
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-blue-600" />
                    <span className="font-semibold text-lg text-gray-900">
                      {cotizacionData.codigo}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Building2 className="h-4 w-4" />
                    <span>{cotizacionData.proveedor?.nombre || 'Proveedor no especificado'}</span>
                  </div>
                  
                  {cotizacionData.proyecto && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="h-4 w-4" />
                      <span>Proyecto: {cotizacionData.proyecto.nombre}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex flex-col items-end space-y-2">
                  <div className="flex items-center gap-2">
                    <AnimatePresence>
                      {actionState !== 'idle' && (
                        <StatusBadge 
                          status={actionState === 'updating' ? 'loading' : actionState === 'success' ? 'success' : 'error'}
                          label={actionState === 'updating' ? 'Actualizando...' : actionState === 'success' ? 'Actualizado' : 'Error'}
                          pulse={actionState === 'updating'}
                        />
                      )}
                    </AnimatePresence>
                    
                    <Badge 
                      variant={getEstadoBadgeVariant(cotizacionData.estado || '')}
                      className={`${getEstadoBadgeColor(cotizacionData.estado || '')} flex items-center gap-1`}
                    >
                      {getEstadoIcon(cotizacionData.estado || '')}
                      {cotizacionData.estado?.toUpperCase() || 'N/A'}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    {cotizacionData.items.length} ítem{cotizacionData.items.length !== 1 ? 's' : ''}
                  </div>
                  
                  {cotizacionData.createdAt && (
                    <div className="text-xs text-gray-500">
                      Creado: {formatDate(cotizacionData.createdAt)}
                    </div>
                  )}
                </div>
              </div>
            </AccordionTrigger>

            <AccordionContent className="px-6 pb-6">
              <motion.div 
                className="space-y-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.1 }}
              >
                <Separator />
                
                {/* Sección de Items */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Ítems de la Cotización
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowAgregarItems(true)}
                      className="hover:bg-blue-50 hover:border-blue-300"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Ítems
                    </Button>
                  </div>
                  
                  {cotizacionData.items.length > 0 ? (
                    <div className="bg-white rounded-lg border">
                      <CotizacionProveedorTabla
                        items={cotizacionData.items}
                        onItemUpdated={handleItemUpdated}
                        onUpdated={() => {
                          handleRefetch()
                          onUpdatedItem?.()
                        }}
                      />
                    </div>
                  ) : (
                    <EmptyState
                      icon={FileText}
                      title="No hay ítems registrados"
                      description="Esta cotización no tiene ítems. Agrega el primer ítem para comenzar."
                      action={{
                        label: "Agregar Primer Ítem",
                        onClick: () => setShowAgregarItems(true)
                      }}
                    />
                  )}
                </div>

                <Separator />
                
                {/* Sección de Estados */}
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4" />
                    Cambiar Estado
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {ESTADOS.map((estado) => {
                      const isActive = cotizacionData.estado === estado
                      const isUpdating = updatingEstado && actionState === 'updating'
                      return (
                        <motion.div
                          key={estado}
                          whileHover={{ scale: isUpdating ? 1 : 1.05 }}
                          whileTap={{ scale: isUpdating ? 1 : 0.95 }}
                        >
                          <Button
                            size="sm"
                            variant={isActive ? "default" : "outline"}
                            className={`transition-all duration-300 ${
                              isActive 
                                ? actionState === 'success'
                                  ? 'bg-green-600 hover:bg-green-700 text-white'
                                  : actionState === 'error'
                                  ? 'bg-red-600 hover:bg-red-700 text-white'
                                  : 'bg-blue-600 hover:bg-blue-700 text-white'
                                : 'hover:bg-blue-50 hover:border-blue-300'
                             } disabled:opacity-50`}
                            onClick={() => handleChangeEstado(estado)}
                            disabled={isUpdating}
                          >
                            <AnimatePresence mode="wait">
                              {isUpdating && isActive ? (
                                <motion.div
                                  key="loading"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="flex items-center"
                                >
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                  {estado.toUpperCase()}
                                </motion.div>
                              ) : actionState === 'success' && isActive ? (
                                <motion.div
                                  key="success"
                                  initial={{ opacity: 0, scale: 0.8 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.8 }}
                                  className="flex items-center"
                                >
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  {estado.toUpperCase()}
                                </motion.div>
                              ) : (
                                <motion.div
                                  key="default"
                                  initial={{ opacity: 0 }}
                                  animate={{ opacity: 1 }}
                                  exit={{ opacity: 0 }}
                                  className="flex items-center"
                                >
                                  {getEstadoIcon(estado)}
                                  <span className="ml-1">{estado.toUpperCase()}</span>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </Button>
                        </motion.div>
                      )
                    })}
                  </div>
                </div>

                <Separator />
                
                {/* Sección de Acciones */}
                <div className="flex flex-wrap justify-between items-center gap-4">
                  <div className="flex flex-wrap gap-2">
                    <CotizacionEnviarCorreoButton cotizacion={cotizacionData} />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {onUpdate && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          onUpdate(cotizacionData.id, {
                            codigo: cotizacionData.codigo,
                          })
                        }
                        className="hover:bg-blue-50 hover:border-blue-300"
                      >
                        <Pencil className="w-4 h-4 mr-2" />
                        Editar
                      </Button>
                    )}
                    {onDelete && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:bg-red-50 hover:border-red-300"
                        onClick={() => onDelete(cotizacionData.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Eliminar
                      </Button>
                    )}
                  </div>
                </div>
              </motion.div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        
        <ModalAgregarItemCotizacionProveedor
          open={showAgregarItems}
          onClose={() => setShowAgregarItems(false)}
          cotizacion={cotizacionData}
          proyectoId={proyectoId}
          onAdded={handleRefetch}
        />
      </Card>
    </motion.div>
  )
}
