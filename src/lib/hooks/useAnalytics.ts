'use client'

import { useEffect, useCallback } from 'react'

interface AnalyticsEvent {
  event: string
  category: string
  action: string
  label?: string
  value?: number
  metadata?: Record<string, any>
  timestamp: number
  userId?: string
  sessionId: string
  userAgent: string
  url: string
}

interface AnalyticsConfig {
  enabled: boolean
  debug: boolean
  batchSize: number
  flushInterval: number
  endpoint?: string
}

class AnalyticsTracker {
  private static instance: AnalyticsTracker
  private events: AnalyticsEvent[] = []
  private config: AnalyticsConfig
  private sessionId: string
  private flushTimer?: NodeJS.Timeout

  private constructor() {
    this.sessionId = this.generateSessionId()
    this.config = {
      enabled: process.env.NODE_ENV === 'production',
      debug: process.env.NODE_ENV === 'development',
      batchSize: 10,
      flushInterval: 30000, // 30 seconds
      endpoint: '/api/analytics/events'
    }

    this.startFlushTimer()
  }

  static getInstance(): AnalyticsTracker {
    if (!AnalyticsTracker.instance) {
      AnalyticsTracker.instance = new AnalyticsTracker()
    }
    return AnalyticsTracker.instance
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private startFlushTimer() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer)
    }

    this.flushTimer = setInterval(() => {
      this.flush()
    }, this.config.flushInterval)
  }

  track(event: Omit<AnalyticsEvent, 'timestamp' | 'sessionId' | 'userAgent' | 'url'>) {
    if (!this.config.enabled) {
      if (this.config.debug) {
        console.log('📊 Analytics Event (disabled):', event)
      }
      return
    }

    const analyticsEvent: AnalyticsEvent = {
      ...event,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      userAgent: navigator.userAgent,
      url: window.location.href
    }

    this.events.push(analyticsEvent)

    if (this.config.debug) {
      console.log('📊 Analytics Event:', analyticsEvent)
    }

    // Auto-flush if batch size reached
    if (this.events.length >= this.config.batchSize) {
      this.flush()
    }
  }

  private async flush() {
    if (this.events.length === 0 || !this.config.endpoint) return

    const eventsToSend = [...this.events]
    this.events = []

    try {
      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToSend })
      })

      if (!response.ok) {
        console.error('Failed to send analytics events:', response.statusText)
        // Re-queue events for retry
        this.events.unshift(...eventsToSend)
      } else if (this.config.debug) {
        console.log(`📊 Sent ${eventsToSend.length} analytics events`)
      }
    } catch (error) {
      console.error('Error sending analytics events:', error)
      // Re-queue events for retry
      this.events.unshift(...eventsToSend)
    }
  }

  updateConfig(newConfig: Partial<AnalyticsConfig>) {
    this.config = { ...this.config, ...newConfig }

    if (newConfig.flushInterval) {
      this.startFlushTimer()
    }
  }

  getPendingEventsCount(): number {
    return this.events.length
  }

  forceFlush() {
    return this.flush()
  }
}

const analyticsTracker = AnalyticsTracker.getInstance()

// Hook for tracking events
export function useAnalytics() {
  const trackEvent = useCallback((
    event: string,
    category: string,
    action: string,
    options?: {
      label?: string
      value?: number
      metadata?: Record<string, any>
    }
  ) => {
    analyticsTracker.track({
      event,
      category,
      action,
      label: options?.label,
      value: options?.value,
      metadata: options?.metadata
    })
  }, [])

  const trackPageView = useCallback((pageName: string, metadata?: Record<string, any>) => {
    trackEvent('page_view', 'navigation', 'view', {
      label: pageName,
      metadata
    })
  }, [trackEvent])

  const trackUserAction = useCallback((
    action: string,
    category: string = 'user_action',
    metadata?: Record<string, any>
  ) => {
    trackEvent('user_action', category, action, { metadata })
  }, [trackEvent])

  const trackPerformance = useCallback((
    metric: string,
    value: number,
    metadata?: Record<string, any>
  ) => {
    trackEvent('performance', 'metrics', metric, {
      value,
      metadata
    })
  }, [trackEvent])

  const trackError = useCallback((
    error: Error,
    context: string,
    metadata?: Record<string, any>
  ) => {
    trackEvent('error', 'errors', context, {
      label: error.message,
      metadata: {
        ...metadata,
        stack: error.stack,
        name: error.name
      }
    })
  }, [trackEvent])

  return {
    trackEvent,
    trackPageView,
    trackUserAction,
    trackPerformance,
    trackError,
    forceFlush: analyticsTracker.forceFlush.bind(analyticsTracker)
  }
}

// Hook for tracking component interactions
export function useComponentAnalytics(componentName: string) {
  const { trackUserAction, trackPerformance } = useAnalytics()

  const trackInteraction = useCallback((
    action: string,
    metadata?: Record<string, any>
  ) => {
    trackUserAction(action, `component_${componentName}`, {
      component: componentName,
      ...metadata
    })
  }, [trackUserAction, componentName])

  const trackRender = useCallback((
    renderTime: number,
    metadata?: Record<string, any>
  ) => {
    trackPerformance(`render_time_${componentName}`, renderTime, {
      component: componentName,
      ...metadata
    })
  }, [trackPerformance, componentName])

  return {
    trackInteraction,
    trackRender
  }
}

// Predefined tracking functions for common actions
export const AnalyticsEvents = {
  // Quotation management
  QUOTATION_VIEWED: (quotationId: string) =>
    ({ event: 'quotation_viewed', category: 'quotations', action: 'view', label: quotationId }),

  QUOTATION_UPDATED: (quotationId: string, field: string) =>
    ({ event: 'quotation_updated', category: 'quotations', action: 'update', label: `${quotationId}:${field}` }),

  QUOTATION_BULK_UPDATE: (count: number, action: string) =>
    ({ event: 'quotation_bulk_update', category: 'quotations', action, value: count }),

  // Selection process
  WINNER_SELECTED: (itemId: string, winnerId: string) =>
    ({ event: 'winner_selected', category: 'selection', action: 'select', label: `${itemId}:${winnerId}` }),

  SELECTION_CONFIRMED: (totalItems: number, totalSavings: number) =>
    ({ event: 'selection_confirmed', category: 'selection', action: 'confirm', value: totalItems, metadata: { totalSavings } }),

  // Mode switching
  MODE_SWITCHED: (fromMode: string, toMode: string) =>
    ({ event: 'mode_switched', category: 'navigation', action: 'switch', label: `${fromMode}->${toMode}` }),

  // Performance
  SLOW_RENDER: (component: string, renderTime: number) =>
    ({ event: 'slow_render', category: 'performance', action: 'render', label: component, value: renderTime }),

  // Errors
  COMPONENT_ERROR: (component: string, error: string) =>
    ({ event: 'component_error', category: 'errors', action: 'component', label: `${component}:${error}` })
}

export default analyticsTracker
