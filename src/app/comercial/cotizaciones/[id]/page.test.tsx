import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import CotizacionDetallePage from './page'
import { getCotizacionById } from '@/services/cotizacionService'
import { useRouter } from 'next/navigation'

// Mock dependencies
jest.mock('@/services/cotizacionService')
jest.mock('next/navigation')
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    section: ({ children, ...props }: any) => <section {...props}>{children}</section>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>
  }
}))

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div data-testid="card" {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div data-testid="card-content" {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div data-testid="card-header" {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h2 data-testid="card-title" {...props}>{children}</h2>
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} data-testid="button" {...props}>{children}</button>
  )
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, ...props }: any) => (
    <span data-testid="badge" data-variant={variant} {...props}>{children}</span>
  )
}))

jest.mock('@/components/ui/skeleton', () => ({
  Skeleton: (props: any) => <div data-testid="skeleton" {...props} />
}))

// Mock other components
jest.mock('@/components/comercial/cotizacion/CotizacionEquipoAccordion', () => {
  return function MockCotizacionEquipoAccordion({ equipo }: any) {
    return <div data-testid="equipo-accordion">{equipo.nombre}</div>
  }
})

jest.mock('@/components/comercial/cotizacion/CotizacionServicioAccordion', () => {
  return function MockCotizacionServicioAccordion({ servicio }: any) {
    return <div data-testid="servicio-accordion">{servicio.nombre}</div>
  }
})

jest.mock('@/components/comercial/cotizacion/CotizacionGastoAccordion', () => {
  return function MockCotizacionGastoAccordion({ gasto }: any) {
    return <div data-testid="gasto-accordion">{gasto.nombre}</div>
  }
})

jest.mock('@/components/comercial/cotizacion/ResumenTotalesCotizacion', () => {
  return function MockResumenTotalesCotizacion({ cotizacion }: any) {
    return <div data-testid="resumen-totales">Total: ${cotizacion.grandTotal}</div>
  }
})

jest.mock('@/components/comercial/cotizacion/EstadoCotizacionToolbar', () => {
  return function MockEstadoCotizacionToolbar({ cotizacion }: any) {
    return <div data-testid="estado-toolbar">{cotizacion.estado}</div>
  }
})

jest.mock('@/components/comercial/cotizacion/DescargarPDFButton', () => {
  return function MockDescargarPDFButton() {
    return <button data-testid="descargar-pdf">Descargar PDF</button>
  }
})

const mockRouter = {
  push: jest.fn(),
  back: jest.fn()
}

const mockCotizacion = {
  id: 'test-id',
  numero: 'COT-001',
  cliente: {
    id: 'cliente-1',
    nombre: 'Cliente Test',
    email: 'test@example.com'
  },
  estado: 'borrador' as const,
  etapa: 'abierto' as const,
  createdAt: '2024-01-15T00:00:00Z',
  fechaVencimiento: new Date('2024-02-15'),
  grandTotal: 15000,
  equipos: [
    {
      id: 'equipo-1',
      nombre: 'Equipo Test',
      items: []
    }
  ],
  servicios: [
    {
      id: 'servicio-1',
      nombre: 'Servicio Test',
      items: []
    }
  ],
  gastos: [
    {
      id: 'gasto-1',
      nombre: 'Gasto Test',
      items: []
    }
  ]
}

describe('CotizacionDetallePage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(getCotizacionById as jest.Mock).mockResolvedValue(mockCotizacion)
  })

  describe('Loading State', () => {
    it('should show loading skeletons while fetching data', async () => {
      ;(getCotizacionById as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockCotizacion), 100))
      )

      render(<CotizacionDetallePage params={{ id: 'test-id' }} />)

      // Should show loading skeletons
      expect(screen.getAllByTestId('skeleton')).toHaveLength(6)
      expect(screen.getByText('Cargando cotización...')).toBeInTheDocument()

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByText('COT-001')).toBeInTheDocument()
      })
    })
  })

  describe('Error State', () => {
    it('should show error message when cotization is not found', async () => {
      ;(getCotizacionById as jest.Mock).mockResolvedValue(null)

      render(<CotizacionDetallePage params={{ id: 'invalid-id' }} />)

      await waitFor(() => {
        expect(screen.getByText('Cotización no encontrada')).toBeInTheDocument()
        expect(screen.getByText('La cotización que buscas no existe o ha sido eliminada.')).toBeInTheDocument()
      })
    })

    it('should show error message when service throws error', async () => {
      ;(getCotizacionById as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(<CotizacionDetallePage params={{ id: 'test-id' }} />)

      await waitFor(() => {
        expect(screen.getByText('Error al cargar la cotización')).toBeInTheDocument()
        expect(screen.getByText('Hubo un problema al cargar los datos. Por favor, intenta nuevamente.')).toBeInTheDocument()
      })
    })
  })

  describe('Successful Data Load', () => {
    beforeEach(async () => {
      render(<CotizacionDetallePage params={{ id: 'test-id' }} />)
      await waitFor(() => {
        expect(screen.getByText('COT-001')).toBeInTheDocument()
      })
    })

    it('should display cotization header with correct information', () => {
      expect(screen.getByText('COT-001')).toBeInTheDocument()
      expect(screen.getByText('Cliente Test')).toBeInTheDocument()
      expect(screen.getByText('15 Ene 2024')).toBeInTheDocument()
      expect(screen.getByText('15 Feb 2024')).toBeInTheDocument()
    })

    it('should display status badge with correct variant', () => {
      const badge = screen.getByTestId('badge')
      expect(badge).toHaveAttribute('data-variant', 'secondary')
      expect(badge).toHaveTextContent('borrador')
    })

    it('should display statistics correctly', () => {
      expect(screen.getByText('1')).toBeInTheDocument() // Total equipos
      expect(screen.getByText('1')).toBeInTheDocument() // Total servicios  
      expect(screen.getByText('1')).toBeInTheDocument() // Total gastos
      expect(screen.getByText('$15,000.00')).toBeInTheDocument() // Total amount
    })

    it('should display all sections with correct titles', () => {
      expect(screen.getByText('Secciones de Equipos')).toBeInTheDocument()
      expect(screen.getByText('Secciones de Servicios')).toBeInTheDocument()
      expect(screen.getByText('Secciones de Gastos')).toBeInTheDocument()
      expect(screen.getByText('Resumen de Totales')).toBeInTheDocument()
    })

    it('should display accordion components for each section', () => {
      expect(screen.getByTestId('equipo-accordion')).toBeInTheDocument()
      expect(screen.getByTestId('servicio-accordion')).toBeInTheDocument()
      expect(screen.getByTestId('gasto-accordion')).toBeInTheDocument()
    })

    it('should display action buttons', () => {
      expect(screen.getByTestId('descargar-pdf')).toBeInTheDocument()
      expect(screen.getByTestId('estado-toolbar')).toBeInTheDocument()
    })
  })

  describe('Empty States', () => {
    it('should show empty state for equipos when none exist', async () => {
      const emptyCotizacion = { ...mockCotizacion, equipos: [] }
      ;(getCotizacionById as jest.Mock).mockResolvedValue(emptyCotizacion)

      render(<CotizacionDetallePage params={{ id: 'test-id' }} />)

      await waitFor(() => {
        expect(screen.getByText('No hay equipos agregados')).toBeInTheDocument()
        expect(screen.getByText('Comienza agregando una sección de equipos a tu cotización')).toBeInTheDocument()
        expect(screen.getByText('Agregar primer equipo')).toBeInTheDocument()
      })
    })

    it('should show empty state for servicios when none exist', async () => {
      const emptyCotizacion = { ...mockCotizacion, servicios: [] }
      ;(getCotizacionById as jest.Mock).mockResolvedValue(emptyCotizacion)

      render(<CotizacionDetallePage params={{ id: 'test-id' }} />)

      await waitFor(() => {
        expect(screen.getByText('No hay servicios agregados')).toBeInTheDocument()
        expect(screen.getByText('Agrega servicios profesionales a tu cotización')).toBeInTheDocument()
        expect(screen.getByText('Agregar primer servicio')).toBeInTheDocument()
      })
    })

    it('should show empty state for gastos when none exist', async () => {
      const emptyCotizacion = { ...mockCotizacion, gastos: [] }
      ;(getCotizacionById as jest.Mock).mockResolvedValue(emptyCotizacion)

      render(<CotizacionDetallePage params={{ id: 'test-id' }} />)

      await waitFor(() => {
        expect(screen.getByText('No hay gastos agregados')).toBeInTheDocument()
        expect(screen.getByText('Incluye gastos adicionales en tu cotización')).toBeInTheDocument()
        expect(screen.getByText('Agregar primer gasto')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation', () => {
    it('should navigate back when back button is clicked', async () => {
      render(<CotizacionDetallePage params={{ id: 'test-id' }} />)

      await waitFor(() => {
        expect(screen.getByText('COT-001')).toBeInTheDocument()
      })

      const backButton = screen.getByRole('button', { name: /volver/i })
      fireEvent.click(backButton)

      expect(mockRouter.back).toHaveBeenCalledTimes(1)
    })
  })

  describe('Approved and Closed State', () => {
    it('should show special message for approved and closed cotizations', async () => {
      const approvedCotizacion = {
        ...mockCotizacion,
        estado: 'aprobada' as const,
        etapa: 'cerrado' as const
      }
      ;(getCotizacionById as jest.Mock).mockResolvedValue(approvedCotizacion)

      render(<CotizacionDetallePage params={{ id: 'test-id' }} />)

      await waitFor(() => {
        expect(screen.getByText('Cotización Aprobada y Cerrada')).toBeInTheDocument()
        expect(screen.getByText('Esta cotización ha sido aprobada y cerrada. Puedes crear un proyecto desde esta cotización.')).toBeInTheDocument()
      })
    })
  })

  describe('Utility Functions', () => {
    it('should format currency correctly', () => {
      // This would test the formatCurrency function if it was exported
      // For now, we test it indirectly through the component rendering
      expect(screen.getByText('$15,000.00')).toBeInTheDocument()
    })

    it('should format dates correctly', () => {
      // This would test the formatDate function if it was exported
      // For now, we test it indirectly through the component rendering
      expect(screen.getByText('15 Ene 2024')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      render(<CotizacionDetallePage params={{ id: 'test-id' }} />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument()
        expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(4) // Card titles
      })
    })

    it('should have proper button labels', async () => {
      render(<CotizacionDetallePage params={{ id: 'test-id' }} />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /volver/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /agregar equipo/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /agregar servicio/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /agregar gasto/i })).toBeInTheDocument()
      })
    })
  })
})