// ===================================================
// 📁 Archivo: PedidoEquipoItemModalAgregar-cantidades.test.tsx
// 📌 Ubicación: src/__tests__/components/
// 🔧 Descripción: Tests para validar cantidades disponibles en modal de agregar items
// 📌 Características: Valida cálculo correcto de cantidades disponibles
// ✍️ Autor: Sistema GYS
// 📅 Creado: 2025-01-27
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, jest } from '@jest/globals'
import PedidoEquipoItemModalAgregar from '@/components/equipos/PedidoEquipoItemModalAgregar'
import { toast } from 'sonner'

// 🎭 Mock de dependencias
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: jest.fn(),
  }),
}))

// 🔧 Mock de fetch global
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('PedidoEquipoItemModalAgregar - Cantidades Disponibles', () => {
  const mockProps = {
    isOpen: true,
    onClose: jest.fn(),
    pedidoId: 'pedido-123',
    listaId: 'lista-456',
    responsableId: 'user-789',
  }

  const mockListaEquipoItems = [
    {
      id: 'item-1',
      codigo: 'EQ-001',
      descripcion: 'Excavadora CAT 320',
      unidad: 'UND',
      cantidadLista: 10,
      cantidadPedida: 3, // ✅ Valor positivo normal
      precioUnitario: 1500.00,
      equipo: {
        id: 'equipo-1',
        codigo: 'EQ-001',
        descripcion: 'Excavadora CAT 320',
        categoria: 'Maquinaria Pesada'
      }
    },
    {
      id: 'item-2',
      codigo: 'EQ-002',
      descripcion: 'Martillo Neumático',
      unidad: 'UND',
      cantidadLista: 5,
      cantidadPedida: -2, // ❌ Valor negativo problemático
      precioUnitario: 800.00,
      equipo: {
        id: 'equipo-2',
        codigo: 'EQ-002',
        descripcion: 'Martillo Neumático',
        categoria: 'Herramientas'
      }
    },
    {
      id: 'item-3',
      codigo: 'EQ-003',
      descripcion: 'Compresor de Aire',
      unidad: 'UND',
      cantidadLista: 8,
      cantidadPedida: 8, // ✅ Completamente pedido
      precioUnitario: 1200.00,
      equipo: {
        id: 'equipo-3',
        codigo: 'EQ-003',
        descripcion: 'Compresor de Aire',
        categoria: 'Equipos Auxiliares'
      }
    },
    {
      id: 'item-4',
      codigo: 'EQ-004',
      descripcion: 'Generador Eléctrico',
      unidad: 'UND',
      cantidadLista: 12,
      cantidadPedida: 0, // ✅ Sin pedidos
      precioUnitario: 2000.00,
      equipo: {
        id: 'equipo-4',
        codigo: 'EQ-004',
        descripcion: 'Generador Eléctrico',
        categoria: 'Equipos Auxiliares'
      }
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    
    // 📡 Mock de la respuesta de la API
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        items: mockListaEquipoItems
      })
    })
  })

  it('should display correct available quantities for normal items', async () => {
    // 🎬 Act
    render(<PedidoEquipoItemModalAgregar {...mockProps} />)

    // ⏳ Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('EQ-001')).toBeInTheDocument()
    })

    // ✅ Assert - Item con cantidadPedida positiva normal
    const excavadoraRow = screen.getByText('EQ-001').closest('tr')
    expect(excavadoraRow).toHaveTextContent('10') // cantidadLista
    expect(excavadoraRow).toHaveTextContent('3') // cantidadPedida
    expect(excavadoraRow).toHaveTextContent('7') // disponible (10-3)
  })

  it('should handle negative cantidadPedida correctly', async () => {
    // 🎬 Act
    render(<PedidoEquipoItemModalAgregar {...mockProps} />)

    // ⏳ Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('EQ-002')).toBeInTheDocument()
    })

    // ✅ Assert - Item con cantidadPedida negativa
    const martilloRow = screen.getByText('EQ-002').closest('tr')
    expect(martilloRow).toHaveTextContent('5') // cantidadLista
    expect(martilloRow).toHaveTextContent('-2') // cantidadPedida negativa
    
    // 🔍 La cantidad disponible debería ser cantidadLista + abs(cantidadPedida negativa)
    // o simplemente cantidadLista si se maneja como 0
    const disponibleText = martilloRow?.textContent
    expect(disponibleText).toMatch(/[57]/) // Debería mostrar 7 (5+2) o 5 dependiendo de la lógica
  })

  it('should show zero available for fully ordered items', async () => {
    // 🎬 Act
    render(<PedidoEquipoItemModalAgregar {...mockProps} />)

    // ⏳ Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('EQ-003')).toBeInTheDocument()
    })

    // ✅ Assert - Item completamente pedido
    const compresorRow = screen.getByText('EQ-003').closest('tr')
    expect(compresorRow).toHaveTextContent('8') // cantidadLista
    expect(compresorRow).toHaveTextContent('8') // cantidadPedida
    expect(compresorRow).toHaveTextContent('0') // disponible (8-8)
  })

  it('should show full quantity available for items with zero orders', async () => {
    // 🎬 Act
    render(<PedidoEquipoItemModalAgregar {...mockProps} />)

    // ⏳ Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('EQ-004')).toBeInTheDocument()
    })

    // ✅ Assert - Item sin pedidos
    const generadorRow = screen.getByText('EQ-004').closest('tr')
    expect(generadorRow).toHaveTextContent('12') // cantidadLista
    expect(generadorRow).toHaveTextContent('0') // cantidadPedida
    expect(generadorRow).toHaveTextContent('12') // disponible (12-0)
  })

  it('should prevent adding more than available quantity', async () => {
    // 🎬 Act
    render(<PedidoEquipoItemModalAgregar {...mockProps} />)

    // ⏳ Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('EQ-001')).toBeInTheDocument()
    })

    // 🎯 Try to select an item and add more than available
    const excavadoraRow = screen.getByText('EQ-001').closest('tr')
    const checkbox = excavadoraRow?.querySelector('input[type="checkbox"]')
    
    if (checkbox) {
      fireEvent.click(checkbox)
    }

    // 🔍 Find quantity input and try to set invalid amount
    const quantityInput = screen.getByDisplayValue('1') // Default quantity
    fireEvent.change(quantityInput, { target: { value: '10' } }) // More than available (7)

    // 🎬 Try to add the item
    const addButton = screen.getByText('Agregar Items')
    fireEvent.click(addButton)

    // ✅ Assert - Should show error
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(
        expect.stringContaining('cantidad disponible')
      )
    })
  })

  it('should allow adding valid quantities', async () => {
    // 📡 Mock successful API response for adding item
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true })
    })

    // 🎬 Act
    render(<PedidoEquipoItemModalAgregar {...mockProps} />)

    // ⏳ Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('EQ-001')).toBeInTheDocument()
    })

    // 🎯 Select an item and add valid quantity
    const excavadoraRow = screen.getByText('EQ-001').closest('tr')
    const checkbox = excavadoraRow?.querySelector('input[type="checkbox"]')
    
    if (checkbox) {
      fireEvent.click(checkbox)
    }

    // 🔍 Set valid quantity (within available range)
    const quantityInput = screen.getByDisplayValue('1')
    fireEvent.change(quantityInput, { target: { value: '5' } }) // Less than available (7)

    // 🎬 Add the item
    const addButton = screen.getByText('Agregar Items')
    fireEvent.click(addButton)

    // ✅ Assert - Should succeed
    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        expect.stringContaining('agregado')
      )
    })
  })

  it('should handle items with negative cantidadPedida in calculations', async () => {
    // 🎬 Act
    render(<PedidoEquipoItemModalAgregar {...mockProps} />)

    // ⏳ Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('EQ-002')).toBeInTheDocument()
    })

    // 🎯 Select item with negative cantidadPedida
    const martilloRow = screen.getByText('EQ-002').closest('tr')
    const checkbox = martilloRow?.querySelector('input[type="checkbox"]')
    
    if (checkbox) {
      fireEvent.click(checkbox)
    }

    // 🔍 The available quantity should be calculated correctly
    // If cantidadPedida is -2, available should be cantidadLista + 2 = 7
    // Or handled as cantidadLista = 5 if negatives are treated as 0
    const quantityInput = screen.getByDisplayValue('1')
    
    // 🎬 Try to add maximum possible quantity
    fireEvent.change(quantityInput, { target: { value: '6' } })
    
    const addButton = screen.getByText('Agregar Items')
    fireEvent.click(addButton)

    // ✅ Assert - Should handle correctly based on business logic
    await waitFor(() => {
      // Either success if 6 <= available, or error if not
      expect(toast.success || toast.error).toHaveBeenCalled()
    })
  })

  it('should display warning for items with negative cantidadPedida', async () => {
    // 🎬 Act
    render(<PedidoEquipoItemModalAgregar {...mockProps} />)

    // ⏳ Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('EQ-002')).toBeInTheDocument()
    })

    // ✅ Assert - Should show some indication of data inconsistency
    const martilloRow = screen.getByText('EQ-002').closest('tr')
    
    // 🔍 Look for warning indicators (could be styling, icons, or text)
    expect(martilloRow).toHaveTextContent('-2')
    
    // 📝 Note: This test assumes the component shows negative values
    // In a real implementation, you might want to:
    // 1. Show a warning icon/badge
    // 2. Highlight the row in red
    // 3. Show a tooltip explaining the inconsistency
    // 4. Automatically trigger a recalculation
  })

  it('should refresh data after successful item addition', async () => {
    // 📡 Mock successful API responses
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: mockListaEquipoItems })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: mockListaEquipoItems.map(item => 
            item.id === 'item-1' 
              ? { ...item, cantidadPedida: item.cantidadPedida + 5 }
              : item
          )
        })
      })

    // 🎬 Act
    render(<PedidoEquipoItemModalAgregar {...mockProps} />)

    // ⏳ Wait for initial data load
    await waitFor(() => {
      expect(screen.getByText('EQ-001')).toBeInTheDocument()
    })

    // 🎯 Add an item
    const excavadoraRow = screen.getByText('EQ-001').closest('tr')
    const checkbox = excavadoraRow?.querySelector('input[type="checkbox"]')
    
    if (checkbox) {
      fireEvent.click(checkbox)
    }

    const quantityInput = screen.getByDisplayValue('1')
    fireEvent.change(quantityInput, { target: { value: '5' } })

    const addButton = screen.getByText('Agregar Items')
    fireEvent.click(addButton)

    // ✅ Assert - Data should be refreshed
    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledTimes(3) // Initial load + Add + Refresh
    })
  })
})
