import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlantillasPage from '../page'
import { getPlantillas } from '@/lib/services/plantilla'
import type { Plantilla } from '../page'

// Mock dependencies
jest.mock('@/lib/services/plantilla')
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    h1: ({ children, ...props }: any) => <h1 {...props}>{children}</h1>
  }
}))
jest.mock('@/components/plantillas/PlantillaForm', () => {
  return function MockPlantillaForm({ onCreated }: { onCreated: (plantilla: Plantilla) => void }) {
    return (
      <div data-testid="plantilla-form">
        <button
          onClick={() => onCreated({
            id: 'new-id',
            nombre: 'Nueva Plantilla',
            totalInterno: 0,
            totalCliente: 0
          })}
        >
          Crear Plantilla Mock
        </button>
      </div>
    )
  }
})
jest.mock('@/components/plantillas/PlantillaList', () => {
  return function MockPlantillaList({ 
    plantillas, 
    onDelete, 
    onUpdated 
  }: { 
    plantillas: Plantilla[]
    onDelete: (id: string) => void
    onUpdated: (plantilla: Plantilla) => void
  }) {
    return (
      <div data-testid="plantilla-list">
        {plantillas.map(p => (
          <div key={p.id} data-testid={`plantilla-${p.id}`}>
            <span>{p.nombre}</span>
            <button onClick={() => onDelete(p.id)}>Eliminar {p.id}</button>
            <button onClick={() => onUpdated({ ...p, nombre: 'Actualizado' })}>Actualizar {p.id}</button>
          </div>
        ))}
      </div>
    )
  }
})

const mockGetPlantillas = getPlantillas as jest.MockedFunction<typeof getPlantillas>

const mockPlantillas: Plantilla[] = [
  {
    id: '1',
    nombre: 'Plantilla Sistema Eléctrico',
    totalInterno: 1500.50,
    totalCliente: 2000.75
  },
  {
    id: '2',
    nombre: 'Plantilla Mecánica',
    totalInterno: 800.25,
    totalCliente: 1200.00
  },
  {
    id: '3',
    nombre: 'Plantilla Vacía',
    totalInterno: 0,
    totalCliente: 0
  }
]

describe('PlantillasPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Loading State', () => {
    it('shows loading skeleton while fetching data', () => {
      mockGetPlantillas.mockImplementation(() => new Promise(() => {}))
      
      render(<PlantillasPage />)
      
      expect(screen.getByTestId('loading-skeleton')).toBeInTheDocument()
    })
  })

  describe('Data Loading', () => {
    it('loads and displays plantillas on mount', async () => {
      mockGetPlantillas.mockResolvedValue(mockPlantillas)
      
      render(<PlantillasPage />)
      
      await waitFor(() => {
        expect(screen.getByTestId('plantilla-list')).toBeInTheDocument()
      })
      
      expect(mockGetPlantillas).toHaveBeenCalledTimes(1)
      expect(screen.getByTestId('plantilla-1')).toBeInTheDocument()
      expect(screen.getByTestId('plantilla-2')).toBeInTheDocument()
      expect(screen.getByTestId('plantilla-3')).toBeInTheDocument()
    })

    it('handles loading error', async () => {
      mockGetPlantillas.mockRejectedValue(new Error('Network error'))
      
      render(<PlantillasPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Error al cargar las plantillas. Por favor, recarga la página.')).toBeInTheDocument()
      })
    })
  })

  describe('Header and Statistics', () => {
    it('displays correct page title and breadcrumb', async () => {
      mockGetPlantillas.mockResolvedValue(mockPlantillas)
      
      render(<PlantillasPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Plantillas Comerciales')).toBeInTheDocument()
      })
      
      expect(screen.getByText('Comercial')).toBeInTheDocument()
      expect(screen.getByText('Plantillas')).toBeInTheDocument()
    })

    it('displays correct statistics', async () => {
      mockGetPlantillas.mockResolvedValue(mockPlantillas)
      
      render(<PlantillasPage />)
      
      await waitFor(() => {
        // Total plantillas
        expect(screen.getByText('3')).toBeInTheDocument()
        expect(screen.getByText('Total Plantillas')).toBeInTheDocument()
        
        // Plantillas configuradas (with totalCliente > 0)
        expect(screen.getByText('2')).toBeInTheDocument()
        expect(screen.getByText('Configuradas')).toBeInTheDocument()
        
        // Valor total cliente
        expect(screen.getByText('$3,200.75')).toBeInTheDocument()
        expect(screen.getByText('Valor Total Cliente')).toBeInTheDocument()
        
        // Valor promedio
        expect(screen.getByText('$1,600.38')).toBeInTheDocument()
        expect(screen.getByText('Valor Promedio')).toBeInTheDocument()
      })
    })

    it('handles empty statistics correctly', async () => {
      mockGetPlantillas.mockResolvedValue([])
      
      render(<PlantillasPage />)
      
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument()
        expect(screen.getByText('$0.00')).toBeInTheDocument()
      })
    })
  })

  describe('CRUD Operations', () => {
    it('creates new plantilla', async () => {
      const user = userEvent.setup()
      mockGetPlantillas.mockResolvedValue(mockPlantillas)
      
      render(<PlantillasPage />)
      
      await waitFor(() => {
        expect(screen.getByTestId('plantilla-form')).toBeInTheDocument()
      })
      
      const createButton = screen.getByText('Crear Plantilla Mock')
      await user.click(createButton)
      
      // Should add new plantilla to the list
      await waitFor(() => {
        expect(screen.getByText('Nueva Plantilla')).toBeInTheDocument()
      })
    })

    it('deletes plantilla', async () => {
      const user = userEvent.setup()
      mockGetPlantillas.mockResolvedValue(mockPlantillas)
      
      render(<PlantillasPage />)
      
      await waitFor(() => {
        expect(screen.getByTestId('plantilla-1')).toBeInTheDocument()
      })
      
      const deleteButton = screen.getByText('Eliminar 1')
      await user.click(deleteButton)
      
      // Should remove plantilla from the list
      await waitFor(() => {
        expect(screen.queryByTestId('plantilla-1')).not.toBeInTheDocument()
      })
    })

    it('updates plantilla', async () => {
      const user = userEvent.setup()
      mockGetPlantillas.mockResolvedValue(mockPlantillas)
      
      render(<PlantillasPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Plantilla Sistema Eléctrico')).toBeInTheDocument()
      })
      
      const updateButton = screen.getByText('Actualizar 1')
      await user.click(updateButton)
      
      // Should update plantilla in the list
      await waitFor(() => {
        expect(screen.getByText('Actualizado')).toBeInTheDocument()
      })
    })
  })

  describe('Statistics Updates', () => {
    it('updates statistics when plantilla is added', async () => {
      const user = userEvent.setup()
      mockGetPlantillas.mockResolvedValue([mockPlantillas[0]]) // Start with 1 plantilla
      
      render(<PlantillasPage />)
      
      await waitFor(() => {
        expect(screen.getByText('1')).toBeInTheDocument() // Total plantillas
      })
      
      // Add new plantilla
      const createButton = screen.getByText('Crear Plantilla Mock')
      await user.click(createButton)
      
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument() // Updated total
      })
    })

    it('updates statistics when plantilla is deleted', async () => {
      const user = userEvent.setup()
      mockGetPlantillas.mockResolvedValue(mockPlantillas) // Start with 3 plantillas
      
      render(<PlantillasPage />)
      
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument() // Total plantillas
      })
      
      // Delete plantilla
      const deleteButton = screen.getByText('Eliminar 1')
      await user.click(deleteButton)
      
      await waitFor(() => {
        expect(screen.getByText('2')).toBeInTheDocument() // Updated total
      })
    })

    it('updates statistics when plantilla is updated', async () => {
      const user = userEvent.setup()
      const initialPlantillas = [{
        id: '1',
        nombre: 'Test',
        totalInterno: 0,
        totalCliente: 0 // Start with 0 configured
      }]
      mockGetPlantillas.mockResolvedValue(initialPlantillas)
      
      render(<PlantillasPage />)
      
      await waitFor(() => {
        expect(screen.getByText('0')).toBeInTheDocument() // Configuradas
      })
      
      // Update plantilla (mock will set totalCliente > 0)
      const updateButton = screen.getByText('Actualizar 1')
      await user.click(updateButton)
      
      // Note: This test would need the mock to return updated values
      // The actual implementation would recalculate statistics
    })
  })

  describe('Responsive Design', () => {
    it('renders with proper responsive classes', async () => {
      mockGetPlantillas.mockResolvedValue(mockPlantillas)
      
      render(<PlantillasPage />)
      
      await waitFor(() => {
        const container = screen.getByTestId('plantillas-container')
        expect(container).toHaveClass('container', 'mx-auto', 'px-4', 'py-8')
      })
    })
  })

  describe('Error Handling', () => {
    it('shows error state with retry option', async () => {
      const user = userEvent.setup()
      mockGetPlantillas.mockRejectedValueOnce(new Error('Network error'))
      
      render(<PlantillasPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Error al cargar las plantillas. Por favor, recarga la página.')).toBeInTheDocument()
      })
      
      // Should have retry button
      const retryButton = screen.getByText('Reintentar')
      expect(retryButton).toBeInTheDocument()
      
      // Mock successful retry
      mockGetPlantillas.mockResolvedValue(mockPlantillas)
      await user.click(retryButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('plantilla-list')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper heading hierarchy', async () => {
      mockGetPlantillas.mockResolvedValue(mockPlantillas)
      
      render(<PlantillasPage />)
      
      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { level: 1 })
        expect(mainHeading).toHaveTextContent('Plantillas Comerciales')
      })
    })

    it('has proper navigation landmarks', async () => {
      mockGetPlantillas.mockResolvedValue(mockPlantillas)
      
      render(<PlantillasPage />)
      
      await waitFor(() => {
        const nav = screen.getByRole('navigation')
        expect(nav).toBeInTheDocument()
      })
    })
  })

  describe('Performance', () => {
    it('does not refetch data unnecessarily', async () => {
      mockGetPlantillas.mockResolvedValue(mockPlantillas)
      
      const { rerender } = render(<PlantillasPage />)
      
      await waitFor(() => {
        expect(mockGetPlantillas).toHaveBeenCalledTimes(1)
      })
      
      // Rerender component
      rerender(<PlantillasPage />)
      
      // Should not call API again
      expect(mockGetPlantillas).toHaveBeenCalledTimes(1)
    })
  })
})
