import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { toast } from 'sonner'
import ProveedorList from '../ProveedorList'
import type { Proveedor } from '@/types/proveedor'

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

describe('ProveedorList', () => {
  const mockOnUpdate = vi.fn()
  const mockOnDelete = vi.fn()

  const mockProveedores: Proveedor[] = [
    {
      id: '1',
      nombre: 'Proveedor A',
      ruc: '12345678901',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      nombre: 'Proveedor B',
      ruc: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '3',
      nombre: 'Proveedor C',
      ruc: '98765432109',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const defaultProps = {
    data: mockProveedores,
    onUpdate: mockOnUpdate,
    onDelete: mockOnDelete,
    loading: false,
  }

  it('renders list of proveedores correctly', () => {
    render(<ProveedorList {...defaultProps} />)
    
    expect(screen.getByText('Lista de Proveedores')).toBeInTheDocument()
    expect(screen.getByText('3 proveedores')).toBeInTheDocument()
    expect(screen.getByText('Proveedor A')).toBeInTheDocument()
    expect(screen.getByText('Proveedor B')).toBeInTheDocument()
    expect(screen.getByText('Proveedor C')).toBeInTheDocument()
  })

  it('shows loading skeleton when loading is true', () => {
    render(<ProveedorList {...defaultProps} loading={true} />)
    
    // Should show skeleton loaders instead of actual content
    expect(screen.queryByText('Proveedor A')).not.toBeInTheDocument()
  })

  it('shows empty state when no proveedores exist', () => {
    render(<ProveedorList {...defaultProps} data={[]} />)
    
    expect(screen.getByText('No hay proveedores registrados')).toBeInTheDocument()
    expect(screen.getByText('Comienza agregando tu primer proveedor usando el formulario de arriba')).toBeInTheDocument()
  })

  it('filters proveedores by search term', () => {
    render(<ProveedorList {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Buscar proveedores...')
    fireEvent.change(searchInput, { target: { value: 'Proveedor A' } })
    
    expect(screen.getByText('Proveedor A')).toBeInTheDocument()
    expect(screen.queryByText('Proveedor B')).not.toBeInTheDocument()
    expect(screen.queryByText('Proveedor C')).not.toBeInTheDocument()
    expect(screen.getByText('1 proveedor')).toBeInTheDocument()
  })

  it('filters proveedores by RUC', () => {
    render(<ProveedorList {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Buscar proveedores...')
    fireEvent.change(searchInput, { target: { value: '12345678901' } })
    
    expect(screen.getByText('Proveedor A')).toBeInTheDocument()
    expect(screen.queryByText('Proveedor B')).not.toBeInTheDocument()
    expect(screen.queryByText('Proveedor C')).not.toBeInTheDocument()
  })

  it('shows no results message when search yields no results', () => {
    render(<ProveedorList {...defaultProps} />)
    
    const searchInput = screen.getByPlaceholderText('Buscar proveedores...')
    fireEvent.change(searchInput, { target: { value: 'Nonexistent' } })
    
    expect(screen.getByText('No se encontraron proveedores')).toBeInTheDocument()
    expect(screen.getByText('No hay proveedores que coincidan con tu búsqueda "Nonexistent"')).toBeInTheDocument()
    
    const clearButton = screen.getByText('Limpiar búsqueda')
    fireEvent.click(clearButton)
    
    expect(screen.getByText('Proveedor A')).toBeInTheDocument()
  })

  it('displays correct status badges', () => {
    render(<ProveedorList {...defaultProps} />)
    
    // Proveedor A and C have RUC, so should show "Formal"
    const formalBadges = screen.getAllByText('Formal')
    expect(formalBadges).toHaveLength(2)
    
    // Proveedor B has no RUC, so should show "Informal"
    expect(screen.getByText('Informal')).toBeInTheDocument()
  })

  it('enters edit mode when edit button is clicked', async () => {
    render(<ProveedorList {...defaultProps} />)
    
    // Click on the first dropdown menu
    const dropdownTriggers = screen.getAllByRole('button', { name: '' })
    fireEvent.click(dropdownTriggers[0])
    
    // Click edit option
    const editButton = screen.getByText('Editar')
    fireEvent.click(editButton)
    
    // Should show input fields
    expect(screen.getByDisplayValue('Proveedor A')).toBeInTheDocument()
    expect(screen.getByDisplayValue('12345678901')).toBeInTheDocument()
  })

  it('saves changes when save button is clicked', async () => {
    const mockResolvedUpdate = vi.fn().mockResolvedValue(undefined)
    render(<ProveedorList {...defaultProps} onUpdate={mockResolvedUpdate} />)
    
    // Enter edit mode
    const dropdownTriggers = screen.getAllByRole('button', { name: '' })
    fireEvent.click(dropdownTriggers[0])
    const editButton = screen.getByText('Editar')
    fireEvent.click(editButton)
    
    // Modify the name
    const nameInput = screen.getByDisplayValue('Proveedor A')
    fireEvent.change(nameInput, { target: { value: 'Updated Proveedor A' } })
    
    // Save changes
    const saveButton = screen.getByRole('button', { name: '' })
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(mockResolvedUpdate).toHaveBeenCalledWith('1', {
        nombre: 'Updated Proveedor A',
        ruc: '12345678901',
      })
    })
  })

  it('cancels edit mode when cancel button is clicked', async () => {
    render(<ProveedorList {...defaultProps} />)
    
    // Enter edit mode
    const dropdownTriggers = screen.getAllByRole('button', { name: '' })
    fireEvent.click(dropdownTriggers[0])
    const editButton = screen.getByText('Editar')
    fireEvent.click(editButton)
    
    // Cancel edit
    const cancelButton = screen.getAllByRole('button', { name: '' })[1] // Second button is cancel
    fireEvent.click(cancelButton)
    
    // Should exit edit mode
    expect(screen.queryByDisplayValue('Proveedor A')).not.toBeInTheDocument()
    expect(screen.getByText('Proveedor A')).toBeInTheDocument()
  })

  it('shows validation error when trying to save empty name', async () => {
    render(<ProveedorList {...defaultProps} />)
    
    // Enter edit mode
    const dropdownTriggers = screen.getAllByRole('button', { name: '' })
    fireEvent.click(dropdownTriggers[0])
    const editButton = screen.getByText('Editar')
    fireEvent.click(editButton)
    
    // Clear the name
    const nameInput = screen.getByDisplayValue('Proveedor A')
    fireEvent.change(nameInput, { target: { value: '' } })
    
    // Try to save
    const saveButton = screen.getByRole('button', { name: '' })
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('El nombre es obligatorio')
    })
    
    expect(mockOnUpdate).not.toHaveBeenCalled()
  })

  it('opens delete confirmation dialog', async () => {
    render(<ProveedorList {...defaultProps} />)
    
    // Click on dropdown menu
    const dropdownTriggers = screen.getAllByRole('button', { name: '' })
    fireEvent.click(dropdownTriggers[0])
    
    // Click delete option
    const deleteButton = screen.getByText('Eliminar')
    fireEvent.click(deleteButton)
    
    // Should show confirmation dialog
    expect(screen.getByText('Confirmar eliminación')).toBeInTheDocument()
    expect(screen.getByText(/¿Estás seguro de que deseas eliminar el proveedor.*Proveedor A/)).toBeInTheDocument()
  })

  it('deletes proveedor when confirmed', async () => {
    const mockResolvedDelete = vi.fn().mockResolvedValue(undefined)
    render(<ProveedorList {...defaultProps} onDelete={mockResolvedDelete} />)
    
    // Open delete dialog
    const dropdownTriggers = screen.getAllByRole('button', { name: '' })
    fireEvent.click(dropdownTriggers[0])
    const deleteButton = screen.getByText('Eliminar')
    fireEvent.click(deleteButton)
    
    // Confirm deletion
    const confirmButton = screen.getByRole('button', { name: /eliminar/i })
    fireEvent.click(confirmButton)
    
    await waitFor(() => {
      expect(mockResolvedDelete).toHaveBeenCalledWith('1')
    })
  })

  it('cancels deletion when cancel is clicked', () => {
    render(<ProveedorList {...defaultProps} />)
    
    // Open delete dialog
    const dropdownTriggers = screen.getAllByRole('button', { name: '' })
    fireEvent.click(dropdownTriggers[0])
    const deleteButton = screen.getByText('Eliminar')
    fireEvent.click(deleteButton)
    
    // Cancel deletion
    const cancelButton = screen.getByText('Cancelar')
    fireEvent.click(cancelButton)
    
    // Dialog should close
    expect(screen.queryByText('Confirmar eliminación')).not.toBeInTheDocument()
    expect(mockOnDelete).not.toHaveBeenCalled()
  })

  it('handles update error gracefully', async () => {
    const mockRejectedUpdate = vi.fn().mockRejectedValue(new Error('Server error'))
    render(<ProveedorList {...defaultProps} onUpdate={mockRejectedUpdate} />)
    
    // Enter edit mode and try to save
    const dropdownTriggers = screen.getAllByRole('button', { name: '' })
    fireEvent.click(dropdownTriggers[0])
    const editButton = screen.getByText('Editar')
    fireEvent.click(editButton)
    
    const saveButton = screen.getByRole('button', { name: '' })
    fireEvent.click(saveButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al actualizar proveedor')
    })
  })

  it('handles delete error gracefully', async () => {
    const mockRejectedDelete = vi.fn().mockRejectedValue(new Error('Server error'))
    render(<ProveedorList {...defaultProps} onDelete={mockRejectedDelete} />)
    
    // Open delete dialog and confirm
    const dropdownTriggers = screen.getAllByRole('button', { name: '' })
    fireEvent.click(dropdownTriggers[0])
    const deleteButton = screen.getByText('Eliminar')
    fireEvent.click(deleteButton)
    
    const confirmButton = screen.getByRole('button', { name: /eliminar/i })
    fireEvent.click(confirmButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al eliminar proveedor')
    })
  })
})
