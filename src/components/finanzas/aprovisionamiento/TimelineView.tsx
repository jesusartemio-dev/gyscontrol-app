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

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardHeader,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  DollarSign,
  FileText,
  Filter,
  RefreshCw,
  X,
} from 'lucide-react';
import { toast } from 'sonner';

// Components
import { GanttChart } from './GanttChart';
import { ListView } from './ListView';
import { CalendarView } from './CalendarView';
import { Combobox } from '@/components/ui/combobox';

// Services
import { getTimelineData } from '@/lib/services/aprovisionamiento';

// Types
import type {
  FiltrosTimeline,
  TimelineData,
  GanttItem,
  ValidacionCoherencia,
} from '@/types/aprovisionamiento';

// ✅ Props interface
interface TimelineViewProps {
  proyectoId?: string;
  className?: string;
  allowEdit?: boolean;
  showFilters?: boolean;
  showCoherencePanel?: boolean;
  defaultFilters?: Partial<FiltrosTimeline>;
}


// ✅ Empty timeline data constant (used as fallback when data is null)
const EMPTY_TIMELINE_DATA: TimelineData = {
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
    distribucionPorTipo: { listas: 0, pedidos: 0 },
    alertasPorPrioridad: { alta: 0, media: 0, baja: 0 }
  }
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
    validarCoherencia: false,
    margenDias: 7,
    alertaAnticipacion: 15,
    ...defaultFilters,
    ...(proyectoId ? { proyectoIds: [proyectoId] } : {}),
  });
  
  const [timelineData, setTimelineData] = useState<TimelineData | null>(null);
  const [validacionData, setValidacionData] = useState<ValidacionCoherencia | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [showCosts, setShowCosts] = useState(false);
  const [proyectos, setProyectos] = useState<{ id: string; codigo: string; nombre: string }[]>([]);

  // Fetch projects for filter
  useEffect(() => {
    fetch('/api/proyecto')
      .then(res => res.json())
      .then(data => {
        const list = Array.isArray(data) ? data : data.data || data.proyectos || [];
        setProyectos(list.map((p: any) => ({ id: p.id, codigo: p.codigo || '', nombre: p.nombre || '' })));
      })
      .catch(() => {});
  }, []);

  const proyectoOptions = useMemo(() => [
    { value: '', label: 'Todos los proyectos' },
    ...proyectos.map(p => ({ value: p.id, label: `${p.codigo} - ${p.nombre}` }))
  ], [proyectos]);

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
    if (item.tipo === 'lista') {
      router.push(`/finanzas/aprovisionamiento/listas/${item.id}`);
    } else if (item.tipo === 'pedido') {
      router.push(`/finanzas/aprovisionamiento/pedidos/${item.id}`);
    }
  }, [router]);

  // 🔁 Handle item edit - navigate to detail page
  const handleItemEdit = useCallback((item: GanttItem) => {
    handleItemClick(item);
  }, [handleItemClick]);

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

  // State for collapsible sections
  const [showFiltersSection, setShowFiltersSection] = useState(false);
  const [showAlertsSection, setShowAlertsSection] = useState(true);

  return (
    <div className={`space-y-2 ${className}`}>
      {/* ===== TOP BAR: Project filter + Stats + Actions ===== */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        {/* Left: Project filter + Stats badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Project filter */}
          <Combobox
            options={proyectoOptions}
            value={filtros.proyectoIds?.[0] || ''}
            onValueChange={(value) => {
              setFiltros(prev => ({
                ...prev,
                proyectoIds: value ? [value] : []
              }));
            }}
            placeholder="Todos los proyectos"
            searchPlaceholder="Buscar proyecto..."
            className="h-6 text-xs w-[200px]"
          />

          {timelineData?.resumen && (
            <>
              <div className="flex items-center gap-1 h-6 px-2 text-xs border rounded-md bg-background">
                <Calendar className="w-3 h-3 text-muted-foreground" />
                <span className="font-semibold">{timelineData.resumen.totalItems}</span>
                <span className="text-muted-foreground">items</span>
              </div>

              <div className="flex items-center gap-1 h-6 px-2 text-xs border rounded-md bg-emerald-50 border-emerald-200 text-emerald-700">
                <span className="font-semibold">$ {(timelineData.resumen.montoTotal || 0).toLocaleString()}</span>
              </div>

              {timelineData.resumen.itemsVencidos > 0 && (
                <div className="flex items-center gap-1 h-6 px-2 text-xs rounded-md bg-red-500 text-white">
                  <AlertCircle className="w-3 h-3" />
                  <span className="font-semibold">{timelineData.resumen.itemsVencidos}</span>
                  <span>vencidos</span>
                </div>
              )}

              {timelineData.resumen.itemsEnRiesgo > 0 && (
                <div className="flex items-center gap-1 h-6 px-2 text-xs rounded-md bg-orange-100 text-orange-700 border border-orange-200">
                  <AlertCircle className="w-3 h-3" />
                  <span className="font-semibold">{timelineData.resumen.itemsEnRiesgo}</span>
                  <span>en riesgo</span>
                </div>
              )}

              {/* Coherence inline - only shown after validation */}
              {showCoherencePanel && validacionData && (
                <div className={`flex items-center gap-1 h-6 px-2 text-xs rounded-md border ${
                  (validacionData.estadisticas?.coherenciaPromedio ?? 0) >= 80
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <BarChart3 className="w-3 h-3" />
                  <span className="font-semibold">{validacionData.estadisticas?.coherenciaPromedio ?? 0}%</span>
                  <span className="hidden sm:inline">coherencia</span>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {showFilters && (
            <Button
              variant={showFiltersSection ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFiltersSection(!showFiltersSection)}
              className="h-7 text-xs"
            >
              <Filter className="w-3.5 h-3.5 mr-1" />
              Filtros
              {showFiltersSection ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />}
            </Button>
          )}

          {showCoherencePanel && (
            <Button
              variant="outline"
              size="sm"
              onClick={runCoherenceValidation}
              disabled={validating}
              className="h-7 text-xs"
            >
              {validating ? (
                <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
              ) : (
                <BarChart3 className="w-3.5 h-3.5 mr-1" />
              )}
              Validar
            </Button>
          )}

          {filtros.tipoVista === 'gantt' && (
            <Button
              variant={showCosts ? "default" : "outline"}
              size="sm"
              onClick={() => setShowCosts(!showCosts)}
              disabled={loading}
              className="h-7 text-xs px-2"
              title={showCosts ? "Ocultar costos" : "Mostrar costos"}
            >
              <DollarSign className="w-3.5 h-3.5 mr-0.5" />
              <span className="hidden sm:inline">Costos</span>
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={loadTimelineData}
            disabled={loading}
            className="h-7 text-xs"
          >
            {loading ? (
              <RefreshCw className="w-3.5 h-3.5 mr-1 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5 mr-1" />
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
              </div>

              {/* Clear filters */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleFiltrosChange({
                  tipoVista: 'gantt',
                  agrupacion: 'proyecto',
                  validarCoherencia: false,
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
              data={timelineData || EMPTY_TIMELINE_DATA}
              loading={loading}
              allowEdit={allowEdit}
              onItemClick={handleItemClick}
              showLegend={true}
              showMinimap={false}
              showCosts={showCosts}
            />
          )}
          
          {filtros.tipoVista === 'lista' && (
            <ListView
              data={timelineData || EMPTY_TIMELINE_DATA}
              loading={loading}
              onItemClick={handleItemClick}
              onItemEdit={handleItemEdit}
              className="h-full"
            />
          )}
          
          {filtros.tipoVista === 'calendario' && (
            <CalendarView
              data={timelineData || EMPTY_TIMELINE_DATA}
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

    </div>
  );
};

export default TimelineView;
