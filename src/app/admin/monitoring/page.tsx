/**
 * 📊 Dashboard de Monitoreo - Visualización de métricas post-deployment
 * 
 * Panel de control para visualizar métricas de performance, errores,
 * alertas y estadísticas del sistema en tiempo real.
 * 
 * @author GYS Team
 * @version 1.0.0
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Globe,
  RefreshCw,
  TrendingUp,
  Users,
  Zap,
  AlertCircle,
  CheckCircle,
  XCircle,
  Eye,
  MousePointer,
  Server,
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useMonitoring } from '@/hooks/useMonitoring';
import logger from '@/lib/logger';
import { buildApiUrl } from '@/lib/utils';

// 🎯 Tipos para las métricas
interface MetricsSummary {
  performance: {
    avgPageLoad: number;
    avgApiResponse: number;
    webVitals: {
      LCP: number;
      FID: number;
      CLS: number;
    };
  };
  summary: {
    totalRequests: number;
    recentMetrics: number;
    recentNavigations: number;
    recentInteractions: number;
  };
  topRoutes: [string, number][];
}

interface ErrorsSummary {
  recent: {
    total: number;
    bySeverity: {
      low: number;
      medium: number;
      high: number;
      critical: number;
    };
    topRoutes: [string, number][];
    topTypes: [string, number][];
  };
  latestErrors: Array<{
    error: string;
    route: string;
    severity: string;
    timestamp: number;
  }>;
}

interface AlertsSummary {
  recent: {
    total: number;
    bySeverity: Record<string, number>;
    byType: Record<string, number>;
  };
  channels: {
    slack: boolean;
    email: boolean;
    webhook: boolean;
  };
  latestAlerts: Array<{
    type: string;
    severity: string;
    title: string;
    message: string;
    timestamp: number;
  }>;
}

// 🎨 Componente de métrica
const MetricCard: React.FC<{
  title: string;
  value: string | number;
  description?: string;
  icon: React.ReactNode;
  trend?: 'up' | 'down' | 'stable';
  color?: 'default' | 'success' | 'warning' | 'error';
}> = ({ title, value, description, icon, trend, color = 'default' }) => {
  const colorClasses = {
    default: 'border-gray-200',
    success: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    error: 'border-red-200 bg-red-50',
  };

  const trendIcons = {
    up: <TrendingUp className="h-4 w-4 text-green-600" />,
    down: <TrendingUp className="h-4 w-4 text-red-600 rotate-180" />,
    stable: <div className="h-4 w-4" />,
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={`${colorClasses[color]} transition-all hover:shadow-md`}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <div className="flex items-center space-x-1">
            {trend && trendIcons[trend]}
            {icon}
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

// 📊 Componente principal
export default function MonitoringDashboard() {
  const [timeframe, setTimeframe] = useState('1h');
  const [metricsData, setMetricsData] = useState<MetricsSummary | null>(null);
  const [errorsData, setErrorsData] = useState<ErrorsSummary | null>(null);
  const [alertsData, setAlertsData] = useState<AlertsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  
  const { trackPageView, trackClick } = useMonitoring({
    componentName: 'MonitoringDashboard',
  });

  // 📡 Cargar datos de métricas
  const fetchMetrics = async () => {
    try {
      const [metricsRes, errorsRes, alertsRes] = await Promise.all([
        fetch(buildApiUrl(`/api/monitoring/metrics?timeframe=${timeframe}`)),
        fetch(buildApiUrl(`/api/monitoring/errors?timeframe=${timeframe}`)),
        fetch(buildApiUrl(`/api/monitoring/alerts?timeframe=${timeframe}`)),
      ]);

      if (metricsRes.ok) {
        const metricsResult = await metricsRes.json();
        setMetricsData(metricsResult.data);
      }

      if (errorsRes.ok) {
        const errorsResult = await errorsRes.json();
        setErrorsData(errorsResult.data);
      }

      if (alertsRes.ok) {
        const alertsResult = await alertsRes.json();
        setAlertsData(alertsResult.data);
      }

      setLastUpdate(new Date());
    } catch (error) {
      logger.error('Error fetching monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  // 🔄 Auto-refresh cada 30 segundos
  useEffect(() => {
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 30000);
    return () => clearInterval(interval);
  }, [timeframe]);

  // 📊 Track page view
  useEffect(() => {
    trackPageView('/admin/monitoring');
  }, [trackPageView]);

  // 🎨 Formatear tiempo
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // 🎨 Formatear duración
  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // 🎨 Badge de severidad
  const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
    const variants = {
      low: 'secondary',
      medium: 'outline',
      high: 'destructive',
      critical: 'destructive',
      info: 'secondary',
      warning: 'outline',
      error: 'destructive',
    };

    return (
      <Badge variant={variants[severity as keyof typeof variants] as any}>
        {severity.toUpperCase()}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando métricas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* 📊 Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Monitoreo</h1>
          <p className="text-muted-foreground">
            Métricas de performance y errores en tiempo real
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">Última hora</SelectItem>
              <SelectItem value="24h">Últimas 24h</SelectItem>
              <SelectItem value="7d">Últimos 7 días</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              trackClick('refresh-button');
              fetchMetrics();
            }}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* 📈 Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <MetricCard
          title="Carga de Página Promedio"
          value={formatDuration(metricsData?.performance.avgPageLoad || 0)}
          description="Tiempo promedio de carga"
          icon={<Clock className="h-4 w-4" />}
          color={metricsData?.performance.avgPageLoad && metricsData.performance.avgPageLoad > 3000 ? 'warning' : 'success'}
        />
        
        <MetricCard
          title="Respuesta API Promedio"
          value={formatDuration(metricsData?.performance.avgApiResponse || 0)}
          description="Tiempo promedio de API"
          icon={<Server className="h-4 w-4" />}
          color={metricsData?.performance.avgApiResponse && metricsData.performance.avgApiResponse > 1000 ? 'warning' : 'success'}
        />
        
        <MetricCard
          title="Total de Errores"
          value={errorsData?.recent.total || 0}
          description={`${errorsData?.recent.bySeverity.critical || 0} críticos`}
          icon={<AlertTriangle className="h-4 w-4" />}
          color={errorsData?.recent.bySeverity.critical ? 'error' : errorsData?.recent.total ? 'warning' : 'success'}
        />
        
        <MetricCard
          title="Interacciones de Usuario"
          value={metricsData?.summary.recentInteractions || 0}
          description="En el período seleccionado"
          icon={<MousePointer className="h-4 w-4" />}
        />
      </div>

      {/* 📊 Tabs de detalles */}
      <Tabs defaultValue="performance" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Errores</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="system">Sistema</TabsTrigger>
        </TabsList>

        {/* 📈 Tab de Performance */}
        <TabsContent value="performance" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Web Vitals */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Zap className="h-5 w-5 mr-2" />
                  Web Vitals
                </CardTitle>
                <CardDescription>
                  Métricas de experiencia de usuario
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>LCP (Largest Contentful Paint)</span>
                  <Badge variant={metricsData?.performance.webVitals.LCP && metricsData.performance.webVitals.LCP > 0 ? 'secondary' : 'outline'}>
                    {metricsData?.performance.webVitals.LCP || 0} mediciones
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>FID (First Input Delay)</span>
                  <Badge variant={metricsData?.performance.webVitals.FID && metricsData.performance.webVitals.FID > 0 ? 'secondary' : 'outline'}>
                    {metricsData?.performance.webVitals.FID || 0} mediciones
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>CLS (Cumulative Layout Shift)</span>
                  <Badge variant={metricsData?.performance.webVitals.CLS && metricsData.performance.webVitals.CLS > 0 ? 'secondary' : 'outline'}>
                    {metricsData?.performance.webVitals.CLS || 0} mediciones
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Top Routes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Rutas Más Visitadas
                </CardTitle>
                <CardDescription>
                  Páginas con mayor tráfico
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {metricsData?.topRoutes.slice(0, 5).map(([route, count], index) => (
                    <div key={route} className="flex items-center justify-between">
                      <span className="text-sm font-mono truncate">{route}</span>
                      <Badge variant="secondary">{count} visitas</Badge>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground">No hay datos disponibles</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 🚨 Tab de Errores */}
        <TabsContent value="errors" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Errores por Severidad */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Errores por Severidad
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {Object.entries(errorsData?.recent.bySeverity || {}).map(([severity, count]) => (
                  <div key={severity} className="flex items-center justify-between">
                    <span className="capitalize">{severity}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm">{count}</span>
                      <SeverityBadge severity={severity} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Últimos Errores */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <XCircle className="h-5 w-5 mr-2" />
                  Errores Recientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {errorsData?.latestErrors.slice(0, 5).map((error, index) => (
                    <div key={index} className="border-l-2 border-red-200 pl-3 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <SeverityBadge severity={error.severity} />
                        <span className="text-xs text-muted-foreground">
                          {formatTime(error.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm font-medium truncate">{error.error}</p>
                      <p className="text-xs text-muted-foreground font-mono">{error.route}</p>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground">No hay errores recientes</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* 🚨 Tab de Alertas */}
        <TabsContent value="alerts" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Canales de Alerta */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Globe className="h-5 w-5 mr-2" />
                  Canales de Notificación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Slack</span>
                  {alertsData?.channels.slack ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>Email</span>
                  {alertsData?.channels.email ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span>Webhook</span>
                  {alertsData?.channels.webhook ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Alertas Recientes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Alertas Recientes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {alertsData?.latestAlerts.slice(0, 5).map((alert, index) => (
                    <div key={index} className="border-l-2 border-blue-200 pl-3 py-2">
                      <div className="flex items-center justify-between mb-1">
                        <SeverityBadge severity={alert.severity} />
                        <span className="text-xs text-muted-foreground">
                          {formatTime(alert.timestamp)}
                        </span>
                      </div>
                      <p className="text-sm font-medium">{alert.title}</p>
                      <p className="text-xs text-muted-foreground">{alert.message}</p>
                    </div>
                  )) || (
                    <p className="text-sm text-muted-foreground">No hay alertas recientes</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ⚙️ Tab de Sistema */}
        <TabsContent value="system" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Estado del Sistema */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Activity className="h-5 w-5 mr-2" />
                  Estado del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span>Última actualización</span>
                  <span className="text-sm text-muted-foreground">
                    {lastUpdate.toLocaleTimeString()}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total de requests</span>
                  <Badge variant="secondary">
                    {metricsData?.summary.totalRequests || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Métricas recientes</span>
                  <Badge variant="secondary">
                    {metricsData?.summary.recentMetrics || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Navegaciones recientes</span>
                  <Badge variant="secondary">
                    {metricsData?.summary.recentNavigations || 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Acciones del Sistema */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="h-5 w-5 mr-2" />
                  Acciones del Sistema
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    trackClick('test-alert-button');
                    fetch(buildApiUrl('/api/monitoring/alerts'), { method: 'PUT' })
                      .then(() => alert('Alerta de prueba enviada'))
                      .catch(err => alert('Error enviando alerta: ' + err.message));
                  }}
                >
                  Enviar Alerta de Prueba
                </Button>
                
                {process.env.NODE_ENV === 'development' && (
                  <>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        trackClick('clear-metrics-button');
                        if (confirm('¿Estás seguro de limpiar todas las métricas?')) {
                          Promise.all([
                          fetch(buildApiUrl('/api/monitoring/metrics'), { method: 'DELETE' }),
                          fetch(buildApiUrl('/api/monitoring/errors'), { method: 'DELETE' }),
                        ]).then(() => {
                            alert('Métricas limpiadas');
                            fetchMetrics();
                          });
                        }
                      }}
                    >
                      Limpiar Métricas (Dev)
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
