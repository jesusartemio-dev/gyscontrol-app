'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { AlertTriangle, BarChart3, RefreshCw, Trash2 } from 'lucide-react'
import { getRenderStats, clearRenderCounters } from './ComponentTracker'
import { getMotionStats, clearMotionStats } from './MotionDebugger'
import { debugUtils, useDebugPanelData } from './OptimizedDebugHooks'

// ✅ Interfaz para estadísticas de debug
interface DebugStats {
  componentStats: Array<{
    component: string
    count: number
    lastRender: number | undefined
  }>
  motionStats: {
    renderCounts: Record<string, number>
    errors: Record<string, Error[]>
    totalErrors: number
  }
  optimizedStats?: any
}

// ✅ Props del panel de debug
interface DebugPanelProps {
  isVisible?: boolean
  onToggle?: () => void
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left'
}

// ✅ Componente principal del panel de debug
export const DebugPanel: React.FC<DebugPanelProps> = ({
  isVisible = false,
  onToggle,
  position = 'top-right'
}) => {
  const [stats, setStats] = useState<DebugStats>({
    componentStats: [],
    motionStats: { renderCounts: {}, errors: {}, totalErrors: 0 }
  })
  const [autoRefresh, setAutoRefresh] = useState(true)

  // 🎛️ Use optimized debug panel data
  const { getStats, clearStats, getHighRenderComponents } = useDebugPanelData()

  // 🔁 Actualizar estadísticas cada segundo
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      const optimizedStats = getStats()
      setStats({
        componentStats: getRenderStats(),
        motionStats: getMotionStats(),
        optimizedStats // Add optimized stats
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [autoRefresh])

  // 📡 Limpiar todas las estadísticas
  const handleClearAll = () => {
    clearRenderCounters()
    clearMotionStats()
    clearStats() // Clear optimized stats
    setStats({
      componentStats: [],
      motionStats: { renderCounts: {}, errors: {}, totalErrors: 0 }
    })
  }

  // 📡 Actualizar estadísticas manualmente
  const handleRefresh = () => {
    const optimizedStats = getStats()
    setStats({
      componentStats: getRenderStats(),
      motionStats: getMotionStats(),
      optimizedStats // Add optimized stats
    })
  }

  // 📡 Calcular promedio de tiempo de render
  const getAverageRenderTime = (times: number[]) => {
    if (times.length === 0) return 0
    return Math.round(times.reduce((a, b) => a + b, 0) / times.length)
  }

  // 📡 Obtener componentes con más renders
  const getTopRenderingComponents = () => {
    return stats.componentStats
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map(item => [item.component, item.count] as [string, number])
  }

  // 📡 Obtener componentes con errores
  const getComponentsWithErrors = () => {
    return Object.entries(stats.motionStats.errors)
      .filter(([, errors]) => errors.length > 0)
  }

  // 🎨 Clases de posición
  const positionClasses = {
    'top-right': 'top-4 right-4',
    'top-left': 'top-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4'
  }

  if (!isVisible) {
    return (
      <Button
        onClick={onToggle}
        className={`fixed ${positionClasses[position]} z-50 h-10 w-10 p-0`}
        variant="outline"
        size="sm"
      >
        <BarChart3 className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Card className={`fixed ${positionClasses[position]} z-50 w-96 max-h-[80vh] shadow-lg`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Debug Panel
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button
              onClick={() => setAutoRefresh(!autoRefresh)}
              variant={autoRefresh ? 'default' : 'outline'}
              size="sm"
              className="h-7 px-2"
            >
              <RefreshCw className={`h-3 w-3 ${autoRefresh ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="h-7 px-2"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
            <Button
              onClick={handleClearAll}
              variant="outline"
              size="sm"
              className="h-7 px-2"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
            <Button
              onClick={onToggle}
              variant="ghost"
              size="sm"
              className="h-7 px-2"
            >
              ×
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <Tabs defaultValue="renders" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="renders" className="text-xs">
              Renders
            </TabsTrigger>
            <TabsTrigger value="performance" className="text-xs">
              Performance
            </TabsTrigger>
            <TabsTrigger value="errors" className="text-xs">
              Errors
              {stats.motionStats.totalErrors > 0 && (
                <Badge variant="destructive" className="ml-1 h-4 px-1 text-xs">
                  {stats.motionStats.totalErrors}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="renders" className="mt-3">
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {getTopRenderingComponents().map(([component, count]) => (
                  <div key={component} className="flex items-center justify-between p-2 bg-muted rounded">
                    <span className="text-xs font-mono truncate">{component}</span>
                    <Badge variant={count > 10 ? 'destructive' : count > 5 ? 'secondary' : 'default'}>
                      {count}
                    </Badge>
                  </div>
                ))}
                {getTopRenderingComponents().length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No render data available
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="performance" className="mt-3">
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {stats.componentStats.map((item) => (
                  <div key={item.component} className="p-2 bg-muted rounded">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono truncate">{item.component}</span>
                      <Badge variant="outline">
                        {item.count} renders
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Last render: {item.lastRender ? new Date(item.lastRender).toLocaleTimeString() : 'Never'}
                    </div>
                  </div>
                ))}
                {stats.componentStats.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No performance data available
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="errors" className="mt-3">
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {getComponentsWithErrors().map(([component, errors]) => (
                  <div key={component} className="p-2 bg-destructive/10 border border-destructive/20 rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="h-3 w-3 text-destructive" />
                      <span className="text-xs font-mono truncate">{component}</span>
                      <Badge variant="destructive">{errors.length}</Badge>
                    </div>
                    <div className="space-y-1">
                      {errors.slice(0, 3).map((error, index) => (
                        <p key={index} className="text-xs text-destructive font-mono">
                          {error.message || error.toString()}
                        </p>
                      ))}
                      {errors.length > 3 && (
                        <p className="text-xs text-muted-foreground">
                          +{errors.length - 3} more errors...
                        </p>
                      )}
                    </div>
                  </div>
                ))}
                {getComponentsWithErrors().length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">
                    No errors detected
                  </p>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}

// ✅ Hook para usar el panel de debug
export const useDebugPanel = () => {
  const [isVisible, setIsVisible] = useState(false)
  
  const toggle = () => setIsVisible(!isVisible)
  const show = () => setIsVisible(true)
  const hide = () => setIsVisible(false)
  
  return {
    isVisible,
    toggle,
    show,
    hide,
    DebugPanel: (props: Omit<DebugPanelProps, 'isVisible' | 'onToggle'>) => (
      <DebugPanel {...props} isVisible={isVisible} onToggle={toggle} />
    )
  }
}

export default DebugPanel