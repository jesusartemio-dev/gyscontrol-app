/**
 * 🧪 Tests para PedidoDesdeListaModal - Modal contextual para crear pedidos desde lista
 * 
 * Casos de prueba:
 * - Inicialización correcta de cantidades disponibles
 * - Actualización de cantidades después de crear pedidos
 * - Validación de cantidades máximas
 * - Reset correcto del formulario
 * - Comportamiento al crear múltiples pedidos
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import PedidoDesdeListaModal from '@/components/equipos/PedidoDesdeListaModal'
import { ListaEquipo, PedidoEquipoPayload } from '@/types'

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('date-fns', () => ({
  format: jest.fn((date, formatStr) => {
    if (formatStr === 'yyyy-MM-dd') {
      return '2025-02-03' // Mock date
    }
    return date.toISOString()
  }),
}))

const mockLista: ListaEquipo = {
  id: 'lista-1',
  nombre: 'Lista Test',
  descripcion: 'Lista para pruebas',
  estado: 'activa',
  prioridad: 'media',
  fechaCreacion: new Date().toISOString(),
  fechaActualizacion: new Date().toISOString(),
  proyectoId: 'proyecto-1',
  responsableId: 'user-1',
  numeroSecuencia: 1,
  presupuestoEstimado: 1000,
  presupuestoReal: 0,
  items: [
    {
      id: 'item-1',
      codigo: 'EQ001',
      descripcion: 'Equipo Test 1',
      cantidad: 10,
      cantidadPedida: 0, // Initially no orders
      cantidadEntregada: 0,
      unidad: 'pcs',
      precioElegido: 100,
      tiempoEntrega: '5 días',
      tiempoEntregaDias: 5,
      estado: 'activo',
      prioridad: 'media',
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      listaEquipoId: 'lista-1',
      numeroSecuencia: 1,
    },
    {
      id: 'item-2',
      codigo: 'EQ002',
      descripcion: 'Equipo Test 2',
      cantidad: 5,
      cantidadPedida: 2, // Already has 2 ordered
      cantidadEntregada: 0,
      unidad: 'pcs',
      precioElegido: 200,
      tiempoEntrega: '3 días',
      tiempoEntregaDias: 3,
      estado: 'activo',
      prioridad: 'alta',
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      listaEquipoId: 'lista-1',
      numeroSecuencia: 2,
    },
    {
      id: 'item-3',
      codigo: 'EQ003',
      descripción: 'Equipo Test 3',
      cantidad: 3,
      cantidadPedida: 3, // Fully ordered - should not appear
      cantidadEntregada: 0,
      unidad: 'pcs',
      precioElegido: 150,
      tiempoEntrega: '7 días',
      tiempoEntregaDias: 7,
      estado: 'activo',
      prioridad: 'baja',
      fechaCreacion: new Date().toISOString(),
      fechaActualizacion: new Date().toISOString(),
      listaEquipoId: 'lista-1',
      numeroSecuencia: 3,
    },
  ],
}

const mockOnCreated = jest.fn()
const mockOnRefresh = jest.fn()

const defaultProps = {
  lista: mockLista,
  proyectoId: 'proyecto-1',
  responsableId: 'user-1',
  onCreated: mockOnCreated,
  onRefresh: mockOnRefresh,
}

describe('PedidoDesdeListaModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockOnCreated.mockResolvedValue({ id: 'pedido-nuevo' })
  })

  it('should initialize with correct available quantities', async () => {
    const user = userEvent.setup()
    render(<PedidoDesdeListaModal {...defaultProps} />)

    // Open modal
    const trigger = screen.getByText('Crear Pedido')
    await user.click(trigger)

    // Should show only items with available stock
    expect(screen.getByText('EQ001')).toBeInTheDocument() // 10 available
    expect(screen.getByText('EQ002')).toBeInTheDocument() // 3 available (5-2)
    expect(screen.queryByText('EQ003')).not.toBeInTheDocument() // 0 available (3-3)

    // Check available quantities display
    expect(screen.getByText('10 disponibles')).toBeInTheDocument()
    expect(screen.getByText('3 disponibles')).toBeInTheDocument()
  })

  it('should update quantities when lista prop changes', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<PedidoDesdeListaModal {...defaultProps} />)

    // Open modal
    const trigger = screen.getByText('Crear Pedido')
    await user.click(trigger)

    // Initially EQ001 has 10 available
    expect(screen.getByText('10 disponibles')).toBeInTheDocument()

    // Update lista with new cantidadPedida
    const updatedLista = {
      ...mockLista,
      items: mockLista.items!.map(item => 
        item.id === 'item-1' 
          ? { ...item, cantidadPedida: 5 } // Now 5 ordered, 5 available
          : item
      )
    }

    rerender(<PedidoDesdeListaModal {...defaultProps} lista={updatedLista} />)

    // Should update to show 5 available
    await waitFor(() => {
      expect(screen.getByText('5 disponibles')).toBeInTheDocument()
    })
  })

  it('should validate maximum quantities when selecting items', async () => {
    const user = userEvent.setup()
    render(<PedidoDesdeListaModal {...defaultProps} />)

    // Open modal
    const trigger = screen.getByText('Crear Pedido')
    await user.click(trigger)

    // Select EQ002 (has 3 available)
    const checkbox = screen.getByLabelText(/EQ002/)
    await user.click(checkbox)

    // Try to set quantity to more than available
    const quantityInput = screen.getByDisplayValue('1')
    await user.clear(quantityInput)
    await user.type(quantityInput, '5') // More than 3 available

    // Try to submit
    const submitButton = screen.getByText('Crear Pedido')
    await user.click(submitButton)

    // Should show validation error
    expect(toast.error).toHaveBeenCalledWith('Verifique las cantidades seleccionadas')
  })

  it('should reset form correctly after creating order', async () => {
    const user = userEvent.setup()
    render(<PedidoDesdeListaModal {...defaultProps} />)

    // Open modal
    const trigger = screen.getByText('Crear Pedido')
    await user.click(trigger)

    // Select an item and set quantity
    const checkbox = screen.getByLabelText(/EQ001/)
    await user.click(checkbox)

    const quantityInput = screen.getByDisplayValue('1')
    await user.clear(quantityInput)
    await user.type(quantityInput, '3')

    // Add observation
    const observationInput = screen.getByPlaceholderText(/observaciones/i)
    await user.type(observationInput, 'Test observation')

    // Submit
    const submitButton = screen.getByText('Crear Pedido')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnCreated).toHaveBeenCalled()
    })

    // Modal should close and reopen with reset form
    await user.click(trigger)

    // Form should be reset
    expect(screen.queryByDisplayValue('Test observation')).not.toBeInTheDocument()
    
    // Items should be unselected
    const resetCheckbox = screen.getByLabelText(/EQ001/)
    expect(resetCheckbox).not.toBeChecked()
  })

  it('should handle creating multiple orders correctly', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<PedidoDesdeListaModal {...defaultProps} />)

    // First order
    const trigger = screen.getByText('Crear Pedido')
    await user.click(trigger)

    const checkbox1 = screen.getByLabelText(/EQ001/)
    await user.click(checkbox1)

    const submitButton = screen.getByText('Crear Pedido')
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockOnCreated).toHaveBeenCalledTimes(1)
    })

    // Simulate lista update after first order (EQ001 now has 5 ordered)
    const updatedLista = {
      ...mockLista,
      items: mockLista.items!.map(item => 
        item.id === 'item-1' 
          ? { ...item, cantidadPedida: 5 } // 5 ordered, 5 available
          : item
      )
    }

    rerender(<PedidoDesdeListaModal {...defaultProps} lista={updatedLista} />)

    // Second order
    await user.click(trigger)

    // Should show updated available quantity
    expect(screen.getByText('5 disponibles')).toBeInTheDocument()

    // Select and create second order
    const checkbox2 = screen.getByLabelText(/EQ001/)
    await user.click(checkbox2)

    const submitButton2 = screen.getByText('Crear Pedido')
    await user.click(submitButton2)

    await waitFor(() => {
      expect(mockOnCreated).toHaveBeenCalledTimes(2)
    })
  })

  it('should preserve selection state when lista updates', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<PedidoDesdeListaModal {...defaultProps} />)

    // Open modal and select item
    const trigger = screen.getByText('Crear Pedido')
    await user.click(trigger)

    const checkbox = screen.getByLabelText(/EQ001/)
    await user.click(checkbox)

    // Verify item is selected
    expect(checkbox).toBeChecked()

    // Update lista (simulate external change)
    const updatedLista = {
      ...mockLista,
      items: mockLista.items!.map(item => 
        item.id === 'item-1' 
          ? { ...item, cantidadPedida: 1 } // Small change
          : item
      )
    }

    rerender(<PedidoDesdeListaModal {...defaultProps} lista={updatedLista} />)

    // Selection should be preserved
    await waitFor(() => {
      const updatedCheckbox = screen.getByLabelText(/EQ001/)
      expect(updatedCheckbox).toBeChecked()
    })
  })

  it('should handle items becoming unavailable', async () => {
    const user = userEvent.setup()
    const { rerender } = render(<PedidoDesdeListaModal {...defaultProps} />)

    // Open modal
    const trigger = screen.getByText('Crear Pedido')
    await user.click(trigger)

    // Initially EQ002 is available (3 available)
    expect(screen.getByText('EQ002')).toBeInTheDocument()

    // Update lista so EQ002 becomes fully ordered
    const updatedLista = {
      ...mockLista,
      items: mockLista.items!.map(item => 
        item.id === 'item-2' 
          ? { ...item, cantidadPedida: 5 } // Now fully ordered
          : item
      )
    }

    rerender(<PedidoDesdeListaModal {...defaultProps} lista={updatedLista} />)

    // EQ002 should no longer be available
    await waitFor(() => {
      expect(screen.queryByText('EQ002')).not.toBeInTheDocument()
    })
  })
})
