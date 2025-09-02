// ===================================================
// 📁 Archivo: PedidoEquipoItemModalAgregar-refresh.test.tsx
// 📌 Ubicación: src/components/equipos/__tests__/
// 🔧 Descripción: Tests para verificar funcionalidad de refresh en PedidoEquipoItemModalAgregar
// 🧠 Uso: Verificar que onRefresh se llama después de crear items exitosamente
// ✍️ Autor: IA GYS + Jesús Artemio
// 📅 Última actualización: 2025-01-27
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import PedidoEquipoItemModalAgregar from '../PedidoEquipoItemModalAgregar'
import { ListaEquipoItem } from '@/types'
import { toast } from 'sonner'

// Mock dependencies
jest.mock('sonner')
const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
}
;(toast as any).success = mockToast.success
;(toast as any).error = mockToast.error

describe('PedidoEquipoItemModalAgregar - Refresh Functionality', () => {
  const mockOnClose = jest.fn()
  const mockOnCreateItem = jest.fn()
  const mockOnRefresh = jest.fn()

  const mockItems: ListaEquipoItem[] = [
    {
      id: '1',
      codigo: 'ITEM001',
      descripcion: 'Item de prueba 1',
      unidad: 'PZA',
      cantidad: 10,
      cantidadPedida: 2,
      precioElegido: 100,
      tiempoEntrega: '5-7 días',
      tiempoEntregaDias: 7,
      listaEquipoId: 'lista1',
      catalogoEquipoId: 'cat1',
      catalogoEquipo: {
        id: 'cat1',
        codigo: 'ITEM001',
        descripcion: 'Item de prueba 1',
        unidad: 'PZA',
        categoria: 'Categoria 1',
        subcategoria: 'Subcategoria 1',
        precio1: 100,
        precio2: 90,
        precio3: 80,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      codigo: 'ITEM002',
      descripcion: 'Item de prueba 2',
      unidad: 'PZA',
      cantidad: 5,
      cantidadPedida: 0,
      precioElegido: 200,
      tiempoEntrega: '3-5 días',
      tiempoEntregaDias: 5,
      listaEquipoId: 'lista1',
      catalogoEquipoId: 'cat2',
      catalogoEquipo: {
        id: 'cat2',
        codigo: 'ITEM002',
        descripcion: 'Item de prueba 2',
        unidad: 'PZA',
        categoria: 'Categoria 2',
        subcategoria: 'Subcategoria 2',
        precio1: 200,
        precio2: 180,
        precio3: 160,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  const defaultProps = {
    open: true,
    onClose: mockOnClose,
    pedidoId: 'pedido1',
    responsableId: 'user1',
    items: mockItems,
    onCreateItem: mockOnCreateItem,
    onRefresh: mockOnRefresh,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockOnCreateItem.mockResolvedValue(undefined)
    mockOnRefresh.mockResolvedValue(undefined)
  })

  it('should call onRefresh after successfully creating items', async () => {
    render(<PedidoEquipoItemModalAgregar {...defaultProps} />)

    // ✅ Select an item
    const checkbox = screen.getByTestId('checkbox-2') // Item with available stock
    fireEvent.click(checkbox)

    // ✅ Click add button
    const addButton = screen.getByRole('button', { name: /agregar \(1\)/i })
    fireEvent.click(addButton)

    // ✅ Wait for the creation process to complete
    await waitFor(() => {
      expect(mockOnCreateItem).toHaveBeenCalledTimes(1)
    })

    // ✅ Verify onRefresh was called after successful creation
    await waitFor(() => {
      expect(mockOnRefresh).toHaveBeenCalledTimes(1)
    })

    // ✅ Verify success toast was shown
    expect(mockToast.success).toHaveBeenCalledWith('1 items agregados al pedido')
  })

  it('should not call onRefresh if onCreateItem fails', async () => {
    // ✅ Mock onCreateItem to fail
    mockOnCreateItem.mockRejectedValue(new Error('Creation failed'))

    render(<PedidoEquipoItemModalAgregar {...defaultProps} />)

    // ✅ Select an item
    const checkbox = screen.getByTestId('checkbox-2')
    fireEvent.click(checkbox)

    // ✅ Click add button
    const addButton = screen.getByRole('button', { name: /agregar \(1\)/i })
    fireEvent.click(addButton)

    // ✅ Wait for the creation process to complete
    await waitFor(() => {
      expect(mockOnCreateItem).toHaveBeenCalledTimes(1)
    })

    // ✅ Verify onRefresh was NOT called due to failure
    expect(mockOnRefresh).not.toHaveBeenCalled()

    // ✅ Verify error toast was shown
    expect(mockToast.error).toHaveBeenCalledWith('Creation failed')
  })

  it('should not call onRefresh if onRefresh prop is not provided', async () => {
    const propsWithoutRefresh = {
      ...defaultProps,
      onRefresh: undefined,
    }

    render(<PedidoEquipoItemModalAgregar {...propsWithoutRefresh} />)

    // ✅ Select an item
    const checkbox = screen.getByTestId('checkbox-2')
    fireEvent.click(checkbox)

    // ✅ Click add button
    const addButton = screen.getByRole('button', { name: /agregar \(1\)/i })
    fireEvent.click(addButton)

    // ✅ Wait for the creation process to complete
    await waitFor(() => {
      expect(mockOnCreateItem).toHaveBeenCalledTimes(1)
    })

    // ✅ Verify success toast was shown
    expect(mockToast.success).toHaveBeenCalledWith('1 items agregados al pedido')

    // ✅ No error should occur even without onRefresh
    expect(mockToast.error).not.toHaveBeenCalled()
  })

  it('should call onRefresh after creating multiple items', async () => {
    render(<PedidoEquipoItemModalAgregar {...defaultProps} />)

    // ✅ Select multiple items
    const checkbox1 = screen.getByTestId('checkbox-1') // Item with some stock available
    const checkbox2 = screen.getByTestId('checkbox-2') // Item with full stock available
    fireEvent.click(checkbox1)
    fireEvent.click(checkbox2)

    // ✅ Click add button
    const addButton = screen.getByRole('button', { name: /agregar \(2\)/i })
    fireEvent.click(addButton)

    // ✅ Wait for the creation process to complete
    await waitFor(() => {
      expect(mockOnCreateItem).toHaveBeenCalledTimes(2)
    })

    // ✅ Verify onRefresh was called after successful creation
    await waitFor(() => {
      expect(mockOnRefresh).toHaveBeenCalledTimes(1)
    })

    // ✅ Verify success toast was shown
    expect(mockToast.success).toHaveBeenCalledWith('2 items agregados al pedido')
  })

  it('should handle onRefresh errors gracefully', async () => {
    // ✅ Mock onRefresh to fail
    mockOnRefresh.mockRejectedValue(new Error('Refresh failed'))

    // ✅ Spy on console.error to verify error handling
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    render(<PedidoEquipoItemModalAgregar {...defaultProps} />)

    // ✅ Select an item
    const checkbox = screen.getByTestId('checkbox-2')
    fireEvent.click(checkbox)

    // ✅ Click add button
    const addButton = screen.getByRole('button', { name: /agregar \(1\)/i })
    fireEvent.click(addButton)

    // ✅ Wait for the creation process to complete
    await waitFor(() => {
      expect(mockOnCreateItem).toHaveBeenCalledTimes(1)
    })

    // ✅ Wait for onRefresh to be called
    await waitFor(() => {
      expect(mockOnRefresh).toHaveBeenCalledTimes(1)
    })

    // ✅ Verify success toast was still shown (creation succeeded)
    expect(mockToast.success).toHaveBeenCalledWith('1 items agregados al pedido')

    // ✅ Clean up
    consoleSpy.mockRestore()
  })
})