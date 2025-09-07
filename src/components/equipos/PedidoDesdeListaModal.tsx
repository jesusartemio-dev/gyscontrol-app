// ===================================================
// 📁 Archivo: PedidoDesdeListaModal.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Modal contextual para crear pedidos directamente desde una lista técnica
// 🎨 Mejoras UX/UI: Modal contextual, selección inteligente, feedback visual
// ✍️ Autor: Jesús Artemio + IA GYS
// 📅 Fecha: 2025-01-27
// ===================================================

'use client'

import { useState, useMemo, useEffect } from 'react'
import { motion } from 'framer-motion'
import { format } from 'date-fns'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import {
  ListaEquipo,
  ListaEquipoItem,
  PedidoEquipoPayload,
} from '@/types'
import {
  Plus,
  Package,
  Calendar,
  FileText,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ShoppingCart,
  Calculator,
  Clock,
} from 'lucide-react'

interface Props {
  lista: ListaEquipo
  proyectoId: string
  responsableId: string
  onCreated: (payload: PedidoEquipoPayload) => Promise<{ id: string } | null>
  onRefresh?: () => void
  trigger?: React.ReactNode
}

interface ItemSelection {
  itemId: string
  selected: boolean
  cantidadPedida: number
  cantidadDisponible: number
}

export default function PedidoDesdeListaModal({
  lista,
  proyectoId,
  responsableId,
  onCreated,
  onRefresh,
  trigger,
}: Props) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [observacion, setObservacion] = useState('')
  const [fechaNecesaria, setFechaNecesaria] = useState(
    format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd') // Default: 7 days from now
  )
  const [prioridad, setPrioridad] = useState<'baja' | 'media' | 'alta' | 'critica'>('media')
  const [esUrgente, setEsUrgente] = useState(false)

  // ✅ Initialize item selections with available quantities
  const [itemSelections, setItemSelections] = useState<Record<string, ItemSelection>>({})

  // ✅ Update item selections when lista changes (after creating orders)
  useEffect(() => {
    const selections: Record<string, ItemSelection> = {}
    // ✅ Validate lista and items exist before processing
    if (!lista || !lista.items || !Array.isArray(lista.items)) {
      setItemSelections({})
      return
    }
    
    lista.items.forEach((item) => {
      // ✅ Opción 1: Considera tanto cantidadPedida como cantidadEntregada
      const cantidadDisponible = item.cantidad - (item.cantidadPedida || 0) - (item.cantidadEntregada || 0)
      if (cantidadDisponible > 0) {
        // Preserve previous selection state if item was already selected
        const previousSelection = itemSelections[item.id]
        const wasSelected = previousSelection?.selected || false
        const previousCantidad = previousSelection?.cantidadPedida || 1
        
        selections[item.id] = {
          itemId: item.id,
          selected: wasSelected,
          cantidadPedida: Math.min(previousCantidad, cantidadDisponible, 1), // Ensure valid quantity
          cantidadDisponible,
        }
      }
    })
    
    setItemSelections(selections)
    
    // 🔍 Debug: Log current cantidadPedida values
    console.log('🔍 Modal Debug - Lista items cantidadPedida:', lista.items?.map(item => ({
      id: item.id,
      codigo: item.codigo,
      cantidad: item.cantidad,
      cantidadPedida: item.cantidadPedida,
      cantidadEntregada: item.cantidadEntregada || 0,
      // ✅ Opción 1: Considera tanto cantidadPedida como cantidadEntregada
      disponible: item.cantidad - (item.cantidadPedida || 0) - (item.cantidadEntregada || 0)
    })))
  }, [lista.items, lista.id]) // Re-run when lista.items or lista.id changes

  // ✅ Calculate available items and totals
  const itemsDisponibles = useMemo(() => {
    if (!lista || !lista.items || !Array.isArray(lista.items)) {
      return []
    }
    return lista.items.filter((item) => {
      // ✅ Opción 1: Considera tanto cantidadPedida como cantidadEntregada
      const cantidadDisponible = item.cantidad - (item.cantidadPedida || 0) - (item.cantidadEntregada || 0)
      return cantidadDisponible > 0
    })
  }, [lista.items])

  const itemsSeleccionados = useMemo(() => {
    return Object.values(itemSelections).filter((selection) => selection.selected)
  }, [itemSelections])

  const costoTotalEstimado = useMemo(() => {
    return itemsSeleccionados.reduce((total, selection) => {
      const item = lista?.items?.find((i) => i.id === selection.itemId)
      const precio = item?.precioElegido || 0
      return total + (precio * selection.cantidadPedida)
    }, 0)
  }, [itemsSeleccionados, lista.items])

  // ✅ Handle item selection changes
  const handleItemSelectionChange = (itemId: string, field: keyof ItemSelection, value: any) => {
    setItemSelections((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }))
  }

  // ✅ Handle select all/none
  const handleSelectAll = (selectAll: boolean) => {
    setItemSelections((prev) => {
      const updated = { ...prev }
      Object.keys(updated).forEach((itemId) => {
        updated[itemId].selected = selectAll
      })
      return updated
    })
  }

  // ✅ Validation
  const isValid = () => {
    if (itemsSeleccionados.length === 0) {
      toast.error('Debe seleccionar al menos un item para el pedido')
      return false
    }

    if (!fechaNecesaria) {
      toast.error('Debe especificar la fecha necesaria')
      return false
    }

    // Validate quantities
    const invalidQuantities = itemsSeleccionados.some((selection) => {
      return selection.cantidadPedida <= 0 || selection.cantidadPedida > selection.cantidadDisponible
    })

    if (invalidQuantities) {
      toast.error('Verifique las cantidades seleccionadas')
      return false
    }

    return true
  }

  // ✅ Handle form submission
  const handleSubmit = async () => {
    if (!isValid()) return

    try {
      setLoading(true)

      console.log('🔍 Debug - Lista:', lista)
      console.log('🔍 Debug - Items disponibles:', itemsDisponibles)
      console.log('🔍 Debug - Items seleccionados:', itemsSeleccionados)
      console.log('🔍 Debug - Item selections:', itemSelections)

      const payload: PedidoEquipoPayload = {
        proyectoId,
        responsableId,
        listaId: lista.id,
        observacion: observacion.trim() || undefined,
        fechaNecesaria: new Date(fechaNecesaria).toISOString(),
        prioridad,
        esUrgente,
        // Include selected items data for processing
        itemsSeleccionados: itemsSeleccionados.map((selection) => ({
          listaEquipoItemId: selection.itemId,
          cantidadPedida: selection.cantidadPedida,
        })),
      }

      console.log('🔍 Debug - Payload final:', JSON.stringify(payload, null, 2))

      const nuevoPedido = await onCreated(payload)
      if (!nuevoPedido?.id) throw new Error('No se pudo crear el pedido')

      toast.success(`✅ Pedido creado exitosamente desde lista "${lista.nombre}"`)
      
      // 🔄 Wait for data refresh before closing modal
      if (onRefresh) {
        await onRefresh()
        // Give a small delay to ensure data is updated
        await new Promise(resolve => setTimeout(resolve, 500))
      }
      
      setOpen(false)
      resetForm()
    } catch (err) {
      console.error('Error al crear pedido:', err)
      toast.error('Error al crear el pedido. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  // ✅ Reset form
  const resetForm = () => {
    setObservacion('')
    setFechaNecesaria(format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))
    setPrioridad('media')
    setEsUrgente(false)
    // Reset selections - recalculate available quantities
    const selections: Record<string, ItemSelection> = {}
    if (lista?.items && Array.isArray(lista.items)) {
      lista.items.forEach((item) => {
        // ✅ Opción 1: Considera tanto cantidadPedida como cantidadEntregada
        const cantidadDisponible = item.cantidad - (item.cantidadPedida || 0) - (item.cantidadEntregada || 0)
        if (cantidadDisponible > 0) {
          selections[item.id] = {
            itemId: item.id,
            selected: false,
            cantidadPedida: Math.min(cantidadDisponible, 1),
            cantidadDisponible,
          }
        }
      })
    }
    setItemSelections(selections)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !loading) {
      resetForm()
    }
    setOpen(newOpen)
  }

  // ✅ Priority badge colors
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critica': return 'bg-red-100 text-red-800 border-red-200'
      case 'alta': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'media': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'baja': return 'bg-gray-100 text-gray-800 border-gray-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Button className="bg-green-600 hover:bg-green-700 text-white shadow-lg">
              <ShoppingCart className="w-4 h-4 mr-2" />
              Crear Pedido
            </Button>
          </motion.div>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[85vh] overflow-y-auto flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col h-full"
        >
          <DialogHeader className="flex-shrink-0 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-xl font-bold text-gray-900 flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2 text-green-600" />
                  Crear Pedido desde Lista
                </DialogTitle>
                <p className="text-sm text-gray-600 mt-1">{lista.nombre} • {lista.codigo}</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  <Package className="w-3 h-3 mr-1" />
                  {itemsDisponibles.length} disponibles
                </Badge>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Compact Info Bar */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-4">
                  <span className="text-green-800 font-medium">Estado: <Badge variant="outline" className="ml-1">{lista.estado}</Badge></span>
                  <span className="text-green-700">Total: {lista.items?.length || 0} items</span>
                </div>
                {itemsSeleccionados.length > 0 && (
                  <div className="text-green-800 font-medium">
                    ${costoTotalEstimado.toLocaleString()} estimado
                  </div>
                )}
              </div>
            </div>

            {/* Items Selection */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="font-semibold text-gray-900 flex items-center">
                  <CheckCircle2 className="w-4 h-4 mr-2 text-green-600" />
                  Items ({itemsSeleccionados.length} seleccionados)
                </Label>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectAll(true)}
                    disabled={loading}
                    className="text-xs px-2 py-1 h-7"
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleSelectAll(false)}
                    disabled={loading}
                    className="text-xs px-2 py-1 h-7"
                  >
                    Ninguno
                  </Button>
                </div>
              </div>

              {itemsDisponibles.length === 0 ? (
                <div className="border border-yellow-200 bg-yellow-50 rounded-lg p-4 text-center">
                  <AlertCircle className="w-8 h-8 mx-auto text-yellow-600 mb-2" />
                  <p className="text-sm font-medium text-yellow-800 mb-1">No hay items disponibles</p>
                  <p className="text-xs text-yellow-700">Todos los items ya han sido pedidos.</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                  {itemsDisponibles.map((item) => {
                    const selection = itemSelections[item.id]
                    if (!selection) return null

                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className={`border rounded-lg p-3 transition-all ${
                          selection.selected
                            ? 'border-green-300 bg-green-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <Checkbox
                            checked={selection.selected}
                            onCheckedChange={(checked) =>
                              handleItemSelectionChange(item.id, 'selected', checked)
                            }
                            disabled={loading}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 text-sm truncate">{item.codigo}</h4>
                                <p className="text-xs text-gray-600 line-clamp-2">{item.descripcion}</p>
                              </div>
                              <div className="flex items-center gap-3">
                                <div className="text-right flex-shrink-0">
                                  <p className="text-sm font-medium text-gray-900">
                                    ${(item.precioElegido || 0).toLocaleString()}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    Disp: {selection.cantidadDisponible}
                                  </p>
                                </div>
                                {selection.selected && (
                                  <>
                                    <div className="w-20">
                                      <Input
                                        type="number"
                                        min="1"
                                        max={selection.cantidadDisponible}
                                        value={selection.cantidadPedida}
                                        onChange={(e) =>
                                          handleItemSelectionChange(
                                            item.id,
                                            'cantidadPedida',
                                            Math.min(
                                              Math.max(1, parseInt(e.target.value) || 1),
                                              selection.cantidadDisponible
                                            )
                                          )
                                        }
                                        disabled={loading}
                                        className="h-8 text-sm"
                                        placeholder="Cant"
                                      />
                                    </div>
                                    <div className="text-right flex-shrink-0 w-20">
                                      <p className="text-sm font-medium text-green-700">
                                        ${((item.precioElegido || 0) * selection.cantidadPedida).toLocaleString()}
                                      </p>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Compact Order Details */}
            <div className="bg-gray-50 border rounded-lg p-3 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="fechaNecesaria" className="text-xs font-medium text-gray-700 flex items-center">
                    <Calendar className="w-3 h-3 mr-1" />
                    Fecha Necesaria *
                  </Label>
                  <Input
                    id="fechaNecesaria"
                    type="date"
                    value={fechaNecesaria}
                    onChange={(e) => setFechaNecesaria(e.target.value)}
                    disabled={loading}
                    className="h-8 text-sm"
                    min={format(new Date(), 'yyyy-MM-dd')}
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium text-gray-700">Prioridad</Label>
                  <select
                    value={prioridad}
                    onChange={(e) => setPrioridad(e.target.value as any)}
                    disabled={loading}
                    className="w-full h-8 px-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="baja">Baja</option>
                    <option value="media">Media</option>
                    <option value="alta">Alta</option>
                    <option value="critica">Crítica</option>
                  </select>
                </div>

                <div className="flex items-center justify-center">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="esUrgente"
                      checked={esUrgente}
                      onCheckedChange={(checked) => setEsUrgente(checked === true)}
                      disabled={loading}
                    />
                    <Label htmlFor="esUrgente" className="text-xs font-medium text-gray-700 flex items-center">
                      <AlertCircle className="w-3 h-3 mr-1 text-red-500" />
                      Urgente
                    </Label>
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="observacion" className="text-xs font-medium text-gray-700 flex items-center">
                  <FileText className="w-3 h-3 mr-1" />
                  Observaciones
                </Label>
                <Textarea
                  id="observacion"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  disabled={loading}
                  placeholder="Observaciones adicionales..."
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 flex items-center justify-between pt-4 border-t">
            <div className="flex items-center space-x-4 text-xs text-gray-600">
              <span className="flex items-center">
                <Clock className="w-3 h-3 mr-1" />
                {format(new Date(fechaNecesaria), 'dd/MM/yyyy')}
              </span>
              {itemsSeleccionados.length > 0 && (
                <span className="flex items-center">
                  <Calculator className="w-3 h-3 mr-1" />
                  {itemsSeleccionados.length} items • ${costoTotalEstimado.toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
                size="sm"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={handleSubmit}
                disabled={loading || itemsSeleccionados.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white"
                size="sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Crear Pedido
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}