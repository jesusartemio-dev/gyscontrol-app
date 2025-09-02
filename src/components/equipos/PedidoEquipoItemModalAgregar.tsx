/**
 * 🛠️ PedidoEquipoItemModalAgregar - Modal para agregar items de equipo a un pedido
 * 
 * Funcionalidades:
 * - Búsqueda y filtrado de items
 * - Selección múltiple con cantidades
 * - Estados de pedido (pendiente, parcial, completo)
 * - Validación de stock disponible
 * - Interfaz responsive y moderna
 */

'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { PedidoEquipoItemPayload, ListaEquipoItem } from '@/types'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { toast } from 'sonner'
import {
  Package,
  Plus,
  Minus,
  ShoppingCart,
  Clock,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Search,
  Filter,
  Loader2,
  X,
} from 'lucide-react'

interface Props {
  open: boolean
  onClose: () => void
  pedidoId: string
  responsableId: string
  items: ListaEquipoItem[]
  onCreateItem: (payload: PedidoEquipoItemPayload) => Promise<void>
  onRefresh?: () => Promise<void>
}

export default function PedidoEquipoItemModalAgregar({
  open,
  onClose,
  pedidoId,
  responsableId,
  items,
  onCreateItem,
  onRefresh,
}: Props) {
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterByAvailable, setFilterByAvailable] = useState(false)
  const [estadoFilter, setEstadoFilter] = useState<'todos' | 'pendientes' | 'parciales' | 'completos'>('pendientes')
  const [refreshing, setRefreshing] = useState(false)

  // ✅ Auto-refresh data when modal opens
  useEffect(() => {
    const refreshData = async () => {
      if (open && onRefresh) {
        try {
          setRefreshing(true)
          await onRefresh()
        } catch (error) {
          console.error('Error refreshing data:', error)
          toast.error('Error al actualizar los datos')
        } finally {
          setRefreshing(false)
        }
      }
    }
    
    refreshData()
  }, [open, onRefresh])

  // 🔍 Filter items based on search, availability and status
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        item.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.descripcion.toLowerCase().includes(searchTerm.toLowerCase())
      
      const restante = item.cantidad - (item.cantidadPedida || 0)
      const pedida = item.cantidadPedida || 0
      const hasStock = restante > 0
      
      // Filter by availability
      if (filterByAvailable && !hasStock) return false
      
      // Filter by order status
      let matchesEstado = true
      if (estadoFilter === 'pendientes') {
        matchesEstado = pedida === 0
      } else if (estadoFilter === 'parciales') {
        matchesEstado = pedida > 0 && restante > 0
      } else if (estadoFilter === 'completos') {
        matchesEstado = restante === 0
      }
      
      return matchesSearch && matchesEstado
    })
  }, [items, searchTerm, filterByAvailable, estadoFilter])

  const handleToggleItem = (itemId: string) => {
    setSelectedItems(prev => {
      const updated = { ...prev }
      if (updated[itemId]) {
        delete updated[itemId]
      } else {
        // ✅ Verificar stock disponible antes de agregar
        const item = items.find(i => i.id === itemId)
        const restante = item ? item.cantidad - (item.cantidadPedida || 0) : 0
        if (restante > 0) {
          updated[itemId] = 1
        } else {
          toast.error(`No hay stock disponible para ${item?.codigo || 'este item'}`)
        }
      }
      return updated
    })
  }

  // ✅ Función para obtener el estado del pedido de un ítem
  const getEstadoPedido = (item: ListaEquipoItem) => {
    const restante = item.cantidad - (item.cantidadPedida || 0)
    const pedida = item.cantidadPedida || 0
    
    if (restante === 0) {
      return { 
        estado: 'completo', 
        color: 'bg-green-100 text-green-800 border-green-200', 
        texto: 'Completo',
        icon: '✓',
        variant: 'default' as const
      }
    }
    if (pedida > 0) {
      return { 
        estado: 'parcial', 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200', 
        texto: 'Parcial',
        icon: '⚠',
        variant: 'secondary' as const
      }
    }
    return { 
      estado: 'pendiente', 
      color: 'bg-gray-100 text-gray-800 border-gray-200', 
      texto: 'Pendiente',
      icon: '○',
      variant: 'outline' as const
    }
  }

  const handleCantidadChange = (itemId: string, value: number) => {
    if (selectedItems[itemId] !== undefined) {
      const item = items.find(i => i.id === itemId)
      const restante = item ? item.cantidad - (item.cantidadPedida || 0) : 0
      const validValue = Math.max(1, Math.min(value, restante))
      
      setSelectedItems(prev => ({
        ...prev,
        [itemId]: validValue,
      }))
    }
  }

  const incrementQuantity = (itemId: string) => {
    const item = items.find(i => i.id === itemId)
    const restante = item ? item.cantidad - (item.cantidadPedida || 0) : 0
    const currentQuantity = selectedItems[itemId] || 0
    
    if (currentQuantity < restante) {
      setSelectedItems(prev => ({
        ...prev,
        [itemId]: currentQuantity + 1,
      }))
    } else {
      // ✅ Mostrar mensaje cuando no se puede incrementar
      toast.error(`Stock máximo alcanzado para ${item?.codigo || 'este item'}: ${restante} disponibles`)
    }
  }

  const decrementQuantity = (itemId: string) => {
    const currentQuantity = selectedItems[itemId] || 0
    if (currentQuantity > 1) {
      setSelectedItems(prev => ({
        ...prev,
        [itemId]: currentQuantity - 1,
      }))
    }
  }

  // 📡 Función para crear items en el pedido
  const handleCreateItems = async () => {
    if (Object.keys(selectedItems).length === 0) {
      toast.error('Selecciona al menos un item')
      return
    }

    // ✅ Validar stock disponible antes de crear items
    const invalidItems: string[] = []
    Object.entries(selectedItems).forEach(([itemId, cantidadPedida]) => {
      const item = items.find(i => i.id === itemId)
      if (item) {
        const restante = item.cantidad - (item.cantidadPedida || 0)
        if (cantidadPedida > restante) {
          invalidItems.push(`${item.codigo}: solicitado ${cantidadPedida}, disponible ${restante}`)
        }
      }
    })

    if (invalidItems.length > 0) {
      toast.error(
        `Stock insuficiente para los siguientes items:\n${invalidItems.join('\n')}`,
        { duration: 6000 }
      )
      return
    }

    setLoading(true)
    try {
      const promises = Object.entries(selectedItems).map(([itemId, cantidadPedida]) => {
        const item = items.find(i => i.id === itemId)
        if (!item) {
          throw new Error(`Item con ID ${itemId} no encontrado`)
        }

        // ✅ Validación adicional por seguridad
        const restante = item.cantidad - (item.cantidadPedida || 0)
        if (cantidadPedida > restante) {
          throw new Error(`Stock insuficiente para ${item.codigo}: solicitado ${cantidadPedida}, disponible ${restante}`)
        }

        const payload: PedidoEquipoItemPayload = {
          pedidoId,
          responsableId,
          listaEquipoItemId: itemId,
          cantidadPedida,
          codigo: item.codigo,
          descripcion: item.descripcion,
          unidad: item.unidad,
          precioUnitario: item.precioElegido || 0,
          costoTotal: (item.precioElegido || 0) * cantidadPedida,
          tiempoEntrega: item.tiempoEntrega,
          tiempoEntregaDias: item.tiempoEntregaDias,
        }
        return onCreateItem(payload)
      })

      await Promise.all(promises)
      toast.success(`${Object.keys(selectedItems).length} items agregados al pedido`)
      
      // ✅ Refresh data after successful creation
      if (onRefresh) {
        await onRefresh()
      }
      
      handleClose()
    } catch (error) {
      console.error('Error al agregar items:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error al agregar items al pedido'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    if (!loading) {
      setSelectedItems({})
      setSearchTerm('')
      setFilterByAvailable(false)
      setEstadoFilter('pendientes')
      onClose()
    }
  }

  // 📊 Calcular estadísticas de items
  const estadisticas = useMemo(() => {
    // 🔍 Debug: Log items data to understand the issue
    console.log('🔍 Modal Debug - Items received:', items.map(item => ({
      id: item.id,
      codigo: item.codigo,
      cantidad: item.cantidad,
      cantidadPedida: item.cantidadPedida,
      disponible: item.cantidad - (item.cantidadPedida || 0)
    })))
    
    const totalItems = items.length
    const itemsCompletos = items.filter(i => (i.cantidadPedida || 0) >= i.cantidad).length
    const itemsParciales = items.filter(i => {
      const pedida = i.cantidadPedida || 0
      return pedida > 0 && pedida < i.cantidad
    }).length
    const itemsPendientes = items.filter(i => (i.cantidadPedida || 0) === 0).length
    const itemsDisponibles = items.filter(i => {
      const restante = i.cantidad - (i.cantidadPedida || 0)
      return restante > 0
    }).length
    
    // 🔍 Debug: Log calculated statistics
    console.log('🔍 Modal Debug - Calculated statistics:', {
      totalItems,
      itemsCompletos,
      itemsParciales,
      itemsPendientes,
      itemsDisponibles
    })
    
    return {
      totalItems,
      itemsCompletos,
      itemsParciales,
      itemsPendientes,
      itemsDisponibles
    }
  }, [items])

  // 📊 Calcular totales de items seleccionados
  const selectedItemsArray = Object.entries(selectedItems).map(([itemId, cantidad]) => {
    const item = items.find(i => i.id === itemId)
    if (!item) return null
    return { item, cantidad }
  }).filter(Boolean) as { item: ListaEquipoItem; cantidad: number }[]

  const selectedCount = Object.keys(selectedItems).length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] h-[95vh] flex flex-col p-0 gap-0">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col h-full"
        >
          {/* Header */}
          <DialogHeader className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Package className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <DialogTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  Agregar Items al Pedido
                  {refreshing && (
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  )}
                </DialogTitle>
                <p className="text-sm text-gray-600 mt-1">
                  {refreshing ? 'Actualizando datos...' : 'Selecciona los equipos que deseas agregar al pedido'}
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Filters */}
          <div className="px-6 py-4 border-b bg-gray-50/50">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por código o descripción..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-white"
                  />
                </div>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="available"
                    checked={filterByAvailable}
                    onCheckedChange={(checked) => setFilterByAvailable(checked as boolean)}
                  />
                  <label htmlFor="available" className="text-sm font-medium text-gray-700">
                    Solo disponibles
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-gray-500" />
                  <select
                    value={estadoFilter}
                    onChange={(e) => setEstadoFilter(e.target.value as any)}
                    className="text-sm border border-gray-300 rounded-md px-3 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="todos">Todos</option>
                    <option value="pendientes">Pendientes</option>
                    <option value="parciales">Parciales</option>
                    <option value="completos">Completos</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Statistics */}
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{estadisticas.totalItems}</span> Total
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium text-green-600">{estadisticas.itemsCompletos}</span> Completos
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium text-yellow-600">{estadisticas.itemsParciales}</span> Parciales
              </div>
              <div className="text-sm text-gray-600">
                <span className="font-medium text-blue-600">{estadisticas.itemsDisponibles}</span> Disponibles
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-hidden">
            <ScrollArea className="h-full">
              <div className="p-6">
                {/* Table Header */}
                <div className="grid grid-cols-10 gap-4 mb-4 text-sm font-medium text-gray-700 border-b pb-2">
                  <div className="col-span-1 text-center">Sel.</div>
                  <div className="col-span-6">Código / Descripción</div>
                  <div className="col-span-2 text-center">Stock / Estado</div>
                  <div className="col-span-1 text-center">Cant.</div>
                </div>

                {/* Items List */}
                <AnimatePresence>
                  {filteredItems.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-12"
                    >
                      <Package className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500 text-lg font-medium">No se encontraron items</p>
                      <p className="text-gray-400 text-sm mt-1">
                        Intenta ajustar los filtros de búsqueda
                      </p>
                    </motion.div>
                  ) : (
                    filteredItems.map((item, index) => {
                      const restante = item.cantidad - (item.cantidadPedida || 0)
                      const isSelected = selectedItems[item.id] !== undefined
                      const estadoPedido = getEstadoPedido(item)
                      const selectedQuantity = selectedItems[item.id] || 0

                      return (
                        <motion.div
                          key={item.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className={`grid grid-cols-10 gap-4 py-3 px-4 rounded-lg border transition-all duration-200 mb-2 ${
                            isSelected
                              ? 'bg-blue-50 border-blue-200 shadow-sm'
                              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
                          }`}
                        >
                          {/* Checkbox */}
                          <div className="col-span-1 flex items-center justify-center">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={() => handleToggleItem(item.id)}
                              disabled={restante === 0}
                              className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                            />
                          </div>

                          {/* Código y Descripción */}
                          <div className="col-span-6">
                            <div className="font-medium text-gray-900 text-sm">
                              {item.codigo}
                            </div>
                            <div className="text-gray-600 text-sm mt-1 line-clamp-2">
                              {item.descripcion}
                            </div>
                          </div>

                          {/* Stock / Estado Integrado */}
                          <div className="col-span-2 text-center">
                            <div className="flex flex-col items-center gap-1">
                              {/* Stock Numbers */}
                              <div className="text-sm">
                                <span className="font-medium text-gray-900">{restante}</span>
                                <span className="text-gray-500">/{item.cantidad}</span>
                              </div>
                              
                              {/* Estado Badge */}
                              <Badge
                                variant={estadoPedido.variant}
                                className={`text-xs ${estadoPedido.color} px-2 py-0.5`}
                              >
                                <span className="mr-1">{estadoPedido.icon}</span>
                                {estadoPedido.texto}
                              </Badge>
                              
                              {/* Cantidad Pedida */}
                              {item.cantidadPedida && item.cantidadPedida > 0 && (
                                <div className="text-xs text-blue-600">
                                  {item.cantidadPedida} pedidas
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Cantidad */}
                          <div className="col-span-1">
                            {isSelected && (
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => decrementQuantity(item.id)}
                                  disabled={selectedQuantity <= 1}
                                  className="h-6 w-6 p-0"
                                >
                                  <Minus className="h-3 w-3" />
                                </Button>
                                <span className="text-sm font-medium w-8 text-center">
                                  {selectedQuantity}
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => incrementQuantity(item.id)}
                                  disabled={selectedQuantity >= restante}
                                  className="h-6 w-6 p-0"
                                >
                                  <Plus className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )
                    })
                  )}
                </AnimatePresence>
              </div>
            </ScrollArea>
          </div>

          {/* Footer */}
          <DialogFooter className="px-6 py-4 border-t bg-gray-50/50">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium text-blue-600">{selectedCount}</span> items seleccionados
                </div>
                {selectedCount > 0 && (
                  <div className="text-sm text-gray-600">
                    Total: <span className="font-medium">
                      {selectedItemsArray.reduce((sum, { cantidad }) => sum + cantidad, 0)} unidades
                    </span>
                  </div>
                )}
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  disabled={loading}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleCreateItems}
                  disabled={loading || selectedCount === 0}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Agregando...
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="mr-2 h-4 w-4" />
                      Agregar ({selectedCount})
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
