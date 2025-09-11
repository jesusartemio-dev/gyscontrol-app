import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import PlantillaEquipoItemForm from '../PlantillaEquipoItemForm'
import type { CatalogoEquipo } from '@/types'
import * as plantillaEquipoItemService from '@/lib/services/plantillaEquipoItem'

// Mock the services
vi.mock('@/lib/services/plantillaEquipoItem', () => ({
  createPlantillaEquipoItem: vi.fn()
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    form: ({ children, ...props }: any) => <form {...props}>{children}</form>
  },
  AnimatePresence: ({ children }: any) => children
}))

// Mock the EquipoSelectionModal
vi.mock('@/components/equipos/EquipoSelectionModal', () => ({
  default: ({ isOpen, onClose, onSelect }: any) => {
    if (!isOpen) return null
    
    const mockEquipo: CatalogoEquipo = {
      id: '1',
      codigo: 'EQ001',
      descripcion: 'Equipo Test',
      marca: 'Test Brand',
      precioInterno: 100,
      precioVenta: 150,
      categoriaId: '1',
      unidadId: '1',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
    
    return (
      <div data-testid="equipo-modal">
        <button onClick={() => onSelect(mockEquipo)}>Seleccionar Equipo Test</button>
        <button onClick={onClose}>Cerrar</button>
      </div>
    )
  }
}))

const defaultProps = {
  plantillaEquipoId: '1',
  onItemCreated: vi.fn()
}

describe('PlantillaEquipoItemForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly with initial state', () => {
    render(<PlantillaEquipoItemForm {...defaultProps} />)
    
    expect(screen.getByLabelText(/cantidad/i)).toBeInTheDocument()
    expect(screen.getByText(/seleccionar equipo/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /agregar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /agregar/i })).toBeDisabled()
  })

  it('validates quantity input correctly', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoItemForm {...defaultProps} />)
    
    const quantityInput = screen.getByLabelText(/cantidad/i)
    
    // Test invalid quantity (0)
    await user.clear(quantityInput)
    await user.type(quantityInput, '0')
    expect(screen.getByText('La cantidad debe ser mayor a 0')).toBeInTheDocument()
    
    // Test invalid quantity (negative)
    await user.clear(quantityInput)
    await user.type(quantityInput, '-1')
    expect(screen.getByText('La cantidad debe ser mayor a 0')).toBeInTheDocument()
    
    // Test invalid quantity (too large)
    await user.clear(quantityInput)
    await user.type(quantityInput, '1001')
    expect(screen.getByText('La cantidad no puede ser mayor a 1000')).toBeInTheDocument()
    
    // Test valid quantity
    await user.clear(quantityInput)
    await user.type(quantityInput, '5')
    expect(screen.queryByText(/La cantidad/)).not.toBeInTheDocument()
  })

  it('opens and closes equipment selection modal', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoItemForm {...defaultProps} />)
    
    // Open modal
    const selectButton = screen.getByText(/seleccionar equipo/i)
    await user.click(selectButton)
    
    expect(screen.getByTestId('equipo-modal')).toBeInTheDocument()
    
    // Close modal
    const closeButton = screen.getByText('Cerrar')
    await user.click(closeButton)
    
    expect(screen.queryByTestId('equipo-modal')).not.toBeInTheDocument()
  })

  it('selects equipment from modal', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoItemForm {...defaultProps} />)
    
    // Open modal
    const selectButton = screen.getByText(/seleccionar equipo/i)
    await user.click(selectButton)
    
    // Select equipment
    const equipoButton = screen.getByText('Seleccionar Equipo Test')
    await user.click(equipoButton)
    
    // Modal should close and equipment should be selected
    expect(screen.queryByTestId('equipo-modal')).not.toBeInTheDocument()
    expect(screen.getByText('Equipo Test')).toBeInTheDocument()
    expect(screen.getByText('$100.00 → $150.00')).toBeInTheDocument()
  })

  it('enables add button when form is valid', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoItemForm {...defaultProps} />)
    
    const addButton = screen.getByRole('button', { name: /agregar/i })
    expect(addButton).toBeDisabled()
    
    // Add valid quantity
    const quantityInput = screen.getByLabelText(/cantidad/i)
    await user.type(quantityInput, '2')
    
    // Still disabled without equipment
    expect(addButton).toBeDisabled()
    
    // Select equipment
    const selectButton = screen.getByText(/seleccionar equipo/i)
    await user.click(selectButton)
    const equipoButton = screen.getByText('Seleccionar Equipo Test')
    await user.click(equipoButton)
    
    // Now should be enabled
    expect(addButton).not.toBeDisabled()
  })

  it('submits form correctly', async () => {
    const user = userEvent.setup()
    const mockCreate = vi.mocked(plantillaEquipoItemService.createPlantillaEquipoItem)
    const mockItem = {
      id: '1',
      plantillaEquipoId: '1',
      equipoId: '1',
      cantidad: 2,
      costoInterno: 200,
      costoCliente: 300,
      createdAt: new Date(),
      updatedAt: new Date()
    }
    mockCreate.mockResolvedValue(mockItem)

    render(<PlantillaEquipoItemForm {...defaultProps} />)
    
    // Fill form
    const quantityInput = screen.getByLabelText(/cantidad/i)
    await user.type(quantityInput, '2')
    
    // Select equipment
    const selectButton = screen.getByText(/seleccionar equipo/i)
    await user.click(selectButton)
    const equipoButton = screen.getByText('Seleccionar Equipo Test')
    await user.click(equipoButton)
    
    // Submit form
    const addButton = screen.getByRole('button', { name: /agregar/i })
    await user.click(addButton)
    
    await waitFor(() => {
      expect(mockCreate).toHaveBeenCalledWith({
        plantillaEquipoId: '1',
        equipoId: '1',
        cantidad: 2
      })
      expect(defaultProps.onItemCreated).toHaveBeenCalledWith(mockItem)
    })
  })

  it('shows success message after successful submission', async () => {
    const user = userEvent.setup()
    const mockCreate = vi.mocked(plantillaEquipoItemService.createPlantillaEquipoItem)
    mockCreate.mockResolvedValue({
      id: '1',
      plantillaEquipoId: '1',
      equipoId: '1',
      cantidad: 2,
      costoInterno: 200,
      costoCliente: 300,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    render(<PlantillaEquipoItemForm {...defaultProps} />)
    
    // Fill and submit form
    const quantityInput = screen.getByLabelText(/cantidad/i)
    await user.type(quantityInput, '2')
    
    const selectButton = screen.getByText(/seleccionar equipo/i)
    await user.click(selectButton)
    const equipoButton = screen.getByText('Seleccionar Equipo Test')
    await user.click(equipoButton)
    
    const addButton = screen.getByRole('button', { name: /agregar/i })
    await user.click(addButton)
    
    await waitFor(() => {
      expect(screen.getByText(/equipo agregado exitosamente/i)).toBeInTheDocument()
    })
  })

  it('resets form after successful submission', async () => {
    const user = userEvent.setup()
    const mockCreate = vi.mocked(plantillaEquipoItemService.createPlantillaEquipoItem)
    mockCreate.mockResolvedValue({
      id: '1',
      plantillaEquipoId: '1',
      equipoId: '1',
      cantidad: 2,
      costoInterno: 200,
      costoCliente: 300,
      createdAt: new Date(),
      updatedAt: new Date()
    })

    render(<PlantillaEquipoItemForm {...defaultProps} />)
    
    // Fill and submit form
    const quantityInput = screen.getByLabelText(/cantidad/i)
    await user.type(quantityInput, '2')
    
    const selectButton = screen.getByText(/seleccionar equipo/i)
    await user.click(selectButton)
    const equipoButton = screen.getByText('Seleccionar Equipo Test')
    await user.click(equipoButton)
    
    const addButton = screen.getByRole('button', { name: /agregar/i })
    await user.click(addButton)
    
    await waitFor(() => {
      // Form should be reset
      expect(quantityInput).toHaveValue(1)
      expect(screen.getByText(/seleccionar equipo/i)).toBeInTheDocument()
      expect(addButton).toBeDisabled()
    })
  })

  it('handles service errors gracefully', async () => {
    const user = userEvent.setup()
    const mockCreate = vi.mocked(plantillaEquipoItemService.createPlantillaEquipoItem)
    mockCreate.mockRejectedValue(new Error('Service error'))

    render(<PlantillaEquipoItemForm {...defaultProps} />)
    
    // Fill and submit form
    const quantityInput = screen.getByLabelText(/cantidad/i)
    await user.type(quantityInput, '2')
    
    const selectButton = screen.getByText(/seleccionar equipo/i)
    await user.click(selectButton)
    const equipoButton = screen.getByText('Seleccionar Equipo Test')
    await user.click(equipoButton)
    
    const addButton = screen.getByRole('button', { name: /agregar/i })
    await user.click(addButton)
    
    await waitFor(() => {
      expect(screen.getByText(/error al agregar el equipo/i)).toBeInTheDocument()
    })
  })

  it('shows loading state during submission', async () => {
    const user = userEvent.setup()
    const mockCreate = vi.mocked(plantillaEquipoItemService.createPlantillaEquipoItem)
    // Make promise never resolve to test loading state
    mockCreate.mockImplementation(() => new Promise(() => {}))

    render(<PlantillaEquipoItemForm {...defaultProps} />)
    
    // Fill form
    const quantityInput = screen.getByLabelText(/cantidad/i)
    await user.type(quantityInput, '2')
    
    const selectButton = screen.getByText(/seleccionar equipo/i)
    await user.click(selectButton)
    const equipoButton = screen.getByText('Seleccionar Equipo Test')
    await user.click(equipoButton)
    
    // Submit form
    const addButton = screen.getByRole('button', { name: /agregar/i })
    await user.click(addButton)
    
    // Should show loading state
    await waitFor(() => {
      expect(screen.getByText(/agregando/i)).toBeInTheDocument()
      expect(addButton).toBeDisabled()
    })
  })

  it('calculates totals correctly when equipment is selected', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoItemForm {...defaultProps} />)
    
    // Set quantity
    const quantityInput = screen.getByLabelText(/cantidad/i)
    await user.clear(quantityInput)
    await user.type(quantityInput, '3')
    
    // Select equipment
    const selectButton = screen.getByText(/seleccionar equipo/i)
    await user.click(selectButton)
    const equipoButton = screen.getByText('Seleccionar Equipo Test')
    await user.click(equipoButton)
    
    // Should show calculated totals (3 * 100 = 300, 3 * 150 = 450)
    expect(screen.getByText('$300.00')).toBeInTheDocument() // Total interno
    expect(screen.getByText('$450.00')).toBeInTheDocument() // Total cliente
  })

  it('updates totals when quantity changes', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoItemForm {...defaultProps} />)
    
    // Select equipment first
    const selectButton = screen.getByText(/seleccionar equipo/i)
    await user.click(selectButton)
    const equipoButton = screen.getByText('Seleccionar Equipo Test')
    await user.click(equipoButton)
    
    // Change quantity
    const quantityInput = screen.getByLabelText(/cantidad/i)
    await user.clear(quantityInput)
    await user.type(quantityInput, '5')
    
    // Should show updated totals (5 * 100 = 500, 5 * 150 = 750)
    expect(screen.getByText('$500.00')).toBeInTheDocument() // Total interno
    expect(screen.getByText('$750.00')).toBeInTheDocument() // Total cliente
  })
})
