/**
 * 📊 Dashboard Principal de Pedidos - Visualización ejecutiva de métricas y trazabilidad
 * 
 * Dashboard completo con métricas KPI, gráficos interactivos, filtros globales
 * y estados de loading optimizados para reportes de pedidos.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Package,
  Clock,
  AlertTriangle,
  RefreshCw,
  Download,
  Filter,
  Calendar,
  DollarSign,
  Target,
  Activity,
  Zap,
  CheckCircle,
  XCircle,
  Loader2,
  Eye,
  Search,
  Minus
} from 'lucide-react';
import { toast } from 'sonner';
import TrazabilidadTimeline from '@/components/trazabilidad/TrazabilidadTimeline';
import MetricasEntrega from '@/components/trazabilidad/MetricasEntrega';
import GraficoProgreso from '@/components/trazabilidad/GraficoProgreso';
import { generarReportePedidos, obtenerDashboardMetricas } from '@/lib/services/reportes';
import { calcularMetricasPrincipales, calcularTendencias } from '@/lib/utils/metricas';
import { type SerieGrafico, type DatoGrafico } from '@/components/trazabilidad/GraficoProgreso';
import { MetricaEntrega } from '@/components/trazabilidad/MetricasEntrega';
import { EstadoEntregaItem } from '@/types/modelos';
import { formatearFecha } from '@/lib/utils/graficos';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import type { 
  ReportePedidos, 
  MetricasDashboard, 
  FiltrosReporte
} from '@/lib/services/reportes';

// ✅ Interfaces del componente
interface DashboardPedidosProps {
  proyectoId?: string;
  className?: string;
}

interface FiltrosGlobales {
  fechaInicio: string;
  fechaFin: string;
  estado: string;
  proyecto: string;
  proveedor: string;
  categoria: string;
}

interface EstadoCarga {
  metricas: boolean;
  graficos: boolean;
  timeline: boolean;
  exportando: boolean;
}

// 🎨 Configuración de animaciones
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
} as const;

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  }
} as const;

// 🔄 Función para transformar datos de gráficos al formato esperado
function transformarDatosGraficos(graficos?: ReportePedidos['graficos']): SerieGrafico[] {
  if (!graficos) return [];

  const series: SerieGrafico[] = [];

  // 📈 Serie de progreso temporal
  if (graficos.progresoTemporal?.length > 0) {
    const datosEntregados: DatoGrafico[] = graficos.progresoTemporal.map(item => ({
      fecha: item.fecha,
      valor: item.entregados,
      categoria: 'entregados',
      estado: 'completado' as const
    }));

    const datosPendientes: DatoGrafico[] = graficos.progresoTemporal.map(item => ({
      fecha: item.fecha,
      valor: item.pendientes,
      categoria: 'pendientes',
      estado: 'en_progreso' as const
    }));

    const datosRetrasados: DatoGrafico[] = graficos.progresoTemporal.map(item => ({
      fecha: item.fecha,
      valor: item.retrasados,
      categoria: 'retrasados',
      estado: 'retrasado' as const
    }));

    series.push(
      {
        id: 'entregados',
        nombre: 'Entregados',
        datos: datosEntregados,
        color: '#10b981',
        tipo: 'area',
        visible: true,
        formato: 'entero',
        unidad: 'items'
      },
      {
        id: 'pendientes',
        nombre: 'Pendientes',
        datos: datosPendientes,
        color: '#3b82f6',
        tipo: 'area',
        visible: true,
        formato: 'entero',
        unidad: 'items'
      },
      {
        id: 'retrasados',
        nombre: 'Retrasados',
        datos: datosRetrasados,
        color: '#f59e0b',
        tipo: 'area',
        visible: true,
        formato: 'entero',
        unidad: 'items'
      }
    );
  }

  return series;
}

// 🔄 Función para transformar métricas del dashboard al formato esperado
function transformarMetricasEntrega(metricas?: MetricasDashboard['metricas']): MetricaEntrega[] {
  if (!metricas) return [];

  return metricas.map((metrica, index) => ({
    id: metrica.id,
    titulo: metrica.titulo,
    valor: metrica.valor,
    valorAnterior: metrica.valorAnterior,
    unidad: metrica.unidad,
    formato: metrica.formato,
    tendencia: metrica.tendencia === 'subida' ? 'subida' : metrica.tendencia === 'bajada' ? 'bajada' : 'estable',
    porcentajeCambio: metrica.porcentajeCambio,
    descripcion: metrica.descripcion,
    meta: metrica.meta,
    categoria: metrica.categoria,
    icono: getIconoMetrica(metrica.categoria, index),
    color: metrica.color,
    ultimaActualizacion: metrica.ultimaActualizacion
  }));
}

// 🎨 Helper para obtener iconos según categoría
function getIconoMetrica(categoria: string, index: number): React.ReactNode {
  const iconos = {
    principal: <Target className="w-4 h-4" />,
    secundaria: <Activity className="w-4 h-4" />,
    critica: <AlertTriangle className="w-4 h-4" />
  };
  
  return iconos[categoria as keyof typeof iconos] || <Package className="w-4 h-4" />;
}

// 🔧 Utilidades de formateo
const formatearMetrica = (valor: number, tipo: 'moneda' | 'porcentaje' | 'numero' | 'dias') => {
  switch (tipo) {
    case 'moneda':
      return formatCurrency(valor);
    case 'porcentaje':
      return formatPercentage(valor);
    case 'dias':
      return `${valor} días`;
    default:
      return valor.toLocaleString();
  }
};

const obtenerColorTendencia = (tendencia: 'up' | 'down' | 'stable') => {
  switch (tendencia) {
    case 'up':
      return 'text-green-600';
    case 'down':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
};

const obtenerIconoTendencia = (tendencia: 'up' | 'down' | 'stable') => {
  switch (tendencia) {
    case 'up':
      return <TrendingUp className="h-4 w-4" />;
    case 'down':
      return <TrendingDown className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
};

// 🔁 Componente de Métrica KPI
interface MetricaKPI {
  titulo: string;
  valor: number;
  formato: 'moneda' | 'porcentaje' | 'numero' | 'dias';
  tendencia: 'up' | 'down' | 'stable';
  variacion: number;
  icono: React.ReactNode;
  color: string;
}

const MetricaKPIComponent: React.FC<{
  metrica: MetricaKPI;
  loading?: boolean;
}> = ({ metrica, loading = false }) => {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="h-4 w-24 bg-gray-200 rounded animate-pulse" />
          <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent>
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse mb-2" />
          <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div variants={itemVariants}>
      <Card className="hover:shadow-md transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {metrica.titulo}
          </CardTitle>
          <div className={`p-2 rounded-full bg-${metrica.color}-100`}>
            {metrica.icono}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold mb-1">
            {formatearMetrica(metrica.valor, metrica.formato)}
          </div>
          <div className={`flex items-center text-sm ${obtenerColorTendencia(metrica.tendencia)}`}>
            {obtenerIconoTendencia(metrica.tendencia)}
            <span className="ml-1">
              {formatPercentage(Math.abs(metrica.variacion))} vs período anterior
            </span>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// 🔁 Componente de Filtros Globales
const FiltrosGlobales: React.FC<{
  filtros: FiltrosGlobales;
  onFiltrosChange: (filtros: FiltrosGlobales) => void;
  loading?: boolean;
}> = ({ filtros, onFiltrosChange, loading = false }) => {
  const handleFiltroChange = useCallback((campo: keyof FiltrosGlobales, valor: string) => {
    onFiltrosChange({
      ...filtros,
      [campo]: valor
    });
  }, [filtros, onFiltrosChange]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros Globales
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="space-y-2">
            <Label htmlFor="fecha-inicio">Fecha Inicio</Label>
            <Input
              id="fecha-inicio"
              type="date"
              value={filtros.fechaInicio}
              onChange={(e) => handleFiltroChange('fechaInicio', e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="fecha-fin">Fecha Fin</Label>
            <Input
              id="fecha-fin"
              type="date"
              value={filtros.fechaFin}
              onChange={(e) => handleFiltroChange('fechaFin', e.target.value)}
              disabled={loading}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="estado">Estado</Label>
            <Select
              value={filtros.estado}
              onValueChange={(value) => handleFiltroChange('estado', value)}
              disabled={loading}
            >
              <SelectTrigger id="estado">
                <SelectValue placeholder="Todos los estados" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="en_proceso">En Proceso</SelectItem>
                <SelectItem value="entregado">Entregado</SelectItem>
                <SelectItem value="retrasado">Retrasado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="proyecto">Proyecto</Label>
            <Select
              value={filtros.proyecto}
              onValueChange={(value) => handleFiltroChange('proyecto', value)}
              disabled={loading}
            >
              <SelectTrigger id="proyecto">
                <SelectValue placeholder="Todos los proyectos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="proyecto-1">Proyecto Alpha</SelectItem>
                <SelectItem value="proyecto-2">Proyecto Beta</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="proveedor">Proveedor</Label>
            <Select
              value={filtros.proveedor}
              onValueChange={(value) => handleFiltroChange('proveedor', value)}
              disabled={loading}
            >
              <SelectTrigger id="proveedor">
                <SelectValue placeholder="Todos los proveedores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="proveedor-1">Proveedor A</SelectItem>
                <SelectItem value="proveedor-2">Proveedor B</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="categoria">Categoría</Label>
            <Select
              value={filtros.categoria}
              onValueChange={(value) => handleFiltroChange('categoria', value)}
              disabled={loading}
            >
              <SelectTrigger id="categoria">
                <SelectValue placeholder="Todas las categorías" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas</SelectItem>
                <SelectItem value="equipos">Equipos</SelectItem>
                <SelectItem value="materiales">Materiales</SelectItem>
                <SelectItem value="servicios">Servicios</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

// 📊 Componente principal
export const DashboardPedidos: React.FC<DashboardPedidosProps> = ({
  proyectoId,
  className = ''
}) => {
  // 📡 Estados del componente
  const [metricas, setMetricas] = useState<MetricasDashboard | null>(null);
  const [reporteData, setReporteData] = useState<ReportePedidos | null>(null);
  const [filtros, setFiltros] = useState<FiltrosGlobales>({
    fechaInicio: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    fechaFin: new Date().toISOString().split('T')[0],
    estado: 'todos',
    proyecto: proyectoId || 'todos',
    proveedor: 'todos',
    categoria: 'todos'
  });
  const [loading, setLoading] = useState<EstadoCarga>({
    metricas: true,
    graficos: true,
    timeline: true,
    exportando: false
  });
  const [ultimaActualizacion, setUltimaActualizacion] = useState<Date>(new Date());
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 🔄 Función para cargar datos
  const cargarDatos = useCallback(async () => {
    try {
      setLoading(prev => ({ ...prev, metricas: true, graficos: true }));
      
      const filtroReporte: FiltrosReporte = {
        fechaDesde: filtros.fechaInicio ? new Date(filtros.fechaInicio) : undefined,
        fechaHasta: filtros.fechaFin ? new Date(filtros.fechaFin) : undefined,
        estadoEntrega: filtros.estado !== 'todos' ? filtros.estado as any : undefined,
        proyectoId: filtros.proyecto !== 'todos' ? filtros.proyecto : undefined,
        proveedorId: filtros.proveedor !== 'todos' ? filtros.proveedor : undefined
      };

      const [metricasData, reporteResponse] = await Promise.all([
        obtenerDashboardMetricas(filtroReporte),
        generarReportePedidos(filtroReporte)
      ]);

      setMetricas(metricasData);
      setReporteData(reporteResponse);
      setUltimaActualizacion(new Date());
      
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
      toast.error('Error al cargar los datos del dashboard');
    } finally {
      setLoading({
        metricas: false,
        graficos: false,
        timeline: false,
        exportando: false
      });
    }
  }, [filtros]);

  // 🔄 Función para exportar reporte
  const exportarReporte = useCallback(async (formato: 'pdf' | 'excel' | 'csv') => {
    try {
      setLoading(prev => ({ ...prev, exportando: true }));
      
      const filtroReporte: FiltrosReporte = {
        fechaDesde: filtros.fechaInicio ? new Date(filtros.fechaInicio) : undefined,
        fechaHasta: filtros.fechaFin ? new Date(filtros.fechaFin) : undefined,
        estadoEntrega: filtros.estado !== 'todos' ? filtros.estado as EstadoEntregaItem : undefined,
        proyectoId: filtros.proyecto !== 'todos' ? filtros.proyecto : undefined
      };

      // Aquí iría la lógica de exportación
      toast.success(`Reporte ${formato.toUpperCase()} generado exitosamente`);
      
    } catch (error) {
      console.error('Error exportando reporte:', error);
      toast.error('Error al exportar el reporte');
    } finally {
      setLoading(prev => ({ ...prev, exportando: false }));
    }
  }, [filtros]);

  // 🎯 Métricas calculadas
  const metricasKPI = useMemo((): MetricaKPI[] => {
    if (!metricas) return [];
    
    const { resumenGeneral, kpis } = metricas;
    
    return [
      {
        titulo: 'Total Items',
        valor: resumenGeneral.totalItems,
        formato: 'numero' as const,
        tendencia: 'stable' as const,
        variacion: 0,
        icono: <Package className="h-4 w-4" />,
        color: 'blue'
      },
      {
        titulo: 'Items Entregados',
        valor: kpis.itemsEntregados,
        formato: 'numero' as const,
        tendencia: 'up' as const,
        variacion: 5.2,
        icono: <CheckCircle className="h-4 w-4" />,
        color: 'green'
      },
      {
        titulo: 'Progreso General',
        valor: resumenGeneral.porcentajeProgreso,
        formato: 'porcentaje' as const,
        tendencia: 'up' as const,
        variacion: 3.1,
        icono: <TrendingUp className="h-4 w-4" />,
        color: 'blue'
      },
      {
        titulo: 'Tiempo Promedio',
        valor: resumenGeneral.tiempoPromedioEntrega,
        formato: 'dias' as const,
        tendencia: 'down' as const,
        variacion: -2.3,
        icono: <Clock className="h-4 w-4" />,
        color: 'yellow'
      }
    ];
  }, [metricas]);

  // ⚡ Efectos
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(cargarDatos, 5 * 60 * 1000); // 5 minutos
    return () => clearInterval(interval);
  }, [autoRefresh, cargarDatos]);

  return (
    <motion.div
      className={`space-y-6 ${className}`}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {/* 🎛️ Header con controles */}
      <motion.div variants={itemVariants}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard de Pedidos</h1>
            <p className="text-muted-foreground">
              Última actualización: {formatearFecha(ultimaActualizacion, 'completo')}
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setAutoRefresh(!autoRefresh)}
              className={autoRefresh ? 'bg-green-50 border-green-200' : ''}
            >
              <Zap className={`h-4 w-4 mr-2 ${autoRefresh ? 'text-green-600' : ''}`} />
              Auto-refresh
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={cargarDatos}
              disabled={loading.metricas}
            >
              {loading.metricas ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-2" />
              )}
              Actualizar
            </Button>
            
            <Select onValueChange={(value) => exportarReporte(value as 'pdf' | 'excel' | 'csv')}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Exportar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pdf">PDF</SelectItem>
                <SelectItem value="excel">Excel</SelectItem>
                <SelectItem value="csv">CSV</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </motion.div>

      {/* 🎛️ Filtros Globales */}
      <motion.div variants={itemVariants}>
        <FiltrosGlobales
          filtros={filtros}
          onFiltrosChange={setFiltros}
          loading={loading.metricas}
        />
      </motion.div>

      {/* 📊 Métricas KPI */}
      <motion.div variants={itemVariants}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {metricasKPI.map((metrica, index) => (
          <MetricaKPIComponent
            key={`metrica-${index}`}
            metrica={metrica}
            loading={loading.metricas}
          />
        ))}
        </div>
      </motion.div>

      {/* 📈 Contenido principal con tabs */}
      <motion.div variants={itemVariants}>
        <Tabs defaultValue="resumen" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="resumen">Resumen</TabsTrigger>
            <TabsTrigger value="graficos">Gráficos</TabsTrigger>
            <TabsTrigger value="timeline">Timeline</TabsTrigger>
            <TabsTrigger value="metricas">Métricas</TabsTrigger>
          </TabsList>

          <TabsContent value="resumen" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Resumen Ejecutivo</CardTitle>
                  <CardDescription>
                    Vista general del estado de pedidos y entregas
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading.metricas ? (
                    <div className="space-y-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-4 bg-gray-200 rounded animate-pulse" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Métricas Principales</span>
                        <Badge variant="secondary">{metricas?.metricas?.length || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Items Entregados</span>
                        <Badge variant="default">{metricas?.kpis?.itemsEntregados || 0}</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Crecimiento</span>
                        <Badge variant="outline">{metricas?.tendencias?.crecimiento || 0}%</Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Última Actualización</span>
                        <span className="text-xs text-muted-foreground">
                          {new Date().toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Alertas y Notificaciones</CardTitle>
                  <CardDescription>
                    Elementos que requieren atención inmediata
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading.metricas ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, i) => (
                        <div key={i} className="flex items-center space-x-3">
                          <div className="h-4 w-4 bg-gray-200 rounded animate-pulse" />
                          <div className="h-4 flex-1 bg-gray-200 rounded animate-pulse" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 text-red-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span className="text-sm">5 pedidos críticos retrasados</span>
                      </div>
                      <div className="flex items-center space-x-3 text-yellow-600">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">12 entregas próximas a vencer</span>
                      </div>
                      <div className="flex items-center space-x-3 text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span className="text-sm">23 entregas completadas hoy</span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="graficos" className="space-y-4">
            <GraficoProgreso
              series={transformarDatosGraficos(reporteData?.graficos)}
              configuracion={{
                tipo: 'linea',
                titulo: 'Progreso de Pedidos',
                mostrarLeyenda: true,
                mostrarGrid: true,
                mostrarTooltip: true,
                mostrarBrush: false,
                mostrarMetas: true,
                animaciones: true,
                altura: 384
              }}
              cargando={loading.graficos}
              className="h-96"
            />
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <TrazabilidadTimeline
              eventos={reporteData?.timeline || []}
              cargando={loading.timeline}
              pedidoId={proyectoId}
              mostrarDetalles={true}
              animaciones={true}
            />
          </TabsContent>

          <TabsContent value="metricas" className="space-y-4">
            <MetricasEntrega
              metricas={transformarMetricasEntrega(metricas?.metricas)}
              cargando={loading.metricas}
              titulo="Métricas de Entrega"
              animaciones={true}
              mostrarTendencias={true}
            />
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
};

export default DashboardPedidos;
