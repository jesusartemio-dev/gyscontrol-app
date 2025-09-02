/**
 * @fileoverview Tests para CotizacionProveedorTabla - Verificación de actualizaciones locales
 * @version 1.0.0
 * @author GYS Team
 * @created 2024-01-20
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import CotizacionProveedorTabla from './CotizacionProveedorTabla'
import { updateCotizacionProveedorItem } from '@/lib/services/cotizacionProveedorItem'
import { CotizacionProveedorItem } from '@/types'

// 🔧 Mocks
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

jest.mock('@/lib/services/cotizacionProveedorItem', () => ({
  updateCotizacionProveedorItem: jest.fn(),
}))

const mockUpdateService = updateCotizacionProveedorItem as jest.MockedFunction<typeof updateCotizacionProveedorItem>

// 📋 Mock data
const mockItems: CotizacionProveedorItem[] = [
  {
    id: '1',
    codigo: 'ITEM-001',
    descripcion: 'Adaptador Ethernet',
    cantidad: 1,
    precioUnitario: 100,
    costoTotal: 100,
    tiempoEntrega: 'Stock',
    estado: 'Pendiente',
    seleccionada: false,
    cotizacionProveedorId: 'cot-1',
    listaEquipoControlId: 'lista-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const updatedMockItem: CotizacionProveedorItem = {
  ...mockItems[0],
  cantidad: 2,
  costoTotal: 200,
}

describe('CotizacionProveedorTabla - Actualizaciones Locales', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('✅ debe llamar onItemUpdated cuando se actualiza un item exitosamente', async () => {
    // 🔧 Setup
    const mockOnUpdated = jest.fn()
    const mockOnItemUpdated = jest.fn()
    
    mockUpdateService.mockResolvedValue(updatedMockItem)

    render(
      <CotizacionProveedorTabla
        items={mockItems}
        onUpdated={mockOnUpdated}
        onItemUpdated={mockOnItemUpdated}
      />
    )

    // 📡 Activar modo edición
    const editButton = screen.getByRole('button', { name: /editar/i })
    fireEvent.click(editButton)

    // 📝 Cambiar cantidad
    const cantidadInput = screen.getByDisplayValue('1')
    fireEvent.change(cantidadInput, { target: { value: '2' } })

    // 💾 Guardar cambios
    const saveButton = screen.getByRole('button', { name: /guardar/i })
    fireEvent.click(saveButton)

    // ✅ Verificaciones
    await waitFor(() => {
      expect(mockUpdateService).toHaveBeenCalledWith('1', {
        cantidad: 2,
        costoTotal: 200,
      })
      expect(mockOnItemUpdated).toHaveBeenCalledWith(updatedMockItem)
      expect(mockOnUpdated).not.toHaveBeenCalled() // No debe llamar refetch completo
      expect(toast.success).toHaveBeenCalledWith('✅ Ítem ITEM-001 actualizado.')
    })
  })

  it('🔄 debe usar onUpdated como fallback cuando onItemUpdated no está disponible', async () => {
    // 🔧 Setup
    const mockOnUpdated = jest.fn()
    
    mockUpdateService.mockResolvedValue(updatedMockItem)

    render(
      <CotizacionProveedorTabla
        items={mockItems}
        onUpdated={mockOnUpdated}
        // onItemUpdated no proporcionado
      />
    )

    // 📡 Activar modo edición y guardar
    const editButton = screen.getByRole('button', { name: /editar/i })
    fireEvent.click(editButton)

    const cantidadInput = screen.getByDisplayValue('1')
    fireEvent.change(cantidadInput, { target: { value: '2' } })

    const saveButton = screen.getByRole('button', { name: /guardar/i })
    fireEvent.click(saveButton)

    // ✅ Verificaciones
    await waitFor(() => {
      expect(mockOnUpdated).toHaveBeenCalled() // Debe usar fallback
    })
  })

  it('❌ debe manejar errores en actualización correctamente', async () => {
    // 🔧 Setup
    const mockOnUpdated = jest.fn()
    const mockOnItemUpdated = jest.fn()
    
    mockUpdateService.mockRejectedValue(new Error('Network error'))

    render(
      <CotizacionProveedorTabla
        items={mockItems}
        onUpdated={mockOnUpdated}
        onItemUpdated={mockOnItemUpdated}
      />
    )

    // 📡 Activar modo edición y guardar
    const editButton = screen.getByRole('button', { name: /editar/i })
    fireEvent.click(editButton)

    const cantidadInput = screen.getByDisplayValue('1')
    fireEvent.change(cantidadInput, { target: { value: '2' } })

    const saveButton = screen.getByRole('button', { name: /guardar/i })
    fireEvent.click(saveButton)

    // ✅ Verificaciones
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('❌ Error al actualizar ítem.')
      expect(mockOnItemUpdated).not.toHaveBeenCalled()
      expect(mockOnUpdated).not.toHaveBeenCalled()
    })
  })

  it('🧮 debe calcular costoTotal automáticamente al cambiar cantidad o precio', async () => {
    // 🔧 Setup
    const mockOnItemUpdated = jest.fn()
    
    const expectedUpdatedItem = {
      ...mockItems[0],
      cantidad: 3,
      precioUnitario: 150,
      costoTotal: 450, // 3 * 150
    }
    
    mockUpdateService.mockResolvedValue(expectedUpdatedItem)

    render(
      <CotizacionProveedorTabla
        items={mockItems}
        onItemUpdated={mockOnItemUpdated}
      />
    )

    // 📡 Activar modo edición
    const editButton = screen.getByRole('button', { name: /editar/i })
    fireEvent.click(editButton)

    // 📝 Cambiar cantidad y precio
    const cantidadInput = screen.getByDisplayValue('1')
    const precioInput = screen.getByDisplayValue('100')
    
    fireEvent.change(cantidadInput, { target: { value: '3' } })
    fireEvent.change(precioInput, { target: { value: '150' } })

    // 💾 Guardar cambios
    const saveButton = screen.getByRole('button', { name: /guardar/i })
    fireEvent.click(saveButton)

    // ✅ Verificaciones
    await waitFor(() => {
      expect(mockUpdateService).toHaveBeenCalledWith('1', {
        cantidad: 3,
        precioUnitario: 150,
        costoTotal: 450,
      })
      expect(mockOnItemUpdated).toHaveBeenCalledWith(expectedUpdatedItem)
    })
  })
})