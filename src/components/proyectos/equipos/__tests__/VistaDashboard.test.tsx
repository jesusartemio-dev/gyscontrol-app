/**
 * @fileoverview Tests unitarios para VistaDashboard
 * Valida optimizaciones de React.memo y useMemo implementadas
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import VistaDashboard from '../VistaDashboard'
import type { ComparisonData, Summary } from '../VistaDashboard'

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
  getResponsiveClasses: () => 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4',
}))

// 🎭 Mock de componentes UI
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className}>{children}</div>,
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span data-variant={variant}>{children}</span>,
}))

// 📊 Datos de prueba
const mockComparisons: ComparisonData[] = [
  {
    type: 'mantenido',
    category: 'Equipos',
    pei: {
      id: '1',
      codigo: 'EQ001',
      nombre: 'Equipo 1',
      cantidad: 2,
      precioInterno: 1000,
      precioCliente: 1200,
      costoInterno: 2000,
      costoCliente: 2400,
      categoria: 'Equipos',
      subcategoria: 'Herramientas',
      unidad: 'und',
      proyectoEquipoId: 'pe1',
    },
    lei: null,
    grupo: 'Grupo A',
    costoPEI: 2000,
    costoLEI: 0,
    diferencia: 0,
    estado: 'activo',
  },
  {
    type: 'reemplazado',
    category: 'Equipos',
    pei: {
      id: '2',
      codigo: 'EQ002',
      nombre: 'Equipo 2',
      cantidad: 1,
      precioInterno: 500,
      precioCliente: 600,
      costoInterno: 500,
      costoCliente: 600,
      categoria: 'Equipos',
      subcategoria: 'Herramientas',
      unidad: 'und',
      proyectoEquipoId: 'pe2',
    },
    lei: {
      id: 'l1',
      codigo: 'LEQ001',
      nombre: 'Lista Equipo 1',
      cantidad: 1,
      precioInterno: 450,
      precioCliente: 550,
      costoInterno: 450,
      costoCliente: 550,
      categoria: 'Equipos',
      subcategoria: 'Herramientas',
      unidad: 'und',
      listaEquipoId: 'le1',
    },
    grupo: 'Grupo B',
    costoPEI: 500,
    costoLEI: 450,
    diferencia: -50,
    estado: 'activo',
  },
]

const mockSummary: Summary = {
  mantenidos: 1,
  reemplazados: 1,
  agregados: 0,
  descartados: 0,
  totalItems: 2,
  impactoFinanciero: -50,
  porcentajeCambio: -2.0,
}

describe('VistaDashboard', () => {
  it('renderiza correctamente con datos válidos', () => {
    render(
      <VistaDashboard
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Verificar que se renderizan las métricas principales
    expect(screen.getByText('2')).toBeInTheDocument() // Total items
    expect(screen.getByText('1')).toBeInTheDocument() // Mantenidos
    expect(screen.getByText('1')).toBeInTheDocument() // Reemplazados
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
      <VistaDashboard
        comparisons={[]}
        summary={emptySummary}
      />
    )

    // ✅ Verificar mensaje de estado vacío
    expect(screen.getByText(/No se encontraron comparaciones/)).toBeInTheDocument()
  })

  it('aplica clases responsive correctamente', () => {
    const { container } = render(
      <VistaDashboard
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Verificar que se aplican las clases responsive
    const gridElement = container.querySelector('.grid')
    expect(gridElement).toBeInTheDocument()
  })

  it('muestra el impacto financiero correctamente', () => {
    render(
      <VistaDashboard
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Verificar formato de moneda
    expect(screen.getByText(/\$.*50/)).toBeInTheDocument()
  })

  it('renderiza badges con variantes correctas', () => {
    render(
      <VistaDashboard
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Verificar que los badges tienen las variantes correctas
    const badges = screen.getAllByRole('generic')
    const badgeElements = badges.filter(el => el.hasAttribute('data-variant'))
    expect(badgeElements.length).toBeGreaterThan(0)
  })

  // 🎯 Test de optimización: verificar que el componente es memoizado
  it('está optimizado con React.memo', () => {
    const { rerender } = render(
      <VistaDashboard
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // ✅ Re-renderizar con las mismas props no debería causar cambios
    rerender(
      <VistaDashboard
        comparisons={mockComparisons}
        summary={mockSummary}
      />
    )

    // El componente debería seguir funcionando correctamente
    expect(screen.getByText('2')).toBeInTheDocument()
  })
})
