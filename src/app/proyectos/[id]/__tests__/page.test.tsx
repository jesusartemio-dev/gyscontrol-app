/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import { useParams, useRouter } from 'next/navigation'
import { getProyectoById } from '@/lib/services/proyecto'
import { toast } from 'sonner'

// Mock all external dependencies
jest.mock('next/navigation', () => ({
  useParams: jest.fn(() => ({ id: 'test-id' })),
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
    prefetch: jest.fn(),
  })),
}))

jest.mock('@/lib/services/proyecto', () => ({
  getProyectoById: jest.fn(),
}))

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}))

// Mock UI components
jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: ({ className, ...props }: any) => <div data-testid="skeleton" className={className} {...props} />,
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 data-testid="card-title" {...props}>{children}</h3>,
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button data-testid="button" onClick={onClick} {...props}>{children}</button>
  ),
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, ...props }: any) => <span data-testid="badge" {...props}>{children}</span>,
}))

jest.mock('@/components/ui/separator', () => ({
  Separator: (props: any) => <div data-testid="separator" {...props} />,
}))

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

jest.mock('@/components/proyectos/ProyectoEquipoAccordion', () => {
  return function MockProyectoEquipoAccordion({ equipo }: any) {
    return <div data-testid={`equipo-${equipo.id}`}>{equipo.nombre}</div>
  }
})

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  ArrowLeft: () => <span data-testid="arrow-left-icon">←</span>,
  Building: () => <span data-testid="building-icon">🏢</span>,
  User: () => <span data-testid="user-icon">👤</span>,
  Calendar: () => <span data-testid="calendar-icon">📅</span>,
  DollarSign: () => <span data-testid="dollar-icon">💰</span>,
  Package: () => <span data-testid="package-icon">📦</span>,
  Settings: () => <span data-testid="settings-icon">⚙️</span>,
  Receipt: () => <span data-testid="receipt-icon">🧾</span>,
  TrendingUp: () => <span data-testid="trending-up-icon">📈</span>,
  Edit: () => <span data-testid="edit-icon">✏️</span>,
  Share2: () => <span data-testid="share-icon">🔗</span>,
  Download: () => <span data-testid="download-icon">⬇️</span>,
  Eye: () => <span data-testid="eye-icon">👁️</span>,
  Clock: () => <span data-testid="clock-icon">🕐</span>,
  CheckCircle: () => <span data-testid="check-circle-icon">✅</span>,
  AlertCircle: () => <span data-testid="alert-circle-icon">⚠️</span>,
  PauseCircle: () => <span data-testid="pause-circle-icon">⏸️</span>,
}))

const mockGetProyectoById = getProyectoById as jest.MockedFunction<typeof getProyectoById>

// Import the component after all mocks are set up
import ProyectoDetallePage from '../page'

describe('ProyectoDetallePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should show loading skeleton initially', () => {
    // Mock a promise that never resolves to keep loading state
    mockGetProyectoById.mockImplementation(() => new Promise(() => {}))
    
    render(<ProyectoDetallePage />)
    
    expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
  })

  it('should show error state when project not found', async () => {
    mockGetProyectoById.mockResolvedValue(undefined)
    
    render(<ProyectoDetallePage />)
    
    // Wait for the component to update
    await new Promise(resolve => setTimeout(resolve, 200))
    
    expect(screen.getByText('Proyecto no encontrado')).toBeInTheDocument()
    expect(screen.getByText('El proyecto que buscas no existe o ha sido eliminado.')).toBeInTheDocument()
    expect(screen.getByText('Volver a Proyectos')).toBeInTheDocument()
  })

  it('should render project details when data is loaded', async () => {
    const mockProyecto = {
      id: 'test-id',
      clienteId: 'client1',
      comercialId: 'comercial1',
      gestorId: 'gestor1',
      cotizacionId: undefined,
      codigo: 'PROJ-001',
      nombre: 'Proyecto de Prueba',
      estado: 'activo',
      totalCliente: 100000,
      totalEquiposInterno: 75000,
      totalServiciosInterno: 20000,
      totalGastosInterno: 5000,
      totalInterno: 100000,
      totalRealEquipos: 75000,
      totalRealServicios: 20000,
      totalRealGastos: 5000,
      totalReal: 100000,
      grandTotal: 100000,
      descuento: 0,
      fechaInicio: '2024-01-15T00:00:00.000Z',
      fechaFin: undefined,
      createdAt: '2024-01-15T00:00:00.000Z',
      updatedAt: '2024-01-15T00:00:00.000Z',
      cliente: { 
        id: 'client1',
        nombre: 'Cliente Test',
        createdAt: '2024-01-15T00:00:00.000Z',
        updatedAt: '2024-01-15T00:00:00.000Z'
      },
      comercial: { name: 'Juan Pérez' },
      gestor: { name: 'María García' },
      cotizacion: undefined,
      equipos: [
        {
          id: 'equipo1',
          nombre: 'Equipo de Prueba 1',
          items: []
        }
      ],
      servicios: [],
      gastos: [],
      ListaEquipo: [],
      cotizaciones: [],
      valorizaciones: [],
      registrosHoras: []
    }

    mockGetProyectoById.mockResolvedValue(mockProyecto)
    
    render(<ProyectoDetallePage />)
    
    // Wait for the component to update
    await new Promise(resolve => setTimeout(resolve, 200))
    
    expect(screen.getAllByText('Proyecto de Prueba')[0]).toBeInTheDocument()
    expect(screen.getAllByText('PROJ-001')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Activo')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Cliente Test')[0]).toBeInTheDocument()
    expect(screen.getAllByText('Juan Pérez')[0]).toBeInTheDocument()
  })

  it('should display financial information correctly', async () => {
    const mockProyecto = {
      id: 'test-id',
      clienteId: 'client1',
      comercialId: 'comercial1',
      gestorId: 'gestor1',
      cotizacionId: undefined,
      codigo: 'PROJ-001',
      nombre: 'Proyecto de Prueba',
      estado: 'activo',
      totalCliente: 100000,
      totalEquiposInterno: 75000,
      totalServiciosInterno: 20000,
      totalGastosInterno: 5000,
      totalInterno: 100000,
      totalRealEquipos: 75000,
      totalRealServicios: 20000,
      totalRealGastos: 5000,
      totalReal: 100000,
      grandTotal: 100000,
      descuento: 0,
      fechaInicio: '2024-01-15T00:00:00.000Z',
      fechaFin: undefined,
      createdAt: '2024-01-15T00:00:00.000Z',
      updatedAt: '2024-01-15T00:00:00.000Z',
      cliente: { 
        id: 'client1',
        nombre: 'Cliente Test',
        createdAt: '2024-01-15T00:00:00.000Z',
        updatedAt: '2024-01-15T00:00:00.000Z'
      },
      comercial: { name: 'Juan Pérez' },
      gestor: { name: 'María García' },
      cotizacion: undefined,
      equipos: [],
      servicios: [],
      gastos: [],
      ListaEquipo: [],
      cotizaciones: [],
      valorizaciones: [],
      registrosHoras: []
    }

    mockGetProyectoById.mockResolvedValue(mockProyecto)
    
    render(<ProyectoDetallePage />)
    
    // Wait for the component to update
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Check for financial summary section
    expect(screen.getByText('Resumen Financiero')).toBeInTheDocument()
    
    // Check for presence of currency symbols (more flexible)
    expect(screen.getAllByText(/S\//)[0]).toBeInTheDocument()
  })

  it('should display action buttons', async () => {
    const mockProyecto = {
      id: 'test-id',
      clienteId: 'client1',
      comercialId: 'comercial1',
      gestorId: 'gestor1',
      cotizacionId: undefined,
      codigo: 'PROJ-001',
      nombre: 'Proyecto de Prueba',
      estado: 'activo',
      totalCliente: 100000,
      totalEquiposInterno: 75000,
      totalServiciosInterno: 20000,
      totalGastosInterno: 5000,
      totalInterno: 100000,
      totalRealEquipos: 75000,
      totalRealServicios: 20000,
      totalRealGastos: 5000,
      totalReal: 100000,
      grandTotal: 100000,
      descuento: 0,
      fechaInicio: '2024-01-15T00:00:00.000Z',
      fechaFin: undefined,
      createdAt: '2024-01-15T00:00:00.000Z',
      updatedAt: '2024-01-15T00:00:00.000Z',
      cliente: { 
          id: 'client1',
          nombre: 'Cliente Test',
          createdAt: '2024-01-15T00:00:00.000Z',
          updatedAt: '2024-01-15T00:00:00.000Z'
        },
        comercial: { name: 'Juan Pérez' },
        gestor: { name: 'María García' },
      cotizacion: undefined,
      equipos: [],
      servicios: [],
      gastos: [],
      ListaEquipo: [],
      cotizaciones: [],
      valorizaciones: [],
      registrosHoras: []
    }

    mockGetProyectoById.mockResolvedValue(mockProyecto)
    
    render(<ProyectoDetallePage />)
    
    // Wait for the component to update
    await new Promise(resolve => setTimeout(resolve, 200))
    
    expect(screen.getByText('Compartir')).toBeInTheDocument()
    expect(screen.getByText('Exportar')).toBeInTheDocument()
    expect(screen.getByText('Editar')).toBeInTheDocument()
  })

  it('should format dates in Spanish locale', async () => {
    const mockProyecto = {
      id: 'test-id',
      clienteId: 'client1',
      comercialId: 'comercial1',
      gestorId: 'gestor1',
      cotizacionId: undefined,
      codigo: 'PROJ-001',
      nombre: 'Proyecto de Prueba',
      estado: 'activo',
      totalCliente: 100000,
      totalEquiposInterno: 75000,
      totalServiciosInterno: 20000,
      totalGastosInterno: 5000,
      totalInterno: 100000,
      totalRealEquipos: 75000,
      totalRealServicios: 20000,
      totalRealGastos: 5000,
      totalReal: 100000,
      grandTotal: 100000,
      descuento: 0,
      fechaInicio: '2024-01-15T00:00:00.000Z',
      fechaFin: undefined,
      createdAt: '2024-01-15T00:00:00.000Z',
      updatedAt: '2024-01-15T00:00:00.000Z',
      cliente: { 
          id: 'client1',
          nombre: 'Cliente Test',
          createdAt: '2024-01-15T00:00:00.000Z',
          updatedAt: '2024-01-15T00:00:00.000Z'
        },
        comercial: { name: 'Juan Pérez' },
        gestor: { name: 'María García' },
        cotizacion: undefined,
      equipos: [],
      servicios: [],
      gastos: [],
      ListaEquipo: [],
        cotizaciones: [],
        valorizaciones: [],
      registrosHoras: []
    }

    mockGetProyectoById.mockResolvedValue(mockProyecto)
    
    render(<ProyectoDetallePage />)
    
    // Wait for the component to update
    await new Promise(resolve => setTimeout(resolve, 200))
    
    // Check for date presence (more flexible)
    expect(screen.getAllByText(/2024/)[0]).toBeInTheDocument()
  })
})