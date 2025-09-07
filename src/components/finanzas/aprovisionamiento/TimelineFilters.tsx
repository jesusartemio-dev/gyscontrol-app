/**
 * 📊 TimelineFilters Component
 * 
 * Componente de filtros específicos para el timeline de aprovisionamiento.
 * Incluye filtros por fechas, vista, agrupación y validaciones de coherencia.
 * 
 * Features:
 * - Filtros por rango de fechas
 * - Tipos de vista (Gantt, Lista, Calendario)
 * - Agrupación por proyecto, estado, proveedor
 * - Filtros de coherencia y alertas
 * - Configuración de validaciones
 * - Filtros rápidos predefinidos
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useForm, type Control } from 'react-hook-form';
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
import { Switch } from '@/components/ui/switch';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Clock,
  Filter,
  BarChart3,
  Grid,
  List,
  RefreshCw,
  Settings,
  Activity,
  X,
  Zap,
} from 'lucide-react';
// Removed framer-motion imports as they were causing ref conflicts with Radix UI
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import type { DateRange } from 'react-day-picker';
import type { FiltrosTimeline } from '@/types/aprovisionamiento';

// ✅ FiltrosTimeline definido en @/types/aprovisionamiento
// Propiedades: proyectoIds, fechaInicio, fechaFin, tipoVista, agrupacion, 
// validarCoherencia, incluirSugerencias, margenDias, alertaAnticipacion, soloAlertas
// NOTA: NO incluye 'incluirCompletados' - esta propiedad no existe en la interfaz oficial

// ✅ Form schema
const filtrosSchema = z.object({
  fechaInicio: z.string().optional(), // ISO string para compatibilidad con FiltrosTimeline
  fechaFin: z.string().optional(), // ISO string para compatibilidad con FiltrosTimeline
  proyectoIds: z.array(z.string()).optional(),
  soloAlertas: z.boolean().default(false),
  tipoVista: z.enum(['gantt', 'lista', 'calendario']).default('gantt'),
  agrupacion: z.enum(['proyecto', 'estado', 'proveedor', 'fecha', 'responsable']).default('proyecto'),
  validarCoherencia: z.boolean().default(true),
  incluirSugerencias: z.boolean().default(false),
  margenDias: z.number().min(0).max(365).default(7),
  alertaAnticipacion: z.number().min(0).max(90).default(15),
});

type FiltrosForm = z.infer<typeof filtrosSchema>;

// ✅ Props interface
interface TimelineFiltersProps {
  filtros: FiltrosTimeline;
  onFiltrosChange: (filtros: FiltrosTimeline) => void;
  proyectos?: Array<{ id: string; nombre: string; codigo: string }>;
  loading?: boolean;
  className?: string;
  showQuickFilters?: boolean;
  showAdvancedConfig?: boolean;
  compact?: boolean;
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

// ✅ View type icons
const getViewIcon = (tipo: string) => {
  switch (tipo) {
    case 'gantt': return <BarChart3 className="w-4 h-4" />;
    case 'lista': return <List className="w-4 h-4" />;
    case 'calendario': return <Calendar className="w-4 h-4" />;
    default: return <Activity className="w-4 h-4" />;
  }
};

// ✅ Main component
export const TimelineFilters: React.FC<TimelineFiltersProps> = ({
  filtros,
  onFiltrosChange,
  proyectos = [],
  loading = false,
  className = '',
  showQuickFilters = true,
  showAdvancedConfig = true,
  compact = false,
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [activeFilters, setActiveFilters] = useState<Array<{ key: string; label: string; value: string }>>([]);

  // 🔁 Form setup
  const form = useForm<FiltrosTimeline>({
    resolver: zodResolver(filtrosSchema) as any,
    mode: 'onChange',
    defaultValues: {
      fechaInicio: filtros.fechaInicio,
      fechaFin: filtros.fechaFin,
      proyectoIds: filtros.proyectoIds || [],
      soloAlertas: filtros.soloAlertas ?? false,
      tipoVista: filtros.tipoVista,
      agrupacion: filtros.agrupacion,
      validarCoherencia: filtros.validarCoherencia ?? true,
      incluirSugerencias: filtros.incluirSugerencias ?? false,
      margenDias: filtros.margenDias ?? 7,
      alertaAnticipacion: filtros.alertaAnticipacion ?? 15,
    },
  });

  // 🔁 Update active filters
  useEffect(() => {
    const filters: Array<{ key: string; label: string; value: string }> = [];

    if (filtros.fechaInicio) {
      filters.push({ 
        key: 'fechaInicio', 
        label: 'Desde', 
        value: filtros.fechaInicio.split('T')[0] 
      });
    }
    if (filtros.fechaFin) {
      filters.push({ 
        key: 'fechaFin', 
        label: 'Hasta', 
        value: filtros.fechaFin.split('T')[0] 
      });
    }
    if (filtros.proyectoIds && filtros.proyectoIds.length > 0) {
      const proyectosSeleccionados = proyectos.filter(p => filtros.proyectoIds?.includes(p.id));
      filters.push({ 
        key: 'proyectoIds', 
        label: 'Proyectos', 
        value: `${proyectosSeleccionados.length} seleccionados` 
      });
    }

    if (filtros.soloAlertas) {
      filters.push({ key: 'soloAlertas', label: 'Solo alertas', value: 'Sí' });
    }
    if (filtros.tipoVista && filtros.tipoVista !== 'gantt') {
      filters.push({ key: 'tipoVista', label: 'Vista', value: filtros.tipoVista });
    }
    if (filtros.agrupacion && filtros.agrupacion !== 'proyecto') {
      filters.push({ key: 'agrupacion', label: 'Agrupación', value: filtros.agrupacion });
    }
    if (filtros.validarCoherencia === false) {
      filters.push({ key: 'validarCoherencia', label: 'Validar coherencia', value: 'No' });
    }
    if (filtros.incluirSugerencias) {
      filters.push({ key: 'incluirSugerencias', label: 'Incluir sugerencias', value: 'Sí' });
    }
    if (filtros.margenDias && filtros.margenDias !== 7) {
      filters.push({ key: 'margenDias', label: 'Margen días', value: `${filtros.margenDias} días` });
    }
    if (filtros.alertaAnticipacion && filtros.alertaAnticipacion !== 15) {
      filters.push({ key: 'alertaAnticipacion', label: 'Alerta anticipación', value: `${filtros.alertaAnticipacion} días` });
    }

    setActiveFilters(filters);
  }, [filtros, proyectos]);

  // 🔁 Watch form changes and propagate immediately
  useEffect(() => {
    const subscription = form.watch((data) => {
      // Only propagate if form is valid and has changes
      if (form.formState.isValid) {
        const newFiltros: FiltrosTimeline = {
          ...filtros,
          fechaInicio: data.fechaInicio,
          fechaFin: data.fechaFin,
          proyectoIds: data.proyectoIds?.filter((id): id is string => id !== undefined),
          soloAlertas: data.soloAlertas ?? false,
          tipoVista: data.tipoVista ?? 'gantt',
          agrupacion: data.agrupacion ?? 'proyecto',
          validarCoherencia: data.validarCoherencia ?? true,
          incluirSugerencias: data.incluirSugerencias ?? false,
          margenDias: data.margenDias ?? 7,
          alertaAnticipacion: data.alertaAnticipacion ?? 15,
        };
        onFiltrosChange(newFiltros);
      }
    });
    return () => subscription.unsubscribe();
  }, [form, filtros, onFiltrosChange]);

  // 🔁 Quick filter handlers
  const handleQuickFilter = (type: string) => {
    const newFiltros = { ...filtros };
    
    switch (type) {
      case 'solo-alertas':
        newFiltros.soloAlertas = !filtros.soloAlertas;
        form.setValue('soloAlertas', newFiltros.soloAlertas);
        break;

      case 'con-sugerencias':
        newFiltros.incluirSugerencias = !filtros.incluirSugerencias;
        form.setValue('incluirSugerencias', newFiltros.incluirSugerencias);
        break;
      case 'esta-semana':
        const inicioSemana = new Date();
        inicioSemana.setDate(inicioSemana.getDate() - inicioSemana.getDay());
        const finSemana = new Date(inicioSemana);
        finSemana.setDate(finSemana.getDate() + 6);
        newFiltros.fechaInicio = inicioSemana.toISOString();
        newFiltros.fechaFin = finSemana.toISOString();
        form.setValue('fechaInicio', inicioSemana.toISOString());
        form.setValue('fechaFin', finSemana.toISOString());
        break;
      case 'este-mes':
        const inicioMes = new Date();
        inicioMes.setDate(1);
        const finMes = new Date(inicioMes.getFullYear(), inicioMes.getMonth() + 1, 0);
        newFiltros.fechaInicio = inicioMes.toISOString();
        newFiltros.fechaFin = finMes.toISOString();
        form.setValue('fechaInicio', inicioMes.toISOString());
        form.setValue('fechaFin', finMes.toISOString());
        break;
      case 'proximos-30-dias':
        const hoy = new Date();
        const en30Dias = new Date();
        en30Dias.setDate(hoy.getDate() + 30);
        newFiltros.fechaInicio = hoy.toISOString();
        newFiltros.fechaFin = en30Dias.toISOString();
        form.setValue('fechaInicio', hoy.toISOString());
        form.setValue('fechaFin', en30Dias.toISOString());
        break;
    }
    
    onFiltrosChange(newFiltros);
  };

  // 🔁 Handle form submission
  const onSubmit = (data: FiltrosTimeline) => {
    const newFiltros: FiltrosTimeline = {
      ...filtros,
      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin,
      proyectoIds: data.proyectoIds,
      soloAlertas: data.soloAlertas,
      tipoVista: data.tipoVista,
      agrupacion: data.agrupacion,
      validarCoherencia: data.validarCoherencia,
      incluirSugerencias: data.incluirSugerencias,
      margenDias: data.margenDias,
      alertaAnticipacion: data.alertaAnticipacion,
    };

    onFiltrosChange(newFiltros);
  };

  // 🔁 Handle filter removal
  const handleRemoveFilter = (key: string) => {
    const newFiltros = { ...filtros };
    
    switch (key) {
      case 'fechaInicio':
        delete newFiltros.fechaInicio;
        form.setValue('fechaInicio', undefined);
        break;
      case 'fechaFin':
        delete newFiltros.fechaFin;
        form.setValue('fechaFin', undefined);
        break;
      case 'proyectoIds':
        newFiltros.proyectoIds = [];
        form.setValue('proyectoIds', []);
        break;

      case 'soloAlertas':
        newFiltros.soloAlertas = false;
        form.setValue('soloAlertas', false);
        break;
      case 'tipoVista':
        newFiltros.tipoVista = 'gantt';
        form.setValue('tipoVista', 'gantt');
        break;
      case 'agrupacion':
        newFiltros.agrupacion = 'proyecto';
        form.setValue('agrupacion', 'proyecto');
        break;
      case 'validarCoherencia':
        newFiltros.validarCoherencia = true;
        form.setValue('validarCoherencia', true);
        break;
      case 'incluirSugerencias':
        newFiltros.incluirSugerencias = false;
        form.setValue('incluirSugerencias', false);
        break;
      case 'margenDias':
        newFiltros.margenDias = 7;
        form.setValue('margenDias', 7);
        break;
      case 'alertaAnticipacion':
        newFiltros.alertaAnticipacion = 15;
        form.setValue('alertaAnticipacion', 15);
        break;
    }
    
    onFiltrosChange(newFiltros);
  };

  // 🔁 Handle reset
  const handleReset = () => {
    form.reset({
      fechaInicio: undefined,
      fechaFin: undefined,
      proyectoIds: [],
      soloAlertas: false,
      tipoVista: 'gantt',
      agrupacion: 'proyecto',
      validarCoherencia: true,
      incluirSugerencias: false,
      margenDias: 7,
      alertaAnticipacion: 15,
    });
    
    onFiltrosChange({
      tipoVista: 'gantt',
      agrupacion: 'proyecto',
      validarCoherencia: true,
      margenDias: 7,
      alertaAnticipacion: 15,
    });
  };

  return (
    <Card className={`w-full ${className} ${compact ? 'border-0 shadow-none' : ''}`}>
      {!compact && (
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Filtros de Timeline
              </CardTitle>
              <CardDescription>
                Configura la vista temporal y validaciones de coherencia
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
      )}

      <CardContent className={compact ? 'p-4 space-y-3' : 'space-y-4'}>
        {/* Compact Header */}
        {compact && (
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium">Filtros</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={loading}
              className="h-7 px-2"
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
          </div>
        )}

        {/* Quick Filters */}
        {showQuickFilters && (
          <div className={compact ? 'space-y-1' : 'space-y-2'}>
            {!compact && <Label className="text-sm font-medium">Filtros Rápidos:</Label>}
            <div className={`flex flex-wrap gap-1 ${compact ? 'gap-1' : 'gap-2'}`}>
              <QuickFilterButton
                label={compact ? "Alertas" : "Solo Alertas"}
                icon={<AlertTriangle className="w-3 h-3" />}
                active={!!filtros.soloAlertas}
                onClick={() => handleQuickFilter('solo-alertas')}
                variant="danger"
              />

              <QuickFilterButton
                label={compact ? "Sugerencias" : "Con Sugerencias"}
                icon={<Zap className="w-3 h-3" />}
                active={!!filtros.incluirSugerencias}
                onClick={() => handleQuickFilter('con-sugerencias')}
              />
              {!compact && <Separator orientation="vertical" className="h-6" />}
              <QuickFilterButton
                label={compact ? "Semana" : "Esta Semana"}
                icon={<Calendar className="w-3 h-3" />}
                active={false}
                onClick={() => handleQuickFilter('esta-semana')}
              />
              <QuickFilterButton
                label={compact ? "Mes" : "Este Mes"}
                icon={<Calendar className="w-3 h-3" />}
                active={false}
                onClick={() => handleQuickFilter('este-mes')}
              />
              <QuickFilterButton
                label={compact ? "30d" : "Próximos 30 días"}
                icon={<Calendar className="w-3 h-3" />}
                active={false}
                onClick={() => handleQuickFilter('proximos-30-dias')}
              />
            </div>
          </div>
        )}

        {!compact && <Separator />}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className={compact ? 'space-y-2' : 'space-y-4'}>
            {/* Basic Filters */}
            <div className={`grid gap-2 ${compact ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'}`}>
              {/* Date Range */}
              <div className={compact ? 'col-span-full' : 'md:col-span-2'}>
                {!compact && <Label className="text-sm font-medium mb-2 block">Rango de Fechas</Label>}
                <div className={`grid grid-cols-2 ${compact ? 'gap-1' : 'gap-2'}`}>
                  <FormField
                    control={form.control as unknown as Control<FiltrosTimeline>}
                    name="fechaInicio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={compact ? 'text-xs sr-only' : 'text-xs'}>Desde</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            placeholder={compact ? 'Desde' : ''}
                            {...field}
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control as unknown as Control<FiltrosTimeline>}
                    name="fechaFin"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className={compact ? 'text-xs sr-only' : 'text-xs'}>Hasta</FormLabel>
                        <FormControl>
                          <Input
                            type="date"
                            placeholder={compact ? 'Hasta' : ''}
                            {...field}
                            value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).toISOString() : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>

              {/* Tipo de Vista */}
              <FormField
                control={form.control as unknown as Control<FiltrosTimeline>}
                  name="tipoVista"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={compact ? 'text-xs' : ''}>Vista</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar vista" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="gantt">
                          <div className="flex items-center gap-2">
                            <BarChart3 className="w-4 h-4" />
                            Gantt
                          </div>
                        </SelectItem>
                        <SelectItem value="lista">
                          <div className="flex items-center gap-2">
                            <List className="w-4 h-4" />
                            Lista
                          </div>
                        </SelectItem>
                        <SelectItem value="calendario">
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Calendario
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Agrupación */}
              <FormField
                control={form.control as unknown as Control<FiltrosTimeline>}
                name="agrupacion"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className={compact ? 'text-xs' : ''}>Agrupar</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar agrupación" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="proyecto">Proyecto</SelectItem>
                        <SelectItem value="estado">Estado</SelectItem>
                        <SelectItem value="proveedor">Proveedor</SelectItem>
                        <SelectItem value="fecha">Fecha</SelectItem>
                        <SelectItem value="responsable">Responsable</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Proyectos Selection */}
            {proyectos.length > 0 && (
              <FormField
                control={form.control as unknown as Control<FiltrosTimeline>}
                  name="proyectoIds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Proyectos (Opcional)</FormLabel>
                    <FormControl>
                      <Select
                        onValueChange={(value) => {
                          const current = field.value || [];
                          const newValue = current.includes(value)
                            ? current.filter(id => id !== value)
                            : [...current, value];
                          field.onChange(newValue);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue 
                            placeholder={field.value?.length ? `${field.value.length} proyectos seleccionados` : "Todos los proyectos"} 
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {proyectos.map((proyecto) => (
                            <SelectItem key={proyecto.id} value={proyecto.id}>
                              <div className="flex items-center gap-2">
                                <input
                                  type="checkbox"
                                  checked={field.value?.includes(proyecto.id) || false}
                                  onChange={() => {}}
                                  className="rounded"
                                />
                                {proyecto.codigo} - {proyecto.nombre}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Advanced Configuration */}
            {showAdvancedConfig && (
              <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Configuración Avanzada
                    </span>
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
                        {/* Validation Switches */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control as unknown as Control<FiltrosTimeline>}
                name="validarCoherencia"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Validar Coherencia</FormLabel>
                                  <div className="text-xs text-muted-foreground">
                                    Verificar consistencia entre listas y pedidos
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
                            control={form.control as unknown as Control<FiltrosTimeline>}
                name="incluirSugerencias"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                                <div className="space-y-0.5">
                                  <FormLabel>Incluir Sugerencias</FormLabel>
                                  <div className="text-xs text-muted-foreground">
                                    Mostrar recomendaciones de optimización
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

                        {/* Configuration Values */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <FormField
                            control={form.control as unknown as Control<FiltrosTimeline>}
                name="margenDias"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Margen de Días</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      placeholder="7"
                                      min="0"
                                      max="365"
                                      {...field}
                                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 7)}
                                    />
                                    <div className="absolute right-2 top-2.5 text-xs text-muted-foreground">
                                      días
                                    </div>
                                  </div>
                                </FormControl>
                                <div className="text-xs text-muted-foreground">
                                  Margen para validaciones de fechas
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control as unknown as Control<FiltrosTimeline>}
                name="alertaAnticipacion"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Anticipación de Alertas</FormLabel>
                                <FormControl>
                                  <div className="relative">
                                    <Input
                                      type="number"
                                      placeholder="15"
                                      min="0"
                                      max="90"
                                      {...field}
                                      onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : 15)}
                                    />
                                    <div className="absolute right-2 top-2.5 text-xs text-muted-foreground">
                                      días
                                    </div>
                                  </div>
                                </FormControl>
                                <div className="text-xs text-muted-foreground">
                                  Días de anticipación para alertas
                                </div>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Apply Button */}
            <div className={`flex ${compact ? 'justify-center' : 'justify-end'}`}>
              <Button 
                type="submit" 
                disabled={loading}
                size={compact ? 'sm' : 'default'}
                className={compact ? 'w-full' : ''}
              >
                {loading ? (
                  <RefreshCw className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} mr-2 animate-spin`} />
                ) : (
                  <Filter className={`${compact ? 'w-3 h-3' : 'w-4 h-4'} mr-2`} />
                )}
                {compact ? 'Aplicar' : 'Aplicar Filtros'}
              </Button>
            </div>
          </form>
        </Form>

        {/* Active Filters */}
        {activeFilters.length > 0 && (
          <>
            {!compact && <Separator />}
            <div className={compact ? 'space-y-1' : 'space-y-2'}>
              {!compact && <Label className="text-sm font-medium">Filtros Activos:</Label>}
              <div className={`flex flex-wrap ${compact ? 'gap-1' : 'gap-2'}`}>
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

export default TimelineFilters;