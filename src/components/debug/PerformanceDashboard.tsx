// ===================================================
// 📊 Dashboard de Performance - Sistema GYS
// ===================================================
// Dashboard para visualizar métricas de performance en desarrollo
// Monitoreo en tiempo real de componentes y aplicación

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  BarChart3, 
  Clock, 
  Cpu, 
  Download, 
  MemoryStick, 
  RefreshCw, 
  TrendingDown, 
  TrendingUp, 
  Zap,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { usePerformanceMetrics, type PerformanceMetrics } from '@/lib/hooks/usePerformanceMetrics';
import { logger } from '@/lib/logger';

// 📊 Interfaces para el dashboard
interface ComponentMetrics {
  componentName: string;
  metrics: PerformanceMetrics;
  stats: {
    avgRenderTime: number;
    minRenderTime: number;
    maxRenderTime: number;
    slowRenderPercentage: number;
    totalMemoryDelta: number;
  };
}

interface SystemMetrics {
  totalComponents: number;
  totalRenders: number;
  averageRenderTime: number;
  slowRenderComponents: string[];
  memoryUsage: number;
  memoryTrend: 'up' | 'down' | 'stable';
}

// 🎯 Props del dashboard
interface PerformanceDashboardProps {
  isVisible?: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  autoRefresh?: boolean;
  refreshInterval?: number;
}

/**
 * 📊 Dashboard de Performance para desarrollo
 * 
 * Características:
 * - 📈 Métricas en tiempo real
 * - 🔍 Monitoreo por componente
 * - 💾 Tracking de memoria
 * - 🚨 Alertas de performance
 * - 📤 Exportación de datos
 * - 🎨 UI moderna con animaciones
 */
export function PerformanceDashboard({
  isVisible = process.env.NODE_ENV === 'development',
  position = 'top-right',
  autoRefresh = true,
  refreshInterval = 2000,
}: PerformanceDashboardProps) {
  // 📊 Estado del dashboard
  const [isExpanded, setIsExpanded] = useState(false);
  const [componentMetrics, setComponentMetrics] = useState<ComponentMetrics[]>([]);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    totalComponents: 0,
    totalRenders: 0,
    averageRenderTime: 0,
    slowRenderComponents: [],
    memoryUsage: 0,
    memoryTrend: 'stable',
  });
  const [alerts, setAlerts] = useState<string[]>([]);

  // 🔄 Hook de métricas del dashboard
  const dashboardMetrics = usePerformanceMetrics({
    componentName: 'PerformanceDashboard',
    enableMemoryTracking: true,
    enableLogging: false,
  });

  // 📊 Función para obtener métricas del sistema
  const getSystemMetrics = useCallback((): SystemMetrics => {
    if (typeof window === 'undefined') {
      return {
        totalComponents: 0,
        totalRenders: 0,
        averageRenderTime: 0,
        slowRenderComponents: [],
        memoryUsage: 0,
        memoryTrend: 'stable',
      };
    }

    // 💾 Obtener información de memoria
    const performance = window.performance as any;
    const memoryUsage = performance?.memory?.usedJSHeapSize || 0;
    
    // 📈 Calcular tendencia de memoria (simplificado)
    const previousMemory = systemMetrics.memoryUsage;
    let memoryTrend: 'up' | 'down' | 'stable' = 'stable';
    if (memoryUsage > previousMemory * 1.1) memoryTrend = 'up';
    else if (memoryUsage < previousMemory * 0.9) memoryTrend = 'down';

    // 📊 Calcular métricas agregadas
    const totalRenders = componentMetrics.reduce((sum, comp) => sum + comp.metrics.rerenderCount, 0);
    const avgRenderTime = componentMetrics.length > 0 
      ? componentMetrics.reduce((sum, comp) => sum + comp.stats.avgRenderTime, 0) / componentMetrics.length
      : 0;
    
    const slowComponents = componentMetrics
      .filter(comp => comp.stats.slowRenderPercentage > 10)
      .map(comp => comp.componentName);

    return {
      totalComponents: componentMetrics.length,
      totalRenders,
      averageRenderTime: avgRenderTime,
      slowRenderComponents: slowComponents,
      memoryUsage,
      memoryTrend,
    };
  }, [componentMetrics, systemMetrics.memoryUsage]);

  // 🚨 Función para generar alertas
  const generateAlerts = useCallback(() => {
    const newAlerts: string[] = [];
    const currentSystemMetrics = getSystemMetrics();

    // 🐌 Alerta de renders lentos
    if (currentSystemMetrics.averageRenderTime > 16) {
      newAlerts.push(`Average render time is ${currentSystemMetrics.averageRenderTime.toFixed(2)}ms (>16ms)`);
    }

    // 💾 Alerta de memoria alta
    if (currentSystemMetrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
      newAlerts.push(`High memory usage: ${(currentSystemMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB`);
    }

    // 🔄 Alerta de muchos re-renders
    const highRerenderComponents = componentMetrics.filter(comp => comp.metrics.rerenderCount > 50);
    if (highRerenderComponents.length > 0) {
      newAlerts.push(`${highRerenderComponents.length} components with >50 re-renders`);
    }

    setAlerts(newAlerts);
  }, [componentMetrics, getSystemMetrics]);

  // 📤 Función para exportar métricas
  const exportMetrics = useCallback(() => {
    const exportData = {
      timestamp: new Date().toISOString(),
      systemMetrics: getSystemMetrics(),
      componentMetrics: componentMetrics.map(comp => ({
        component: comp.componentName,
        metrics: comp.metrics,
        stats: comp.stats,
      })),
      alerts,
    };

    // 📁 Crear y descargar archivo JSON
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    logger.info('📤 Performance metrics exported', exportData);
  }, [componentMetrics, alerts, getSystemMetrics]);

  // 🔄 Effect para auto-refresh
  useEffect(() => {
    if (!autoRefresh || !isExpanded) return;

    const interval = setInterval(() => {
      setSystemMetrics(getSystemMetrics());
      generateAlerts();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, isExpanded, refreshInterval, getSystemMetrics, generateAlerts]);

  // 🔄 Effect inicial
  useEffect(() => {
    setSystemMetrics(getSystemMetrics());
    generateAlerts();
  }, [getSystemMetrics, generateAlerts]);

  // 🎨 Función para obtener color de badge según performance
  const getPerformanceBadgeColor = (avgTime: number) => {
    if (avgTime < 8) return 'default';
    if (avgTime < 16) return 'secondary';
    return 'destructive';
  };

  // 🎨 Función para obtener posición CSS
  const getPositionStyles = () => {
    const baseStyles = 'fixed z-50';
    switch (position) {
      case 'top-left': return `${baseStyles} top-4 left-4`;
      case 'top-right': return `${baseStyles} top-4 right-4`;
      case 'bottom-left': return `${baseStyles} bottom-4 left-4`;
      case 'bottom-right': return `${baseStyles} bottom-4 right-4`;
      default: return `${baseStyles} top-4 right-4`;
    }
  };

  if (!isVisible) return null;

  return (
    <motion.div
      className={getPositionStyles()}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <AnimatePresence>
        {!isExpanded ? (
          // 🎯 Vista compacta
          <motion.div
            key="compact"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-lg p-3 cursor-pointer hover:shadow-xl transition-shadow"
            onClick={() => setIsExpanded(true)}
          >
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">Performance</span>
              {alerts.length > 0 && (
                <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center">
                  {alerts.length}
                </Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {systemMetrics.totalComponents} components • {systemMetrics.averageRenderTime.toFixed(1)}ms avg
            </div>
          </motion.div>
        ) : (
          // 📊 Vista expandida
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="bg-background/95 backdrop-blur-sm border rounded-lg shadow-xl w-96 max-h-[80vh] overflow-hidden"
          >
            {/* 🎯 Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Performance Dashboard</h3>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={exportMetrics}
                  className="h-8 w-8 p-0"
                >
                  <Download className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsExpanded(false)}
                  className="h-8 w-8 p-0"
                >
                  ×
                </Button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-[calc(80vh-80px)]">
              {/* 🚨 Alertas */}
              {alerts.length > 0 && (
                <div className="p-4 space-y-2">
                  {alerts.map((alert, index) => (
                    <Alert key={index} variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription className="text-xs">{alert}</AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid w-full grid-cols-3 mx-4 mb-4">
                  <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="components" className="text-xs">Components</TabsTrigger>
                  <TabsTrigger value="memory" className="text-xs">Memory</TabsTrigger>
                </TabsList>

                {/* 📊 Tab Overview */}
                <TabsContent value="overview" className="px-4 pb-4 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-1">
                          <Cpu className="h-4 w-4" />
                          Components
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-2xl font-bold">{systemMetrics.totalComponents}</div>
                        <div className="text-xs text-muted-foreground">
                          {systemMetrics.slowRenderComponents.length} slow
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          Avg Render
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="text-2xl font-bold">
                          {systemMetrics.averageRenderTime.toFixed(1)}ms
                        </div>
                        <Badge 
                          variant={getPerformanceBadgeColor(systemMetrics.averageRenderTime)}
                          className="text-xs"
                        >
                          {systemMetrics.averageRenderTime < 16 ? 'Good' : 'Slow'}
                        </Badge>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-1">
                        <RefreshCw className="h-4 w-4" />
                        Total Renders
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-xl font-bold">{systemMetrics.totalRenders}</div>
                      <Progress 
                        value={Math.min((systemMetrics.totalRenders / 1000) * 100, 100)} 
                        className="mt-2 h-2"
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                {/* 🧩 Tab Components */}
                <TabsContent value="components" className="px-4 pb-4 space-y-3">
                  {componentMetrics.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No component metrics available</p>
                    </div>
                  ) : (
                    componentMetrics.map((comp, index) => (
                      <Card key={index}>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">{comp.componentName}</CardTitle>
                          <CardDescription className="text-xs">
                            {comp.metrics.rerenderCount} renders
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-0">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-muted-foreground">Avg Time</span>
                            <Badge variant={getPerformanceBadgeColor(comp.stats.avgRenderTime)}>
                              {comp.stats.avgRenderTime.toFixed(1)}ms
                            </Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-xs text-muted-foreground">Slow Renders</span>
                            <span className="text-xs font-medium">
                              {comp.stats.slowRenderPercentage.toFixed(1)}%
                            </span>
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  )}
                </TabsContent>

                {/* 💾 Tab Memory */}
                <TabsContent value="memory" className="px-4 pb-4 space-y-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-1">
                        <MemoryStick className="h-4 w-4" />
                        Memory Usage
                        {systemMetrics.memoryTrend === 'up' && <TrendingUp className="h-3 w-3 text-red-500" />}
                        {systemMetrics.memoryTrend === 'down' && <TrendingDown className="h-3 w-3 text-green-500" />}
                        {systemMetrics.memoryTrend === 'stable' && <CheckCircle className="h-3 w-3 text-blue-500" />}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="text-xl font-bold">
                        {(systemMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB
                      </div>
                      <Progress 
                        value={Math.min((systemMetrics.memoryUsage / (100 * 1024 * 1024)) * 100, 100)} 
                        className="mt-2 h-2"
                      />
                      <div className="text-xs text-muted-foreground mt-1">
                        Trend: {systemMetrics.memoryTrend}
                      </div>
                    </CardContent>
                  </Card>

                  {dashboardMetrics.metrics.memoryUsage && (
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm">Dashboard Memory</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-0">
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span>Used Heap:</span>
                            <span>{(dashboardMetrics.metrics.memoryUsage.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Heap:</span>
                            <span>{(dashboardMetrics.metrics.memoryUsage.totalJSHeapSize / 1024 / 1024).toFixed(2)}MB</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Heap Limit:</span>
                            <span>{(dashboardMetrics.metrics.memoryUsage.jsHeapSizeLimit / 1024 / 1024).toFixed(2)}MB</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// 🎯 Hook para registrar componente en el dashboard
export function usePerformanceDashboardRegistry(componentName: string) {
  const metrics = usePerformanceMetrics({
    componentName,
    enableMemoryTracking: true,
    enableLogging: false,
  });

  // 📊 Registrar métricas en el dashboard (simplificado)
  useEffect(() => {
    // En una implementación real, esto se conectaría a un store global
    // o sistema de eventos para compartir métricas entre componentes
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`📊 Component ${componentName} registered in dashboard`, {
        renderTime: metrics.metrics.renderTime,
        rerenderCount: metrics.metrics.rerenderCount,
      });
    }
  }, [componentName, metrics.metrics.renderTime, metrics.metrics.rerenderCount]);

  return metrics;
}

export default PerformanceDashboard;