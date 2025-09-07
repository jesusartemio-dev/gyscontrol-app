/**
 * 🧪 Tests para la página de Aprovisionamiento
 * 
 * Verifica:
 * - Renderizado correcto de la página
 * - Manejo de searchParams como Promise
 * - Integración con componentes principales
 * - Estados de carga y error
 * 
 * @author GYS Team
 * @version 1.0.0
 */

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { jest } from '@jest/globals'
import { use } from 'react'
import AprovisionamientoPage from '@/app/finanzas/aprovisionamiento/page'
import { proyectosAprovisionamientoService } from '@/lib/services/aprovisionamiento'

// 🎭 Mocks
jest.mock('@/lib/services/aprovisionamiento', () => ({
  proyectosAprovisionamientoService: {
    obtenerProyectos: jest.fn()
  }
}))

jest.mock('@/components/finanzas/aprovisionamiento/ProyectoAprovisionamientoTable', () => {
  return function MockProyectoAprovisionamientoTable() {
    return <div data-testid="proyecto-table">Tabla de Proyectos</div>
  }
})

jest.mock('@/components/finanzas/aprovisionamiento/ProyectoAprovisionamientoStats', () => {
  return function MockProyectoAprovisionamientoStats() {
    return <div data-testid="proyecto-stats">Estadísticas</div>
  }
})

jest.mock('@/components/finanzas/aprovisionamiento/ProyectoAprovisionamientoFilters', () => {
  return function MockProyectoAprovisionamientoFilters() {
    return <div data-testid="proyecto-filters">Filtros</div>
  }
})

const mockProyectosService = proyectosAprovisionamientoService as jest.Mocked<typeof proyectosAprovisionamientoService>

describe('AprovisionamientoPage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // ✅ Mock successful response
    mockProyectosService.obtenerProyectos.mockResolvedValue({
      data: [
        {
          id: '1',
          nombre: 'Proyecto Test',
          estado: 'activo',
          totalCliente: 10000
        }
      ],
      pagination: {
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1
      }
    })
  })

  it('should handle searchParams as Promise and initialize filters correctly with useMemo', async () => {
    const mockSearchParams = Promise.resolve({
      estado: 'activo',
      comercial: 'cliente-1',
      page: '2'
    })

    const mockResponse = {
      data: [
        {
          id: '1',
          nombre: 'Proyecto Test',
          estado: 'activo',
          totalCliente: 10000
        }
      ],
      pagination: { total: 2, page: 2, limit: 20 }
    }
    
    mockProyectosService.obtenerProyectos.mockResolvedValue(mockResponse)

    render(<AprovisionamientoPage searchParams={mockSearchParams} />)

    // ✅ Verify that filters are memoized and service is called correctly
    await waitFor(() => {
      expect(mockProyectosService.obtenerProyectos).toHaveBeenCalledWith({
        estado: 'activo',
        clienteId: 'cliente-1',
        fechaInicio: undefined,
        page: 2,
        limit: 20
      })
    })

    expect(screen.getByText('Aprovisionamiento')).toBeInTheDocument()
  })

  it('should prevent infinite re-renders with memoized filters', async () => {
    const mockSearchParams = Promise.resolve({
      estado: 'activo',
      comercial: 'cliente-1'
    })

    const mockResponse = {
      data: [
        {
          id: '1',
          nombre: 'Proyecto Test',
          estado: 'activo',
          totalCliente: 10000
        }
      ],
      pagination: { total: 1, page: 1, limit: 20 }
    }
    
    mockProyectosService.obtenerProyectos.mockResolvedValue(mockResponse)

    render(<AprovisionamientoPage searchParams={mockSearchParams} />)

    // ✅ Wait for initial render and service call
    await waitFor(() => {
      expect(mockProyectosService.obtenerProyectos).toHaveBeenCalledTimes(1)
    })

    // ✅ Wait a bit more to ensure no additional calls are made
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // ✅ Verify service was not called multiple times (no infinite loop)
    expect(mockProyectosService.obtenerProyectos).toHaveBeenCalledTimes(1)
  })

  it('should handle empty searchParams Promise', async () => {
    // ✅ Arrange - empty searchParams
    const searchParams = Promise.resolve({})

    // ✅ Act
    render(<AprovisionamientoPage searchParams={searchParams} />)

    // ✅ Assert - Should render without errors
    await waitFor(() => {
      expect(screen.getByText('Aprovisionamiento')).toBeInTheDocument()
    })

    // ✅ Assert - Service called with default filters
    expect(mockProyectosService.obtenerProyectos).toHaveBeenCalledWith({
      estado: undefined,
      clienteId: undefined,
      fechaInicio: undefined,
      page: 1,
      limit: 20
    })
  })

  it('should handle service error gracefully', async () => {
    // ✅ Arrange - mock service error
    mockProyectosService.obtenerProyectos.mockRejectedValue(new Error('Service error'))
    const searchParams = Promise.resolve({})

    // ✅ Act
    render(<AprovisionamientoPage searchParams={searchParams} />)

    // ✅ Assert - Should still render page structure
    await waitFor(() => {
      expect(screen.getByText('Aprovisionamiento')).toBeInTheDocument()
    })
  })

  it('should parse page parameter correctly', async () => {
    // ✅ Arrange - searchParams with page
    const searchParams = Promise.resolve({
      page: '3'
    })

    // ✅ Act
    render(<AprovisionamientoPage searchParams={searchParams} />)

    // ✅ Assert - Service called with correct page
    await waitFor(() => {
      expect(mockProyectosService.obtenerProyectos).toHaveBeenCalledWith({
        estado: undefined,
        clienteId: undefined,
        fechaInicio: undefined,
        page: 3,
        limit: 20
      })
    })
  })

  it('should handle invalid page parameter', async () => {
    // ✅ Arrange - searchParams with invalid page
    const searchParams = Promise.resolve({
      page: 'invalid'
    })

    // ✅ Act
    render(<AprovisionamientoPage searchParams={searchParams} />)

    // ✅ Assert - Should default to page 1
    await waitFor(() => {
      expect(mockProyectosService.obtenerProyectos).toHaveBeenCalledWith({
        estado: undefined,
        clienteId: undefined,
        fechaInicio: undefined,
        page: 1, // NaN becomes 1
        limit: 20
      })
    })
  })

  it('should handle date range filters correctly', async () => {
    // ✅ Arrange - searchParams with date range
    const searchParams = Promise.resolve({
      fechaInicio: '2024-01-01',
      fechaFin: '2024-12-31'
    })

    // ✅ Act
    render(<AprovisionamientoPage searchParams={searchParams} />)

    // ✅ Assert - Service called with date object
    await waitFor(() => {
      expect(mockProyectosService.obtenerProyectos).toHaveBeenCalledWith({
        estado: undefined,
        clienteId: undefined,
        fechaInicio: {
          desde: '2024-01-01',
          hasta: '2024-12-31'
        },
        page: 1,
        limit: 20
      })
    })
  })

  it('should render all tab sections', async () => {
    // ✅ Arrange
    const searchParams = Promise.resolve({})

    // ✅ Act
    render(<AprovisionamientoPage searchParams={searchParams} />)

    // ✅ Assert - Check tabs are present
    await waitFor(() => {
      expect(screen.getByText('Vista General')).toBeInTheDocument()
      expect(screen.getByText('Proyecciones')).toBeInTheDocument()
      expect(screen.getByText('Reportes')).toBeInTheDocument()
    })
  })
})