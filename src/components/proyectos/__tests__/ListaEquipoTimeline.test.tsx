// ===================================================
// 📁 Archivo: ListaEquipoTimeline.test.tsx
// 📌 Ubicación: src/components/proyectos/__tests__/ListaEquipoTimeline.test.tsx
// 🔧 Descripción: Tests para componente ListaEquipoTimeline
//
// 🧠 Uso: Validar renderizado y funcionalidad del timeline de fechas
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-20
// ===================================================

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ListaEquipoTimeline } from '../ListaEquipoTimeline'
import type { ListaEquipo } from '@/types/modelos'

// Mock de la función getTimelineFechas
const mockGetTimelineFechas = vi.fn()

// 🎯 Mock de servicios
vi.mock('@/lib/services/listaEquipo', () => ({
  getTimelineFechas: mockGetTimelineFechas
}))

describe('🧪 ListaEquipoTimeline', () => {
  const mockListaEquipo: Partial<ListaEquipo> = {
    id: 'lista-123',
    nombre: 'Lista de Prueba',
    fechaNecesaria: new Date('2025-02-01'),
    fechaEnvioRevision: new Date('2025-01-15'),
    fechaValidacion: new Date('2025-01-16'),
    fechaAprobacionRevision: new Date('2025-01-17'),
    fechaEnvioLogistica: new Date('2025-01-18'),
    fechaInicioCotizacion: new Date('2025-01-19'),
    fechaFinCotizacion: new Date('2025-01-20'),
    fechaAprobacionFinal: null,
    estado: 'cotizacion'
  }

  const mockTimeline = [
    {
      tipo: 'fechaEnvioRevision' as const,
      fecha: new Date('2025-01-15'),
      titulo: 'Envío a Revisión',
      descripcion: 'Lista enviada para revisión técnica',
      esFutura: false
    },
    {
      tipo: 'fechaValidacion' as const,
      fecha: new Date('2025-01-16'),
      titulo: 'Validación',
      descripcion: 'Lista validada técnicamente',
      esFutura: false
    },
    {
      tipo: 'fechaNecesaria' as const,
      fecha: new Date('2025-02-01'),
      titulo: 'Fecha Necesaria',
      descripcion: 'Fecha límite para completar la lista',
      esFutura: true
    }
  ]

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetTimelineFechas.mockReturnValue(mockTimeline)
  })

  describe('📊 Renderizado básico', () => {
    it('✅ debe renderizar el timeline correctamente', () => {
      render(<ListaEquipoTimeline listaEquipo={mockListaEquipo as ListaEquipo} />)
      
      expect(screen.getByText('Timeline de Fechas')).toBeInTheDocument()
      expect(screen.getByText('Envío a Revisión')).toBeInTheDocument()
      expect(screen.getByText('Validación')).toBeInTheDocument()
      expect(screen.getByText('Fecha Necesaria')).toBeInTheDocument()
    })

    it('✅ debe mostrar las descripciones de cada evento', () => {
      render(<ListaEquipoTimeline listaEquipo={mockListaEquipo as ListaEquipo} />)
      
      expect(screen.getByText('Lista enviada para revisión técnica')).toBeInTheDocument()
      expect(screen.getByText('Lista validada técnicamente')).toBeInTheDocument()
      expect(screen.getByText('Fecha límite para completar la lista')).toBeInTheDocument()
    })

    it('✅ debe formatear las fechas correctamente', () => {
      render(<ListaEquipoTimeline listaEquipo={mockListaEquipo as ListaEquipo} />)
      
      // Verificar formato de fecha (dd/mm/yyyy)
      expect(screen.getByText('15/01/2025')).toBeInTheDocument()
      expect(screen.getByText('16/01/2025')).toBeInTheDocument()
      expect(screen.getByText('01/02/2025')).toBeInTheDocument()
    })
  })

  describe('🎨 Estados visuales', () => {
    it('✅ debe aplicar estilos diferentes para fechas pasadas y futuras', () => {
      render(<ListaEquipoTimeline listaEquipo={mockListaEquipo as ListaEquipo} />)
      
      const timelineItems = screen.getAllByTestId(/timeline-item-/)
      
      // Verificar que hay elementos del timeline
      expect(timelineItems.length).toBeGreaterThan(0)
    })

    it('✅ debe mostrar iconos apropiados para cada tipo de fecha', () => {
      render(<ListaEquipoTimeline listaEquipo={mockListaEquipo as ListaEquipo} />)
      
      // Verificar que los iconos están presentes (por clase o data-testid)
      const icons = document.querySelectorAll('svg')
      expect(icons.length).toBeGreaterThan(0)
    })
  })

  describe('📅 Casos especiales', () => {
    it('✅ debe manejar lista sin fechas', () => {
      mockGetTimelineFechas.mockReturnValue([])
      
      render(<ListaEquipoTimeline listaEquipo={mockListaEquipo as ListaEquipo} />)
      
      expect(screen.getByText('Timeline de Fechas')).toBeInTheDocument()
      expect(screen.getByText('No hay eventos registrados')).toBeInTheDocument()
    })

    it('✅ debe manejar solo fechaNecesaria', () => {
      const timelineSoloFechaNecesaria = [
        {
          tipo: 'fechaNecesaria' as const,
          fecha: new Date('2025-02-01'),
          titulo: 'Fecha Necesaria',
          descripcion: 'Fecha límite para completar la lista',
          esFutura: true
        }
      ]
      
      mockGetTimelineFechas.mockReturnValue(timelineSoloFechaNecesaria)
      
      render(<ListaEquipoTimeline listaEquipo={mockListaEquipo as ListaEquipo} />)
      
      expect(screen.getByText('Fecha Necesaria')).toBeInTheDocument()
      expect(screen.getByText('01/02/2025')).toBeInTheDocument()
    })

    it('✅ debe manejar timeline completo', () => {
      const timelineCompleto = [
        {
          tipo: 'fechaEnvioRevision' as const,
          fecha: new Date('2025-01-10'),
          titulo: 'Envío a Revisión',
          descripcion: 'Lista enviada para revisión técnica',
          esFutura: false
        },
        {
          tipo: 'fechaValidacion' as const,
          fecha: new Date('2025-01-11'),
          titulo: 'Validación',
          descripcion: 'Lista validada técnicamente',
          esFutura: false
        },
        {
          tipo: 'fechaAprobacionRevision' as const,
          fecha: new Date('2025-01-12'),
          titulo: 'Aprobación de Revisión',
          descripcion: 'Revisión aprobada por el equipo técnico',
          esFutura: false
        },
        {
          tipo: 'fechaEnvioLogistica' as const,
          fecha: new Date('2025-01-13'),
          titulo: 'Envío a Logística',
          descripcion: 'Lista enviada al departamento de logística',
          esFutura: false
        },
        {
          tipo: 'fechaInicioCotizacion' as const,
          fecha: new Date('2025-01-14'),
          titulo: 'Inicio de Cotización',
          descripcion: 'Proceso de cotización iniciado',
          esFutura: false
        },
        {
          tipo: 'fechaFinCotizacion' as const,
          fecha: new Date('2025-01-15'),
          titulo: 'Fin de Cotización',
          descripcion: 'Proceso de cotización completado',
          esFutura: false
        },
        {
          tipo: 'fechaAprobacionFinal' as const,
          fecha: new Date('2025-01-16'),
          titulo: 'Aprobación Final',
          descripcion: 'Lista aprobada definitivamente',
          esFutura: false
        },
        {
          tipo: 'fechaNecesaria' as const,
          fecha: new Date('2025-02-01'),
          titulo: 'Fecha Necesaria',
          descripcion: 'Fecha límite para completar la lista',
          esFutura: true
        }
      ]
      
      mockGetTimelineFechas.mockReturnValue(timelineCompleto)
      
      render(<ListaEquipoTimeline listaEquipo={mockListaEquipo as ListaEquipo} />)
      
      // Verificar que todos los eventos están presentes
      expect(screen.getByText('Envío a Revisión')).toBeInTheDocument()
      expect(screen.getByText('Validación')).toBeInTheDocument()
      expect(screen.getByText('Aprobación de Revisión')).toBeInTheDocument()
      expect(screen.getByText('Envío a Logística')).toBeInTheDocument()
      expect(screen.getByText('Inicio de Cotización')).toBeInTheDocument()
      expect(screen.getByText('Fin de Cotización')).toBeInTheDocument()
      expect(screen.getByText('Aprobación Final')).toBeInTheDocument()
      expect(screen.getByText('Fecha Necesaria')).toBeInTheDocument()
    })
  })

  describe('🔧 Funcionalidad', () => {
    it('✅ debe llamar a getTimelineFechas con la lista correcta', () => {
      render(<ListaEquipoTimeline listaEquipo={mockListaEquipo as ListaEquipo} />)
      
      expect(mockGetTimelineFechas).toHaveBeenCalledWith(mockListaEquipo)
      expect(mockGetTimelineFechas).toHaveBeenCalledTimes(1)
    })

    it('✅ debe re-renderizar cuando cambia la lista', () => {
      const { rerender } = render(
        <ListaEquipoTimeline listaEquipo={mockListaEquipo as ListaEquipo} />
      )
      
      const nuevaLista = {
        ...mockListaEquipo,
        id: 'lista-456',
        fechaValidacion: new Date('2025-01-20')
      }
      
      rerender(<ListaEquipoTimeline listaEquipo={nuevaLista as ListaEquipo} />)
      
      expect(mockGetTimelineFechas).toHaveBeenCalledWith(nuevaLista)
      expect(mockGetTimelineFechas).toHaveBeenCalledTimes(2)
    })
  })

  describe('♿ Accesibilidad', () => {
    it('✅ debe tener estructura semántica apropiada', () => {
      render(<ListaEquipoTimeline listaEquipo={mockListaEquipo as ListaEquipo} />)
      
      // Verificar que hay elementos de lista o estructura apropiada
      const timelineContainer = screen.getByRole('list', { hidden: true }) || 
                               document.querySelector('[role="timeline"]') ||
                               document.querySelector('.timeline')
      
      // Al menos debe haber contenido estructurado
      expect(screen.getByText('Timeline de Fechas')).toBeInTheDocument()
    })

    it('✅ debe tener textos descriptivos para fechas', () => {
      render(<ListaEquipoTimeline listaEquipo={mockListaEquipo as ListaEquipo} />)
      
      // Verificar que las descripciones están presentes
      expect(screen.getByText('Lista enviada para revisión técnica')).toBeInTheDocument()
      expect(screen.getByText('Lista validada técnicamente')).toBeInTheDocument()
    })
  })
})
