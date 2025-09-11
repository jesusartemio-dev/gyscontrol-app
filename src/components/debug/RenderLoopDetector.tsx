'use client'

import React, { useRef, useEffect } from 'react'

interface RenderLoopDetectorProps {
  componentName: string
  threshold?: number // Number of renders in timeWindow to trigger alert
  timeWindow?: number // Time window in ms
  children: React.ReactNode
}

/**
 * 🔍 RenderLoopDetector - Detects excessive re-renders that could indicate infinite loops
 * 
 * This component tracks render frequency and logs warnings when components
 * render too frequently, which often indicates state update loops.
 */
export default function RenderLoopDetector({ 
  componentName, 
  threshold = 10, 
  timeWindow = 1000, 
  children 
}: RenderLoopDetectorProps) {
  const renderTimesRef = useRef<number[]>([])
  const alertedRef = useRef(false)
  const renderCountRef = useRef(0)

  useEffect(() => {
    const now = Date.now()
    renderCountRef.current += 1
    
    // Add current render time
    renderTimesRef.current.push(now)
    
    // Remove old render times outside the time window
    renderTimesRef.current = renderTimesRef.current.filter(
      time => now - time <= timeWindow
    )
    
    // Check if we've exceeded the threshold
    if (renderTimesRef.current.length >= threshold && !alertedRef.current) {
      console.error(`🚨 RENDER LOOP DETECTED in ${componentName}!`)
      console.error(`📊 Rendered ${renderTimesRef.current.length} times in ${timeWindow}ms`)
      console.error('📍 Component stack:', new Error().stack)
      
      // Log render frequency
      const avgTimeBetweenRenders = timeWindow / renderTimesRef.current.length
      console.error(`⏱️ Average time between renders: ${avgTimeBetweenRenders.toFixed(2)}ms`)
      
      alertedRef.current = true
      
      // Reset alert after some time to catch new loops
      setTimeout(() => {
        alertedRef.current = false
        renderTimesRef.current = []
      }, 5000)
    }
    
    // Log periodic render count for monitoring
    if (renderCountRef.current % 50 === 0) {
      console.warn(`⚠️ ${componentName} has rendered ${renderCountRef.current} times total`)
    }
  })

  return <>{children}</>
}

/**
 * 🎯 Hook version for functional components
 */
export function useRenderLoopDetection(
  componentName: string, 
  threshold: number = 10, 
  timeWindow: number = 1000
) {
  const renderTimesRef = useRef<number[]>([])
  const alertedRef = useRef(false)
  const renderCountRef = useRef(0)

  useEffect(() => {
    const now = Date.now()
    renderCountRef.current += 1
    
    renderTimesRef.current.push(now)
    renderTimesRef.current = renderTimesRef.current.filter(
      time => now - time <= timeWindow
    )
    
    if (renderTimesRef.current.length >= threshold && !alertedRef.current) {
      console.error(`🚨 RENDER LOOP DETECTED in ${componentName}!`)
      console.error(`📊 Rendered ${renderTimesRef.current.length} times in ${timeWindow}ms`)
      console.error('📍 Component stack:', new Error().stack)
      
      alertedRef.current = true
      setTimeout(() => {
        alertedRef.current = false
        renderTimesRef.current = []
      }, 5000)
    }
  })

  return renderCountRef.current
}
