// ✅ Hook personalizado para gestionar notificaciones dinámicas del sidebar
// 📡 Integra con APIs para obtener contadores en tiempo real
// 🔁 Actualización automática configurable
// 💾 Preferencias de usuario almacenadas en localStorage

'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
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

// 🎯 Constantes para evitar re-renders
const DEFAULT_COUNTS: NotificationCounts = {
  'cotizaciones-pendientes': 0,
  'proyectos-activos': 0,
  'pedidos-pendientes': 0,
  'listas-por-cotizar': 0,
  'notificaciones-no-leidas': 0,
}

const DEFAULT_PREFERENCES: UserPreferences = {
  enabled: true,
  updateInterval: 30,
  soundEnabled: false
}

export function useNotifications(): UseNotificationsReturn {
  const { data: session } = useSession()
  
  // 📊 Estado del hook - Solo notificaciones de órdenes pendientes
  const [counts, setCounts] = useState<NotificationCounts>(DEFAULT_COUNTS)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const prevCounts = useRef<NotificationCounts>(DEFAULT_COUNTS)
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

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

  // ✅ Función para obtener contadores desde la API
  const refreshCounts = useCallback(async () => {
    if (!session?.user || !preferences.enabled) return

    try {
      setLoading(true)
      setError(null)

      // Llamar ambas APIs en paralelo
      const [response, conteoRes] = await Promise.all([
        fetch('/api/notifications/counts'),
        fetch('/api/notificaciones/conteo'),
      ])

      if (!response.ok) {
        throw new Error('Error al obtener notificaciones')
      }

      const data = await response.json()
      const conteoData = conteoRes.ok ? await conteoRes.json() : { noLeidas: 0 }

      const newCounts: NotificationCounts = {
        'cotizaciones-pendientes': data['cotizaciones-pendientes'] || 0,
        'proyectos-activos': data['proyectos-activos'] || 0,
        'pedidos-pendientes': data['pedidos-pendientes'] || 0,
        'listas-por-cotizar': data['listas-por-cotizar'] || 0,
        'notificaciones-no-leidas': conteoData.noLeidas || 0,
      }

      setCounts(newCounts)
    } catch (err) {
      console.error('Error fetching notification counts:', err)
      setError('Error al obtener notificaciones')
    } finally {
      setLoading(false)
    }
  }, [session?.user?.id, preferences.enabled])

  // 🔁 Efecto para carga inicial - optimizado para evitar bucles infinitos
  useEffect(() => {
    if (session?.user && preferences.enabled) {
      refreshCounts()
    }
  }, [session?.user?.id, preferences.enabled])

  // 🔁 Efecto para actualización automática optimizado
  useEffect(() => {
    // Limpiar intervalo anterior si existe
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (!preferences.enabled || !session?.user) return

    intervalRef.current = setInterval(() => {
      refreshCounts()
    }, preferences.updateInterval * 1000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [preferences.enabled, preferences.updateInterval, session?.user?.id])

  // 🔊 Efecto para detectar nuevas notificaciones y reproducir sonido
  useEffect(() => {
    const totalCount = Object.values(counts).reduce((sum, count) => sum + count, 0)
    const prevTotalCount = Object.values(prevCounts.current).reduce((sum, count) => sum + count, 0)
    
    if (totalCount > prevTotalCount && preferences.soundEnabled && prevTotalCount > 0) {
      playNotificationSound()
    }
    
    prevCounts.current = { ...counts }
  }, [counts, preferences.soundEnabled, playNotificationSound])

  // ✅ Función memoizada para obtener el badge de un tipo específico
  const getBadgeCount = useCallback((type: NotificationBadgeType): number => {
    return counts[type] || 0
  }, [counts])

  // ✅ Función memoizada para verificar si hay notificaciones
  const hasNotifications = useCallback((): boolean => {
    return Object.values(counts).some(count => count > 0)
  }, [counts])

  // 🎯 Valor de retorno memoizado para evitar re-renders
  const returnValue = useMemo(() => ({
    counts,
    preferences,
    loading,
    error,
    updatePreferences,
    refreshCounts,
    getBadgeCount,
    hasNotifications,
  }), [counts, preferences, loading, error, updatePreferences, refreshCounts, getBadgeCount, hasNotifications])

  return returnValue
}

export default useNotifications
