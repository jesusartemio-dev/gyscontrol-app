'use client'

import { useCallback, useState } from 'react'

export interface Coords {
  latitud: number
  longitud: number
  precision: number
}

export interface GeolocationState {
  coords: Coords | null
  error: string | null
  loading: boolean
  solicitar: () => Promise<Coords | null>
}

export function useGeolocation(): GeolocationState {
  const [coords, setCoords] = useState<Coords | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const solicitar = useCallback((): Promise<Coords | null> => {
    return new Promise(resolve => {
      if (typeof navigator === 'undefined' || !navigator.geolocation) {
        setError('Geolocalización no soportada en este dispositivo')
        resolve(null)
        return
      }
      setLoading(true)
      setError(null)
      navigator.geolocation.getCurrentPosition(
        pos => {
          const c: Coords = {
            latitud: pos.coords.latitude,
            longitud: pos.coords.longitude,
            precision: pos.coords.accuracy,
          }
          setCoords(c)
          setLoading(false)
          resolve(c)
        },
        err => {
          const msg =
            err.code === err.PERMISSION_DENIED
              ? 'Permiso de ubicación denegado. Debe activarlo en el navegador.'
              : err.code === err.TIMEOUT
              ? 'Tiempo de espera agotado obteniendo GPS'
              : 'No se pudo obtener la ubicación'
          setError(msg)
          setLoading(false)
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
      )
    })
  }, [])

  return { coords, error, loading, solicitar }
}
