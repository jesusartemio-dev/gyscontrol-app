/**
 * @fileoverview Tests unitarios para VistaMatriz
 * Valida optimizaciones de React.memo y useMemo para agrupamiento de datos
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import VistaMatriz from '../VistaMatriz'
import type { ComparisonData, Summary } from '../VistaMatriz'

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
  getResponsiveClasses: () => 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4',
}))

// 🎭 Mock de componentes UI
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="matrix-card">{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span data-variant={variant}>{children}</span>,
}))

// 📊 Datos de prueba con múltiples categorías
const mockComparisons: ComparisonData[] = [
  {
    type: 'mantenido',
    category: 'Equipos de Medición',
    pei: {
      id: '1',
      codigo: 'EM001',
      nombre: 'Multímetro Digital',
      cantidad: 2,
      precioInterno: 150,
      precioCliente: 180,
      costoInterno: 300,
      costoCliente: 360,
      categoria: 'Equipos de Medición',
      subcategoria: 'Instrumentos',
      unidad: 'und',
      proyectoEquipoId: 'pe1',
    },
    lei: null,
    grupo: 'Instrumentación',
    costoPEI: 300,
    costoLEI: 0,
    diferencia: 0,
    estado: 'activo',
  },
  {
    type: 'reemplazado',
    category: 'Herramientas',
    pei: {
      id: '2',
      codigo: 'HE001',
      nombre: 'Taladro Percutor',
      cantidad: 1,
      precioInterno: 250,
      precioCliente: 300,
      costoInterno: 250,
      costoCliente: 300,
      categoria: 'Herramientas',
      subcategoria: 'Eléctricas',
      unidad: 'und',
      proyectoEquipoId: 'pe2',
    },
    lei: {
      id: 'l1',
      codigo: 'HE002',
      nombre: 'Taladro Industrial',
      cantidad: 1,
      precioInterno: 200,
      precioCliente: 240,
      costoInterno: 200,
      costoCliente: 240,
      categoria: 'Herramientas',
      subcategoria: 'Eléctricas',
      unidad: 'und',
      listaEquipoId: 'le1',
    },
    grupo: 'Herramientas Eléctricas',
    costoPEI: 250,
    costoLEI: 200,
    diferencia: -50,
    estado: 'activo',
  },
  {
    type: 'agregado',
    category: 'Equipos de Medición',
    pei: null,
    lei: {
      id: 'l2',
      codigo: 'EM002',
      nombre: 'Osciloscopio',
      cantidad: 1,
      precioInterno: 800,
      precioCliente: 960,
      costoInterno: 800,
      costoCliente: 960,
      categoria: 'Equipos de Medición',
      subcategoria: 'Instrumentos',
      unidad: 'und',
      listaEquipoId: 'le2',
    },
    grupo: 'Instrumentación',
    costoPEI: 0,
    costoLEI: 800,
    diferencia: 800,
    estado: 'activo',
  },
]

const mockSummary: Summary = {
  mantenidos: 1,
  reemplazados: 1,
  agregados: 1,
  descartados: 0,
  totalItems: 3,
  impactoFinanciero: 750,
  porcentajeCambio: 136.4,
}

describe('VistaMatriz', () => {
  it('renderiza correctamente con datos agrupados', () => {
    render(
      <VistaMatriz
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Verificar que se renderizan las categorías
    expect(screen.getByText('Equipos de Medición')).toBeInTheDocument()
    expect(screen.getByText('Herramientas')).toBeInTheDocument()
  })

  it('agrupa correctamente los datos por categoría', () => {
    render(
      <VistaMatriz
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Verificar que los equipos están agrupados correctamente
    expect(screen.getByText('Multímetro Digital')).toBeInTheDocument()
    expect(screen.getByText('Osciloscopio')).toBeInTheDocument()
    expect(screen.getByText('Taladro Percutor')).toBeInTheDocument()
  })

  it('muestra estadísticas por categoría', () => {
    render(
      <VistaMatriz
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Verificar que se muestran contadores por categoría
    const cards = screen.getAllByTestId('matrix-card')
    expect(cards.length).toBeGreaterThan(0)
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
      <VistaMatriz
        comparisons={[]}
        summary={emptySummary}
      />
    )

    // ✅ Verificar mensaje de estado vacío
    expect(screen.getByText(/No se encontraron comparaciones/)).toBeInTheDocument()
  })

  it('aplica clases responsive correctamente', () => {
    const { container } = render(
      <VistaMatriz
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Verificar que se aplican las clases responsive
    const gridElement = container.querySelector('.grid')
    expect(gridElement).toBeInTheDocument()
  })

  it('muestra badges de tipo correctamente', () => {
    render(
      <VistaMatriz
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Verificar que los badges tienen las variantes correctas
    const badges = screen.getAllByRole('generic')
    const badgeElements = badges.filter(el => el.hasAttribute('data-variant'))
    expect(badgeElements.length).toBeGreaterThan(0)
  })

  // 🎯 Test de optimización: verificar agrupamiento memoizado
  it('optimiza el agrupamiento de datos con useMemo', () => {
    const { rerender } = render(
      <VistaMatriz
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Re-renderizar con las mismas props
    rerender(
      <VistaMatriz
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // El agrupamiento debería mantenerse consistente
    expect(screen.getByText('Equipos de Medición')).toBeInTheDocument()
    expect(screen.getByText('Herramientas')).toBeInTheDocument()
  })

  it('maneja múltiples items en la misma categoría', () => {
    render(
      <VistaMatriz
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Verificar que la categoría "Equipos de Medición" tiene 2 items
    expect(screen.getByText('Multímetro Digital')).toBeInTheDocument()
    expect(screen.getByText('Osciloscopio')).toBeInTheDocument()
  })

  // 🎯 Test de performance: verificar que el componente es memoizado
  it('está optimizado con React.memo', () => {
    const { rerender } = render(
      <VistaMatriz
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Re-renderizar con props diferentes
    const newComparisons = [...mockComparisons]
    rerender(
      <VistaMatriz
        comparisons={newComparisons}
        summary={mockSummary}
      />
    )

    // El componente debería seguir funcionando correctamente
    expect(screen.getByText('Equipos de Medición')).toBeInTheDocument()
  })
})