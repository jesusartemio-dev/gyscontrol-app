import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import PlantillaEquipoItemList from '../PlantillaEquipoItemList'
import type { PlantillaEquipoItem } from '@/types'
import * as plantillaEquipoItemService from '@/lib/services/plantillaEquipoItem'

// Mock the services
vi.mock('@/lib/services/plantillaEquipoItem', () => ({
  updatePlantillaEquipoItem: vi.fn(),
  deletePlantillaEquipoItem: vi.fn()
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>
  },
  AnimatePresence: ({ children }: any) => children
}))

const mockItems: PlantillaEquipoItem[] = [
  {
    id: '1',
    plantillaEquipoId: '1',
    equipoId: '1',
    cantidad: 2,
    costoInterno: 200,
    costoCliente: 300,
    equipo: {
      id: '1',
      nombre: 'Equipo Test 1',
      descripcion: 'Descripción test 1',
      costoInterno: 100,
      costoCliente: 150,
      categoria: 'Categoría A',
      disponible: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    plantillaEquipoId: '1',
    equipoId: '2',
    cantidad: 1,
    costoInterno: 500,
    costoCliente: 750,
    equipo: {
      id: '2',
      nombre: 'Equipo Test 2',
      descripcion: 'Descripción test 2',
      costoInterno: 500,
      costoCliente: 750,
      categoria: 'Categoría B',
      disponible: true,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const defaultProps = {
  items: mockItems,
  onItemUpdated: vi.fn(),
  onItemDeleted: vi.fn()
}

describe('PlantillaEquipoItemList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders empty state when no items', () => {
    render(<PlantillaEquipoItemList {...defaultProps} items={[]} />)
    
    expect(screen.getByText(/no hay equipos agregados/i)).toBeInTheDocument()
    expect(screen.getByText(/agrega el primer equipo/i)).toBeInTheDocument()
  })

  it('renders items correctly', () => {
    render(<PlantillaEquipoItemList {...defaultProps} />)
    
    expect(screen.getByText('Equipo Test 1')).toBeInTheDocument()
    expect(screen.getByText('Equipo Test 2')).toBeInTheDocument()
    expect(screen.getByText('Categoría A')).toBeInTheDocument()
    expect(screen.getByText('Categoría B')).toBeInTheDocument()
    
    // Check quantities
    expect(screen.getByDisplayValue('2')).toBeInTheDocument()
    expect(screen.getByDisplayValue('1')).toBeInTheDocument()
    
    // Check costs
    expect(screen.getByText('$200.00')).toBeInTheDocument() // Internal cost item 1
    expect(screen.getByText('$300.00')).toBeInTheDocument() // Client cost item 1
    expect(screen.getByText('$500.00')).toBeInTheDocument() // Internal cost item 2
    expect(screen.getByText('$750.00')).toBeInTheDocument() // Client cost item 2
  })

  it('shows profit margin badges correctly', () => {
    render(<PlantillaEquipoItemList {...defaultProps} />)
    
    // Item 1: (300-200)/200 * 100 = 50%
    expect(screen.getByText('50.0%')).toBeInTheDocument()
    
    // Item 2: (750-500)/500 * 100 = 50%
    expect(screen.getAllByText('50.0%')).toHaveLength(2)
  })

  it('starts editing when edit button is clicked', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoItemList {...defaultProps} />)
    
    const editButtons = screen.getAllByRole('button', { name: /editar/i })
    await user.click(editButtons[0])
    
    // Should show save and cancel buttons
    expect(screen.getByRole('button', { name: /guardar/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
  })

  it('validates quantity during editing', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoItemList {...defaultProps} />)
    
    const editButtons = screen.getAllByRole('button', { name: /editar/i })
    await user.click(editButtons[0])
    
    const quantityInput = screen.getByDisplayValue('2')
    
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

  it('saves changes correctly', async () => {
    const user = userEvent.setup()
    const mockUpdate = vi.mocked(plantillaEquipoItemService.updatePlantillaEquipoItem)
    const updatedItem = { ...mockItems[0], cantidad: 5, costoInterno: 500, costoCliente: 750 }
    mockUpdate.mockResolvedValue(updatedItem)

    render(<PlantillaEquipoItemList {...defaultProps} />)
    
    // Start editing
    const editButtons = screen.getAllByRole('button', { name: /editar/i })
    await user.click(editButtons[0])
    
    // Change quantity
    const quantityInput = screen.getByDisplayValue('2')
    await user.clear(quantityInput)
    await user.type(quantityInput, '5')
    
    // Save changes
    const saveButton = screen.getByRole('button', { name: /guardar/i })
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('1', { cantidad: 5 })
      expect(defaultProps.onItemUpdated).toHaveBeenCalledWith(updatedItem)
    })
  })

  it('cancels editing correctly', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoItemList {...defaultProps} />)
    
    // Start editing
    const editButtons = screen.getAllByRole('button', { name: /editar/i })
    await user.click(editButtons[0])
    
    // Change quantity
    const quantityInput = screen.getByDisplayValue('2')
    await user.clear(quantityInput)
    await user.type(quantityInput, '5')
    
    // Cancel editing
    const cancelButton = screen.getByRole('button', { name: /cancelar/i })
    await user.click(cancelButton)
    
    // Should revert to original value
    expect(screen.getByDisplayValue('2')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('5')).not.toBeInTheDocument()
    
    // Should show edit button again
    expect(screen.getAllByRole('button', { name: /editar/i })).toHaveLength(2)
  })

  it('deletes item correctly', async () => {
    const user = userEvent.setup()
    const mockDelete = vi.mocked(plantillaEquipoItemService.deletePlantillaEquipoItem)
    mockDelete.mockResolvedValue()

    render(<PlantillaEquipoItemList {...defaultProps} />)
    
    // Click delete button
    const deleteButtons = screen.getAllByRole('button', { name: /eliminar/i })
    await user.click(deleteButtons[0])
    
    // Confirm deletion in dialog
    const confirmButton = screen.getByRole('button', { name: /eliminar/i })
    await user.click(confirmButton)
    
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('1')
      expect(defaultProps.onItemDeleted).toHaveBeenCalledWith('1')
    })
  })

  it('shows loading state during save', async () => {
    const user = userEvent.setup()
    const mockUpdate = vi.mocked(plantillaEquipoItemService.updatePlantillaEquipoItem)
    // Make promise never resolve to test loading state
    mockUpdate.mockImplementation(() => new Promise(() => {}))

    render(<PlantillaEquipoItemList {...defaultProps} />)
    
    // Start editing and save
    const editButtons = screen.getAllByRole('button', { name: /editar/i })
    await user.click(editButtons[0])
    
    const saveButton = screen.getByRole('button', { name: /guardar/i })
    await user.click(saveButton)
    
    // Should show loading state
    await waitFor(() => {
      expect(saveButton).toBeDisabled()
      expect(screen.getByRole('button', { name: /cancelar/i })).toBeDisabled()
    })
  })

  it('shows loading state during delete', async () => {
    const user = userEvent.setup()
    const mockDelete = vi.mocked(plantillaEquipoItemService.deletePlantillaEquipoItem)
    // Make promise never resolve to test loading state
    mockDelete.mockImplementation(() => new Promise(() => {}))

    render(<PlantillaEquipoItemList {...defaultProps} />)
    
    // Click delete and confirm
    const deleteButtons = screen.getAllByRole('button', { name: /eliminar/i })
    await user.click(deleteButtons[0])
    
    const confirmButton = screen.getByRole('button', { name: /eliminar/i })
    await user.click(confirmButton)
    
    // Should show loading state
    await waitFor(() => {
      expect(confirmButton).toBeDisabled()
    })
  })

  it('handles service errors gracefully during save', async () => {
    const user = userEvent.setup()
    const mockUpdate = vi.mocked(plantillaEquipoItemService.updatePlantillaEquipoItem)
    mockUpdate.mockRejectedValue(new Error('Service error'))

    render(<PlantillaEquipoItemList {...defaultProps} />)
    
    // Start editing and save
    const editButtons = screen.getAllByRole('button', { name: /editar/i })
    await user.click(editButtons[0])
    
    const saveButton = screen.getByRole('button', { name: /guardar/i })
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(screen.getByText(/error al actualizar la cantidad/i)).toBeInTheDocument()
    })
  })

  it('handles service errors gracefully during delete', async () => {
    const user = userEvent.setup()
    const mockDelete = vi.mocked(plantillaEquipoItemService.deletePlantillaEquipoItem)
    mockDelete.mockRejectedValue(new Error('Service error'))

    render(<PlantillaEquipoItemList {...defaultProps} />)
    
    // Click delete and confirm
    const deleteButtons = screen.getAllByRole('button', { name: /eliminar/i })
    await user.click(deleteButtons[0])
    
    const confirmButton = screen.getByRole('button', { name: /eliminar/i })
    await user.click(confirmButton)
    
    await waitFor(() => {
      expect(screen.getByText(/error al eliminar el equipo/i)).toBeInTheDocument()
    })
  })

  it('updates totals when quantity changes during editing', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoItemList {...defaultProps} />)
    
    // Start editing first item
    const editButtons = screen.getAllByRole('button', { name: /editar/i })
    await user.click(editButtons[0])
    
    // Change quantity from 2 to 3
    const quantityInput = screen.getByDisplayValue('2')
    await user.clear(quantityInput)
    await user.type(quantityInput, '3')
    
    // Should show updated totals (3 * 100 = 300, 3 * 150 = 450)
    expect(screen.getByText('$300.00')).toBeInTheDocument() // Internal total
    expect(screen.getByText('$450.00')).toBeInTheDocument() // Client total
  })

  it('disables save button when quantity is invalid', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoItemList {...defaultProps} />)
    
    // Start editing
    const editButtons = screen.getAllByRole('button', { name: /editar/i })
    await user.click(editButtons[0])
    
    // Set invalid quantity
    const quantityInput = screen.getByDisplayValue('2')
    await user.clear(quantityInput)
    await user.type(quantityInput, '0')
    
    // Save button should be disabled
    const saveButton = screen.getByRole('button', { name: /guardar/i })
    expect(saveButton).toBeDisabled()
  })

  it('shows correct profit margin colors', () => {
    const itemsWithDifferentMargins: PlantillaEquipoItem[] = [
      {
        ...mockItems[0],
        costoInterno: 100,
        costoCliente: 140 // 40% margin - should be green
      },
      {
        ...mockItems[1],
        costoInterno: 100,
        costoCliente: 120 // 20% margin - should be yellow
      }
    ]

    render(<PlantillaEquipoItemList {...defaultProps} items={itemsWithDifferentMargins} />)
    
    // Should show different margin percentages
    expect(screen.getByText('40.0%')).toBeInTheDocument()
    expect(screen.getByText('20.0%')).toBeInTheDocument()
  })

  it('sorts items correctly by different criteria', () => {
    const unsortedItems = [...mockItems].reverse() // Reverse order
    render(<PlantillaEquipoItemList {...defaultProps} items={unsortedItems} />)
    
    // Items should appear in the order they were provided
    const rows = screen.getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Equipo Test 2') // First data row
    expect(rows[2]).toHaveTextContent('Equipo Test 1') // Second data row
  })

  it('shows skeleton when loading', () => {
    render(<PlantillaEquipoItemList {...defaultProps} isLoading={true} />)
    
    // Should not show actual items
    expect(screen.queryByText('Equipo Test 1')).not.toBeInTheDocument()
    expect(screen.queryByText('Equipo Test 2')).not.toBeInTheDocument()
  })
})
