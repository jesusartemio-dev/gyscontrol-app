/**
 * 📈 Componente Gráfico de Progreso - Sistema GYS
 * 
 * Gráficos interactivos con Recharts para visualizar progreso de entregas,
 * tendencias temporales y comparativas de rendimiento.
 * 
 * @author TRAE AI - Agente Senior Fullstack
 * @version 2.0.0
 * @since 2025-01-27
 */

'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Activity,
  Calendar,
  Download,
  Maximize2,
  Minimize2,
  RefreshCw,
  Filter,
  Eye,
  EyeOff,
  Info,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { formatearNumero, formatearFecha, COLORES_GYS } from '@/lib/utils/graficos';

import { cn } from '@/lib/utils';

// 📋 Interfaces
export interface DatoGrafico {
  fecha: string;
  valor: number;
  valorAnterior?: number;
  meta?: number;
  categoria?: string;
  estado?: 'completado' | 'en_progreso' | 'retrasado' | 'cancelado';
  detalles?: Record<string, any>;
}

export interface SerieGrafico {
  id: string;
  nombre: string;
  datos: DatoGrafico[];
  color: string;
  tipo: 'linea' | 'area' | 'barra';
  visible: boolean;
  formato: 'entero' | 'decimal' | 'porcentaje' | 'moneda' | 'tiempo';
  unidad?: string;
}

export interface ConfiguracionGrafico {
  tipo: 'linea' | 'area' | 'barra' | 'pie' | 'combinado';
  titulo: string;
  subtitulo?: string;
  mostrarLeyenda: boolean;
  mostrarGrid: boolean;
  mostrarTooltip: boolean;
  mostrarBrush: boolean;
  mostrarMetas: boolean;
  animaciones: boolean;
  altura: number;
  margenX?: number;
  margenY?: number;
}

export interface GraficoProgresoProps {
  series: SerieGrafico[];
  configuracion: ConfiguracionGrafico;
  className?: string;
  cargando?: boolean;
  error?: string;
  compacto?: boolean;
  interactivo?: boolean;
  exportable?: boolean;
  filtrable?: boolean;
  rangoFechas?: [Date, Date];
  onSerieToggle?: (serieId: string) => void;
  onPuntoClick?: (dato: DatoGrafico, serie: SerieGrafico) => void;
  onExportar?: (formato: 'png' | 'svg' | 'csv') => void;
  onActualizar?: () => void;
  ultimaActualizacion?: Date;
}

// Interfaces de compatibilidad
export interface DatoProgreso {
  fecha: string;
  completados: number;
  pendientes: number;
  retrasados: number;
}

// 🎨 Configuración de colores por estado
const COLORES_ESTADO = {
  completado: '#10b981', // green-500
  en_progreso: '#3b82f6', // blue-500
  retrasado: '#f59e0b', // amber-500
  cancelado: '#ef4444' // red-500
};

// 📊 Configuraciones predefinidas
const CONFIGURACIONES_PREDEFINIDAS = {
  progreso: {
    tipo: 'area' as const,
    titulo: 'Progreso de Entregas',
    mostrarLeyenda: true,
    mostrarGrid: true,
    mostrarTooltip: true,
    mostrarBrush: false,
    mostrarMetas: true,
    animaciones: true,
    altura: 300
  },
  tendencia: {
    tipo: 'linea' as const,
    titulo: 'Tendencia Temporal',
    mostrarLeyenda: true,
    mostrarGrid: true,
    mostrarTooltip: true,
    mostrarBrush: true,
    mostrarMetas: false,
    animaciones: true,
    altura: 250
  },
  comparativo: {
    tipo: 'barra' as const,
    titulo: 'Comparativo por Período',
    mostrarLeyenda: false,
    mostrarGrid: true,
    mostrarTooltip: true,
    mostrarBrush: false,
    mostrarMetas: true,
    animaciones: true,
    altura: 200
  },
  distribucion: {
    tipo: 'pie' as const,
    titulo: 'Distribución por Estado',
    mostrarLeyenda: true,
    mostrarGrid: false,
    mostrarTooltip: true,
    mostrarBrush: false,
    mostrarMetas: false,
    animaciones: true,
    altura: 300
  }
};

/**
 * 🔄 Componente de Skeleton para gráficos
 */
function GraficoSkeleton({ altura = 300 }: { altura?: number }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="flex space-x-2">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-8" />
        </div>
      </div>
      <Skeleton className={`w-full`} style={{ height: altura }} />
    </div>
  );
}

/**
 * 🎨 Tooltip personalizado
 */
function TooltipPersonalizado({ active, payload, label, formato }: any) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg"
    >
      <p className="font-medium text-gray-900 mb-2">
        {formatearFecha(new Date(label), 'corto')}
      </p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center space-x-2 text-sm">
          <div 
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-gray-600">{entry.name}:</span>
          <span className="font-medium text-gray-900">
            {formatearNumero(entry.value, formato || 'entero')}
          </span>
        </div>
      ))}
    </motion.div>
  );
}

/**
 * 📈 Componente de gráfico de línea/área
 */
function GraficoLinea({
  series,
  configuracion,
  compacto,
  onPuntoClick
}: {
  series: SerieGrafico[];
  configuracion: ConfiguracionGrafico;
  compacto: boolean;
  onPuntoClick?: (dato: DatoGrafico, serie: SerieGrafico) => void;
}) {
  const seriesVisibles = series.filter(s => s.visible);
  const datos = useMemo(() => {
    if (seriesVisibles.length === 0) return [];
    
    // Combinar datos de todas las series por fecha
    const fechasUnicas = Array.from(
      new Set(seriesVisibles.flatMap(s => s.datos.map(d => d.fecha)))
    ).sort();
    
    return fechasUnicas.map(fecha => {
      const punto: any = { fecha };
      seriesVisibles.forEach(serie => {
        const dato = serie.datos.find(d => d.fecha === fecha);
        punto[serie.id] = dato?.valor || 0;
        if (dato?.meta) punto[`${serie.id}_meta`] = dato.meta;
      });
      return punto;
    });
  }, [seriesVisibles]);
  
  const ChartComponent = configuracion.tipo === 'area' ? AreaChart : LineChart;
  
  return (
    <ResponsiveContainer width="100%" height={configuracion.altura}>
      <ChartComponent data={datos} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {configuracion.mostrarGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        )}
        <XAxis 
          dataKey="fecha"
          tick={{ fontSize: compacto ? 10 : 12 }}
          tickFormatter={(value) => formatearFecha(new Date(value), 'corto')}
        />
        <YAxis 
          tick={{ fontSize: compacto ? 10 : 12 }}
          tickFormatter={(value) => formatearNumero(value, 'entero')}
        />
        {configuracion.mostrarTooltip && (
          <Tooltip content={<TooltipPersonalizado formato={seriesVisibles[0]?.formato} />} />
        )}
        {configuracion.mostrarLeyenda && !compacto && <Legend />}
        
        {seriesVisibles.map((serie) => {
          if (configuracion.tipo === 'area') {
            return (
              <Area
                key={serie.id}
                type="monotone"
                dataKey={serie.id}
                stroke={serie.color}
                fill={serie.color}
                fillOpacity={0.3}
                strokeWidth={2}
                dot={{ fill: serie.color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: serie.color, strokeWidth: 2 }}
                animationDuration={configuracion.animaciones ? 1000 : 0}
              />
            );
          } else {
            return (
              <Line
                key={serie.id}
                type="monotone"
                dataKey={serie.id}
                stroke={serie.color}
                strokeWidth={2}
                dot={{ fill: serie.color, strokeWidth: 2, r: 4 }}
                activeDot={{ r: 6, stroke: serie.color, strokeWidth: 2 }}
                animationDuration={configuracion.animaciones ? 1000 : 0}
              />
            );
          }
        })}
        
        {/* Líneas de meta */}
        {configuracion.mostrarMetas && seriesVisibles.map((serie) => {
          const metaPromedio = serie.datos.reduce((acc, d) => acc + (d.meta || 0), 0) / serie.datos.length;
          if (metaPromedio > 0) {
            return (
              <ReferenceLine
                key={`${serie.id}_meta`}
                y={metaPromedio}
                stroke={serie.color}
                strokeDasharray="5 5"
                strokeOpacity={0.7}
              />
            );
          }
          return null;
        })}
        
        {configuracion.mostrarBrush && (
          <Brush dataKey="fecha" height={30} stroke={COLORES_GYS.primario} />
        )}
      </ChartComponent>
    </ResponsiveContainer>
  );
}

/**
 * 📊 Componente de gráfico de barras
 */
function GraficoBarra({
  series,
  configuracion,
  compacto
}: {
  series: SerieGrafico[];
  configuracion: ConfiguracionGrafico;
  compacto: boolean;
}) {
  const seriesVisibles = series.filter(s => s.visible);
  const datos = useMemo(() => {
    if (seriesVisibles.length === 0) return [];
    
    const fechasUnicas = Array.from(
      new Set(seriesVisibles.flatMap(s => s.datos.map(d => d.fecha)))
    ).sort();
    
    return fechasUnicas.map(fecha => {
      const punto: any = { fecha };
      seriesVisibles.forEach(serie => {
        const dato = serie.datos.find(d => d.fecha === fecha);
        punto[serie.id] = dato?.valor || 0;
      });
      return punto;
    });
  }, [seriesVisibles]);
  
  return (
    <ResponsiveContainer width="100%" height={configuracion.altura}>
      <BarChart data={datos} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        {configuracion.mostrarGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        )}
        <XAxis 
          dataKey="fecha"
          tick={{ fontSize: compacto ? 10 : 12 }}
          tickFormatter={(value) => formatearFecha(new Date(value), 'corto')}
        />
        <YAxis 
          tick={{ fontSize: compacto ? 10 : 12 }}
          tickFormatter={(value) => formatearNumero(value, 'entero')}
        />
        {configuracion.mostrarTooltip && (
          <Tooltip content={<TooltipPersonalizado formato={seriesVisibles[0]?.formato} />} />
        )}
        {configuracion.mostrarLeyenda && !compacto && <Legend />}
        
        {seriesVisibles.map((serie) => (
          <Bar
            key={serie.id}
            dataKey={serie.id}
            fill={serie.color}
            radius={[2, 2, 0, 0]}
            animationDuration={configuracion.animaciones ? 800 : 0}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * 🥧 Componente de gráfico circular
 */
function GraficoPie({
  series,
  configuracion,
  compacto
}: {
  series: SerieGrafico[];
  configuracion: ConfiguracionGrafico;
  compacto: boolean;
}) {
  const datos = useMemo(() => {
    if (series.length === 0) return [];
    
    // Agrupar por estado/categoría
    const agrupado: Record<string, number> = {};
    series[0]?.datos.forEach(dato => {
      const categoria = dato.categoria || dato.estado || 'Sin categoría';
      agrupado[categoria] = (agrupado[categoria] || 0) + dato.valor;
    });
    
    return Object.entries(agrupado).map(([nombre, valor], index) => ({
      nombre,
      valor,
      color: COLORES_GYS.graficos.pie[index % COLORES_GYS.graficos.pie.length]
    }));
  }, [series]);
  
  return (
    <ResponsiveContainer width="100%" height={configuracion.altura}>
      <PieChart>
        <Pie
          data={datos}
          cx="50%"
          cy="50%"
          outerRadius={compacto ? 60 : 80}
          fill="#8884d8"
          dataKey="valor"
          animationDuration={configuracion.animaciones ? 800 : 0}
        >
          {datos.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        {configuracion.mostrarTooltip && (
          <Tooltip 
            formatter={(value: number) => [formatearNumero(value, 'entero'), 'Cantidad']}
          />
        )}
        {configuracion.mostrarLeyenda && <Legend />}
      </PieChart>
    </ResponsiveContainer>
  );
}

/**
 * 📈 Componente principal GraficoProgreso
 */
export default function GraficoProgreso({
  series,
  configuracion,
  className,
  cargando = false,
  error,
  compacto = false,
  interactivo = true,
  exportable = false,
  filtrable = false,
  rangoFechas,
  onSerieToggle,
  onPuntoClick,
  onExportar,
  onActualizar,
  ultimaActualizacion
}: GraficoProgresoProps) {
  const [expandido, setExpandido] = useState(false);
  const [tipoVista, setTipoVista] = useState(configuracion.tipo);
  
  // 🔍 Filtrar series por rango de fechas
  const seriesFiltradas = useMemo(() => {
    if (!rangoFechas) return series;
    
    const [fechaInicio, fechaFin] = rangoFechas;
    return series.map(serie => ({
      ...serie,
      datos: serie.datos.filter(dato => {
        const fecha = new Date(dato.fecha);
        return fecha >= fechaInicio && fecha <= fechaFin;
      })
    }));
  }, [series, rangoFechas]);
  
  // 📊 Estadísticas del gráfico
  const estadisticas = useMemo(() => {
    const seriesVisibles = seriesFiltradas.filter(s => s.visible);
    const totalPuntos = seriesVisibles.reduce((acc, s) => acc + s.datos.length, 0);
    const valorPromedio = seriesVisibles.length > 0 
      ? seriesVisibles.reduce((acc, s) => {
          const promedio = s.datos.reduce((sum, d) => sum + d.valor, 0) / s.datos.length;
          return acc + promedio;
        }, 0) / seriesVisibles.length
      : 0;
    
    return { totalPuntos, valorPromedio, seriesVisibles: seriesVisibles.length };
  }, [seriesFiltradas]);
  
  // 🎨 Renderizar gráfico según tipo
  const renderizarGrafico = useCallback(() => {
    const config = { ...configuracion, tipo: tipoVista };
    
    switch (tipoVista) {
      case 'linea':
      case 'area':
        return (
          <GraficoLinea
            series={seriesFiltradas}
            configuracion={config}
            compacto={compacto}
            onPuntoClick={onPuntoClick}
          />
        );
      case 'barra':
        return (
          <GraficoBarra
            series={seriesFiltradas}
            configuracion={config}
            compacto={compacto}
          />
        );
      case 'pie':
        return (
          <GraficoPie
            series={seriesFiltradas}
            configuracion={config}
            compacto={compacto}
          />
        );
      default:
        return null;
    }
  }, [seriesFiltradas, configuracion, tipoVista, compacto, onPuntoClick]);
  
  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className={cn('pb-4', compacto && 'pb-2')}>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className={cn(
              'text-gray-900',
              compacto ? 'text-lg' : 'text-xl'
            )}>
              {configuracion.titulo}
            </CardTitle>
            {configuracion.subtitulo && !compacto && (
              <p className="text-sm text-gray-600 mt-1">
                {configuracion.subtitulo}
              </p>
            )}
            
            {/* 📊 Estadísticas rápidas */}
            {!compacto && (
              <div className="flex items-center space-x-4 text-xs text-gray-500 mt-2">
                <div className="flex items-center space-x-1">
                  <Activity className="w-3 h-3" />
                  <span>{estadisticas.seriesVisibles} series activas</span>
                </div>
                <div className="flex items-center space-x-1">
                  <BarChart3 className="w-3 h-3" />
                  <span>{estadisticas.totalPuntos} puntos de datos</span>
                </div>
                {ultimaActualizacion && (
                  <div className="flex items-center space-x-1">
                    <Calendar className="w-3 h-3" />
                    <span>Actualizado: {formatearFecha(ultimaActualizacion, 'hora')}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* 🔄 Controles */}
          {interactivo && (
            <div className="flex items-center space-x-2">
              {/* Selector de tipo de gráfico */}
              {!compacto && (
                <div className="flex items-center space-x-1">
                  <Button
                    variant={tipoVista === 'linea' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTipoVista('linea')}
                  >
                    <LineChartIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={tipoVista === 'barra' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTipoVista('barra')}
                  >
                    <BarChart3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={tipoVista === 'pie' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setTipoVista('pie')}
                  >
                    <PieChartIcon className="w-4 h-4" />
                  </Button>
                </div>
              )}
              
              {/* Toggle de series */}
              {filtrable && series.length > 1 && (
                <div className="flex items-center space-x-1">
                  {series.map((serie) => (
                    <Button
                      key={serie.id}
                      variant={serie.visible ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => onSerieToggle?.(serie.id)}
                      className="text-xs"
                    >
                      {serie.visible ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                      {serie.nombre}
                    </Button>
                  ))}
                </div>
              )}
              
              {/* Controles adicionales */}
              <div className="flex items-center space-x-1">
                {onActualizar && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onActualizar}
                    disabled={cargando}
                  >
                    <RefreshCw className={cn('w-4 h-4', cargando && 'animate-spin')} />
                  </Button>
                )}
                
                {exportable && onExportar && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onExportar('png')}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                )}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setExpandido(!expandido)}
                >
                  {expandido ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent className={cn('pt-0', compacto && 'p-2')}>
        {/* 🔄 Estado de carga */}
        {cargando && (
          <GraficoSkeleton altura={expandido ? configuracion.altura * 1.5 : configuracion.altura} />
        )}
        
        {/* ❌ Estado de error */}
        {error && !cargando && (
          <motion.div 
            className="flex flex-col items-center justify-center py-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Error al cargar el gráfico
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            {onActualizar && (
              <Button onClick={onActualizar} variant="outline">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
            )}
          </motion.div>
        )}
        
        {/* 📊 Gráfico principal */}
        {!cargando && !error && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className={cn(
              'w-full',
              expandido && 'fixed inset-4 z-50 bg-white rounded-lg shadow-2xl p-6'
            )}
            style={{
              height: expandido ? 'calc(100vh - 2rem)' : 'auto'
            }}
          >
            {expandido && (
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">
                  {configuracion.titulo}
                </h2>
                <Button
                  variant="outline"
                  onClick={() => setExpandido(false)}
                >
                  <Minimize2 className="w-4 h-4" />
                </Button>
              </div>
            )}
            
            <div style={{
              height: expandido 
                ? 'calc(100% - 4rem)' 
                : configuracion.altura
            }}>
              {renderizarGrafico()}
            </div>
          </motion.div>
        )}
        
        {/* 📭 Estado vacío */}
        {!cargando && !error && seriesFiltradas.every(s => s.datos.length === 0) && (
          <motion.div 
            className="flex flex-col items-center justify-center py-12 text-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <BarChart3 className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Sin datos para mostrar
            </h3>
            <p className="text-gray-600">
              No hay información disponible para el período seleccionado.
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}

// 🏭 Funciones de utilidad para crear gráficos
export function crearSerieGrafico(
  id: string,
  nombre: string,
  datos: DatoGrafico[],
  opciones: Partial<Omit<SerieGrafico, 'id' | 'nombre' | 'datos'>> = {}
): SerieGrafico {
  return {
    id,
    nombre,
    datos,
    color: opciones.color || COLORES_GYS.graficos.pie[0],
    tipo: opciones.tipo || 'linea',
    visible: opciones.visible !== false,
    formato: opciones.formato || 'entero',
    unidad: opciones.unidad
  };
}

export function crearConfiguracionGrafico(
  tipo: ConfiguracionGrafico['tipo'],
  titulo: string,
  opciones: Partial<Omit<ConfiguracionGrafico, 'tipo' | 'titulo'>> = {}
): ConfiguracionGrafico {
  // Map chart types to predefined configurations
  const tipoConfiguracion = {
    'area': 'progreso',
    'linea': 'tendencia', 
    'barra': 'comparativo',
    'pie': 'distribucion',
    'combinado': 'progreso'
  } as const;
  
  const claveConfiguracion = tipoConfiguracion[tipo] || 'progreso';
  const predefinida = CONFIGURACIONES_PREDEFINIDAS[claveConfiguracion];
  
  return {
    tipo,
    titulo,
    subtitulo: opciones.subtitulo,
    mostrarLeyenda: opciones.mostrarLeyenda ?? predefinida.mostrarLeyenda,
    mostrarGrid: opciones.mostrarGrid ?? predefinida.mostrarGrid,
    mostrarTooltip: opciones.mostrarTooltip ?? predefinida.mostrarTooltip,
    mostrarBrush: opciones.mostrarBrush ?? predefinida.mostrarBrush,
    mostrarMetas: opciones.mostrarMetas ?? predefinida.mostrarMetas,
    animaciones: opciones.animaciones ?? predefinida.animaciones,
    altura: opciones.altura ?? predefinida.altura,
    margenX: opciones.margenX,
    margenY: opciones.margenY
  };
}

// 📊 Configuraciones predefinidas exportadas
export { CONFIGURACIONES_PREDEFINIDAS, COLORES_ESTADO };

// 🔄 Función de compatibilidad para props anteriores
export function convertirDatosProgreso(datos: DatoProgreso[]): SerieGrafico[] {
  return [
    crearSerieGrafico('completados', 'Completados', 
      datos.map(d => ({ fecha: d.fecha, valor: d.completados, estado: 'completado' as const })),
      { color: COLORES_ESTADO.completado, tipo: 'area' }
    ),
    crearSerieGrafico('pendientes', 'Pendientes',
      datos.map(d => ({ fecha: d.fecha, valor: d.pendientes, estado: 'en_progreso' as const })),
      { color: COLORES_ESTADO.en_progreso, tipo: 'area' }
    ),
    crearSerieGrafico('retrasados', 'Retrasados',
      datos.map(d => ({ fecha: d.fecha, valor: d.retrasados, estado: 'retrasado' as const })),
      { color: COLORES_ESTADO.retrasado, tipo: 'area' }
    )
  ];
}

// ✅ Exportar componente como default y named export para compatibilidad
export { GraficoProgreso };
