/**
 * 📊 ProyectoAprovisionamientoCard Component
 * 
 * Card component para mostrar resumen financiero de un proyecto de aprovisionamiento.
 * Incluye KPIs, indicadores de coherencia y acciones rápidas.
 * 
 * Features:
 * - Resumen financiero visual
 * - Indicadores de progreso
 * - Alertas de coherencia
 * - Acciones rápidas
 * - Responsive design
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertCircle,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Eye,
  FileText,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
// Removed framer-motion imports as they were causing ref conflicts with Radix UI
import { formatCurrency, formatDate, formatPercentage, cn } from '@/lib/utils';
import type { ProyectoAprovisionamiento } from '@/types/aprovisionamiento';

// ✅ Props interface
interface ProyectoAprovisionamientoCardProps {
  proyecto: ProyectoAprovisionamiento;
  onVerDetalle?: (proyectoId: string) => void;
  onVerListas?: (proyectoId: string) => void;
  onVerPedidos?: (proyectoId: string) => void;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  showActions?: boolean;
}

// ✅ Status badge component
const StatusBadge: React.FC<{ estado: string }> = ({ estado }) => {
  const getVariant = () => {
    switch (estado.toLowerCase()) {
      case 'activo': return 'default';
      case 'completado': return 'secondary';
      case 'pausado': return 'outline';
      case 'cancelado': return 'destructive';
      default: return 'outline';
    }
  };

  return (
    <Badge variant={getVariant()} className="text-xs">
      {estado}
    </Badge>
  );
};

// ✅ Coherence indicator
const CoherenceIndicator: React.FC<{ 
  coherenciaEstado?: 'ok' | 'advertencia' | 'critica';
  coherenciaMensaje?: string;
}> = ({ coherenciaEstado, coherenciaMensaje }) => {
  if (!coherenciaEstado) {
    return (
      <Tooltip>
        <TooltipTrigger>
          <Badge variant="outline" className="gap-1">
            <Clock className="w-3 h-3" />
            Pendiente
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>Análisis de coherencia pendiente</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  const getVariant = () => {
    if (coherenciaEstado === 'ok') return 'default';
    if (coherenciaEstado === 'advertencia') return 'secondary';
    return 'destructive';
  };

  const getIcon = () => {
    if (coherenciaEstado === 'ok') return <CheckCircle className="w-3 h-3" />;
    if (coherenciaEstado === 'advertencia') return <AlertCircle className="w-3 h-3" />;
    return <AlertCircle className="w-3 h-3" />;
  };

  return (
    <Tooltip>
      <TooltipTrigger>
        <Badge variant={getVariant()} className="gap-1">
          {getIcon()}
          {coherenciaEstado === 'ok' ? 'Coherente' : 
           coherenciaEstado === 'advertencia' ? 'Advertencia' : 'Crítico'}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>
        <p>{coherenciaMensaje || 'Sin detalles disponibles'}</p>
      </TooltipContent>
    </Tooltip>
  );
};

// ✅ Financial metrics component
const FinancialMetrics: React.FC<{
  totalInterno: number;
  totalReal: number;
  totalListas: number;
  totalPedidos: number;
  variant: 'default' | 'compact' | 'detailed';
}> = ({ totalInterno, totalReal, totalListas, totalPedidos, variant }) => {
  const executionPercentage = totalInterno > 0 ? (totalReal / totalInterno) * 100 : 0;
  const deviation = totalReal - totalInterno;
  const isOverBudget = deviation > 0;
  const listasVsPedidos = totalListas > 0 ? (totalPedidos / totalListas) * 100 : 0;

  if (variant === 'compact') {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Ejecución</span>
          <span className={`text-sm font-medium ${
            isOverBudget ? 'text-red-600' : 'text-green-600'
          }`}>
            {formatPercentage(executionPercentage)}
          </span>
        </div>
        <Progress value={Math.min(executionPercentage, 100)} className="h-2" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Budget vs Execution */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Presupuesto vs Ejecutado</span>
          <div className="flex items-center gap-1">
            {isOverBudget ? (
              <TrendingUp className="w-3 h-3 text-red-600" />
            ) : (
              <TrendingDown className="w-3 h-3 text-green-600" />
            )}
            <span className={`text-sm font-medium ${
              isOverBudget ? 'text-red-600' : 'text-green-600'
            }`}>
              {formatPercentage(executionPercentage)}
            </span>
          </div>
        </div>
        <div className="flex justify-between text-xs">
          <span>Presupuesto: {formatCurrency(totalInterno, 'USD')}</span>
                <span>Ejecutado: {formatCurrency(totalReal, 'USD')}</span>
        </div>
        <Progress 
          value={Math.min(executionPercentage, 100)} 
          className={`h-2 ${
            executionPercentage > 100 ? '[&>div]:bg-red-500' : 
            executionPercentage > 80 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'
          }`} 
        />
      </div>

      {/* Lists vs Orders */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span className="text-sm text-muted-foreground">Listas vs Pedidos</span>
          <span className="text-sm font-medium">
            {formatPercentage(listasVsPedidos)}
          </span>
        </div>
        <div className="flex justify-between text-xs">
          <span>Listas: {totalListas}</span>
          <span>Pedidos: {totalPedidos}</span>
        </div>
        <Progress 
          value={Math.min(listasVsPedidos, 100)} 
          className={`h-2 ${
            Math.abs(listasVsPedidos - 100) > 10 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'
          }`} 
        />
      </div>

      {variant === 'detailed' && (
        <div className="grid grid-cols-2 gap-2 pt-2 border-t">
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Desviación</div>
            <div className={`text-sm font-medium ${
              isOverBudget ? 'text-red-600' : 'text-green-600'
            }`}>
              {isOverBudget ? '+' : ''}{formatCurrency(deviation, 'USD')}
            </div>
          </div>
          <div className="text-center">
            <div className="text-xs text-muted-foreground">Diferencia L/P</div>
            <div className="text-sm font-medium">
              {totalListas - totalPedidos}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ✅ Main component
export const ProyectoAprovisionamientoCard: React.FC<ProyectoAprovisionamientoCardProps> = ({
  proyecto,
  onVerDetalle,
  onVerListas,
  onVerPedidos,
  className = '',
  variant = 'default',
  showActions = true,
}) => {
  const router = useRouter();

  // 🔁 Handle actions
  const handleVerDetalle = () => {
    if (onVerDetalle) {
      onVerDetalle(proyecto.id);
    } else {
      router.push(`/proyectos/${proyecto.id}`);
    }
  };

  const handleVerListas = () => {
    if (onVerListas) {
      onVerListas(proyecto.id);
    } else {
      router.push(`/finanzas/aprovisionamiento/listas?proyecto=${proyecto.id}`);
    }
  };

  const handleVerPedidos = () => {
    if (onVerPedidos) {
      onVerPedidos(proyecto.id);
    } else {
      router.push(`/finanzas/aprovisionamiento/pedidos?proyecto=${proyecto.id}`);
    }
  };

  return (
    <div
      className={cn('group animate-in fade-in-50 slide-in-from-bottom-4 duration-300 hover:-translate-y-0.5 transition-transform', className)}
    >  <Card className={`cursor-pointer hover:shadow-md transition-shadow ${className}`}>
        <CardHeader className={variant === 'compact' ? 'pb-3' : 'pb-4'}>
          <div className="flex justify-between items-start">
            <div className="space-y-1 flex-1">
              <CardTitle className={variant === 'compact' ? 'text-base' : 'text-lg'}>
                {proyecto.nombre}
              </CardTitle>
              <CardDescription className="flex items-center gap-2">
                <span>{proyecto.codigo}</span>
                <StatusBadge estado={proyecto.estado} />
              </CardDescription>
            </div>
            <CoherenceIndicator 
              coherenciaEstado={proyecto.coherenciaEstado} 
              coherenciaMensaje={proyecto.coherenciaMensaje} 
            />
          </div>
        </CardHeader>

        <CardContent className={variant === 'compact' ? 'py-3' : 'py-4'}>
          {/* Project Info */}
          <div className="space-y-3">
            {variant !== 'compact' && (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Calendar className="w-3 h-3" />
                    <span>Inicio</span>
                  </div>
                  <div className="font-medium">{formatDate(proyecto.fechaInicio ?? new Date())}</div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-muted-foreground">
                    <Users className="w-3 h-3" />
                    <span>Comercial</span>
                  </div>
                  <div className="font-medium">{proyecto.comercialNombre || 'N/A'}</div>
                </div>
              </div>
            )}

            {/* Financial Metrics */}
            <FinancialMetrics
              totalInterno={proyecto.totalInterno || 0}
              totalReal={proyecto.totalReal || 0}
              totalListas={proyecto.totalListas || 0}
              totalPedidos={proyecto.totalPedidos || 0}
              variant={variant}
            />

            {/* Lists and Orders Summary */}
            {variant !== 'compact' && (
              <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium">{proyecto.totalListas || 0}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Listas</div>
                  <div className="text-xs font-medium">
                    {formatCurrency(proyecto.montoTotalListas || 0, 'USD')}
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <div className="flex items-center justify-center gap-1">
                    <Wallet className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium">{proyecto.totalPedidos || 0}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">Pedidos</div>
                  <div className="text-xs font-medium">
                    {formatCurrency(proyecto.montoTotalPedidos || 0, 'USD')}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        {showActions && (
          <CardFooter className={`pt-0 ${variant === 'compact' ? 'pb-3' : 'pb-4'}`}>
            <div className="flex gap-2 w-full">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleVerDetalle}
              >
                <Eye className="w-3 h-3 mr-1" />
                Detalle
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleVerListas}
              >
                <FileText className="w-3 h-3 mr-1" />
                Listas ({proyecto.totalListas})
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleVerPedidos}
              >
                <DollarSign className="w-3 h-3 mr-1" />
                Pedidos ({proyecto.totalPedidos})
              </Button>
            </div>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default ProyectoAprovisionamientoCard;
