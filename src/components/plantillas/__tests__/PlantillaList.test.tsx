import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PlantillaList from '../PlantillaList'
import { deletePlantilla, updatePlantilla } from '@/lib/services/plantilla'
import type { Plantilla } from '@/app/comercial/plantillas/page'

// Mock dependencies
jest.mock('@/lib/services/plantilla')
jest.mock('next/link', () => {
  return ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  )
})
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>
  }
}))
jest.mock('@/components/ConfirmDialog', () => {
  return function MockConfirmDialog({ isOpen, onConfirm, onClose, title, description }: any) {
    if (!isOpen) return null
    return (
      <div data-testid="confirm-dialog">
        <h2>{title}</h2>
        <p>{description}</p>
        <button onClick={onConfirm}>Confirmar</button>
        <button onClick={onClose}>Cancelar</button>
      </div>
    )
  }
})

const mockDeletePlantilla = deletePlantilla as jest.MockedFunction<typeof deletePlantilla>
const mockUpdatePlantilla = updatePlantilla as jest.MockedFunction<typeof updatePlantilla>

const mockPlantillas: Plantilla[] = [
  {
    id: '1',
    nombre: 'Plantilla Sistema Eléctrico',
    totalInterno: 1500.50,
    totalCliente: 2000.75
  },
  {
    id: '2',
    nombre: 'Plantilla Vacía',
    totalInterno: 0,
    totalCliente: 0
  }
]

describe('PlantillaList', () => {
  const mockOnDelete = jest.fn()
  const mockOnUpdated = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Empty State', () => {
    it('renders empty state when no plantillas', () => {
      render(
        <PlantillaList
          plantillas={[]}
          onDelete={mockOnDelete}
          onUpdated={mockOnUpdated}
        />
      )
      
      expect(screen.getByText('No hay plantillas')).toBeInTheDocument()
      expect(screen.getByText('Crea tu primera plantilla para comenzar a gestionar tus cotizaciones comerciales.')).toBeInTheDocument()
    })
  })

  describe('List Rendering', () => {
    it('renders plantillas list with correct data', () => {
      render(
        <PlantillaList
          plantillas={mockPlantillas}
          onDelete={mockOnDelete}
          onUpdated={mockOnUpdated}
        />
      )
      
      expect(screen.getByText('Plantillas (2)')).toBeInTheDocument()
      expect(screen.getByText('Gestiona tus plantillas de cotización comercial')).toBeInTheDocument()
      
      // Check plantilla names
      expect(screen.getByText('Plantilla Sistema Eléctrico')).toBeInTheDocument()
      expect(screen.getByText('Plantilla Vacía')).toBeInTheDocument()
      
      // Check formatted currency
      expect(screen.getByText('$2,000.75')).toBeInTheDocument()
    expect(screen.getByText('$1,500.50')).toBeInTheDocument()
    expect(screen.getAllByText('$0.00')).toHaveLength(2)
    })

    it('renders correct status badges', () => {
      render(
        <PlantillaList
          plantillas={mockPlantillas}
          onDelete={mockOnDelete}
          onUpdated={mockOnUpdated}
        />
      )
      
      expect(screen.getByText('Configurada')).toBeInTheDocument()
      expect(screen.getByText('Vacía')).toBeInTheDocument()
    })

    it('renders action buttons for each plantilla', () => {
      render(
        <PlantillaList
          plantillas={mockPlantillas}
          onDelete={mockOnDelete}
          onUpdated={mockOnUpdated}
        />
      )
      
      // Should have view and delete buttons for each plantilla
      const viewLinks = screen.getAllByRole('link')
      expect(viewLinks).toHaveLength(2)
      expect(viewLinks[0]).toHaveAttribute('href', '/comercial/plantillas/1')
      expect(viewLinks[1]).toHaveAttribute('href', '/comercial/plantillas/2')
      
      const deleteButtons = screen.getAllByRole('button', { name: '' })
      expect(deleteButtons.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Edit Functionality', () => {
    it('enters edit mode when edit button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <PlantillaList
          plantillas={mockPlantillas}
          onDelete={mockOnDelete}
          onUpdated={mockOnUpdated}
        />
      )
      
      // Find and click edit button (should appear on hover)
      const row = screen.getByText('Plantilla Sistema Eléctrico').closest('tr')
      expect(row).toBeInTheDocument()
      
      // Simulate hover to show edit button
      if (row) {
        fireEvent.mouseEnter(row)
        const editButtons = screen.getAllByRole('button')
        const editButton = editButtons.find(btn => btn.querySelector('svg'))
        if (editButton) {
          await user.click(editButton)
        }
      }
    })

    it('saves edit when valid name is provided', async () => {
      const user = userEvent.setup()
      const updatedPlantilla = { ...mockPlantillas[0], nombre: 'Nuevo Nombre' }
      mockUpdatePlantilla.mockResolvedValue(updatedPlantilla)
      
      render(
        <PlantillaList
          plantillas={mockPlantillas}
          onDelete={mockOnDelete}
          onUpdated={mockOnUpdated}
        />
      )
      
      // Simulate entering edit mode and saving
      const row = screen.getByText('Plantilla Sistema Eléctrico').closest('tr')
      if (row) {
        fireEvent.mouseEnter(row)
        const editButtons = screen.getAllByRole('button')
        const editButton = editButtons.find(btn => btn.querySelector('svg'))
        if (editButton) {
          await user.click(editButton)
          
          // Should show input field
          const input = screen.getByDisplayValue('Plantilla Sistema Eléctrico')
          await user.clear(input)
          await user.type(input, 'Nuevo Nombre')
          
          // Click save button
          const saveButton = screen.getByText('Guardar')
          await user.click(saveButton)
          
          expect(mockUpdatePlantilla).toHaveBeenCalledWith('1', { nombre: 'Nuevo Nombre' })
          
          await waitFor(() => {
            expect(mockOnUpdated).toHaveBeenCalledWith(updatedPlantilla)
          })
        }
      }
    })

    it('shows error for short name during edit', async () => {
      const user = userEvent.setup()
      render(
        <PlantillaList
          plantillas={mockPlantillas}
          onDelete={mockOnDelete}
          onUpdated={mockOnUpdated}
        />
      )
      
      // Simulate entering edit mode
      const row = screen.getByText('Plantilla Sistema Eléctrico').closest('tr')
      if (row) {
        fireEvent.mouseEnter(row)
        const editButtons = screen.getAllByRole('button')
        const editButton = editButtons.find(btn => btn.querySelector('svg'))
        if (editButton) {
          await user.click(editButton)
          
          const input = screen.getByDisplayValue('Plantilla Sistema Eléctrico')
          await user.clear(input)
          await user.type(input, 'AB')
          
          const saveButton = screen.getByText('Guardar')
          await user.click(saveButton)
          
          expect(screen.getByText('El nombre debe tener al menos 3 caracteres')).toBeInTheDocument()
          expect(mockUpdatePlantilla).not.toHaveBeenCalled()
        }
      }
    })

    it('cancels edit mode', async () => {
      const user = userEvent.setup()
      render(
        <PlantillaList
          plantillas={mockPlantillas}
          onDelete={mockOnDelete}
          onUpdated={mockOnUpdated}
        />
      )
      
      // Enter edit mode and cancel
      const row = screen.getByText('Plantilla Sistema Eléctrico').closest('tr')
      if (row) {
        fireEvent.mouseEnter(row)
        const editButtons = screen.getAllByRole('button')
        const editButton = editButtons.find(btn => btn.querySelector('svg'))
        if (editButton) {
          await user.click(editButton)
          
          const cancelButton = screen.getByText('Cancelar')
          await user.click(cancelButton)
          
          // Should return to normal view
          expect(screen.getByText('Plantilla Sistema Eléctrico')).toBeInTheDocument()
          expect(screen.queryByDisplayValue('Plantilla Sistema Eléctrico')).not.toBeInTheDocument()
        }
      }
    })
  })

  describe('Delete Functionality', () => {
    it('shows confirm dialog when delete is clicked', async () => {
      const user = userEvent.setup()
      render(
        <PlantillaList
          plantillas={mockPlantillas}
          onDelete={mockOnDelete}
          onUpdated={mockOnUpdated}
        />
      )
      
      // Find delete button
      const deleteButtons = screen.getAllByRole('button')
      const deleteButton = deleteButtons.find(btn => 
        btn.className.includes('text-red-600')
      )
      
      if (deleteButton) {
        await user.click(deleteButton)
        
        expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument()
        expect(screen.getByText('Eliminar Plantilla')).toBeInTheDocument()
        expect(screen.getByText('¿Estás seguro de que deseas eliminar esta plantilla? Esta acción no se puede deshacer.')).toBeInTheDocument()
      }
    })

    it('deletes plantilla when confirmed', async () => {
      const user = userEvent.setup()
      mockDeletePlantilla.mockResolvedValue(undefined)
      
      render(
        <PlantillaList
          plantillas={mockPlantillas}
          onDelete={mockOnDelete}
          onUpdated={mockOnUpdated}
        />
      )
      
      // Click delete and confirm
      const deleteButtons = screen.getAllByRole('button')
      const deleteButton = deleteButtons.find(btn => 
        btn.className.includes('text-red-600')
      )
      
      if (deleteButton) {
        await user.click(deleteButton)
        
        const confirmButton = screen.getByText('Confirmar')
        await user.click(confirmButton)
        
        expect(mockDeletePlantilla).toHaveBeenCalledWith('1')
        
        await waitFor(() => {
          expect(mockOnDelete).toHaveBeenCalledWith('1')
        })
      }
    })

    it('cancels delete when dialog is closed', async () => {
      const user = userEvent.setup()
      render(
        <PlantillaList
          plantillas={mockPlantillas}
          onDelete={mockOnDelete}
          onUpdated={mockOnUpdated}
        />
      )
      
      // Click delete and cancel
      const deleteButtons = screen.getAllByRole('button')
      const deleteButton = deleteButtons.find(btn => 
        btn.className.includes('text-red-600')
      )
      
      if (deleteButton) {
        await user.click(deleteButton)
        
        const cancelButton = screen.getByText('Cancelar')
        await user.click(cancelButton)
        
        expect(screen.queryByTestId('confirm-dialog')).not.toBeInTheDocument()
        expect(mockDeletePlantilla).not.toHaveBeenCalled()
      }
    })
  })

  describe('Error Handling', () => {
    it('shows error when update fails', async () => {
      const user = userEvent.setup()
      mockUpdatePlantilla.mockRejectedValue(new Error('Network error'))
      
      render(
        <PlantillaList
          plantillas={mockPlantillas}
          onDelete={mockOnDelete}
          onUpdated={mockOnUpdated}
        />
      )
      
      // Simulate edit and save with error
      const row = screen.getByText('Plantilla Sistema Eléctrico').closest('tr')
      if (row) {
        fireEvent.mouseEnter(row)
        const editButtons = screen.getAllByRole('button')
        const editButton = editButtons.find(btn => btn.querySelector('svg'))
        if (editButton) {
          await user.click(editButton)
          
          const saveButton = screen.getByText('Guardar')
          await user.click(saveButton)
          
          await waitFor(() => {
            expect(screen.getByText('Error al actualizar la plantilla. Por favor, inténtalo de nuevo.')).toBeInTheDocument()
          })
        }
      }
    })

    it('shows error when delete fails', async () => {
      const user = userEvent.setup()
      mockDeletePlantilla.mockRejectedValue(new Error('Network error'))
      
      render(
        <PlantillaList
          plantillas={mockPlantillas}
          onDelete={mockOnDelete}
          onUpdated={mockOnUpdated}
        />
      )
      
      // Click delete and confirm with error
      const deleteButtons = screen.getAllByRole('button')
      const deleteButton = deleteButtons.find(btn => 
        btn.className.includes('text-red-600')
      )
      
      if (deleteButton) {
        await user.click(deleteButton)
        
        const confirmButton = screen.getByText('Confirmar')
        await user.click(confirmButton)
        
        await waitFor(() => {
          expect(screen.getByText('Error al eliminar la plantilla. Por favor, inténtalo de nuevo.')).toBeInTheDocument()
        })
      }
    })
  })

  describe('Loading States', () => {
    it('shows loading state during update', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: Plantilla) => void
      const promise = new Promise<Plantilla>((resolve) => {
        resolvePromise = resolve
      })
      mockUpdatePlantilla.mockReturnValue(promise)
      
      render(
        <PlantillaList
          plantillas={mockPlantillas}
          onDelete={mockOnDelete}
          onUpdated={mockOnUpdated}
        />
      )
      
      // Start edit and save
      const row = screen.getByText('Plantilla Sistema Eléctrico').closest('tr')
      if (row) {
        fireEvent.mouseEnter(row)
        const editButtons = screen.getAllByRole('button')
        const editButton = editButtons.find(btn => btn.querySelector('svg'))
        if (editButton) {
          await user.click(editButton)
          
          const saveButton = screen.getByText('Guardar')
          await user.click(saveButton)
          
          // Should show loading spinner
          expect(screen.getByRole('button', { name: '' })).toBeDisabled()
          
          // Resolve promise
          resolvePromise!({ ...mockPlantillas[0], nombre: 'Updated' })
        }
      }
    })
  })
})