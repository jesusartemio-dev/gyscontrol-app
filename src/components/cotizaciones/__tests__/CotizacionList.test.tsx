/**
 * @jest-environment jsdom
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import type { Cotizacion } from '@/types'

// 🧪 Mock all external dependencies to avoid CSS issues
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div data-testid="motion-div" {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => <div data-testid="animate-presence">{children}</div>,
}))

vi.mock('next/link', () => ({
  default: ({ children, href, ...props }: any) => (
    <a href={href} data-testid="next-link" {...props}>
      {children}
    </a>
  ),
}))

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}))

vi.mock('@/lib/services/cotizacion', () => ({
  updateCotizacion: vi.fn(),
  deleteCotizacion: vi.fn(),
}))

// Mock UI components to avoid CSS dependencies
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, asChild, ...props }: any) => 
    asChild ? children : <button data-testid="ui-button" {...props}>{children}</button>
}))

vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, ...props }: any) => (
    <span data-testid="ui-badge" data-variant={variant} {...props}>{children}</span>
  )
}))

vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="ui-card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 data-testid="card-title" {...props}>{children}</h3>,
}))

vi.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: any) => <div data-testid="skeleton" {...props} />
}))

vi.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant, ...props }: any) => (
    <div data-testid="alert" data-variant={variant} {...props}>{children}</div>
  ),
  AlertDescription: ({ children, ...props }: any) => (
    <div data-testid="alert-description" {...props}>{children}</div>
  )
}))

// Mock Lucide icons
vi.mock('lucide-react', () => ({
  Eye: () => <span data-testid="eye-icon">👁</span>,
  Trash2: () => <span data-testid="trash-icon">🗑</span>,
  Edit3: () => <span data-testid="edit-icon">✏️</span>,
  DollarSign: () => <span data-testid="dollar-icon">💲</span>,
  User: () => <span data-testid="user-icon">👤</span>,
  Calendar: () => <span data-testid="calendar-icon">📅</span>,
  FileText: () => <span data-testid="file-icon">📄</span>,
  Loader2: () => <span data-testid="loader-icon">⏳</span>,
  AlertCircle: () => <span data-testid="alert-icon">⚠️</span>,
  Package: () => <span data-testid="package-icon">📦</span>,
}))

// Import component after mocks
import CotizacionList from '../CotizacionList'

// 📊 Mock data
const mockCotizaciones: Cotizacion[] = [
  {
    id: '1',
    nombre: 'Cotización Test 1',
    estado: 'activo',
    etapa: 'inicial',
    prioridad: 'alta',
    probabilidad: 80,
    fechaEnvio: null,
    fechaCierreEstimada: null,
    notas: null,
    totalEquiposInterno: 8000,
    totalEquiposCliente: 10000,
    totalServiciosInterno: 3000,
    totalServiciosCliente: 4000,
    totalGastosInterno: 1000,
    totalGastosCliente: 1000,
    totalInterno: 12000,
    totalCliente: 15000,
    descuento: 0,
    grandTotal: 15000,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    cliente: {
      id: 'client-1',
      nombre: 'Cliente Test',
      ruc: '12345678901',
      direccion: 'Test Address',
      correo: 'test@client.com'
    },
    comercial: {
      id: 'comercial-1',
      nombre: 'Comercial Test'
    },
    plantilla: {
      id: 'plantilla-1',
      nombre: 'Plantilla Test'
    },
    equipos: [],
    servicios: [],
    gastos: []
  },
  {
    id: '2',
    nombre: 'Cotización Test 2',
    estado: 'completado',
    etapa: 'final',
    prioridad: 'media',
    probabilidad: 90,
    fechaEnvio: null,
    fechaCierreEstimada: null,
    notas: null,
    totalEquiposInterno: 5000,
    totalEquiposCliente: 6000,
    totalServiciosInterno: 1500,
    totalServiciosCliente: 1800,
    totalGastosInterno: 500,
    totalGastosCliente: 200,
    totalInterno: 7000,
    totalCliente: 8000,
    descuento: 0,
    grandTotal: 8000,
    createdAt: '2024-01-10T10:00:00Z',
    updatedAt: '2024-01-10T10:00:00Z',
    cliente: null,
    comercial: null,
    plantilla: null,
    equipos: [],
    servicios: [],
    gastos: []
  }
]

const defaultProps = {
  cotizaciones: mockCotizaciones,
  onDelete: vi.fn(),
  onUpdated: vi.fn(),
  loading: false
}

describe('CotizacionList UX/UI Improvements', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ✅ Basic structure and modern components
  describe('Modern UI Components', () => {
    it('renders with modern card-based layout', () => {
      render(<CotizacionList {...defaultProps} />)
      
      // Should use Card components instead of table
      expect(screen.getAllByTestId('ui-card')).toHaveLength(2)
      expect(screen.getAllByTestId('card-header')).toHaveLength(2)
      expect(screen.getAllByTestId('card-content')).toHaveLength(2)
      
      // Should not have old table structure
      expect(screen.queryByRole('table')).not.toBeInTheDocument()
    })

    it('uses modern badges for status display', () => {
      render(<CotizacionList {...defaultProps} />)
      
      const badges = screen.getAllByTestId('ui-badge')
      expect(badges).toHaveLength(2)
      
      // Check badge variants are applied
      expect(badges[0]).toHaveAttribute('data-variant', 'default') // activo
      expect(badges[1]).toHaveAttribute('data-variant', 'secondary') // completado
    })

    it('displays modern iconography', () => {
      render(<CotizacionList {...defaultProps} />)
      
      // Check for various icons
      expect(screen.getAllByTestId('user-icon')).toHaveLength(2)
      expect(screen.getAllByTestId('calendar-icon')).toHaveLength(2)
      expect(screen.getAllByTestId('dollar-icon')).toHaveLength(8) // 4 per cotización
      expect(screen.getAllByTestId('package-icon')).toHaveLength(3) // 2 for margin + 1 for empty state button
      expect(screen.getAllByTestId('eye-icon')).toHaveLength(2)
      expect(screen.getAllByTestId('trash-icon')).toHaveLength(2)
    })
  })

  // 🔁 Enhanced loading states
  describe('Enhanced Loading States', () => {
    it('shows skeleton loaders when loading', () => {
      render(<CotizacionList {...defaultProps} loading={true} />)
      
      // Should show skeleton components
      expect(screen.getAllByTestId('skeleton')).toHaveLength(15) // 3 cards × 5 skeletons each
      
      // Should not show actual content
      expect(screen.queryByText('Cotización Test 1')).not.toBeInTheDocument()
    })

    it('shows loading indicators for individual actions', async () => {
      const { updateCotizacion } = await import('@/lib/services/cotizacion')
      vi.mocked(updateCotizacion).mockImplementation(() => new Promise(() => {}))
      
      render(<CotizacionList {...defaultProps} />)
      
      const editableTitle = screen.getByText('Cotización Test 1')
      fireEvent.blur(editableTitle, { target: { textContent: 'New Name' } })
      
      await waitFor(() => {
        expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
        expect(screen.getByText('Guardando...')).toBeInTheDocument()
      })
    })
  })

  // 🎨 Improved empty states
  describe('Enhanced Empty States', () => {
    it('shows modern empty state with illustration and CTA', () => {
      render(<CotizacionList {...defaultProps} cotizaciones={[]} />)
      
      // Check for empty state elements
      expect(screen.getByTestId('file-icon')).toBeInTheDocument()
      expect(screen.getByText('No hay cotizaciones disponibles')).toBeInTheDocument()
      expect(screen.getByText('Comienza creando tu primera cotización para gestionar tus proyectos comerciales.')).toBeInTheDocument()
      expect(screen.getByText('Crear Primera Cotización')).toBeInTheDocument()
      
      // Check for CTA button with icon
      expect(screen.getByTestId('package-icon')).toBeInTheDocument()
    })

    it('handles null/undefined cotizaciones gracefully', () => {
      render(<CotizacionList {...defaultProps} cotizaciones={null as any} />)
      
      expect(screen.getByText('No hay cotizaciones disponibles')).toBeInTheDocument()
    })
  })

  // 💰 Enhanced financial display
  describe('Enhanced Financial Information', () => {
    it('displays comprehensive financial metrics', () => {
      render(<CotizacionList {...defaultProps} />)
      
      // Check for all financial metrics
      expect(screen.getAllByText('Total Cliente')).toHaveLength(2)
      expect(screen.getAllByText('Total Interno')).toHaveLength(2)
      expect(screen.getAllByText('Margen')).toHaveLength(2)
      expect(screen.getAllByText('% Margen')).toHaveLength(2)
    })

    it('calculates and displays margin correctly', () => {
      render(<CotizacionList {...defaultProps} />)
      
      // First cotización: (15000-12000)/15000 * 100 = 20%
      expect(screen.getByText('20.0%')).toBeInTheDocument()
      
      // Second cotización: (8000-7000)/8000 * 100 = 12.5%
      expect(screen.getByText('12.5%')).toBeInTheDocument()
    })

    it('formats currency properly', () => {
      render(<CotizacionList {...defaultProps} />)
      
      // Check USD formatting
      expect(screen.getByText('$15,000.00')).toBeInTheDocument()
      expect(screen.getByText('$12,000.00')).toBeInTheDocument()
      expect(screen.getByText('$8,000.00')).toBeInTheDocument()
      expect(screen.getByText('$7,000.00')).toBeInTheDocument()
    })
  })

  // 🎯 Enhanced interactions
  describe('Enhanced User Interactions', () => {
    it('provides better visual feedback for actions', () => {
      render(<CotizacionList {...defaultProps} />)
      
      // Check for modern button components
      const buttons = screen.getAllByTestId('ui-button')
      expect(buttons.length).toBeGreaterThan(0)
      
      // Check button labels
      expect(screen.getAllByText('Ver Detalles')).toHaveLength(2)
      expect(screen.getAllByText('Eliminar')).toHaveLength(2)
    })

    it('handles inline editing with improved UX', async () => {
      const { updateCotizacion } = await import('@/lib/services/cotizacion')
      const mockUpdated = { ...mockCotizaciones[0], nombre: 'Updated Name' }
      vi.mocked(updateCotizacion).mockResolvedValue(mockUpdated)
      
      render(<CotizacionList {...defaultProps} />)
      
      const editableTitle = screen.getByText('Cotización Test 1')
      
      // Simulate editing
      Object.defineProperty(editableTitle, 'textContent', {
        writable: true,
        value: 'Updated Name'
      })
      
      fireEvent.blur(editableTitle)
      
      await waitFor(() => {
        expect(updateCotizacion).toHaveBeenCalledWith('1', { nombre: 'Updated Name' })
        expect(defaultProps.onUpdated).toHaveBeenCalledWith(mockUpdated)
      })
    })
  })

  // 🚨 Enhanced error handling
  describe('Enhanced Error States', () => {
    it('shows modern error alerts', async () => {
      const { updateCotizacion } = await import('@/lib/services/cotizacion')
      vi.mocked(updateCotizacion).mockRejectedValue(new Error('Update failed'))
      
      render(<CotizacionList {...defaultProps} />)
      
      const editableTitle = screen.getByText('Cotización Test 1')
      Object.defineProperty(editableTitle, 'textContent', {
        writable: true,
        value: 'Updated Name'
      })
      
      fireEvent.blur(editableTitle)
      
      await waitFor(() => {
        expect(screen.getByTestId('alert')).toBeInTheDocument()
        expect(screen.getByTestId('alert-icon')).toBeInTheDocument()
        expect(screen.getByText('Error al actualizar la cotización.')).toBeInTheDocument()
      })
    })
  })

  // 🎨 Animation and motion
  describe('Animation Integration', () => {
    it('uses Framer Motion for animations', () => {
      render(<CotizacionList {...defaultProps} />)
      
      // Check for motion components
      expect(screen.getAllByTestId('motion-div')).toHaveLength(3) // Main container + 2 cotizaciones
      expect(screen.getByTestId('animate-presence')).toBeInTheDocument()
    })
  })

  // 📊 Data presentation improvements
  describe('Enhanced Data Presentation', () => {
    it('displays client information with icons', () => {
      render(<CotizacionList {...defaultProps} />)
      
      expect(screen.getByText('Cliente Test')).toBeInTheDocument()
      expect(screen.getByText('Sin cliente asignado')).toBeInTheDocument()
      
      // Check for user icons
      expect(screen.getAllByTestId('user-icon')).toHaveLength(2)
    })

    it('displays formatted dates with icons', () => {
      render(<CotizacionList {...defaultProps} />)
      
      // Check for formatted dates
      expect(screen.getByText('15 ene 2024')).toBeInTheDocument()
      expect(screen.getByText('10 ene 2024')).toBeInTheDocument()
      
      // Check for calendar icons
      expect(screen.getAllByTestId('calendar-icon')).toHaveLength(2)
    })
  })

  // 🎯 Performance and UX optimizations
  describe('Performance Optimizations', () => {
    it('prevents unnecessary API calls on empty edits', async () => {
      const { updateCotizacion } = await import('@/lib/services/cotizacion')
      
      render(<CotizacionList {...defaultProps} />)
      
      const editableTitle = screen.getByText('Cotización Test 1')
      
      // Simulate blur without changing content
      Object.defineProperty(editableTitle, 'textContent', {
        writable: true,
        value: 'Cotización Test 1' // Same as original
      })
      
      fireEvent.blur(editableTitle)
      
      // Should not call update service
      expect(updateCotizacion).not.toHaveBeenCalled()
    })

    it('disables actions during loading states', async () => {
      const { deleteCotizacion } = await import('@/lib/services/cotizacion')
      vi.mocked(deleteCotizacion).mockImplementation(() => new Promise(() => {}))
      
      render(<CotizacionList {...defaultProps} />)
      
      const deleteButtons = screen.getAllByText('Eliminar')
      fireEvent.click(deleteButtons[0])
      
      await waitFor(() => {
        expect(screen.getByText('Eliminando...')).toBeInTheDocument()
        expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
      })
    })
  })
})
