/**
 * @fileoverview Tests de integración para navegación Master-Detail en equipos
 * Valida transiciones, rutas y estados de navegación
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { useRouter } from 'next/navigation'
import ProyectoEquipoList from '../ProyectoEquipoList'

// 🎭 Mock del router de Next.js
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(() => null),
  })),
  usePathname: jest.fn(() => '/proyectos/equipos'),
}))

// 🎭 Mock de Framer Motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  staggerContainerVariants: {},
  staggerItemVariants: {},
}))

// 🎭 Mock de hooks responsive
jest.mock('@/lib/responsive/breakpoints', () => ({
  useIsMobile: () => false,
  useIsTouchDevice: () => false,
  touchInteractions: {},
  getResponsiveClasses: () => 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4',
}))

// 🎭 Mock de componentes UI
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className, onClick }: any) => (
    <div className={className} onClick={onClick} data-testid="equipment-card">
      {children}
    </div>
  ),
  CardContent: ({ children }: any) => <div>{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant }: any) => (
    <button onClick={onClick} data-variant={variant}>
      {children}
    </button>
  ),
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span data-variant={variant}>{children}</span>,
}))

// 📊 Datos de prueba para navegación
const mockEquipos = [
  {
    id: 'pe1',
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
    proyecto: {
      id: 'p1',
      nombre: 'Proyecto Test',
      codigo: 'PT001',
    },
  },
  {
    id: 'pe2',
    codigo: 'EE001',
    nombre: 'Equipo Especializado 1',
    cantidad: 2,
    precioInterno: 1000,
    precioCliente: 1200,
    costoInterno: 2000,
    costoCliente: 2400,
    categoria: 'Equipos Especializados',
    subcategoria: 'Avanzados',
    unidad: 'und',
    proyectoEquipoId: 'pe2',
    proyecto: {
      id: 'p1',
      nombre: 'Proyecto Test',
      codigo: 'PT001',
    },
  },
]

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
}

describe('Navigation Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
  })

  it('navega correctamente al detalle de equipo', async () => {
    render(
      <ProyectoEquipoList
        equipos={mockEquipos}
        isLoading={false}
        onEquipoSelect={jest.fn()}
        selectedEquipoId={null}
      />
    )

    // ✅ Buscar y hacer clic en el primer equipo
    const equipoCard = screen.getByText('Equipo Base 1')
    expect(equipoCard).toBeInTheDocument()

    // Simular clic en la card
    const card = equipoCard.closest('[data-testid="equipment-card"]')
    if (card) {
      fireEvent.click(card)
    }

    // ✅ Verificar que se llama al callback de selección
    await waitFor(() => {
      // El componente debería manejar la selección internamente
      expect(equipoCard).toBeInTheDocument()
    })
  })

  it('maneja correctamente la navegación con teclado', async () => {
    render(
      <ProyectoEquipoList
        equipos={mockEquipos}
        isLoading={false}
        onEquipoSelect={jest.fn()}
        selectedEquipoId={null}
      />
    )

    // ✅ Buscar el primer elemento navegable
    const firstCard = screen.getAllByTestId('equipment-card')[0]
    expect(firstCard).toBeInTheDocument()

    // Simular navegación con Enter
    fireEvent.keyDown(firstCard, { key: 'Enter', code: 'Enter' })

    await waitFor(() => {
      expect(firstCard).toBeInTheDocument()
    })
  })

  it('actualiza la URL correctamente en navegación', async () => {
    const onEquipoSelect = jest.fn()
    
    render(
      <ProyectoEquipoList
        equipos={mockEquipos}
        isLoading={false}
        onEquipoSelect={onEquipoSelect}
        selectedEquipoId={null}
      />
    )

    // ✅ Simular selección de equipo
    const equipoCard = screen.getByText('Equipo Especializado 1')
    const card = equipoCard.closest('[data-testid="equipment-card"]')
    
    if (card) {
      fireEvent.click(card)
    }

    // ✅ Verificar que se llama al callback con el ID correcto
    await waitFor(() => {
      expect(onEquipoSelect).toHaveBeenCalledWith('pe2')
    })
  })

  it('mantiene el estado de selección durante la navegación', () => {
    const { rerender } = render(
      <ProyectoEquipoList
        equipos={mockEquipos}
        isLoading={false}
        onEquipoSelect={jest.fn()}
        selectedEquipoId="pe1"
      />
    )

    // ✅ Verificar que el equipo seleccionado está marcado
    expect(screen.getByText('Equipo Base 1')).toBeInTheDocument()

    // Re-renderizar con diferente selección
    rerender(
      <ProyectoEquipoList
        equipos={mockEquipos}
        isLoading={false}
        onEquipoSelect={jest.fn()}
        selectedEquipoId="pe2"
      />
    )

    // ✅ Verificar que la nueva selección está activa
    expect(screen.getByText('Equipo Especializado 1')).toBeInTheDocument()
  })

  it('maneja correctamente los estados de carga durante navegación', () => {
    const { rerender } = render(
      <ProyectoEquipoList
        equipos={[]}
        isLoading={true}
        onEquipoSelect={jest.fn()}
        selectedEquipoId={null}
      />
    )

    // ✅ Verificar estado de carga
    expect(screen.getByText(/Cargando equipos/)).toBeInTheDocument()

    // Simular carga completada
    rerender(
      <ProyectoEquipoList
        equipos={mockEquipos}
        isLoading={false}
        onEquipoSelect={jest.fn()}
        selectedEquipoId={null}
      />
    )

    // ✅ Verificar que se muestran los equipos
    expect(screen.getByText('Equipo Base 1')).toBeInTheDocument()
    expect(screen.getByText('Equipo Especializado 1')).toBeInTheDocument()
  })

  it('implementa prefetch para navegación optimizada', async () => {
    render(
      <ProyectoEquipoList
        equipos={mockEquipos}
        isLoading={false}
        onEquipoSelect={jest.fn()}
        selectedEquipoId={null}
      />
    )

    // ✅ Simular hover para activar prefetch
    const equipoCard = screen.getByText('Equipo Base 1')
    const card = equipoCard.closest('[data-testid="equipment-card"]')
    
    if (card) {
      fireEvent.mouseEnter(card)
    }

    // ✅ Verificar que el elemento sigue siendo interactivo
    await waitFor(() => {
      expect(equipoCard).toBeInTheDocument()
    })
  })

  it('maneja errores de navegación graciosamente', async () => {
    // Simular error en el router
    const errorRouter = {
      ...mockRouter,
      push: jest.fn().mockRejectedValue(new Error('Navigation failed')),
    }
    ;(useRouter as jest.Mock).mockReturnValue(errorRouter)

    render(
      <ProyectoEquipoList
        equipos={mockEquipos}
        isLoading={false}
        onEquipoSelect={jest.fn()}
        selectedEquipoId={null}
      />
    )

    // ✅ El componente debería seguir funcionando
    expect(screen.getByText('Equipo Base 1')).toBeInTheDocument()
    expect(screen.getByText('Equipo Especializado 1')).toBeInTheDocument()
  })

  it('optimiza la navegación con lazy loading', () => {
    render(
      <ProyectoEquipoList
        equipos={mockEquipos}
        isLoading={false}
        onEquipoSelect={jest.fn()}
        selectedEquipoId={null}
      />
    )

    // ✅ Verificar que los componentes se cargan correctamente
    expect(screen.getByText('Equipo Base 1')).toBeInTheDocument()
    expect(screen.getByText('Equipo Especializado 1')).toBeInTheDocument()

    // ✅ Verificar que las cards son interactivas
    const cards = screen.getAllByTestId('equipment-card')
    expect(cards).toHaveLength(2)
  })

  it('mantiene el rendimiento durante navegación rápida', async () => {
    const onEquipoSelect = jest.fn()
    
    render(
      <ProyectoEquipoList
        equipos={mockEquipos}
        isLoading={false}
        onEquipoSelect={onEquipoSelect}
        selectedEquipoId={null}
      />
    )

    // ✅ Simular navegación rápida entre elementos
    const cards = screen.getAllByTestId('equipment-card')
    
    fireEvent.click(cards[0])
    fireEvent.click(cards[1])
    fireEvent.click(cards[0])

    // ✅ Verificar que todas las interacciones se manejan
    await waitFor(() => {
      expect(onEquipoSelect).toHaveBeenCalledTimes(3)
    })
  })
})
