/**
 * 🔍 ListaEquipoFilters Component
 * 
 * Componente de filtros específicos para listas de equipos de aprovisionamiento.
 * Incluye filtros por proyecto, estado, fechas, montos y coherencia.
 * 
 * Features:
 * - Filtros por proyecto y estado
 * - Rangos de fechas y montos
 * - Filtros por coherencia
 * - Búsqueda por texto
 * - Filtros rápidos predefinidos
 * - Reset y aplicación
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
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
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  FileText,
  Filter,
  Package,
  RefreshCw,
  Search,
  X,
  Zap,
} from 'lucide-react';
// Removed framer-motion imports as they were causing ref conflicts with Radix UI
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import type { FiltrosListaEquipo } from '@/types/aprovisionamiento';
import type { EstadoListaEquipo } from '@/types/modelos';

// 🔧 Zod schema for form validation
const filtrosSchema = z.object({
  busqueda: z.string().optional(),
  proyectoId: z.string().optional(),
  estado: z.enum(['all', 'borrador', 'por_revisar', 'por_cotizar', 'por_validar', 'por_aprobar', 'aprobado', 'rechazado']).optional(),
  fechaCreacion: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
  fechaEntrega: z.object({
    from: z.date().optional(),
    to: z.date().optional(),
  }).optional(),
  montoMinimo: z.number().optional(),
  montoMaximo: z.number().optional(),
  tieneObservaciones: z.boolean().optional(),
  soloVencidas: z.boolean().optional(),
  soloSinPedidos: z.boolean().optional(),
  coherenciaMinima: z.number().optional(),
});

type FiltrosForm = z.infer<typeof filtrosSchema>;

// ✅ Props interface
interface ListaEquipoFiltersProps {
  filtros: FiltrosListaEquipo;
  onFiltrosChange: (filtros: FiltrosListaEquipo) => void;
  proyectos?: Array<{ id: string; nombre: string; codigo: string }>;
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
}> = ({ label, icon, active, onClick }) => (
  <Button
    variant={active ? 'default' : 'outline'}
    size="sm"
    onClick={onClick}
    className="flex items-center gap-1"
  >
    {icon}
    {label}
  </Button>
);

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
export const ListaEquipoFilters: React.FC<ListaEquipoFiltersProps> = ({
  filtros,
  onFiltrosChange,
  proyectos = [],
  loading = false,
  className = '',
  showQuickFilters = true,
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Array<{ key: string; label: string; value: string }>>([]);

  // 🔁 Form setup
  const form = useForm<FiltrosForm>({
    resolver: zodResolver(filtrosSchema),
    defaultValues: {
      busqueda: filtros.busqueda || '',
      proyectoId: filtros.proyectoId || 'all',
      estado: filtros.estado || 'all',
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
      soloVencidas: filtros.soloVencidas,
      soloSinPedidos: filtros.soloSinPedidos,
      coherenciaMinima: filtros.coherenciaMinima,
    },
  });

  // 🔁 Update active filters
  useEffect(() => {
    const filters: Array<{ key: string; label: string; value: string }> = [];

    if (filtros.busqueda) {
      filters.push({ key: 'busqueda', label: 'Búsqueda', value: filtros.busqueda });
    }
    if (filtros.proyectoId) {
      const proyecto = proyectos.find(p => p.id === filtros.proyectoId);
      filters.push({ key: 'proyectoId', label: 'Proyecto', value: proyecto?.nombre || filtros.proyectoId });
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
    if (filtros.soloVencidas) {
      filters.push({ key: 'soloVencidas', label: 'Solo vencidas', value: 'Sí' });
    }
    if (filtros.soloSinPedidos) {
      filters.push({ key: 'soloSinPedidos', label: 'Sin pedidos', value: 'Sí' });
    }
    if (filtros.coherenciaMinima) {
      filters.push({ key: 'coherenciaMinima', label: 'Coherencia mín.', value: `${filtros.coherenciaMinima}%` });
    }

    setActiveFilters(filters);
  }, [filtros, proyectos]);

  // 🔁 Quick filter handlers
  const handleQuickFilter = (type: string) => {
    const newFiltros = { ...filtros };
    
    switch (type) {
      case 'vencidas':
        newFiltros.soloVencidas = !filtros.soloVencidas;
        form.setValue('soloVencidas', newFiltros.soloVencidas);
        break;
      case 'sin-pedidos':
        newFiltros.soloSinPedidos = !filtros.soloSinPedidos;
        form.setValue('soloSinPedidos', newFiltros.soloSinPedidos);
        break;
      case 'con-observaciones':
        newFiltros.tieneObservaciones = !filtros.tieneObservaciones;
        form.setValue('tieneObservaciones', newFiltros.tieneObservaciones);
        break;
      case 'pendientes':
        newFiltros.estado = filtros.estado === 'borrador' ? undefined : 'borrador';
        form.setValue('estado', newFiltros.estado || 'all');
        break;
    }
    
    onFiltrosChange(newFiltros);
  };

  // 🔁 Handle form submission
  const onSubmit = (data: FiltrosForm) => {
    const newFiltros: FiltrosListaEquipo = {
      ...filtros,
      busqueda: data.busqueda || undefined,
      proyectoId: data.proyectoId === 'all' ? undefined : data.proyectoId,
      estado: data.estado === 'all' ? undefined : (data.estado as EstadoListaEquipo),
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
      soloVencidas: data.soloVencidas,
      soloSinPedidos: data.soloSinPedidos,
      coherenciaMinima: data.coherenciaMinima,
    };

    onFiltrosChange(newFiltros);
  };

  // 🔁 Handle filter removal
  const handleRemoveFilter = (key: string) => {
    const newFiltros = { ...filtros };
    delete (newFiltros as any)[key];
    
    // Reset form field
    if (key === 'proyectoId' || key === 'estado') {
      form.setValue(key as any, 'all');
    } else if (key.includes('fecha')) {
      form.setValue(key as any, undefined);
    } else if (key.startsWith('solo') || key === 'tieneObservaciones') {
      form.setValue(key as any, false);
    } else {
      form.setValue(key as any, undefined);
    }
    
    onFiltrosChange(newFiltros);
  };

  // 🔁 Handle reset
  const handleReset = () => {
    form.reset({
      busqueda: '',
      proyectoId: 'all',
      estado: 'all',
      fechaCreacion: undefined,
      fechaEntrega: undefined,
      montoMinimo: undefined,
      montoMaximo: undefined,
      tieneObservaciones: false,
      soloVencidas: false,
      soloSinPedidos: false,
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
              <FileText className="w-5 h-5" />
              Filtros de Listas
            </CardTitle>
            <CardDescription>
              Filtra listas de equipos por proyecto, estado y fechas
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
                label="Vencidas"
                icon={<Clock className="w-3 h-3" />}
                active={!!filtros.soloVencidas}
                onClick={() => handleQuickFilter('vencidas')}
              />
              <QuickFilterButton
                label="Sin Pedidos"
                icon={<Package className="w-3 h-3" />}
                active={!!filtros.soloSinPedidos}
                onClick={() => handleQuickFilter('sin-pedidos')}
              />
              <QuickFilterButton
                label="Con Observaciones"
                icon={<AlertCircle className="w-3 h-3" />}
                active={!!filtros.tieneObservaciones}
                onClick={() => handleQuickFilter('con-observaciones')}
              />
              <QuickFilterButton
                label="Pendientes"
                icon={<Zap className="w-3 h-3" />}
                active={filtros.estado === 'borrador'}
                onClick={() => handleQuickFilter('pendientes')}
              />
            </div>
          </div>
        )}

        <Separator />

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        <SelectItem value="borrador">Borrador</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="aprobada">Aprobada</SelectItem>
                        <SelectItem value="rechazada">Rechazada</SelectItem>
                        <SelectItem value="vencida">Vencida</SelectItem>
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
                                  date={field.value as DateRange | undefined}
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
                                  date={field.value as DateRange | undefined}
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

export default ListaEquipoFilters;