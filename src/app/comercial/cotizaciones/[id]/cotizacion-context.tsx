'use client'

import { createContext, useContext } from 'react'
import type { Cotizacion } from '@/types'

export interface CotizacionContextType {
  cotizacion: Cotizacion | null
  setCotizacion: (cotizacion: Cotizacion) => void
  refreshCotizacion: () => Promise<void>
  loading: boolean
  isLocked: boolean
}

export const CotizacionContext = createContext<CotizacionContextType | null>(null)

export function useCotizacionContext() {
  const context = useContext(CotizacionContext)
  if (!context) {
    throw new Error('useCotizacionContext must be used within CotizacionLayout')
  }
  return context
}
