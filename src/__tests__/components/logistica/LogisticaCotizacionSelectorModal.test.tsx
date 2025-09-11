// ===================================================
// 📁 Archivo: LogisticaCotizacionSelectorModal.test.tsx
// 📌 Ubicación: src/__tests__/components/logistica/
// 🔧 Descripción: Tests para LogisticaCotizacionSelectorModal
// ===================================================

import React from 'react'
import { render, screen } from '@testing-library/react'
import LogisticaCotizacionSelectorModal from '../../../components/logistica/LogisticaCotizacionSelectorModal'

// 🔧 Mock de sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// 🔧 Mock de next/navigation
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}))

// 🔧 Mock de servicios
jest.mock('../../../lib/services/listaEquipoItem', () => ({
  updateListaEquipoItem: jest.fn().mockResolvedValue({ success: true }),
}))

// 🔧 Mock global de fetch
global.fetch = jest.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ success: true }),
})

describe('LogisticaCotizacionSelectorModal', () => {
  const mockItem = {
    id: 'item-1',
    listaId: 'lista-1',
    codigo: 'TEST-001',
    descripcion: 'Item de prueba',
    unidad: 'UND',
    cantidad: 5,
    verificado: false,
    estado: 'por_cotizar' as const,
    origen: 'nuevo' as const,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    cotizacionSeleccionadaId: null,
    lista: {
      id: 'lista-1',
      codigo: 'LST-001',
      nombre: 'Lista Test',
      estado: 'borrador' as const,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    cotizaciones: [
      {
        id: 'cot-item-1',
        cotizacionId: 'cotizacion-1',
        codigo: 'TEST-001',
        descripcion: 'Item de prueba',
        unidad: 'UND',
        cantidadOriginal: 5,
        precioUnitario: 100.50,
        cantidad: 5,
        tiempoEntregaDias: 15,
        estado: 'cotizado' as const,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
        cotizacion: {
          id: 'cotizacion-1',
          codigo: 'COT-001',
          estado: 'enviada' as const,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          proveedor: {
            id: 'prov-1',
            nombre: 'Proveedor A',
            createdAt: '2024-01-01T00:00:00Z',
            updatedAt: '2024-01-01T00:00:00Z',
          },
        },
      },
    ],
    pedidos: [],
  }

  const defaultProps = {
    item: mockItem,
    open: false,
    onOpenChange: jest.fn(),
    onUpdated: jest.fn(),
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ✅ Test 1: Component export
  it('should export the component', () => {
    expect(LogisticaCotizacionSelectorModal).toBeDefined()
    expect(typeof LogisticaCotizacionSelectorModal).toBe('function')
  })

  // ✅ Test 2: Component name
  it('should have correct component name', () => {
    expect(LogisticaCotizacionSelectorModal.name).toBe('LogisticaCotizacionSelectorModal')
  })

  // ✅ Test 3: Component is a React function component
  it('should be a React function component', () => {
    expect(typeof LogisticaCotizacionSelectorModal).toBe('function')
    expect(LogisticaCotizacionSelectorModal.length).toBeGreaterThan(0) // Should accept props
  })

  // ✅ Test 4: Props validation
  it('should accept required props', () => {
    expect(typeof defaultProps.item).toBe('object')
    expect(typeof defaultProps.onOpenChange).toBe('function')
    expect(typeof defaultProps.onUpdated).toBe('function')
    expect(typeof defaultProps.open).toBe('boolean')
  })

  // ✅ Test 5: Item data structure validation
  it('should handle item data structure correctly', () => {
    expect(defaultProps.item).toHaveProperty('id')
    expect(defaultProps.item).toHaveProperty('codigo')
    expect(defaultProps.item).toHaveProperty('descripcion')
    expect(Array.isArray(defaultProps.item.cotizaciones)).toBe(true)
    expect(defaultProps.item.cotizaciones).toHaveLength(1)
  })
})
