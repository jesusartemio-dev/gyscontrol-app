// ✅ Hook personalizado para gestionar notificaciones dinámicas del sidebar
// 📡 Integra con APIs para obtener contadores en tiempo real
// 🔁 Actualización automática configurable
// 💾 Preferencias de usuario almacenadas en localStorage

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSession } from 'next-auth/react'
import type { NotificationBadgeType } from '@/types/modelos'

// 🎯 Tipos para el hook
type NotificationCounts = Record<NotificationBadgeType, number>

interface UserPreferences {
  enabled: boolean
  updateInterval: number // en segundos
  soundEnabled: boolean
}

interface UseNotificationsReturn {
  counts: NotificationCounts
  loading: boolean
  error: string | null
  preferences: UserPreferences
  updatePreferences: (newPrefs: Partial<UserPreferences>) => void
  refreshCounts: () => Promise<void>
  getBadgeCount: (type: NotificationBadgeType) => number
  hasNotifications: () => boolean
}

export function useNotifications(): UseNotificationsReturn {
  const { data: session } = useSession()
  
  // 📊 Estado del hook
  const [counts, setCounts] = useState<NotificationCounts>({
    'pending-orders': 0,
    'pending-receptions': 0,
    'overdue-payments': 0,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prevCounts = useRef<NotificationCounts>({
    'pending-orders': 0,
    'pending-receptions': 0,
    'overdue-payments': 0,
  })

  // 💾 Gestión de preferencias de usuario
  const getStoredPreferences = (): UserPreferences => {
    if (typeof window === 'undefined') {
      return { enabled: true, updateInterval: 30, soundEnabled: false }
    }
    
    try {
      const stored = localStorage.getItem('gys-notification-preferences')
      if (stored) {
        return { ...{ enabled: true, updateInterval: 30, soundEnabled: false }, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error)
    }
    
    return { enabled: true, updateInterval: 30, soundEnabled: false }
  }

  const [preferences, setPreferences] = useState<UserPreferences>(getStoredPreferences)

  const updatePreferences = useCallback((newPrefs: Partial<UserPreferences>) => {
    setPreferences(prev => {
      const updated = { ...prev, ...newPrefs }
      if (typeof window !== 'undefined') {
        localStorage.setItem('gys-notification-preferences', JSON.stringify(updated))
      }
      
      // 🔊 Reproducir sonido de confirmación si se habilitó el sonido
      if (updated.soundEnabled && !prev.soundEnabled && typeof window !== 'undefined') {
        playNotificationSound()
      }
      
      return updated
    })
  }, [])

  // 🔊 Función para reproducir sonido de notificación
  const playNotificationSound = useCallback(() => {
    if (typeof window !== 'undefined' && preferences.soundEnabled) {
      try {
        // Crear un sonido simple usando Web Audio API
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const oscillator = audioContext.createOscillator()
        const gainNode = audioContext.createGain()
        
        oscillator.connect(gainNode)
        gainNode.connect(audioContext.destination)
        
        oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
        oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1)
        
        gainNode.gain.setValueAtTime(0.1, audioContext.currentTime)
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
        
        oscillator.start(audioContext.currentTime)
        oscillator.stop(audioContext.currentTime + 0.2)
      } catch (error) {
        console.warn('Could not play notification sound:', error)
      }
    }
  }, [preferences.soundEnabled])

  // ✅ Función para obtener contadores desde las APIs
  const refreshCounts = useCallback(async () => {
    if (!session?.user || !preferences.enabled) return

    try {
      setLoading(true)
      setError(null)

      const promises = []
      const role = session.user.role

      // 📡 Órdenes pendientes (solo para roles de logística)
      if (['admin', 'gerente', 'logistico'].includes(role)) {
        promises.push(
          fetch('/api/ordenes-compra?status=pendiente&count=true')
            .then(res => res.json())
            .then(data => ({ type: 'pending-orders', count: data.count || 0 }))
        )
      }

      // 📡 Recepciones pendientes (solo para roles de logística)
      if (['admin', 'gerente', 'logistico'].includes(role)) {
        promises.push(
          fetch('/api/recepciones?status=pendiente&count=true')
            .then(res => res.json())
            .then(data => ({ type: 'pending-receptions', count: data.count || 0 }))
        )
      }

      // 📡 Pagos vencidos (solo para roles de finanzas)
      if (['admin', 'gerente', 'finanzas', 'contabilidad'].includes(role)) {
        promises.push(
          fetch('/api/pagos?status=vencido&count=true')
            .then(res => res.json())
            .then(data => ({ type: 'overdue-payments', count: data.count || 0 }))
        )
      }

      const results = await Promise.all(promises)
      
      // 🔁 Actualizar contadores
      const newCounts = { ...counts }
      results.forEach(result => {
        if (result.type in newCounts) {
          newCounts[result.type as keyof NotificationCounts] = result.count
        }
      })

      setCounts(newCounts)
    } catch (err) {
      console.error('Error fetching notification counts:', err)
      setError('Error al obtener notificaciones')
    } finally {
      setLoading(false)
    }
  }, [session, preferences.enabled])

  // 🔁 Efecto para carga inicial
  useEffect(() => {
    refreshCounts()
  }, [refreshCounts])

  // 🔁 Efecto para actualización automática
  useEffect(() => {
    if (!preferences.enabled) return

    const interval = setInterval(() => {
      refreshCounts()
    }, preferences.updateInterval * 1000)

    return () => clearInterval(interval)
  }, [preferences.enabled, preferences.updateInterval, refreshCounts])

  // 🔊 Efecto para detectar nuevas notificaciones y reproducir sonido
  useEffect(() => {
    const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0)
    const prevTotalCount = Object.values(prevCounts.current).reduce((sum, count) => sum + count, 0)
    
    if (totalCount > prevTotalCount && preferences.soundEnabled && prevTotalCount > 0) {
      playNotificationSound()
    }
    
    prevCounts.current = { ...counts }
  }, [counts, preferences.soundEnabled, playNotificationSound])

  // ✅ Función para obtener el badge de un tipo específico
  const getBadgeCount = (type: NotificationBadgeType): number => {
    return counts[type] || 0
  }

  // ✅ Función para verificar si hay notificaciones
  const hasNotifications = (): boolean => {
    return Object.values(counts).some(count => count > 0)
  }

  return {
    counts,
    preferences,
    loading,
    error,
    updatePreferences,
    refreshCounts,
    getBadgeCount,
    hasNotifications,
  }
}

export default useNotifications