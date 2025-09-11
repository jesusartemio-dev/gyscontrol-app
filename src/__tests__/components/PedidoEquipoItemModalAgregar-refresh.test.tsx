// ===================================================
// 📁 Archivo: PedidoEquipoItemModalAgregar-refresh.test.tsx
// 📌 Ubicación: src/__tests__/components/
// 🔧 Descripción: Test para verificar que el modal actualiza correctamente los datos después de crear items
// 🧠 Uso: Verificar que cantidadPedida se actualiza correctamente en la UI
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-27
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import PedidoEquipoItemModalAgregar from '@/components/equipos/PedidoEquipoItemModalAgregar'
import { ListaEquipoItem } from '@/types'

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('@/lib/services/pedidoEquipoItem', () => ({
  createPedidoEquipoItem: jest.fn(),
}))

const mockCreatePedidoEquipoItem = require('@/lib/services/pedidoEquipoItem').createPedidoEquipoItem

describe('PedidoEquipoItemModalAgregar - Data Refresh', () => {
  const mockItems: ListaEquipoItem[] = [
    {
      id: 'item-1',
      codigo: 'EQ001',
      descripcion: 'Equipo Test 1',
      cantidad: 10,
      cantidadPedida: 7, // 7 ya pedidos, solo 3 disponibles
      unidad: 'UND',
      precioElegido: 100,
      tiempoEntrega: '5 días',
      tiempoEntregaDias: 5,
      proveedor: null,
      cotizaciones: [],
      proyectoEquipoItem: null,
    },
    {
      id: 'item-2',
      codigo: 'EQ002',
      descripcion: 'Equipo Test 2',
      cantidad: 5,
      cantidadPedida: 4, // 4 ya pedidos, solo 1 disponible
      unidad: 'UND',
      precioElegido: 200,
      tiempoEntrega: '3 días',
      tiempoEntregaDias: 3,
      proveedor: null,
      cotizaciones: [],
      proyectoEquipoItem: null,
    },
  ]

  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    pedidoId: 'pedido-123',
    responsableId: 'user-123',
    items: mockItems,
    onCreateItem: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should display correct available quantities based on cantidadPedida', () => {
    render(<PedidoEquipoItemModalAgregar {...defaultProps} />)

    // ✅ Verificar que se muestra la cantidad correcta disponible
    expect(screen.getByText('3/10')).toBeInTheDocument() // Item 1: 10 - 7 = 3 disponibles
    expect(screen.getByText('1/5')).toBeInTheDocument()   // Item 2: 5 - 4 = 1 disponible
  })

  it('should prevent selecting items with no stock available', () => {
    const itemsWithNoStock: ListaEquipoItem[] = [
      {
        ...mockItems[0],
        cantidadPedida: 10, // Todas las 10 unidades ya están pedidas
      },
    ]

    render(
      <PedidoEquipoItemModalAgregar
        {...defaultProps}
        items={itemsWithNoStock}
      />
    )

    // ✅ El checkbox debe estar deshabilitado
    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).toBeDisabled()

    // ✅ Debe mostrar 0 disponibles
    expect(screen.getByText('0/10')).toBeInTheDocument()
  })

  it('should limit quantity selection to available stock', async () => {
    render(<PedidoEquipoItemModalAgregar {...defaultProps} />)

    // ✅ Seleccionar el primer item (3 disponibles)
    const checkbox = screen.getAllByRole('checkbox')[0]
    fireEvent.click(checkbox)

    // ✅ Intentar incrementar más allá del stock disponible
    const incrementButton = screen.getByRole('button', { name: /\+/ })
    
    // Incrementar hasta el máximo (3)
    fireEvent.click(incrementButton) // 1
    fireEvent.click(incrementButton) // 2
    fireEvent.click(incrementButton) // 3
    
    // ✅ El botón debe estar deshabilitado al llegar al máximo
    expect(incrementButton).toBeDisabled()
    
    // ✅ Intentar incrementar una vez más debe mostrar mensaje de error
    fireEvent.click(incrementButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Stock máximo alcanzado')
      )
    })
  })

  it('should validate stock before creating items', async () => {
    mockCreatePedidoEquipoItem.mockResolvedValue({ id: 'new-item' })
    
    render(<PedidoEquipoItemModalAgregar {...defaultProps} />)

    // ✅ Seleccionar item con cantidad válida
    const checkbox = screen.getAllByRole('checkbox')[1] // Item 2 (1 disponible)
    fireEvent.click(checkbox)

    // ✅ La cantidad por defecto debe ser 1
    const quantityInput = screen.getByDisplayValue('1')
    expect(quantityInput).toBeInTheDocument()

    // ✅ Crear el item
    const createButton = screen.getByRole('button', { name: /Agregar/ })
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(mockCreatePedidoEquipoItem).toHaveBeenCalledWith({
        pedidoId: 'pedido-123',
        listaEquipoItemId: 'item-2',
        responsableId: 'user-123',
        cantidadPedida: 1,
        codigo: 'EQ002',
        descripcion: 'Equipo Test 2',
        unidad: 'UND',
        precioUnitario: 200,
        costoTotal: 200,
        tiempoEntrega: '3 días',
        tiempoEntregaDias: 3,
        prioridad: 'media',
        esUrgente: false,
      })
    })
  })

  it('should prevent creating items with quantities exceeding available stock', async () => {
    render(<PedidoEquipoItemModalAgregar {...defaultProps} />)

    // ✅ Seleccionar item y intentar poner cantidad mayor al stock
    const checkbox = screen.getAllByRole('checkbox')[1] // Item 2 (1 disponible)
    fireEvent.click(checkbox)

    // ✅ Intentar cambiar cantidad a 2 (mayor que el disponible)
    const quantityInput = screen.getByDisplayValue('1')
    fireEvent.change(quantityInput, { target: { value: '2' } })

    // ✅ Intentar crear el item
    const createButton = screen.getByRole('button', { name: /Agregar/ })
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('Los siguientes items exceden el stock disponible')
      )
    })

    // ✅ No debe llamar a la función de crear
    expect(mockCreatePedidoEquipoItem).not.toHaveBeenCalled()
  })

  it('should show correct statistics based on available items', () => {
    render(<PedidoEquipoItemModalAgregar {...defaultProps} />)

    // ✅ Verificar estadísticas
    expect(screen.getByText('2 Total')).toBeInTheDocument()      // 2 items totales
    expect(screen.getByText('0 Completos')).toBeInTheDocument()  // 0 items completos (ninguno tiene cantidadPedida >= cantidad)
    expect(screen.getByText('2 Parciales')).toBeInTheDocument()  // 2 items parciales
    expect(screen.getByText('2 Disponibles')).toBeInTheDocument() // 2 items con stock disponible
  })

  it('should filter items correctly when "Solo disponibles" is checked', () => {
    const itemsWithMixed: ListaEquipoItem[] = [
      ...mockItems,
      {
        id: 'item-3',
        codigo: 'EQ003',
        descripcion: 'Equipo Sin Stock',
        cantidad: 5,
        cantidadPedida: 5, // Sin stock disponible
        unidad: 'UND',
        precioElegido: 300,
        tiempoEntrega: '7 días',
        tiempoEntregaDias: 7,
        proveedor: null,
        cotizaciones: [],
        proyectoEquipoItem: null,
      },
    ]

    render(
      <PedidoEquipoItemModalAgregar
        {...defaultProps}
        items={itemsWithMixed}
      />
    )

    // ✅ Por defecto debe mostrar todos los items
    expect(screen.getByText('EQ001')).toBeInTheDocument()
    expect(screen.getByText('EQ002')).toBeInTheDocument()
    expect(screen.getByText('EQ003')).toBeInTheDocument()

    // ✅ Activar filtro "Solo disponibles"
    const soloDisponiblesCheckbox = screen.getByLabelText('Solo disponibles')
    fireEvent.click(soloDisponiblesCheckbox)

    // ✅ Solo debe mostrar items con stock disponible
    expect(screen.getByText('EQ001')).toBeInTheDocument()
    expect(screen.getByText('EQ002')).toBeInTheDocument()
    expect(screen.queryByText('EQ003')).not.toBeInTheDocument()
  })
})
