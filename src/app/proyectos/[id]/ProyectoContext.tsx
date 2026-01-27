'use client'

import { createContext, useContext } from 'react'
import type { Proyecto, ProyectoCronograma } from '@/types'

export interface CronogramaStats {
  cronogramas: number
  fases: number
  edts: number
  tareas: number
  activeCronograma: ProyectoCronograma | null
}

export interface ProyectoContextType {
  proyecto: Proyecto | null
  setProyecto: (proyecto: Proyecto) => void
  refreshProyecto: () => Promise<void>
  loading: boolean
  cronogramaStats: CronogramaStats
}

export const ProyectoContext = createContext<ProyectoContextType | null>(null)

export function useProyectoContext() {
  const context = useContext(ProyectoContext)
  if (!context) {
    throw new Error('useProyectoContext must be used within ProyectoLayout')
  }
  return context
}
