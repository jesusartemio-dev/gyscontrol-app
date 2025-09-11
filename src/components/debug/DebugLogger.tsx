'use client'

import { useEffect, useRef } from 'react'

// 🐛 Debug component to track re-renders and identify infinite loops
export const DebugLogger = ({ componentName, props }: { componentName: string; props?: any }) => {
  const renderCount = useRef(0)
  const lastPropsRef = useRef(props)
  const startTime = useRef(Date.now())
  
  renderCount.current += 1
  
  // 🚨 Detect potential infinite loops
  if (renderCount.current > 50) {
    console.error(`🚨 INFINITE LOOP DETECTED in ${componentName}:`, {
      renderCount: renderCount.current,
      timeElapsed: Date.now() - startTime.current,
      props,
      lastProps: lastPropsRef.current
    })
    
    // Throw error to stop the loop
    throw new Error(`Maximum render count exceeded in ${componentName}: ${renderCount.current} renders`)
  }
  
  // 📊 Log render information
  useEffect(() => {
    console.log(`🔄 ${componentName} rendered:`, {
      count: renderCount.current,
      props,
      propsChanged: JSON.stringify(props) !== JSON.stringify(lastPropsRef.current)
    })
    
    lastPropsRef.current = props
  })
  
  // ⚠️ Warn about excessive renders
  if (renderCount.current > 10 && renderCount.current <= 50) {
    console.warn(`⚠️ Excessive renders in ${componentName}:`, renderCount.current)
  }
  
  return null
}

// 🔍 Hook to track component renders
export const useRenderTracker = (componentName: string, dependencies?: any[]) => {
  const renderCount = useRef(0)
  const lastDepsRef = useRef(dependencies)
  
  renderCount.current += 1
  
  useEffect(() => {
    const depsChanged = dependencies && JSON.stringify(dependencies) !== JSON.stringify(lastDepsRef.current)
    
    console.log(`🔄 ${componentName} useEffect:`, {
      renderCount: renderCount.current,
      dependencies,
      depsChanged
    })
    
    lastDepsRef.current = dependencies
  }, dependencies)
  
  return renderCount.current
}

// 🎯 Component wrapper for debugging
export const withDebugLogger = <P extends object>(Component: React.ComponentType<P>, componentName: string) => {
  return (props: P) => {
    return (
      <>
        <DebugLogger componentName={componentName} props={props} />
        <Component {...props} />
      </>
    )
  }
}
