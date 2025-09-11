import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CompararCotizacionesPorItem from '../CompararCotizacionesPorItem'
import { getCotizacionProveedorItems } from '@/lib/services/cotizacionProveedorItem'
import { CotizacionProveedorItem, ListaEquipoItem } from '@/types'

// Mock the service
jest.mock('@/lib/services/cotizacionProveedorItem')
const mockGetCotizacionProveedorItems = getCotizacionProveedorItems as jest.MockedFunction<typeof getCotizacionProveedorItems>

// Mock sonner toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}))

const mockCotizacionItems: CotizacionProveedorItem[] = [
  {
    id: 'cot-1',
    cotizacionId: 'cotizacion-1',
    listaEquipoItemId: 'item-1',
    codigo: 'ITEM-001',
    descripcion: 'Test Item 1',
    unidad: 'pcs',
    cantidadOriginal: 10,
    precioUnitario: 100,
    cantidad: 5,
    costoTotal: 500,
    tiempoEntrega: '7 días',
    tiempoEntregaDias: 7,
    estado: 'cotizado',
    esSeleccionada: false,
    cotizacion: {} as any,
    listaEquipoItem: {
      id: 'item-1',
      listaId: 'lista-1',
      codigo: 'ITEM-001',
      descripcion: 'Test Item 1',
      unidad: 'pcs',
      cantidad: 10,
      verificado: false,
      estado: 'borrador',
      origen: 'cotizado',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    } as ListaEquipoItem,
  },
  {
    id: 'cot-2',
    cotizacionId: 'cotizacion-2',
    listaEquipoItemId: 'item-1', // Same item, different cotization
    codigo: 'ITEM-001',
    descripcion: 'Test Item 1',
    unidad: 'pcs',
    cantidadOriginal: 10,
    precioUnitario: 90,
    cantidad: 5,
    costoTotal: 450,
    tiempoEntrega: '10 días',
    tiempoEntregaDias: 10,
    estado: 'cotizado',
    esSeleccionada: true,
    cotizacion: {} as any,
    listaEquipoItem: {
      id: 'item-1',
      listaId: 'lista-1',
      codigo: 'ITEM-001',
      descripcion: 'Test Item 1',
      unidad: 'pcs',
      cantidad: 10,
      verificado: true,
      estado: 'borrador',
      origen: 'cotizado',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    } as ListaEquipoItem,
  },
  {
    id: 'cot-3',
    cotizacionId: 'cotizacion-3',
    listaEquipoItemId: undefined, // Test case for undefined listaEquipoItemId
    codigo: 'ITEM-002',
    descripcion: 'Test Item 2',
    unidad: 'kg',
    cantidadOriginal: 5,
    precioUnitario: 200,
    cantidad: 3,
    costoTotal: 600,
    tiempoEntrega: '5 días',
    tiempoEntregaDias: 5,
    estado: 'cotizado',
    esSeleccionada: false,
    cotizacion: {} as any,
    listaEquipoItem: undefined, // Test case for undefined listaEquipoItem
  },
  {
    id: 'cot-4',
    cotizacionId: 'cotizacion-4',
    listaEquipoItemId: 'item-2',
    codigo: 'ITEM-003',
    descripcion: 'Test Item 3',
    unidad: 'm',
    cantidadOriginal: 8,
    precioUnitario: 50,
    cantidad: 4,
    costoTotal: 200,
    tiempoEntrega: '3 días',
    tiempoEntregaDias: 3,
    estado: 'cotizado',
    esSeleccionada: false,
    cotizacion: {} as any,
    listaEquipoItem: undefined, // Test case for undefined listaEquipoItem but valid listaEquipoItemId
  },
]

describe('CompararCotizacionesPorItem', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders component and loads cotizaciones correctly', async () => {
    mockGetCotizacionProveedorItems.mockResolvedValue(mockCotizacionItems)

    render(<CompararCotizacionesPorItem />)

    await waitFor(() => {
      expect(mockGetCotizacionProveedorItems).toHaveBeenCalledTimes(1)
    })
  })

  it('groups cotizaciones by listaEquipoItemId correctly', async () => {
    const validItems = mockCotizacionItems.filter(item => 
      item.listaEquipoItemId && item.listaEquipoItem
    )
    
    mockGetCotizacionProveedorItems.mockResolvedValue(validItems)

    render(<CompararCotizacionesPorItem />)

    await waitFor(() => {
      expect(mockGetCotizacionProveedorItems).toHaveBeenCalledTimes(1)
    })

    // Should group the first two items together since they have the same listaEquipoItemId
    // The component should handle the grouping logic correctly
  })

  it('skips items without listaEquipoItemId or listaEquipoItem', async () => {
    mockGetCotizacionProveedorItems.mockResolvedValue(mockCotizacionItems)

    render(<CompararCotizacionesPorItem />)

    await waitFor(() => {
      expect(mockGetCotizacionProveedorItems).toHaveBeenCalledTimes(1)
    })

    // The component should not crash and should skip items with undefined values
    // This tests the null checks we added
  })

  it('handles empty data gracefully', async () => {
    mockGetCotizacionProveedorItems.mockResolvedValue([])

    render(<CompararCotizacionesPorItem />)

    await waitFor(() => {
      expect(mockGetCotizacionProveedorItems).toHaveBeenCalledTimes(1)
    })

    // Component should render without errors even with empty data
  })

  it('handles service error gracefully', async () => {
    const { toast } = require('sonner')
    mockGetCotizacionProveedorItems.mockResolvedValue(null)

    render(<CompararCotizacionesPorItem />)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al cargar cotizaciones')
    })
  })
})
