'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

export interface QrScannerState {
  scanning: boolean
  error: string | null
  iniciar: (elementId: string) => Promise<void>
  detener: () => Promise<void>
}

export function useQrScanner(onScan: (text: string) => void): QrScannerState {
  const [scanning, setScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const instRef = useRef<Html5Qrcode | null>(null)
  const onScanRef = useRef(onScan)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  const detener = useCallback(async () => {
    const inst = instRef.current
    if (!inst) return
    try {
      await inst.stop()
      await inst.clear()
    } catch {}
    instRef.current = null
    setScanning(false)
  }, [])

  const iniciar = useCallback(async (elementId: string) => {
    setError(null)
    try {
      if (instRef.current) await detener()
      const inst = new Html5Qrcode(elementId)
      instRef.current = inst
      await inst.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 240, height: 240 } },
        text => {
          onScanRef.current(text)
        },
        () => {},
      )
      setScanning(true)
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error al iniciar cámara'
      setError(msg)
      setScanning(false)
    }
  }, [detener])

  useEffect(() => {
    return () => {
      void detener()
    }
  }, [detener])

  return { scanning, error, iniciar, detener }
}
