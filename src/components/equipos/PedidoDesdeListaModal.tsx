// ===================================================
// 📁 Archivo: PedidoDesdeListaModal.tsx
// 📌 Ubicación: src/components/equipos/
// 🔧 Descripción: Modal para crear pedidos desde una lista técnica
// 🎨 UX/UI: Diseño minimalista, compacto y profesional
// ✍️ Autor: Jesús Artemio + IA GYS
// 📅 Última actualización: 2025-01-26
// ===================================================

'use client'

import { useState, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  ListaEquipo,
  PedidoEquipoPayload,
} from '@/types'
import {
  ShoppingCart,
  Calendar,
  FileText,
  AlertCircle,
  Loader2,
  Package,
  X,
} from 'lucide-react'

interface Props {
  lista: ListaEquipo
  proyectoId: string
  responsableId: string
  onCreated: (payload: PedidoEquipoPayload) => Promise<{ id: string } | null>
  onRefresh?: () => void
  trigger?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
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
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const open = externalOpen !== undefined ? externalOpen : internalOpen
  const setOpen = externalOnOpenChange || setInternalOpen

  const [loading, setLoading] = useState(false)
  const [observacion, setObservacion] = useState('')
  const [prioridad, setPrioridad] = useState<'baja' | 'media' | 'alta' | 'critica'>('media')
  const [esUrgente, setEsUrgente] = useState(false)
  const [itemSelections, setItemSelections] = useState<Record<string, ItemSelection>>({})

  const getDefaultFechaNecesaria = () => {
    if (lista.fechaNecesaria) {
      const date = new Date(lista.fechaNecesaria)
      return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`
    }
    return format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
  }

  const [fechaNecesaria, setFechaNecesaria] = useState(getDefaultFechaNecesaria())

  // Initialize item selections
  useEffect(() => {
    const selections: Record<string, ItemSelection> = {}
    if (!lista?.listaEquipoItem || !Array.isArray(lista.listaEquipoItem)) {
      setItemSelections({})
      return
    }

    lista.listaEquipoItem.forEach((item) => {
      const cantidadDisponible = item.cantidad - (item.cantidadPedida || 0) - (item.cantidadEntregada || 0)
      if (cantidadDisponible > 0) {
        const previousSelection = itemSelections[item.id]
        selections[item.id] = {
          itemId: item.id,
          selected: previousSelection?.selected || false,
          cantidadPedida: Math.min(previousSelection?.cantidadPedida || 1, cantidadDisponible),
          cantidadDisponible,
        }
      }
    })

    setItemSelections(selections)
  }, [lista.listaEquipoItem, lista.id])

  const itemsDisponibles = useMemo(() => {
    if (!lista?.listaEquipoItem || !Array.isArray(lista.listaEquipoItem)) return []
    return lista.listaEquipoItem.filter((item) => {
      const cantidadDisponible = item.cantidad - (item.cantidadPedida || 0) - (item.cantidadEntregada || 0)
      return cantidadDisponible > 0
    })
  }, [lista.listaEquipoItem])

  const itemsSeleccionados = useMemo(() => {
    return Object.values(itemSelections).filter((s) => s.selected)
  }, [itemSelections])

  const costoTotalEstimado = useMemo(() => {
    return itemsSeleccionados.reduce((total, selection) => {
      const item = lista?.listaEquipoItem?.find((i) => i.id === selection.itemId)
      return total + ((item?.precioElegido || 0) * selection.cantidadPedida)
    }, 0)
  }, [itemsSeleccionados, lista.listaEquipoItem])

  const handleItemSelectionChange = (itemId: string, field: keyof ItemSelection, value: any) => {
    setItemSelections((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }))
  }

  const handleSelectAll = (selectAll: boolean) => {
    setItemSelections((prev) => {
      const updated = { ...prev }
      Object.keys(updated).forEach((id) => {
        updated[id].selected = selectAll
      })
      return updated
    })
  }

  const isValid = () => {
    if (itemsSeleccionados.length === 0) {
      toast.error('Seleccione al menos un item')
      return false
    }
    if (!fechaNecesaria) {
      toast.error('Especifique la fecha necesaria')
      return false
    }
    const invalidQty = itemsSeleccionados.some((s) => s.cantidadPedida <= 0 || s.cantidadPedida > s.cantidadDisponible)
    if (invalidQty) {
      toast.error('Verifique las cantidades')
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!isValid()) return
    try {
      setLoading(true)
      const payload: PedidoEquipoPayload = {
        proyectoId,
        responsableId,
        listaId: lista.id,
        observacion: observacion.trim() || undefined,
        fechaNecesaria: new Date(fechaNecesaria).toISOString(),
        prioridad,
        esUrgente,
        itemsSeleccionados: itemsSeleccionados.map((s) => ({
          listaEquipoItemId: s.itemId,
          cantidadPedida: s.cantidadPedida,
        })),
      }

      const nuevoPedido = await onCreated(payload)
      if (!nuevoPedido?.id) throw new Error('No se pudo crear el pedido')

      toast.success('Pedido creado exitosamente')
      if (onRefresh) {
        await onRefresh()
        await new Promise(resolve => setTimeout(resolve, 300))
      }
      setOpen(false)
      resetForm()
    } catch (err) {
      console.error('Error al crear pedido:', err)
      toast.error('Error al crear el pedido')
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setObservacion('')
    setFechaNecesaria(getDefaultFechaNecesaria())
    setPrioridad('media')
    setEsUrgente(false)
    const selections: Record<string, ItemSelection> = {}
    lista?.listaEquipoItem?.forEach((item) => {
      const cantidadDisponible = item.cantidad - (item.cantidadPedida || 0) - (item.cantidadEntregada || 0)
      if (cantidadDisponible > 0) {
        selections[item.id] = {
          itemId: item.id,
          selected: false,
          cantidadPedida: 1,
          cantidadDisponible,
        }
      }
    })
    setItemSelections(selections)
  }

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !loading) resetForm()
    setOpen(newOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700">
            <ShoppingCart className="w-3.5 h-3.5 mr-1.5" />
            Crear Pedido
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-4 pt-4 pb-3 border-b bg-gradient-to-r from-green-50 to-white">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="flex items-center gap-2 text-base font-semibold">
                <ShoppingCart className="h-4 w-4 text-green-600" />
                Crear Pedido desde Lista
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {lista.nombre} • {lista.codigo}
              </p>
            </div>
            <Badge variant="outline" className="text-[10px] px-2 py-0.5 bg-white">
              <Package className="w-3 h-3 mr-1" />
              {itemsDisponibles.length} disponibles
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Status banner */}
          <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-green-50 border border-green-200">
            <div className="flex items-center gap-3">
              <span className="text-xs text-green-700">
                Estado: <Badge variant="secondary" className="ml-1 text-[10px] h-5">{lista.estado}</Badge>
              </span>
              <span className="text-xs text-green-600">
                Total: {lista.listaEquipoItem?.length || 0} items
              </span>
            </div>
            {itemsSeleccionados.length > 0 && (
              <span className="text-xs font-medium text-green-700">
                ${costoTotalEstimado.toLocaleString()}
              </span>
            )}
          </div>

          {/* Items selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-700">
                Items ({itemsSeleccionados.length} seleccionados)
              </span>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => handleSelectAll(true)} disabled={loading} className="h-6 px-2 text-[10px]">
                  Todos
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleSelectAll(false)} disabled={loading} className="h-6 px-2 text-[10px]">
                  Ninguno
                </Button>
              </div>
            </div>

            {itemsDisponibles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center border rounded-lg bg-amber-50 border-amber-200">
                <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
                <p className="text-sm font-medium text-amber-700">No hay items disponibles</p>
                <p className="text-xs text-amber-600">Todos los items ya fueron pedidos</p>
              </div>
            ) : (
              <ScrollArea className="h-[200px] border rounded-lg">
                <div className="p-2 space-y-1">
                  {itemsDisponibles.map((item) => {
                    const selection = itemSelections[item.id]
                    if (!selection) return null

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          'flex items-center gap-3 p-2 rounded-lg border transition-all cursor-pointer',
                          selection.selected
                            ? 'bg-green-50 border-green-300'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        )}
                        onClick={() => handleItemSelectionChange(item.id, 'selected', !selection.selected)}
                      >
                        <Checkbox
                          checked={selection.selected}
                          onCheckedChange={(checked) => handleItemSelectionChange(item.id, 'selected', checked)}
                          disabled={loading}
                          onClick={(e) => e.stopPropagation()}
                          className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                        />

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-medium text-gray-900 truncate">
                              {item.codigo}
                            </span>
                          </div>
                          <p className="text-[10px] text-gray-500 truncate">{item.descripcion}</p>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <div className="text-right">
                            <p className="text-xs font-medium">${(item.precioElegido || 0).toLocaleString()}</p>
                            <p className="text-[10px] text-gray-500">Disp: {selection.cantidadDisponible}</p>
                          </div>

                          {selection.selected && (
                            <Input
                              type="number"
                              min="1"
                              max={selection.cantidadDisponible}
                              value={selection.cantidadPedida}
                              onChange={(e) => {
                                e.stopPropagation()
                                handleItemSelectionChange(
                                  item.id,
                                  'cantidadPedida',
                                  Math.min(Math.max(1, parseInt(e.target.value) || 1), selection.cantidadDisponible)
                                )
                              }}
                              onClick={(e) => e.stopPropagation()}
                              disabled={loading}
                              className="w-14 h-7 text-xs text-center"
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Order details */}
          <div className="space-y-3 pt-2 border-t">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Fecha Necesaria *
                </label>
                <Input
                  type="date"
                  value={fechaNecesaria}
                  onChange={(e) => setFechaNecesaria(e.target.value)}
                  disabled={loading}
                  className="h-8 text-xs"
                  min={format(new Date(), 'yyyy-MM-dd')}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700">Prioridad</label>
                <Select value={prioridad} onValueChange={(v) => setPrioridad(v as any)} disabled={loading}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baja" className="text-xs">Baja</SelectItem>
                    <SelectItem value="media" className="text-xs">Media</SelectItem>
                    <SelectItem value="alta" className="text-xs">Alta</SelectItem>
                    <SelectItem value="critica" className="text-xs">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 border">
              <Checkbox
                id="esUrgente"
                checked={esUrgente}
                onCheckedChange={(checked) => setEsUrgente(checked === true)}
                disabled={loading}
                className="data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
              />
              <label htmlFor="esUrgente" className="text-xs font-medium text-gray-700 flex items-center gap-1 cursor-pointer">
                <AlertCircle className="w-3 h-3 text-red-500" />
                Marcar como Urgente
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-gray-700 flex items-center gap-1">
                <FileText className="w-3 h-3" />
                Observaciones
              </label>
              <textarea
                value={observacion}
                onChange={(e) => setObservacion(e.target.value)}
                disabled={loading}
                placeholder="Notas adicionales para el pedido..."
                rows={2}
                className="w-full px-3 py-2 text-xs border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
          <div className="text-xs text-gray-500">
            {itemsSeleccionados.length > 0 && (
              <span>{itemsSeleccionados.length} items • ${costoTotalEstimado.toLocaleString()}</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} disabled={loading} className="h-8 text-xs">
              <X className="w-3 h-3 mr-1" />
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={loading || itemsSeleccionados.length === 0}
              className="h-8 text-xs bg-green-600 hover:bg-green-700"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Creando...
                </>
              ) : (
                <>
                  <ShoppingCart className="w-3 h-3 mr-1" />
                  Crear Pedido
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
