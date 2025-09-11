'use client'

import { useEffect, useRef } from 'react'

/**
 * MotionDebugger - Detecta problemas específicos con framer-motion
 * Enfocado en detectar conflictos de refs y AnimatePresence
 */
interface MotionDebuggerProps {
  componentName: string
  children?: React.ReactNode
}

const motionRenderCounts = new Map<string, number>()
const motionErrors = new Map<string, Error[]>()

export function MotionDebugger({ componentName, children }: MotionDebuggerProps) {
  const renderCount = useRef(0)
  const lastRenderTime = useRef(Date.now())
  
  renderCount.current++
  const currentTime = Date.now()
  const timeDiff = currentTime - lastRenderTime.current
  lastRenderTime.current = currentTime
  
  // Actualizar contador global
  const globalCount = (motionRenderCounts.get(componentName) || 0) + 1
  motionRenderCounts.set(componentName, globalCount)
  
  // Detectar renders rápidos (posible bucle infinito)
  if (renderCount.current > 8 && timeDiff < 50) {
    const error = new Error(`🚨 MOTION INFINITE LOOP: ${componentName} - ${renderCount.current} renders in ${timeDiff}ms`)
    console.error(error.message, {
      component: componentName,
      renderCount: renderCount.current,
      globalCount,
      timeDiff,
      stackTrace: error.stack
    })
    
    // Guardar error para análisis
    const errors = motionErrors.get(componentName) || []
    errors.push(error)
    motionErrors.set(componentName, errors)
    
    // Lanzar error si es muy severo
    if (renderCount.current > 15) {
      throw error
    }
  }
  
  // Log normal para tracking
  if (renderCount.current <= 3 || renderCount.current % 5 === 0) {
    console.log(`🎬 Motion ${componentName} render #${renderCount.current} (${timeDiff}ms)`)
  }
  
  useEffect(() => {
    // Detectar problemas con refs
    const checkForRefIssues = () => {
      try {
        // Buscar elementos motion con problemas
        const motionElements = document.querySelectorAll('[data-framer-name]')
        const duplicateKeys = new Set()
        const elementsWithoutKeys: Element[] = []
        
        motionElements.forEach((element, index) => {
          const key = element.getAttribute('data-key') || element.getAttribute('key')
          if (!key) {
            elementsWithoutKeys.push(element)
          } else if (duplicateKeys.has(key)) {
            console.warn(`🔑 Duplicate motion key detected: ${key}`, element)
          } else {
            duplicateKeys.add(key)
          }
        })
        
        if (elementsWithoutKeys.length > 0) {
          console.warn(`🔑 Motion elements without keys:`, elementsWithoutKeys)
        }
        
      } catch (error) {
        console.error(`🎬 Error checking motion refs:`, error)
      }
    }
    
    // Verificar después de un breve delay
    const timer = setTimeout(checkForRefIssues, 100)
    
    return () => clearTimeout(timer)
  }, [componentName])
  
  useEffect(() => {
    // Reset counter después de un período sin renders
    const resetTimer = setTimeout(() => {
      renderCount.current = 0
    }, 2000)
    
    return () => clearTimeout(resetTimer)
  })
  
  return <>{children}</>
}

/**
 * Hook para detectar problemas específicos con AnimatePresence
 */
export function useAnimatePresenceDebug(componentName: string, items: any[]) {
  const prevItemsRef = useRef(items)
  const renderCount = useRef(0)
  
  renderCount.current++
  
  useEffect(() => {
    const prevItems = prevItemsRef.current
    const currentItems = items
    
    // Detectar cambios en items que podrían causar problemas
    if (prevItems.length !== currentItems.length) {
      console.log(`📋 ${componentName} items changed: ${prevItems.length} → ${currentItems.length}`)
    }
    
    // Verificar keys duplicadas
    const keys = currentItems.map(item => item.id || item.key)
    const duplicateKeys = keys.filter((key, index) => keys.indexOf(key) !== index)
    
    if (duplicateKeys.length > 0) {
      console.error(`🔑 ${componentName} duplicate keys detected:`, duplicateKeys)
    }
    
    // Verificar items sin id
    const itemsWithoutId = currentItems.filter(item => !item.id && !item.key)
    if (itemsWithoutId.length > 0) {
      console.warn(`🔑 ${componentName} items without id:`, itemsWithoutId)
    }
    
    prevItemsRef.current = currentItems
  }, [items, componentName])
  
  // Detectar renders excesivos
  if (renderCount.current > 10) {
    console.error(`🎬 ${componentName} excessive AnimatePresence renders: ${renderCount.current}`)
  }
  
  return renderCount.current
}

/**
 * Función para obtener estadísticas de motion
 */
export function getMotionStats() {
  const stats = {
    renderCounts: Object.fromEntries(motionRenderCounts),
    errors: Object.fromEntries(motionErrors),
    totalErrors: Array.from(motionErrors.values()).reduce((sum, errors) => sum + errors.length, 0)
  }
  
  console.table(stats.renderCounts)
  if (stats.totalErrors > 0) {
    console.error('Motion errors:', stats.errors)
  }
  
  return stats
}

/**
 * Función para limpiar estadísticas
 */
export function clearMotionStats() {
  motionRenderCounts.clear()
  motionErrors.clear()
  console.log('🧹 Motion stats cleared')
}
