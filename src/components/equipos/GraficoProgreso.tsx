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

// 📊 Interfaces para datos específicos
export interface DatoProgreso {
  fecha: string;
  completados: number;
  pendientes: number;
  retrasados: number;
}

// 🎨 Configuraciones de colores
const COLORES_ESTADO = {
  completado: '#10b981', // green-500
  en_progreso: '#3b82f6', // blue-500
  retrasado: '#f59e0b', // amber-500
  cancelado: '#ef4444' // red-500
};

// ⚙️ Configuraciones predefinidas
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
 * 💡 Tooltip personalizado para gráficos
 */
function TooltipPersonalizado({ active, payload, label, formato }: any) {
  if (!active || !payload || !payload.length) {
    return null;
  }

  return (
    <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
      <p className="font-medium text-gray-900 mb-2">
        {formatearFecha(label)}
      </p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center space-x-2">
          <div 
            className="w-3 h-3 rounded-full" 
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-sm text-gray-600">{entry.name}:</span>
          <span className="text-sm font-medium">
            {formatearNumero(entry.value, formato || 'entero')}
          </span>
        </div>
      ))}
    </div>
  );
}

/**
 * 📈 Componente de gráfico de líneas
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

  return (
    <ResponsiveContainer width="100%" height={configuracion.altura}>
      <LineChart
        data={seriesVisibles[0]?.datos || []}
        margin={{
          top: compacto ? 10 : 20,
          right: compacto ? 10 : 30,
          left: compacto ? 10 : 20,
          bottom: compacto ? 10 : 20
        }}
      >
        {configuracion.mostrarGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        )}
        <XAxis 
          dataKey="fecha" 
          tick={{ fontSize: compacto ? 10 : 12 }}
          tickFormatter={(value) => formatearFecha(value, 'corto')}
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
          <Line
            key={serie.id}
            type="monotone"
            dataKey="valor"
            stroke={serie.color}
            strokeWidth={compacto ? 1.5 : 2}
            dot={compacto ? false : { r: 3 }}
            activeDot={{ 
              r: compacto ? 4 : 6, 
              onClick: onPuntoClick ? (data: any) => {
                // ✅ En Recharts activeDot onClick, 'data' contiene directamente los datos del punto
                if (data && data.payload) {
                  const dato = data.payload as DatoGrafico;
                  onPuntoClick(dato, serie);
                }
              } : undefined
            }}
            animationDuration={configuracion.animaciones ? 1000 : 0}
          />
        ))}
        
        {/* Líneas de referencia para metas */}
        {configuracion.mostrarMetas && seriesVisibles.map((serie) => {
          const meta = serie.datos[0]?.meta;
          return meta ? (
            <ReferenceLine 
              key={`meta-${serie.id}`}
              y={meta} 
              stroke={serie.color} 
              strokeDasharray="5 5" 
              strokeOpacity={0.6}
            />
          ) : null;
        })}
        
        {configuracion.mostrarBrush && (
          <Brush 
            dataKey="fecha" 
            height={30} 
            stroke={COLORES_GYS.primario}
          />
        )}
      </LineChart>
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

  return (
    <ResponsiveContainer width="100%" height={configuracion.altura}>
      <BarChart
        data={seriesVisibles[0]?.datos || []}
        margin={{
          top: compacto ? 10 : 20,
          right: compacto ? 10 : 30,
          left: compacto ? 10 : 20,
          bottom: compacto ? 10 : 20
        }}
      >
        {configuracion.mostrarGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        )}
        <XAxis 
          dataKey="fecha" 
          tick={{ fontSize: compacto ? 10 : 12 }}
          tickFormatter={(value) => formatearFecha(value, 'corto')}
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
            dataKey="valor"
            fill={serie.color}
            radius={compacto ? [2, 2, 0, 0] : [4, 4, 0, 0]}
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
 * 🎯 Componente principal de gráfico de progreso
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
  const [tipoGrafico, setTipoGrafico] = useState(configuracion.tipo);
  const [expandido, setExpandido] = useState(false);
  const [seriesLocales, setSeriesLocales] = useState(series);

  // 🔄 Actualizar series cuando cambien las props
  React.useEffect(() => {
    setSeriesLocales(series);
  }, [series]);

  // 🎛️ Manejar toggle de series
  const handleSerieToggle = useCallback((serieId: string) => {
    setSeriesLocales(prev => 
      prev.map(serie => 
        serie.id === serieId 
          ? { ...serie, visible: !serie.visible }
          : serie
      )
    );
    onSerieToggle?.(serieId);
  }, [onSerieToggle]);

  // 📊 Renderizar gráfico según tipo
  const renderGrafico = () => {
    const props = {
      series: seriesLocales,
      configuracion: { ...configuracion, tipo: tipoGrafico },
      compacto,
      onPuntoClick
    };

    switch (tipoGrafico) {
      case 'linea':
        return <GraficoLinea {...props} />;
      case 'barra':
        return <GraficoBarra {...props} />;
      case 'pie':
        return <GraficoPie {...props} />;
      case 'area':
        return (
          <ResponsiveContainer width="100%" height={configuracion.altura}>
            <AreaChart
              data={seriesLocales.filter(s => s.visible)[0]?.datos || []}
              margin={{
                top: compacto ? 10 : 20,
                right: compacto ? 10 : 30,
                left: compacto ? 10 : 20,
                bottom: compacto ? 10 : 20
              }}
            >
              {configuracion.mostrarGrid && (
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              )}
              <XAxis 
                dataKey="fecha" 
                tick={{ fontSize: compacto ? 10 : 12 }}
                tickFormatter={(value) => formatearFecha(value, 'corto')}
              />
              <YAxis 
                tick={{ fontSize: compacto ? 10 : 12 }}
                tickFormatter={(value) => formatearNumero(value, 'entero')}
              />
              {configuracion.mostrarTooltip && (
                <Tooltip content={<TooltipPersonalizado formato={seriesLocales[0]?.formato} />} />
              )}
              {configuracion.mostrarLeyenda && !compacto && <Legend />}
              
              {seriesLocales.filter(s => s.visible).map((serie) => (
                <Area
                  key={serie.id}
                  type="monotone"
                  dataKey="valor"
                  stroke={serie.color}
                  fill={serie.color}
                  fillOpacity={0.6}
                  strokeWidth={compacto ? 1.5 : 2}
                  animationDuration={configuracion.animaciones ? 1000 : 0}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        );
      default:
        return <GraficoLinea {...props} />;
    }
  };

  // 🎨 Estados de carga y error
  if (cargando) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-6">
          <GraficoSkeleton altura={configuracion.altura} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center" style={{ height: configuracion.altura }}>
            <AlertTriangle className="w-12 h-12 text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Error al cargar gráfico
            </h3>
            <p className="text-gray-500 text-center mb-4">{error}</p>
            {onActualizar && (
              <Button onClick={onActualizar} variant="outline" size="sm">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reintentar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!series.length) {
    return (
      <Card className={cn('w-full', className)}>
        <CardContent className="p-6">
          <div className="flex flex-col items-center justify-center" style={{ height: configuracion.altura }}>
            <BarChart3 className="w-12 h-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Sin datos disponibles
            </h3>
            <p className="text-gray-500 text-center">
              No hay información para mostrar en el gráfico.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader className={cn('pb-4', compacto && 'pb-2')}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className={cn('text-lg font-semibold', compacto && 'text-base')}>
              {configuracion.titulo}
            </CardTitle>
            {configuracion.subtitulo && (
              <p className="text-sm text-gray-500 mt-1">
                {configuracion.subtitulo}
              </p>
            )}
          </div>
          
          {/* 🎛️ Controles */}
          {interactivo && !compacto && (
            <div className="flex items-center space-x-2">
              {/* Selector de tipo de gráfico */}
              <Select value={tipoGrafico} onValueChange={(value: any) => setTipoGrafico(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="linea">
                    <div className="flex items-center space-x-2">
                      <LineChartIcon className="w-4 h-4" />
                      <span>Línea</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="area">
                    <div className="flex items-center space-x-2">
                      <Activity className="w-4 h-4" />
                      <span>Área</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="barra">
                    <div className="flex items-center space-x-2">
                      <BarChart3 className="w-4 h-4" />
                      <span>Barras</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="pie">
                    <div className="flex items-center space-x-2">
                      <PieChartIcon className="w-4 h-4" />
                      <span>Circular</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* Botón de expansión */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandido(!expandido)}
              >
                {expandido ? (
                  <Minimize2 className="w-4 h-4" />
                ) : (
                  <Maximize2 className="w-4 h-4" />
                )}
              </Button>
              
              {/* Botón de actualización */}
              {onActualizar && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onActualizar}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              )}
              
              {/* Botón de exportación */}
              {exportable && onExportar && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onExportar('png')}
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>
          )}
        </div>
        
        {/* 🏷️ Controles de series */}
        {filtrable && !compacto && seriesLocales.length > 1 && (
          <div className="flex flex-wrap gap-2 mt-3">
            {seriesLocales.map((serie) => (
              <Badge
                key={serie.id}
                variant={serie.visible ? "default" : "outline"}
                className="cursor-pointer transition-all"
                onClick={() => handleSerieToggle(serie.id)}
                style={{
                  backgroundColor: serie.visible ? serie.color : 'transparent',
                  borderColor: serie.color,
                  color: serie.visible ? 'white' : serie.color
                }}
              >
                <div className="flex items-center space-x-1">
                  {serie.visible ? (
                    <Eye className="w-3 h-3" />
                  ) : (
                    <EyeOff className="w-3 h-3" />
                  )}
                  <span>{serie.nombre}</span>
                </div>
              </Badge>
            ))}
          </div>
        )}
        
        {/* 📅 Información de actualización */}
        {ultimaActualizacion && !compacto && (
          <div className="flex items-center space-x-2 text-xs text-gray-500 mt-2">
            <Calendar className="w-3 h-3" />
            <span>
              Actualizado: {formatearFecha(ultimaActualizacion, 'completo')}
            </span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className={cn('p-6', compacto && 'p-4')}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className={expandido ? 'fixed inset-4 z-50 bg-white rounded-lg shadow-2xl p-6' : ''}
        >
          {expandido && (
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">{configuracion.titulo}</h2>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setExpandido(false)}
              >
                <Minimize2 className="w-4 h-4" />
              </Button>
            </div>
          )}
          
          <div style={{ height: expandido ? 'calc(100vh - 200px)' : configuracion.altura }}>
            {renderGrafico()}
          </div>
        </motion.div>
      </CardContent>
    </Card>
  );
}

/**
 * 🏭 Función helper para crear series de gráfico
 */
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
    color: opciones.color || COLORES_GYS.primario,
    tipo: opciones.tipo || 'linea',
    visible: opciones.visible ?? true,
    formato: opciones.formato || 'entero',
    unidad: opciones.unidad
  };
}

export function crearConfiguracionGrafico(
  tipo: ConfiguracionGrafico['tipo'],
  titulo: string,
  opciones: Partial<Omit<ConfiguracionGrafico, 'tipo' | 'titulo'>> = {}
): ConfiguracionGrafico {
  return {
    tipo,
    titulo,
    subtitulo: opciones.subtitulo,
    mostrarLeyenda: opciones.mostrarLeyenda ?? true,
    mostrarGrid: opciones.mostrarGrid ?? true,
    mostrarTooltip: opciones.mostrarTooltip ?? true,
    mostrarBrush: opciones.mostrarBrush ?? false,
    mostrarMetas: opciones.mostrarMetas ?? false,
    animaciones: opciones.animaciones ?? true,
    altura: opciones.altura || 300,
    margenX: opciones.margenX,
    margenY: opciones.margenY
  };
}

// 📤 Exportar configuraciones y constantes
export { CONFIGURACIONES_PREDEFINIDAS, COLORES_ESTADO };

/**
 * 🔄 Función helper para convertir datos de progreso
 */
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

export { GraficoProgreso };
