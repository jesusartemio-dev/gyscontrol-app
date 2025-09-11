import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import PlantillaEquipoAccordion from '../PlantillaEquipoAccordion'
import type { PlantillaEquipo, PlantillaEquipoItem } from '@/types'
import * as plantillaEquipoService from '@/lib/services/plantillaEquipo'

// Mock the services
vi.mock('@/lib/services/plantillaEquipo', () => ({
  updatePlantillaEquipo: vi.fn(),
  deletePlantillaEquipo: vi.fn()
}))

// Mock framer-motion to avoid animation issues in tests
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>
  },
  AnimatePresence: ({ children }: any) => children
}))

const mockPlantillaEquipo: PlantillaEquipo = {
  id: '1',
  nombre: 'Plantilla Test',
  descripcion: 'Descripción test',
  subtotalInterno: 100,
  subtotalCliente: 150,
  items: [
    {
      id: '1',
      plantillaEquipoId: '1',
      equipoId: '1',
      cantidad: 2,
      costoInterno: 100,
      costoCliente: 150,
      equipo: {
        id: '1',
        codigo: 'EQ001',
        descripcion: 'Equipo Test',
        marca: 'Test Brand',
        precioInterno: 50,
        precioVenta: 75,
        categoriaId: '1',
        unidadId: '1',
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z'
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    }
  ] as PlantillaEquipoItem[],
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z'
}

const defaultProps = {
  equipo: mockPlantillaEquipo,
  onCreated: vi.fn(),
  onDeleted: vi.fn(),
  onUpdated: vi.fn(),
  onDeletedGrupo: vi.fn(),
  onUpdatedNombre: vi.fn()
}

describe('PlantillaEquipoAccordion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders correctly with equipo data', () => {
    render(<PlantillaEquipoAccordion {...defaultProps} />)
    
    expect(screen.getByText('Plantilla Test')).toBeInTheDocument()
    // Check for cost display
    expect(screen.getByText(/Cliente:/)).toBeInTheDocument()
    expect(screen.getByText(/Interno:/)).toBeInTheDocument()
  })

  it('shows skeleton when loading', () => {
    render(<PlantillaEquipoAccordion {...defaultProps} isLoading={true} />)
    
    // Should show skeleton instead of content
    expect(screen.queryByText('Plantilla Test')).not.toBeInTheDocument()
  })

  it('handles name editing correctly', async () => {
    const user = userEvent.setup()
    const mockUpdate = vi.mocked(plantillaEquipoService.updatePlantillaEquipo)
    mockUpdate.mockResolvedValue({ ...mockPlantillaEquipo, nombre: 'Nuevo Nombre' })

    render(<PlantillaEquipoAccordion {...defaultProps} />)
    
    // Click edit button
    const editButton = screen.getByRole('button', { name: /editar/i })
    await user.click(editButton)
    
    // Input should be visible
    const input = screen.getByDisplayValue('Plantilla Test')
    expect(input).toBeInTheDocument()
    
    // Change name
    await user.clear(input)
    await user.type(input, 'Nuevo Nombre')
    
    // Save changes
    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith('1', { nombre: 'Nuevo Nombre' })
      expect(defaultProps.onUpdated).toHaveBeenCalled()
    })
  })

  it('validates name input correctly', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoAccordion {...defaultProps} />)
    
    // Start editing
    const editButton = screen.getByRole('button', { name: /editar/i })
    await user.click(editButton)
    
    const input = screen.getByDisplayValue('Plantilla Test')
    
    // Test empty name
    await user.clear(input)
    expect(screen.getByText('El nombre no puede estar vacío')).toBeInTheDocument()
    
    // Test short name
    await user.type(input, 'AB')
    expect(screen.getByText('El nombre debe tener al menos 3 caracteres')).toBeInTheDocument()
    
    // Test long name
    await user.clear(input)
    await user.type(input, 'A'.repeat(101))
    expect(screen.getByText('El nombre no puede tener más de 100 caracteres')).toBeInTheDocument()
  })

  it('cancels editing correctly', async () => {
    const user = userEvent.setup()
    render(<PlantillaEquipoAccordion {...defaultProps} />)
    
    // Start editing
    const editButton = screen.getByRole('button', { name: /editar/i })
    await user.click(editButton)
    
    const input = screen.getByDisplayValue('Plantilla Test')
    await user.clear(input)
    await user.type(input, 'Nombre Temporal')
    
    // Cancel editing
    const cancelButton = screen.getByRole('button', { name: /cancel/i })
    await user.click(cancelButton)
    
    // Should show original name
    expect(screen.getByText('Plantilla Test')).toBeInTheDocument()
    expect(screen.queryByDisplayValue('Nombre Temporal')).not.toBeInTheDocument()
  })

  it('handles deletion correctly', async () => {
    const user = userEvent.setup()
    const mockDelete = vi.mocked(plantillaEquipoService.deletePlantillaEquipo)
    mockDelete.mockResolvedValue()

    render(<PlantillaEquipoAccordion {...defaultProps} />)
    
    // Click delete button
    const deleteButton = screen.getByRole('button', { name: /eliminar/i })
    await user.click(deleteButton)
    
    // Confirm deletion in dialog
    const confirmButton = screen.getByRole('button', { name: /eliminar/i })
    await user.click(confirmButton)
    
    await waitFor(() => {
      expect(mockDelete).toHaveBeenCalledWith('1')
      expect(defaultProps.onDeleted).toHaveBeenCalledWith('1')
    })
  })

  it('displays correct statistics', () => {
    render(<PlantillaEquipoAccordion {...defaultProps} />)
    
    // Check equipment count
    expect(screen.getByText('1')).toBeInTheDocument() // Equipment count
    
    // Check total client cost (150 USD)
    expect(screen.getByText(/\$150\.00/)).toBeInTheDocument()
    
    // Check rental calculation (15% of 150 = 22.50)
    expect(screen.getByText(/\$22\.50/)).toBeInTheDocument()
    
    // Check profit margin ((150-100)/100 * 100 = 50%)
    expect(screen.getByText('50.0%')).toBeInTheDocument()
  })

  it('handles multiple items correctly', () => {
    const plantillaWithMultipleItems = {
      ...mockPlantillaEquipo,
      items: [
        ...mockPlantillaEquipo.items!,
        {
          id: '2',
          plantillaEquipoId: '1',
          equipoId: '2',
          cantidad: 1,
          costoInterno: 200,
          costoCliente: 300,
          equipo: {
            id: '2',
            codigo: 'EQ002',
            descripcion: 'Equipo Test 2',
            marca: 'Test Brand 2',
            precioInterno: 200,
            precioVenta: 300,
            categoriaId: '1',
            unidadId: '1',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z'
          },
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ] as PlantillaEquipoItem[]
    }

    render(<PlantillaEquipoAccordion {...defaultProps} equipo={plantillaWithMultipleItems} />)
    
    // Should show plural form
    expect(screen.getByText('2 equipos')).toBeInTheDocument()
    
    // Total should be 150 + 300 = 450
    expect(screen.getByText(/\$450\.00/)).toBeInTheDocument()
  })

  it('handles service errors gracefully', async () => {
    const user = userEvent.setup()
    const mockUpdate = vi.mocked(plantillaEquipoService.updatePlantillaEquipo)
    mockUpdate.mockRejectedValue(new Error('Service error'))

    render(<PlantillaEquipoAccordion {...defaultProps} />)
    
    // Start editing and save
    const editButton = screen.getByRole('button', { name: /editar/i })
    await user.click(editButton)
    
    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)
    
    await waitFor(() => {
      expect(screen.getByText(/Error al actualizar nombre/)).toBeInTheDocument()
    })
  })

  it('disables buttons during loading', async () => {
    const user = userEvent.setup()
    const mockUpdate = vi.mocked(plantillaEquipoService.updatePlantillaEquipo)
    // Make the promise never resolve to test loading state
    mockUpdate.mockImplementation(() => new Promise(() => {}))

    render(<PlantillaEquipoAccordion {...defaultProps} />)
    
    // Start editing
    const editButton = screen.getByRole('button', { name: /editar/i })
    await user.click(editButton)
    
    const saveButton = screen.getByRole('button', { name: /save/i })
    await user.click(saveButton)
    
    // Buttons should be disabled during loading
    await waitFor(() => {
      expect(saveButton).toBeDisabled()
    })
  })
})
