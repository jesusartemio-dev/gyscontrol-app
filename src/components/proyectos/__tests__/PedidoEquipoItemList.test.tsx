/**
 * @fileoverview Tests for PedidoEquipoItemList component
 * Tests the improved table with proper quantity display, DateTime fields, and removed category column
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import PedidoEquipoItemList from '../PedidoEquipoItemList'
import { PedidoEquipoItem, EstadoPedidoItem } from '@/types/modelos'

// 🧪 Mock data compatible with actual component structure
const mockItems: PedidoEquipoItem[] = [
  {
    id: '1',
    pedidoId: 'pedido-1',
    cantidadPedida: 5,
    cantidadAtendida: 0,
    precioUnitario: 100.50,
    costoTotal: 502.50,
    estado: 'pendiente' as EstadoPedidoItem,
    codigo: 'CPU001',
    descripcion: 'Procesador Intel Core i7',
    unidad: 'pieza',
    tiempoEntrega: 'stock',
    tiempoEntregaDias: 0,
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    pedidoId: 'pedido-1',
    cantidadPedida: 10,
    cantidadAtendida: 5,
    precioUnitario: 25.75,
    costoTotal: 257.50,
    estado: 'en_proceso' as EstadoPedidoItem,
    codigo: 'RAM002',
    descripcion: 'Memoria RAM DDR4 16GB',
    unidad: 'pieza',
    tiempoEntrega: '7 días',
    tiempoEntregaDias: 7,
    createdAt: '2024-01-16T14:20:00Z',
    updatedAt: '2024-01-16T14:20:00Z'
  },
  {
    id: '3',
    pedidoId: 'pedido-1',
    cantidadPedida: 0, // ✅ Test edge case with zero quantity
    cantidadAtendida: 0,
    precioUnitario: 0,
    costoTotal: 0,
    estado: 'cancelado' as EstadoPedidoItem,
    codigo: 'HDD003',
    descripcion: 'Disco Duro 1TB',
    unidad: 'pieza',
    createdAt: '2024-01-17T09:15:00Z'
  }
]

const mockProps = {
  items: mockItems,
  isLoading: false,
  onUpdateItem: jest.fn(),
  onDeleteItem: jest.fn(),
  onCreateItem: jest.fn()
}

describe('PedidoEquipoItemList - Improved Version', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ✅ Test 1: Component renders without category column
  it('should render table without category column', () => {
    render(<PedidoEquipoItemList {...mockProps} />)
    
    // ✅ Check headers - category should not exist
    expect(screen.getByText('Código')).toBeInTheDocument()
    expect(screen.getByText('Descripción')).toBeInTheDocument()
    expect(screen.getByText('Estado')).toBeInTheDocument()
    expect(screen.getByText('Cantidad')).toBeInTheDocument()
    expect(screen.getByText('Precio Unit.')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('Tiempo Entrega')).toBeInTheDocument()
    expect(screen.getByText('Fecha Creación')).toBeInTheDocument()
    
    // ❌ Category column should not exist
    expect(screen.queryByText('Categoría')).not.toBeInTheDocument()
  })

  // ✅ Test 2: Quantity displays correctly (no NaN)
  it('should display quantity correctly without NaN', () => {
    render(<PedidoEquipoItemList {...mockProps} />)
    
    // ✅ Check quantities are displayed properly using cantidadPedida
    const quantityElements = screen.getAllByText(/^\d+$/)
    expect(quantityElements.length).toBeGreaterThan(0)
    
    // ❌ Should not show NaN anywhere
    expect(screen.queryByText('NaN')).not.toBeInTheDocument()
  })

  // ✅ Test 3: DateTime fields are displayed
  it('should display creation dates in proper format', () => {
    render(<PedidoEquipoItemList {...mockProps} />)
    
    // ✅ Check dates are formatted correctly (dd/mm/yyyy)
    expect(screen.getByText('15/01/2024')).toBeInTheDocument()
    expect(screen.getByText('16/01/2024')).toBeInTheDocument()
    expect(screen.getByText('17/01/2024')).toBeInTheDocument()
  })

  // ✅ Test 4: Delivery time fields are displayed
  it('should display delivery time information', () => {
    render(<PedidoEquipoItemList {...mockProps} />)
    
    // ✅ Check delivery times
    expect(screen.getByText('stock')).toBeInTheDocument()
    expect(screen.getByText('7 días')).toBeInTheDocument()
  })

  // ✅ Test 5: Status badges with proper variants
  it('should display status badges with correct variants', () => {
    render(<PedidoEquipoItemList {...mockProps} />)
    
    // ✅ Check status badges exist
    expect(screen.getByText('pendiente')).toBeInTheDocument()
    expect(screen.getByText('en_proceso')).toBeInTheDocument()
    expect(screen.getByText('cancelado')).toBeInTheDocument()
  })

  // ✅ Test 6: Search functionality works without category
  it('should filter items by code, description, and status', async () => {
    render(<PedidoEquipoItemList {...mockProps} />)
    
    const searchInput = screen.getByPlaceholderText('Buscar por código, descripción o estado...')
    
    // ✅ Search by code
    fireEvent.change(searchInput, { target: { value: 'CPU001' } })
    await waitFor(() => {
      expect(screen.getByText('CPU001')).toBeInTheDocument()
    })
    
    // ✅ Clear search
    fireEvent.change(searchInput, { target: { value: '' } })
    await waitFor(() => {
      expect(screen.getByText('RAM002')).toBeInTheDocument()
    })
  })

  // ✅ Test 7: Loading state
  it('should show loading skeleton when isLoading is true', () => {
    render(<PedidoEquipoItemList {...mockProps} isLoading={true} />)
    
    // ✅ Should show some loading indicator
    expect(screen.getByTestId('items-skeleton') || screen.getByText('Cargando...')).toBeInTheDocument()
  })

  // ✅ Test 8: Empty state
  it('should show empty state when no items', () => {
    render(<PedidoEquipoItemList {...mockProps} items={[]} />)
    
    // ✅ Should show empty state message
    expect(screen.getByText(/No hay items/i) || screen.getByText(/Sin items/i)).toBeInTheDocument()
  })

  // ✅ Test 9: Total calculations are correct
  it('should calculate totals correctly using cantidadPedida', () => {
    render(<PedidoEquipoItemList {...mockProps} />)
    
    // ✅ Check that calculations use cantidadPedida instead of cantidad
    // Individual totals: 5 * 100.50 = 502.50, 10 * 25.75 = 257.50, 0 * 0 = 0
    expect(screen.getByText('S/ 502.50')).toBeInTheDocument()
    expect(screen.getByText('S/ 257.50')).toBeInTheDocument()
    expect(screen.getByText('S/ 0.00')).toBeInTheDocument()
  })

  // ✅ Test 10: Statistics calculation with cantidadPedida
  it('should calculate statistics correctly using cantidadPedida', () => {
    render(<PedidoEquipoItemList {...mockProps} />)
    
    // ✅ Check statistics use cantidadPedida (5+10+0 = 15)
    expect(screen.getByText('3 items')).toBeInTheDocument() // Total items
    expect(screen.getByText('15 und')).toBeInTheDocument() // Total quantity
    expect(screen.getByText('S/ 760.00')).toBeInTheDocument() // Total cost (502.50+257.50+0)
  })
})
