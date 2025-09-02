// ===================================================
// 📁 Archivo: PedidoDesdeListaModal.test.tsx
// 📌 Ubicación: src/components/equipos/__tests__/
// 🔧 Descripción: Tests para el componente PedidoDesdeListaModal
// 🧠 Uso: Validar funcionalidad de creación contextual de pedidos
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-01-27
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import PedidoDesdeListaModal from '../PedidoDesdeListaModal'
import type { ListaEquipo, PedidoEquipoPayload } from '@/types'

// 🎭 Mock de dependencias
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn()
  })
}))

// 📊 Datos de prueba
const mockLista: ListaEquipo = {
  id: 'lista-1',
  nombre: 'Lista Test',
  descripcion: 'Lista de prueba',
  proyectoId: 'proyecto-1',
  estado: 'aprobado',
  fechaCreacion: '2025-01-01',
  fechaActualizacion: '2025-01-01',
  items: [
    {
      id: 'item-1',
      listaEquipoId: 'lista-1',
      catalogoEquipoId: 'equipo-1',
      cantidad: 10,
      costoUnitario: 100,
      costoTotal: 1000,
      fechaCreacion: '2025-01-01',
      fechaActualizacion: '2025-01-01',
      catalogoEquipo: {
        id: 'equipo-1',
        nombre: 'Equipo Test 1',
        descripcion: 'Descripción test',
        codigo: 'EQ001',
        unidadId: 'unidad-1',
        categoriaId: 'cat-1',
        tiempoEntregaDias: 15,
        fechaCreacion: '2025-01-01',
        fechaActualizacion: '2025-01-01'
      }
    },
    {
      id: 'item-2',
      listaEquipoId: 'lista-1',
      catalogoEquipoId: 'equipo-2',
      cantidad: 5,
      costoUnitario: 200,
      costoTotal: 1000,
      fechaCreacion: '2025-01-01',
      fechaActualizacion: '2025-01-01',
      catalogoEquipo: {
        id: 'equipo-2',
        nombre: 'Equipo Test 2',
        descripcion: 'Descripción test 2',
        codigo: 'EQ002',
        unidadId: 'unidad-1',
        categoriaId: 'cat-1',
        tiempoEntregaDias: 20,
        fechaCreacion: '2025-01-01',
        fechaActualizacion: '2025-01-01'
      }
    }
  ]
}

const mockProps = {
  lista: mockLista,
  onCrearPedido: jest.fn(),
  proyectoId: 'proyecto-1',
  responsableId: 'user-1'
}

describe('PedidoDesdeListaModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ✅ Test 1: Renderizado básico
  it('should render modal trigger button', () => {
    render(<PedidoDesdeListaModal {...mockProps} />)
    
    const triggerButton = screen.getByRole('button', { name: /crear pedido/i })
    expect(triggerButton).toBeInTheDocument()
    expect(triggerButton).toHaveClass('bg-green-600')
  })

  // ✅ Test 2: Abrir modal
  it('should open modal when trigger button is clicked', async () => {
    render(<PedidoDesdeListaModal {...mockProps} />)
    
    const triggerButton = screen.getByRole('button', { name: /crear pedido/i })
    fireEvent.click(triggerButton)
    
    await waitFor(() => {
      expect(screen.getByText('Crear Pedido desde Lista')).toBeInTheDocument()
      expect(screen.getByText('Lista Test')).toBeInTheDocument()
    })
  })

  // ✅ Test 3: Mostrar items de la lista
  it('should display list items with selection checkboxes', async () => {
    render(<PedidoDesdeListaModal {...mockProps} />)
    
    const triggerButton = screen.getByRole('button', { name: /crear pedido/i })
    fireEvent.click(triggerButton)
    
    await waitFor(() => {
      expect(screen.getByText('Equipo Test 1')).toBeInTheDocument()
      expect(screen.getByText('Equipo Test 2')).toBeInTheDocument()
      expect(screen.getByText('EQ001')).toBeInTheDocument()
      expect(screen.getByText('EQ002')).toBeInTheDocument()
    })
  })

  // ✅ Test 4: Seleccionar items
  it('should allow selecting items and updating quantities', async () => {
    render(<PedidoDesdeListaModal {...mockProps} />)
    
    const triggerButton = screen.getByRole('button', { name: /crear pedido/i })
    fireEvent.click(triggerButton)
    
    await waitFor(() => {
      const checkbox1 = screen.getByRole('checkbox', { name: /equipo test 1/i })
      fireEvent.click(checkbox1)
      
      expect(checkbox1).toBeChecked()
    })
  })

  // ✅ Test 5: Validación de cantidades
  it('should validate quantities do not exceed available amounts', async () => {
    render(<PedidoDesdeListaModal {...mockProps} />)
    
    const triggerButton = screen.getByRole('button', { name: /crear pedido/i })
    fireEvent.click(triggerButton)
    
    await waitFor(() => {
      const checkbox1 = screen.getByRole('checkbox', { name: /equipo test 1/i })
      fireEvent.click(checkbox1)
      
      const quantityInput = screen.getByDisplayValue('1')
      fireEvent.change(quantityInput, { target: { value: '15' } }) // Excede disponible (10)
      
      const createButton = screen.getByRole('button', { name: /crear pedido/i })
      fireEvent.click(createButton)
      
      // Should show validation error
      expect(screen.getByText(/cantidad solicitada excede la disponible/i)).toBeInTheDocument()
    })
  })

  // ✅ Test 6: Crear pedido exitoso
  it('should create order successfully with selected items', async () => {
    const mockOnCrearPedido = jest.fn().mockResolvedValue({})
    
    render(
      <PedidoDesdeListaModal 
        {...mockProps} 
        onCrearPedido={mockOnCrearPedido}
      />
    )
    
    const triggerButton = screen.getByRole('button', { name: /crear pedido/i })
    fireEvent.click(triggerButton)
    
    await waitFor(() => {
      // Select first item
      const checkbox1 = screen.getByRole('checkbox', { name: /equipo test 1/i })
      fireEvent.click(checkbox1)
      
      // Set required date
      const dateInput = screen.getByLabelText(/fecha necesaria/i)
      fireEvent.change(dateInput, { target: { value: '2025-02-15' } })
      
      // Set observations
      const observationInput = screen.getByLabelText(/observaciones/i)
      fireEvent.change(observationInput, { target: { value: 'Pedido de prueba' } })
      
      // Submit form
      const createButton = screen.getByRole('button', { name: /crear pedido/i })
      fireEvent.click(createButton)
    })
    
    await waitFor(() => {
      expect(mockOnCrearPedido).toHaveBeenCalledWith({
        proyectoId: 'proyecto-1',
        responsableId: 'user-1',
        listaId: 'lista-1',
        fechaNecesaria: '2025-02-15',
        observacion: 'Pedido de prueba',
        prioridad: 'media',
        esUrgente: false,
        itemsSeleccionados: [
          {
            listaEquipoItemId: 'item-1',
            cantidadPedida: 1
          }
        ]
      })
    })
  })

  // ✅ Test 7: Calcular totales
  it('should calculate totals correctly', async () => {
    render(<PedidoDesdeListaModal {...mockProps} />)
    
    const triggerButton = screen.getByRole('button', { name: /crear pedido/i })
    fireEvent.click(triggerButton)
    
    await waitFor(() => {
      // Select both items
      const checkbox1 = screen.getByRole('checkbox', { name: /equipo test 1/i })
      const checkbox2 = screen.getByRole('checkbox', { name: /equipo test 2/i })
      
      fireEvent.click(checkbox1)
      fireEvent.click(checkbox2)
      
      // Should show total calculation
      expect(screen.getByText(/total estimado/i)).toBeInTheDocument()
      expect(screen.getByText('S/ 300.00')).toBeInTheDocument() // 1*100 + 1*200
    })
  })

  // ✅ Test 8: Manejar errores
  it('should handle creation errors gracefully', async () => {
    const mockOnCrearPedido = jest.fn().mockRejectedValue(new Error('Error de prueba'))
    
    render(
      <PedidoDesdeListaModal 
        {...mockProps} 
        onCrearPedido={mockOnCrearPedido}
      />
    )
    
    const triggerButton = screen.getByRole('button', { name: /crear pedido/i })
    fireEvent.click(triggerButton)
    
    await waitFor(() => {
      const checkbox1 = screen.getByRole('checkbox', { name: /equipo test 1/i })
      fireEvent.click(checkbox1)
      
      const dateInput = screen.getByLabelText(/fecha necesaria/i)
      fireEvent.change(dateInput, { target: { value: '2025-02-15' } })
      
      const createButton = screen.getByRole('button', { name: /crear pedido/i })
      fireEvent.click(createButton)
    })
    
    await waitFor(() => {
      expect(mockOnCrearPedido).toHaveBeenCalled()
      // Should show error state or message
    })
  })

  // ✅ Test 9: Cerrar modal
  it('should close modal when cancel button is clicked', async () => {
    render(<PedidoDesdeListaModal {...mockProps} />)
    
    const triggerButton = screen.getByRole('button', { name: /crear pedido/i })
    fireEvent.click(triggerButton)
    
    await waitFor(() => {
      const cancelButton = screen.getByRole('button', { name: /cancelar/i })
      fireEvent.click(cancelButton)
    })
    
    await waitFor(() => {
      expect(screen.queryByText('Crear Pedido desde Lista')).not.toBeInTheDocument()
    })
  })

  // ✅ Test 10: Validar campos requeridos
  it('should validate required fields before submission', async () => {
    render(<PedidoDesdeListaModal {...mockProps} />)
    
    const triggerButton = screen.getByRole('button', { name: /crear pedido/i })
    fireEvent.click(triggerButton)
    
    await waitFor(() => {
      // Try to submit without selecting items or setting date
      const createButton = screen.getByRole('button', { name: /crear pedido/i })
      fireEvent.click(createButton)
      
      // Should show validation messages
      expect(screen.getByText(/debe seleccionar al menos un item/i)).toBeInTheDocument()
    })
  })
})