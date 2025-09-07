/**
 * Componente PedidoEquipoItemList - Lista de ítems de pedidos de equipos
 * Mejoras UX/UI: Animaciones con Framer Motion, mejor diseño visual, componentes Shadcn/UI
 * Todas las monedas están en dólares (USD)
 */
'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Pencil, 
  Trash2, 
  Save, 
  X, 
  Package, 
  Calendar, 
  Clock, 
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react'
import { PedidoEquipoItem, PedidoEquipoItemUpdatePayload } from '@/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'

interface Props {
  items: PedidoEquipoItem[]
  onUpdate?: (id: string, payload: PedidoEquipoItemUpdatePayload) => void
  onDelete?: (id: string) => void
}

export default function PedidoEquipoItemList({ items, onUpdate, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [cantidad, setCantidad] = useState<number | ''>('')
  const [loading, setLoading] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // Helper functions
  const formatCurrency = (amount: number | null | undefined): string => {
    if (!amount) return '-'
    return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
  }

  const formatDate = (date: string | Date | null | undefined): string => {
    if (!date) return '-'
    return format(new Date(date), 'dd/MM/yyyy')
  }

  const getStatusConfig = (estado: string) => {
    const configs = {
      pendiente: { 
        variant: 'secondary' as const, 
        icon: Clock, 
        className: 'bg-yellow-100 text-yellow-700 border-yellow-200' 
      },
      atendido: { 
        variant: 'default' as const, 
        icon: Package, 
        className: 'bg-blue-100 text-blue-700 border-blue-200' 
      },
      parcial: { 
        variant: 'outline' as const, 
        icon: AlertCircle, 
        className: 'bg-orange-100 text-orange-700 border-orange-200' 
      },
      entregado: { 
        variant: 'default' as const, 
        icon: CheckCircle2, 
        className: 'bg-green-100 text-green-700 border-green-200' 
      }
    }
    return configs[estado as keyof typeof configs] || configs.pendiente
  }

  const handleEdit = (item: PedidoEquipoItem) => {
    setEditingId(item.id)
    setCantidad(item.cantidadPedida)
  }

  const handleCancel = () => {
    setEditingId(null)
    setCantidad('')
  }

  const handleSave = async (id: string) => {
    if (!onUpdate || cantidad === '' || cantidad <= 0) {
      toast.error('La cantidad debe ser mayor a 0')
      return
    }

    setLoading(id)
    try {
      await onUpdate(id, { cantidadPedida: cantidad })
      setEditingId(null)
      setCantidad('')
      toast.success('Cantidad actualizada exitosamente')
    } catch (error) {
      console.error('Error updating item:', error)
      toast.error('Error al actualizar la cantidad')
    } finally {
      setLoading(null)
    }
  }

  const handleDelete = async (item: PedidoEquipoItem) => {
    if (!onDelete) return
    
    setDeletingId(item.id)
    try {
      await onDelete(item.id)
      toast.success('Ítem eliminado exitosamente')
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error('Error al eliminar el ítem')
    } finally {
      setDeletingId(null)
    }
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold text-muted-foreground mb-2">
            No hay ítems en este pedido
          </h3>
          <p className="text-sm text-muted-foreground text-center">
            Los ítems agregados aparecerán aquí
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header con resumen */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Package className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            {items.length} ítem{items.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">
            Total: {formatCurrency(items.reduce((sum, item) => sum + (item.costoTotal || 0), 0))}
          </span>
        </div>
      </div>

      <Separator />

      {/* Lista de ítems */}
      <div className="space-y-3">
        <AnimatePresence>
          {items.map((item, i) => {
            const isEditing = editingId === item.id
            const isLoading = loading === item.id
            const isDeleting = deletingId === item.id
            const statusConfig = getStatusConfig(item.estado || 'pendiente')
            const StatusIcon = statusConfig.icon

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2, delay: i * 0.05 }}
                className={`relative ${isDeleting ? 'pointer-events-none opacity-50' : ''}`}
              >
                <Card className={`transition-all duration-200 ${
                  isEditing 
                    ? 'ring-2 ring-blue-500 shadow-md' 
                    : 'hover:shadow-sm border-border/50'
                }`}>
                  <CardContent className="p-4">
                    {/* Header del ítem */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-muted rounded-full flex items-center justify-center text-sm font-medium">
                          {i + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold text-sm truncate">
                              {item.descripcion || 'Sin descripción'}
                            </h4>
                            {item.codigo && (
                              <Badge variant="outline" className="text-xs">
                                {item.codigo}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>Unidad: {item.unidad || '-'}</span>
                            {item.tiempoEntrega && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{item.tiempoEntrega}</span>
                              </div>
                            )}
                            {item.tiempoEntregaDias && (
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{item.tiempoEntregaDias} días</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Estado */}
                      <Badge className={statusConfig.className}>
                        <StatusIcon className="h-3 w-3 mr-1" />
                        <span className="capitalize">{item.estado || 'pendiente'}</span>
                      </Badge>
                    </div>

                    {/* Información financiera y fechas */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      {/* Cantidad */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Cantidad
                        </label>
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={cantidad}
                              onChange={e => setCantidad(Number(e.target.value))}
                              className="h-8 text-sm"
                              min="1"
                              disabled={isLoading}
                            />
                            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                          </div>
                        ) : (
                          <div className="text-sm font-semibold">
                            {item.cantidadPedida}
                          </div>
                        )}
                      </div>

                      {/* Precio unitario */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Precio Unitario
                        </label>
                        <div className="text-sm font-semibold text-green-600">
                          {formatCurrency(item.precioUnitario)}
                        </div>
                      </div>

                      {/* Costo total */}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">
                          Costo Total
                        </label>
                        <div className="text-sm font-bold text-green-700">
                          {formatCurrency(item.costoTotal)}
                        </div>
                      </div>
                    </div>



                    {/* Acciones */}
                    {(onUpdate || onDelete) && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t">
                        {isEditing ? (
                          <>
                            <Button 
                              size="sm" 
                              onClick={() => handleSave(item.id)} 
                              disabled={isLoading}
                              className="h-8"
                            >
                              {isLoading ? (
                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                              ) : (
                                <Save className="h-3 w-3 mr-1" />
                              )}
                              Guardar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={handleCancel}
                              disabled={isLoading}
                              className="h-8"
                            >
                              <X className="h-3 w-3 mr-1" />
                              Cancelar
                            </Button>
                          </>
                        ) : (
                          <>
                            {onUpdate && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleEdit(item)}
                                className="h-8"
                              >
                                <Pencil className="h-3 w-3 mr-1" />
                                Editar
                              </Button>
                            )}
                            {onDelete && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8"
                                onClick={() => handleDelete(item)}
                                disabled={isDeleting}
                              >
                                {isDeleting ? (
                                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                ) : (
                                  <Trash2 className="h-3 w-3 mr-1" />
                                )}
                                Eliminar
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
