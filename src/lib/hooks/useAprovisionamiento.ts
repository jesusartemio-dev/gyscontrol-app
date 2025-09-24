// ===================================================
// 📁 Archivo: useAprovisionamiento.ts
// 📌 Ubicación: src/lib/hooks/
// 🔧 Descripción: Hook personalizado para gestión de aprovisionamiento
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-09-24
// ===================================================

import { useState, useEffect } from 'react'

export interface Proyecto {
  id: string
  nombre: string
  estado: string
  cliente: string
  fechaInicio: string
  fechaFin?: string
}

export interface ListaEquipo {
  id: string
  nombre: string
  estado: string
  proyectoId: string
  itemsCount: number
}

export interface AprovisionamientoState {
  proyectos: Proyecto[]
  listas: ListaEquipo[]
  loading: boolean
  error: string | null
}

export function useAprovisionamiento() {
  const [state, setState] = useState<AprovisionamientoState>({
    proyectos: [],
    listas: [],
    loading: true,
    error: null
  })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setState(prev => ({ ...prev, loading: true, error: null }))

      // Mock data for testing
      const mockProyectos: Proyecto[] = [
        {
          id: '1',
          nombre: 'Proyecto Alpha',
          estado: 'en_ejecucion',
          cliente: 'Cliente A',
          fechaInicio: '2025-01-01',
          fechaFin: '2025-06-01'
        },
        {
          id: '2',
          nombre: 'Proyecto Beta',
          estado: 'planificado',
          cliente: 'Cliente B',
          fechaInicio: '2025-02-01'
        }
      ]

      const mockListas: ListaEquipo[] = [
        {
          id: '1',
          nombre: 'Lista Equipos Alpha',
          estado: 'aprobada',
          proyectoId: '1',
          itemsCount: 15
        },
        {
          id: '2',
          nombre: 'Lista Equipos Beta',
          estado: 'borrador',
          proyectoId: '2',
          itemsCount: 8
        }
      ]

      setState({
        proyectos: mockProyectos,
        listas: mockListas,
        loading: false,
        error: null
      })
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }))
    }
  }

  const refresh = () => {
    loadData()
  }

  return {
    ...state,
    refresh
  }
}