// ===================================================
// 📁 Archivo: PerformanceMonitor.tsx
// 📌 Ubicación: src/components/ui/PerformanceMonitor.tsx
// 🔧 Descripción: Componente para monitoreo de rendimiento en tiempo real
//
// 🧠 Uso: Visualización de métricas de rendimiento y memoria
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

'use client'

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Activity, 
  BarChart3, 
  Clock, 
  Cpu, 
  HardDrive, 
  Monitor, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  X,
  Minimize2,
  Maximize2,
  RefreshCw
} from 'lucide-react'

// 🎯 Tipos para métricas de rendimiento
interface PerformanceMetric {
  id: string
  component: string
  metric: string
  value: number
  unit: string
  timestamp: number
  category: 'render' | 'memory' | 'network' | 'user' | 'custom'
  severity?: 'low' | 'medium' | 'high' | 'critical'
}

interface ComponentStats {
  component: string
  totalMetrics: number
  avgRenderTime: number
  memoryUsage: number
  lastUpdate: number
  status: 'healthy' | 'warning' | 'critical'
}

interface PerformanceMonitorProps {
  maxMetrics?: number // Máximo número de métricas a mantener
  updateInterval?: number // Intervalo de actualización en ms
  showMiniView?: boolean // Vista minimizada por defecto
  enableAlerts?: boolean // Habilitar alertas
  thresholds?: {
    renderTime: number // ms
    memoryUsage: number // MB
    fps: number
  }
  className?: string
}

// 🎯 Thresholds por defecto
const DEFAULT_THRESHOLDS = {
  renderTime: 16, // 60 FPS
  memoryUsage: 100, // 100 MB
  fps: 30
}

// 🎯 Colores para categorías
const CATEGORY_COLORS = {
  render: 'bg-blue-100 text-blue-800',
  memory: 'bg-green-100 text-green-800',
  network: 'bg-purple-100 text-purple-800',
  user: 'bg-orange-100 text-orange-800',
  custom: 'bg-gray-100 text-gray-800'
}

// 🎯 Iconos para categorías
const CATEGORY_ICONS = {
  render: Clock,
  memory: HardDrive,
  network: Activity,
  user: Monitor,
  custom: BarChart3
}

export default function PerformanceMonitor({
  maxMetrics = 1000,
  updateInterval = 1000,
  showMiniView = false,
  enableAlerts = true,
  thresholds = DEFAULT_THRESHOLDS,
  className = ''
}: PerformanceMonitorProps) {
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([])
  const [isMinimized, setIsMinimized] = useState(showMiniView)
  const [isVisible, setIsVisible] = useState(true)
  const [selectedComponent, setSelectedComponent] = useState<string | null>(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  
  // 📊 Listener para métricas globales
  useEffect(() => {
    const handlePerformanceMetric = (event: CustomEvent<PerformanceMetric>) => {
      const newMetric = event.detail
      
      setMetrics(prev => {
        const updated = [...prev, newMetric]
        
        // Mantener solo las métricas más recientes
        if (updated.length > maxMetrics) {
          return updated.slice(-maxMetrics)
        }
        
        return updated
      })
    }
    
    // Escuchar eventos de métricas personalizados
    window.addEventListener('performance-metric', handlePerformanceMetric as EventListener)
    
    return () => {
      window.removeEventListener('performance-metric', handlePerformanceMetric as EventListener)
    }
  }, [maxMetrics])
  
  // 🔄 Auto-refresh de métricas del sistema
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      // Métricas del navegador
      if ('memory' in performance) {
        const memInfo = (performance as any).memory
        
        const memoryMetric: PerformanceMetric = {
          id: `memory_${Date.now()}`,
          component: 'System',
          metric: 'Memory Usage',
          value: Math.round(memInfo.usedJSHeapSize / 1024 / 1024),
          unit: 'MB',
          timestamp: Date.now(),
          category: 'memory',
          severity: memInfo.usedJSHeapSize / 1024 / 1024 > thresholds.memoryUsage ? 'high' : 'low'
        }
        
        setMetrics(prev => [...prev, memoryMetric].slice(-maxMetrics))
      }
      
      // FPS aproximado
      let lastTime = performance.now()
      requestAnimationFrame(() => {
        const currentTime = performance.now()
        const fps = Math.round(1000 / (currentTime - lastTime))
        
        const fpsMetric: PerformanceMetric = {
          id: `fps_${Date.now()}`,
          component: 'System',
          metric: 'FPS',
          value: fps,
          unit: 'fps',
          timestamp: Date.now(),
          category: 'render',
          severity: fps < thresholds.fps ? 'medium' : 'low'
        }
        
        setMetrics(prev => [...prev, fpsMetric].slice(-maxMetrics))
      })
    }, updateInterval)
    
    return () => clearInterval(interval)
  }, [autoRefresh, updateInterval, maxMetrics, thresholds])
  
  // 📈 Estadísticas por componente
  const componentStats = useMemo((): ComponentStats[] => {
    const statsMap = new Map<string, ComponentStats>()
    
    metrics.forEach(metric => {
      const existing = statsMap.get(metric.component) || {
        component: metric.component,
        totalMetrics: 0,
        avgRenderTime: 0,
        memoryUsage: 0,
        lastUpdate: 0,
        status: 'healthy' as const
      }
      
      existing.totalMetrics++
      existing.lastUpdate = Math.max(existing.lastUpdate, metric.timestamp)
      
      if (metric.category === 'render' && metric.metric.includes('render')) {
        existing.avgRenderTime = (existing.avgRenderTime + metric.value) / 2
      }
      
      if (metric.category === 'memory') {
        existing.memoryUsage = metric.value
      }
      
      // Determinar estado de salud
      if (metric.severity === 'critical') {
        existing.status = 'critical'
      } else if (metric.severity === 'high' && existing.status !== 'critical') {
        existing.status = 'warning'
      }
      
      statsMap.set(metric.component, existing)
    })
    
    return Array.from(statsMap.values()).sort((a, b) => b.lastUpdate - a.lastUpdate)
  }, [metrics])
  
  // 🚨 Métricas críticas
  const criticalMetrics = useMemo(() => {
    return metrics
      .filter(m => m.severity === 'critical' || m.severity === 'high')
      .slice(-10)
      .reverse()
  }, [metrics])
  
  // 📊 Métricas recientes filtradas
  const filteredMetrics = useMemo(() => {
    let filtered = metrics.slice(-50).reverse()
    
    if (selectedComponent && selectedComponent !== 'all') {
      filtered = filtered.filter(m => m.component === selectedComponent)
    }
    
    return filtered
  }, [metrics, selectedComponent])
  
  // 🎨 Obtener color de severidad
  const getSeverityColor = (severity?: string) => {
    switch (severity) {
      case 'critical': return 'text-red-600 bg-red-100'
      case 'high': return 'text-orange-600 bg-orange-100'
      case 'medium': return 'text-yellow-600 bg-yellow-100'
      default: return 'text-green-600 bg-green-100'
    }
  }
  
  // 🎨 Obtener icono de estado
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'critical': return <AlertTriangle className="h-4 w-4 text-red-600" />
      case 'warning': return <AlertTriangle className="h-4 w-4 text-orange-600" />
      default: return <CheckCircle className="h-4 w-4 text-green-600" />
    }
  }
  
  // 🧹 Limpiar métricas
  const clearMetrics = useCallback(() => {
    setMetrics([])
  }, [])
  
  if (!isVisible) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-50"
      >
        <Activity className="h-4 w-4 mr-2" />
        Performance
      </Button>
    )
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`fixed bottom-4 right-4 z-50 ${className}`}
    >
      <Card className={`${isMinimized ? 'w-80' : 'w-96'} max-h-96 overflow-hidden shadow-lg`}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Performance Monitor
              {criticalMetrics.length > 0 && (
                <Badge variant="secondary" className="text-xs bg-red-100 text-red-800">
                  {criticalMetrics.length}
                </Badge>
              )}
            </CardTitle>
            
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setAutoRefresh(!autoRefresh)}
                className="h-6 w-6 p-0"
              >
                <RefreshCw className={`h-3 w-3 ${autoRefresh ? 'animate-spin' : ''}`} />
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-6 w-6 p-0"
              >
                {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
              </Button>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsVisible(false)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-3">
          {isMinimized ? (
            // 📱 Vista minimizada
            <div className="space-y-2">
              <div className="flex justify-between text-xs">
                <span>Components: {componentStats.length}</span>
                <span>Metrics: {metrics.length}</span>
              </div>
              
              {criticalMetrics.length > 0 && (
                <div className="text-xs text-red-600">
                  ⚠️ {criticalMetrics.length} critical issues
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                {componentStats.slice(0, 4).map(stat => (
                  <div key={stat.component} className="text-xs p-1 bg-gray-50 rounded">
                    <div className="flex items-center gap-1">
                      {getStatusIcon(stat.status)}
                      <span className="truncate">{stat.component}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            // 📊 Vista completa
            <div className="space-y-3">
              {/* Controles */}
              <div className="flex items-center gap-2 text-xs">
                <select
                  value={selectedComponent || 'all'}
                  onChange={(e) => setSelectedComponent(e.target.value === 'all' ? null : e.target.value)}
                  className="text-xs border rounded px-2 py-1"
                >
                  <option value="all">All Components</option>
                  {componentStats.map(stat => (
                    <option key={stat.component} value={stat.component}>
                      {stat.component}
                    </option>
                  ))}
                </select>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearMetrics}
                  className="text-xs h-6"
                >
                  Clear
                </Button>
              </div>
              
              {/* Estadísticas de componentes */}
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {componentStats.map(stat => (
                  <div key={stat.component} className="flex items-center justify-between text-xs p-1 bg-gray-50 rounded">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(stat.status)}
                      <span className="font-medium">{stat.component}</span>
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      {stat.avgRenderTime > 0 && (
                        <span>{stat.avgRenderTime.toFixed(1)}ms</span>
                      )}
                      {stat.memoryUsage > 0 && (
                        <span>{stat.memoryUsage}MB</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Métricas críticas */}
              {criticalMetrics.length > 0 && (
                <div className="space-y-1">
                  <div className="text-xs font-medium text-red-600">Critical Issues:</div>
                  <div className="max-h-20 overflow-y-auto space-y-1">
                    {criticalMetrics.slice(0, 3).map(metric => (
                      <div key={metric.id} className="text-xs p-1 bg-red-50 rounded border border-red-200">
                        <div className="flex justify-between">
                          <span className="font-medium">{metric.component}</span>
                          <span>{metric.value}{metric.unit}</span>
                        </div>
                        <div className="text-gray-600">{metric.metric}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Métricas recientes */}
              <div className="space-y-1">
                <div className="text-xs font-medium">Recent Metrics:</div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {filteredMetrics.slice(0, 10).map(metric => {
                    const CategoryIcon = CATEGORY_ICONS[metric.category]
                    return (
                      <div key={metric.id} className="flex items-center justify-between text-xs p-1 hover:bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <CategoryIcon className="h-3 w-3" />
                          <span>{metric.component}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs ${CATEGORY_COLORS[metric.category]}`}>
                            {metric.metric}
                          </Badge>
                          <span className={getSeverityColor(metric.severity)}>
                            {metric.value}{metric.unit}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

// 🎯 Hook para enviar métricas al monitor
export function usePerformanceReporter(componentName: string) {
  const reportMetric = useCallback((metric: Omit<PerformanceMetric, 'id' | 'component' | 'timestamp'>) => {
    const fullMetric: PerformanceMetric = {
      ...metric,
      id: `${componentName}_${Date.now()}_${Math.random()}`,
      component: componentName,
      timestamp: Date.now()
    }
    
    // Enviar evento personalizado
    window.dispatchEvent(new CustomEvent('performance-metric', { detail: fullMetric }))
  }, [componentName])
  
  return { reportMetric }
}

// 🎯 Tipos exportados
export type {
  PerformanceMetric,
  ComponentStats,
  PerformanceMonitorProps
}
