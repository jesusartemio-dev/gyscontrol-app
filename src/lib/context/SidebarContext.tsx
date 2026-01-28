'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

interface SidebarContextType {
  // Mobile state
  isMobileOpen: boolean
  setMobileOpen: (open: boolean) => void
  toggleMobile: () => void

  // Desktop collapsed state
  isCollapsed: boolean
  setCollapsed: (collapsed: boolean) => void
  toggleCollapsed: () => void

  // Responsive detection
  isMobile: boolean
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

const MOBILE_BREAKPOINT = 768 // md breakpoint

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isMobileOpen, setMobileOpen] = useState(false)
  const [isCollapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }

    // Initial check
    checkMobile()

    // Listen for resize
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Close mobile sidebar when navigating (will be triggered by links)
  const closeMobileOnNavigate = useCallback(() => {
    if (isMobile && isMobileOpen) {
      setMobileOpen(false)
    }
  }, [isMobile, isMobileOpen])

  // Close mobile sidebar when switching to desktop
  useEffect(() => {
    if (!isMobile && isMobileOpen) {
      setMobileOpen(false)
    }
  }, [isMobile, isMobileOpen])

  const toggleMobile = useCallback(() => {
    setMobileOpen(prev => !prev)
  }, [])

  const toggleCollapsed = useCallback(() => {
    setCollapsed(prev => !prev)
  }, [])

  return (
    <SidebarContext.Provider
      value={{
        isMobileOpen,
        setMobileOpen,
        toggleMobile,
        isCollapsed,
        setCollapsed,
        toggleCollapsed,
        isMobile,
      }}
    >
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
