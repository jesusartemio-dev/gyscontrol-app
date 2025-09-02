/**
 * 🧪 Tests para validación de stock en PedidoEquipoItemModalAgregar
 * 
 * Verifica que:
 * - No se puedan seleccionar items sin stock
 * - No se puedan incrementar cantidades más allá del stock disponible
 * - Se muestren mensajes de error apropiados
 * - Se valide el stock antes de crear items
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import PedidoEquipoItemModalAgregar from '@/components/equipos/PedidoEquipoItemModalAgregar'
import { ListaEquipoItem } from '@/types'

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}))

const mockToast = toast as jest.Mocked<typeof toast>

describe('PedidoEquipoItemModalAgregar - Stock Validation', () => {
  const mockOnClose = jest.fn()
  const mockOnCreateItem = jest.fn()

  const mockItems: ListaEquipoItem[] = [
    {
      id: '1',
      codigo: 'ITEM001',
      descripcion: 'Item con stock disponible',
      cantidad: 10,
      cantidadPedida: 3, // 7 disponibles
      unidad: 'pcs',
      precioElegido: 100,
      tiempoEntrega: '5 días',
      tiempoEntregaDias: 5,
      listaEquipoId: 'lista1',
      equipoId: 'equipo1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '2',
      codigo: 'ITEM002',
      descripcion: 'Item sin stock',
      cantidad: 5,
      cantidadPedida: 5, // 0 disponibles
      unidad: 'pcs',
      precioElegido: 200,
      tiempoEntrega: '3 días',
      tiempoEntregaDias: 3,
      listaEquipoId: 'lista1',
      equipoId: 'equipo2',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      id: '3',
      codigo: 'ITEM003',
      descripcion: 'Item con stock limitado',
      cantidad: 3,
      cantidadPedida: 2, // 1 disponible
      unidad: 'pcs',
      precioElegido: 150,
      tiempoEntrega: '7 días',
      tiempoEntregaDias: 7,
      listaEquipoId: 'lista1',
      equipoId: 'equipo3',
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
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should prevent selecting items without stock', async () => {
    render(<PedidoEquipoItemModalAgregar {...defaultProps} />)

    // Intentar seleccionar item sin stock
    const itemSinStock = screen.getByText('ITEM002')
    const checkbox = itemSinStock.closest('.cursor-pointer')?.querySelector('input[type="checkbox"]')
    
    if (checkbox) {
      fireEvent.click(checkbox)
    }

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('No hay stock disponible para ITEM002')
      )
    })
  })

  it('should prevent incrementing quantity beyond available stock', async () => {
    render(<PedidoEquipoItemModalAgregar {...defaultProps} />)

    // Seleccionar item con stock limitado
    const itemLimitado = screen.getByText('ITEM003')
    const checkbox = itemLimitado.closest('.cursor-pointer')?.querySelector('input[type="checkbox"]')
    
    if (checkbox) {
      fireEvent.click(checkbox)
    }

    // Intentar incrementar más allá del stock disponible
    const incrementButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg')?.getAttribute('data-lucide') === 'plus'
    )

    if (incrementButton) {
      // Incrementar hasta el límite (1 disponible)
      fireEvent.click(incrementButton)
      
      // Intentar incrementar más allá del límite
      fireEvent.click(incrementButton)
    }

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('Stock máximo alcanzado para ITEM003: 1 disponibles')
      )
    })
  })

  it('should validate stock before creating items', async () => {
    // Mock para simular que el stock cambió después de la selección
    const itemsWithChangedStock = [
      {
        ...mockItems[0],
        cantidadPedida: 9, // Ahora solo 1 disponible en lugar de 7
      },
    ]

    render(
      <PedidoEquipoItemModalAgregar 
        {...defaultProps} 
        items={itemsWithChangedStock}
      />
    )

    // Seleccionar item
    const item = screen.getByText('ITEM001')
    const checkbox = item.closest('.cursor-pointer')?.querySelector('input[type="checkbox"]')
    
    if (checkbox) {
      fireEvent.click(checkbox)
    }

    // Intentar incrementar a 2 (más del stock disponible)
    const incrementButton = screen.getAllByRole('button').find(btn => 
      btn.querySelector('svg')?.getAttribute('data-lucide') === 'plus'
    )

    if (incrementButton) {
      fireEvent.click(incrementButton) // Ahora debería ser 2, pero solo hay 1 disponible
    }

    // Intentar crear items
    const createButton = screen.getByRole('button', { name: /agregar/i })
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith(
        expect.stringContaining('Stock insuficiente')
      )
    })

    expect(mockOnCreateItem).not.toHaveBeenCalled()
  })

  it('should allow creating items with valid stock', async () => {
    mockOnCreateItem.mockResolvedValue(undefined)

    render(<PedidoEquipoItemModalAgregar {...defaultProps} />)

    // Seleccionar item con stock disponible
    const item = screen.getByText('ITEM001')
    const checkbox = item.closest('.cursor-pointer')?.querySelector('input[type="checkbox"]')
    
    if (checkbox) {
      fireEvent.click(checkbox)
    }

    // Crear items
    const createButton = screen.getByRole('button', { name: /agregar/i })
    fireEvent.click(createButton)

    await waitFor(() => {
      expect(mockOnCreateItem).toHaveBeenCalledWith({
        pedidoId: 'pedido1',
        responsableId: 'user1',
        listaEquipoItemId: '1',
        cantidadPedida: 1,
        codigo: 'ITEM001',
        descripcion: 'Item con stock disponible',
        unidad: 'pcs',
        precioUnitario: 100,
        costoTotal: 100,
        tiempoEntrega: '5 días',
        tiempoEntregaDias: 5,
      })
    })

    expect(mockToast.success).toHaveBeenCalledWith('1 items agregados al pedido')
  })

  it('should show correct stock information in UI', () => {
    render(<PedidoEquipoItemModalAgregar {...defaultProps} />)

    // Verificar que se muestre la información de stock correcta
    expect(screen.getByText('2/1')).toBeInTheDocument() // ITEM003: 2 total, 1 disponible
    expect(screen.getByText('5/0')).toBeInTheDocument() // ITEM002: 5 total, 0 disponible
  })

  it('should filter items correctly by availability', async () => {
    render(<PedidoEquipoItemModalAgregar {...defaultProps} />)

    // Activar filtro "Solo disponibles"
    const availableFilter = screen.getByRole('checkbox', { name: /solo disponibles/i })
    fireEvent.click(availableFilter)

    await waitFor(() => {
      // Solo deberían mostrarse items con stock > 0
      expect(screen.getByText('ITEM001')).toBeInTheDocument()
      expect(screen.getByText('ITEM003')).toBeInTheDocument()
      expect(screen.queryByText('ITEM002')).not.toBeInTheDocument()
    })
  })
})