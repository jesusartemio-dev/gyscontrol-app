'use client'

import { useEffect, useRef } from 'react'

/**
 * 🔍 Debug component to detect infinite re-render loops
 * This component helps identify components that are re-rendering excessively
 */
interface Props {
  componentName: string
  dependencies?: any[]
  threshold?: number
}

export function InfiniteLoopDetector({ componentName, dependencies = [], threshold = 10 }: Props) {
  const renderCount = useRef(0)
  const lastRenderTime = useRef(Date.now())
  const rapidRenderCount = useRef(0)
  
  useEffect(() => {
    renderCount.current += 1
    const now = Date.now()
    const timeSinceLastRender = now - lastRenderTime.current
    
    // 🚨 Detect rapid re-renders (less than 50ms between renders)
    if (timeSinceLastRender < 50) {
      rapidRenderCount.current += 1
      
      if (rapidRenderCount.current > threshold) {
        console.error(`🚨 INFINITE LOOP DETECTED in ${componentName}!`, {
          renderCount: renderCount.current,
          rapidRenderCount: rapidRenderCount.current,
          timeSinceLastRender,
          dependencies,
          stackTrace: new Error().stack
        })
        
        // 🛑 Stop the infinite loop by throwing an error
        throw new Error(`Infinite loop detected in ${componentName}. Check console for details.`)
      }
    } else {
      // Reset rapid render count if enough time has passed
      rapidRenderCount.current = 0
    }
    
    lastRenderTime.current = now
    
    // 📊 Log render statistics every 50 renders
    if (renderCount.current % 50 === 0) {
      console.warn(`⚠️ ${componentName} has rendered ${renderCount.current} times`, {
        dependencies,
        averageRenderTime: timeSinceLastRender
      })
    }
  })
  
  return null
}

/**
 * 🎯 Hook to track component re-renders
 */
export function useRenderCounter(componentName: string, dependencies: any[] = []) {
  const renderCount = useRef(0)
  const prevDeps = useRef(dependencies)
  
  useEffect(() => {
    renderCount.current += 1
    
    // 🔍 Check which dependencies changed
    const changedDeps = dependencies.filter((dep, index) => {
      return dep !== prevDeps.current[index]
    })
    
    if (changedDeps.length > 0) {
      console.log(`🔄 ${componentName} re-rendered (${renderCount.current})`, {
        changedDependencies: changedDeps,
        allDependencies: dependencies
      })
    }
    
    prevDeps.current = dependencies
  })
  
  return renderCount.current
}
