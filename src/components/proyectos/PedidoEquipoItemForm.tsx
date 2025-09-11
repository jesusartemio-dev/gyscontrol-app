/**
 * 📝 PedidoEquipoItemForm Component
 * 
 * Formulario para agregar items a un pedido de equipos.
 * Permite seleccionar items de las listas de equipos disponibles.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client'

import React, { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

// 🎨 UI Components
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

// 🎯 Icons
import { 
  Package, 
  Plus, 
  X, 
  Search, 
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  Calendar
} from 'lucide-react'

// 📡 Types
import type { 
  ListaEquipo, 
  ListaEquipoItem 
} from '@/types/modelos'
import type { PedidoEquipoItemPayload } from '@/types/payloads'

// 🎨 Validation Schema
const itemFormSchema = z.object({
  listaEquipoItemId: z.string().min(1, 'Debe seleccionar un item'),
  cantidad: z.number().min(1, 'La cantidad debe ser mayor a 0'),
  precioUnitario: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  observaciones: z.string().optional(),
  tiempoEntrega: z.string().optional(),
  tiempoEntregaDias: z.number().min(0).optional(),
  comentarioLogistica: z.string().optional(),
})

type ItemFormData = z.infer<typeof itemFormSchema>

// 🎯 Props Interface
interface PedidoEquipoItemFormProps {
  pedidoId: string
  listas: ListaEquipo[]
  onSubmit: (payload: PedidoEquipoItemPayload) => Promise<void>
  onCancel?: () => void
  className?: string
}

// 🎨 Helper functions
const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2
  }).format(amount)
}

// 📦 Predefined delivery time options
const DELIVERY_OPTIONS = [
  { value: 'stock', label: 'En Stock', days: 0 },
  { value: '3 días', label: '3 días', days: 3 },
  { value: '7 días', label: '7 días', days: 7 },
  { value: '15 días', label: '15 días', days: 15 },
  { value: '30 días', label: '30 días', days: 30 },
  { value: '45 días', label: '45 días', days: 45 },
  { value: '60 días', label: '60 días', days: 60 },
  { value: 'personalizado', label: 'Personalizado', days: null }
]

// 🎯 Main Component
export const PedidoEquipoItemForm: React.FC<PedidoEquipoItemFormProps> = ({
  pedidoId,
  listas,
  onSubmit,
  onCancel,
  className = ''
}) => {
  // 🎯 States
  const [loading, setLoading] = useState(false)
  const [selectedLista, setSelectedLista] = useState<ListaEquipo | null>(null)
  const [availableItems, setAvailableItems] = useState<ListaEquipoItem[]>([])
  const [selectedItem, setSelectedItem] = useState<ListaEquipoItem | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [customDelivery, setCustomDelivery] = useState(false)

  // 🔁 Form setup
  const form = useForm<ItemFormData>({
    resolver: zodResolver(itemFormSchema),
    defaultValues: {
      listaEquipoItemId: '',
      cantidad: 1,
      precioUnitario: 0,
      observaciones: '',
      tiempoEntrega: 'stock',
      tiempoEntregaDias: 0,
      comentarioLogistica: '',
    },
  })

  // 🔄 Watch form values
  const watchedValues = form.watch()
  const totalCost = watchedValues.cantidad * watchedValues.precioUnitario

  // 📡 Load items when lista changes
  useEffect(() => {
    if (selectedLista) {
      const items = selectedLista.items || []
      setAvailableItems(items)
      
      // Reset selected item when lista changes
      setSelectedItem(null)
      form.setValue('listaEquipoItemId', '')
      form.setValue('precioUnitario', 0)
    } else {
      setAvailableItems([])
      setSelectedItem(null)
    }
  }, [selectedLista, form])

  // 📡 Update price when item changes
  useEffect(() => {
    if (selectedItem) {
      const precio = selectedItem.precioElegido || selectedItem.presupuesto || 0
      form.setValue('precioUnitario', precio)
    }
  }, [selectedItem, form])

  // 🔍 Filter items by search term
  const filteredItems = availableItems.filter(item => {
    if (!searchTerm) return true
    const search = searchTerm.toLowerCase()
    return (
      item.codigo.toLowerCase().includes(search) ||
      item.descripcion.toLowerCase().includes(search)
    )
  })

  // 🎯 Event handlers
  const handleListaChange = (listaId: string) => {
    const lista = listas.find(l => l.id === listaId)
    setSelectedLista(lista || null)
  }

  const handleItemChange = (itemId: string) => {
    const item = availableItems.find(i => i.id === itemId)
    setSelectedItem(item || null)
    form.setValue('listaEquipoItemId', itemId)
  }

  const handleSubmit = async (data: ItemFormData) => {
    if (!selectedItem) {
      toast.error('Debe seleccionar un item')
      return
    }

    try {
      setLoading(true)
      
      // Calculate total cost
      const costoTotal = data.cantidad * data.precioUnitario
      
      const payload: PedidoEquipoItemPayload = {
        pedidoId: pedidoId,
        responsableId: '', // TODO: Obtener del contexto de usuario
        listaEquipoItemId: data.listaEquipoItemId,
        cantidadPedida: data.cantidad,
        precioUnitario: data.precioUnitario,
        costoTotal,
        comentarioLogistica: data.comentarioLogistica,
        tiempoEntrega: data.tiempoEntrega,
        tiempoEntregaDias: data.tiempoEntregaDias,
        // Campos copiados desde ListaEquipoItem - TODO: obtener del item seleccionado
        codigo: '',
        descripcion: '',
        unidad: ''
      }

      await onSubmit(payload)
      
      // Reset form
      form.reset()
      setSelectedLista(null)
      setSelectedItem(null)
      setSearchTerm('')
      setCustomDelivery(false)
      
    } catch (error) {
      console.error('Error submitting form:', error)
      toast.error('Error al agregar item')
    } finally {
      setLoading(false)
    }
  }

  // 🎯 Handle delivery time change
  const handleDeliveryTimeChange = (value: string) => {
    const option = DELIVERY_OPTIONS.find(opt => opt.value === value)
    
    if (value === 'personalizado') {
      setCustomDelivery(true)
      form.setValue('tiempoEntrega', '')
      form.setValue('tiempoEntregaDias', 0)
    } else {
      setCustomDelivery(false)
      form.setValue('tiempoEntrega', value)
      form.setValue('tiempoEntregaDias', option?.days || 0)
    }
  }

  const handleCancel = () => {
    form.reset()
    setSelectedLista(null)
    setSelectedItem(null)
    setSearchTerm('')
    onCancel?.()
  }

  return (
    <motion.div
      className={`space-y-6 ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          {/* 📋 Lista Selection */}
          <div className="space-y-2">
            <Label htmlFor="lista-select">Lista de Equipos</Label>
            <Select onValueChange={handleListaChange}>
              <SelectTrigger id="lista-select">
                <SelectValue placeholder="Seleccionar lista de equipos" />
              </SelectTrigger>
              <SelectContent>
                {listas.map((lista) => (
                  <SelectItem key={lista.id} value={lista.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{lista.nombre}</span>
                      <Badge variant="outline" className="ml-2">
                        {lista.items?.length || 0} items
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 🔍 Item Search & Selection */}
          {selectedLista && (
            <div className="space-y-4">
              <Separator />
              
              {/* Search */}
              <div className="space-y-2">
                <Label htmlFor="search-items">Buscar Items</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search-items"
                    placeholder="Buscar por código o descripción..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Item Selection */}
              <FormField
                control={form.control}
                name="listaEquipoItemId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Item de Equipo</FormLabel>
                    <Select onValueChange={handleItemChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar item" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent className="max-h-60">
                        {filteredItems.length === 0 ? (
                          <div className="p-4 text-center text-muted-foreground">
                            {searchTerm ? 'No se encontraron items' : 'No hay items disponibles'}
                          </div>
                        ) : (
                          filteredItems.map((item) => {
                            const disponible = (item.cantidad || 0) - (item.cantidadPedida || 0)
                            const precio = item.precioElegido || item.presupuesto || 0
                            
                            return (
                              <SelectItem key={item.id} value={item.id}>
                                <div className="flex flex-col space-y-1 py-1">
                                  <div className="flex items-center justify-between">
                                    <span className="font-medium">{item.codigo}</span>
                                    <Badge 
                                      variant={disponible > 0 ? 'default' : 'destructive'}
                                      className="text-xs"
                                    >
                                      {disponible > 0 ? `${disponible} disp.` : 'Agotado'}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {item.descripcion}
                                  </p>
                                  <div className="flex items-center justify-between text-xs">
                                    <span>Precio: {formatCurrency(precio)}</span>
                                    <span>Total: {item.cantidad}</span>
                                  </div>
                                </div>
                              </SelectItem>
                            )
                          })
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}

          {/* 📊 Item Details */}
          {selectedItem && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5" />
                    Detalles del Item
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Item Info */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-muted-foreground">Código</Label>
                      <p className="font-medium">{selectedItem.codigo}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Unidad</Label>
                      <p className="font-medium">{selectedItem.unidad || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <Label className="text-muted-foreground">Descripción</Label>
                      <p className="font-medium">{selectedItem.descripcion}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Cantidad Total</Label>
                      <p className="font-medium">{selectedItem.cantidad}</p>
                    </div>
                    <div>
                      <Label className="text-muted-foreground">Ya Pedido</Label>
                      <p className="font-medium">{selectedItem.cantidadPedida || 0}</p>
                    </div>
                  </div>

                  <Separator />

                  {/* Form Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Cantidad */}
                    <FormField
                      control={form.control}
                      name="cantidad"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Cantidad a Pedir</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max={selectedItem.cantidad - (selectedItem.cantidadPedida || 0)}
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Precio Unitario */}
                    <FormField
                      control={form.control}
                      name="precioUnitario"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Precio Unitario</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                className="pl-10"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Total Cost */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Costo Total:</span>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(totalCost)}
                      </span>
                    </div>
                  </div>

                  {/* Tiempo de Entrega */}
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="tiempoEntrega"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tiempo de Entrega</FormLabel>
                            <Select onValueChange={handleDeliveryTimeChange} value={customDelivery ? 'personalizado' : field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar tiempo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {DELIVERY_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    <div className="flex items-center gap-2">
                                      <Clock className="h-4 w-4" />
                                      {option.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      {customDelivery && (
                        <FormField
                          control={form.control}
                          name="tiempoEntregaDias"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Días de Entrega</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type="number"
                                    min="0"
                                    className="pl-10"
                                    placeholder="Días"
                                    {...field}
                                    onChange={(e) => field.onChange(Number(e.target.value))}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>

                    {customDelivery && (
                      <FormField
                        control={form.control}
                        name="tiempoEntrega"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Descripción del Tiempo de Entrega</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Ej: 2-3 semanas, según disponibilidad..."
                                {...field}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  {/* Comentario Logística */}
                  <FormField
                    control={form.control}
                    name="comentarioLogistica"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Comentario de Logística (Opcional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Comentarios para el área de logística..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Observaciones */}
                  <FormField
                    control={form.control}
                    name="observaciones"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observaciones (Opcional)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Observaciones adicionales..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* 🎯 Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={loading}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading || !selectedItem}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Agregando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Item
                </>
              )}
            </Button>
          </div>
        </form>
      </Form>
    </motion.div>
  )
}

export default PedidoEquipoItemForm
