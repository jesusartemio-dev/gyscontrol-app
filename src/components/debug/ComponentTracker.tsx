'use client'

import { useEffect, useRef } from 'react'

/**
 * ComponentTracker - Detecta componentes que causan re-renders excesivos
 * Útil para identificar la fuente de "Maximum update depth exceeded"
 */
interface ComponentTrackerProps {
  componentName: string
  props?: Record<string, any>
  children?: React.ReactNode
}

const renderCounts = new Map<string, number>()
const lastRenderTime = new Map<string, number>()

export function ComponentTracker({ componentName, props, children }: ComponentTrackerProps) {
  const renderCount = useRef(0)
  const startTime = useRef(Date.now())
  
  // Incrementar contador de renders
  renderCount.current++
  const currentTime = Date.now()
  const lastTime = lastRenderTime.get(componentName) || currentTime
  const timeDiff = currentTime - lastTime
  
  // Actualizar contadores globales
  const globalCount = (renderCounts.get(componentName) || 0) + 1
  renderCounts.set(componentName, globalCount)
  lastRenderTime.set(componentName, currentTime)
  
  // Detectar renders excesivos
  if (renderCount.current > 10 && timeDiff < 100) {
    console.error(`🚨 INFINITE LOOP DETECTED in ${componentName}:`, {
      renderCount: renderCount.current,
      globalCount,
      timeDiff,
      props: props ? Object.keys(props) : 'none',
      stackTrace: new Error().stack
    })
  } else if (renderCount.current > 5) {
    console.warn(`⚠️ High render count in ${componentName}:`, {
      renderCount: renderCount.current,
      globalCount,
      timeDiff
    })
  }
  
  // Log cada render para debugging
  console.log(`🔄 ${componentName} render #${renderCount.current} (global: ${globalCount}, time: ${timeDiff}ms)`)
  
  useEffect(() => {
    // Reset counter después de un tiempo sin renders
    const timer = setTimeout(() => {
      renderCount.current = 0
    }, 1000)
    
    return () => clearTimeout(timer)
  })
  
  return <>{children}</>
}

/**
 * Hook para trackear renders de componentes específicos
 */
export function useRenderTracker(componentName: string, dependencies?: any[]) {
  const renderCount = useRef(0)
  const lastDeps = useRef(dependencies)
  
  renderCount.current++
  
  // Detectar cambios en dependencias
  if (dependencies && lastDeps.current) {
    const changedDeps = dependencies.filter((dep, index) => {
      return dep !== lastDeps.current?.[index]
    })
    
    if (changedDeps.length > 0) {
      console.log(`📊 ${componentName} dependencies changed:`, {
        renderCount: renderCount.current,
        changedDeps,
        allDeps: dependencies
      })
    }
  }
  
  lastDeps.current = dependencies
  
  // Detectar renders excesivos
  if (renderCount.current > 15) {
    console.error(`🚨 EXCESSIVE RENDERS in ${componentName}:`, {
      renderCount: renderCount.current,
      dependencies,
      stackTrace: new Error().stack
    })
  }
  
  useEffect(() => {
    const timer = setTimeout(() => {
      renderCount.current = 0
    }, 2000)
    
    return () => clearTimeout(timer)
  })
  
  return renderCount.current
}

/**
 * Función para limpiar contadores globales
 */
export function clearRenderCounters() {
  renderCounts.clear()
  lastRenderTime.clear()
  console.log('🧹 Render counters cleared')
}

/**
 * Función para obtener estadísticas de renders
 */
export function getRenderStats() {
  const stats = Array.from(renderCounts.entries()).map(([component, count]) => ({
    component,
    count,
    lastRender: lastRenderTime.get(component)
  }))
  
  console.table(stats)
  return stats
}