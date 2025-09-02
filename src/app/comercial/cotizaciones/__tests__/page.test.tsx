import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import CotizacionesPage from '../page'
import { getCotizaciones } from '@/lib/services/cotizacion'
import { calcularTotal } from '@/lib/utils/costos'

// Mock dependencies
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}))

jest.mock('@/lib/services/cotizacion', () => ({
  getCotizaciones: jest.fn(),
}))

jest.mock('@/lib/utils/costos', () => ({
  calcularTotal: jest.fn(),
}))

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

jest.mock('@/components/cotizaciones/CotizacionForm', () => {
  return function MockCotizacionForm({ onCreated }: { onCreated: (cotizacion: any) => void }) {
    return (
      <div data-testid="cotizacion-form">
        <button 
          onClick={() => onCreated({ 
            id: 'new-1', 
            nombre: 'Nueva Cotización',
            estado: 'borrador',
            montoTotal: 1000
          })}
        >
          Crear Cotización
        </button>
      </div>
    )
  }
})

jest.mock('@/components/cotizaciones/CotizacionList', () => {
  return function MockCotizacionList({ 
    cotizaciones, 
    onDelete, 
    onUpdated 
  }: { 
    cotizaciones: any[], 
    onDelete: (id: string) => void,
    onUpdated: (cotizacion: any) => void
  }) {
    return (
      <div data-testid="cotizacion-list">
        {cotizaciones.map((cotizacion) => (
          <div key={cotizacion.id} data-testid={`cotizacion-${cotizacion.id}`}>
            <span>{cotizacion.nombre}</span>
            <button onClick={() => onDelete(cotizacion.id)}>Eliminar</button>
            <button onClick={() => onUpdated({ ...cotizacion, estado: 'actualizada' })}>
              Actualizar
            </button>
          </div>
        ))}
      </div>
    )
  }
})

const mockPush = jest.fn()
const mockRouter = {
  push: mockPush,
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  replace: jest.fn(),
}

const mockCotizaciones = [
  {
    id: '1',
    nombre: 'Cotización Test 1',
    estado: 'aprobada',
    montoTotal: 5000,
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: '2',
    nombre: 'Cotización Test 2',
    estado: 'borrador',
    montoTotal: 3000,
    createdAt: '2024-01-16T10:00:00Z',
  },
  {
    id: '3',
    nombre: 'Cotización Test 3',
    estado: 'enviada',
    montoTotal: 7500,
    createdAt: '2024-01-17T10:00:00Z',
  },
]

describe('CotizacionesPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(calcularTotal as jest.Mock).mockImplementation((cotizacion) => ({
      montoTotal: cotizacion.montoTotal || 0,
    }))
  })

  describe('Loading State', () => {
    it('should show loading skeleton when data is being fetched', () => {
      ;(getCotizaciones as jest.Mock).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      )

      render(<CotizacionesPage />)

      // Check for skeleton loaders
      expect(screen.getByText('Gestión de Cotizaciones')).toBeInTheDocument()
      expect(document.querySelectorAll('.animate-pulse')).toHaveLength(6) // 4 stats + 2 content skeletons
    })
  })

  describe('Successful Data Loading', () => {
    beforeEach(() => {
      ;(getCotizaciones as jest.Mock).mockResolvedValue(mockCotizaciones)
    })

    it('should render header with breadcrumb navigation', async () => {
      render(<CotizacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('Comercial')).toBeInTheDocument()
        expect(screen.getByText('Cotizaciones')).toBeInTheDocument()
        expect(screen.getByText('Gestión de Cotizaciones')).toBeInTheDocument()
        expect(screen.getByText('Administra y gestiona todas las cotizaciones del sistema')).toBeInTheDocument()
      })
    })

    it('should navigate to comercial page when breadcrumb is clicked', async () => {
      render(<CotizacionesPage />)

      await waitFor(() => {
        const comercialButton = screen.getByText('Comercial')
        fireEvent.click(comercialButton)
        expect(mockPush).toHaveBeenCalledWith('/comercial')
      })
    })

    it('should display action buttons in header', async () => {
      render(<CotizacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('Compartir')).toBeInTheDocument()
        expect(screen.getByText('Exportar')).toBeInTheDocument()
      })
    })

    it('should display statistics cards with correct data', async () => {
      render(<CotizacionesPage />)

      await waitFor(() => {
        // Total cotizaciones
        expect(screen.getByText('Total Cotizaciones')).toBeInTheDocument()
        expect(screen.getByText('3')).toBeInTheDocument()
        expect(screen.getByText('Cotizaciones registradas')).toBeInTheDocument()

        // Aprobadas
        expect(screen.getByText('Aprobadas')).toBeInTheDocument()
        expect(screen.getByText('1')).toBeInTheDocument()
        expect(screen.getByText('33% del total')).toBeInTheDocument()

        // Monto total
        expect(screen.getByText('Monto Total')).toBeInTheDocument()
        expect(screen.getByText('US$15,500.00')).toBeInTheDocument()
        expect(screen.getByText('Valor total de cotizaciones')).toBeInTheDocument()

        // Promedio
        expect(screen.getByText('Promedio')).toBeInTheDocument()
        expect(screen.getByText('US$5,166.67')).toBeInTheDocument()
        expect(screen.getByText('Monto promedio por cotización')).toBeInTheDocument()
      })
    })

    it('should display form and list sections', async () => {
      render(<CotizacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('Nueva Cotización')).toBeInTheDocument()
        expect(screen.getByText('Completa el formulario para crear una nueva cotización')).toBeInTheDocument()
        expect(screen.getByTestId('cotizacion-form')).toBeInTheDocument()

        expect(screen.getByText('Lista de Cotizaciones')).toBeInTheDocument()
        expect(screen.getByText('Gestiona y revisa todas las cotizaciones existentes')).toBeInTheDocument()
        expect(screen.getByTestId('cotizacion-list')).toBeInTheDocument()
      })
    })

    it('should handle creating new cotizacion', async () => {
      render(<CotizacionesPage />)

      await waitFor(() => {
        const createButton = screen.getByText('Crear Cotización')
        fireEvent.click(createButton)
      })

      // Should update statistics after creation
      await waitFor(() => {
        expect(screen.getByText('4')).toBeInTheDocument() // Total should be 4 now
      })
    })

    it('should handle deleting cotizacion', async () => {
      render(<CotizacionesPage />)

      await waitFor(() => {
        const deleteButton = screen.getAllByText('Eliminar')[0]
        fireEvent.click(deleteButton)
      })

      // Should update statistics after deletion
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument() // Total should be 2 now
      })
    })

    it('should handle updating cotizacion', async () => {
      render(<CotizacionesPage />)

      await waitFor(() => {
        const updateButton = screen.getAllByText('Actualizar')[0]
        fireEvent.click(updateButton)
      })

      // Should call calcularTotal for updated cotizacion
      expect(calcularTotal).toHaveBeenCalled()
    })
  })

  describe('Error State', () => {
    it('should display error message when data loading fails', async () => {
      ;(getCotizaciones as jest.Mock).mockRejectedValue(new Error('Network error'))

      render(<CotizacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('Error al cargar')).toBeInTheDocument()
        expect(screen.getByText('Error al cargar cotizaciones.')).toBeInTheDocument()
        expect(screen.getByText('Reintentar')).toBeInTheDocument()
      })
    })

    it('should reload page when retry button is clicked', async () => {
      ;(getCotizaciones as jest.Mock).mockRejectedValue(new Error('Network error'))
      const reloadSpy = jest.spyOn(window.location, 'reload').mockImplementation(() => {})

      render(<CotizacionesPage />)

      await waitFor(() => {
        const retryButton = screen.getByText('Reintentar')
        fireEvent.click(retryButton)
        expect(reloadSpy).toHaveBeenCalled()
      })

      reloadSpy.mockRestore()
    })
  })

  describe('Empty State', () => {
    it('should display empty state when no cotizaciones exist', async () => {
      ;(getCotizaciones as jest.Mock).mockResolvedValue([])

      render(<CotizacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('No hay cotizaciones')).toBeInTheDocument()
        expect(screen.getByText('Comienza creando tu primera cotización usando el formulario de la izquierda.')).toBeInTheDocument()
        expect(screen.getByText('💡 Tip: Completa todos los campos requeridos')).toBeInTheDocument()
      })
    })

    it('should show zero statistics when no cotizaciones exist', async () => {
      ;(getCotizaciones as jest.Mock).mockResolvedValue([])

      render(<CotizacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument() // Total cotizaciones
        expect(screen.getByText('0% del total')).toBeInTheDocument() // Aprobadas percentage
        expect(screen.getByText('US$0.00')).toBeInTheDocument() // Monto total and promedio
      })
    })
  })

  describe('Currency and Date Formatting', () => {
    it('should format currency correctly', async () => {
      ;(getCotizaciones as jest.Mock).mockResolvedValue(mockCotizaciones)

      render(<CotizacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('US$15,500.00')).toBeInTheDocument()
        expect(screen.getByText('US$5,166.67')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design', () => {
    it('should render grid layout for statistics', async () => {
      ;(getCotizaciones as jest.Mock).mockResolvedValue(mockCotizaciones)

      render(<CotizacionesPage />)

      await waitFor(() => {
        const statsGrid = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4')
        expect(statsGrid).toBeInTheDocument()
      })
    })

    it('should render main content grid layout', async () => {
      ;(getCotizaciones as jest.Mock).mockResolvedValue(mockCotizaciones)

      render(<CotizacionesPage />)

      await waitFor(() => {
        const mainGrid = document.querySelector('.grid.grid-cols-1.lg\\:grid-cols-3')
        expect(mainGrid).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading structure', async () => {
      ;(getCotizaciones as jest.Mock).mockResolvedValue(mockCotizaciones)

      render(<CotizacionesPage />)

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: /Gestión de Cotizaciones/i })).toBeInTheDocument()
        expect(screen.getByText('Nueva Cotización')).toBeInTheDocument()
        expect(screen.getByText('Lista de Cotizaciones')).toBeInTheDocument()
      })
    })

    it('should have proper navigation structure', async () => {
      ;(getCotizaciones as jest.Mock).mockResolvedValue(mockCotizaciones)

      render(<CotizacionesPage />)

      await waitFor(() => {
        expect(screen.getByRole('navigation')).toBeInTheDocument()
      })
    })
  })
})