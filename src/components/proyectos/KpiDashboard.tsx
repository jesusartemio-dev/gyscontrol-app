'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  AlertTriangle, 
  CheckCircle, 
  BarChart3, 
  PieChart, 
  Calendar,
  Users,
  Activity,
  Zap
} from 'lucide-react';
import { motion } from 'framer-motion';
import type { 
  KpisCronograma, 
  TendenciaMensual, 
  AnalisisRendimiento, 
  MetricasComparativas,
  ProyectoEdtConRelaciones 
} from '@/types/modelos';
import { formatearHoras, formatearMoneda, formatearPorcentaje } from '@/lib/utils';

// ✅ Props del componente
interface KpiDashboardProps {
  proyectoId: string;
  kpis?: KpisCronograma;
  tendencias?: TendenciaMensual[];
  analisisRendimiento?: AnalisisRendimiento;
  metricas?: MetricasComparativas;
  edts?: ProyectoEdtConRelaciones[];
  loading?: boolean;
  periodo?: 'mes' | 'trimestre' | 'semestre' | 'año';
  onPeriodoChange?: (periodo: 'mes' | 'trimestre' | 'semestre' | 'año') => void;
}

// ✅ Componente de KPI individual
interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: 'default' | 'success' | 'warning' | 'danger';
  loading?: boolean;
}

function KpiCard({ 
  title, 
  value, 
  subtitle, 
  trend, 
  trendValue, 
  icon: Icon, 
  color = 'default',
  loading = false 
}: KpiCardProps) {
  const colorClasses = {
    default: 'text-blue-600 bg-blue-50',
    success: 'text-green-600 bg-green-50',
    warning: 'text-yellow-600 bg-yellow-50',
    danger: 'text-red-600 bg-red-50'
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-12 w-12 rounded-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="hover:shadow-md transition-shadow">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">{value}</p>
              {subtitle && (
                <p className="text-xs text-muted-foreground">{subtitle}</p>
              )}
              {trend && trendValue !== undefined && (
                <div className="flex items-center gap-1">
                  {trend === 'up' ? (
                    <TrendingUp className="h-3 w-3 text-green-500" />
                  ) : trend === 'down' ? (
                    <TrendingDown className="h-3 w-3 text-red-500" />
                  ) : null}
                  <span className={`text-xs ${
                    trend === 'up' ? 'text-green-500' :
                    trend === 'down' ? 'text-red-500' : 'text-gray-500'
                  }`}>
                    {trendValue > 0 ? '+' : ''}{trendValue}%
                  </span>
                </div>
              )}
            </div>
            <div className={`p-3 rounded-full ${colorClasses[color]}`}>
              <Icon className="h-6 w-6" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

// ✅ Componente principal
export function KpiDashboard({ 
  proyectoId, 
  kpis, 
  tendencias, 
  analisisRendimiento, 
  metricas, 
  edts = [], 
  loading = false,
  periodo = 'mes',
  onPeriodoChange 
}: KpiDashboardProps) {
  const [activeTab, setActiveTab] = useState('general');

  // ✅ Cálculos derivados de EDT
  const estadisticasEdt = useMemo(() => {
    if (!edts.length) return null;

    const total = edts.length;
    const completados = edts.filter(edt => edt.estado === 'completado').length;
    const enProgreso = edts.filter(edt => edt.estado === 'en_progreso').length;
    const planificados = edts.filter(edt => edt.estado === 'planificado').length;
    const detenidos = edts.filter(edt => edt.estado === 'detenido').length;
    
    const horasEstimadasTotal = edts.reduce((sum, edt) => sum + (edt.horasPlan || 0), 0);
    const horasRealesTotal = edts.reduce((sum, edt) => sum + Number(edt.horasReales), 0);
    const eficienciaPromedio = horasEstimadasTotal > 0 ? (horasRealesTotal / horasEstimadasTotal) * 100 : 0;
    
    const progresoPromedio = edts.reduce((sum, edt) => sum + edt.porcentajeAvance, 0) / total;

    return {
      total,
      completados,
      enProgreso,
      planificados,
      detenidos,
      horasEstimadasTotal,
      horasRealesTotal,
      eficienciaPromedio,
      progresoPromedio,
      porcentajeCompletado: (completados / total) * 100
    };
  }, [edts]);

  // ✅ Datos de KPIs principales
  const kpisData = useMemo(() => {
    if (loading) return [];
    
    const stats = estadisticasEdt;
    const kpisReales = kpis;
    
    return [
      {
        title: 'EDT Totales',
        value: stats?.total || kpisReales?.totalEdts || 0,
        subtitle: `${stats?.completados || 0} completados`,
        icon: Target,
        color: 'default' as const
      },
      {
        title: 'Progreso General',
        value: formatearPorcentaje(stats?.progresoPromedio || kpisReales?.promedioAvance || 0),
        subtitle: 'Avance promedio',
        trend: (stats?.progresoPromedio || 0) > 75 ? 'up' as const : (stats?.progresoPromedio || 0) < 50 ? 'down' as const : 'neutral' as const,
        trendValue: kpisReales?.eficienciaGeneral || 0,
        icon: BarChart3,
        color: (stats?.progresoPromedio || 0) > 75 ? 'success' as const : (stats?.progresoPromedio || 0) < 50 ? 'danger' as const : 'warning' as const
      },
      {
        title: 'Eficiencia',
        value: formatearPorcentaje(stats?.eficienciaPromedio || kpisReales?.eficienciaGeneral || 0),
        subtitle: 'Horas reales vs planificadas',
        trend: (stats?.eficienciaPromedio || 0) <= 100 ? 'up' as const : 'down' as const,
        trendValue: kpisReales?.cumplimientoFechas || 0,
        icon: Zap,
        color: (stats?.eficienciaPromedio || 0) <= 100 ? 'success' as const : (stats?.eficienciaPromedio || 0) <= 120 ? 'warning' as const : 'danger' as const
      },
      {
        title: 'Horas Planificadas',
        value: formatearHoras(stats?.horasEstimadasTotal || kpisReales?.horasPlanTotal || 0),
        subtitle: `${formatearHoras(stats?.horasRealesTotal || 0)} ejecutadas`,
        icon: Clock,
        color: 'default' as const
      },
      {
        title: 'EDT En Riesgo',
        value: stats?.detenidos || kpisReales?.edtsRetrasados || 0,
        subtitle: 'Requieren atención',
        icon: AlertTriangle,
        color: (stats?.detenidos || 0) > 0 ? 'danger' as const : 'success' as const
      },
      {
        title: 'Cumplimiento',
        value: formatearPorcentaje(stats?.porcentajeCompletado || kpisReales?.cumplimientoFechas || 0),
        subtitle: 'EDT completados a tiempo',
        trend: (stats?.porcentajeCompletado || 0) > 80 ? 'up' as const : 'down' as const,
        trendValue: kpisReales?.cumplimientoFechas || 0,
        icon: CheckCircle,
        color: (stats?.porcentajeCompletado || 0) > 80 ? 'success' as const : (stats?.porcentajeCompletado || 0) > 60 ? 'warning' as const : 'danger' as const
      }
    ];
  }, [kpis, estadisticasEdt, loading]);

  return (
    <div className="space-y-6">
      {/* ✅ Header con filtros */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">Dashboard de KPIs</h2>
          <p className="text-muted-foreground">Métricas y análisis del cronograma</p>
        </div>
        {onPeriodoChange && (
          <Select value={periodo} onValueChange={onPeriodoChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mes">Último mes</SelectItem>
              <SelectItem value="trimestre">Último trimestre</SelectItem>
              <SelectItem value="semestre">Último semestre</SelectItem>
              <SelectItem value="año">Último año</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ✅ KPIs principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpisData.map((kpi, index) => (
          <KpiCard
            key={kpi.title}
            {...kpi}
            loading={loading}
          />
        ))}
      </div>

      {/* ✅ Tabs con análisis detallado */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="tendencias">Tendencias</TabsTrigger>
          <TabsTrigger value="rendimiento">Rendimiento</TabsTrigger>
          <TabsTrigger value="comparativo">Comparativo</TabsTrigger>
        </TabsList>

        {/* ✅ Tab General */}
        <TabsContent value="general" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Distribución por estado */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="h-5 w-5" />
                  Distribución por Estado
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-2 w-32" />
                        <Skeleton className="h-4 w-8" />
                      </div>
                    ))}
                  </div>
                ) : estadisticasEdt ? (
                  <div className="space-y-4">
                    {[
                      { label: 'Completados', value: estadisticasEdt.completados, color: 'bg-green-500' },
                      { label: 'En Progreso', value: estadisticasEdt.enProgreso, color: 'bg-blue-500' },
                      { label: 'Planificados', value: estadisticasEdt.planificados, color: 'bg-gray-500' },
                      { label: 'Detenidos', value: estadisticasEdt.detenidos, color: 'bg-red-500' }
                    ].map((item) => {
                      const porcentaje = estadisticasEdt.total > 0 ? (item.value / estadisticasEdt.total) * 100 : 0;
                      return (
                        <div key={item.label} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{item.label}</span>
                            <span className="font-medium">{item.value} ({porcentaje.toFixed(1)}%)</span>
                          </div>
                          <Progress value={porcentaje} className="h-2" />
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No hay datos disponibles</p>
                )}
              </CardContent>
            </Card>

            {/* Resumen de horas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Resumen de Horas
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                ) : estadisticasEdt ? (
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Horas Planificadas</span>
                      <span className="font-medium">{formatearHoras(estadisticasEdt.horasEstimadasTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Horas Ejecutadas</span>
                      <span className="font-medium">{formatearHoras(estadisticasEdt.horasRealesTotal)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-2">
                      <span className="text-muted-foreground">Eficiencia</span>
                      <Badge variant={estadisticasEdt.eficienciaPromedio <= 100 ? 'default' : 'destructive'}>
                        {formatearPorcentaje(estadisticasEdt.eficienciaPromedio)}
                      </Badge>
                    </div>
                    <div className="mt-4">
                      <div className="text-sm text-muted-foreground mb-2">Progreso General</div>
                      <Progress value={estadisticasEdt.progresoPromedio} className="h-3" />
                      <div className="text-right text-sm mt-1">
                        {formatearPorcentaje(estadisticasEdt.progresoPromedio)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No hay datos disponibles</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ✅ Tab Tendencias */}
        <TabsContent value="tendencias" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Tendencias Mensuales
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  <Skeleton className="h-48 w-full" />
                </div>
              ) : tendencias && tendencias.length > 0 ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-600">{tendencias[0]?.totalEdts || 0}</p>
                      <p className="text-sm text-muted-foreground">EDT Totales</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{tendencias[0]?.edtsCompletados || 0}</p>
                      <p className="text-sm text-muted-foreground">EDT Completados</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{formatearHoras(tendencias[0]?.horasReales || 0)}</p>
                      <p className="text-sm text-muted-foreground">Horas Reales</p>
                    </div>
                  </div>
                  <div className="border-t pt-4">
                    <p className="text-sm text-muted-foreground mb-2">Eficiencia Mensual</p>
                    <Progress value={tendencias[0]?.eficiencia || 0} className="h-3" />
                    <div className="text-right text-sm mt-1">
                      {formatearPorcentaje(tendencias[0]?.eficiencia || 0)}
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No hay datos de tendencias disponibles</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ✅ Tab Rendimiento */}
        <TabsContent value="rendimiento" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Análisis de Rendimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex justify-between">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-4 w-20" />
                    </div>
                  ))}
                </div>
              ) : analisisRendimiento ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Métricas de Tiempo</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Horas Planificadas</span>
                          <span className="font-medium">{formatearHoras(analisisRendimiento.horasPlan)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Horas Reales</span>
                          <span className="font-medium">{formatearHoras(analisisRendimiento.horasReales)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total EDTs</span>
                          <span className="font-medium">{analisisRendimiento.totalEdts}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Indicadores de Calidad</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Eficiencia</span>
                          <Badge variant={analisisRendimiento.eficiencia > 80 ? 'default' : 'secondary'}>
                            {formatearPorcentaje(analisisRendimiento.eficiencia)}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Promedio Avance</span>
                          <Badge variant={analisisRendimiento.promedioAvance > 80 ? 'default' : 'destructive'}>
                            {formatearPorcentaje(analisisRendimiento.promedioAvance)}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Nivel Rendimiento</span>
                          <Badge variant={analisisRendimiento.nivelRendimiento === 'excelente' ? 'default' : 'secondary'}>
                            {analisisRendimiento.nivelRendimiento}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No hay datos de rendimiento disponibles</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ✅ Tab Comparativo */}
        <TabsContent value="comparativo" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Métricas Comparativas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-2 w-full" />
                    </div>
                  ))}
                </div>
              ) : metricas ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Comparación con Promedio</h4>
                      <div className="space-y-4">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Eficiencia General</span>
                            <span>{formatearPorcentaje(metricas.eficienciaGeneral)}</span>
                          </div>
                          <Progress value={Math.abs(metricas.eficienciaGeneral)} className="h-2" />
                        </div>
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Cumplimiento Fechas</span>
                            <span>{formatearPorcentaje(metricas.cumplimientoFechas)}</span>
                          </div>
                          <Progress value={Math.abs(metricas.cumplimientoFechas)} className="h-2" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Ranking de Proyecto</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Total EDTs</span>
                          <Badge variant="outline">{metricas.totalEdts}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Completitud</span>
                          <span className="font-medium">{formatearPorcentaje(metricas.porcentajeCompletitud)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Desviación Presupuestaria</span>
                          <span className="font-medium">{formatearPorcentaje(metricas.desviacionPresupuestaria)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">No hay datos comparativos disponibles</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}