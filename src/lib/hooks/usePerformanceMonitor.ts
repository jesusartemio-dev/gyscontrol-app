'use client'

import React, { useEffect, useRef, useState } from 'react'

interface PerformanceMetrics {
  componentName: string
  renderTime: number
  renderCount: number
  lastRender: number
  averageRenderTime: number
  memoryUsage?: number
}

interface PerformanceMonitorOptions {
  enabled?: boolean
  logToConsole?: boolean
  reportThreshold?: number // ms
  componentName?: string
}

export function usePerformanceMonitor(options: PerformanceMonitorOptions = {}) {
  const {
    enabled = process.env.NODE_ENV === 'development',
    logToConsole = true,
    reportThreshold = 16, // 60fps threshold
    componentName = 'UnknownComponent'
  } = options

  const renderCountRef = useRef(0)
  const renderTimesRef = useRef<number[]>([])
  const startTimeRef = useRef<number>(0)
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    componentName,
    renderTime: 0,
    renderCount: 0,
    lastRender: Date.now(),
    averageRenderTime: 0
  })

  useEffect(() => {
    if (!enabled) return

    startTimeRef.current = performance.now()
    renderCountRef.current += 1

    return () => {
      const endTime = performance.now()
      const renderTime = endTime - startTimeRef.current

      renderTimesRef.current.push(renderTime)

      // Keep only last 50 render times for average calculation
      if (renderTimesRef.current.length > 50) {
        renderTimesRef.current = renderTimesRef.current.slice(-50)
      }

      const averageRenderTime = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length

      const newMetrics: PerformanceMetrics = {
        componentName,
        renderTime,
        renderCount: renderCountRef.current,
        lastRender: Date.now(),
        averageRenderTime,
        memoryUsage: (performance as any).memory?.usedJSHeapSize
      }

      setMetrics(newMetrics)

      // Log slow renders
      if (renderTime > reportThreshold && logToConsole) {
        console.warn(`🚨 Slow render in ${componentName}:`, {
          renderTime: `${renderTime.toFixed(2)}ms`,
          renderCount: renderCountRef.current,
          averageRenderTime: `${averageRenderTime.toFixed(2)}ms`,
          memoryUsage: newMetrics.memoryUsage ? `${(newMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB` : 'N/A'
        })
      }

      // Send to analytics in production
      if (process.env.NODE_ENV === 'production' && renderTime > reportThreshold) {
        // TODO: Send to analytics service
      }
    }
  })

  return metrics
}

// Performance monitoring HOC
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  options: PerformanceMonitorOptions = {}
) {
  const WrappedComponent = (props: P) => {
    usePerformanceMonitor(options)
    return React.createElement(Component, props)
  }

  WrappedComponent.displayName = `withPerformanceMonitoring(${Component.displayName || Component.name})`

  return WrappedComponent
}

// Global performance monitor
class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, PerformanceMetrics> = new Map()
  private observers: Set<(metrics: Map<string, PerformanceMetrics>) => void> = new Set()

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  recordMetric(componentName: string, metric: Partial<PerformanceMetrics>) {
    const existing = this.metrics.get(componentName) || {
      componentName,
      renderTime: 0,
      renderCount: 0,
      lastRender: Date.now(),
      averageRenderTime: 0
    }

    const updated = { ...existing, ...metric }
    this.metrics.set(componentName, updated)

    // Notify observers
    this.observers.forEach(observer => observer(this.metrics))
  }

  getMetrics(): Map<string, PerformanceMetrics> {
    return new Map(this.metrics)
  }

  subscribe(callback: (metrics: Map<string, PerformanceMetrics>) => void) {
    this.observers.add(callback)
    return () => {
      this.observers.delete(callback)
    }
  }

  getSlowComponents(threshold: number = 16): PerformanceMetrics[] {
    return Array.from(this.metrics.values())
      .filter(metric => metric.averageRenderTime > threshold)
      .sort((a, b) => b.averageRenderTime - a.averageRenderTime)
  }

  clear() {
    this.metrics.clear()
    this.observers.forEach(observer => observer(this.metrics))
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance()

// Hook to access global performance monitor
export function useGlobalPerformanceMonitor() {
  const [metrics, setMetrics] = useState<Map<string, PerformanceMetrics>>(new Map())

  useEffect(() => {
    const unsubscribe = performanceMonitor.subscribe(setMetrics)
    return unsubscribe
  }, [])

  return {
    metrics,
    slowComponents: performanceMonitor.getSlowComponents(),
    clear: performanceMonitor.clear.bind(performanceMonitor)
  }
}
