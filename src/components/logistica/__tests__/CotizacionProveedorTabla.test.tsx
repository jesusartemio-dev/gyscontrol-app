import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CotizacionProveedorTabla from '../CotizacionProveedorTabla'
import { CotizacionProveedorItem } from '@/types'
import * as cotizacionService from '@/lib/services/cotizacionProveedorItem'

// Mock the services
jest.mock('@/lib/services/cotizacionProveedorItem')
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

const mockUpdateCotizacionProveedorItem = cotizacionService.updateCotizacionProveedorItem as jest.MockedFunction<typeof cotizacionService.updateCotizacionProveedorItem>
const mockDeleteCotizacionProveedorItem = cotizacionService.deleteCotizacionProveedorItem as jest.MockedFunction<typeof cotizacionService.deleteCotizacionProveedorItem>

const mockCotizacionItem: CotizacionProveedorItem = {
  id: 'cot-1',
  cotizacionId: 'cotizacion-1',
  listaEquipoItemId: 'item-1',
  listaId: 'lista-1',
  precioUnitario: 100.50,
  cantidad: 5,
  cantidadOriginal: 5,
  costoTotal: 502.50,
  tiempoEntrega: '15 días',
  tiempoEntregaDias: 15,
  estado: 'cotizado',
  esSeleccionada: false,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  cotizacion: {
    id: 'cotizacion-1',
    codigo: 'COT-001',
    proveedorId: 'prov-1',
    proyectoId: 'proj-1',
    estado: 'cotizado',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    proveedor: {
      id: 'prov-1',
      nombre: 'Proveedor Test',
      ruc: '12345678901',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  },
  listaEquipoItem: {
    id: 'item-1',
    listaId: 'lista-1',
    responsableId: 'user-1',
    proyectoEquipoItemId: null,
    reemplazaProyectoEquipoItemId: null,
    proyectoEquipoId: null,
    proveedorId: null,
    cotizacionSeleccionadaId: null,
    codigo: 'ITEM-001',
    descripcion: 'Item de prueba',
    unidad: 'pcs',
    cantidad: 5,
    presupuesto: 95.00,
    precioReferencial: 95.00,
    precioElegido: null,
    costoElegido: null,
    tiempoEntrega: null,
    tiempoEntregaDias: null,
    origen: 'cotizacion',
    estado: 'pendiente',
    comentario: null,
    fechaOrdenCompraRecomendada: null,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
}

const mockSelectedCotizacionItem: CotizacionProveedorItem = {
  ...mockCotizacionItem,
  id: 'cot-2',
  esSeleccionada: true,
}

describe('CotizacionProveedorTabla', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders cotization items correctly', () => {
    render(<CotizacionProveedorTabla items={[mockCotizacionItem]} />)
    
    expect(screen.getByText('$100.50')).toBeInTheDocument()
    expect(screen.getByText('15 días')).toBeInTheDocument()
    expect(screen.getByText('cotizado')).toBeInTheDocument()
  })

  it('allows editing non-selected cotization items', async () => {
    render(<CotizacionProveedorTabla items={[mockCotizacionItem]} />)
    
    const editButton = screen.getByRole('button', { name: /editar/i })
    expect(editButton).not.toBeDisabled()
    
    fireEvent.click(editButton)
    
    // Should show input fields for editing
    expect(screen.getByDisplayValue('100.5')).toBeInTheDocument()
    expect(screen.getByDisplayValue('stock')).toBeInTheDocument()
  })

  it('blocks editing of selected cotization items', () => {
    render(<CotizacionProveedorTabla items={[mockSelectedCotizacionItem]} />)
    
    const editButton = screen.getByRole('button', { name: /editar/i })
    expect(editButton).toBeDisabled()
    expect(editButton).toHaveAttribute('title', 'No se puede editar una cotización seleccionada')
  })

  it('shows visual indicators for selected cotization items', () => {
    render(<CotizacionProveedorTabla items={[mockSelectedCotizacionItem]} />)
    
    // Should show "Seleccionada" badge
    expect(screen.getByText('✓ Seleccionada')).toBeInTheDocument()
    
    // Should show lock icons
    const lockIcons = screen.getAllByText('🔒')
    expect(lockIcons).toHaveLength(2) // One for delivery time, one for status
  })

  it('does not show edit controls for selected items in edit mode', () => {
    render(<CotizacionProveedorTabla items={[mockSelectedCotizacionItem]} />)
    
    // Try to click edit button (should be disabled)
    const editButton = screen.getByRole('button', { name: /editar/i })
    fireEvent.click(editButton)
    
    // Should not show input fields
    expect(screen.queryByDisplayValue('100.5')).not.toBeInTheDocument()
    expect(screen.getByText('$100.50')).toBeInTheDocument()
  })

  it('allows saving changes for non-selected items', async () => {
    mockUpdateCotizacionProveedorItem.mockResolvedValue(mockCotizacionItem)
    const onUpdated = jest.fn()
    
    render(<CotizacionProveedorTabla items={[mockCotizacionItem]} onUpdated={onUpdated} />)
    
    // Enter edit mode
    const editButton = screen.getByRole('button', { name: /editar/i })
    fireEvent.click(editButton)
    
    // Change price
    const priceInput = screen.getByDisplayValue('100.5')
    fireEvent.change(priceInput, { target: { value: '120.75' } })
    
    // Save changes - find the green button with Save icon
    const buttons = screen.getAllByRole('button')
    const saveButton = buttons.find(btn => 
      btn.className.includes('bg-green-600') && btn.querySelector('svg')
    )
    expect(saveButton).toBeInTheDocument()
    fireEvent.click(saveButton!)
    
    await waitFor(() => {
      expect(mockUpdateCotizacionProveedorItem).toHaveBeenCalledWith(
        'cot-1',
        expect.objectContaining({
          precioUnitario: 120.75,
        })
      )
    })
    
    expect(onUpdated).toHaveBeenCalled()
  })

  it('shows mixed list with selected and non-selected items correctly', () => {
    const items = [mockCotizacionItem, mockSelectedCotizacionItem]
    render(<CotizacionProveedorTabla items={items} />)
    
    const editButtons = screen.getAllByRole('button', { name: /editar/i })
    
    // First item (not selected) should be editable
    expect(editButtons[0]).not.toBeDisabled()
    
    // Second item (selected) should be disabled
    expect(editButtons[1]).toBeDisabled()
    
    // Should show "Seleccionada" badge only for selected item
    expect(screen.getByText('✓ Seleccionada')).toBeInTheDocument()
  })

  it('shows delete button for selected items', () => {
    render(<CotizacionProveedorTabla items={[mockSelectedCotizacionItem]} />)
    
    // Delete button should still be present (deletion is not blocked, only editing)
    const buttons = screen.getAllByRole('button')
    const deleteButton = buttons.find(button => button.querySelector('svg'))
    expect(deleteButton).toBeInTheDocument()
    
    // Note: Currently deletion is not blocked, only editing is blocked
    // This could be enhanced in the future if needed
  })
})
