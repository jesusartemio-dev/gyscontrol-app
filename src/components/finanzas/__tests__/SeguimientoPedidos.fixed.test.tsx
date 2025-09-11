// ===================================================
// 📁 Archivo: SeguimientoPedidos.fixed.test.tsx
// 📌 Ubicación: src/components/finanzas/__tests__/
// 🔧 Descripción: Test para verificar las correcciones en SeguimientoPedidos
// ===================================================

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import SeguimientoPedidos from '../SeguimientoPedidos'
import { PedidoEquipo, PedidoEquipoItem } from '@/types'

// Mock de los servicios
jest.mock('@/lib/services/pedidoEquipo', () => ({
  getAllPedidoEquipos: jest.fn(() => Promise.resolve([
    {
      id: '1',
      proyectoId: 'proj-1',
      responsableId: 'user-1',
      codigo: 'PED-001',
      numeroSecuencia: 1,
      estado: 'enviado',
      fechaPedido: '2025-01-15',
      fechaNecesaria: '2025-02-15',
      fechaEntregaEstimada: '2025-02-10',
      observacion: 'Pedido urgente',
      responsable: { id: 'user-1', name: 'Juan Pérez', email: 'juan@test.com' },
      items: []
    } as PedidoEquipo
  ]))
}))

jest.mock('@/lib/services/pedidoEquipoItem', () => ({
  getPedidoEquipoItems: jest.fn(() => Promise.resolve([
    {
      id: '1',
      pedidoId: '1',
      cantidadPedida: 5,
      cantidadAtendida: 2,
      precioUnitario: 100,
      costoTotal: 500,
      estado: 'parcial',
      codigo: 'ITEM-001',
      descripcion: 'Item de prueba',
      unidad: 'unidad',
      listaEquipoItem: {
        id: '1',
        catalogoEquipo: {
          id: '1',
          precioVenta: 100
        }
      }
    } as PedidoEquipoItem
  ]))
}))

jest.mock('@/lib/utils/currency', () => ({
  formatCurrency: jest.fn((value: number) => `$${value.toLocaleString()}`)
}))

jest.mock('sonner', () => ({
  toast: {
    error: jest.fn()
  }
}))

describe('SeguimientoPedidos - Correcciones', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('🧪 debe renderizar sin errores de TypeScript', async () => {
    render(<SeguimientoPedidos />)
    
    await waitFor(() => {
      expect(screen.getByText('Seguimiento de Pedidos en Tiempo Real')).toBeInTheDocument()
    })
  })

  it('🧪 debe manejar correctamente las propiedades corregidas', async () => {
    render(<SeguimientoPedidos />)
    
    await waitFor(() => {
      // Verificar que se muestra el código del pedido
      expect(screen.getByText('PED-001')).toBeInTheDocument()
      
      // Verificar que se muestra el responsable correctamente
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument()
      
      // Verificar que se muestran las fechas correctamente
      expect(screen.getByText('10/02/2025')).toBeInTheDocument()
    })
  })

  it('🧪 debe calcular correctamente las métricas', async () => {
    const onMetricasChange = jest.fn()
    
    render(<SeguimientoPedidos onMetricasChange={onMetricasChange} />)
    
    await waitFor(() => {
      expect(onMetricasChange).toHaveBeenCalledWith(
        expect.objectContaining({
          totalPedidos: 1,
          montoTotal: expect.any(Number),
          progresoPromedio: expect.any(Number)
        })
      )
    })
  })

  it('🧪 debe manejar alertas correctamente', async () => {
    render(<SeguimientoPedidos />)
    
    await waitFor(() => {
      // El componente debe renderizar sin errores incluso con alertas
      expect(screen.getByText('Seguimiento de Pedidos en Tiempo Real')).toBeInTheDocument()
    })
  })
})
