'use client'

import { useEffect, useRef, useCallback } from 'react'

/**
 * 🔧 Optimized Debug Hooks - Versiones mejoradas que evitan bucles infinitos
 * Estas versiones usan throttling y mejores estrategias de detección
 */

// 📊 Global storage for render statistics
const renderStats = new Map<string, {
  count: number
  lastRenderTime: number
  rapidRenderCount: number
  totalTime: number
  startTime: number
}>()

/**
 * 🎯 Optimized render counter hook with throttling
 * Evita bucles infinitos usando throttling y límites de logging
 */
export function useOptimizedRenderCounter(
  componentName: string, 
  dependencies: any[] = [],
  options: {
    logThreshold?: number
    throttleMs?: number
    maxLogs?: number
  } = {}
) {
  const { logThreshold = 5, throttleMs = 100, maxLogs = 10 } = options
  const renderCount = useRef(0)
  const lastLogTime = useRef(0)
  const logCount = useRef(0)
  const prevDeps = useRef(dependencies)
  
  // 📈 Increment render count
  renderCount.current += 1
  const now = Date.now()
  
  // 🚦 Throttled logging to prevent spam
  const shouldLog = now - lastLogTime.current > throttleMs && logCount.current < maxLogs
  
  if (shouldLog && renderCount.current > logThreshold) {
    // 🔍 Check which dependencies changed
    const changedDeps = dependencies.filter((dep, index) => {
      return dep !== prevDeps.current[index]
    })
    
    if (changedDeps.length > 0) {
      console.log(`🔄 ${componentName} re-rendered (${renderCount.current})`, {
        changedDependencies: changedDeps.map((_, index) => `dep[${index}]`),
        totalDependencies: dependencies.length
      })
      
      lastLogTime.current = now
      logCount.current += 1
    }
  }
  
  // 🔄 Update previous dependencies
  prevDeps.current = dependencies
  
  // 🧹 Reset counters after inactivity
  useEffect(() => {
    const timer = setTimeout(() => {
      renderCount.current = 0
      logCount.current = 0
    }, 5000) // Reset after 5 seconds of inactivity
    
    return () => clearTimeout(timer)
  }, [renderCount.current])
  
  return renderCount.current
}

/**
 * 📊 Optimized render tracker with better performance
 * Usa estrategias más eficientes para evitar bucles infinitos
 */
export function useOptimizedRenderTracker(
  componentName: string, 
  dependencies?: any[],
  options: {
    enableDetailedLogging?: boolean
    maxRenderWarning?: number
    throttleMs?: number
  } = {}
) {
  const { enableDetailedLogging = false, maxRenderWarning = 20, throttleMs = 200 } = options
  const renderCount = useRef(0)
  const lastLogTime = useRef(0)
  const componentStartTime = useRef(Date.now())
  
  renderCount.current += 1
  const now = Date.now()
  
  // 📊 Update global stats efficiently
  const stats = renderStats.get(componentName) || {
    count: 0,
    lastRenderTime: now,
    rapidRenderCount: 0,
    totalTime: 0,
    startTime: now
  }
  
  stats.count += 1
  const timeSinceLastRender = now - stats.lastRenderTime
  stats.totalTime += timeSinceLastRender
  stats.lastRenderTime = now
  
  // 🚨 Detect rapid renders but don't log excessively
  if (timeSinceLastRender < 50) {
    stats.rapidRenderCount += 1
  } else {
    stats.rapidRenderCount = 0
  }
  
  renderStats.set(componentName, stats)
  
  // 🚦 Throttled warning for excessive renders
  if (renderCount.current > maxRenderWarning && now - lastLogTime.current > throttleMs) {
    console.warn(`⚠️ ${componentName} has high render count:`, {
      renderCount: renderCount.current,
      globalCount: stats.count,
      rapidRenderCount: stats.rapidRenderCount,
      averageRenderTime: stats.totalTime / stats.count
    })
    lastLogTime.current = now
  }
  
  // 📝 Detailed logging only when enabled and throttled
  if (enableDetailedLogging && dependencies && now - lastLogTime.current > throttleMs) {
    console.log(`📊 ${componentName} render details:`, {
      renderCount: renderCount.current,
      dependencyCount: dependencies.length,
      timeSinceLastRender
    })
  }
  
  return {
    renderCount: renderCount.current,
    globalStats: stats
  }
}

/**
 * 🎬 Optimized AnimatePresence debug hook
 * Versión más eficiente que no causa bucles infinitos
 */
export function useOptimizedAnimatePresenceDebug(
  componentName: string, 
  items: any[],
  options: {
    logChanges?: boolean
    throttleMs?: number
  } = {}
) {
  const { logChanges = false, throttleMs = 500 } = options
  const renderCount = useRef(0)
  const lastItemCount = useRef(items.length)
  const lastLogTime = useRef(0)
  
  renderCount.current += 1
  const now = Date.now()
  const itemCountChanged = items.length !== lastItemCount.current
  
  // 📝 Log only significant changes and throttled
  if (logChanges && itemCountChanged && now - lastLogTime.current > throttleMs) {
    console.log(`🎬 ${componentName} AnimatePresence change:`, {
      renderCount: renderCount.current,
      previousItemCount: lastItemCount.current,
      currentItemCount: items.length,
      itemsAdded: items.length - lastItemCount.current
    })
    lastLogTime.current = now
  }
  
  lastItemCount.current = items.length
  
  return {
    renderCount: renderCount.current,
    itemCount: items.length,
    itemCountChanged
  }
}

/**
 * 🧹 Utility functions for managing debug stats
 */
export const debugUtils = {
  /**
   * Get current render statistics for all components
   */
  getRenderStats: () => {
    const stats: Record<string, any> = {}
    renderStats.forEach((value, key) => {
      stats[key] = {
        ...value,
        averageRenderTime: value.totalTime / value.count,
        renderRate: value.count / ((Date.now() - value.startTime) / 1000)
      }
    })
    return stats
  },
  
  /**
   * Clear all render statistics
   */
  clearRenderStats: () => {
    renderStats.clear()
    console.log('🧹 Debug render stats cleared')
  },
  
  /**
   * Get components with high render counts
   */
  getHighRenderComponents: (threshold = 50) => {
    const highRenderComponents: string[] = []
    renderStats.forEach((value, key) => {
      if (value.count > threshold) {
        highRenderComponents.push(key)
      }
    })
    return highRenderComponents
  }
}

/**
 * 🎛️ Debug panel data provider
 * Provides optimized data for debug panels
 */
export function useDebugPanelData() {
  const getStats = useCallback(() => {
    return debugUtils.getRenderStats()
  }, [])
  
  const clearStats = useCallback(() => {
    debugUtils.clearRenderStats()
  }, [])
  
  const getHighRenderComponents = useCallback((threshold = 50) => {
    return debugUtils.getHighRenderComponents(threshold)
  }, [])
  
  return {
    getStats,
    clearStats,
    getHighRenderComponents
  }
}
