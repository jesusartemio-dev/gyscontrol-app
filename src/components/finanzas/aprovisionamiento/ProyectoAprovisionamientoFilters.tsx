'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
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
  DollarSign,
  Filter,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
  Users,
  X,
} from 'lucide-react';
// ✅ Framer Motion removido - conflictos con Radix UI refs
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import type { FiltrosProyectoAprovisionamiento } from '@/types/aprovisionamiento';

// ✅ Schema de validación con Zod
const filtrosSchema = z.object({
  busqueda: z.string().optional(),
  estado: z.union([z.literal('all'), z.string()]).optional(),
  estadoAprovisionamiento: z.union([z.literal('all'), z.string()]).optional(),
  comercialId: z.union([z.literal('all'), z.string()]).optional(),
  fechaInicio: z.object({
    desde: z.string(),
    hasta: z.string(),
  }).optional(),
  fechaFin: z.object({
    desde: z.string(),
    hasta: z.string(),
  }).optional(),
  montoMinimo: z.number().optional(),
  montoMaximo: z.number().optional(),
  desviacionMinima: z.number().optional(),
  desviacionMaxima: z.number().optional(),
  coherenciaMinima: z.number().optional(),
  soloConAlertas: z.boolean().optional(),
  incluirCompletados: z.boolean().optional(),
});

type FiltrosForm = z.infer<typeof filtrosSchema>;

// ✅ Props del componente
interface ProyectoAprovisionamientoFiltersProps {
  filtros: FiltrosProyectoAprovisionamiento;
  onFiltrosChange: (filtros: FiltrosProyectoAprovisionamiento) => void;
  comerciales?: Array<{ id: string; nombre: string }>;
  loading?: boolean;
  className?: string;
  showAdvanced?: boolean;
}

// ✅ Componente FilterBadge sin refs problemáticos
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

// ✅ Componente principal sin useRef problemático
// Helper functions to convert between date formats
const convertToDateRange = (dateObj?: { desde: string; hasta: string }): DateRange | undefined => {
  if (!dateObj) return undefined;
  return {
    from: dateObj.desde ? new Date(dateObj.desde) : undefined,
    to: dateObj.hasta ? new Date(dateObj.hasta) : undefined,
  };
};

const convertFromDateRange = (dateRange?: DateRange): { desde: string; hasta: string } | undefined => {
  if (!dateRange || (!dateRange.from && !dateRange.to)) return undefined;
  return {
    desde: dateRange.from ? dateRange.from.toISOString().split('T')[0] : '',
    hasta: dateRange.to ? dateRange.to.toISOString().split('T')[0] : '',
  };
};

export const ProyectoAprovisionamientoFilters: React.FC<ProyectoAprovisionamientoFiltersProps> = ({
  filtros,
  onFiltrosChange,
  comerciales = [],
  loading = false,
  className = '',
  showAdvanced = false,
}) => {
  // 📡 Estados locales simples
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(showAdvanced);
  const [isUpdating, setIsUpdating] = useState(false);

  // 🔁 Form setup con react-hook-form
  const form = useForm<FiltrosForm>({
    resolver: zodResolver(filtrosSchema),
    defaultValues: {
       busqueda: filtros.busqueda || '',
       estado: filtros.estado || 'all',
       estadoAprovisionamiento: filtros.estadoAprovisionamiento || 'all',
       comercialId: filtros.comercialId || 'all',
      fechaInicio: filtros.fechaInicio,
      fechaFin: filtros.fechaFin,
      montoMinimo: filtros.montoMinimo,
      montoMaximo: filtros.montoMaximo,
      desviacionMinima: filtros.desviacionMinima,
      desviacionMaxima: filtros.desviacionMaxima,
      coherenciaMinima: filtros.coherenciaMinima,
      soloConAlertas: filtros.soloConAlertas || false,
      incluirCompletados: filtros.incluirCompletados || false,
    },
  });

  // ✅ Sincronización simplificada sin useRef
  useEffect(() => {
    if (!isUpdating) {
      form.reset({
         busqueda: filtros.busqueda || '',
         estado: filtros.estado || 'all',
         estadoAprovisionamiento: filtros.estadoAprovisionamiento || 'all',
         comercialId: filtros.comercialId || 'all',
        fechaInicio: filtros.fechaInicio,
        fechaFin: filtros.fechaFin,
        montoMinimo: filtros.montoMinimo,
        montoMaximo: filtros.montoMaximo,
        desviacionMinima: filtros.desviacionMinima,
        desviacionMaxima: filtros.desviacionMaxima,
        coherenciaMinima: filtros.coherenciaMinima,
        soloConAlertas: filtros.soloConAlertas || false,
        incluirCompletados: filtros.incluirCompletados || false,
      });
    }
  }, [filtros, form, isUpdating]);

  // 📡 Filtros activos computados
  const activeFilters = useMemo(() => {
    const filters: Array<{ key: string; label: string; value: string }> = [];

    if (filtros.busqueda) {
      filters.push({ key: 'busqueda', label: 'Búsqueda', value: filtros.busqueda });
    }
    if (filtros.estado) {
      filters.push({ key: 'estado', label: 'Estado', value: filtros.estado });
    }
    if (filtros.estadoAprovisionamiento) {
      filters.push({ key: 'estadoAprovisionamiento', label: 'Estado Aprovisionamiento', value: filtros.estadoAprovisionamiento });
    }
    if (filtros.comercialId) {
      const comercial = comerciales.find(c => c.id === filtros.comercialId);
      filters.push({ key: 'comercialId', label: 'Comercial', value: comercial?.nombre || filtros.comercialId });
    }
    if (filtros.montoMinimo !== undefined) {
      filters.push({ key: 'montoMinimo', label: 'Monto Mín.', value: `$${filtros.montoMinimo.toLocaleString()}` });
    }
    if (filtros.montoMaximo !== undefined) {
      filters.push({ key: 'montoMaximo', label: 'Monto Máx.', value: `$${filtros.montoMaximo.toLocaleString()}` });
    }
    if (filtros.coherenciaMinima !== undefined) {
      filters.push({ key: 'coherenciaMinima', label: 'Coherencia Mín.', value: `${filtros.coherenciaMinima}%` });
    }
    if (filtros.soloConAlertas) {
      filters.push({ key: 'soloConAlertas', label: 'Solo con Alertas', value: 'Sí' });
    }
    if (filtros.incluirCompletados) {
      filters.push({ key: 'incluirCompletados', label: 'Incluir Completados', value: 'Sí' });
    }

    return filters;
  }, [filtros, comerciales]);

  // 🔁 Handlers simplificados
  const onSubmit = useCallback(async (data: FiltrosForm) => {
    setIsUpdating(true);
    
    const newFiltros: FiltrosProyectoAprovisionamiento = {
       busqueda: data.busqueda || undefined,
       estado: data.estado === 'all' ? undefined : data.estado,
       estadoAprovisionamiento: data.estadoAprovisionamiento === 'all' ? undefined : data.estadoAprovisionamiento,
       comercialId: data.comercialId === 'all' ? undefined : data.comercialId,
      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin,
      montoMinimo: data.montoMinimo,
      montoMaximo: data.montoMaximo,
      desviacionMinima: data.desviacionMinima,
      desviacionMaxima: data.desviacionMaxima,
      coherenciaMinima: data.coherenciaMinima,
      soloConAlertas: data.soloConAlertas,
      incluirCompletados: data.incluirCompletados,
    };

    onFiltrosChange(newFiltros);
    
    // ✅ Timeout para evitar bucles
    setTimeout(() => setIsUpdating(false), 100);
  }, [onFiltrosChange]);

  const handleRemoveFilter = useCallback((key: string) => {
    setIsUpdating(true);
    
    const newFiltros = { ...filtros };
    delete (newFiltros as any)[key];
    
    onFiltrosChange(newFiltros);
    
    setTimeout(() => setIsUpdating(false), 100);
  }, [filtros, onFiltrosChange]);

  const handleReset = useCallback(() => {
    setIsUpdating(true);
    
    const emptyFiltros: FiltrosProyectoAprovisionamiento = {
       busqueda: undefined,
       estado: undefined,
       estadoAprovisionamiento: undefined,
       comercialId: undefined,
      fechaInicio: undefined,
      fechaFin: undefined,
      montoMinimo: undefined,
      montoMaximo: undefined,
      desviacionMinima: undefined,
      desviacionMaxima: undefined,
      coherenciaMinima: undefined,
      soloConAlertas: undefined,
      incluirCompletados: undefined,
    };
    
    onFiltrosChange(emptyFiltros);
    
    setTimeout(() => setIsUpdating(false), 100);
  }, [onFiltrosChange]);

  return (
    <Card className={`w-full ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="w-5 h-5" />
          Filtros de Búsqueda
        </CardTitle>
        <CardDescription>
          Filtra y busca proyectos de aprovisionamiento según tus criterios
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Búsqueda */}
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
                          placeholder="Buscar por nombre, código..."
                          className="pl-8"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Estado del Proyecto */}
              <FormField
                control={form.control}
                name="estado"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado del Proyecto</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          <SelectItem value="all">Todos los estados</SelectItem>
                          <SelectItem value="en_planificacion">En Planificación</SelectItem>
                          <SelectItem value="en_progreso">En Progreso</SelectItem>
                          <SelectItem value="completado">Completado</SelectItem>
                          <SelectItem value="pausado">Pausado</SelectItem>
                          <SelectItem value="cancelado">Cancelado</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Estado de Aprovisionamiento */}
              <FormField
                control={form.control}
                name="estadoAprovisionamiento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estado de Aprovisionamiento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar estado" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                          <SelectItem value="all">Todos los estados</SelectItem>
                          <SelectItem value="pendiente">Pendiente</SelectItem>
                          <SelectItem value="parcial">Parcial</SelectItem>
                          <SelectItem value="completo">Completo</SelectItem>
                          <SelectItem value="retrasado">Retrasado</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Comercial */}
              {comerciales.length > 0 && (
                <FormField
                  control={form.control}
                  name="comercialId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Comercial</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar comercial" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                           <SelectItem value="all">Todos los comerciales</SelectItem>
                           {comerciales.map((comercial) => (
                             <SelectItem key={comercial.id} value={comercial.id}>
                               {comercial.nombre}
                             </SelectItem>
                           ))}
                         </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            {/* Advanced Filters */}
            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 p-0">
                  {isAdvancedOpen ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                  Filtros Avanzados
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Date Ranges */}
                  <FormField
                    control={form.control}
                    name="fechaInicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rango de Fecha de Inicio</FormLabel>
                        <FormControl>
                          <DatePickerWithRange
                            date={convertToDateRange(field.value)}
                            onDateChange={(dateRange) => field.onChange(convertFromDateRange(dateRange))}
                            placeholder="Seleccionar rango de fechas"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="fechaFin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Rango de Fecha de Fin</FormLabel>
                        <FormControl>
                          <DatePickerWithRange
                            date={convertToDateRange(field.value)}
                            onDateChange={(dateRange) => field.onChange(convertFromDateRange(dateRange))}
                            placeholder="Seleccionar rango de fechas"
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
                        <FormLabel>Monto Mínimo</FormLabel>
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
                        <FormLabel>Monto Máximo</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <DollarSign className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              placeholder="100000"
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

                {/* Deviation and Coherence */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="desviacionMinima"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Desviación Mín. (%)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <TrendingDown className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
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
                    name="desviacionMaxima"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Desviación Máx. (%)</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <TrendingUp className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                              type="number"
                              placeholder="100"
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
                    name="coherenciaMinima"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Coherencia Mín. (%)</FormLabel>
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

                {/* Boolean Filters */}
                <div className="flex flex-wrap gap-4">
                  <FormField
                    control={form.control}
                    name="soloConAlertas"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">
                            Solo proyectos con alertas
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="incluirCompletados"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal">
                            Incluir proyectos completados
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={handleReset}>
                Limpiar Filtros
              </Button>
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

export default ProyectoAprovisionamientoFilters;
