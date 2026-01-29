'use client'

import React, { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  AlertCircle,
  ChevronDown,
  Clock,
  DollarSign,
  Package,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Truck,
  X,
  Zap,
} from 'lucide-react'
import { DatePickerWithRange } from '@/components/ui/date-range-picker'
import type { FiltrosPedidoEquipo } from '@/types/aprovisionamiento'
import { EstadoPedido } from '@prisma/client'

const filtrosSchema = z.object({
  busqueda: z.string().optional(),
  proyectoId: z.string().optional(),
  proveedorId: z.string().optional(),
  estado: z.nativeEnum(EstadoPedido).optional(),
  fechaCreacion: z.object({
    from: z.date(),
    to: z.date().optional(),
  }).optional(),
  fechaEntrega: z.object({
    from: z.date(),
    to: z.date().optional(),
  }).optional(),
  montoMinimo: z.number().optional(),
  montoMaximo: z.number().optional(),
  tieneObservaciones: z.boolean().optional(),
  soloVencidos: z.boolean().optional(),
  soloSinRecibir: z.boolean().optional(),
  soloUrgentes: z.boolean().optional(),
  coherenciaMinima: z.number().optional(),
})

type FiltrosForm = z.infer<typeof filtrosSchema>

interface PedidoEquipoFiltersProps {
  filtros: FiltrosPedidoEquipo
  onFiltrosChange: (filtros: FiltrosPedidoEquipo) => void
  proyectos?: Array<{ id: string; nombre: string; codigo: string }>
  proveedores?: Array<{ id: string; nombre: string; ruc?: string }>
  loading?: boolean
  className?: string
  showQuickFilters?: boolean
}

export const PedidoEquipoFilters: React.FC<PedidoEquipoFiltersProps> = ({
  filtros,
  onFiltrosChange,
  proyectos = [],
  proveedores = [],
  loading = false,
  className = '',
  showQuickFilters = true,
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false)

  const form = useForm<FiltrosForm>({
    resolver: zodResolver(filtrosSchema),
    defaultValues: {
      busqueda: filtros.busqueda || '',
      proyectoId: filtros.proyectoId || 'all',
      proveedorId: filtros.proveedorId || 'all',
      estado: filtros.estado || undefined,
      fechaCreacion: filtros.fechaCreacion ? {
        from: filtros.fechaCreacion.from,
        to: filtros.fechaCreacion.to,
      } : undefined,
      montoMinimo: filtros.montoMinimo,
      montoMaximo: filtros.montoMaximo,
      soloVencidos: filtros.soloVencidos,
      soloSinRecibir: filtros.soloSinRecibir,
      soloUrgentes: filtros.soloUrgentes,
    },
  })

  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; value: string }> = []
    if (filtros.busqueda) filters.push({ key: 'busqueda', label: 'Búsqueda', value: filtros.busqueda })
    if (filtros.proyectoId) {
      const proyecto = proyectos.find(p => p.id === filtros.proyectoId)
      filters.push({ key: 'proyectoId', label: 'Proyecto', value: proyecto?.codigo || filtros.proyectoId })
    }
    if (filtros.proveedorId) {
      const proveedor = proveedores.find(p => p.id === filtros.proveedorId)
      filters.push({ key: 'proveedorId', label: 'Proveedor', value: proveedor?.nombre || filtros.proveedorId })
    }
    if (filtros.estado) filters.push({ key: 'estado', label: 'Estado', value: filtros.estado })
    if (filtros.soloVencidos) filters.push({ key: 'soloVencidos', label: 'Vencidos', value: 'Sí' })
    if (filtros.soloSinRecibir) filters.push({ key: 'soloSinRecibir', label: 'Sin recibir', value: 'Sí' })
    if (filtros.soloUrgentes) filters.push({ key: 'soloUrgentes', label: 'Urgentes', value: 'Sí' })
    return filters
  }, [filtros, proyectos, proveedores])

  const handleQuickFilter = (type: string) => {
    const newFiltros = { ...filtros }
    switch (type) {
      case 'vencidos':
        newFiltros.soloVencidos = !filtros.soloVencidos
        break
      case 'sin-recibir':
        newFiltros.soloSinRecibir = !filtros.soloSinRecibir
        break
      case 'urgentes':
        newFiltros.soloUrgentes = !filtros.soloUrgentes
        break
      case 'pendientes':
        newFiltros.estado = filtros.estado === EstadoPedido.enviado ? undefined : EstadoPedido.enviado
        break
      case 'en-transito':
        newFiltros.estado = filtros.estado === EstadoPedido.atendido ? undefined : EstadoPedido.atendido
        break
    }
    onFiltrosChange(newFiltros)
  }

  const handleRemoveFilter = (key: string) => {
    const newFiltros = { ...filtros }
    delete (newFiltros as any)[key]
    onFiltrosChange(newFiltros)
  }

  const handleReset = () => {
    form.reset({
      busqueda: '',
      proyectoId: 'all',
      proveedorId: 'all',
      estado: undefined,
    })
    onFiltrosChange({})
  }

  const handleFieldChange = (field: string, value: any) => {
    const newFiltros = { ...filtros }
    if (value === 'all' || value === '' || value === undefined) {
      delete (newFiltros as any)[field]
    } else {
      (newFiltros as any)[field] = value
    }
    onFiltrosChange(newFiltros)
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Main filters row */}
      <div className="flex flex-col sm:flex-row gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar código o descripción..."
            className="pl-8 h-9"
            value={form.watch('busqueda') || ''}
            onChange={(e) => {
              form.setValue('busqueda', e.target.value)
              handleFieldChange('busqueda', e.target.value)
            }}
          />
        </div>

        {/* Proyecto */}
        <Select
          value={form.watch('proyectoId') || 'all'}
          onValueChange={(value) => {
            form.setValue('proyectoId', value)
            handleFieldChange('proyectoId', value)
          }}
        >
          <SelectTrigger className="w-full sm:w-48 h-9">
            <SelectValue placeholder="Todos los proyectos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los proyectos</SelectItem>
            {proyectos.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span className="font-medium">{p.codigo}</span>
                <span className="text-muted-foreground ml-1.5 text-xs">{p.nombre}</span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Estado */}
        <Select
          value={form.watch('estado') || 'all'}
          onValueChange={(value) => {
            form.setValue('estado', value === 'all' ? undefined : value as EstadoPedido)
            handleFieldChange('estado', value === 'all' ? undefined : value)
          }}
        >
          <SelectTrigger className="w-full sm:w-40 h-9">
            <SelectValue placeholder="Todos los estados" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value={EstadoPedido.borrador}>Borrador</SelectItem>
            <SelectItem value={EstadoPedido.enviado}>Enviado</SelectItem>
            <SelectItem value={EstadoPedido.atendido}>Atendido</SelectItem>
            <SelectItem value={EstadoPedido.parcial}>Parcial</SelectItem>
            <SelectItem value={EstadoPedido.entregado}>Entregado</SelectItem>
            <SelectItem value={EstadoPedido.cancelado}>Cancelado</SelectItem>
          </SelectContent>
        </Select>

        {/* Advanced toggle */}
        <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <ChevronDown className={`h-3 w-3 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
            </Button>
          </CollapsibleTrigger>
        </Collapsible>

        {/* Reset */}
        {activeFilters.length > 0 && (
          <Button variant="ghost" size="sm" className="h-9" onClick={handleReset}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {/* Quick filters */}
      {showQuickFilters && (
        <div className="flex flex-wrap gap-1.5">
          <Button
            variant={filtros.soloVencidos ? 'destructive' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => handleQuickFilter('vencidos')}
          >
            <Clock className="h-3 w-3" />
            Vencidos
          </Button>
          <Button
            variant={filtros.soloSinRecibir ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => handleQuickFilter('sin-recibir')}
          >
            <Package className="h-3 w-3" />
            Sin Recibir
          </Button>
          <Button
            variant={filtros.soloUrgentes ? 'destructive' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => handleQuickFilter('urgentes')}
          >
            <Zap className="h-3 w-3" />
            Urgentes
          </Button>
          <Button
            variant={filtros.estado === EstadoPedido.enviado ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => handleQuickFilter('pendientes')}
          >
            <Clock className="h-3 w-3" />
            Pendientes
          </Button>
          <Button
            variant={filtros.estado === EstadoPedido.atendido ? 'default' : 'outline'}
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => handleQuickFilter('en-transito')}
          >
            <Truck className="h-3 w-3" />
            En Tránsito
          </Button>
        </div>
      )}

      {/* Advanced filters */}
      <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
        <CollapsibleContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-2 border-t">
            {/* Fecha Creación */}
            <div className="col-span-2 md:col-span-1">
              <label className="text-xs text-muted-foreground mb-1 block">Fecha Creación</label>
              <DatePickerWithRange
                date={form.watch('fechaCreacion')}
                onDateChange={(date) => {
                  const validDate = date?.from ? { from: date.from, to: date.to } : undefined
                  form.setValue('fechaCreacion', validDate)
                  handleFieldChange('fechaCreacion', validDate)
                }}
                placeholder="Rango..."
              />
            </div>

            {/* Monto Min */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Monto Mín.</label>
              <div className="relative">
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="0"
                  className="pl-7 h-9"
                  value={form.watch('montoMinimo') || ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined
                    form.setValue('montoMinimo', val)
                    handleFieldChange('montoMinimo', val)
                  }}
                />
              </div>
            </div>

            {/* Monto Max */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Monto Máx.</label>
              <div className="relative">
                <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="Sin límite"
                  className="pl-7 h-9"
                  value={form.watch('montoMaximo') || ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined
                    form.setValue('montoMaximo', val)
                    handleFieldChange('montoMaximo', val)
                  }}
                />
              </div>
            </div>

            {/* Coherencia */}
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Coherencia Mín.</label>
              <div className="relative">
                <AlertCircle className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="number"
                  placeholder="0%"
                  min="0"
                  max="100"
                  className="pl-7 h-9"
                  value={form.watch('coherenciaMinima') || ''}
                  onChange={(e) => {
                    const val = e.target.value ? Number(e.target.value) : undefined
                    form.setValue('coherenciaMinima', val)
                    handleFieldChange('coherenciaMinima', val)
                  }}
                />
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Active filters badges */}
      {activeFilters.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {activeFilters.map((filter) => (
            <Badge key={filter.key} variant="secondary" className="text-xs gap-1 pr-1">
              {filter.label}: {filter.value}
              <button
                onClick={() => handleRemoveFilter(filter.key)}
                className="ml-0.5 hover:bg-secondary-foreground/20 rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

export default PedidoEquipoFilters
