'use client'

import React, { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'

interface MotionRefDebuggerProps {
  children: React.ReactNode
  componentName: string
  itemId: string
}

/**
 * 🔍 Debug component to track motion.tr ref issues
 * This component wraps motion.tr elements to detect ref-related infinite loops
 */
export const MotionRefDebugger: React.FC<MotionRefDebuggerProps> = ({ 
  children, 
  componentName, 
  itemId 
}) => {
  const refCount = useRef(0)
  const lastRefTime = useRef(Date.now())
  
  useEffect(() => {
    refCount.current += 1
    const now = Date.now()
    const timeDiff = now - lastRefTime.current
    
    // 🚨 Detect rapid ref updates (potential infinite loop)
    if (timeDiff < 100 && refCount.current > 10) {
      console.error(`🚨 INFINITE LOOP DETECTED in ${componentName} for item ${itemId}:`, {
        refCount: refCount.current,
        timeDiff,
        timestamp: new Date().toISOString()
      })
      
      // Log stack trace to identify the source
      console.trace('Stack trace for infinite loop:')
    } else if (refCount.current % 5 === 0) {
      console.log(`🔍 ${componentName} - Ref update #${refCount.current} for item ${itemId}`, {
        timeDiff,
        timestamp: new Date().toISOString()
      })
    }
    
    lastRefTime.current = now
  })
  
  return <>{children}</>
}

export default MotionRefDebugger
