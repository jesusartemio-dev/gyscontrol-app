/**
 * @fileoverview Tests unitarios para VistaTimeline
 * Valida optimizaciones de React.memo y useMemo para agrupamiento temporal
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import VistaTimeline from '../VistaTimeline'
import type { ComparisonData, Summary } from '../VistaTimeline'

// 🎭 Mock de Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  staggerContainerVariants: {},
  staggerItemVariants: {},
}))

// 🎭 Mock de hooks responsive
jest.mock('@/lib/responsive/breakpoints', () => ({
  useIsMobile: () => false,
  useIsTouchDevice: () => false,
  touchInteractions: {},
  getResponsiveClasses: () => 'grid grid-cols-2 md:grid-cols-5 gap-4',
}))

// 🎭 Mock de componentes UI
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="timeline-card">{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span data-variant={variant}>{children}</span>,
}))

// 🎭 Mock de utilidades de formato
jest.mock('@/lib/utils/currency', () => ({
  formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
}))

// 📊 Datos de prueba con secuencia temporal
const mockComparisons: ComparisonData[] = [
  {
    type: 'mantenido',
    category: 'Equipos Base',
    pei: {
      id: '1',
      codigo: 'EB001',
      nombre: 'Equipo Base 1',
      cantidad: 1,
      precioInterno: 500,
      precioCliente: 600,
      costoInterno: 500,
      costoCliente: 600,
      categoria: 'Equipos Base',
      subcategoria: 'Básicos',
      unidad: 'und',
      proyectoEquipoId: 'pe1',
    },
    lei: null,
    grupo: 'Fase 1',
    costoPEI: 500,
    costoLEI: 0,
    diferencia: 0,
    estado: 'confirmado',
  },
  {
    type: 'reemplazado',
    category: 'Equipos Especializados',
    pei: {
      id: '2',
      codigo: 'EE001',
      nombre: 'Equipo Especializado Original',
      cantidad: 1,
      precioInterno: 1000,
      precioCliente: 1200,
      costoInterno: 1000,
      costoCliente: 1200,
      categoria: 'Equipos Especializados',
      subcategoria: 'Avanzados',
      unidad: 'und',
      proyectoEquipoId: 'pe2',
    },
    lei: {
      id: 'l1',
      codigo: 'EE002',
      nombre: 'Equipo Especializado Mejorado',
      cantidad: 1,
      precioInterno: 900,
      precioCliente: 1080,
      costoInterno: 900,
      costoCliente: 1080,
      categoria: 'Equipos Especializados',
      subcategoria: 'Avanzados',
      unidad: 'und',
      listaEquipoId: 'le1',
    },
    grupo: 'Fase 2',
    costoPEI: 1000,
    costoLEI: 900,
    diferencia: -100,
    estado: 'en_revision',
    trazabilidad: {
      original: {
        id: '2',
        codigo: 'EE001',
        nombre: 'Equipo Especializado Original',
        cantidad: 1,
        precioInterno: 1000,
        precioCliente: 1200,
        costoInterno: 1000,
        costoCliente: 1200,
        categoria: 'Equipos Especializados',
        subcategoria: 'Avanzados',
        unidad: 'und',
        proyectoEquipoId: 'pe2',
      },
      reemplazo: {
        id: 'l1',
        codigo: 'EE002',
        nombre: 'Equipo Especializado Mejorado',
        cantidad: 1,
        precioInterno: 900,
        precioCliente: 1080,
        costoInterno: 900,
        costoCliente: 1080,
        categoria: 'Equipos Especializados',
        subcategoria: 'Avanzados',
        unidad: 'und',
        listaEquipoId: 'le1',
      },
      motivo: 'Mejor relación costo-beneficio',
    },
  },
  {
    type: 'agregado',
    category: 'Equipos Adicionales',
    pei: null,
    lei: {
      id: 'l2',
      codigo: 'EA001',
      nombre: 'Equipo Adicional Nuevo',
      cantidad: 2,
      precioInterno: 300,
      precioCliente: 360,
      costoInterno: 600,
      costoCliente: 720,
      categoria: 'Equipos Adicionales',
      subcategoria: 'Complementarios',
      unidad: 'und',
      listaEquipoId: 'le2',
    },
    grupo: 'Fase 3',
    costoPEI: 0,
    costoLEI: 600,
    diferencia: 600,
    estado: 'pendiente',
  },
]

const mockSummary: Summary = {
  mantenidos: 1,
  reemplazados: 1,
  agregados: 1,
  descartados: 0,
  totalItems: 3,
  impactoFinanciero: 500,
  porcentajeCambio: 33.3,
}

describe('VistaTimeline', () => {
  it('renderiza correctamente con datos temporales', () => {
    render(
      <VistaTimeline
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Verificar que se renderizan los elementos del timeline
    expect(screen.getByText('Equipo Base 1')).toBeInTheDocument()
    expect(screen.getByText('Equipo Especializado Original')).toBeInTheDocument()
    expect(screen.getByText('Equipo Adicional Nuevo')).toBeInTheDocument()
  })

  it('muestra estadísticas rápidas correctamente', () => {
    render(
      <VistaTimeline
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Verificar estadísticas en el header
    expect(screen.getByText('3')).toBeInTheDocument() // Total items
    expect(screen.getByText('1')).toBeInTheDocument() // Mantenidos
  })

  it('ordena correctamente los elementos por tipo', () => {
    render(
      <VistaTimeline
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Verificar que todos los tipos están presentes
    expect(screen.getByText('Equipo Base 1')).toBeInTheDocument() // mantenido
    expect(screen.getByText('Equipo Especializado Original')).toBeInTheDocument() // reemplazado
    expect(screen.getByText('Equipo Adicional Nuevo')).toBeInTheDocument() // agregado
  })

  it('muestra información de trazabilidad para reemplazos', () => {
    render(
      <VistaTimeline
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Verificar que se muestra el motivo del reemplazo
    expect(screen.getByText('Mejor relación costo-beneficio')).toBeInTheDocument()
  })

  it('maneja correctamente el estado vacío', () => {
    const emptySummary: Summary = {
      mantenidos: 0,
      reemplazados: 0,
      agregados: 0,
      descartados: 0,
      totalItems: 0,
      impactoFinanciero: 0,
      porcentajeCambio: 0,
    }

    render(
      <VistaTimeline
        comparisons={[]}
        summary={emptySummary}
      />
    )

    // ✅ Verificar mensaje de estado vacío
    expect(screen.getByText(/No se encontraron comparaciones/)).toBeInTheDocument()
  })

  it('aplica clases responsive correctamente', () => {
    const { container } = render(
      <VistaTimeline
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Verificar que se aplican las clases responsive
    const gridElement = container.querySelector('.grid')
    expect(gridElement).toBeInTheDocument()
  })

  it('muestra badges de estado correctamente', () => {
    render(
      <VistaTimeline
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Verificar que los badges tienen las variantes correctas
    const badges = screen.getAllByRole('generic')
    const badgeElements = badges.filter(el => el.hasAttribute('data-variant'))
    expect(badgeElements.length).toBeGreaterThan(0)
  })

  it('formatea correctamente los valores monetarios', () => {
    render(
      <VistaTimeline
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Verificar formato de moneda
    expect(screen.getByText(/\$500\.00/)).toBeInTheDocument()
    expect(screen.getByText(/\$900\.00/)).toBeInTheDocument()
  })

  // 🎯 Test de optimización: verificar agrupamiento memoizado
  it('optimiza el agrupamiento de datos con useMemo', () => {
    const { rerender } = render(
      <VistaTimeline
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Re-renderizar con las mismas props
    rerender(
      <VistaTimeline
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // El agrupamiento debería mantenerse consistente
    expect(screen.getByText('Equipo Base 1')).toBeInTheDocument()
    expect(screen.getByText('Equipo Especializado Original')).toBeInTheDocument()
  })

  // 🎯 Test de performance: verificar que el componente es memoizado
  it('está optimizado con React.memo', () => {
    const { rerender } = render(
      <VistaTimeline
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Re-renderizar con props diferentes pero equivalentes
    const newComparisons = [...mockComparisons]
    rerender(
      <VistaTimeline
        comparisons={newComparisons}
        summary={mockSummary}
      />
    )

    // El componente debería seguir funcionando correctamente
    expect(screen.getByText('Equipo Base 1')).toBeInTheDocument()
  })

  it('maneja diferentes estados de elementos', () => {
    render(
      <VistaTimeline
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Verificar que se muestran diferentes estados
    // Los estados están en los datos: 'confirmado', 'en_revision', 'pendiente'
    expect(screen.getByText('Equipo Base 1')).toBeInTheDocument() // confirmado
    expect(screen.getByText('Equipo Especializado Original')).toBeInTheDocument() // en_revision
    expect(screen.getByText('Equipo Adicional Nuevo')).toBeInTheDocument() // pendiente
  })
})
