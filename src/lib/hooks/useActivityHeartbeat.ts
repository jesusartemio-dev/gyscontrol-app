'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

const HEARTBEAT_INTERVAL_MS = 15 * 60 * 1000 // 15 minutos

export function useActivityHeartbeat() {
  const { status } = useSession()
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') return

    const sendHeartbeat = async () => {
      try {
        await fetch('/api/auth/activity-heartbeat', {
          method: 'POST',
          credentials: 'include',
        })
      } catch {
        // Silencioso - no crítico
      }
    }

    sendHeartbeat()

    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL_MS)

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [status])
}
