/**
 * 🔍 PedidoEquipoFiltersClient Component
 * 
 * Componente de filtros específicos para pedidos de equipos de aprovisionamiento.
 * Incluye filtros por proyecto, proveedor, estado, fechas, montos y coherencia.
 * 
 * Features:
 * - Filtros por proyecto y proveedor
 * - Estados de pedido específicos
 * - Rangos de fechas y montos
 * - Filtros por coherencia con listas
 * - Búsqueda por texto
 * - Filtros rápidos predefinidos
 * - Validaciones en tiempo real
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client'

import React, { useState, useEffect, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertCircle,
  Building,
  Calendar as CalendarIcon,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Filter,
  Package,
  RefreshCw,
  Search,
  Target,
  Truck,
  Users,
  X
} from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { cn } from '@/lib/utils'

// 📝 Types
import type { EstadoPedido } from '@/types/modelos'

// 🔧 Validation schema
const filtrosSchema = z.object({
  busqueda: z.string().optional(),
  proyectoId: z.string().optional(),
  proveedorId: z.string().optional(),
  estado: z.enum(['all', 'borrador', 'enviado', 'atendido', 'parcial', 'entregado', 'cancelado']).optional(),
  fechaCreacion: z.object({
    from: z.date().optional(),
    to: z.date().optional()
  }).optional(),
  fechaEntrega: z.object({
    from: z.date().optional(),
    to: z.date().optional()
  }).optional(),
  montoMinimo: z.number().min(0).optional(),
  montoMaximo: z.number().min(0).optional(),
  tieneObservaciones: z.boolean().optional(),
  soloVencidos: z.boolean().optional(),
  soloSinRecibir: z.boolean().optional(),
  soloUrgentes: z.boolean().optional(),
  coherenciaMinima: z.number().min(0).max(100).optional(),
  listaId: z.string().optional()
})

type FiltrosForm = z.infer<typeof filtrosSchema>

// 📋 Props interface
interface PedidoEquipoFiltersClientProps {
  filtros: {
    busqueda?: string
    proyectoId?: string
    proveedorId?: string
    estado?: EstadoPedido
    fechaCreacion?: { from?: Date; to?: Date }
    fechaEntrega?: { from?: Date; to?: Date }
    montoMinimo?: number
    montoMaximo?: number
    tieneObservaciones?: boolean
    soloVencidos?: boolean
    soloSinRecibir?: boolean
    soloUrgentes?: boolean
    coherenciaMinima?: number
    listaId?: string
  }
  proyectos?: Array<{ id: string; nombre: string; codigo: string }>
  proveedores?: Array<{ id: string; nombre: string; ruc?: string }>
  listas?: Array<{ id: string; nombre: string; proyecto?: { nombre: string } }>
  loading?: boolean
  className?: string
  showQuickFilters?: boolean
}

// 🎯 Estados de pedido
const ESTADOS_PEDIDO = [
  { value: 'borrador', label: 'Borrador', color: 'bg-gray-100 text-gray-800' },
  { value: 'enviado', label: 'Enviado', color: 'bg-blue-100 text-blue-800' },
  { value: 'atendido', label: 'Atendido', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'parcial', label: 'Parcial', color: 'bg-orange-100 text-orange-800' },
  { value: 'entregado', label: 'Entregado', color: 'bg-green-100 text-green-800' },
  { value: 'cancelado', label: 'Cancelado', color: 'bg-red-100 text-red-800' }
] as const

// 🚀 Filtros rápidos predefinidos
const FILTROS_RAPIDOS = [
  {
    id: 'todos',
    label: 'Todos los pedidos',
    icon: Package,
    filtros: {}
  },
  {
    id: 'pendientes',
    label: 'Pendientes de recibir',
    icon: Clock,
    filtros: { soloSinRecibir: true }
  },
  {
    id: 'vencidos',
    label: 'Vencidos',
    icon: AlertCircle,
    filtros: { soloVencidos: true }
  },
  {
    id: 'urgentes',
    label: 'Urgentes',
    icon: Target,
    filtros: { soloUrgentes: true }
  },
  {
    id: 'coherentes',
    label: 'Alta coherencia',
    icon: Target,
    filtros: { coherenciaMinima: 80 }
  }
]

// ✅ Main component
export default function PedidoEquipoFiltersClient({
  filtros,
  proyectos = [],
  proveedores = [],
  listas = [],
  loading = false,
  className = '',
  showQuickFilters = true
}: PedidoEquipoFiltersClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)
  const [activeQuickFilter, setActiveQuickFilter] = useState<string>('todos')

  // 🔁 Form setup
  const form = useForm<FiltrosForm>({
    resolver: zodResolver(filtrosSchema),
    defaultValues: {
      busqueda: filtros.busqueda || '',
      proyectoId: filtros.proyectoId || '',
      proveedorId: filtros.proveedorId || '',
      estado: filtros.estado,
      fechaCreacion: filtros.fechaCreacion,
      fechaEntrega: filtros.fechaEntrega,
      montoMinimo: filtros.montoMinimo,
      montoMaximo: filtros.montoMaximo,
      tieneObservaciones: filtros.tieneObservaciones || false,
      soloVencidos: filtros.soloVencidos || false,
      soloSinRecibir: filtros.soloSinRecibir || false,
      soloUrgentes: filtros.soloUrgentes || false,
      coherenciaMinima: filtros.coherenciaMinima,
      listaId: filtros.listaId || ''
    }
  })

  // 🔁 Update URL with filters
  const updateFilters = (newFilters: Partial<FiltrosForm>) => {
    const params = new URLSearchParams(searchParams.toString())
    
    // Clear page when filters change
    params.delete('page')
    
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '' || 
          (typeof value === 'boolean' && !value) ||
          (typeof value === 'object' && (!value.from && !value.to))) {
        params.delete(key)
        if (key === 'fechaCreacion' || key === 'fechaEntrega') {
          params.delete(`${key}Inicio`)
          params.delete(`${key}Fin`)
        }
      } else if (typeof value === 'object' && (value.from || value.to)) {
        // Handle date ranges
        if (value.from) {
          params.set(`${key}Inicio`, format(value.from, 'yyyy-MM-dd'))
        } else {
          params.delete(`${key}Inicio`)
        }
        if (value.to) {
          params.set(`${key}Fin`, format(value.to, 'yyyy-MM-dd'))
        } else {
          params.delete(`${key}Fin`)
        }
      } else {
        params.set(key, value.toString())
      }
    })
    
    router.push(`?${params.toString()}`)
  }

  // 🔁 Handle form submission
  const onSubmit = (data: FiltrosForm) => {
    // ✅ Convert 'all' values to undefined for proper filtering
    const cleanedData = {
      ...data,
      proyectoId: data.proyectoId === 'all' ? undefined : data.proyectoId,
      proveedorId: data.proveedorId === 'all' ? undefined : data.proveedorId,
      estado: data.estado === 'all' ? undefined : data.estado,
      listaId: data.listaId === 'all' ? undefined : data.listaId
    }
    updateFilters(cleanedData)
  }

  // 🔁 Handle quick filters
  const handleQuickFilter = (filterId: string) => {
    const filtro = FILTROS_RAPIDOS.find(f => f.id === filterId)
    if (filtro) {
      setActiveQuickFilter(filterId)
      form.reset({
        ...form.getValues(),
        ...filtro.filtros
      })
      updateFilters(filtro.filtros)
    }
  }

  // 🔁 Clear all filters
  const clearFilters = () => {
    form.reset({
      busqueda: '',
      proyectoId: '',
      proveedorId: '',
      estado: undefined,
      fechaCreacion: undefined,
      fechaEntrega: undefined,
      montoMinimo: undefined,
      montoMaximo: undefined,
      tieneObservaciones: false,
      soloVencidos: false,
      soloSinRecibir: false,
      soloUrgentes: false,
      coherenciaMinima: undefined,
      listaId: ''
    })
    setActiveQuickFilter('todos')
    router.push(window.location.pathname)
  }

  // 🔁 Calculate active filters
  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; value: string }> = []
    const values = form.getValues()
    
    if (values.busqueda) {
      filters.push({ key: 'busqueda', label: 'Búsqueda', value: values.busqueda })
    }
    if (values.proyectoId) {
      const proyecto = proyectos.find(p => p.id === values.proyectoId)
      filters.push({ key: 'proyectoId', label: 'Proyecto', value: proyecto?.nombre || values.proyectoId })
    }
    if (values.proveedorId) {
      const proveedor = proveedores.find(p => p.id === values.proveedorId)
      filters.push({ key: 'proveedorId', label: 'Proveedor', value: proveedor?.nombre || values.proveedorId })
    }
    if (values.estado) {
      const estado = ESTADOS_PEDIDO.find(e => e.value === values.estado)
      filters.push({ key: 'estado', label: 'Estado', value: estado?.label || values.estado })
    }
    if (values.listaId) {
      const lista = listas.find(l => l.id === values.listaId)
      filters.push({ key: 'listaId', label: 'Lista', value: lista?.nombre || values.listaId })
    }
    if (values.soloVencidos) {
      filters.push({ key: 'soloVencidos', label: 'Solo vencidos', value: 'Sí' })
    }
    if (values.soloSinRecibir) {
      filters.push({ key: 'soloSinRecibir', label: 'Sin recibir', value: 'Sí' })
    }
    if (values.soloUrgentes) {
      filters.push({ key: 'soloUrgentes', label: 'Urgentes', value: 'Sí' })
    }
    if (values.coherenciaMinima) {
      filters.push({ key: 'coherenciaMinima', label: 'Coherencia mín.', value: `${values.coherenciaMinima}%` })
    }
    
    return filters
  }, [form.watch(), proyectos, proveedores, listas])

  return (
    <div className={cn('space-y-4', className)}>
      {/* 🚀 Quick Filters */}
      {showQuickFilters && (
        <div className="flex flex-wrap gap-2">
          {FILTROS_RAPIDOS.map((filtro) => {
            const Icon = filtro.icon
            return (
              <Button
                key={filtro.id}
                variant={activeQuickFilter === filtro.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => handleQuickFilter(filtro.id)}
                className="flex items-center space-x-2"
              >
                <Icon className="h-4 w-4" />
                <span>{filtro.label}</span>
              </Button>
            )
          })}
        </div>
      )}

      {/* 📋 Main Filters Form */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          {/* 🔍 Basic Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <FormField
              control={form.control}
              name="busqueda"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Búsqueda</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        {...field}
                        placeholder="Código, descripción..."
                        className="pl-10"
                      />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Proyecto */}
            <FormField
              control={form.control}
              name="proyectoId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proyecto</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los proyectos" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">Todos los proyectos</SelectItem>
                      {proyectos.map((proyecto) => (
                        <SelectItem key={proyecto.id} value={proyecto.id}>
                          <div className="flex items-center space-x-2">
                            <Building className="h-4 w-4" />
                            <span>{proyecto.codigo} - {proyecto.nombre}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Proveedor */}
            <FormField
              control={form.control}
              name="proveedorId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Proveedor</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los proveedores" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">Todos los proveedores</SelectItem>
                      {proveedores.map((proveedor) => (
                        <SelectItem key={proveedor.id} value={proveedor.id}>
                          <div className="flex items-center space-x-2">
                            <Truck className="h-4 w-4" />
                            <span>{proveedor.nombre}</span>
                            {proveedor.ruc && (
                              <Badge variant="outline" className="text-xs">
                                {proveedor.ruc}
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Estado */}
            <FormField
              control={form.control}
              name="estado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Estado</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los estados" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      {ESTADOS_PEDIDO.map((estado) => (
                        <SelectItem key={estado.value} value={estado.value}>
                          <div className="flex items-center space-x-2">
                            <div className={cn('w-2 h-2 rounded-full', estado.color)} />
                            <span>{estado.label}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* 🔧 Advanced Filters */}
          <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" className="flex items-center space-x-2 p-0">
                {isAdvancedOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <span>Filtros avanzados</span>
                {activeFilters.length > 0 && (
                  <Badge variant="secondary">{activeFilters.length}</Badge>
                )}
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-4 mt-4">
              {/* Date Ranges */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Fecha Creación */}
                <FormField
                  control={form.control}
                  name="fechaCreacion"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Creación</FormLabel>
                      <div className="flex space-x-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'flex-1 justify-start text-left font-normal',
                                !field.value?.from && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value?.from ? (
                                format(field.value.from, 'dd/MM/yyyy', { locale: es })
                              ) : (
                                'Desde'
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value?.from}
                              onSelect={(date) => field.onChange({ ...field.value, from: date })}
                              disabled={(date) => date > new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'flex-1 justify-start text-left font-normal',
                                !field.value?.to && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value?.to ? (
                                format(field.value.to, 'dd/MM/yyyy', { locale: es })
                              ) : (
                                'Hasta'
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value?.to}
                              onSelect={(date) => field.onChange({ ...field.value, to: date })}
                              disabled={(date) => date > new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Fecha Entrega */}
                <FormField
                  control={form.control}
                  name="fechaEntrega"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fecha de Entrega</FormLabel>
                      <div className="flex space-x-2">
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'flex-1 justify-start text-left font-normal',
                                !field.value?.from && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value?.from ? (
                                format(field.value.from, 'dd/MM/yyyy', { locale: es })
                              ) : (
                                'Desde'
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value?.from}
                              onSelect={(date) => field.onChange({ ...field.value, from: date })}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                        
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                'flex-1 justify-start text-left font-normal',
                                !field.value?.to && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value?.to ? (
                                format(field.value.to, 'dd/MM/yyyy', { locale: es })
                              ) : (
                                'Hasta'
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={field.value?.to}
                              onSelect={(date) => field.onChange({ ...field.value, to: date })}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Montos */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="montoMinimo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto Mínimo</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="number"
                            placeholder="0.00"
                            className="pl-10"
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="montoMaximo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monto Máximo</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="number"
                            placeholder="0.00"
                            className="pl-10"
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Lista y Coherencia */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="listaId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lista de Referencia</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Todas las listas" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Todas las listas</SelectItem>
                          {listas.map((lista) => (
                            <SelectItem key={lista.id} value={lista.id}>
                              <div className="flex items-center space-x-2">
                                <Package className="h-4 w-4" />
                                <span>{lista.nombre}</span>
                                {lista.proyecto && (
                                  <Badge variant="outline" className="text-xs">
                                    {lista.proyecto.nombre}
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="coherenciaMinima"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Coherencia Mínima (%)</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Target className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            {...field}
                            type="number"
                            min="0"
                            max="100"
                            placeholder="80"
                            className="pl-10"
                            onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : undefined)}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Boolean Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <FormField
                  control={form.control}
                  name="soloVencidos"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-medium">Solo Vencidos</FormLabel>
                        <div className="text-xs text-muted-foreground">
                          Pedidos con fecha de entrega vencida
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="soloSinRecibir"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-medium">Sin Recibir</FormLabel>
                        <div className="text-xs text-muted-foreground">
                          Pedidos pendientes de recepción
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="soloUrgentes"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-medium">Solo Urgentes</FormLabel>
                        <div className="text-xs text-muted-foreground">
                          Pedidos marcados como urgentes
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="tieneObservaciones"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-sm font-medium">Con Observaciones</FormLabel>
                        <div className="text-xs text-muted-foreground">
                          Pedidos que tienen observaciones
                        </div>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

          {/* 🎯 Action Buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button type="submit" disabled={loading}>
                {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                <Filter className="mr-2 h-4 w-4" />
                Aplicar Filtros
              </Button>
              
              {activeFilters.length > 0 && (
                <Button type="button" variant="outline" onClick={clearFilters}>
                  <X className="mr-2 h-4 w-4" />
                  Limpiar ({activeFilters.length})
                </Button>
              )}
            </div>
          </div>
        </form>
      </Form>

      {/* 🏷️ Active Filters Display */}
      {activeFilters.length > 0 && (
        <div className="space-y-2">
          <Separator />
          <div className="flex flex-wrap gap-2">
            <span className="text-sm font-medium text-muted-foreground">Filtros activos:</span>
            {activeFilters.map((filter) => (
              <Badge key={filter.key} variant="secondary" className="flex items-center space-x-1">
                <span className="text-xs">{filter.label}: {filter.value}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => {
                    const newValues = { ...form.getValues() }
                    // @ts-ignore
                    newValues[filter.key] = filter.key.includes('solo') || filter.key === 'tieneObservaciones' ? false : undefined
                    form.reset(newValues)
                    updateFilters({ [filter.key]: undefined })
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}