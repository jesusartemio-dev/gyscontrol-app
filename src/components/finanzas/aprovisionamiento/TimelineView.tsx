/**
 * 📊 TimelineView Component
 * 
 * Vista integrada de timeline de aprovisionamiento que combina filtros,
 * gráfico Gantt y controles de coherencia.
 * 
 * Features:
 * - Integración completa de filtros y Gantt
 * - Panel de coherencia y validaciones
 * - Alertas y sugerencias en tiempo real
 * - Exportación y configuración avanzada
 * - Vista responsive y adaptable
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  FileText,
  Filter,
  Lightbulb,
  Package,
  Percent,
  RefreshCw,
  Settings,
  ShoppingCart,
  TrendingUp,
  X,
  Zap,
} from 'lucide-react';
// Removed framer-motion imports as they were causing ref conflicts with Radix UI
import { toast } from 'sonner';

// Components
import { GanttChart } from './GanttChart';
import { TimelineFilters } from './TimelineFilters';
import { FiltersSidebar } from './FiltersSidebar';
import { CompactStatusBadges } from './CompactStatusBadges';
import { ListView } from './ListView';
import { CalendarView } from './CalendarView';

// Services
import { getTimelineData, timelineGanttService } from '@/lib/services/aprovisionamiento';

// Types
import type {
  FiltrosTimeline,
  TimelineData,
  GanttItem,
  AlertaTimeline,
  ValidacionCoherencia,
  SugerenciaOptimizacion,
} from '@/types/aprovisionamiento';

// ✅ Cost display options
type CostDisplayMode = 'total' | 'daily' | 'percentage' | 'none';
type CostPosition = 'right' | 'left' | 'top' | 'bottom';

interface CostDisplayOptions {
  mode: CostDisplayMode;
  position: CostPosition;
  compact: boolean;
}

// ✅ Props interface
interface TimelineViewProps {
  proyectoId?: string;
  className?: string;
  allowEdit?: boolean;
  showFilters?: boolean;
  showCoherencePanel?: boolean;
  defaultFilters?: Partial<FiltrosTimeline>;
}

// ✅ Cost Display Selector Component
const CostDisplaySelector: React.FC<{
  options: CostDisplayOptions;
  onOptionsChange: (options: CostDisplayOptions) => void;
  disabled?: boolean;
}> = ({ options, onOptionsChange, disabled = false }) => {
  const getModeIcon = (mode: CostDisplayMode) => {
    switch (mode) {
      case 'total': return <DollarSign className="w-3 h-3" />;
      case 'daily': return <Clock className="w-3 h-3" />;
      case 'percentage': return <Percent className="w-3 h-3" />;
      case 'none': return <DollarSign className="w-3 h-3 opacity-50" />;
    }
  };

  const getModeLabel = (mode: CostDisplayMode) => {
    switch (mode) {
      case 'total': return 'Monto Total';
      case 'daily': return 'Costo Diario';
      case 'percentage': return '% Presupuesto';
      case 'none': return 'Sin Costos';
    }
  };

  const getPositionLabel = (position: CostPosition) => {
    switch (position) {
      case 'right': return 'Derecha';
      case 'left': return 'Izquierda';
      case 'top': return 'Arriba';
      case 'bottom': return 'Abajo';
    }
  };

  return (
    <div className="flex items-center gap-1">
      {/* Mode Selector */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={options.mode !== 'none' ? "default" : "outline"}
            size="sm"
            disabled={disabled}
            className="h-8 px-2"
          >
            {getModeIcon(options.mode)}
            <span className="hidden sm:inline ml-1">
              {getModeLabel(options.mode)}
            </span>
            <ChevronDown className="w-3 h-3 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => onOptionsChange({ ...options, mode: 'total' })}
            className="flex items-center gap-2"
          >
            <DollarSign className="w-4 h-4" />
            <div>
              <div className="font-medium">Monto Total</div>
              <div className="text-xs text-muted-foreground">Costo completo del item</div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onOptionsChange({ ...options, mode: 'daily' })}
            className="flex items-center gap-2"
          >
            <Clock className="w-4 h-4" />
            <div>
              <div className="font-medium">Costo Diario</div>
              <div className="text-xs text-muted-foreground">Costo promedio por día</div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onOptionsChange({ ...options, mode: 'percentage' })}
            className="flex items-center gap-2"
          >
            <Percent className="w-4 h-4" />
            <div>
              <div className="font-medium">% Presupuesto</div>
              <div className="text-xs text-muted-foreground">Porcentaje del total</div>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onOptionsChange({ ...options, mode: 'none' })}
            className="flex items-center gap-2"
          >
            <DollarSign className="w-4 h-4 opacity-50" />
            <div>
              <div className="font-medium">Sin Costos</div>
              <div className="text-xs text-muted-foreground">Ocultar información de costos</div>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Position Selector - Only show when costs are enabled */}
      {options.mode !== 'none' && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={disabled}
              className="h-8 px-2"
              title="Posición del costo"
            >
              <Settings className="w-3 h-3" />
              <span className="hidden lg:inline ml-1">
                {getPositionLabel(options.position)}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-32">
            <DropdownMenuItem
              onClick={() => onOptionsChange({ ...options, position: 'right' })}
              className="flex items-center justify-between"
            >
              Derecha
              {options.position === 'right' && <CheckCircle className="w-3 h-3" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onOptionsChange({ ...options, position: 'left' })}
              className="flex items-center justify-between"
            >
              Izquierda
              {options.position === 'left' && <CheckCircle className="w-3 h-3" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onOptionsChange({ ...options, position: 'top' })}
              className="flex items-center justify-between"
            >
              Arriba
              {options.position === 'top' && <CheckCircle className="w-3 h-3" />}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onOptionsChange({ ...options, position: 'bottom' })}
              className="flex items-center justify-between"
            >
              Abajo
              {options.position === 'bottom' && <CheckCircle className="w-3 h-3" />}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Compact Toggle - Only show when costs are enabled */}
      {options.mode !== 'none' && (
        <Button
          variant={options.compact ? "default" : "outline"}
          size="sm"
          disabled={disabled}
          onClick={() => onOptionsChange({ ...options, compact: !options.compact })}
          className="h-8 px-2"
          title={options.compact ? "Formato completo" : "Formato compacto"}
        >
          <Package className="w-3 h-3" />
          <span className="hidden xl:inline ml-1">
            {options.compact ? "Compacto" : "Completo"}
          </span>
        </Button>
      )}
    </div>
  );
};

// ✅ Alert summary component
const AlertSummary: React.FC<{
  alertas: AlertaTimeline[];
  onAlertClick?: (alerta: AlertaTimeline) => void;
}> = ({ alertas, onAlertClick }) => {
  const errorCount = alertas.filter(a => a.tipo === 'error').length;
  const warningCount = alertas.filter(a => a.tipo === 'warning').length;
  const infoCount = alertas.filter(a => a.tipo === 'info').length;

  if (alertas.length === 0) {
    return (
      <div className="flex items-center gap-2 text-green-600">
        <CheckCircle className="w-4 h-4" />
        <span className="text-sm">Sin alertas activas</span>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-4">
        {errorCount > 0 && (
          <Badge variant="destructive" className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {errorCount} Errores
          </Badge>
        )}
        {warningCount > 0 && (
          <Badge variant="secondary" className="flex items-center gap-1 bg-yellow-100 text-yellow-800">
            <AlertCircle className="w-3 h-3" />
            {warningCount} Advertencias
          </Badge>
        )}
        {infoCount > 0 && (
          <Badge variant="outline" className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3" />
            {infoCount} Información
          </Badge>
        )}
      </div>
      
      <div className="space-y-1 max-h-32 overflow-y-auto">
        {alertas.slice(0, 5).map((alerta, index) => (
          <div
            key={index}
            className={`
              text-xs p-2 rounded cursor-pointer hover:bg-opacity-80
              ${alerta.tipo === 'error' ? 'bg-red-50 text-red-700' : ''}
              ${alerta.tipo === 'warning' ? 'bg-yellow-50 text-yellow-700' : ''}
              ${alerta.tipo === 'info' ? 'bg-blue-50 text-blue-700' : ''}
            `}
            onClick={() => onAlertClick?.(alerta)}
          >
            <div className="font-medium">{alerta.titulo}</div>
            <div className="opacity-75">{alerta.mensaje}</div>
          </div>
        ))}
        {alertas.length > 5 && (
          <div className="text-xs text-muted-foreground text-center py-1">
            +{alertas.length - 5} alertas más...
          </div>
        )}
      </div>
    </div>
  );
};

// ✅ Suggestions panel
const SuggestionsPanel: React.FC<{
  sugerencias: SugerenciaOptimizacion[];
  onApplySuggestion?: (sugerencia: SugerenciaOptimizacion) => void;
}> = ({ sugerencias, onApplySuggestion }) => {
  if (sugerencias.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Lightbulb className="w-8 h-8 mx-auto mb-2 opacity-50" />
        <p>No hay sugerencias disponibles</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sugerencias.map((sugerencia, index) => (
        <div
          key={index}
          className="border rounded-lg p-3 space-y-2 animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
          style={{ animationDelay: `${index * 100}ms` }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="font-medium text-sm">{sugerencia.titulo}</div>
              <div className="text-xs text-muted-foreground mt-1">
                {sugerencia.descripcion}
              </div>
              {sugerencia.impacto && (
                <div className="text-xs text-green-600 mt-1">
                  Impacto: {sugerencia.impacto}
                </div>
              )}
            </div>
            {onApplySuggestion && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onApplySuggestion(sugerencia)}
                className="ml-2"
              >
                Aplicar
              </Button>
            )}
          </div>
          
          {sugerencia.acciones && sugerencia.acciones.length > 0 && (
            <div className="space-y-1">
              <div className="text-xs font-medium">Acciones:</div>
              {sugerencia.acciones.map((accion, actionIndex) => (
                <div key={actionIndex} className="text-xs text-muted-foreground ml-2">
                  • {accion}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

// ✅ Coherence stats
const CoherenceStats: React.FC<{
  validacion?: ValidacionCoherencia;
}> = ({ validacion }) => {
  if (!validacion) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <BarChart3 className="w-6 h-6 mx-auto mb-2 opacity-50" />
        <p className="text-sm">Ejecutar validación para ver estadísticas</p>
      </div>
    );
  }

  const { estadisticas } = validacion;
  
  return (
    <div className="grid grid-cols-2 gap-4">
      <div className="text-center">
        <div className="text-2xl font-bold text-green-600">
          {estadisticas?.coherenciaPromedio || 0}%
        </div>
        <div className="text-xs text-muted-foreground">Coherencia Promedio</div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-blue-600">
          {estadisticas?.totalValidaciones || 0}
        </div>
        <div className="text-xs text-muted-foreground">Validaciones</div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-red-600">
          {estadisticas?.erroresEncontrados || 0}
        </div>
        <div className="text-xs text-muted-foreground">Errores</div>
      </div>
      
      <div className="text-center">
        <div className="text-2xl font-bold text-yellow-600">
          {estadisticas?.advertenciasEncontradas || 0}
        </div>
        <div className="text-xs text-muted-foreground">Advertencias</div>
      </div>
    </div>
  );
};

// ✅ Main component
export const TimelineView: React.FC<TimelineViewProps> = ({
  proyectoId,
  className = '',
  allowEdit = false,
  showFilters = true,
  showCoherencePanel = true,
  defaultFilters = {},
}) => {
  // Router for navigation
  const router = useRouter();

  // State
  const [filtros, setFiltros] = useState<FiltrosTimeline>({
    tipoVista: 'gantt',
    agrupacion: 'proyecto',
    validarCoherencia: true,
    margenDias: 7,
    alertaAnticipacion: 15,
    ...defaultFilters,
    ...(proyectoId ? { proyectoIds: [proyectoId] } : {}),
  });
  
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [validacionData, setValidacionData] = useState<ValidacionCoherencia | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [selectedItem, setSelectedItem] = useState<GanttItem | null>(null);
  const [showCosts, setShowCosts] = useState(false); // 💰 Toggle for cost display
  const [costOptions, setCostOptions] = useState<CostDisplayOptions>({
    mode: 'total',
    position: 'right',
    compact: false
  }); // 💰 Cost display configuration

  // 🔁 Load timeline data
  const loadTimelineData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getTimelineData({
        proyectoId: filtros.proyectoIds?.[0],
        fechaInicio: filtros.fechaInicio,
        fechaFin: filtros.fechaFin,
        vista: filtros.tipoVista,
        agrupacion: filtros.agrupacion,
        soloCoherencia: filtros.validarCoherencia,
        soloAlertas: false
      });
      setTimelineData(data);
    } catch (error) {
      console.error('Error loading timeline:', error);
      toast.error('Error al cargar el timeline');
    } finally {
      setLoading(false);
    }
  }, [
    filtros.proyectoIds,
    filtros.fechaInicio,
    filtros.fechaFin,
    filtros.tipoVista,
    filtros.agrupacion,
    filtros.validarCoherencia
  ]);

  // 🔁 Run coherence validation using real API
  const runCoherenceValidation = useCallback(async () => {
    try {
      setValidating(true);

      // Call the real coherence validation API
      const params = new URLSearchParams();
      if (filtros.proyectoIds && filtros.proyectoIds.length > 0) {
        params.set('proyectoIds', filtros.proyectoIds.join(','));
      }

      const response = await fetch('/api/aprovisionamiento/timeline', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          proyectoIds: filtros.proyectoIds,
          recalcularFechas: false,
          aplicarSugerencias: false,
          configuracion: {
            margenDias: filtros.margenDias || 7,
            alertaAnticipacion: filtros.alertaAnticipacion || 14
          }
        })
      });

      if (!response.ok) {
        throw new Error('Error al validar coherencia');
      }

      const result = await response.json();

      // Map API response to ValidacionCoherencia format
      const validaciones = result.data?.validaciones || {};
      const estadisticas = validaciones.estadisticas || {};

      const validacion: ValidacionCoherencia = {
        listaId: 'all',
        listaCodigo: 'CONSOLIDADO',
        montoLista: 0,
        montoPedidos: 0,
        diferencia: 0,
        porcentajeDesviacion: 0,
        estado: validaciones.errores?.length > 0 ? 'critica' : 'ok',
        mensaje: result.message || 'Validación completada',
        pedidosAsociados: [],
        esCoherente: (validaciones.errores?.length || 0) === 0,
        alertas: [
          ...(validaciones.errores || []).map((e: any) => ({
            tipo: 'error' as const,
            titulo: e.tipo,
            mensaje: e.mensaje,
            prioridad: 'alta' as const
          })),
          ...(validaciones.advertencias || []).map((a: any) => ({
            tipo: 'warning' as const,
            titulo: a.tipo,
            mensaje: a.mensaje,
            prioridad: 'media' as const
          }))
        ],
        sugerencias: (result.data?.sugerenciasRecalculo || []).map((s: any) => ({
          tipo: s.tipo,
          titulo: s.descripcion,
          descripcion: s.accion,
          impacto: s.impacto,
          acciones: []
        })),
        estadisticas: {
          totalListas: estadisticas.listasAnalizadas || 0,
          totalPedidos: estadisticas.pedidosAnalizados || 0,
          coherenciaPromedio: estadisticas.conflictosEncontrados > 0
            ? Math.max(0, 100 - (estadisticas.conflictosEncontrados * 10))
            : 100,
          totalValidaciones: estadisticas.proyectosAnalizados || 1,
          erroresEncontrados: validaciones.errores?.length || 0,
          advertenciasEncontradas: validaciones.advertencias?.length || 0
        }
      };

      setValidacionData(validacion);

      const errores = validaciones.errores?.length || 0;
      const advertencias = validaciones.advertencias?.length || 0;

      if (errores > 0) {
        toast.warning(`Validación completada: ${errores} errores, ${advertencias} advertencias`);
      } else if (advertencias > 0) {
        toast.info(`Validación completada: ${advertencias} advertencias`);
      } else {
        toast.success('Validación completada sin problemas');
      }
    } catch (error) {
      console.error('Error validating coherence:', error);
      toast.error('Error al validar coherencia');

      // Set error state
      setValidacionData({
        listaId: 'error',
        listaCodigo: 'ERROR',
        montoLista: 0,
        montoPedidos: 0,
        diferencia: 0,
        porcentajeDesviacion: 0,
        estado: 'critica',
        mensaje: 'Error al ejecutar validación',
        pedidosAsociados: [],
        esCoherente: false,
        alertas: [],
        sugerencias: [],
        estadisticas: {
          totalListas: 0,
          totalPedidos: 0,
          coherenciaPromedio: 0,
          totalValidaciones: 0,
          erroresEncontrados: 0,
          advertenciasEncontradas: 0
        }
      });
    } finally {
      setValidating(false);
    }
  }, [filtros.proyectoIds, filtros.margenDias, filtros.alertaAnticipacion]);

  // 🔁 Handle filter changes
  const handleFiltrosChange = useCallback((newFiltros: FiltrosTimeline) => {
    setFiltros(newFiltros);
  }, []);

  // 🔁 Handle item click - navigate to detail page
  const handleItemClick = useCallback((item: GanttItem) => {
    // Navigate to the appropriate detail page based on item type
    if (item.tipo === 'lista') {
      router.push(`/finanzas/aprovisionamiento/listas/${item.id}`);
    } else if (item.tipo === 'pedido') {
      router.push(`/finanzas/aprovisionamiento/pedidos/${item.id}`);
    } else {
      // Fallback: show item details in dialog
      setSelectedItem(item);
    }
  }, [router]);

  // 🔁 Handle item update (for GanttChart with dates)
  const handleItemUpdate = useCallback(async (item: GanttItem, newDates: { inicio: string; fin: string }) => {
    try {
      // TODO: Implement item update logic
      toast.success('Elemento actualizado correctamente');
      await loadTimelineData(); // Reload data
    } catch (error) {
      console.error('Error updating item:', error);
      toast.error('Error al actualizar elemento');
    }
  }, [loadTimelineData]);

  // 🔁 Handle item edit (for ListView - single parameter)
  const handleItemEdit = useCallback(async (item: GanttItem) => {
    try {
      // For ListView, we don't have new dates, so we just trigger a generic edit
      // TODO: Implement item edit logic (could open a modal or navigate to edit page)
      toast.success('Editando elemento...');
      setSelectedItem(item); // Select the item for editing
    } catch (error) {
      console.error('Error editing item:', error);
      toast.error('Error al editar elemento');
    }
  }, []);

  // 🔁 Handle export
  const handleExport = useCallback(async (format: 'png' | 'pdf') => {
    try {
      // TODO: Implement export logic
      toast.success(`Timeline exportado como ${format.toUpperCase()}`);
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Error al exportar timeline');
    }
  }, []);

  // 🔁 Handle suggestion application
  const handleApplySuggestion = useCallback(async (sugerencia: SugerenciaOptimizacion) => {
    try {
      // TODO: Implement suggestion application
      toast.success('Sugerencia aplicada correctamente');
      await loadTimelineData(); // Reload data
    } catch (error) {
      console.error('Error applying suggestion:', error);
      toast.error('Error al aplicar sugerencia');
    }
  }, [loadTimelineData]);

  // 🔁 Sync local filters with defaultFilters when they change
  useEffect(() => {
    setFiltros(prev => ({
      ...prev,
      ...defaultFilters,
      ...(proyectoId ? { proyectoIds: [proyectoId] } : {}),
    }));
  }, [defaultFilters, proyectoId]);

  // 🔁 Load data on mount and filter changes
  useEffect(() => {
    loadTimelineData();
  }, [loadTimelineData]);

  // 🔁 Auto-validate coherence when enabled
  useEffect(() => {
    if (filtros.validarCoherencia && timelineData) {
      runCoherenceValidation();
    }
  }, [filtros.validarCoherencia, timelineData]); // ✅ Removed runCoherenceValidation dependency to prevent infinite loop

  // State for collapsible sections
  const [showFiltersSection, setShowFiltersSection] = useState(false);
  const [showAlertsSection, setShowAlertsSection] = useState(true);

  return (
    <div className={`space-y-3 ${className}`}>
      {/* ===== TOP BAR: Stats + Coherence + Actions ===== */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Left: Stats badges */}
        <div className="flex items-center gap-2 flex-wrap">
          {timelineData?.resumen && (
            <>
              <div className="flex items-center gap-1.5 h-7 px-2.5 text-sm border rounded-md bg-background">
                <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="font-semibold">{timelineData.resumen.totalItems}</span>
                <span className="text-muted-foreground text-xs">items</span>
              </div>

              <div className="flex items-center gap-1 h-7 px-2.5 text-sm border rounded-md bg-emerald-50 border-emerald-200 text-emerald-700">
                <span className="font-semibold">$ {(timelineData.resumen.montoTotal || 0).toLocaleString()}</span>
              </div>

              {timelineData.resumen.itemsVencidos > 0 && (
                <div className="flex items-center gap-1.5 h-7 px-2.5 text-sm rounded-md bg-red-500 text-white">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="font-semibold">{timelineData.resumen.itemsVencidos}</span>
                  <span className="text-xs">vencidos</span>
                </div>
              )}

              {timelineData.resumen.itemsEnRiesgo > 0 && (
                <div className="flex items-center gap-1.5 h-7 px-2.5 text-sm rounded-md bg-orange-100 text-orange-700 border border-orange-200">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span className="font-semibold">{timelineData.resumen.itemsEnRiesgo}</span>
                  <span className="text-xs">en riesgo</span>
                </div>
              )}

              {/* Coherence inline */}
              {showCoherencePanel && (
                <div className={`flex items-center gap-1.5 h-7 px-2.5 text-sm rounded-md border ${
                  (validacionData?.estadisticas?.coherenciaPromedio || 100) >= 80
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span className="font-semibold">{validacionData?.estadisticas?.coherenciaPromedio || 100}%</span>
                  <span className="text-xs hidden sm:inline">coherencia</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Filter toggle */}
          {showFilters && (
            <Button
              variant={showFiltersSection ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFiltersSection(!showFiltersSection)}
              className="h-8"
            >
              <Filter className="w-4 h-4 mr-1.5" />
              Filtros
              {showFiltersSection ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
            </Button>
          )}

          {showCoherencePanel && (
            <Button
              variant="outline"
              size="sm"
              onClick={runCoherenceValidation}
              disabled={validating}
              className="h-8"
            >
              {validating ? (
                <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
              ) : (
                <BarChart3 className="w-4 h-4 mr-1.5" />
              )}
              Validar
            </Button>
          )}

          {filtros.tipoVista === 'gantt' && (
            <CostDisplaySelector
              options={costOptions}
              onOptionsChange={(newOptions) => {
                setCostOptions(newOptions);
                setShowCosts(newOptions.mode !== 'none');
              }}
              disabled={loading}
            />
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadTimelineData}
            disabled={loading}
            className="h-8"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-1.5" />
            )}
            Actualizar
          </Button>
        </div>
      </div>

      {/* ===== FILTERS: Horizontal, collapsible ===== */}
      {showFilters && showFiltersSection && (
        <Card className="border shadow-sm">
          <CardContent className="p-3">
            <div className="flex flex-wrap items-center gap-3">
              {/* View type */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-muted-foreground">Vista:</span>
                <div className="flex border rounded-md">
                  {[
                    { key: 'gantt', icon: BarChart3, label: 'Gantt' },
                    { key: 'lista', icon: FileText, label: 'Lista' },
                    { key: 'calendario', icon: Calendar, label: 'Calendario' }
                  ].map((view) => (
                    <Button
                      key={view.key}
                      variant={filtros.tipoVista === view.key ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => handleFiltrosChange({ ...filtros, tipoVista: view.key as any })}
                      className="h-7 px-2 rounded-none first:rounded-l-md last:rounded-r-md"
                    >
                      <view.icon className="w-3.5 h-3.5 mr-1" />
                      {view.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Quick filters */}
              <div className="flex items-center gap-1.5">
                <Button
                  variant={filtros.soloAlertas ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => handleFiltrosChange({ ...filtros, soloAlertas: !filtros.soloAlertas })}
                  className="h-7 text-xs"
                >
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Solo Alertas
                </Button>
                <Button
                  variant={filtros.validarCoherencia ? 'secondary' : 'outline'}
                  size="sm"
                  onClick={() => handleFiltrosChange({ ...filtros, validarCoherencia: !filtros.validarCoherencia })}
                  className="h-7 text-xs"
                >
                  <BarChart3 className="w-3 h-3 mr-1" />
                  Validar Auto
                </Button>
              </div>

              {/* Clear filters */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFiltrosChange({
                  tipoVista: 'gantt',
                  agrupacion: 'proyecto',
                  validarCoherencia: true,
                  margenDias: 7,
                  alertaAnticipacion: 15
                })}
                className="h-7 text-xs text-muted-foreground"
              >
                <X className="w-3 h-3 mr-1" />
                Limpiar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ===== MAIN: Gantt Chart (full width) ===== */}
      <div className="min-h-[400px]">
        
        {/* Timeline chart */}
        <div className="flex-1 min-w-0">
          {filtros.tipoVista === 'gantt' && (
            <GanttChart 
              data={timelineData || { 
                 items: [], 
                 alertas: [], 
                 resumen: {
                   totalItems: 0,
                   montoTotal: 0,
                   itemsVencidos: 0,
                   itemsEnRiesgo: 0,
                   itemsConAlertas: 0,
                   porcentajeCompletado: 0,
                   coherenciaPromedio: 0,
                   distribucionPorTipo: {
                     listas: 0,
                     pedidos: 0
                   },
                   alertasPorPrioridad: {
                     alta: 0,
                     media: 0,
                     baja: 0
                   }
                 }
               }} 
              loading={loading} 
              allowEdit={allowEdit} 
              onItemClick={handleItemClick} 
              onItemUpdate={handleItemUpdate} 
              onExport={handleExport} 
              showLegend={true} 
              showMinimap={false} 
              showCosts={showCosts} // 💰 Pass showCosts state
              costOptions={costOptions} // 💰 Pass cost display options
            />
          )}
          
          {filtros.tipoVista === 'lista' && (
            <ListView
              data={timelineData || { 
                 items: [], 
                 alertas: [], 
                 resumen: {
                   totalItems: 0,
                   montoTotal: 0,
                   itemsVencidos: 0,
                   itemsEnRiesgo: 0,
                   itemsConAlertas: 0,
                   porcentajeCompletado: 0,
                   coherenciaPromedio: 0,
                   distribucionPorTipo: {
                     listas: 0,
                     pedidos: 0
                   },
                   alertasPorPrioridad: {
                     alta: 0,
                     media: 0,
                     baja: 0
                   }
                 }
               }}
              loading={loading}
              onItemClick={handleItemClick}
              onItemEdit={handleItemEdit}
              className="h-full"
            />
          )}
          
          {filtros.tipoVista === 'calendario' && (
            <CalendarView
              data={timelineData || { 
                 items: [], 
                 alertas: [], 
                 resumen: {
                   totalItems: 0,
                   montoTotal: 0,
                   itemsVencidos: 0,
                   itemsEnRiesgo: 0,
                   itemsConAlertas: 0,
                   porcentajeCompletado: 0,
                   coherenciaPromedio: 0,
                   distribucionPorTipo: {
                     listas: 0,
                     pedidos: 0
                   },
                   alertasPorPrioridad: {
                     alta: 0,
                     media: 0,
                     baja: 0
                   }
                 }
               }}
              loading={loading}
              onItemClick={handleItemClick}
              className="h-full"
            />
          )}
         </div>
      </div>

      {/* ===== BOTTOM: Alerts Section (collapsible) ===== */}
      {(timelineData?.alertas?.length || 0) > 0 && (
        <Card className="border shadow-sm">
          <CardHeader className="p-3 cursor-pointer" onClick={() => setShowAlertsSection(!showAlertsSection)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-orange-500" />
                <span className="text-sm font-medium">Alertas</span>
                <Badge variant="secondary" className="h-5 text-xs">
                  {timelineData?.alertas?.length || 0}
                </Badge>
                {(timelineData?.alertas?.filter(a => a.prioridad === 'alta').length || 0) > 0 && (
                  <Badge variant="destructive" className="h-5 text-xs">
                    {timelineData?.alertas?.filter(a => a.prioridad === 'alta').length} críticas
                  </Badge>
                )}
              </div>
              {showAlertsSection ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </CardHeader>
          {showAlertsSection && (
            <CardContent className="p-3 pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                {timelineData?.alertas?.slice(0, 9).map((alerta, index) => (
                  <div
                    key={index}
                    className={`p-2 rounded border text-xs ${
                      alerta.prioridad === 'alta' ? 'bg-red-50 border-red-200' :
                      alerta.prioridad === 'media' ? 'bg-orange-50 border-orange-200' :
                      'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="font-medium truncate">{alerta.titulo}</div>
                    <div className="text-muted-foreground truncate">{alerta.mensaje}</div>
                  </div>
                ))}
              </div>
              {(timelineData?.alertas?.length || 0) > 9 && (
                <div className="text-xs text-muted-foreground text-center mt-2">
                  +{(timelineData?.alertas?.length || 0) - 9} alertas más
                </div>
              )}
            </CardContent>
          )}
        </Card>
      )}

      {/* Item details dialog */}
      <Dialog open={!!selectedItem} onOpenChange={() => setSelectedItem(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              {selectedItem?.tipo === 'lista' ? (
                <Package className="w-4 h-4 sm:w-5 sm:h-5" />
              ) : (
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5" />
              )}
              <span className="truncate">{selectedItem?.titulo}</span>
            </DialogTitle>
            <DialogDescription className="text-sm">
              Detalles del elemento seleccionado
            </DialogDescription>
          </DialogHeader>
          
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="font-medium">Fecha Inicio:</div>
                  <div>{new Date(selectedItem.fechaInicio).toLocaleDateString()}</div>
                </div>
                <div>
                  <div className="font-medium">Fecha Fin:</div>
                  <div>{new Date(selectedItem.fechaFin).toLocaleDateString()}</div>
                </div>
                {selectedItem.coherencia !== undefined && (
                  <div>
                    <div className="font-medium">Coherencia:</div>
                    <div className="flex items-center gap-2">
                      <span>{selectedItem.coherencia}%</span>
                      <Badge 
                        variant={selectedItem.coherencia >= 80 ? 'default' : selectedItem.coherencia >= 50 ? 'secondary' : 'destructive'}
                      >
                        {selectedItem.coherencia >= 80 ? 'Buena' : selectedItem.coherencia >= 50 ? 'Regular' : 'Baja'}
                      </Badge>
                    </div>
                  </div>
                )}
                {selectedItem.progreso !== undefined && (
                  <div>
                    <div className="font-medium">Progreso:</div>
                    <div>{selectedItem.progreso}%</div>
                  </div>
                )}
              </div>
              
              {selectedItem.descripcion && (
                <div>
                  <div className="font-medium text-sm mb-1">Descripción:</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedItem.descripcion}
                  </div>
                </div>
              )}
              
              {selectedItem.alertas && selectedItem.alertas.length > 0 && (
                <div>
                  <div className="font-medium text-sm mb-2">Alertas:</div>
                  <div className="space-y-2">
                    {selectedItem.alertas.map((alerta, index) => (
                      <div
                        key={index}
                        className={`
                          text-xs p-2 rounded
                          ${alerta.tipo === 'error' ? 'bg-red-50 text-red-700' : ''}
                          ${alerta.tipo === 'warning' ? 'bg-yellow-50 text-yellow-700' : ''}
                          ${alerta.tipo === 'info' ? 'bg-blue-50 text-blue-700' : ''}
                        `}
                      >
                        <div className="font-medium">{alerta.titulo}</div>
                        <div className="opacity-75">{alerta.mensaje}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimelineView;
