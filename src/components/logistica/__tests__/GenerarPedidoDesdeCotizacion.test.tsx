// ===================================================
// 📁 Test File: GenerarPedidoDesdeCotizacion.test.tsx
// 🧪 Description: Unit tests for GenerarPedidoDesdeCotizacion component
// ✅ Tests payload structure and field validation
// ===================================================

/// <reference types="@testing-library/jest-dom" />
import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import GenerarPedidoDesdeCotizacion from '../GenerarPedidoDesdeCotizacion'
import { getCotizacionProveedorItems } from '@/lib/services/cotizacionProveedorItem'
import { createPedidoEquipoItem } from '@/lib/services/pedidoEquipoItem'
import { CotizacionProveedorItem } from '@/types'

// Mock dependencies
jest.mock('sonner')
jest.mock('@/lib/services/cotizacionProveedorItem')
jest.mock('@/lib/services/pedidoEquipoItem')

const mockGetCotizacionProveedorItems = getCotizacionProveedorItems as jest.MockedFunction<typeof getCotizacionProveedorItems>
const mockCreatePedidoEquipoItem = createPedidoEquipoItem as jest.MockedFunction<typeof createPedidoEquipoItem>
const mockToast = toast as jest.Mocked<typeof toast>

describe('GenerarPedidoDesdeCotizacion', () => {
  const defaultProps = {
    pedidoId: 'test-pedido-id',
    responsableId: 'test-responsable-id'
  }

  const mockCotizacionItem: CotizacionProveedorItem = {
    id: 'test-item-id',
    cotizacionId: 'test-cotizacion-id',
    listaEquipoItemId: 'test-lista-item-id',
    codigo: 'TEST-001',
    descripcion: 'Test Item Description',
    unidad: 'pza',
    precioUnitario: 100,
    cantidad: 5,
    cantidadOriginal: 5,
    costoTotal: 500,
    tiempoEntrega: '7 días',
    tiempoEntregaDias: 7,
    esSeleccionada: true,
    estado: 'cotizado',
    cotizacion: {} as any,
    listaEquipoItem: {} as any
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render component with correct item count', async () => {
    mockGetCotizacionProveedorItems.mockResolvedValue([mockCotizacionItem])

    render(<GenerarPedidoDesdeCotizacion {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Se generarán 1 ítems para el pedido.')).toBeInTheDocument()
    })
  })

  it('should create pedido items with correct payload structure', async () => {
    mockGetCotizacionProveedorItems.mockResolvedValue([mockCotizacionItem])
    mockCreatePedidoEquipoItem.mockResolvedValue({
      id: 'created-item-id',
      pedidoId: defaultProps.pedidoId,
      responsableId: defaultProps.responsableId,
      listaEquipoItemId: mockCotizacionItem.listaEquipoItemId,
      cantidadPedida: mockCotizacionItem.cantidad!,
      precioUnitario: mockCotizacionItem.precioUnitario,
      costoTotal: mockCotizacionItem.costoTotal,
      codigo: mockCotizacionItem.codigo!,
      descripcion: mockCotizacionItem.descripcion!,
      unidad: mockCotizacionItem.unidad!,
      fechaOrdenCompraRecomendada: new Date(),
      estado: 'pendiente',
      createdAt: new Date(),
      updatedAt: new Date()
    } as any)

    render(<GenerarPedidoDesdeCotizacion {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Se generarán 1 ítems para el pedido.')).toBeInTheDocument()
    })

    const generateButton = screen.getByText('📄 Generar Pedido desde Cotizaciones')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(mockCreatePedidoEquipoItem).toHaveBeenCalledWith({
        pedidoId: defaultProps.pedidoId,
        responsableId: defaultProps.responsableId,
        listaEquipoItemId: mockCotizacionItem.listaEquipoItemId,
        cantidadPedida: mockCotizacionItem.cantidad,
        precioUnitario: mockCotizacionItem.precioUnitario,
        costoTotal: mockCotizacionItem.costoTotal,
        fechaOrdenCompraRecomendada: expect.any(String), // Should use fechaOrdenCompraRecomendada, not fechaNecesaria
        estado: 'pendiente',
        codigo: mockCotizacionItem.codigo,
        descripcion: mockCotizacionItem.descripcion,
        unidad: mockCotizacionItem.unidad
      })
    })

    expect(mockToast.success).toHaveBeenCalledWith('📦 Pedido generado exitosamente')
  })

  it('should show warning when no items are selected', async () => {
    mockGetCotizacionProveedorItems.mockResolvedValue([])

    render(<GenerarPedidoDesdeCotizacion {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Se generarán 0 ítems para el pedido.')).toBeInTheDocument()
    })

    const generateButton = screen.getByText('📄 Generar Pedido desde Cotizaciones')
    fireEvent.click(generateButton)

    expect(mockToast.warning).toHaveBeenCalledWith('No hay cotizaciones seleccionadas')
    expect(mockCreatePedidoEquipoItem).not.toHaveBeenCalled()
  })

  it('should handle errors during item creation', async () => {
    mockGetCotizacionProveedorItems.mockResolvedValue([mockCotizacionItem])
    mockCreatePedidoEquipoItem.mockRejectedValue(new Error('API Error'))

    render(<GenerarPedidoDesdeCotizacion {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Se generarán 1 ítems para el pedido.')).toBeInTheDocument()
    })

    const generateButton = screen.getByText('📄 Generar Pedido desde Cotizaciones')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Error al generar pedido')
    })
  })

  it('should use fallback values for missing item properties', async () => {
    const incompleteItem: CotizacionProveedorItem = {
      ...mockCotizacionItem,
      codigo: '',
    descripcion: '',
    unidad: '',
      esSeleccionada: true
    }

    mockGetCotizacionProveedorItems.mockResolvedValue([incompleteItem])
    mockCreatePedidoEquipoItem.mockResolvedValue({} as any)

    render(<GenerarPedidoDesdeCotizacion {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Se generarán 1 ítems para el pedido.')).toBeInTheDocument()
    })

    const generateButton = screen.getByText('📄 Generar Pedido desde Cotizaciones')
    fireEvent.click(generateButton)

    await waitFor(() => {
      expect(mockCreatePedidoEquipoItem).toHaveBeenCalledWith(
        expect.objectContaining({
          codigo: 'N/A',
          descripcion: 'Descripción no disponible',
          unidad: 'pza'
        })
      )
    })
  })
})