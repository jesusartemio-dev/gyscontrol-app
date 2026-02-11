/**
 * 📊 GanttChart Component
 * 
 * Componente de gráfico Gantt para visualización temporal de aprovisionamiento.
 * Incluye timeline interactivo, dependencias, alertas y coherencia.
 * 
 * Features:
 * - Timeline interactivo con zoom y scroll
 * - Visualización de listas y pedidos
 * - Indicadores de coherencia y alertas
 * - Dependencias entre elementos
 * - Drag & drop para replanificación
 * - Tooltips informativos
 * - Exportación a imagen/PDF
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertCircle,
  Calendar,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Package,
  RefreshCw,
  ShoppingCart,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';
// Removed framer-motion imports as they were causing ref conflicts with Radix UI
import type {
  TimelineData,
  GanttItem,
  GanttListaItem,
  GanttPedidoItem,
  AlertaTimeline,
} from '@/types/aprovisionamiento';
interface GanttItemExtended extends GanttItem {
  x: number;
  width: number;
  y: number;
  height: number;
  color: string;
  textColor: string;
  alertas?: AlertaTimeline[];
  coherencia?: number;
}

// ✅ Props interface
interface GanttChartProps {
  data: TimelineData;
  loading?: boolean;
  className?: string;
  height?: number;
  showLegend?: boolean;
  showMinimap?: boolean;
  allowEdit?: boolean;
  showCosts?: boolean;
  onItemClick?: (item: GanttItem) => void;
}

// ✅ Time scale options
const TIME_SCALES = {
  day: { label: 'Días', days: 1, format: 'dd/MM' },
  week: { label: 'Semanas', days: 7, format: 'dd/MM' },
  month: { label: 'Meses', days: 30, format: 'MMM yyyy' },
  quarter: { label: 'Trimestres', days: 90, format: 'QQQ yyyy' },
} as const;

type TimeScale = keyof typeof TIME_SCALES;

// ✅ Color schemes
const ITEM_COLORS = {
  lista: {
    default: '#3b82f6',
    warning: '#f59e0b',
    danger: '#ef4444',
    success: '#10b981',
  },
  pedido: {
    default: '#8b5cf6',
    warning: '#f59e0b',
    danger: '#ef4444',
    success: '#10b981',
  },
};

// ✅ Utility functions
const formatDate = (date: string | Date, format: string = 'dd/MM/yyyy'): string => {
  const d = new Date(date);
  return d.toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

// 💰 Format currency for cost display
const formatCurrency = (amount: number, currency: string = 'USD'): string => {
  try {
    // 💰 Always display in USD as requested
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  } catch (error) {
    return `$ ${amount.toFixed(2)}`;
  }
};

const getItemColor = (item: GanttItem): string => {
  const colors = ITEM_COLORS[item.tipo as keyof typeof ITEM_COLORS];
  
  if (item.alertas && item.alertas.length > 0) {
    const hasError = item.alertas.some(a => a.tipo === 'error');
    const hasWarning = item.alertas.some(a => a.tipo === 'warning');
    
    if (hasError) return colors.danger;
    if (hasWarning) return colors.warning;
  }
  
  if (item.coherencia !== undefined) {
    if (item.coherencia < 50) return colors.danger;
    if (item.coherencia < 80) return colors.warning;
  }
  
  return colors.default;
};

const getTextColor = (backgroundColor: string): string => {
  // Simple contrast calculation
  const hex = backgroundColor.replace('#', '');
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 128 ? '#000000' : '#ffffff';
};

// ✅ Gantt item component
const GanttItemComponent: React.FC<{
  item: GanttItemExtended;
  scale: TimeScale;
  onItemClick?: (item: GanttItem) => void;
  allowEdit?: boolean;
  showCosts?: boolean;
}> = ({ item, scale, onItemClick, allowEdit, showCosts }) => {
  const [isDragging, setIsDragging] = useState(false);
  
  const handleClick = () => {
    if (onItemClick) {
      onItemClick(item);
    }
  };

  const getIcon = () => {
    switch (item.tipo) {
      case 'lista': return <Package className="w-2.5 h-2.5" />;
      case 'pedido': return <ShoppingCart className="w-2.5 h-2.5" />;
      default: return null;
    }
  };

  const getStatusBadge = () => {
    if (item.alertas && item.alertas.length > 0) {
      const errorCount = item.alertas.filter(a => a.tipo === 'error').length;
      const warningCount = item.alertas.filter(a => a.tipo === 'warning').length;
      
      if (errorCount > 0) {
        return (
          <Badge variant="destructive" className="text-[10px] px-0.5 py-0 h-4 leading-none">
            {errorCount}
          </Badge>
        );
      }
      
      if (warningCount > 0) {
        return (
          <Badge variant="secondary" className="text-[10px] px-0.5 py-0 h-4 leading-none bg-yellow-100 text-yellow-800">
            {warningCount}
          </Badge>
        );
      }
    }
    
    return null;
  };

  // 💰 Cost calculation and formatting functions
  const getCostValue = (): number => {
    // Try different cost properties based on item type
    const cost = (() => {
      if ('montoProyectado' in item && typeof item.montoProyectado === 'number') return item.montoProyectado;
      if ('montoEjecutado' in item && typeof item.montoEjecutado === 'number') return item.montoEjecutado;
      if ('amount' in item && typeof item.amount === 'number') return item.amount;
      if ('monto' in item && typeof item.monto === 'number') return item.monto;
      return 0;
    })();
    return cost;
  };

  const formatCostDisplay = (): string => {
    const cost = getCostValue();
    if (cost === 0) return '';
    if (cost >= 1000000) return `$ ${(cost / 1000000).toFixed(1)}M`;
    if (cost >= 1000) return `$ ${(cost / 1000).toFixed(1)}K`;
    return `$ ${cost.toFixed(0)}`;
  };

  const costDisplay = formatCostDisplay();

  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
            <div
              className={`
                absolute rounded cursor-pointer border-2 border-opacity-50 transition-all duration-200 overflow-hidden
                ${allowEdit ? 'hover:shadow-lg hover:scale-105' : ''}
                ${isDragging ? 'shadow-xl z-10' : ''}
              `}
              style={{
                left: item.x,
                top: item.y,
                width: item.width,
                height: item.height,
                backgroundColor: item.color,
                borderColor: item.color,
                color: item.textColor,
              }}
              onClick={handleClick}
            >
            <div className="flex items-center justify-between h-full px-1.5 text-[10px] font-medium">
              <div className="flex items-center gap-0.5 min-w-0">
                {getIcon()}
                <span className="truncate">{item.codigo ? `${item.codigo} - ${item.titulo}` : item.titulo}</span>
              </div>
              <div className="flex items-center gap-0.5">
                {item.coherencia !== undefined && item.coherencia < 100 && (
                  <span className="text-[10px] opacity-75">
                    {item.coherencia}%
                  </span>
                )}
                {getStatusBadge()}
              </div>
            </div>
            
            {/* Progress indicator */}
            {item.progreso !== undefined && (
              <div 
                className="absolute bottom-0 left-0 h-1 bg-white bg-opacity-30 rounded-b"
                style={{ width: `${item.progreso}%` }}
              />
            )}
            
          </div>
        </TooltipTrigger>
        
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-2">
            <div className="font-medium">
              {item.codigo ? `${item.codigo} - ${item.titulo}` : item.titulo}
            </div>
            <div className="text-sm text-muted-foreground">
              {formatDate(item.fechaInicio)} - {formatDate(item.fechaFin)}
            </div>
            {item.descripcion && (
              <div className="text-sm">{item.descripcion}</div>
            )}
            {item.coherencia !== undefined && (
              <div className="text-sm">
                Coherencia: <span className="font-medium">{item.coherencia}%</span>
              </div>
            )}
            {item.progreso !== undefined && (
              <div className="text-sm">
                Progreso: <span className="font-medium">{item.progreso}%</span>
              </div>
            )}
            {(() => {
              // Show cost in tooltip using different amount properties - always in USD
              const ganttItem = item as any;
              const amount = ganttItem.montoProyectado || ganttItem.montoEjecutado || ganttItem.amount || ganttItem.monto;
              if (amount) {
                return (
                  <div className="text-sm">
                    Costo: <span className="font-medium">{formatCurrency(amount, 'USD')}</span>
                  </div>
                );
              }
              return null;
            })()}
            {item.alertas && item.alertas.length > 0 && (
              <div className="space-y-1">
                <div className="text-sm font-medium">Alertas:</div>
                {item.alertas.slice(0, 3).map((alerta, index) => (
                  <div key={index} className="text-xs flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" />
                    {alerta.mensaje}
                  </div>
                ))}
                {item.alertas.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{item.alertas.length - 3} más...
                  </div>
                )}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
      
      {showCosts && costDisplay && (
        <div
          className="absolute text-[10px] font-medium text-gray-600 bg-white/95 px-1.5 py-0.5 rounded shadow-sm border border-gray-200 whitespace-nowrap pointer-events-none"
          style={{
            left: item.x + item.width + 6,
            top: item.y + (item.height / 2) - 8,
            zIndex: 5,
          }}
        >
          {costDisplay}
        </div>
      )}
    </>
  );
};

// ✅ Time grid component
const TimeGrid: React.FC<{
  startDate: Date;
  endDate: Date;
  scale: TimeScale;
  width: number;
  height: number;
}> = ({ startDate, endDate, scale, width, height }) => {
  const { days, format } = TIME_SCALES[scale];
  const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  const totalTime = endDate.getTime() - startDate.getTime();
  
  // ✅ Calculate intervals based on selected scale
  const intervalDays = TIME_SCALES[scale].days;
  const actualIntervals = Math.ceil(totalDays / intervalDays);

  const gridLines = [];
  const labels = [];

  for (let i = 0; i <= actualIntervals; i++) {
    const timeOffset = (i * intervalDays * 24 * 60 * 60 * 1000);
    const x = (timeOffset / totalTime) * width;
    const date = new Date(startDate.getTime() + timeOffset);
    
    // ✅ Only draw grid lines within bounds
    if (x >= 0 && x <= width) {
      gridLines.push(
        <line
          key={`grid-${i}`}
          x1={x}
          y1={0}
          x2={x}
          y2={height}
          stroke="#e5e7eb"
          strokeWidth={i % 5 === 0 ? 2 : 1}
          opacity={i % 5 === 0 ? 0.8 : 0.3}
        />
      );
      
      // ✅ Smart label spacing based on scale and available space
      let labelSpacing = 1;
      if (scale === 'day') labelSpacing = Math.max(1, Math.floor(actualIntervals / 15));
      else if (scale === 'week') labelSpacing = Math.max(1, Math.floor(actualIntervals / 10));
      else if (scale === 'month') labelSpacing = Math.max(1, Math.floor(actualIntervals / 8));
      else if (scale === 'quarter') labelSpacing = 1; // Show all quarters
      
      if (i % labelSpacing === 0 && x < width - 50) { // Leave space for last label
        labels.push(
          <text
            key={`label-${i}`}
            x={x + 5}
            y={15}
            fontSize="10"
            fill="#6b7280"
            className="font-medium"
          >
            {formatDate(date, format)}
          </text>
        );
      }
    }
  }

  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ width, height }}>
      {gridLines}
      {labels}
    </svg>
  );
};

// ✅ Main component
export const GanttChart: React.FC<GanttChartProps> = ({
  data,
  loading = false,
  className = '',
  height = 700,
  showLegend = true,
  showMinimap = false,
  allowEdit = false,
  showCosts = false,
  onItemClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState<TimeScale>('week');
  const [zoom, setZoom] = useState(1);
  const [scrollX, setScrollX] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [visibleTypes, setVisibleTypes] = useState<Set<string>>(new Set(['lista', 'pedido']));
  const [currentTime, setCurrentTime] = useState<Date | null>(null);

  // Set current time only on client side to avoid hydration mismatch
  useEffect(() => {
    setCurrentTime(new Date());
  }, []);

  // 🔁 Calculate timeline bounds
  const { startDate, endDate, totalDays } = useMemo(() => {
    if (!data.items || data.items.length === 0) {
      const now = new Date();
      const end = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return {
        startDate: now,
        endDate: end,
        totalDays: 30,
      };
    }

    const dates = data.items.flatMap(item => [
      new Date(item.fechaInicio),
      new Date(item.fechaFin),
    ]);
    
    const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Add padding
    const padding = 7 * 24 * 60 * 60 * 1000; // 7 days
    const start = new Date(minDate.getTime() - padding);
    const end = new Date(maxDate.getTime() + padding);
    
    return {
      startDate: start,
      endDate: end,
      totalDays: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
    };
  }, [data.items]);

  // 🔁 Chart dimensions - Calculate based on scale and zoom
  const chartWidth = useMemo(() => {
    // Scale-based width calculation
    let pixelsPerDay = 20; // Default for week scale
    if (scale === 'day') pixelsPerDay = 40;
    else if (scale === 'week') pixelsPerDay = 20;
    else if (scale === 'month') pixelsPerDay = 8;
    else if (scale === 'quarter') pixelsPerDay = 3;
    
    const baseWidth = Math.max(800, totalDays * pixelsPerDay);
    return Math.floor(baseWidth * zoom);
  }, [totalDays, zoom, scale]);

  // 🔁 Calculate item positions
  const ganttItems = useMemo(() => {
    if (!data.items) return [];

    const itemHeight = 24;
    const itemSpacing = 4;
    const groupSpacing = 12;

    let currentY = 24; // Space for header
    const items: GanttItemExtended[] = [];
    
    // Group by proyecto or tipo
    const groups = data.items.reduce((acc, item) => {
      // ✅ Determinar clave de agrupación según el tipo de item
      let key: string;
      if (item.tipo === 'lista') {
        const listaItem = item as GanttListaItem;
        key = listaItem.proyectoId || 'sin-proyecto';
      } else if (item.tipo === 'pedido') {
        const pedidoItem = item as GanttPedidoItem;
        key = pedidoItem.listaEquipoId || 'sin-lista';
      } else {
        key = 'sin-clasificar';
      }
      
      if (!acc[key]) acc[key] = [];
      acc[key].push(item);
      return acc;
    }, {} as Record<string, GanttItem[]>);

    Object.entries(groups).forEach(([groupKey, groupItems]) => {
      // Group header space
      currentY += groupSpacing;
      
      groupItems
        .filter(item => visibleTypes.has(item.tipo))
        .forEach((item) => {
          const startTime = new Date(item.fechaInicio).getTime();
          const endTime = new Date(item.fechaFin).getTime();
          const itemStartTime = startDate.getTime();
          const totalTime = endDate.getTime() - startDate.getTime();
          
          // ✅ Improved position calculation with proper scaling
          const startRatio = (startTime - itemStartTime) / totalTime;
          const durationRatio = (endTime - startTime) / totalTime;
          
          const x = Math.max(0, startRatio * chartWidth);
          const width = Math.max(20, durationRatio * chartWidth);
          
          const color = getItemColor(item);
          
          items.push({
            ...item,
            x,
            width,
            y: currentY,
            height: itemHeight,
            color,
            textColor: getTextColor(color),
            alertas: item.alertas || [],
            coherencia: item.coherencia || 0,
          });
          
          currentY += itemHeight + itemSpacing;
        });
    });

    return items;
  }, [data.items, startDate, endDate, chartWidth, visibleTypes]);

  // 🔁 Chart height calculation
  const chartHeight = Math.max(height - 80, ganttItems.length * 32 + 80);

  // 🔁 Handle zoom with smooth transitions
  const handleZoom = (direction: 'in' | 'out') => {
    setZoom(prev => {
      const zoomFactor = direction === 'in' ? 1.25 : 0.8;
      const newZoom = prev * zoomFactor;
      // ✅ Better zoom limits: 0.25x to 8x
      return Math.max(0.25, Math.min(8, newZoom));
    });
  };

  // 🔁 Reset zoom to fit content
  const handleZoomReset = () => {
    setZoom(1);
    setScrollX(0);
  };

  // 🔁 Zoom to fit all content
  const handleZoomToFit = () => {
    if (containerRef.current && totalDays > 0) {
      const containerWidth = containerRef.current.clientWidth - 40; // Account for padding
      const optimalZoom = containerWidth / (totalDays * 20); // 20px per day base
      setZoom(Math.max(0.25, Math.min(2, optimalZoom)));
      setScrollX(0);
    }
  };

  // 🔁 Handle type visibility
  const toggleTypeVisibility = (type: string) => {
    setVisibleTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center h-96">
          <div className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 animate-spin" />
            <span>Cargando timeline...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  // ✅ Empty state when no data
  if (!data.items || data.items.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-2 pt-3 px-4">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Calendar className="w-4 h-4" />
            Timeline de Aprovisionamiento
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center h-96 text-center">
          <div className="flex flex-col items-center gap-4 max-w-md">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Calendar className="w-8 h-8 text-muted-foreground" />
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">No hay datos disponibles</h3>
              <p className="text-sm text-muted-foreground">
                No se encontraron listas o pedidos de equipos para mostrar en el timeline.
                Ajusta los filtros o crea nuevos elementos para comenzar.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Package className="w-4 h-4" />
              <span>Listas de Equipos</span>
              <span>•</span>
              <ShoppingCart className="w-4 h-4" />
              <span>Pedidos de Equipos</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}>
      <CardHeader className="pb-2 pt-3 px-4">
        <div className="flex items-center justify-between gap-2">
          {/* Left: Type filters */}
          <div className="flex items-center gap-1">
            <Button
              variant={visibleTypes.has('lista') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleTypeVisibility('lista')}
              className="h-7 text-xs gap-1"
            >
              {visibleTypes.has('lista') ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <Package className="w-3 h-3" />
              Listas
            </Button>
            <Button
              variant={visibleTypes.has('pedido') ? 'default' : 'outline'}
              size="sm"
              onClick={() => toggleTypeVisibility('pedido')}
              className="h-7 text-xs gap-1"
            >
              {visibleTypes.has('pedido') ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              <ShoppingCart className="w-3 h-3" />
              Pedidos
            </Button>
          </div>

          {/* Right: Scale + Zoom + Fullscreen */}
          <div className="flex items-center gap-1.5">
            <Select value={scale} onValueChange={(value) => setScale(value as TimeScale)}>
              <SelectTrigger className="w-28 h-7 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TIME_SCALES).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex items-center gap-0.5">
              <Button variant="outline" size="sm" onClick={() => handleZoom('out')} disabled={zoom <= 0.25} title="Alejar" className="h-7 w-7 p-0">
                <ZoomOut className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomReset} title="Restablecer zoom" className="h-7 px-1.5">
                <span className="text-xs font-medium">{Math.round(zoom * 100)}%</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleZoom('in')} disabled={zoom >= 8} title="Acercar" className="h-7 w-7 p-0">
                <ZoomIn className="w-3.5 h-3.5" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleZoomToFit} title="Ajustar al contenido" className="h-7 w-7 p-0">
                <Maximize2 className="w-3.5 h-3.5" />
              </Button>
            </div>

            <Button variant="outline" size="sm" onClick={() => setIsFullscreen(!isFullscreen)} className="h-7 w-7 p-0">
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div 
          ref={containerRef}
          className="relative border rounded-lg overflow-auto"
          style={{ height: isFullscreen ? 'calc(100vh - 200px)' : height }}
        >
          {/* Chart container */}
          <div 
            className="relative"
            style={{ width: chartWidth, height: chartHeight }}
          >
            {/* Time grid */}
            <TimeGrid
              startDate={startDate}
              endDate={endDate}
              scale={scale}
              width={chartWidth}
              height={chartHeight}
            />
            
            {/* Gantt items */}
            {ganttItems.map((item) => (
              <GanttItemComponent
                key={`${item.tipo}-${item.id}`}
                item={item}
                scale={scale}
                onItemClick={onItemClick}
                allowEdit={allowEdit}
                showCosts={showCosts}
              />
            ))}
            
            {/* Today line */}
            {currentTime && (() => {
              if (currentTime >= startDate && currentTime <= endDate) {
                const totalTime = endDate.getTime() - startDate.getTime();
                const currentTimeRatio = (currentTime.getTime() - startDate.getTime()) / totalTime;
                const x = Math.max(0, Math.min(chartWidth, currentTimeRatio * chartWidth));
                
                return (
                  <div
                    className="absolute top-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                    style={{ 
                      left: x,
                      height: chartHeight
                    }}
                  >
                    <div className="absolute -top-2 -left-8 bg-red-500 text-white text-xs px-1 py-0.5 rounded whitespace-nowrap">
                      Hoy
                    </div>
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>
        
        {/* Legend + Summary stats in one compact row */}
        <div className="mt-2 flex items-center justify-between flex-wrap gap-2">
          {showLegend && (
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: ITEM_COLORS.lista.default }} />
                <span>Listas</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: ITEM_COLORS.pedido.default }} />
                <span>Pedidos</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: ITEM_COLORS.lista.warning }} />
                <span>Alertas</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-3 h-3 rounded" style={{ backgroundColor: ITEM_COLORS.lista.danger }} />
                <span>Errores</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-0.5 h-3 bg-red-500" />
                <span>Hoy</span>
              </div>
            </div>
          )}

          {data.resumen && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span><strong className="text-foreground">{data.resumen.totalItems || ganttItems.length}</strong> items</span>
              <span><strong className="text-foreground">{data.resumen.itemsConAlertas || 0}</strong> alertas</span>
              <span><strong className="text-foreground">{data.resumen.coherenciaPromedio || 0}%</strong> coherencia</span>
              <span><strong className="text-foreground">{Math.round(totalDays)}</strong> días</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default GanttChart;
