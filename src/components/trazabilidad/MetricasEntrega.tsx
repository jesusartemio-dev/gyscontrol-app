/**
 * 📊 Componente Métricas de Entrega - Sistema GYS
 * 
 * Cards de métricas con KPIs principales, tendencias y comparativas
 * para el dashboard de trazabilidad de pedidos.
 * 
 * @author TRAE AI - Agente Senior Fullstack
 * @version 1.0.0
 * @since 2025-01-27
 */

'use client';

import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Package,
  Truck,
  CheckCircle,
  AlertTriangle,
  Clock,
  Target,
  BarChart3,
  Activity,
  Calendar,
  Filter,
  RefreshCw,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { formatearNumero, formatearFecha, COLORES_GYS } from '@/lib/utils/graficos';
import { cn } from '@/lib/utils';

// 📋 Interfaces
export interface MetricaEntrega {
  id: string;
  titulo: string;
  valor: number;
  valorAnterior?: number;
  unidad: string;
  formato: 'entero' | 'decimal' | 'porcentaje' | 'moneda' | 'tiempo';
  tendencia: 'subida' | 'bajada' | 'estable';
  porcentajeCambio: number;
  descripcion?: string;
  meta?: number;
  categoria: 'principal' | 'secundaria' | 'critica';
  icono: React.ReactNode;
  color: string;
  ultimaActualizacion: Date;
}

export interface MetricasEntregaProps {
  metricas: MetricaEntrega[];
  titulo?: string;
  subtitulo?: string;
  className?: string;
  compacto?: boolean;
  animaciones?: boolean;
  mostrarTendencias?: boolean;
  mostrarMetas?: boolean;
  filtroCategoria?: MetricaEntrega['categoria'][];
  onMetricaClick?: (metrica: MetricaEntrega) => void;
  onActualizar?: () => void;
  onExportar?: () => void;
  cargando?: boolean;
  ultimaActualizacion?: Date;
}

// 🎨 Helpers de utilidad
const getMetricaIcon = (icono?: MetricaEntrega['icono']) => {
  if (!icono) {
    return <Package className="w-4 h-4" />;
  }
  return icono;
};

// 🎨 Obtener clases de color según el color de la métrica
const getColorClasses = (color?: MetricaEntrega['color']) => {
  switch (color) {
    case 'blue':
      return {
        bg: 'bg-blue-50',
        border: 'border-blue-200',
        text: 'text-blue-900',
        accent: 'bg-blue-500'
      };
    case 'green':
      return {
        bg: 'bg-green-50',
        border: 'border-green-200',
        text: 'text-green-900',
        accent: 'bg-green-500'
      };
    case 'red':
      return {
        bg: 'bg-red-50',
        border: 'border-red-200',
        text: 'text-red-900',
        accent: 'bg-red-500'
      };
    case 'yellow':
      return {
        bg: 'bg-yellow-50',
        border: 'border-yellow-200',
        text: 'text-yellow-900',
        accent: 'bg-yellow-500'
      };
    default:
      return {
        bg: 'bg-gray-50',
        border: 'border-gray-200',
        text: 'text-gray-900',
        accent: 'bg-gray-500'
      };
    }
};

// 🔢 Formatear número
const formatNumber = (valor: number, unidad?: string): string => {
  return `${formatearNumero(valor)}${unidad ? ` ${unidad}` : ''}`;
};

// 📊 Formatear porcentaje
const formatPercentage = (porcentaje: number): string => {
  return `${porcentaje.toFixed(1)}%`;
};

// 📈 Obtener ícono de tendencia
function getTendenciaIcon(tendencia: MetricaEntrega['tendencia'], size: string = 'w-4 h-4') {
  switch (tendencia) {
    case 'subida': 
      return <TrendingUp className={cn(size, 'text-green-600')} />;
    case 'bajada': 
      return <TrendingDown className={cn(size, 'text-red-600')} />;
    default: 
      return <Minus className={cn(size, 'text-gray-600')} />;
  }
}

// 🎨 Obtener color de tendencia
function getTendenciaColor(tendencia: MetricaEntrega['tendencia']) {
  switch (tendencia) {
    case 'subida': return 'text-green-600';
    case 'bajada': return 'text-red-600';
    default: return 'text-gray-600';
  }
}

// 📭 Estado vacío
const EmptyState = () => (
  <div className="text-center py-12">
    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      No hay métricas disponibles
    </h3>
    <p className="text-gray-500">
      Las métricas aparecerán cuando haya datos de entregas.
    </p>
  </div>
);

// ❌ Estado de error
const ErrorState = ({ error }: { error: string }) => (
  <div className="text-center py-12">
    <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
    <h3 className="text-lg font-medium text-gray-900 mb-2">
      Error al cargar métricas
    </h3>
    <p className="text-gray-500 mb-4">{error}</p>
    <button 
      onClick={() => window.location.reload()}
      className="text-blue-600 hover:text-blue-800 font-medium"
    >
      Intentar nuevamente
    </button>
  </div>
);

// 🎨 Configuración de colores por categoría
const COLORES_CATEGORIA = {
  principal: {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-900',
    accent: 'bg-blue-500'
  },
  secundaria: {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-900',
    accent: 'bg-gray-500'
  },
  critica: {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-900',
    accent: 'bg-red-500'
  }
};

// 🔄 Skeleton para carga
function MetricasSkeleton({ cantidad = 4 }: { cantidad?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: cantidad }).map((_, index) => (
        <Card key={index} className="p-4">
          <CardContent className="p-0">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-3 w-32" />
              </div>
              <Skeleton className="w-10 h-10 rounded-full" />
            </div>
            <Skeleton className="h-8 w-16 mb-2" />
            <div className="flex items-center space-x-1">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="h-3 w-12" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/**
 * 📊 Componente de métrica individual
 */
function MetricaCard({
  metrica,
  compacto,
  animaciones,
  mostrarTendencias,
  mostrarMetas,
  onMetricaClick
}: {
  metrica: MetricaEntrega;
  compacto: boolean;
  animaciones: boolean;
  mostrarTendencias: boolean;
  mostrarMetas: boolean;
  onMetricaClick?: (metrica: MetricaEntrega) => void;
}) {
  const [hover, setHover] = useState(false);
  const colores = COLORES_CATEGORIA[metrica.categoria];
  
  // 📊 Calcular progreso hacia la meta
  const progresoMeta = metrica.meta ? (metrica.valor / metrica.meta) * 100 : 0;
  const cumpleMeta = metrica.meta ? metrica.valor >= metrica.meta : false;
  
  // 🎨 Formatear valor según tipo
  const valorFormateado = useMemo(() => {
    switch (metrica.formato) {
      case 'entero':
        return formatearNumero(metrica.valor, 'entero');
      case 'decimal':
        return formatearNumero(metrica.valor, 'decimal');
      case 'porcentaje':
        return formatearNumero(metrica.valor, 'porcentaje');
      case 'moneda':
        return formatearNumero(metrica.valor, 'moneda');
      case 'tiempo':
        return `${Math.round(metrica.valor)}${metrica.unidad}`;
      default:
        return metrica.valor.toString();
    }
  }, [metrica.valor, metrica.formato, metrica.unidad]);
  
  const contenidoCard = (
    <Card 
      className={cn(
        'transition-all duration-200 cursor-pointer',
        colores.bg,
        colores.border,
        hover && 'shadow-lg scale-105',
        compacto ? 'p-3' : 'p-4'
      )}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => onMetricaClick?.(metrica)}
    >
      <CardContent className="p-0">
        {/* 🏷️ Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className={cn(
              'font-medium',
              colores.text,
              compacto ? 'text-sm' : 'text-base'
            )}>
              {metrica.titulo}
            </h4>
            {metrica.descripcion && !compacto && (
              <p className="text-xs text-gray-600 mt-1">
                {metrica.descripcion}
              </p>
            )}
          </div>
          
          <div className={cn(
            'flex items-center justify-center rounded-full',
            colores.accent,
            compacto ? 'w-8 h-8' : 'w-10 h-10'
          )}>
            <div className="text-white">
              {metrica.icono}
            </div>
          </div>
        </div>
        
        {/* 📊 Valor principal */}
        <div className="mb-3">
          <div className={cn(
            'font-bold',
            colores.text,
            compacto ? 'text-xl' : 'text-2xl'
          )}>
            {valorFormateado}
          </div>
          
          {/* 📈 Tendencia */}
          {mostrarTendencias && metrica.valorAnterior !== undefined && (
            <div className="flex items-center space-x-1 mt-1">
              {getTendenciaIcon(metrica.tendencia, compacto ? 'w-3 h-3' : 'w-4 h-4')}
              <span className={cn(
                'font-medium',
                getTendenciaColor(metrica.tendencia),
                compacto ? 'text-xs' : 'text-sm'
              )}>
                {Math.abs(metrica.porcentajeCambio).toFixed(1)}%
              </span>
              {!compacto && (
                <span className="text-xs text-gray-500">
                  vs período anterior
                </span>
              )}
            </div>
          )}
        </div>
        
        {/* 🎯 Meta y progreso */}
        {mostrarMetas && metrica.meta && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Meta: {formatearNumero(metrica.meta, metrica.formato === 'porcentaje' ? 'porcentaje' : 'entero')}</span>
              <span>{progresoMeta.toFixed(0)}%</span>
            </div>
            
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className={cn(
                  'h-2 rounded-full transition-all duration-500',
                  cumpleMeta ? 'bg-green-500' : colores.accent
                )}
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(progresoMeta, 100)}%` }}
                transition={{ duration: 0.8, delay: 0.2 }}
              />
            </div>
          </div>
        )}
        
        {/* ⏰ Última actualización */}
        {!compacto && (
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Clock className="w-3 h-3" />
              <span>{formatearFecha(metrica.ultimaActualizacion, 'hora')}</span>
            </div>
            
            <Badge 
              variant={metrica.categoria === 'critica' ? 'destructive' : 'outline'}
              className="text-xs"
            >
              {metrica.categoria}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
  
  if (!animaciones) {
    return contenidoCard;
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      whileHover={{ y: -2 }}
      className="transform-gpu"
    >
      {contenidoCard}
    </motion.div>
  );
}

/**
 * 📊 Componente principal MetricasEntrega
 */
export default function MetricasEntrega({
  metricas,
  titulo = 'Métricas de Entrega',
  subtitulo,
  className,
  compacto = false,
  animaciones = true,
  mostrarTendencias = true,
  mostrarMetas = true,
  filtroCategoria,
  onMetricaClick,
  onActualizar,
  onExportar,
  cargando = false,
  ultimaActualizacion
}: MetricasEntregaProps) {
  const [categoriaVisible, setCategoriaVisible] = useState<Record<string, boolean>>({
    principal: true,
    secundaria: true,
    critica: true
  });
  
  // 🔍 Filtrar métricas
  const metricasFiltradas = useMemo(() => {
    // ✅ Validar que metricas sea un array válido
    if (!metricas || !Array.isArray(metricas)) {
      return [];
    }
    
    let resultado = metricas;
    
    // Filtro por categoría desde props
    if (filtroCategoria && filtroCategoria.length > 0) {
      resultado = resultado.filter(metrica => filtroCategoria.includes(metrica.categoria));
    }
    
    // Filtro por visibilidad local
    resultado = resultado.filter(metrica => categoriaVisible[metrica.categoria]);
    
    // Ordenar por categoría y valor
    return resultado.sort((a, b) => {
      const ordenCategoria = { critica: 0, principal: 1, secundaria: 2 };
      const ordenA = ordenCategoria[a.categoria];
      const ordenB = ordenCategoria[b.categoria];
      
      if (ordenA !== ordenB) {
        return ordenA - ordenB;
      }
      
      return b.valor - a.valor;
    });
  }, [metricas, filtroCategoria, categoriaVisible]);
  
  // 📊 Estadísticas generales
  const estadisticas = useMemo(() => {
    const total = metricasFiltradas.length;
    const criticas = metricasFiltradas.filter(m => m.categoria === 'critica').length;
    const conMeta = metricasFiltradas.filter(m => m.meta).length;
    const cumpleMeta = metricasFiltradas.filter(m => m.meta && m.valor >= m.meta).length;
    
    return { total, criticas, conMeta, cumpleMeta };
  }, [metricasFiltradas]);
  
  return (
    <div className={className}>
      {/* 🏷️ Header */}
      {!compacto && (
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{titulo}</h2>
            {subtitulo && (
              <p className="text-gray-600 mt-1">{subtitulo}</p>
            )}
            {ultimaActualizacion && (
              <div className="flex items-center space-x-1 text-sm text-gray-500 mt-2">
                <Calendar className="w-4 h-4" />
                <span>Actualizado: {formatearFecha(ultimaActualizacion, 'completo')}</span>
              </div>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 📊 Estadísticas rápidas */}
            <div className="flex items-center space-x-4 text-sm text-gray-600 mr-4">
              <div className="flex items-center space-x-1">
                <Target className="w-4 h-4" />
                <span>{estadisticas.cumpleMeta}/{estadisticas.conMeta} metas</span>
              </div>
              {estadisticas.criticas > 0 && (
                <div className="flex items-center space-x-1">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span>{estadisticas.criticas} críticas</span>
                </div>
              )}
            </div>
            
            {/* 🔄 Controles */}
            <div className="flex items-center space-x-2">
              {/* Filtros de categoría */}
              <div className="flex items-center space-x-1">
                {Object.entries(categoriaVisible).map(([categoria, visible]) => (
                  <Button
                    key={categoria}
                    variant={visible ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setCategoriaVisible(prev => ({
                      ...prev,
                      [categoria]: !prev[categoria]
                    }))}
                    className="text-xs"
                  >
                    {visible ? <Eye className="w-3 h-3 mr-1" /> : <EyeOff className="w-3 h-3 mr-1" />}
                    {categoria}
                  </Button>
                ))}
              </div>
              
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
              
              {onExportar && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onExportar}
                >
                  <Download className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* 🔄 Estado de carga */}
      {cargando && <MetricasSkeleton cantidad={metricasFiltradas.length || 4} />}
      
      {/* 📊 Grid de métricas */}
      {!cargando && (
        <AnimatePresence mode="popLayout">
          <motion.div 
            className={cn(
              'grid gap-4',
              compacto 
                ? 'grid-cols-2 md:grid-cols-4 lg:grid-cols-6'
                : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
            )}
            layout
          >
            {metricasFiltradas.map((metrica, index) => (
              <MetricaCard
                key={metrica.id}
                metrica={metrica}
                compacto={compacto}
                animaciones={animaciones}
                mostrarTendencias={mostrarTendencias}
                mostrarMetas={mostrarMetas}
                onMetricaClick={onMetricaClick}
              />
            ))}
          </motion.div>
        </AnimatePresence>
      )}
      
      {/* 📭 Estado vacío */}
      {!cargando && metricasFiltradas.length === 0 && (
        <motion.div 
          className="text-center py-12"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Sin métricas disponibles
          </h3>
          <p className="text-gray-600">
            {filtroCategoria && filtroCategoria.length > 0
              ? 'No hay métricas que coincidan con los filtros aplicados.'
              : 'No hay métricas configuradas para mostrar.'
            }
          </p>
        </motion.div>
      )}
    </div>
  );
}

// 🏭 Funciones de utilidad para crear métricas
export function crearMetricaEntrega(
  id: string,
  titulo: string,
  valor: number,
  opciones: Partial<Omit<MetricaEntrega, 'id' | 'titulo' | 'valor'>> = {}
): MetricaEntrega {
  return {
    id,
    titulo,
    valor,
    valorAnterior: opciones.valorAnterior,
    unidad: opciones.unidad || '',
    formato: opciones.formato || 'entero',
    tendencia: opciones.tendencia || 'estable',
    porcentajeCambio: opciones.porcentajeCambio || 0,
    descripcion: opciones.descripcion,
    meta: opciones.meta,
    categoria: opciones.categoria || 'secundaria',
    icono: opciones.icono || <Activity className="w-4 h-4" />,
    color: opciones.color || COLORES_GYS.primario,
    ultimaActualizacion: opciones.ultimaActualizacion || new Date()
  };
}

// 📊 Métricas predefinidas comunes
export const METRICAS_PREDEFINIDAS = {
  totalPedidos: (valor: number, valorAnterior?: number) => crearMetricaEntrega(
    'total-pedidos',
    'Total Pedidos',
    valor,
    {
      valorAnterior,
      formato: 'entero',
      categoria: 'principal',
      icono: <Package className="w-4 h-4" />,
      descripcion: 'Número total de pedidos procesados'
    }
  ),
  
  pedidosEntregados: (valor: number, valorAnterior?: number) => crearMetricaEntrega(
    'pedidos-entregados',
    'Entregados',
    valor,
    {
      valorAnterior,
      formato: 'entero',
      categoria: 'principal',
      icono: <CheckCircle className="w-4 h-4" />,
      descripcion: 'Pedidos entregados exitosamente'
    }
  ),
  
  tiempoPromedioEntrega: (valor: number, valorAnterior?: number) => crearMetricaEntrega(
    'tiempo-promedio',
    'Tiempo Promedio',
    valor,
    {
      valorAnterior,
      formato: 'tiempo',
      unidad: 'h',
      categoria: 'secundaria',
      icono: <Clock className="w-4 h-4" />,
      descripcion: 'Tiempo promedio de entrega'
    }
  ),
  
  eficienciaEntrega: (valor: number, valorAnterior?: number, meta?: number) => crearMetricaEntrega(
    'eficiencia-entrega',
    'Eficiencia',
    valor,
    {
      valorAnterior,
      formato: 'porcentaje',
      categoria: 'principal',
      meta,
      icono: <Target className="w-4 h-4" />,
      descripcion: 'Porcentaje de entregas a tiempo'
    }
  )
};
