/**
 * 🔍 PedidoEquipoFilters Component
 * 
 * Componente de filtros específicos para pedidos de equipos de aprovisionamiento.
 * Incluye filtros por proyecto, proveedor, estado, fechas y montos.
 * 
 * Features:
 * - Filtros por proyecto y proveedor
 * - Estados de pedido específicos
 * - Rangos de fechas y montos
 * - Filtros por coherencia con listas
 * - Búsqueda por texto
 * - Filtros rápidos predefinidos
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertCircle,
  Building,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Filter,
  Package,
  RefreshCw,
  Search,
  ShoppingCart,
  Truck,
  X,
  Zap,
} from 'lucide-react';
// Removed framer-motion imports as they were causing ref conflicts with Radix UI
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import type { FiltrosPedidoEquipo } from '@/types/aprovisionamiento';
import { EstadoPedido } from '@prisma/client';

// ✅ Form schema
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
});

type FiltrosForm = z.infer<typeof filtrosSchema>;

// ✅ Props interface
interface PedidoEquipoFiltersProps {
  filtros: FiltrosPedidoEquipo;
  onFiltrosChange: (filtros: FiltrosPedidoEquipo) => void;
  proyectos?: Array<{ id: string; nombre: string; codigo: string }>;
  proveedores?: Array<{ id: string; nombre: string; ruc?: string }>;
  loading?: boolean;
  className?: string;
  showQuickFilters?: boolean;
}

// ✅ Quick filter button
const QuickFilterButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick: () => void;
  variant?: 'default' | 'warning' | 'danger';
}> = ({ label, icon, active, onClick, variant = 'default' }) => {
  const getVariant = () => {
    if (active) {
      switch (variant) {
        case 'warning': return 'default';
        case 'danger': return 'destructive';
        default: return 'default';
      }
    }
    return 'outline';
  };

  return (
    <Button
      variant={getVariant()}
      size="sm"
      onClick={onClick}
      className="flex items-center gap-1"
    >
      {icon}
      {label}
    </Button>
  );
};

// ✅ Filter badge component
const FilterBadge: React.FC<{
  label: string;
  value: string;
  onRemove: () => void;
}> = ({ label, value, onRemove }) => (
  <Badge variant="secondary" className="flex items-center gap-1">
    <span className="text-xs">{label}: {value}</span>
    <button
      onClick={onRemove}
      className="ml-1 hover:bg-secondary-foreground/20 rounded-full p-0.5"
    >
      <X className="w-3 h-3" />
    </button>
  </Badge>
);

// ✅ Main component
export const PedidoEquipoFilters: React.FC<PedidoEquipoFiltersProps> = ({
  filtros,
  onFiltrosChange,
  proyectos = [],
  proveedores = [],
  loading = false,
  className = '',
  showQuickFilters = true,
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);


  // 🔁 Form setup
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
      fechaEntrega: filtros.fechaEntrega ? {
        from: filtros.fechaEntrega.from,
        to: filtros.fechaEntrega.to,
      } : undefined,
      montoMinimo: filtros.montoMinimo,
      montoMaximo: filtros.montoMaximo,
      tieneObservaciones: filtros.tieneObservaciones,
      soloVencidos: filtros.soloVencidos,
      soloSinRecibir: filtros.soloSinRecibir,
      soloUrgentes: filtros.soloUrgentes,
      coherenciaMinima: filtros.coherenciaMinima,
    },
  });

  // 🔁 Update active filters using useMemo to prevent infinite loops
  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; value: string }> = [];

    if (filtros.busqueda) {
      filters.push({ key: 'busqueda', label: 'Búsqueda', value: filtros.busqueda });
    }
    if (filtros.proyectoId) {
      const proyecto = proyectos.find(p => p.id === filtros.proyectoId);
      filters.push({ key: 'proyectoId', label: 'Proyecto', value: proyecto?.nombre || filtros.proyectoId });
    }
    if (filtros.proveedorId) {
      const proveedor = proveedores.find(p => p.id === filtros.proveedorId);
      filters.push({ key: 'proveedorId', label: 'Proveedor', value: proveedor?.nombre || filtros.proveedorId });
    }
    if (filtros.estado) {
      filters.push({ key: 'estado', label: 'Estado', value: filtros.estado });
    }
    if (filtros.montoMinimo) {
      filters.push({ key: 'montoMinimo', label: 'Monto mín.', value: `S/ ${filtros.montoMinimo.toLocaleString()}` });
    }
    if (filtros.montoMaximo) {
      filters.push({ key: 'montoMaximo', label: 'Monto máx.', value: `S/ ${filtros.montoMaximo.toLocaleString()}` });
    }
    if (filtros.tieneObservaciones) {
      filters.push({ key: 'tieneObservaciones', label: 'Con observaciones', value: 'Sí' });
    }
    if (filtros.soloVencidos) {
      filters.push({ key: 'soloVencidos', label: 'Solo vencidos', value: 'Sí' });
    }
    if (filtros.soloSinRecibir) {
      filters.push({ key: 'soloSinRecibir', label: 'Sin recibir', value: 'Sí' });
    }
    if (filtros.soloUrgentes) {
      filters.push({ key: 'soloUrgentes', label: 'Urgentes', value: 'Sí' });
    }
    if (filtros.coherenciaMinima) {
      filters.push({ key: 'coherenciaMinima', label: 'Coherencia mín.', value: `${filtros.coherenciaMinima}%` });
    }

    return filters;
  }, [filtros, proyectos, proveedores]);

  // 🔁 Quick filter handlers
  const handleQuickFilter = (type: string) => {
    const newFiltros = { ...filtros };
    
    switch (type) {
      case 'vencidos':
        newFiltros.soloVencidos = !filtros.soloVencidos;
        form.setValue('soloVencidos', newFiltros.soloVencidos);
        break;
      case 'sin-recibir':
        newFiltros.soloSinRecibir = !filtros.soloSinRecibir;
        form.setValue('soloSinRecibir', newFiltros.soloSinRecibir);
        break;
      case 'urgentes':
        newFiltros.soloUrgentes = !filtros.soloUrgentes;
        form.setValue('soloUrgentes', newFiltros.soloUrgentes);
        break;
      case 'con-observaciones':
        newFiltros.tieneObservaciones = !filtros.tieneObservaciones;
        form.setValue('tieneObservaciones', newFiltros.tieneObservaciones);
        break;
      case 'pendientes':
        newFiltros.estado = filtros.estado === EstadoPedido.enviado ? undefined : EstadoPedido.enviado;
        form.setValue('estado', newFiltros.estado);
        break;
      case 'en-transito':
        newFiltros.estado = filtros.estado === EstadoPedido.atendido ? undefined : EstadoPedido.atendido;
        form.setValue('estado', newFiltros.estado);
        break;
    }
    
    onFiltrosChange(newFiltros);
  };

  // 🔁 Handle form submission
  const onSubmit = (data: FiltrosForm) => {
    const newFiltros: FiltrosPedidoEquipo = {
      ...filtros,
      busqueda: data.busqueda || undefined,
      proyectoId: data.proyectoId === 'all' ? undefined : data.proyectoId,
      proveedorId: data.proveedorId === 'all' ? undefined : data.proveedorId,
      estado: data.estado,
      fechaCreacion: data.fechaCreacion?.from ? {
        from: data.fechaCreacion.from,
        to: data.fechaCreacion.to || data.fechaCreacion.from,
      } : undefined,
      fechaEntrega: data.fechaEntrega?.from ? {
        from: data.fechaEntrega.from,
        to: data.fechaEntrega.to || data.fechaEntrega.from,
      } : undefined,
      montoMinimo: data.montoMinimo,
      montoMaximo: data.montoMaximo,
      tieneObservaciones: data.tieneObservaciones,
      soloVencidos: data.soloVencidos,
      soloSinRecibir: data.soloSinRecibir,
      soloUrgentes: data.soloUrgentes,
      coherenciaMinima: data.coherenciaMinima,
    };

    onFiltrosChange(newFiltros);
  };

  // 🔁 Handle filter removal
  const handleRemoveFilter = (key: string) => {
    const newFiltros = { ...filtros };
    delete (newFiltros as any)[key];
    
    // Reset form field
    if (key === 'proyectoId' || key === 'proveedorId') {
      form.setValue(key as any, 'all');
    } else if (key === 'estado') {
      form.setValue('estado', undefined);
    } else {
      form.setValue(key as any, key.includes('fecha') ? undefined : key.startsWith('solo') || key === 'tieneObservaciones' ? false : undefined);
    }
    
    onFiltrosChange(newFiltros);
  };

  // 🔁 Handle reset
  const handleReset = () => {
    form.reset({
      busqueda: '',
      proyectoId: 'all',
      proveedorId: 'all',
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
    });
    
    onFiltrosChange({});
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              Filtros de Pedidos
            </CardTitle>
            <CardDescription>
              Filtra pedidos de equipos por proyecto, proveedor y estado
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            disabled={loading}
          >
            <RefreshCw className="w-4 h-4 mr-1" />
            Limpiar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Quick Filters */}
        {showQuickFilters && (
          <div className="space-y-2">
            <Label className="text-sm font-medium">Filtros Rápidos:</Label>
            <div className="flex flex-wrap gap-2">
              <QuickFilterButton
                label="Vencidos"
                icon={<Clock className="w-3 h-3" />}
                active={!!filtros.soloVencidos}
                onClick={() => handleQuickFilter('vencidos')}
                variant="danger"
              />
              <QuickFilterButton
                label="Sin Recibir"
                icon={<Package className="w-3 h-3" />}
                active={!!filtros.soloSinRecibir}
                onClick={() => handleQuickFilter('sin-recibir')}
                variant="warning"
              />
              <QuickFilterButton
                label="Urgentes"
                icon={<Zap className="w-3 h-3" />}
                active={!!filtros.soloUrgentes}
                onClick={() => handleQuickFilter('urgentes')}
                variant="danger"
              />
              <QuickFilterButton
                label="Con Observaciones"
                icon={<AlertCircle className="w-3 h-3" />}
                active={!!filtros.tieneObservaciones}
                onClick={() => handleQuickFilter('con-observaciones')}
              />
              <QuickFilterButton
                label="Pendientes"
                icon={<Clock className="w-3 h-3" />}
                active={filtros.estado === EstadoPedido.enviado}
                onClick={() => handleQuickFilter('pendientes')}
              />
              <QuickFilterButton
                label="En Tránsito"
                icon={<Truck className="w-3 h-3" />}
                active={filtros.estado === EstadoPedido.atendido}
                onClick={() => handleQuickFilter('en-transito')}
              />
            </div>
          </div>
        )}

        <Separator />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <FormField
                control={form.control}
                name="busqueda"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Búsqueda</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Código o descripción..."
                          className="pl-8"
                          {...field}
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
                            {proyecto.codigo} - {proyecto.nombre}
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
                            {proveedor.nombre} {proveedor.ruc && `(${proveedor.ruc})`}
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
                    <Select 
                      onValueChange={(value) => field.onChange(value === 'all' ? undefined : value)} 
                      value={field.value || 'all'}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Todos los estados" />
                        </SelectTrigger>
                      </FormControl>
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Advanced Filters */}
            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="w-full justify-between">
                  <span>Filtros Avanzados</span>
                  {isAdvancedOpen ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>
              
              <CollapsibleContent className="space-y-4 pt-4">
                {isAdvancedOpen && (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                      {/* Date Ranges */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="fechaCreacion"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rango Fecha Creación</FormLabel>
                              <FormControl>
                                <DatePickerWithRange
                                  date={field.value}
                                  onDateChange={field.onChange}
                                  placeholder="Seleccionar rango..."
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="fechaEntrega"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Rango Fecha Entrega</FormLabel>
                              <FormControl>
                                <DatePickerWithRange
                                  date={field.value}
                                  onDateChange={field.onChange}
                                  placeholder="Seleccionar rango..."
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Amount Ranges */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="montoMinimo"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Monto Mínimo (PEN)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    className="pl-8"
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
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
                              <FormLabel>Monto Máximo (PEN)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type="number"
                                    placeholder="Sin límite"
                                    className="pl-8"
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      {/* Coherence Filter */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="coherenciaMinima"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Coherencia Mínima (%)</FormLabel>
                              <FormControl>
                                <div className="relative">
                                  <AlertCircle className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    min="0"
                                    max="100"
                                    className="pl-8"
                                    {...field}
                                    onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                                  />
                                </div>
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                  </div>
                )}
              </CollapsibleContent>
            </Collapsible>

            {/* Apply Button */}
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Filter className="w-4 h-4 mr-2" />
                )}
                Aplicar Filtros
              </Button>
            </div>
          </form>
        </Form>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              <Label className="text-sm font-medium">Filtros Activos:</Label>
              <div className="flex flex-wrap gap-2">
                {activeFilters.map((filter) => (
                  <FilterBadge
                    key={filter.key}
                    label={filter.label}
                    value={filter.value}
                    onRemove={() => handleRemoveFilter(filter.key)}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default PedidoEquipoFilters;