// ✅ ProyectoCoherenciaIndicator.tsx
// 🎯 Componente para mostrar indicadores de coherencia de proyectos
// 📊 Muestra estado, porcentaje, desviaciones y acciones disponibles
// 🎨 Diseño modular con variantes de tamaño y modo compacto
// 🔧 Integrado con Tooltip para información detallada

'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { formatCurrency, formatPercentage, cn } from '@/lib/utils';
import type { CoherenciaIndicator } from '@/types/aprovisionamiento';

// 📋 Props interface
interface ProyectoCoherenciaIndicatorProps {
  coherencia: CoherenciaIndicator & {
    porcentaje?: number;
    desviacionMonto?: number;
    montoLista?: number;
    montoPedidos?: number;
    detalles?: string[];
    proyectoId?: string;
  };
  size?: 'sm' | 'md' | 'lg';
  showActions?: boolean;
  onVerDetalles?: (proyectoId: string) => void;
  onCorregir?: (proyectoId: string) => void;
  className?: string;
}

// 🎨 Main component
export const ProyectoCoherenciaIndicator: React.FC<ProyectoCoherenciaIndicatorProps> = ({
  coherencia,
  size = 'md',
  showActions = false,
  onVerDetalles,
  onCorregir,
  className
}) => {
  // 🎨 Get visual properties based on coherencia state
  const getIndicatorProps = () => {
    switch (coherencia.estado) {
      case 'critica':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bgColor: 'bg-red-50',
          borderColor: 'border-red-200',
          badgeVariant: 'destructive' as const,
          label: 'Crítica'
        };
      case 'advertencia':
        return {
          icon: AlertTriangle,
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          badgeVariant: 'secondary' as const,
          label: 'Advertencia'
        };
      case 'ok':
        return {
          icon: CheckCircle,
          color: 'text-green-600',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          badgeVariant: 'default' as const,
          label: 'Coherente'
        };
      default:
        return {
          icon: Info,
          color: 'text-blue-600',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          badgeVariant: 'outline' as const,
          label: 'Info'
        };
    }
  };

  const { icon: Icon, color, bgColor, borderColor, badgeVariant, label } = getIndicatorProps();

  // 📏 Size configurations
  const sizeConfig = {
    sm: {
      iconSize: 'w-4 h-4',
      textSize: 'text-sm',
      padding: 'p-2',
      gap: 'gap-2'
    },
    md: {
      iconSize: 'w-5 h-5',
      textSize: 'text-base',
      padding: 'p-3',
      gap: 'gap-3'
    },
    lg: {
      iconSize: 'w-6 h-6',
      textSize: 'text-lg',
      padding: 'p-4',
      gap: 'gap-4'
    }
  };

  const config = sizeConfig[size];

  // 🎯 Render tooltip content
  const renderTooltipContent = () => (
    <div className="space-y-2 max-w-xs">
      <div className="font-medium">{coherencia.mensaje || `Estado: ${label}`}</div>
      
      {coherencia.porcentaje !== undefined && (
        <div className="text-sm">
          <span className="font-medium">Coherencia: </span>
          {formatPercentage(coherencia.porcentaje)}
        </div>
      )}
      
      {coherencia.montoLista && coherencia.montoPedidos && (
        <div className="text-sm space-y-1">
          <div>
            <span className="font-medium">Monto Lista: </span>
            {formatCurrency(coherencia.montoLista)}
          </div>
          <div>
            <span className="font-medium">Monto Pedidos: </span>
            {formatCurrency(coherencia.montoPedidos)}
          </div>
          {coherencia.desviacionMonto && (
            <div className={`flex items-center gap-1 ${
              coherencia.desviacionMonto > 0 ? 'text-red-600' : 'text-green-600'
            }`}>
              {coherencia.desviacionMonto > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span className="font-medium">Desviación: </span>
              {formatCurrency(Math.abs(coherencia.desviacionMonto))}
            </div>
          )}
        </div>
      )}
      
      {coherencia.detalles && coherencia.detalles.length > 0 && (
        <div className="text-xs space-y-0.5">
          <div className="font-medium">Detalles:</div>
          <ul className="space-y-0.5">
            {coherencia.detalles.map((detalle, index) => (
              <li key={index}>• {detalle}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <TooltipProvider>
      <div
        className={cn(
          'flex items-center justify-between rounded-lg border transition-all duration-200 hover:scale-105 animate-in fade-in-50 scale-in-95 duration-300',
          bgColor,
          borderColor,
          config.padding,
          className
        )}
      >
        <div className={cn('flex items-center', config.gap)}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className={cn('flex items-center', config.gap)}>
                <Icon className={cn(config.iconSize, color)} />
                <div className="space-y-1">
                  <Badge variant={badgeVariant} className={config.textSize}>
                    {label}
                  </Badge>
                  {coherencia.porcentaje !== undefined && (
                    <div className={cn('font-medium', color, config.textSize)}>
                      {formatPercentage(coherencia.porcentaje)}
                    </div>
                  )}
                </div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-sm">
              {renderTooltipContent()}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* 🎬 Actions */}
        {showActions && coherencia.proyectoId && (
          <div className="flex items-center gap-2">
            {onVerDetalles && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onVerDetalles(coherencia.proyectoId!)}
                className="text-xs"
              >
                Ver Detalles
              </Button>
            )}
            {coherencia.estado !== 'ok' && onCorregir && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCorregir(coherencia.proyectoId!)}
                className="text-xs"
              >
                Corregir
              </Button>
            )}
          </div>
        )}
      </div>
    </TooltipProvider>
  );
};

// ✅ Compact version for tables
export const ProyectoCoherenciaIndicatorCompact: React.FC<{
  coherencia: CoherenciaIndicator;
  className?: string;
}> = ({ coherencia, className }) => {
  const { icon: Icon, color, badgeVariant } = {
    critica: { icon: AlertCircle, color: 'text-red-600', badgeVariant: 'destructive' as const },
    advertencia: { icon: AlertTriangle, color: 'text-yellow-600', badgeVariant: 'secondary' as const },
    ok: { icon: CheckCircle, color: 'text-green-600', badgeVariant: 'default' as const },
  }[coherencia.estado] || { icon: Info, color: 'text-blue-600', badgeVariant: 'outline' as const };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn('flex items-center gap-1', className)}>
            <Icon className={cn('w-4 h-4', color)} />
            {coherencia.porcentaje !== undefined && (
              <span className={cn('text-sm font-medium', color)}>
                {formatPercentage(coherencia.porcentaje)}
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <div className="font-medium">{coherencia.mensaje || coherencia.estado}</div>
            {coherencia.porcentaje !== undefined && (
              <div className="text-sm">Coherencia: {formatPercentage(coherencia.porcentaje)}</div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ProyectoCoherenciaIndicator;