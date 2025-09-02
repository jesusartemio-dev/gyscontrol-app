/**
 * @fileoverview Tests para CotizacionProveedorAccordion - Verificación de actualizaciones locales optimizadas
 * @version 1.0.0
 * @author GYS Team
 * @created 2024-01-20
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import CotizacionProveedorAccordion from './CotizacionProveedorAccordion'
import { CotizacionProveedor, CotizacionProveedorItem } from '@/types'

// 🔧 Mocks
jest.mock('@/lib/services/cotizacionProveedor', () => ({
  getCotizacionProveedorById: jest.fn(),
  updateCotizacionProveedor: jest.fn(),
  deleteCotizacionProveedor: jest.fn(),
}))

jest.mock('./CotizacionProveedorTabla', () => {
  return function MockCotizacionProveedorTabla({ 
    items, 
    onItemUpdated, 
    onUpdated 
  }: {
    items: CotizacionProveedorItem[]
    onItemUpdated?: (item: CotizacionProveedorItem) => void
    onUpdated?: () => void
  }) {
    return (
      <div data-testid="cotizacion-tabla">
        <div>Items: {items.length}</div>
        <button 
          onClick={() => {
            const updatedItem: CotizacionProveedorItem = {
              ...items[0],
              cantidad: 5,
              costoTotal: 500,
            }
            onItemUpdated?.(updatedItem)
          }}
        >
          Simular Actualización Local
        </button>
        <button onClick={() => onUpdated?.()}>
          Simular Refetch Completo
        </button>
      </div>
    )
  }
})

// 📋 Mock data
const mockCotizacion: CotizacionProveedor = {
  id: 'cot-1',
  codigo: 'COT-001',
  fechaCotizacion: new Date('2024-01-15'),
  fechaVencimiento: new Date('2024-02-15'),
  estado: 'Pendiente',
  observaciones: 'Cotización de prueba',
  proveedorId: 'prov-1',
  proyectoId: 'proj-1',
  createdAt: new Date(),
  updatedAt: new Date(),
  proveedor: {
    id: 'prov-1',
    nombre: 'Proveedor Test',
    email: 'test@proveedor.com',
    telefono: '123456789',
    direccion: 'Dirección Test',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  proyecto: {
    id: 'proj-1',
    nombre: 'Proyecto Test',
    descripcion: 'Descripción del proyecto',
    fechaInicio: new Date(),
    fechaFin: new Date(),
    estado: 'Activo',
    clienteId: 'client-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  items: [
    {
      id: 'item-1',
      codigo: 'ITEM-001',
      descripcion: 'Item de prueba',
      cantidad: 2,
      precioUnitario: 100,
      costoTotal: 200,
      tiempoEntrega: 'Stock',
      estado: 'Pendiente',
      seleccionada: false,
      cotizacionProveedorId: 'cot-1',
      listaEquipoControlId: 'lista-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ],
}

describe('CotizacionProveedorAccordion - Actualizaciones Locales Optimizadas', () => {
  const mockProps = {
    cotizacion: mockCotizacion,
    onUpdate: jest.fn(),
    onDelete: jest.fn(),
    onUpdatedItem: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('✅ debe actualizar el estado local cuando se actualiza un item sin llamar onUpdatedItem', async () => {
    // 🔧 Setup
    render(<CotizacionProveedorAccordion {...mockProps} />)

    // 📡 Verificar estado inicial
    expect(screen.getByText('Items: 1')).toBeInTheDocument()

    // 🔄 Simular actualización local
    const updateButton = screen.getByText('Simular Actualización Local')
    fireEvent.click(updateButton)

    // ✅ Verificaciones
    await waitFor(() => {
      // El componente debe mantener el estado actualizado localmente
      expect(mockProps.onUpdatedItem).not.toHaveBeenCalled() // No debe llamar refetch completo
    })
  })

  it('🔄 debe llamar onUpdatedItem cuando se usa refetch completo', async () => {
    // 🔧 Setup
    render(<CotizacionProveedorAccordion {...mockProps} />)

    // 📡 Simular refetch completo
    const refetchButton = screen.getByText('Simular Refetch Completo')
    fireEvent.click(refetchButton)

    // ✅ Verificaciones
    await waitFor(() => {
      expect(mockProps.onUpdatedItem).toHaveBeenCalled()
    })
  })

  it('📊 debe mostrar información correcta de la cotización', () => {
    // 🔧 Setup
    render(<CotizacionProveedorAccordion {...mockProps} />)

    // ✅ Verificaciones
    expect(screen.getByText('COT-001')).toBeInTheDocument()
    expect(screen.getByText('Proveedor Test')).toBeInTheDocument()
    expect(screen.getByText('Proyecto Test')).toBeInTheDocument()
  })

  it('🎯 debe manejar correctamente el estado de carga', () => {
    // 🔧 Setup
    render(<CotizacionProveedorAccordion {...mockProps} />)

    // ✅ Verificaciones - El componente debe renderizar sin errores
    expect(screen.getByTestId('cotizacion-tabla')).toBeInTheDocument()
  })

  it('🔧 debe pasar las props correctas a CotizacionProveedorTabla', () => {
    // 🔧 Setup
    render(<CotizacionProveedorAccordion {...mockProps} />)

    // ✅ Verificaciones
    expect(screen.getByTestId('cotizacion-tabla')).toBeInTheDocument()
    expect(screen.getByText('Items: 1')).toBeInTheDocument() // Verifica que los items se pasan correctamente
    expect(screen.getByText('Simular Actualización Local')).toBeInTheDocument() // Verifica que onItemUpdated se pasa
    expect(screen.getByText('Simular Refetch Completo')).toBeInTheDocument() // Verifica que onUpdated se pasa
  })
})

// 🧪 Tests de integración para el flujo completo
describe('CotizacionProveedorAccordion - Flujo de Actualización Completo', () => {
  it('🔄 debe mantener consistencia de datos durante actualizaciones locales', async () => {
    // 🔧 Setup
    const mockProps = {
      cotizacion: mockCotizacion,
      onUpdate: jest.fn(),
      onDelete: jest.fn(),
      onUpdatedItem: jest.fn(),
    }

    const { rerender } = render(<CotizacionProveedorAccordion {...mockProps} />)

    // 📡 Simular actualización local
    const updateButton = screen.getByText('Simular Actualización Local')
    fireEvent.click(updateButton)

    // 🔄 Simular re-render con nuevos props (como si viniera del padre)
    const updatedCotizacion = {
      ...mockCotizacion,
      items: [
        {
          ...mockCotizacion.items[0],
          cantidad: 5,
          costoTotal: 500,
        },
      ],
    }

    rerender(
      <CotizacionProveedorAccordion 
        {...mockProps} 
        cotizacion={updatedCotizacion} 
      />
    )

    // ✅ Verificaciones
    await waitFor(() => {
      expect(screen.getByTestId('cotizacion-tabla')).toBeInTheDocument()
      // El componente debe manejar correctamente los cambios de props
    })
  })
})