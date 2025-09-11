/**
 * 📊 ProyectoAprovisionamientoStats Component
 * 
 * Componente de estadísticas y KPIs para proyectos de aprovisionamiento financiero.
 * Muestra métricas consolidadas, tendencias y alertas globales.
 * 
 * Features:
 * - KPIs financieros consolidados
 * - Distribución por estados
 * - Tendencias temporales
 * - Alertas globales
 * - Gráficos interactivos
 * - Responsive design
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  FileText,
  Info,
  Package,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
// Removed framer-motion imports as they were causing ref conflicts with Radix UI
import { formatCurrency, formatPercentage, cn } from '@/lib/utils';
import type { EstadisticasProyectoAprovisionamiento } from '@/types/aprovisionamiento';

// ✅ Props interface
interface ProyectoAprovisionamientoStatsProps {
  proyectos?: any[]; // 📊 Array de proyectos para calcular estadísticas
  estadisticas?: EstadisticasProyectoAprovisionamiento; // 📈 Estadísticas pre-calculadas (opcional)
  loading?: boolean;
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
}

// ✅ Stat card component
const StatCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
    label: string;
  };
  color?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  className?: string;
}> = ({ title, value, subtitle, icon, trend, color = 'default', className }) => {
  const getColorClasses = () => {
    switch (color) {
      case 'success': return 'border-green-200 bg-green-50 text-green-900';
      case 'warning': return 'border-yellow-200 bg-yellow-50 text-yellow-900';
      case 'danger': return 'border-red-200 bg-red-50 text-red-900';
      case 'info': return 'border-blue-200 bg-blue-50 text-blue-900';
      default: return 'border-gray-200 bg-white text-gray-900';
    }
  };

  const getIconColor = () => {
    switch (color) {
      case 'success': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'danger': return 'text-red-600';
      case 'info': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="animate-in fade-in-50 slide-in-from-bottom-4 duration-300 hover:-translate-y-0.5 transition-transform">
      <Card className={cn('border-2', getColorClasses(), className)}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
            </div>
            <div className={cn('p-2 rounded-lg', getIconColor())}>
              {icon}
            </div>
          </div>
          
          {trend && (
            <div className="flex items-center mt-3 pt-3 border-t">
              {trend.isPositive ? (
                <TrendingUp className="w-3 h-3 text-green-600 mr-1" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-600 mr-1" />
              )}
              <span className={cn(
                'text-xs font-medium',
                trend.isPositive ? 'text-green-600' : 'text-red-600'
              )}>
                {trend.isPositive ? '+' : ''}{formatPercentage(trend.value)}
              </span>
              <span className="text-xs text-muted-foreground ml-1">
                {trend.label}
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// ✅ Distribution chart component
const DistributionChart: React.FC<{
  title: string;
  data: Array<{ label: string; value: number; color: string }>;
  total: number;
}> = ({ title, data, total }) => {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>Total: {total.toLocaleString()}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.map((item, index) => {
          const percentage = total > 0 ? (item.value / total) * 100 : 0;
          return (
            <div key={index} className="space-y-1">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span>{item.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{item.value}</span>
                  <span className="text-muted-foreground">({formatPercentage(percentage)})</span>
                </div>
              </div>
              <Progress 
                value={percentage} 
                className="h-2"
                style={{
                  '--progress-background': item.color,
                } as React.CSSProperties}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

// ✅ Alert summary component
const AlertSummary: React.FC<{
  alertas?: {
    criticas: number;
    advertencias: number;
    informativas: number;
  };
}> = ({ alertas }) => {
  if (!alertas) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="w-5 h-5 text-blue-500" />
            Alertas del Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No hay datos de alertas disponibles</p>
        </CardContent>
      </Card>
    );
  }
  const total = alertas.criticas + alertas.advertencias + alertas.informativas;
  
  if (total === 0) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center text-green-600">
            <CheckCircle className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Sin alertas activas</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          Alertas Activas
        </CardTitle>
        <CardDescription>Total: {total} alertas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {alertas.criticas > 0 && (
          <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-sm font-medium text-red-900">Críticas</span>
            </div>
            <Badge variant="destructive">{alertas.criticas}</Badge>
          </div>
        )}
        
        {alertas.advertencias > 0 && (
          <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">Advertencias</span>
            </div>
            <Badge variant="outline" className="border-yellow-600 text-yellow-600">
              {alertas.advertencias}
            </Badge>
          </div>
        )}
        
        {alertas.informativas > 0 && (
          <div className="flex items-center justify-between p-2 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-900">Informativas</span>
            </div>
            <Badge variant="outline" className="border-blue-600 text-blue-600">
              {alertas.informativas}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// ✅ Main component
// 🧮 Función para calcular estadísticas desde proyectos
const calcularEstadisticas = (proyectos: any[]): EstadisticasProyectoAprovisionamiento => {
  if (!proyectos || proyectos.length === 0) {
    return {
      totalProyectos: 0,
      proyectosActivos: 0,
      proyectosCompletados: 0,
      proyectosConAlertas: 0,
      montoTotalInterno: 0,
      montoTotalCliente: 0,
      montoTotalReal: 0,
      montoTotalPendiente: 0,
      montoTotalListas: 0,
      montoTotalPedidos: 0,
      porcentajeEjecucionPromedio: 0,
      desviacionPromedio: 0,
      eficienciaPresupuestaria: 0,
      alertasCriticas: 0,
      alertasAdvertencia: 0,
      alertasInformativas: 0,
      coherenciaPromedio: 0,
      promedioCoherencia: 0,
      proyectosPorEstado: [],
      tendenciaEjecucion: { valor: 0, esPositiva: true, etiqueta: 'Sin datos' },
      tendenciaDesviacion: { valor: 0, esPositiva: true, etiqueta: 'Sin datos' }
    };
  }

  const totalProyectos = proyectos.length;
  const proyectosActivos = proyectos.filter(p => p.estado === 'activo').length;
  const proyectosCompletados = proyectos.filter(p => p.estado === 'completado').length;
  const proyectosConAlertas = proyectos.filter(p => p.coherenciaEstado !== 'ok').length;

  const montoTotalInterno = proyectos.reduce((sum, p) => sum + (p.totalInterno || 0), 0);
  const montoTotalCliente = proyectos.reduce((sum, p) => sum + (p.totalCliente || 0), 0);
  const montoTotalReal = proyectos.reduce((sum, p) => sum + (p.totalReal || 0), 0);
  const montoTotalListas = proyectos.reduce((sum, p) => sum + (p.montoTotalListas || 0), 0);
  const montoTotalPedidos = proyectos.reduce((sum, p) => sum + (p.montoTotalPedidos || 0), 0);
  const montoTotalPendiente = montoTotalCliente - montoTotalReal;

  const porcentajeEjecucionPromedio = proyectos.length > 0 
    ? proyectos.reduce((sum, p) => sum + (p.porcentajeEjecucion || 0), 0) / proyectos.length
    : 0;

  const desviacionPromedio = proyectos.length > 0
    ? proyectos.reduce((sum, p) => sum + Math.abs(p.desviacion || 0), 0) / proyectos.length
    : 0;

  const eficienciaPresupuestaria = montoTotalCliente > 0 
    ? (montoTotalReal / montoTotalCliente) * 100
    : 0;

  const alertasCriticas = proyectos.filter(p => p.coherenciaEstado === 'critica').length;
  const alertasAdvertencia = proyectos.filter(p => p.coherenciaEstado === 'advertencia').length;
  const alertasInformativas = 0; // Por ahora no tenemos este dato

  // 📊 Distribución por estados
  const estadosCount = proyectos.reduce((acc, p) => {
    acc[p.estado] = (acc[p.estado] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const proyectosPorEstado = Object.entries(estadosCount).map(([estado, cantidad]) => ({
    estado,
    cantidad: cantidad as number,
    porcentaje: ((cantidad as number) / totalProyectos) * 100,
    color: estado === 'activo' ? '#10b981' : estado === 'completado' ? '#3b82f6' : '#6b7280'
  }));

  return {
    totalProyectos,
    proyectosActivos,
    proyectosCompletados,
    proyectosConAlertas,
    montoTotalInterno,
    montoTotalCliente,
    montoTotalReal,
    montoTotalPendiente,
    montoTotalListas,
    montoTotalPedidos,
    porcentajeEjecucionPromedio,
    desviacionPromedio,
    eficienciaPresupuestaria,
    alertasCriticas,
    alertasAdvertencia,
    alertasInformativas,
    coherenciaPromedio: 100 - ((alertasCriticas + alertasAdvertencia) / totalProyectos) * 100,
    promedioCoherencia: 100 - ((alertasCriticas + alertasAdvertencia) / totalProyectos) * 100,
    proyectosPorEstado,
    tendenciaEjecucion: {
      valor: porcentajeEjecucionPromedio,
      esPositiva: porcentajeEjecucionPromedio >= 80,
      etiqueta: porcentajeEjecucionPromedio >= 80 ? 'Buena ejecución' : 'Necesita atención'
    },
    tendenciaDesviacion: {
      valor: desviacionPromedio,
      esPositiva: desviacionPromedio <= 10,
      etiqueta: desviacionPromedio <= 10 ? 'Bajo control' : 'Revisar presupuestos'
    }
  };
};

export const ProyectoAprovisionamientoStats: React.FC<ProyectoAprovisionamientoStatsProps> = ({
  proyectos = [],
  estadisticas: estadisticasProp,
  loading = false,
  className = '',
  variant = 'default',
}) => {
  // 🧮 Calcular estadísticas si no se proporcionan
  const estadisticas = estadisticasProp || calcularEstadisticas(proyectos);
  if (loading) {
    return (
      <div className={cn('space-y-4', className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4" />
                  <div className="h-8 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const {
    totalProyectos,
    montoTotalInterno,
    montoTotalReal,
    montoTotalListas,
    montoTotalPedidos,
    promedioCoherencia,
    distribucionEstados,
    distribucionAprovisionamiento,
    alertasGlobales,
    tendencias,
  } = estadisticas;

  // 🔁 Calculate derived metrics
  const desviacionPromedio = montoTotalInterno > 0 
    ? ((montoTotalReal - montoTotalInterno) / montoTotalInterno) * 100 
    : 0;
  const ejecucionPromedio = montoTotalInterno > 0 
    ? (montoTotalReal / montoTotalInterno) * 100 
    : 0;
  const coberturaPedidos = montoTotalListas > 0 
    ? (montoTotalPedidos / montoTotalListas) * 100 
    : 0;

  return (
    <div className={cn('space-y-6', className)}>
      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Proyectos"
          value={totalProyectos.toLocaleString()}
          subtitle="Proyectos activos"
          icon={<Package className="w-5 h-5" />}
          trend={(tendencias as any)?.proyectos ? {
            value: (tendencias as any).proyectos.cambio,
            isPositive: (tendencias as any).proyectos.cambio > 0,
            label: (tendencias as any).proyectos.periodo,
          } : undefined}
          color="info"
        />

        <StatCard
          title="Presupuesto Total"
          value={formatCurrency(montoTotalInterno, 'USD')}
          subtitle="Monto interno planificado"
          icon={<Wallet className="w-5 h-5" />}
          trend={(tendencias as any)?.presupuesto ? {
            value: (tendencias as any).presupuesto.cambio,
            isPositive: (tendencias as any).presupuesto.cambio > 0,
            label: (tendencias as any).presupuesto.periodo,
          } : undefined}
          color="default"
        />

        <StatCard
          title="Ejecución Promedio"
          value={formatPercentage(ejecucionPromedio)}
          subtitle={`Desviación: ${desviacionPromedio > 0 ? '+' : ''}${formatPercentage(desviacionPromedio)}`}
          icon={<TrendingUp className="w-5 h-5" />}
          color={Math.abs(desviacionPromedio) > 10 ? 'warning' : 'success'}
        />

        <StatCard
          title="Coherencia Promedio"
          value={formatPercentage(promedioCoherencia)}
          subtitle="Coherencia listas-pedidos"
          icon={<CheckCircle className="w-5 h-5" />}
          color={promedioCoherencia < 70 ? 'danger' : promedioCoherencia < 85 ? 'warning' : 'success'}
        />
      </div>

      {/* Secondary KPIs */}
      {variant !== 'compact' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            title="Total Listas"
            value={formatCurrency(montoTotalListas, 'USD')}
            subtitle="Equipos listados"
            icon={<FileText className="w-5 h-5" />}
            color="info"
          />

          <StatCard
            title="Total Pedidos"
            value={formatCurrency(montoTotalPedidos, 'USD')}
            subtitle={`Cobertura: ${formatPercentage(coberturaPedidos)}`}
            icon={<DollarSign className="w-5 h-5" />}
            color={coberturaPedidos < 80 ? 'warning' : 'success'}
          />

          <StatCard
            title="Diferencia L/P"
            value={formatCurrency(montoTotalListas - montoTotalPedidos, 'USD')}
            subtitle="Listas vs Pedidos"
            icon={<TrendingDown className="w-5 h-5" />}
            color={Math.abs(montoTotalListas - montoTotalPedidos) > montoTotalListas * 0.1 ? 'warning' : 'success'}
          />
        </div>
      )}

      {/* Distribution Charts and Alerts */}
      {variant === 'detailed' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <DistributionChart
            title="Distribución por Estado"
            data={[
              { label: 'Activos', value: (distribucionEstados as any)?.activo || 0, color: '#3b82f6' },
              { label: 'Completados', value: (distribucionEstados as any)?.completado || 0, color: '#10b981' },
              { label: 'Pausados', value: (distribucionEstados as any)?.pausado || 0, color: '#f59e0b' },
              { label: 'Cancelados', value: (distribucionEstados as any)?.cancelado || 0, color: '#ef4444' },
            ]}
            total={totalProyectos}
          />

          <DistributionChart
            title="Estado Aprovisionamiento"
            data={[
              { label: 'Pendiente', value: (distribucionAprovisionamiento as any)?.pendiente || 0, color: '#6b7280' },
              { label: 'Parcial', value: (distribucionAprovisionamiento as any)?.parcial || 0, color: '#f59e0b' },
              { label: 'Completo', value: (distribucionAprovisionamiento as any)?.completo || 0, color: '#10b981' },
              { label: 'Retrasado', value: (distribucionAprovisionamiento as any)?.retrasado || 0, color: '#ef4444' },
            ]}
            total={totalProyectos}
          />

          <AlertSummary alertas={alertasGlobales} />
        </div>
      )}

      {/* Quick Insights */}
      {variant !== 'compact' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Info className="w-4 h-4" />
              Insights Rápidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-2 text-left">
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        ejecucionPromedio > 100 ? 'bg-red-500' : 
                        ejecucionPromedio > 90 ? 'bg-yellow-500' : 'bg-green-500'
                      )} />
                      <span>
                        {ejecucionPromedio > 100 ? 'Sobreejecución detectada' :
                         ejecucionPromedio > 90 ? 'Ejecución cerca del límite' :
                         'Ejecución dentro del presupuesto'}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Ejecución promedio: {formatPercentage(ejecucionPromedio)}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-2 text-left">
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        promedioCoherencia < 70 ? 'bg-red-500' :
                        promedioCoherencia < 85 ? 'bg-yellow-500' : 'bg-green-500'
                      )} />
                      <span>
                        {promedioCoherencia < 70 ? 'Coherencia crítica' :
                         promedioCoherencia < 85 ? 'Coherencia mejorable' :
                         'Buena coherencia L/P'}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Coherencia promedio: {formatPercentage(promedioCoherencia)}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="space-y-2">
                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-2 text-left">
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        coberturaPedidos < 80 ? 'bg-red-500' :
                        coberturaPedidos < 95 ? 'bg-yellow-500' : 'bg-green-500'
                      )} />
                      <span>
                        {coberturaPedidos < 80 ? 'Baja cobertura de pedidos' :
                         coberturaPedidos < 95 ? 'Cobertura parcial' :
                         'Excelente cobertura'}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Cobertura: {formatPercentage(coberturaPedidos)}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger className="flex items-center gap-2 text-left">
                      <div className={cn(
                        'w-2 h-2 rounded-full',
                        (alertasGlobales?.criticas || 0) > 0 ? 'bg-red-500' :
                        (alertasGlobales?.advertencias || 0) > 5 ? 'bg-yellow-500' : 'bg-green-500'
                      )} />
                      <span>
                        {(alertasGlobales?.criticas || 0) > 0 ? 'Atención inmediata requerida' :
                         (alertasGlobales?.advertencias || 0) > 5 ? 'Múltiples advertencias' :
                         'Sistema estable'}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>
                        {alertasGlobales?.criticas || 0} críticas, {alertasGlobales?.advertencias || 0} advertencias
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ProyectoAprovisionamientoStats;
