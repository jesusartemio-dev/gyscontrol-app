// ===================================================
// 📊 Hook de Métricas de Performance - Sistema GYS
// ===================================================
// Mide tiempo de renderizado, re-renders y métricas de memoria
// Tracking de performance en tiempo real para optimización

import { useEffect, useRef, useState, useCallback } from 'react';
import { logger } from '@/lib/logger';

// 📊 Interfaces para métricas de performance
interface PerformanceMetrics {
  renderTime: number;
  rerenderCount: number;
  memoryUsage: MemoryInfo | null;
  componentName: string;
  timestamp: number;
  isSlowRender: boolean;
  renderHistory: RenderMetric[];
}

interface RenderMetric {
  timestamp: number;
  duration: number;
  isSlowRender: boolean;
  memoryDelta?: number;
}

interface MemoryInfo {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface UsePerformanceMetricsOptions {
  componentName: string;
  slowRenderThreshold?: number; // ms
  enableMemoryTracking?: boolean;
  enableLogging?: boolean;
  maxHistorySize?: number;
}

// 🎯 Constantes de configuración
const DEFAULT_SLOW_RENDER_THRESHOLD = 16; // 16ms para 60fps
const DEFAULT_MAX_HISTORY_SIZE = 100;
const MEMORY_SAMPLE_INTERVAL = 1000; // 1 segundo

/**
 * 📊 Hook para medir métricas de performance de componentes React
 * 
 * Características:
 * - ⏱️ Medición de tiempo de renderizado
 * - 🔄 Conteo de re-renders
 * - 💾 Tracking de memoria (opcional)
 * - 📈 Historial de métricas
 * - 🚨 Detección de renders lentos
 * - 📝 Logging automático en desarrollo
 * 
 * @param options - Configuración del hook
 * @returns Métricas de performance y funciones de control
 */
export function usePerformanceMetrics({
  componentName,
  slowRenderThreshold = DEFAULT_SLOW_RENDER_THRESHOLD,
  enableMemoryTracking = true,
  enableLogging = process.env.NODE_ENV === 'development',
  maxHistorySize = DEFAULT_MAX_HISTORY_SIZE,
}: UsePerformanceMetricsOptions) {
  // 📊 Estado de métricas
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    rerenderCount: 0,
    memoryUsage: null,
    componentName,
    timestamp: Date.now(),
    isSlowRender: false,
    renderHistory: [],
  });

  // 🔄 Referencias para tracking
  const renderStartTime = useRef<number>(0);
  const previousMemory = useRef<number>(0);
  const renderCountRef = useRef<number>(0);
  const memoryIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // 📊 Función para obtener información de memoria
  const getMemoryInfo = useCallback((): MemoryInfo | null => {
    if (!enableMemoryTracking || typeof window === 'undefined') {
      return null;
    }

    // ✅ Verificar soporte de performance.memory
    const performance = window.performance as any;
    if (performance && performance.memory) {
      return {
        usedJSHeapSize: performance.memory.usedJSHeapSize,
        totalJSHeapSize: performance.memory.totalJSHeapSize,
        jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      };
    }

    return null;
  }, [enableMemoryTracking]);

  // ⏱️ Función para iniciar medición de render
  const startRenderMeasurement = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  // 📊 Función para finalizar medición de render
  const endRenderMeasurement = useCallback(() => {
    const renderTime = performance.now() - renderStartTime.current;
    const isSlowRender = renderTime > slowRenderThreshold;
    const currentMemory = getMemoryInfo();
    const memoryDelta = currentMemory && previousMemory.current 
      ? currentMemory.usedJSHeapSize - previousMemory.current
      : undefined;

    renderCountRef.current += 1;

    // 📈 Crear métrica de render
    const renderMetric: RenderMetric = {
      timestamp: Date.now(),
      duration: renderTime,
      isSlowRender,
      memoryDelta,
    };

    // 📊 Actualizar métricas
    setMetrics(prev => {
      const newHistory = [...prev.renderHistory, renderMetric]
        .slice(-maxHistorySize); // 🔄 Mantener tamaño máximo

      return {
        ...prev,
        renderTime,
        rerenderCount: renderCountRef.current,
        memoryUsage: currentMemory,
        timestamp: Date.now(),
        isSlowRender,
        renderHistory: newHistory,
      };
    });

    // 🚨 Log de renders lentos
    if (enableLogging && isSlowRender) {
      logger.warn(`🐌 Slow render detected in ${componentName}`, {
        renderTime: `${renderTime.toFixed(2)}ms`,
        threshold: `${slowRenderThreshold}ms`,
        rerenderCount: renderCountRef.current,
        memoryDelta: memoryDelta ? `${(memoryDelta / 1024 / 1024).toFixed(2)}MB` : 'N/A',
      });
    }

    // 📝 Log de desarrollo
    if (enableLogging && renderCountRef.current % 10 === 0) {
      const currentHistory = metrics.renderHistory || [];
      logger.info(`📊 Performance metrics for ${componentName}`, {
        avgRenderTime: currentHistory.length > 0 ? `${(currentHistory.reduce((sum, m) => sum + m.duration, 0) / currentHistory.length).toFixed(2)}ms` : '0ms',
        totalRenders: renderCountRef.current,
        slowRenders: currentHistory.filter(m => m.isSlowRender).length,
        memoryUsage: currentMemory ? `${(currentMemory.usedJSHeapSize / 1024 / 1024).toFixed(2)}MB` : 'N/A',
      });
    }

    // 💾 Actualizar memoria anterior
    if (currentMemory) {
      previousMemory.current = currentMemory.usedJSHeapSize;
    }
  }, [componentName, slowRenderThreshold, enableLogging, getMemoryInfo, maxHistorySize]);

  // 📊 Función para obtener estadísticas agregadas
  const getAggregatedStats = useCallback(() => {
    const { renderHistory } = metrics;
    
    if (renderHistory.length === 0) {
      return {
        avgRenderTime: 0,
        minRenderTime: 0,
        maxRenderTime: 0,
        slowRenderPercentage: 0,
        totalMemoryDelta: 0,
      };
    }

    const renderTimes = renderHistory.map(m => m.duration);
    const slowRenders = renderHistory.filter(m => m.isSlowRender).length;
    const memoryDeltas = renderHistory
      .map(m => m.memoryDelta || 0)
      .filter(delta => delta !== 0);

    return {
      avgRenderTime: renderTimes.reduce((sum, time) => sum + time, 0) / renderTimes.length,
      minRenderTime: Math.min(...renderTimes),
      maxRenderTime: Math.max(...renderTimes),
      slowRenderPercentage: (slowRenders / renderHistory.length) * 100,
      totalMemoryDelta: memoryDeltas.reduce((sum, delta) => sum + delta, 0),
    };
  }, [metrics]);

  // 🔄 Función para resetear métricas
  const resetMetrics = useCallback(() => {
    renderCountRef.current = 0;
    setMetrics({
      renderTime: 0,
      rerenderCount: 0,
      memoryUsage: getMemoryInfo(),
      componentName,
      timestamp: Date.now(),
      isSlowRender: false,
      renderHistory: [],
    });

    if (enableLogging) {
      logger.info(`🔄 Performance metrics reset for ${componentName}`);
    }
  }, [componentName, enableLogging, getMemoryInfo]);

  // 📊 Función para exportar métricas
  const exportMetrics = useCallback(() => {
    const stats = getAggregatedStats();
    const exportData = {
      component: componentName,
      timestamp: new Date().toISOString(),
      summary: {
        totalRenders: metrics.rerenderCount,
        ...stats,
      },
      history: metrics.renderHistory,
      currentMemory: metrics.memoryUsage,
    };

    if (enableLogging) {
      logger.info(`📤 Exporting metrics for ${componentName}`, exportData);
    }

    return exportData;
  }, [componentName, metrics, getAggregatedStats, enableLogging]);

  // 🔄 Effect para inicializar tracking de memoria
  useEffect(() => {
    if (!enableMemoryTracking) return;

    // 📊 Sampling periódico de memoria
    memoryIntervalRef.current = setInterval(() => {
      const currentMemory = getMemoryInfo();
      if (currentMemory) {
        setMetrics(prev => ({
          ...prev,
          memoryUsage: currentMemory,
        }));
      }
    }, MEMORY_SAMPLE_INTERVAL);

    return () => {
      if (memoryIntervalRef.current) {
        clearInterval(memoryIntervalRef.current);
      }
    };
  }, [enableMemoryTracking, getMemoryInfo]);

  // 🔄 Effect para logging inicial
  useEffect(() => {
    if (enableLogging) {
      logger.info(`📊 Performance tracking started for ${componentName}`, {
        slowRenderThreshold: `${slowRenderThreshold}ms`,
        memoryTracking: enableMemoryTracking,
        maxHistorySize,
      });
    }
  }, [componentName, slowRenderThreshold, enableMemoryTracking, enableLogging, maxHistorySize]);

  // 🧹 Cleanup al desmontar
  useEffect(() => {
    return () => {
      if (memoryIntervalRef.current) {
        clearInterval(memoryIntervalRef.current);
      }
      
      if (enableLogging) {
        logger.info(`🧹 Performance tracking stopped for ${componentName}`);
      }
    };
  }, [componentName, enableLogging]);

  return {
    // 📊 Métricas actuales
    metrics,
    
    // 📈 Estadísticas agregadas
    stats: getAggregatedStats(),
    
    // 🔧 Funciones de control
    startRenderMeasurement,
    endRenderMeasurement,
    resetMetrics,
    exportMetrics,
    
    // 🎯 Utilidades
    isSlowRender: metrics.isSlowRender,
    hasMemorySupport: getMemoryInfo() !== null,
  };
}

// 🎯 Hook simplificado para componentes básicos
export function useSimplePerformanceMetrics(componentName: string) {
  return usePerformanceMetrics({
    componentName,
    enableMemoryTracking: false,
    enableLogging: true,
  });
}

// 📊 Hook para componentes críticos con tracking completo
export function useCriticalPerformanceMetrics(componentName: string) {
  return usePerformanceMetrics({
    componentName,
    slowRenderThreshold: 8, // 8ms para componentes críticos
    enableMemoryTracking: true,
    enableLogging: true,
    maxHistorySize: 200,
  });
}

// 🔄 Tipos exportados
export type { PerformanceMetrics, RenderMetric, MemoryInfo, UsePerformanceMetricsOptions };
