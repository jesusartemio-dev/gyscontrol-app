'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

// Types for performance metrics
interface PerformanceMetrics {
  renderTime: number;
  memoryUsage: number;
  itemsRendered: number;
  totalItems: number;
  scrollPosition: number;
  fps: number;
  lastUpdate: number;
}

interface MetricEntry {
  timestamp: number;
  metric: string;
  value: number;
  metadata?: Record<string, any>;
}

// Hook for monitoring component performance
export const usePerformanceMetrics = (componentName: string = 'Component') => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    memoryUsage: 0,
    itemsRendered: 0,
    totalItems: 0,
    scrollPosition: 0,
    fps: 0,
    lastUpdate: Date.now()
  });

  const [history, setHistory] = useState<MetricEntry[]>([]);
  const frameCount = useRef(0);
  const lastFrameTime = useRef(performance.now());
  const renderStartTime = useRef(0);

  // Start measuring render time
  const startRenderMeasurement = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  // End measuring render time
  const endRenderMeasurement = useCallback(() => {
    const renderTime = performance.now() - renderStartTime.current;
    setMetrics(prev => ({
      ...prev,
      renderTime,
      lastUpdate: Date.now()
    }));
    return renderTime;
  }, []);

  // Log a custom metric
  const logMetric = useCallback((metric: string, value: number, metadata?: Record<string, any>) => {
    const entry: MetricEntry = {
      timestamp: Date.now(),
      metric,
      value,
      metadata
    };

    setHistory(prev => {
      const newHistory = [...prev, entry];
      // Keep only last 100 entries to prevent memory leaks
      return newHistory.slice(-100);
    });

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${componentName}] ${metric}:`, value, metadata);
    }
  }, [componentName]);

  // Update metrics
  const updateMetrics = useCallback((updates: Partial<PerformanceMetrics>) => {
    setMetrics(prev => ({
      ...prev,
      ...updates,
      lastUpdate: Date.now()
    }));
  }, []);

  // Measure function execution time
  const measureExecution = useCallback(<T>(fn: () => T, metricName: string): T => {
    const start = performance.now();
    const result = fn();
    const duration = performance.now() - start;
    logMetric(metricName, duration);
    return result;
  }, [logMetric]);

  // Measure async function execution time
  const measureAsyncExecution = useCallback(async <T>(fn: () => Promise<T>, metricName: string): Promise<T> => {
    const start = performance.now();
    const result = await fn();
    const duration = performance.now() - start;
    logMetric(metricName, duration);
    return result;
  }, [logMetric]);

  // Calculate FPS
  const updateFPS = useCallback(() => {
    const now = performance.now();
    const delta = now - lastFrameTime.current;
    frameCount.current++;
    
    if (delta >= 1000) { // Update FPS every second
      const fps = Math.round((frameCount.current * 1000) / delta);
      setMetrics(prev => ({ ...prev, fps }));
      frameCount.current = 0;
      lastFrameTime.current = now;
    }
  }, []);

  // Get memory usage (if available)
  const updateMemoryUsage = useCallback(() => {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      const memoryUsage = Math.round(memory.usedJSHeapSize / 1024 / 1024); // MB
      setMetrics(prev => ({ ...prev, memoryUsage }));
    }
  }, []);

  // Get performance summary
  const getPerformanceSummary = useCallback(() => {
    const recentMetrics = history.slice(-20);
    const renderTimes = recentMetrics
      .filter(m => m.metric.includes('render'))
      .map(m => m.value);
    
    const avgRenderTime = renderTimes.length > 0 
      ? renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length 
      : 0;
    
    const maxRenderTime = renderTimes.length > 0 ? Math.max(...renderTimes) : 0;
    
    return {
      avgRenderTime: Math.round(avgRenderTime * 100) / 100,
      maxRenderTime: Math.round(maxRenderTime * 100) / 100,
      currentFPS: metrics.fps,
      memoryUsage: metrics.memoryUsage,
      totalMetrics: history.length
    };
  }, [history, metrics]);

  // Clear metrics history
  const clearMetrics = useCallback(() => {
    setHistory([]);
    setMetrics({
      renderTime: 0,
      memoryUsage: 0,
      itemsRendered: 0,
      totalItems: 0,
      scrollPosition: 0,
      fps: 0,
      lastUpdate: Date.now()
    });
  }, []);

  // Auto-update FPS and memory usage
  useEffect(() => {
    const interval = setInterval(() => {
      updateFPS();
      updateMemoryUsage();
    }, 1000);

    return () => clearInterval(interval);
  }, [updateFPS, updateMemoryUsage]);

  return {
    metrics,
    history,
    startRenderMeasurement,
    endRenderMeasurement,
    logMetric,
    updateMetrics,
    measureExecution,
    measureAsyncExecution,
    getPerformanceSummary,
    clearMetrics
  };
};

// Hook for debouncing values with performance tracking
export const useDebounce = <T>(value: T, delay: number, trackPerformance = false): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  const { logMetric } = usePerformanceMetrics('useDebounce');

  useEffect(() => {
    const startTime = performance.now();
    
    const handler = setTimeout(() => {
      setDebouncedValue(value);
      
      if (trackPerformance) {
        const duration = performance.now() - startTime;
        logMetric('debounce_update', duration, { delay, valueType: typeof value });
      }
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay, logMetric, trackPerformance]);

  return debouncedValue;
};

// Export types
export type { PerformanceMetrics, MetricEntry };
