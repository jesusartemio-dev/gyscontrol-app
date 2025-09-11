'use client'

/**
 * 🔧 RadixProvider - Configuración global para Radix UI
 * 
 * Este componente configura globalmente Radix UI para prevenir
 * conflictos de aria-hidden y mejorar la accesibilidad.
 */

import React from 'react'
import { useRadixConfig } from '@/lib/radix-config'

interface RadixProviderProps {
  children: React.ReactNode
}

export default function RadixProvider({ children }: RadixProviderProps) {
  // ✅ Configurar Radix UI globalmente
  useRadixConfig()

  return (
    <>
      {children}
    </>
  )
}
