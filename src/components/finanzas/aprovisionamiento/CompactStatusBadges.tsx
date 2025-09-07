/**
 * 🏷️ CompactStatusBadges Component
 * 
 * Componente de badges de estado compactos para el header del timeline.
 * Diseño minimalista que muestra información clave sin ocupar mucho espacio.
 * 
 * Features:
 * - Badges pequeños y compactos
 * - Colores semánticos por tipo de estado
 * - Tooltips informativos
 * - Responsive design
 * - Animaciones suaves
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Package,
  DollarSign,
  BarChart3,
  Activity,
} from 'lucide-react';
import type { ResumenTimeline } from '@/types/aprovisionamiento';

// ✅ Props interface
interface CompactStatusBadgesProps {
  resumen: ResumenTimeline;
  className?: string;
  showTooltips?: boolean;
}

// ✅ Status badge configuration
interface StatusBadgeConfig {
  key: keyof ResumenTimeline;
  label: string;
  icon: React.ReactNode;
  getValue: (resumen: ResumenTimeline) => string | number;
  getVariant: (resumen: ResumenTimeline) => 'default' | 'secondary' | 'destructive' | 'outline';
  tooltip: string;
  format?: 'number' | 'currency' | 'percentage';
}

const STATUS_BADGES: StatusBadgeConfig[] = [
  {
    key: 'totalItems',
    label: 'Items',
    icon: <Package className="w-3 h-3" />,
    getValue: (resumen) => resumen.totalItems,
    getVariant: () => 'secondary',
    tooltip: 'Total de items en el timeline',
    format: 'number',
  },
  {
    key: 'montoTotal',
    label: 'Monto',
    icon: <DollarSign className="w-3 h-3" />,
    getValue: (resumen) => resumen.montoTotal,
    getVariant: () => 'outline',
    tooltip: 'Monto total del timeline',
    format: 'currency',
  },
  {
    key: 'itemsVencidos',
    label: 'Vencidos',
    icon: <AlertTriangle className="w-3 h-3" />,
    getValue: (resumen) => resumen.itemsVencidos,
    getVariant: (resumen) => resumen.itemsVencidos > 0 ? 'destructive' : 'secondary',
    tooltip: 'Items vencidos que requieren atención',
    format: 'number',
  },
  {
    key: 'itemsEnRiesgo',
    label: 'En Riesgo',
    icon: <Clock className="w-3 h-3" />,
    getValue: (resumen) => resumen.itemsEnRiesgo,
    getVariant: (resumen) => resumen.itemsEnRiesgo > 0 ? 'destructive' : 'secondary',
    tooltip: 'Items en riesgo de vencimiento',
    format: 'number',
  },
  {
    key: 'porcentajeCompletado',
    label: 'Progreso',
    icon: <TrendingUp className="w-3 h-3" />,
    getValue: (resumen) => `${Math.round(resumen.porcentajeCompletado)}%`,
    getVariant: (resumen) => {
      if (resumen.porcentajeCompletado >= 80) return 'default';
      if (resumen.porcentajeCompletado >= 50) return 'secondary';
      return 'outline';
    },
    tooltip: 'Porcentaje de completado del timeline',
  },
  {
    key: 'coherenciaPromedio',
    label: 'Coherencia',
    icon: <BarChart3 className="w-3 h-3" />,
    getValue: (resumen) => `${Math.round(resumen.coherenciaPromedio)}%`,
    getVariant: (resumen) => {
      if (resumen.coherenciaPromedio >= 90) return 'default';
      if (resumen.coherenciaPromedio >= 70) return 'secondary';
      return 'destructive';
    },
    tooltip: 'Nivel promedio de coherencia',
  },
];

// ✅ Format value helper
const formatValue = (value: string | number, format?: string): string => {
  if (typeof value === 'string') return value;
  
  switch (format) {
    case 'currency':
      return new Intl.NumberFormat('es-PE', {
        style: 'currency',
        currency: 'PEN',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value);
    case 'percentage':
      return `${Math.round(value)}%`;
    case 'number':
    default:
      return new Intl.NumberFormat('es-PE').format(value);
  }
};

export const CompactStatusBadges: React.FC<CompactStatusBadgesProps> = ({
  resumen,
  className = '',
  showTooltips = true,
}) => {
  const BadgeComponent: React.FC<{ config: StatusBadgeConfig }> = ({ config }) => {
    const value = config.getValue(resumen);
    const variant = config.getVariant(resumen);
    const formattedValue = typeof value === 'string' ? value : formatValue(value, config.format);

    const badge = (
      <Badge 
        variant={variant} 
        className="flex items-center gap-1 px-2 py-1 text-xs font-medium transition-all duration-200 hover:scale-105"
      >
        {config.icon}
        <span className="hidden sm:inline">{config.label}:</span>
        <span className="font-semibold">{formattedValue}</span>
      </Badge>
    );

    if (!showTooltips) return badge;

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {badge}
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <TooltipProvider>
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        {STATUS_BADGES.map((config) => (
          <BadgeComponent key={config.key} config={config} />
        ))}
        
        {/* Alert summary */}
        {resumen.alertasPorPrioridad && (
          <div className="flex items-center gap-1">
            {resumen.alertasPorPrioridad.alta > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="destructive" className="flex items-center gap-1 px-2 py-1 text-xs">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="font-semibold">{resumen.alertasPorPrioridad.alta}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Alertas de prioridad alta</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {resumen.alertasPorPrioridad.media > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="flex items-center gap-1 px-2 py-1 text-xs">
                    <Activity className="w-3 h-3" />
                    <span className="font-semibold">{resumen.alertasPorPrioridad.media}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Alertas de prioridad media</p>
                </TooltipContent>
              </Tooltip>
            )}
            
            {resumen.alertasPorPrioridad.baja > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="flex items-center gap-1 px-2 py-1 text-xs">
                    <CheckCircle className="w-3 h-3" />
                    <span className="font-semibold">{resumen.alertasPorPrioridad.baja}</span>
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="text-xs">Alertas de prioridad baja</p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

export default CompactStatusBadges;