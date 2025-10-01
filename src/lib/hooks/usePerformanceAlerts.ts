// ===================================================
// 🚨 Hook de Alertas de Performance - Sistema GYS
// ===================================================
// Sistema de monitoreo y alertas para detectar degradación de performance
// Notificaciones en tiempo real y logging de problemas críticos

'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { logger } from '@/lib/logger';

// 📊 Interfaces para alertas de performance
interface PerformanceThresholds {
  // ⏱️ Tiempos de respuesta (ms)
  slowRender: number;
  verySlowRender: number;
  criticalRender: number;
  
  // 💾 Memoria (MB)
  highMemoryUsage: number;
  criticalMemoryUsage: number;
  
  // 🔄 Re-renders
  excessiveReRenders: number;
  criticalReRenders: number;
  
  // 📡 Network (ms)
  slowApiResponse: number;
  timeoutApiResponse: number;
  
  // 🎯 FPS
  lowFPS: number;
  criticalFPS: number;
}

interface PerformanceAlert {
  id: string;
  type: 'warning' | 'error' | 'critical';
  category: 'render' | 'memory' | 'network' | 'fps' | 'rerender';
  message: string;
  details: Record<string, any>;
  timestamp: number;
  component?: string;
  resolved: boolean;
  duration?: number;
}

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  reRenderCount: number;
  apiResponseTime: number;
  fps: number;
  timestamp: number;
}

interface AlertsConfig {
  enabled: boolean;
  maxAlerts: number;
  alertCooldown: number; // ms
  autoResolveTime: number; // ms
  persistAlerts: boolean;
  showToasts: boolean;
  logToConsole: boolean;
  thresholds: PerformanceThresholds;
}

interface UsePerformanceAlertsReturn {
  // 🚨 Estado de alertas
  alerts: PerformanceAlert[];
  activeAlerts: PerformanceAlert[];
  alertCount: number;
  hasActiveAlerts: boolean;
  
  // 📊 Métricas actuales
  currentMetrics: PerformanceMetrics | null;
  
  // 🎛️ Controles
  addMetrics: (metrics: Partial<PerformanceMetrics>, component?: string) => void;
  resolveAlert: (alertId: string) => void;
  clearAlerts: () => void;
  toggleAlerts: (enabled: boolean) => void;
  updateThresholds: (thresholds: Partial<PerformanceThresholds>) => void;
  
  // 📈 Estadísticas
  getAlertStats: () => {
    total: number;
    byType: Record<string, number>;
    byCategory: Record<string, number>;
    resolved: number;
    avgResolutionTime: number;
  };
}

// 🎯 Configuración por defecto
const DEFAULT_CONFIG: AlertsConfig = {
  enabled: process.env.NODE_ENV === 'development',
  maxAlerts: 50,
  alertCooldown: 5000, // 5 segundos
  autoResolveTime: 30000, // 30 segundos
  persistAlerts: true,
  showToasts: true,
  logToConsole: true,
  thresholds: {
    // ⏱️ Render times
    slowRender: 16, // 60fps = 16ms por frame
    verySlowRender: 50,
    criticalRender: 100,
    
    // 💾 Memory usage
    highMemoryUsage: 50, // 50MB
    criticalMemoryUsage: 100, // 100MB
    
    // 🔄 Re-renders
    excessiveReRenders: 10,
    criticalReRenders: 20,
    
    // 📡 API responses
    slowApiResponse: 1000, // 1 segundo
    timeoutApiResponse: 5000, // 5 segundos
    
    // 🎯 FPS
    lowFPS: 30,
    criticalFPS: 15,
  },
};

// 🏭 Función para generar ID único
function generateAlertId(): string {
  return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 🎨 Función para mostrar toast (simulada)
function showToast(alert: PerformanceAlert) {
  if (typeof window !== 'undefined' && 'Notification' in window) {
    // 🔔 Intentar usar notificaciones del navegador
    if (Notification.permission === 'granted') {
      new Notification(`Performance Alert: ${alert.category}`, {
        body: alert.message,
        icon: alert.type === 'critical' ? '🚨' : alert.type === 'error' ? '⚠️' : '📊',
      });
    }
  }
  
  // 📝 Log en consola con colores
  const color = alert.type === 'critical' ? 'red' : alert.type === 'error' ? 'orange' : 'yellow';
  console.log(
    `%c🚨 Performance Alert [${alert.type.toUpperCase()}]`,
    `color: ${color}; font-weight: bold;`,
    alert.message,
    alert.details
  );
}

// 🧪 Hook principal de alertas de performance
export function usePerformanceAlerts(
  config: Partial<AlertsConfig> = {}
): UsePerformanceAlertsReturn {
  // 🎛️ Configuración combinada
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  // 🚨 Estado de alertas
  const [alerts, setAlerts] = useState<PerformanceAlert[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<PerformanceMetrics | null>(null);
  const [isEnabled, setIsEnabled] = useState(finalConfig.enabled);
  
  // 📊 Referencias para tracking
  const alertCooldowns = useRef<Map<string, number>>(new Map());
  const metricsHistory = useRef<PerformanceMetrics[]>([]);
  const autoResolveTimers = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // 🔍 Función para detectar alertas basada en métricas
  const detectAlerts = useCallback((metrics: PerformanceMetrics, component?: string) => {
    if (!isEnabled) return;
    
    const newAlerts: PerformanceAlert[] = [];
    const now = Date.now();
    
    // ⏱️ Alertas de tiempo de renderizado
    if (metrics.renderTime > finalConfig.thresholds.criticalRender) {
      const alertKey = `render-critical-${component || 'unknown'}`;
      if (!alertCooldowns.current.has(alertKey) || 
          now - alertCooldowns.current.get(alertKey)! > finalConfig.alertCooldown) {
        
        newAlerts.push({
          id: generateAlertId(),
          type: 'critical',
          category: 'render',
          message: `Critical render time detected: ${metrics.renderTime.toFixed(2)}ms`,
          details: {
            renderTime: metrics.renderTime,
            threshold: finalConfig.thresholds.criticalRender,
            component,
            impact: 'Severe user experience degradation',
          },
          timestamp: now,
          component,
          resolved: false,
        });
        
        alertCooldowns.current.set(alertKey, now);
      }
    } else if (metrics.renderTime > finalConfig.thresholds.verySlowRender) {
      const alertKey = `render-slow-${component || 'unknown'}`;
      if (!alertCooldowns.current.has(alertKey) || 
          now - alertCooldowns.current.get(alertKey)! > finalConfig.alertCooldown) {
        
        newAlerts.push({
          id: generateAlertId(),
          type: 'error',
          category: 'render',
          message: `Slow render detected: ${metrics.renderTime.toFixed(2)}ms`,
          details: {
            renderTime: metrics.renderTime,
            threshold: finalConfig.thresholds.verySlowRender,
            component,
            suggestion: 'Consider memoization or component optimization',
          },
          timestamp: now,
          component,
          resolved: false,
        });
        
        alertCooldowns.current.set(alertKey, now);
      }
    } else if (metrics.renderTime > finalConfig.thresholds.slowRender) {
      const alertKey = `render-warning-${component || 'unknown'}`;
      if (!alertCooldowns.current.has(alertKey) || 
          now - alertCooldowns.current.get(alertKey)! > finalConfig.alertCooldown) {
        
        newAlerts.push({
          id: generateAlertId(),
          type: 'warning',
          category: 'render',
          message: `Render time above optimal: ${metrics.renderTime.toFixed(2)}ms`,
          details: {
            renderTime: metrics.renderTime,
            threshold: finalConfig.thresholds.slowRender,
            component,
            tip: 'Monitor for performance patterns',
          },
          timestamp: now,
          component,
          resolved: false,
        });
        
        alertCooldowns.current.set(alertKey, now);
      }
    }
    
    // 💾 Alertas de memoria
    if (metrics.memoryUsage > finalConfig.thresholds.criticalMemoryUsage) {
      const alertKey = `memory-critical`;
      if (!alertCooldowns.current.has(alertKey) || 
          now - alertCooldowns.current.get(alertKey)! > finalConfig.alertCooldown) {
        
        newAlerts.push({
          id: generateAlertId(),
          type: 'critical',
          category: 'memory',
          message: `Critical memory usage: ${metrics.memoryUsage.toFixed(2)}MB`,
          details: {
            memoryUsage: metrics.memoryUsage,
            threshold: finalConfig.thresholds.criticalMemoryUsage,
            risk: 'Potential memory leak or excessive data loading',
          },
          timestamp: now,
          component,
          resolved: false,
        });
        
        alertCooldowns.current.set(alertKey, now);
      }
    } else if (metrics.memoryUsage > finalConfig.thresholds.highMemoryUsage) {
      const alertKey = `memory-high`;
      if (!alertCooldowns.current.has(alertKey) || 
          now - alertCooldowns.current.get(alertKey)! > finalConfig.alertCooldown) {
        
        newAlerts.push({
          id: generateAlertId(),
          type: 'warning',
          category: 'memory',
          message: `High memory usage: ${metrics.memoryUsage.toFixed(2)}MB`,
          details: {
            memoryUsage: metrics.memoryUsage,
            threshold: finalConfig.thresholds.highMemoryUsage,
            suggestion: 'Review data structures and cleanup',
          },
          timestamp: now,
          component,
          resolved: false,
        });
        
        alertCooldowns.current.set(alertKey, now);
      }
    }
    
    // 🔄 Alertas de re-renders excesivos
    if (metrics.reRenderCount > finalConfig.thresholds.criticalReRenders) {
      const alertKey = `rerender-critical-${component || 'unknown'}`;
      if (!alertCooldowns.current.has(alertKey) || 
          now - alertCooldowns.current.get(alertKey)! > finalConfig.alertCooldown) {
        
        newAlerts.push({
          id: generateAlertId(),
          type: 'critical',
          category: 'rerender',
          message: `Critical re-render count: ${metrics.reRenderCount}`,
          details: {
            reRenderCount: metrics.reRenderCount,
            threshold: finalConfig.thresholds.criticalReRenders,
            component,
            impact: 'Severe performance degradation',
            solution: 'Implement React.memo, useMemo, or useCallback',
          },
          timestamp: now,
          component,
          resolved: false,
        });
        
        alertCooldowns.current.set(alertKey, now);
      }
    } else if (metrics.reRenderCount > finalConfig.thresholds.excessiveReRenders) {
      const alertKey = `rerender-excessive-${component || 'unknown'}`;
      if (!alertCooldowns.current.has(alertKey) || 
          now - alertCooldowns.current.get(alertKey)! > finalConfig.alertCooldown) {
        
        newAlerts.push({
          id: generateAlertId(),
          type: 'error',
          category: 'rerender',
          message: `Excessive re-renders: ${metrics.reRenderCount}`,
          details: {
            reRenderCount: metrics.reRenderCount,
            threshold: finalConfig.thresholds.excessiveReRenders,
            component,
            suggestion: 'Review state updates and dependencies',
          },
          timestamp: now,
          component,
          resolved: false,
        });
        
        alertCooldowns.current.set(alertKey, now);
      }
    }
    
    // 📡 Alertas de API
    if (metrics.apiResponseTime > finalConfig.thresholds.timeoutApiResponse) {
      const alertKey = `api-timeout`;
      if (!alertCooldowns.current.has(alertKey) || 
          now - alertCooldowns.current.get(alertKey)! > finalConfig.alertCooldown) {
        
        newAlerts.push({
          id: generateAlertId(),
          type: 'critical',
          category: 'network',
          message: `API timeout: ${metrics.apiResponseTime.toFixed(2)}ms`,
          details: {
            responseTime: metrics.apiResponseTime,
            threshold: finalConfig.thresholds.timeoutApiResponse,
            impact: 'User experience severely affected',
          },
          timestamp: now,
          resolved: false,
        });
        
        alertCooldowns.current.set(alertKey, now);
      }
    } else if (metrics.apiResponseTime > finalConfig.thresholds.slowApiResponse) {
      const alertKey = `api-slow`;
      if (!alertCooldowns.current.has(alertKey) || 
          now - alertCooldowns.current.get(alertKey)! > finalConfig.alertCooldown) {
        
        newAlerts.push({
          id: generateAlertId(),
          type: 'warning',
          category: 'network',
          message: `Slow API response: ${metrics.apiResponseTime.toFixed(2)}ms`,
          details: {
            responseTime: metrics.apiResponseTime,
            threshold: finalConfig.thresholds.slowApiResponse,
            suggestion: 'Check network conditions or API performance',
          },
          timestamp: now,
          resolved: false,
        });
        
        alertCooldowns.current.set(alertKey, now);
      }
    }
    
    // 🎯 Alertas de FPS
    if (metrics.fps > 0 && metrics.fps < finalConfig.thresholds.criticalFPS) {
      const alertKey = `fps-critical`;
      if (!alertCooldowns.current.has(alertKey) || 
          now - alertCooldowns.current.get(alertKey)! > finalConfig.alertCooldown) {
        
        newAlerts.push({
          id: generateAlertId(),
          type: 'critical',
          category: 'fps',
          message: `Critical FPS: ${metrics.fps.toFixed(1)}`,
          details: {
            fps: metrics.fps,
            threshold: finalConfig.thresholds.criticalFPS,
            impact: 'Animations and interactions severely affected',
          },
          timestamp: now,
          resolved: false,
        });
        
        alertCooldowns.current.set(alertKey, now);
      }
    } else if (metrics.fps > 0 && metrics.fps < finalConfig.thresholds.lowFPS) {
      const alertKey = `fps-low`;
      if (!alertCooldowns.current.has(alertKey) || 
          now - alertCooldowns.current.get(alertKey)! > finalConfig.alertCooldown) {
        
        newAlerts.push({
          id: generateAlertId(),
          type: 'warning',
          category: 'fps',
          message: `Low FPS: ${metrics.fps.toFixed(1)}`,
          details: {
            fps: metrics.fps,
            threshold: finalConfig.thresholds.lowFPS,
            suggestion: 'Optimize animations and rendering',
          },
          timestamp: now,
          resolved: false,
        });
        
        alertCooldowns.current.set(alertKey, now);
      }
    }
    
    return newAlerts;
  }, [isEnabled, finalConfig]);
  
  // 📊 Función para agregar métricas y detectar alertas
  const addMetrics = useCallback((newMetrics: Partial<PerformanceMetrics>, component?: string) => {
    if (!isEnabled) return;
    
    const completeMetrics: PerformanceMetrics = {
      renderTime: 0,
      memoryUsage: 0,
      reRenderCount: 0,
      apiResponseTime: 0,
      fps: 60,
      timestamp: Date.now(),
      ...newMetrics,
    };
    
    // 📈 Actualizar métricas actuales
    setCurrentMetrics(completeMetrics);
    
    // 📊 Agregar al historial
    metricsHistory.current.push(completeMetrics);
    
    // 🧹 Mantener solo las últimas 100 métricas
    if (metricsHistory.current.length > 100) {
      metricsHistory.current = metricsHistory.current.slice(-100);
    }
    
    // 🚨 Detectar nuevas alertas
    const newAlerts = detectAlerts(completeMetrics, component);
    
    if (newAlerts && newAlerts.length > 0) {
      setAlerts(prevAlerts => {
        const updatedAlerts = [...prevAlerts, ...newAlerts];
        
        // 🧹 Mantener solo las alertas más recientes
        const trimmedAlerts = updatedAlerts.slice(-finalConfig.maxAlerts);
        
        // 🔔 Mostrar toasts para nuevas alertas
        if (finalConfig.showToasts) {
          newAlerts.forEach(alert => showToast(alert));
        }
        
        // 📝 Log en consola
        if (finalConfig.logToConsole) {
          newAlerts.forEach(alert => {
            logger.warn(`Performance Alert [${alert.type}]:`, {
              category: alert.category,
              message: alert.message,
              details: alert.details,
              component: alert.component,
            });
          });
        }
        
        // ⏰ Configurar auto-resolución
        newAlerts.forEach(alert => {
          const timer = setTimeout(() => {
            setAlerts(currentAlerts => 
              currentAlerts.map(a => 
                a.id === alert.id 
                  ? { ...a, resolved: true, duration: Date.now() - a.timestamp }
                  : a
              )
            );
            autoResolveTimers.current.delete(alert.id);
          }, finalConfig.autoResolveTime);
          
          autoResolveTimers.current.set(alert.id, timer);
        });
        
        return trimmedAlerts;
      });
    }
  }, [isEnabled, detectAlerts, finalConfig]);
  
  // ✅ Función para resolver alerta manualmente
  const resolveAlert = useCallback((alertId: string) => {
    setAlerts(prevAlerts => 
      prevAlerts.map(alert => 
        alert.id === alertId 
          ? { ...alert, resolved: true, duration: Date.now() - alert.timestamp }
          : alert
      )
    );
    
    // 🧹 Limpiar timer de auto-resolución
    const timer = autoResolveTimers.current.get(alertId);
    if (timer) {
      clearTimeout(timer);
      autoResolveTimers.current.delete(alertId);
    }
  }, []);
  
  // 🧹 Función para limpiar todas las alertas
  const clearAlerts = useCallback(() => {
    // 🧹 Limpiar todos los timers
    autoResolveTimers.current.forEach(timer => clearTimeout(timer));
    autoResolveTimers.current.clear();
    
    setAlerts([]);
    alertCooldowns.current.clear();
  }, []);
  
  // 🎛️ Función para toggle de alertas
  const toggleAlerts = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    
    if (!enabled) {
      clearAlerts();
    }
  }, [clearAlerts]);
  
  // ⚙️ Función para actualizar thresholds
  const updateThresholds = useCallback((newThresholds: Partial<PerformanceThresholds>) => {
    Object.assign(finalConfig.thresholds, newThresholds);
  }, [finalConfig]);
  
  // 📈 Función para obtener estadísticas
  const getAlertStats = useCallback(() => {
    const byType = alerts.reduce((acc, alert) => {
      acc[alert.type] = (acc[alert.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const byCategory = alerts.reduce((acc, alert) => {
      acc[alert.category] = (acc[alert.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const resolvedAlerts = alerts.filter(alert => alert.resolved && alert.duration);
    const avgResolutionTime = resolvedAlerts.length > 0 
      ? resolvedAlerts.reduce((sum, alert) => sum + (alert.duration || 0), 0) / resolvedAlerts.length
      : 0;
    
    return {
      total: alerts.length,
      byType,
      byCategory,
      resolved: resolvedAlerts.length,
      avgResolutionTime,
    };
  }, [alerts]);
  
  // 🧹 Cleanup al desmontar
  useEffect(() => {
    return () => {
      autoResolveTimers.current.forEach(timer => clearTimeout(timer));
      autoResolveTimers.current.clear();
    };
  }, []);
  
  // 📊 Valores computados
  const activeAlerts = alerts.filter(alert => !alert.resolved);
  const alertCount = alerts.length;
  const hasActiveAlerts = activeAlerts.length > 0;
  
  return {
    // 🚨 Estado de alertas
    alerts,
    activeAlerts,
    alertCount,
    hasActiveAlerts,
    
    // 📊 Métricas actuales
    currentMetrics,
    
    // 🎛️ Controles
    addMetrics,
    resolveAlert,
    clearAlerts,
    toggleAlerts,
    updateThresholds,
    
    // 📈 Estadísticas
    getAlertStats,
  };
}

// 🎯 Hook simplificado para componentes específicos
export function useComponentPerformanceAlerts(
  componentName: string,
  config?: Partial<AlertsConfig>
) {
  const alerts = usePerformanceAlerts(config);
  
  // 📊 Función específica para el componente
  const addComponentMetrics = useCallback((metrics: Partial<PerformanceMetrics>) => {
    alerts.addMetrics(metrics, componentName);
  }, [alerts.addMetrics, componentName]);
  
  // 🔍 Alertas específicas del componente
  const componentAlerts = alerts.alerts.filter(alert => alert.component === componentName);
  const activeComponentAlerts = componentAlerts.filter(alert => !alert.resolved);
  
  return {
    ...alerts,
    componentAlerts,
    activeComponentAlerts,
    addMetrics: addComponentMetrics,
  };
}

// 📊 Hook para métricas globales del sistema
export function useSystemPerformanceAlerts() {
  const alerts = usePerformanceAlerts({
    thresholds: {
      // 🎯 Thresholds más estrictos para el sistema
      slowRender: 10,
      verySlowRender: 25,
      criticalRender: 50,
      highMemoryUsage: 30,
      criticalMemoryUsage: 60,
      excessiveReRenders: 5,
      criticalReRenders: 10,
      slowApiResponse: 500,
      timeoutApiResponse: 2000,
      lowFPS: 45,
      criticalFPS: 20,
    },
  });
  
  // 📈 Métricas del sistema
  const getSystemHealth = useCallback(() => {
    const stats = alerts.getAlertStats();
    const criticalAlerts = alerts.activeAlerts.filter(alert => alert.type === 'critical').length;
    const errorAlerts = alerts.activeAlerts.filter(alert => alert.type === 'error').length;
    
    let healthScore = 100;
    healthScore -= criticalAlerts * 30; // -30 por cada alerta crítica
    healthScore -= errorAlerts * 15; // -15 por cada error
    healthScore -= alerts.activeAlerts.length * 5; // -5 por cada alerta activa
    
    const healthStatus = healthScore >= 80 ? 'excellent' : 
                        healthScore >= 60 ? 'good' : 
                        healthScore >= 40 ? 'fair' : 
                        healthScore >= 20 ? 'poor' : 'critical';
    
    return {
      score: Math.max(0, healthScore),
      status: healthStatus,
      criticalIssues: criticalAlerts,
      totalIssues: alerts.activeAlerts.length,
      stats,
    };
  }, [alerts]);
  
  return {
    ...alerts,
    getSystemHealth,
  };
}
