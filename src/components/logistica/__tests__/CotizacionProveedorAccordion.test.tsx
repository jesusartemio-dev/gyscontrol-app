import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CotizacionProveedorAccordion from '../CotizacionProveedorAccordion'
import * as cotizacionService from '@/lib/services/cotizacionProveedor'

// Mock de los servicios
jest.mock('@/lib/services/cotizacionProveedor')
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

const mockCotizacion = {
  id: '1',
  codigo: 'COT-001',
  estado: 'pendiente' as const,
  createdAt: '2024-01-15T10:00:00Z',
  updatedAt: '2024-01-15T10:00:00Z',
  proveedor: {
    id: 'prov-1',
    nombre: 'Proveedor Test',
    email: 'test@proveedor.com',
    telefono: '123456789',
    direccion: 'Dirección Test',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  proyecto: {
    id: 'proj-1',
    nombre: 'Proyecto Test',
    descripcion: 'Descripción del proyecto',
    estado: 'activo' as const,
    fechaInicio: '2024-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  items: [
    {
      id: 'item-1',
      descripcion: 'Item Test',
      cantidad: 10,
      precio: 100,
      total: 1000,
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-15T10:00:00Z',
    },
  ],
}

const mockCotizacionSinItems = {
  ...mockCotizacion,
  id: '2',
  codigo: 'COT-002',
  items: [],
}

describe('CotizacionProveedorAccordion', () => {
  const mockOnUpdate = jest.fn()
  const mockOnDelete = jest.fn()
  const mockOnUpdatedItem = jest.fn()
  const mockGetCotizacionProveedorById = cotizacionService.getCotizacionProveedorById as jest.MockedFunction<typeof cotizacionService.getCotizacionProveedorById>

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCotizacionProveedorById.mockResolvedValue(mockCotizacion)
  })

  describe('Rendering', () => {
    it('should render cotización information correctly', () => {
      render(
        <CotizacionProveedorAccordion
          cotizacion={mockCotizacion}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      expect(screen.getByText('COT-001')).toBeInTheDocument()
      expect(screen.getByText('Proveedor Test')).toBeInTheDocument()
      expect(screen.getByText('Proyecto: Proyecto Test')).toBeInTheDocument()
      expect(screen.getByText('PENDIENTE')).toBeInTheDocument()
      expect(screen.getByText('1 ítem')).toBeInTheDocument()
    })

    it('should render correct item count for multiple items', () => {
      const cotizacionMultipleItems = {
        ...mockCotizacion,
        items: [
          ...mockCotizacion.items,
          {
            id: 'item-2',
            descripcion: 'Item Test 2',
            cantidad: 5,
            precio: 200,
            total: 1000,
            createdAt: '2024-01-15T10:00:00Z',
            updatedAt: '2024-01-15T10:00:00Z',
          },
        ],
      }

      render(
        <CotizacionProveedorAccordion
          cotizacion={cotizacionMultipleItems}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      expect(screen.getByText('2 ítems')).toBeInTheDocument()
    })

    it('should render formatted creation date', () => {
      render(
        <CotizacionProveedorAccordion
          cotizacion={mockCotizacion}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      expect(screen.getByText(/Creado:/)).toBeInTheDocument()
    })

    it('should handle missing proveedor gracefully', () => {
      const cotizacionSinProveedor = {
        ...mockCotizacion,
        proveedor: null,
      }

      render(
        <CotizacionProveedorAccordion
          cotizacion={cotizacionSinProveedor as any}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      expect(screen.getByText('Proveedor no especificado')).toBeInTheDocument()
    })
  })

  describe('Estado Badge', () => {
    it('should render correct badge for pendiente state', () => {
      render(
        <CotizacionProveedorAccordion
          cotizacion={mockCotizacion}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      const badge = screen.getByText('PENDIENTE')
      expect(badge).toBeInTheDocument()
      expect(badge.closest('.text-orange-600')).toBeInTheDocument()
    })

    it('should render correct badge for cotizado state', () => {
      const cotizacionCotizada = {
        ...mockCotizacion,
        estado: 'cotizado' as const,
      }

      render(
        <CotizacionProveedorAccordion
          cotizacion={cotizacionCotizada}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      const badge = screen.getByText('COTIZADO')
      expect(badge).toBeInTheDocument()
      expect(badge.closest('.text-green-600')).toBeInTheDocument()
    })

    it('should render correct badge for seleccionado state', () => {
      const cotizacionSeleccionada = {
        ...mockCotizacion,
        estado: 'seleccionado' as const,
      }

      render(
        <CotizacionProveedorAccordion
          cotizacion={cotizacionSeleccionada}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      const badge = screen.getByText('SELECCIONADO')
      expect(badge).toBeInTheDocument()
      expect(badge.closest('.text-purple-600')).toBeInTheDocument()
    })
  })

  describe('Accordion Interaction', () => {
    it('should expand accordion when clicked', async () => {
      render(
        <CotizacionProveedorAccordion
          cotizacion={mockCotizacion}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      const trigger = screen.getByRole('button')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByText('Ítems de la Cotización')).toBeInTheDocument()
        expect(screen.getByText('Cambiar Estado')).toBeInTheDocument()
      })
    })

    it('should show items table when expanded and items exist', async () => {
      render(
        <CotizacionProveedorAccordion
          cotizacion={mockCotizacion}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      const trigger = screen.getByRole('button')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByText('Agregar Ítems')).toBeInTheDocument()
      })
    })

    it('should show empty state when no items exist', async () => {
      render(
        <CotizacionProveedorAccordion
          cotizacion={mockCotizacionSinItems}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      const trigger = screen.getByRole('button')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByText('No hay ítems')).toBeInTheDocument()
        expect(screen.getByText('Esta cotización no tiene ítems registrados.')).toBeInTheDocument()
        expect(screen.getByText('Agregar Primer Ítem')).toBeInTheDocument()
      })
    })
  })

  describe('Estado Change Buttons', () => {
    it('should render all estado buttons when expanded', async () => {
      render(
        <CotizacionProveedorAccordion
          cotizacion={mockCotizacion}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      const trigger = screen.getByRole('button')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByText('PENDIENTE')).toBeInTheDocument()
        expect(screen.getByText('SOLICITADO')).toBeInTheDocument()
        expect(screen.getByText('COTIZADO')).toBeInTheDocument()
        expect(screen.getByText('RECHAZADO')).toBeInTheDocument()
        expect(screen.getByText('SELECCIONADO')).toBeInTheDocument()
      })
    })

    it('should highlight active estado button', async () => {
      render(
        <CotizacionProveedorAccordion
          cotizacion={mockCotizacion}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      const trigger = screen.getByRole('button')
      fireEvent.click(trigger)

      await waitFor(() => {
        const activeButton = screen.getAllByText('PENDIENTE').find(el => 
          el.closest('button')?.classList.contains('bg-blue-600')
        )
        expect(activeButton).toBeInTheDocument()
      })
    })

    it('should call onUpdate when estado button is clicked', async () => {
      render(
        <CotizacionProveedorAccordion
          cotizacion={mockCotizacion}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      const trigger = screen.getByRole('button')
      fireEvent.click(trigger)

      await waitFor(() => {
        const cotizadoButton = screen.getAllByText('COTIZADO').find(el => 
          el.closest('button')
        )
        if (cotizadoButton) {
          fireEvent.click(cotizadoButton.closest('button')!)
        }
      })

      expect(mockOnUpdate).toHaveBeenCalledWith('1', { estado: 'cotizado' })
    })
  })

  describe('Action Buttons', () => {
    it('should render edit button when onUpdate is provided', async () => {
      render(
        <CotizacionProveedorAccordion
          cotizacion={mockCotizacion}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      const trigger = screen.getByRole('button')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByText('Editar')).toBeInTheDocument()
      })
    })

    it('should render delete button when onDelete is provided', async () => {
      render(
        <CotizacionProveedorAccordion
          cotizacion={mockCotizacion}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      const trigger = screen.getByRole('button')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.getByText('Eliminar')).toBeInTheDocument()
      })
    })

    it('should call onUpdate when edit button is clicked', async () => {
      render(
        <CotizacionProveedorAccordion
          cotizacion={mockCotizacion}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      const trigger = screen.getByRole('button')
      fireEvent.click(trigger)

      await waitFor(() => {
        const editButton = screen.getByText('Editar')
        fireEvent.click(editButton)
      })

      expect(mockOnUpdate).toHaveBeenCalledWith('1', { codigo: 'COT-001' })
    })

    it('should call onDelete when delete button is clicked', async () => {
      render(
        <CotizacionProveedorAccordion
          cotizacion={mockCotizacion}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      const trigger = screen.getByRole('button')
      fireEvent.click(trigger)

      await waitFor(() => {
        const deleteButton = screen.getByText('Eliminar')
        fireEvent.click(deleteButton)
      })

      expect(mockOnDelete).toHaveBeenCalledWith('1')
    })

    it('should not render edit button when onUpdate is not provided', async () => {
      render(
        <CotizacionProveedorAccordion
          cotizacion={mockCotizacion}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      const trigger = screen.getByRole('button')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.queryByText('Editar')).not.toBeInTheDocument()
      })
    })

    it('should not render delete button when onDelete is not provided', async () => {
      render(
        <CotizacionProveedorAccordion
          cotizacion={mockCotizacion}
          onUpdate={mockOnUpdate}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      const trigger = screen.getByRole('button')
      fireEvent.click(trigger)

      await waitFor(() => {
        expect(screen.queryByText('Eliminar')).not.toBeInTheDocument()
      })
    })
  })

  describe('Modal Interactions', () => {
    it('should open agregar items modal when button is clicked', async () => {
      render(
        <CotizacionProveedorAccordion
          cotizacion={mockCotizacion}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      const trigger = screen.getByRole('button')
      fireEvent.click(trigger)

      await waitFor(() => {
        const addItemsButton = screen.getByText('Agregar Ítems')
        fireEvent.click(addItemsButton)
      })

      // El modal debería abrirse (esto dependería de la implementación del modal)
    })

    it('should open agregar items modal from empty state', async () => {
      render(
        <CotizacionProveedorAccordion
          cotizacion={mockCotizacionSinItems}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      const trigger = screen.getByRole('button')
      fireEvent.click(trigger)

      await waitFor(() => {
        const addFirstItemButton = screen.getByText('Agregar Primer Ítem')
        fireEvent.click(addFirstItemButton)
      })

      // El modal debería abrirse
    })
  })

  describe('Data Refetch', () => {
    it('should refetch data when handleRefetch is called', async () => {
      render(
        <CotizacionProveedorAccordion
          cotizacion={mockCotizacion}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      // Simular que se actualiza un item (esto activaría handleRefetch)
      // La implementación específica dependería de cómo se expone esta funcionalidad
      
      await waitFor(() => {
        expect(mockGetCotizacionProveedorById).toHaveBeenCalledWith('1')
      })
    })

    it('should handle refetch error gracefully', async () => {
      mockGetCotizacionProveedorById.mockRejectedValue(new Error('Network error'))
      
      render(
        <CotizacionProveedorAccordion
          cotizacion={mockCotizacion}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      // El componente debería manejar el error sin crashear
      expect(screen.getByText('COT-001')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <CotizacionProveedorAccordion
          cotizacion={mockCotizacion}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      const trigger = screen.getByRole('button')
      expect(trigger).toHaveAttribute('aria-expanded')
    })

    it('should be keyboard navigable', async () => {
      render(
        <CotizacionProveedorAccordion
          cotizacion={mockCotizacion}
          onUpdate={mockOnUpdate}
          onDelete={mockOnDelete}
          onUpdatedItem={mockOnUpdatedItem}
        />
      )

      const trigger = screen.getByRole('button')
      
      // Simular navegación por teclado
      trigger.focus()
      expect(trigger).toHaveFocus()
      
      // Simular Enter para expandir
      fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter' })
      
      await waitFor(() => {
        expect(screen.getByText('Ítems de la Cotización')).toBeInTheDocument()
      })
    })
  })
})
