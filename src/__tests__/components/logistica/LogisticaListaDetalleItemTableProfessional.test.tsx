// ===================================================
// 📁 Test: LogisticaListaDetalleItemTableProfessional.test.tsx
// 📌 Description: Tests for the professional logistics item table component
// 📌 Features: Action column functionality, quote selection, expansion behavior
// ✍️ Author: AI System
// 📅 Created: 2025-01-27
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import LogisticaListaDetalleItemTableProfessional from '@/components/logistica/LogisticaListaDetalleItemTableProfessional'
import { ListaEquipoItem } from '@/types'

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock fetch globally
global.fetch = jest.fn()

const mockFetch = fetch as jest.MockedFunction<typeof fetch>

// Sample test data
const mockItems: ListaEquipoItem[] = [
  {
    id: 'item-1',
    codigo: 'ITEM-001',
    descripcion: 'Test Item 1',
    unidad: 'PZA',
    cantidad: 10,
    precioElegido: 100.50,
    costoElegido: 1005.00,
    cotizacionSeleccionadaId: null,
    tiempoEntrega: null,
    tiempoEntregaDias: null,
    cotizaciones: [
      {
        id: 'cot-1',
        listaEquipoItemId: 'item-1',
        descripcion: 'Test Item 1',
        codigo: 'ITEM-001',
        unidad: 'PZA',
        cantidad: 10,
        cantidadOriginal: 10,
        precioUnitario: 95.00,
        estado: 'cotizado',
        esSeleccionada: false,
        tiempoEntrega: '5 días',
        tiempoEntregaDias: 5,
        cotizacion: {
          id: 'cotizacion-1',
          codigo: 'COT-001',
          proveedor: {
            id: 'prov-1',
            nombre: 'Proveedor Test A',
            email: 'test@proveedora.com',
            telefono: '123456789',
            direccion: 'Test Address A',
            contacto: 'Contact A',
            activo: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          fechaCreacion: new Date(),
          fechaVencimiento: new Date(),
          estado: 'enviada',
          observaciones: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          proveedorId: 'prov-1',
        },
        cotizacionId: 'cotizacion-1',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: 'cot-2',
        listaEquipoItemId: 'item-1',
        descripcion: 'Test Item 1',
        codigo: 'ITEM-001',
        unidad: 'PZA',
        cantidad: 10,
        cantidadOriginal: 10,
        precioUnitario: 110.00,
        estado: 'cotizado',
        esSeleccionada: false,
        tiempoEntrega: '3 días',
        tiempoEntregaDias: 3,
        cotizacion: {
          id: 'cotizacion-2',
          codigo: 'COT-002',
          proveedor: {
            id: 'prov-2',
            nombre: 'Proveedor Test B',
            email: 'test@proveedorb.com',
            telefono: '987654321',
            direccion: 'Test Address B',
            contacto: 'Contact B',
            activo: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          fechaCreacion: new Date(),
          fechaVencimiento: new Date(),
          estado: 'enviada',
          observaciones: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          proveedorId: 'prov-2',
        },
        cotizacionId: 'cotizacion-2',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    listaId: 'lista-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

describe('LogisticaListaDetalleItemTableProfessional', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  it('renders the table with items correctly', () => {
    render(<LogisticaListaDetalleItemTableProfessional items={mockItems} />)
    
    // Check if the item is displayed
    expect(screen.getByText('ITEM-001')).toBeInTheDocument()
    expect(screen.getByText('Test Item 1')).toBeInTheDocument()
    expect(screen.getByText('PZA')).toBeInTheDocument()
    expect(screen.getByText('10')).toBeInTheDocument()
  })

  it('shows action button in actions column', () => {
    render(<LogisticaListaDetalleItemTableProfessional items={mockItems} />)
    
    // Check if the action button is present
    const actionButton = screen.getByRole('button', { name: /seleccionar/i })
    expect(actionButton).toBeInTheDocument()
    expect(actionButton).not.toBeDisabled()
  })

  it('expands row when action button is clicked', async () => {
    render(<LogisticaListaDetalleItemTableProfessional items={mockItems} />)
    
    const actionButton = screen.getByRole('button', { name: /seleccionar/i })
    
    // Click to expand
    fireEvent.click(actionButton)
    
    // Check if the quote selector is displayed
    await waitFor(() => {
      expect(screen.getByText('Selección de Cotización')).toBeInTheDocument()
    })
    
    // Check if quotes are displayed
    expect(screen.getByText('Proveedor Test A')).toBeInTheDocument()
    expect(screen.getByText('Proveedor Test B')).toBeInTheDocument()
  })

  it('collapses row when action button is clicked again', async () => {
    render(<LogisticaListaDetalleItemTableProfessional items={mockItems} />)
    
    const actionButton = screen.getByRole('button', { name: /seleccionar/i })
    
    // Click to expand
    fireEvent.click(actionButton)
    
    await waitFor(() => {
      expect(screen.getByText('Selección de Cotización')).toBeInTheDocument()
    })
    
    // Click to collapse
    const hideButton = screen.getByRole('button', { name: /ocultar/i })
    fireEvent.click(hideButton)
    
    // Check if the quote selector is hidden
    await waitFor(() => {
      expect(screen.queryByText('Selección de Cotización')).not.toBeInTheDocument()
    })
  })

  it('disables action button when item has no quotes', () => {
    const itemsWithoutQuotes = [{
      ...mockItems[0],
      cotizaciones: [],
    }]
    
    render(<LogisticaListaDetalleItemTableProfessional items={itemsWithoutQuotes} />)
    
    const actionButton = screen.getByRole('button', { name: /sin cotizaciones/i })
    expect(actionButton).toBeDisabled()
  })

  it('handles quote selection successfully', async () => {
    // Mock successful API response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response)

    const onUpdated = jest.fn()
    render(
      <LogisticaListaDetalleItemTableProfessional 
        items={mockItems} 
        onUpdated={onUpdated}
      />
    )
    
    // Expand the row
    const actionButton = screen.getByRole('button', { name: /seleccionar/i })
    fireEvent.click(actionButton)
    
    await waitFor(() => {
      expect(screen.getByText('Selección de Cotización')).toBeInTheDocument()
    })
    
    // Click on a quote selection button
    const selectButtons = screen.getAllByRole('button', { name: /seleccionar/i })
    const quoteSelectButton = selectButtons.find(btn => 
      btn.textContent?.includes('Seleccionar') && !btn.textContent?.includes('Ocultar')
    )
    
    if (quoteSelectButton) {
      fireEvent.click(quoteSelectButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/lista-equipo-item/item-1/seleccionar-cotizacion',
          expect.objectContaining({
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: expect.stringContaining('cot-'),
          })
        )
      })
      
      expect(toast.success).toHaveBeenCalledWith('🏆 Cotización seleccionada correctamente')
      expect(onUpdated).toHaveBeenCalled()
    }
  })

  it('handles quote selection error', async () => {
    // Mock API error response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Test error message' }),
    } as Response)

    render(<LogisticaListaDetalleItemTableProfessional items={mockItems} />)
    
    // Expand the row
    const actionButton = screen.getByRole('button', { name: /seleccionar/i })
    fireEvent.click(actionButton)
    
    await waitFor(() => {
      expect(screen.getByText('Selección de Cotización')).toBeInTheDocument()
    })
    
    // Click on a quote selection button
    const selectButtons = screen.getAllByRole('button', { name: /seleccionar/i })
    const quoteSelectButton = selectButtons.find(btn => 
      btn.textContent?.includes('Seleccionar') && !btn.textContent?.includes('Ocultar')
    )
    
    if (quoteSelectButton) {
      fireEvent.click(quoteSelectButton)
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('❌ Error: Test error message')
      })
    }
  })

  it('displays correct status indicators', () => {
    const itemsWithSelection = [{
      ...mockItems[0],
      cotizacionSeleccionadaId: 'cot-1',
      precioElegido: 95.00,
      costoElegido: 950.00,
    }]
    
    render(<LogisticaListaDetalleItemTableProfessional items={itemsWithSelection} />)
    
    // Should show optimal selection indicator
    expect(screen.getByText('Óptimo')).toBeInTheDocument()
  })

  it('shows summary statistics correctly', () => {
    render(<LogisticaListaDetalleItemTableProfessional items={mockItems} />)
    
    // Check summary cards
    expect(screen.getByText('Total Ítems')).toBeInTheDocument()
    expect(screen.getByText('Con Selección')).toBeInTheDocument()
    expect(screen.getByText('Pendientes')).toBeInTheDocument()
    expect(screen.getByText('Costo Total')).toBeInTheDocument()
  })
})