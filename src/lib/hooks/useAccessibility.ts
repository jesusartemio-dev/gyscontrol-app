'use client'

import { useEffect, useState, useCallback } from 'react'

interface AccessibilityPreferences {
  reducedMotion: boolean
  highContrast: boolean
  largeText: boolean
  screenReader: boolean
}

export function useAccessibility() {
  const [preferences, setPreferences] = useState<AccessibilityPreferences>({
    reducedMotion: false,
    highContrast: false,
    largeText: false,
    screenReader: false
  })

  useEffect(() => {
    // Detect system preferences
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
    const screenReaderQuery = window.matchMedia('(prefers-reduced-transparency: reduce)')

    const updatePreferences = () => {
      setPreferences({
        reducedMotion: mediaQuery.matches,
        highContrast: highContrastQuery.matches,
        largeText: window.devicePixelRatio > 1.5, // Rough detection for high DPI
        screenReader: screenReaderQuery.matches
      })
    }

    updatePreferences()

    // Listen for changes
    mediaQuery.addEventListener('change', updatePreferences)
    highContrastQuery.addEventListener('change', updatePreferences)
    screenReaderQuery.addEventListener('change', updatePreferences)

    return () => {
      mediaQuery.removeEventListener('change', updatePreferences)
      highContrastQuery.removeEventListener('change', updatePreferences)
      screenReaderQuery.removeEventListener('change', updatePreferences)
    }
  }, [])

  return preferences
}

// Hook for managing focus and keyboard navigation
export function useKeyboardNavigation() {
  const [focusedIndex, setFocusedIndex] = useState(-1)

  const handleKeyDown = useCallback((event: KeyboardEvent, items: any[], onSelect?: (item: any) => void) => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault()
        setFocusedIndex(prev => Math.min(prev + 1, items.length - 1))
        break
      case 'ArrowUp':
        event.preventDefault()
        setFocusedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
      case ' ':
        event.preventDefault()
        if (focusedIndex >= 0 && focusedIndex < items.length && onSelect) {
          onSelect(items[focusedIndex])
        }
        break
      case 'Home':
        event.preventDefault()
        setFocusedIndex(0)
        break
      case 'End':
        event.preventDefault()
        setFocusedIndex(items.length - 1)
        break
    }
  }, [focusedIndex])

  return {
    focusedIndex,
    setFocusedIndex,
    handleKeyDown
  }
}

// Hook for managing ARIA live regions
export function useLiveRegion(politeness: 'polite' | 'assertive' = 'polite') {
  const [message, setMessage] = useState('')

  const announce = useCallback((text: string) => {
    setMessage(text)
    // Clear the message after it's been announced
    setTimeout(() => setMessage(''), 1000)
  }, [])

  return {
    message,
    announce,
    liveRegionProps: {
      'aria-live': politeness,
      'aria-atomic': 'true',
      role: 'status'
    }
  }
}

// Hook for skip links
export function useSkipLinks() {
  const skipToContent = useCallback(() => {
    const mainContent = document.querySelector('main, [role="main"]')
    if (mainContent) {
      (mainContent as HTMLElement).focus()
      mainContent.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  const skipToNavigation = useCallback(() => {
    const navigation = document.querySelector('nav, [role="navigation"]')
    if (navigation) {
      (navigation as HTMLElement).focus()
      navigation.scrollIntoView({ behavior: 'smooth' })
    }
  }, [])

  return {
    skipToContent,
    skipToNavigation
  }
}

// Utility functions for accessibility
export const a11y = {
  // Generate unique IDs for form elements
  generateId: (prefix: string = 'a11y') =>
    `${prefix}-${Math.random().toString(36).substr(2, 9)}`,

  // Get appropriate ARIA attributes for form fields
  getFormFieldProps: (id: string, label: string, error?: string, description?: string) => ({
    id,
    'aria-labelledby': `${id}-label`,
    'aria-describedby': [
      description ? `${id}-description` : undefined,
      error ? `${id}-error` : undefined
    ].filter(Boolean).join(' ') || undefined,
    'aria-invalid': !!error
  }),

  // Get appropriate ARIA attributes for buttons
  getButtonProps: (disabled?: boolean, loading?: boolean, expanded?: boolean) => ({
    'aria-disabled': disabled || loading,
    'aria-expanded': expanded,
    'aria-busy': loading
  }),

  // Get appropriate ARIA attributes for modals
  getModalProps: (open: boolean, title: string) => ({
    role: 'dialog',
    'aria-modal': 'true',
    'aria-labelledby': title,
    'aria-hidden': !open
  }),

  // Get appropriate ARIA attributes for tables
  getTableProps: (caption?: string) => ({
    role: 'table',
    'aria-label': caption,
    'aria-rowcount': -1 // Dynamic row count
  }),

  // Screen reader announcements
  announceToScreenReader: (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div')
    announcement.setAttribute('aria-live', priority)
    announcement.setAttribute('aria-atomic', 'true')
    announcement.style.position = 'absolute'
    announcement.style.left = '-10000px'
    announcement.style.width = '1px'
    announcement.style.height = '1px'
    announcement.style.overflow = 'hidden'

    document.body.appendChild(announcement)
    announcement.textContent = message

    setTimeout(() => {
      document.body.removeChild(announcement)
    }, 1000)
  }
}

export default useAccessibility
