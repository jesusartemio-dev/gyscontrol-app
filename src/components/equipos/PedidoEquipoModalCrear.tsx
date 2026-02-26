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
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { PedidoEquipoPayload, ListaEquipo, ListaEquipoItem } from '@/types'
import {
  Plus,
  Loader2,
  Package,
  AlertCircle,
  ShoppingCart,
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
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold flex items-center">
            <Package className="w-5 h-5 mr-2 text-blue-600" />
            Crear Pedido de Equipos
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Lista Técnica Selection */}
          <div className="space-y-1.5">
            <Label htmlFor="lista" className="text-sm font-medium">
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
              className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 transition-colors ${
                errors.listaId
                  ? 'border-red-300 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
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
              <p className="text-sm text-red-600 flex items-center">
                <AlertCircle className="w-3.5 h-3.5 mr-1" />
                {errors.listaId}
              </p>
            )}
          </div>

          {/* Items Selection Section */}
          {listaId && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium flex items-center gap-2">
                  Items del Pedido ({itemsSeleccionados.length} sel.)
                  {itemsDisponibles.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-5">
                      {itemsDisponibles.length} disponibles
                    </Badge>
                  )}
                </Label>
                {itemsDisponibles.length > 0 && (
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSelectAll(true)}
                      disabled={loading || loadingItems}
                      className="text-xs px-2 h-6"
                    >
                      Todos
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSelectAll(false)}
                      disabled={loading || loadingItems}
                      className="text-xs px-2 h-6"
                    >
                      Ninguno
                    </Button>
                  </div>
                )}
              </div>

              {loadingItems ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600 mr-2" />
                  <span className="text-sm text-muted-foreground">Cargando items...</span>
                </div>
              ) : itemsDisponibles.length === 0 ? (
                <div className="border border-yellow-200 bg-yellow-50 rounded-md p-3 text-center">
                  <p className="text-sm font-medium text-yellow-800">No hay items disponibles</p>
                  <p className="text-xs text-yellow-700">Todos los items ya han sido pedidos.</p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto border rounded-md p-2">
                  {itemsDisponibles.map((item) => {
                    const selection = itemSelections[item.id]
                    if (!selection) return null

                    return (
                      <div
                        key={item.id}
                        className={`border rounded-md p-2 transition-colors ${
                          selection.selected
                            ? 'border-blue-300 bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Checkbox
                            checked={selection.selected}
                            onCheckedChange={(checked) =>
                              handleItemSelectionChange(item.id, 'selected', checked)
                            }
                            disabled={loading}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <span className="font-medium text-xs">{item.codigo}</span>
                                <span className="text-xs text-muted-foreground ml-2 truncate">{item.descripcion}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-xs font-medium">
                                  ${(item.precioElegido || 0).toLocaleString()}
                                </span>
                                <span className="text-[10px] text-muted-foreground">
                                  Disp: {selection.cantidadDisponible}
                                </span>
                                {selection.selected && (
                                  <>
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
                                      className="h-7 w-16 text-xs"
                                    />
                                    <span className="text-xs font-medium text-blue-700 w-16 text-right">
                                      ${((item.precioElegido || 0) * selection.cantidadPedida).toLocaleString()}
                                    </span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {errors.items && (
                <p className="text-sm text-red-600 flex items-center">
                  <AlertCircle className="w-3.5 h-3.5 mr-1" />
                  {errors.items}
                </p>
              )}
            </div>
          )}

          {/* Fecha + Observaciones en grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="fecha" className="text-sm font-medium">
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
                className={`h-9 ${
                  errors.fechaNecesaria ? 'border-red-300' : ''
                }`}
                disabled={loading}
              />
              {errors.fechaNecesaria && (
                <p className="text-xs text-red-600 flex items-center">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  {errors.fechaNecesaria}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="observacion" className="text-sm font-medium">
                Observaciones
              </Label>
              <textarea
                id="observacion"
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Instrucciones especiales..."
                rows={2}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between border-t pt-3">
          {itemsSeleccionados.length > 0 ? (
            <div className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">
                ${costoTotalEstimado.toLocaleString()}
              </span>
              {' '}&middot; {itemsSeleccionados.length} items &middot;{' '}
              {itemsSeleccionados.reduce((s, i) => s + i.cantidadPedida, 0)} uds
            </div>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => handleOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              onClick={handleSubmit}
              disabled={loading || !listaId || itemsSeleccionados.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-4 h-4 mr-1" />
                  Crear Pedido
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
