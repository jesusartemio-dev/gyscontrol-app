// ===================================================
// 📁 Archivo: useAdvancedPerformanceMonitoring.ts
// 📌 Ubicación: src/hooks/useAdvancedPerformanceMonitoring.ts
// 🔧 Descripción: Hook avanzado para monitoreo de rendimiento integral
//
// 🧠 Uso: Monitoreo automático de componentes con métricas detalladas
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

import { useEffect, useRef, useCallback, useState, useMemo } from 'react'
import { usePerformanceReporter } from '@/components/ui/PerformanceMonitor'

// 🎯 Tipos para configuración de monitoreo
interface PerformanceConfig {
  enableRenderTracking?: boolean
  enableMemoryTracking?: boolean
  enableUserInteractionTracking?: boolean
  enableNetworkTracking?: boolean
  sampleRate?: number // 0-1, porcentaje de métricas a capturar
  thresholds?: {
    renderTime: number
    memoryUsage: number
    interactionDelay: number
  }
}

interface RenderMetrics {
  renderCount: number
  totalRenderTime: number
  avgRenderTime: number
  slowRenders: number
  lastRenderTime: number
}

interface MemoryMetrics {
  initialMemory: number
  currentMemory: number
  peakMemory: number
  memoryLeaks: number
}

interface InteractionMetrics {
  totalInteractions: number
  avgResponseTime: number
  slowInteractions: number
  lastInteractionTime: number
}

interface NetworkMetrics {
  totalRequests: number
  avgRequestTime: number
  failedRequests: number
  slowRequests: number
}

interface ComponentPerformanceData {
  componentName: string
  render: RenderMetrics
  memory: MemoryMetrics
  interactions: InteractionMetrics
  network: NetworkMetrics
  startTime: number
  isActive: boolean
}

// 🎯 Configuración por defecto
const DEFAULT_CONFIG: Required<PerformanceConfig> = {
  enableRenderTracking: true,
  enableMemoryTracking: true,
  enableUserInteractionTracking: true,
  enableNetworkTracking: true,
  sampleRate: 1.0,
  thresholds: {
    renderTime: 16, // 60 FPS
    memoryUsage: 50, // 50 MB
    interactionDelay: 100 // 100ms
  }
}

/**
 * 🎯 Hook principal para monitoreo avanzado de rendimiento
 * 
 * @param componentName - Nombre del componente a monitorear
 * @param config - Configuración de monitoreo
 * @returns Objeto con métricas y funciones de control
 */
export function useAdvancedPerformanceMonitoring(
  componentName: string,
  config: PerformanceConfig = {}
) {
  const fullConfig = { ...DEFAULT_CONFIG, ...config }
  const { reportMetric } = usePerformanceReporter(componentName)
  
  // 📊 Estado de métricas
  const [performanceData, setPerformanceData] = useState<ComponentPerformanceData>(() => ({
    componentName,
    render: {
      renderCount: 0,
      totalRenderTime: 0,
      avgRenderTime: 0,
      slowRenders: 0,
      lastRenderTime: 0
    },
    memory: {
      initialMemory: 0,
      currentMemory: 0,
      peakMemory: 0,
      memoryLeaks: 0
    },
    interactions: {
      totalInteractions: 0,
      avgResponseTime: 0,
      slowInteractions: 0,
      lastInteractionTime: 0
    },
    network: {
      totalRequests: 0,
      avgRequestTime: 0,
      failedRequests: 0,
      slowRequests: 0
    },
    startTime: Date.now(),
    isActive: true
  }))
  
  // 🔄 Referencias para tracking
  const renderStartTime = useRef<number>(0)
  const memoryObserver = useRef<PerformanceObserver | null>(null)
  const networkObserver = useRef<PerformanceObserver | null>(null)
  const interactionStartTimes = useRef<Map<string, number>>(new Map())
  
  // 🎯 Función para verificar si debe capturar métrica
  const shouldSample = useCallback(() => {
    return Math.random() < fullConfig.sampleRate
  }, [fullConfig.sampleRate])
  
  // 📈 Tracking de renders
  useEffect(() => {
    if (!fullConfig.enableRenderTracking) return
    
    renderStartTime.current = performance.now()
    
    return () => {
      if (!shouldSample()) return
      
      const renderTime = performance.now() - renderStartTime.current
      const isSlowRender = renderTime > fullConfig.thresholds.renderTime
      
      setPerformanceData(prev => {
        const newRenderCount = prev.render.renderCount + 1
        const newTotalTime = prev.render.totalRenderTime + renderTime
        const newAvgTime = newTotalTime / newRenderCount
        
        return {
          ...prev,
          render: {
            ...prev.render,
            renderCount: newRenderCount,
            totalRenderTime: newTotalTime,
            avgRenderTime: newAvgTime,
            slowRenders: prev.render.slowRenders + (isSlowRender ? 1 : 0),
            lastRenderTime: renderTime
          }
        }
      })
      
      // Reportar métrica de render
      reportMetric({
        metric: 'Render Time',
        value: Math.round(renderTime * 100) / 100,
        unit: 'ms',
        category: 'render',
        severity: isSlowRender ? 'high' : 'low'
      })
      
      // Reportar render promedio cada 10 renders
      if (performanceData.render.renderCount % 10 === 0) {
        reportMetric({
          metric: 'Avg Render Time',
          value: Math.round(performanceData.render.avgRenderTime * 100) / 100,
          unit: 'ms',
          category: 'render',
          severity: performanceData.render.avgRenderTime > fullConfig.thresholds.renderTime ? 'medium' : 'low'
        })
      }
    }
  })
  
  // 💾 Tracking de memoria
  useEffect(() => {
    if (!fullConfig.enableMemoryTracking || !('memory' in performance)) return
    
    const trackMemory = () => {
      if (!shouldSample()) return
      
      const memInfo = (performance as any).memory
      const currentMemory = Math.round(memInfo.usedJSHeapSize / 1024 / 1024)
      
      setPerformanceData(prev => {
        const isMemoryLeak = currentMemory > prev.memory.peakMemory + 10 // 10MB threshold
        
        return {
          ...prev,
          memory: {
            ...prev.memory,
            currentMemory,
            peakMemory: Math.max(prev.memory.peakMemory, currentMemory),
            memoryLeaks: prev.memory.memoryLeaks + (isMemoryLeak ? 1 : 0),
            initialMemory: prev.memory.initialMemory || currentMemory
          }
        }
      })
      
      // Reportar uso de memoria
      reportMetric({
        metric: 'Memory Usage',
        value: currentMemory,
        unit: 'MB',
        category: 'memory',
        severity: currentMemory > fullConfig.thresholds.memoryUsage ? 'high' : 'low'
      })
    }
    
    // Tracking inicial
    trackMemory()
    
    // Tracking periódico
    const interval = setInterval(trackMemory, 5000) // Cada 5 segundos
    
    return () => clearInterval(interval)
  }, [fullConfig.enableMemoryTracking, fullConfig.thresholds.memoryUsage, shouldSample, reportMetric])
  
  // 🖱️ Tracking de interacciones de usuario
  const trackInteraction = useCallback((interactionType: string, startTime?: number) => {
    if (!fullConfig.enableUserInteractionTracking || !shouldSample()) return
    
    const currentTime = performance.now()
    const responseTime = startTime ? currentTime - startTime : 0
    const isSlowInteraction = responseTime > fullConfig.thresholds.interactionDelay
    
    setPerformanceData(prev => {
      const newTotalInteractions = prev.interactions.totalInteractions + 1
      const newAvgResponseTime = startTime 
        ? (prev.interactions.avgResponseTime * prev.interactions.totalInteractions + responseTime) / newTotalInteractions
        : prev.interactions.avgResponseTime
      
      return {
        ...prev,
        interactions: {
          ...prev.interactions,
          totalInteractions: newTotalInteractions,
          avgResponseTime: newAvgResponseTime,
          slowInteractions: prev.interactions.slowInteractions + (isSlowInteraction ? 1 : 0),
          lastInteractionTime: responseTime
        }
      }
    })
    
    if (startTime) {
      reportMetric({
        metric: `${interactionType} Response`,
        value: Math.round(responseTime * 100) / 100,
        unit: 'ms',
        category: 'user',
        severity: isSlowInteraction ? 'medium' : 'low'
      })
    }
  }, [fullConfig.enableUserInteractionTracking, fullConfig.thresholds.interactionDelay, shouldSample, reportMetric])
  
  // 🌐 Tracking de red
  useEffect(() => {
    if (!fullConfig.enableNetworkTracking) return
    
    const observer = new PerformanceObserver((list) => {
      if (!shouldSample()) return
      
      for (const entry of list.getEntries()) {
        if (entry.entryType === 'navigation' || entry.entryType === 'resource') {
          const duration = entry.duration
          const isSlowRequest = duration > 1000 // 1 segundo
          const isFailed = (entry as any).transferSize === 0 && duration > 0
          
          setPerformanceData(prev => {
            const newTotalRequests = prev.network.totalRequests + 1
            const newAvgRequestTime = (prev.network.avgRequestTime * prev.network.totalRequests + duration) / newTotalRequests
            
            return {
              ...prev,
              network: {
                ...prev.network,
                totalRequests: newTotalRequests,
                avgRequestTime: newAvgRequestTime,
                failedRequests: prev.network.failedRequests + (isFailed ? 1 : 0),
                slowRequests: prev.network.slowRequests + (isSlowRequest ? 1 : 0)
              }
            }
          })
          
          reportMetric({
            metric: 'Network Request',
            value: Math.round(duration),
            unit: 'ms',
            category: 'network',
            severity: isSlowRequest ? 'medium' : isFailed ? 'high' : 'low'
          })
        }
      }
    })
    
    try {
      observer.observe({ entryTypes: ['navigation', 'resource'] })
      networkObserver.current = observer
    } catch (error) {
      console.warn('Network performance tracking not supported:', error)
    }
    
    return () => {
      observer.disconnect()
    }
  }, [fullConfig.enableNetworkTracking, shouldSample, reportMetric])
  
  // 🎯 Funciones de utilidad para interacciones
  const startInteraction = useCallback((interactionType: string) => {
    const startTime = performance.now()
    interactionStartTimes.current.set(interactionType, startTime)
    return startTime
  }, [])
  
  const endInteraction = useCallback((interactionType: string) => {
    const startTime = interactionStartTimes.current.get(interactionType)
    if (startTime) {
      trackInteraction(interactionType, startTime)
      interactionStartTimes.current.delete(interactionType)
    }
  }, [trackInteraction])
  
  // 📊 Métricas calculadas
  const metrics = useMemo(() => {
    const uptime = Date.now() - performanceData.startTime
    
    return {
      ...performanceData,
      uptime,
      health: {
        renderHealth: performanceData.render.avgRenderTime <= fullConfig.thresholds.renderTime ? 'good' : 'poor',
        memoryHealth: performanceData.memory.currentMemory <= fullConfig.thresholds.memoryUsage ? 'good' : 'poor',
        interactionHealth: performanceData.interactions.avgResponseTime <= fullConfig.thresholds.interactionDelay ? 'good' : 'poor',
        networkHealth: performanceData.network.failedRequests / Math.max(performanceData.network.totalRequests, 1) < 0.1 ? 'good' : 'poor'
      },
      efficiency: {
        renderEfficiency: Math.max(0, 100 - (performanceData.render.slowRenders / Math.max(performanceData.render.renderCount, 1)) * 100),
        memoryEfficiency: Math.max(0, 100 - (performanceData.memory.memoryLeaks * 10)),
        interactionEfficiency: Math.max(0, 100 - (performanceData.interactions.slowInteractions / Math.max(performanceData.interactions.totalInteractions, 1)) * 100),
        networkEfficiency: Math.max(0, 100 - (performanceData.network.failedRequests / Math.max(performanceData.network.totalRequests, 1)) * 100)
      }
    }
  }, [performanceData, fullConfig.thresholds])
  
  // 🧹 Función para resetear métricas
  const resetMetrics = useCallback(() => {
    setPerformanceData(prev => ({
      ...prev,
      render: {
        renderCount: 0,
        totalRenderTime: 0,
        avgRenderTime: 0,
        slowRenders: 0,
        lastRenderTime: 0
      },
      interactions: {
        totalInteractions: 0,
        avgResponseTime: 0,
        slowInteractions: 0,
        lastInteractionTime: 0
      },
      network: {
        totalRequests: 0,
        avgRequestTime: 0,
        failedRequests: 0,
        slowRequests: 0
      },
      startTime: Date.now()
    }))
  }, [])
  
  // 🔄 Cleanup al desmontar
  useEffect(() => {
    return () => {
      setPerformanceData(prev => ({ ...prev, isActive: false }))
      if (networkObserver.current) {
        networkObserver.current.disconnect()
      }
    }
  }, [])
  
  return {
    metrics,
    trackInteraction,
    startInteraction,
    endInteraction,
    resetMetrics,
    config: fullConfig
  }
}

/**
 * 🎯 Hook simplificado para componentes básicos
 */
export function useBasicPerformanceMonitoring(componentName: string) {
  return useAdvancedPerformanceMonitoring(componentName, {
    enableRenderTracking: true,
    enableMemoryTracking: false,
    enableUserInteractionTracking: false,
    enableNetworkTracking: false,
    sampleRate: 0.1 // Solo 10% de las métricas
  })
}

/**
 * 🎯 Hook para componentes críticos
 */
export function useCriticalPerformanceMonitoring(componentName: string) {
  return useAdvancedPerformanceMonitoring(componentName, {
    enableRenderTracking: true,
    enableMemoryTracking: true,
    enableUserInteractionTracking: true,
    enableNetworkTracking: true,
    sampleRate: 1.0, // Todas las métricas
    thresholds: {
      renderTime: 8, // 120 FPS para componentes críticos
      memoryUsage: 25, // 25 MB límite estricto
      interactionDelay: 50 // 50ms respuesta máxima
    }
  })
}

// 🎯 Tipos exportados
export type {
  PerformanceConfig,
  RenderMetrics,
  MemoryMetrics,
  InteractionMetrics,
  NetworkMetrics,
  ComponentPerformanceData
}
