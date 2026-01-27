// ===================================================
// 📁 Archivo: PedidoEquipoModalCrear.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Modal para crear pedidos de equipos con selección de items
// 🎨 Mejoras aplicadas: Carga de items de lista, selección con checkboxes, cálculo de costos
// ✍️ Autor: Jesús Artemio + IA GYS
// 📅 Última actualización: 2026-01-21
// ===================================================

'use client'

import { useState, useEffect, useMemo } from 'react'
import { format } from 'date-fns'
import { motion } from 'framer-motion'
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
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { PedidoEquipoPayload, ListaEquipo, ListaEquipoItem } from '@/types'
import {
  Plus,
  Loader2,
  Calendar,
  FileText,
  Package,
  AlertCircle,
  CheckCircle2,
  ShoppingCart,
  Calculator,
} from 'lucide-react'

interface Props {
  listas: ListaEquipo[]
  proyectoId: string
  responsableId: string
  onCreated: (payload: PedidoEquipoPayload) => Promise<{ id: string } | null>
  onRefresh?: () => void
}

interface ItemSelection {
  itemId: string
  selected: boolean
  cantidadPedida: number
  cantidadDisponible: number
}

export default function PedidoEquipoModalCrear({
  listas,
  proyectoId,
  responsableId,
  onCreated,
  onRefresh,
}: Props) {
  const [open, setOpen] = useState(false)
  const [listaId, setListaId] = useState('')
  const [observacion, setObservacion] = useState('')
  const [fechaNecesaria, setFechaNecesaria] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [errors, setErrors] = useState<{ listaId?: string; fechaNecesaria?: string; items?: string }>({})

  // Item selection state
  const [listaItems, setListaItems] = useState<ListaEquipoItem[]>([])
  const [itemSelections, setItemSelections] = useState<Record<string, ItemSelection>>({})

  // Get selected list details
  const selectedList = listas.find(lista => lista.id === listaId)

  // Load items when lista changes
  useEffect(() => {
    if (!listaId) {
      setListaItems([])
      setItemSelections({})
      return
    }

    const loadListaItems = async () => {
      try {
        setLoadingItems(true)
        // Fetch lista details with items
        const response = await fetch(`/api/lista-equipo/detail/${listaId}`)
        if (!response.ok) throw new Error('Error al cargar items de la lista')

        const data = await response.json()
        const items = data.items || data.listaEquipoItem || []
        setListaItems(items)

        // Initialize item selections
        const selections: Record<string, ItemSelection> = {}
        items.forEach((item: ListaEquipoItem) => {
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
        setItemSelections(selections)
      } catch (error) {
        console.error('Error loading lista items:', error)
        toast.error('Error al cargar los items de la lista')
      } finally {
        setLoadingItems(false)
      }
    }

    loadListaItems()
  }, [listaId])

  // Calculate available items
  const itemsDisponibles = useMemo(() => {
    return listaItems.filter((item) => {
      const cantidadDisponible = item.cantidad - (item.cantidadPedida || 0) - (item.cantidadEntregada || 0)
      return cantidadDisponible > 0
    })
  }, [listaItems])

  // Calculate selected items
  const itemsSeleccionados = useMemo(() => {
    return Object.values(itemSelections).filter((selection) => selection.selected)
  }, [itemSelections])

  // Calculate estimated cost
  const costoTotalEstimado = useMemo(() => {
    return itemsSeleccionados.reduce((total, selection) => {
      const item = listaItems.find((i) => i.id === selection.itemId)
      const precio = item?.precioElegido || 0
      return total + (precio * selection.cantidadPedida)
    }, 0)
  }, [itemsSeleccionados, listaItems])

  // Handle item selection change
  const handleItemSelectionChange = (itemId: string, field: keyof ItemSelection, value: any) => {
    setItemSelections((prev) => ({
      ...prev,
      [itemId]: {
        ...prev[itemId],
        [field]: value,
      },
    }))
    // Clear items error when selection changes
    if (errors.items) {
      setErrors(prev => ({ ...prev, items: undefined }))
    }
  }

  // Handle select all/none
  const handleSelectAll = (selectAll: boolean) => {
    setItemSelections((prev) => {
      const updated = { ...prev }
      Object.keys(updated).forEach((itemId) => {
        updated[itemId].selected = selectAll
      })
      return updated
    })
  }

  // Validation function
  const validateForm = () => {
    const newErrors: { listaId?: string; fechaNecesaria?: string; items?: string } = {}

    if (!listaId.trim()) {
      newErrors.listaId = 'Debe seleccionar una lista técnica'
    }

    if (!fechaNecesaria) {
      newErrors.fechaNecesaria = 'La fecha necesaria es obligatoria'
    } else {
      const selectedDate = new Date(fechaNecesaria)
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      if (selectedDate < today) {
        newErrors.fechaNecesaria = 'La fecha no puede ser anterior a hoy'
      }
    }

    if (listaId && itemsSeleccionados.length === 0) {
      newErrors.items = 'Debe seleccionar al menos un item para el pedido'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Reset form
  const resetForm = () => {
    setListaId('')
    setObservacion('')
    setFechaNecesaria(format(new Date(), 'yyyy-MM-dd'))
    setErrors({})
    setListaItems([])
    setItemSelections({})
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Por favor, corrija los errores en el formulario')
      return
    }

    try {
      setLoading(true)

      const payload: PedidoEquipoPayload = {
        proyectoId,
        responsableId,
        listaId,
        observacion: observacion.trim() || undefined,
        fechaNecesaria: new Date(fechaNecesaria).toISOString(),
        // Include selected items
        itemsSeleccionados: itemsSeleccionados.map((selection) => ({
          listaEquipoItemId: selection.itemId,
          cantidadPedida: selection.cantidadPedida,
        })),
      }

      console.log('🔍 Debug - Payload final:', JSON.stringify(payload, null, 2))

      const nuevo = await onCreated(payload)
      if (!nuevo?.id) throw new Error('No se creó el pedido')

      toast.success('✅ Pedido creado exitosamente')
      onRefresh?.()
      setOpen(false)
      resetForm()
    } catch (err) {
      console.error('Error al crear pedido:', err)
      toast.error('Error al crear el pedido. Intente nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !loading) {
      resetForm()
    }
    setOpen(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <motion.div
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg">
            <Plus className="w-4 h-4 mr-2" />
            Crear Pedido
          </Button>
        </motion.div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <DialogHeader className="space-y-3">
            <DialogTitle className="text-2xl font-bold text-gray-900 flex items-center">
              <Package className="w-6 h-6 mr-2 text-blue-600" />
              Crear Nuevo Pedido de Equipos
            </DialogTitle>
            <p className="text-sm text-gray-600">
              Seleccione una lista técnica y los items a incluir en el pedido
            </p>
          </DialogHeader>

          <div className="space-y-6 py-6">
            {/* Lista Técnica Selection */}
            <div className="space-y-2">
              <Label htmlFor="lista" className="text-sm font-medium text-gray-700 flex items-center">
                <Package className="w-4 h-4 mr-2" />
                Lista Técnica *
              </Label>
              <select
                id="lista"
                value={listaId}
                onChange={(e) => {
                  setListaId(e.target.value)
                  if (errors.listaId) {
                    setErrors(prev => ({ ...prev, listaId: undefined }))
                  }
                }}
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-colors ${
                  errors.listaId
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                disabled={loading}
              >
                <option value="">Seleccionar lista técnica...</option>
                {listas.map((lista) => (
                  <option key={lista.id} value={lista.id}>
                    {lista.nombre} ({lista.codigo})
                  </option>
                ))}
              </select>
              {errors.listaId && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-600 flex items-center"
                >
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.listaId}
                </motion.p>
              )}
            </div>

            {/* Selected List Preview */}
            {selectedList && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
              >
                <Card className="bg-blue-50 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-blue-900">{selectedList.nombre}</h4>
                        <p className="text-sm text-blue-700">
                          Código: {selectedList.codigo}
                        </p>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="bg-blue-100 text-blue-800">
                          {itemsDisponibles.length} items disponibles
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Items Selection Section */}
            {listaId && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                transition={{ duration: 0.3 }}
                className="space-y-3"
              >
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-gray-900 flex items-center">
                    <CheckCircle2 className="w-4 h-4 mr-2 text-blue-600" />
                    Items del Pedido ({itemsSeleccionados.length} seleccionados)
                  </Label>
                  {itemsDisponibles.length > 0 && (
                    <div className="flex space-x-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectAll(true)}
                        disabled={loading || loadingItems}
                        className="text-xs px-2 py-1 h-7"
                      >
                        Todos
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSelectAll(false)}
                        disabled={loading || loadingItems}
                        className="text-xs px-2 py-1 h-7"
                      >
                        Ninguno
                      </Button>
                    </div>
                  )}
                </div>

                {loadingItems ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600 mr-2" />
                    <span className="text-gray-600">Cargando items...</span>
                  </div>
                ) : itemsDisponibles.length === 0 ? (
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
                              ? 'border-blue-300 bg-blue-50'
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
                                        <p className="text-sm font-medium text-blue-700">
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

                {errors.items && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-red-600 flex items-center"
                  >
                    <AlertCircle className="w-4 h-4 mr-1" />
                    {errors.items}
                  </motion.p>
                )}

                {/* Cost Summary */}
                {itemsSeleccionados.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-blue-800 font-medium flex items-center">
                        <Calculator className="w-4 h-4 mr-2" />
                        Resumen del Pedido
                      </span>
                      <div className="text-right">
                        <p className="text-blue-900 font-bold">
                          ${costoTotalEstimado.toLocaleString()}
                        </p>
                        <p className="text-xs text-blue-700">
                          {itemsSeleccionados.length} items • {itemsSeleccionados.reduce((sum, s) => sum + s.cantidadPedida, 0)} unidades
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Fecha Necesaria */}
            <div className="space-y-2">
              <Label htmlFor="fecha" className="text-sm font-medium text-gray-700 flex items-center">
                <Calendar className="w-4 h-4 mr-2" />
                Fecha Necesaria *
              </Label>
              <Input
                id="fecha"
                type="date"
                value={fechaNecesaria}
                onChange={(e) => {
                  setFechaNecesaria(e.target.value)
                  if (errors.fechaNecesaria) {
                    setErrors(prev => ({ ...prev, fechaNecesaria: undefined }))
                  }
                }}
                className={`${
                  errors.fechaNecesaria
                    ? 'border-red-300 focus:ring-red-500 focus:border-red-500'
                    : 'border-gray-300 focus:ring-blue-500 focus:border-blue-500'
                }`}
                disabled={loading}
              />
              {errors.fechaNecesaria && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-600 flex items-center"
                >
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {errors.fechaNecesaria}
                </motion.p>
              )}
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <Label htmlFor="observacion" className="text-sm font-medium text-gray-700 flex items-center">
                <FileText className="w-4 h-4 mr-2" />
                Observaciones
              </Label>
              <textarea
                id="observacion"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Observaciones adicionales o instrucciones especiales..."
                rows={3}
                disabled={loading}
              />
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={loading || !listaId || itemsSeleccionados.length === 0}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creando pedido...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-2" />
                  Crear Pedido ({itemsSeleccionados.length} items)
                </>
              )}
            </Button>
          </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  )
}
