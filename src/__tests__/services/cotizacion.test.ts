// 📁 Archivo: cotizacion.test.ts
// 🎯 Propósito: Tests para el servicio de cotizaciones
// 📋 Funcionalidades: CRUD, llamadas HTTP, validaciones

import {
  getCotizaciones,
  getCotizacionById,
  createCotizacion,
  updateCotizacion,
  deleteCotizacion,
  createCotizacionFromPlantilla
} from '../../lib/services/cotizacion'
import type { Cotizacion } from '../../types'

// 🔧 Mock de fetch global
const mockFetch = jest.fn()
global.fetch = mockFetch

// 🔧 Mock de buildApiUrl
jest.mock('../../lib/utils', () => ({
  buildApiUrl: (path: string) => `http://localhost:3000${path}`
}))

describe('Servicio de Cotizaciones', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  // 🔧 Helper para crear respuesta mock exitosa
  const createMockResponse = (data: any, ok = true) => ({
    ok,
    json: jest.fn().mockResolvedValue(data),
    text: jest.fn().mockResolvedValue(JSON.stringify(data))
  })

  describe('createCotizacionFromPlantilla', () => {
    it('✅ debe crear cotización desde plantilla con código automático', async () => {
      const payload = {
        plantillaId: 'plantilla-1',
        clienteId: 'client-1'
      }

      const mockCotizacion: Partial<Cotizacion> = {
        id: 'new-cot-1',
        codigo: 'GYS-1-25',
        numeroSecuencia: 1,
        nombre: 'Cotización de Plantilla Test',
        clienteId: 'client-1',
        plantillaId: 'plantilla-1',
        totalInterno: 10000,
        totalCliente: 12500,
        grandTotal: 12500,
        estado: 'borrador'
      }

      mockFetch.mockResolvedValue(createMockResponse(mockCotizacion))

      const result = await createCotizacionFromPlantilla(payload)

      expect(result).toEqual(mockCotizacion)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/cotizacion/from-plantilla',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        }
      )
    })

    it('❌ debe manejar error de plantilla inexistente', async () => {
      const payload = {
        plantillaId: 'plantilla-inexistente',
        clienteId: 'client-1'
      }

      mockFetch.mockResolvedValue({
        ok: false,
        text: jest.fn().mockResolvedValue(JSON.stringify({ error: 'Plantilla no encontrada' }))
      })

      await expect(createCotizacionFromPlantilla(payload)).rejects.toThrow(
        'Error al crear cotización desde plantilla'
      )
    })
  })

  describe('getCotizaciones', () => {
    it('✅ debe obtener lista de cotizaciones', async () => {
      const mockCotizaciones: Partial<Cotizacion>[] = [
        {
          id: 'cot-1',
          codigo: 'GYS-1-25',
          numeroSecuencia: 1,
          nombre: 'Cotización Test 1',
          estado: 'borrador',
          grandTotal: 10000,
          createdAt: new Date(),
          cliente: { id: 'client-1', nombre: 'Cliente Test' } as any,
          comercial: { id: 'comercial-1', name: 'Comercial Test' } as any
        }
      ]

      mockFetch.mockResolvedValue(createMockResponse(mockCotizaciones))

      const result = await getCotizaciones()

      expect(result).toEqual(mockCotizaciones)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/cotizacion',
        {
          cache: 'no-store',
          credentials: 'include'
        }
      )
    })

    it('❌ debe manejar error de servidor', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockRejectedValue(new Error('Server error'))
      })

      await expect(getCotizaciones()).rejects.toThrow('Error al obtener cotizaciones')
    })
  })

  describe('getCotizacionById', () => {
    it('✅ debe obtener cotización por ID con todas las relaciones', async () => {
      const mockCotizacion: Partial<Cotizacion> = {
        id: 'cot-1',
        codigo: 'GYS-1-25',
        numeroSecuencia: 1,
        nombre: 'Cotización Test',
        equipos: [],
        servicios: [],
        gastos: [],
        cliente: { id: 'client-1', nombre: 'Cliente Test' } as any,
        comercial: { id: 'comercial-1', name: 'Comercial Test' } as any
      }

      mockFetch.mockResolvedValue(createMockResponse(mockCotizacion))

      const result = await getCotizacionById('cot-1')

      expect(result).toEqual(mockCotizacion)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/cotizacion/cot-1',
        {
          cache: 'no-store',
          credentials: 'include'
        }
      )
    })

    it('❌ debe manejar error de cotización inexistente', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockRejectedValue(new Error('Not found'))
      })

      await expect(getCotizacionById('inexistente')).rejects.toThrow(
        'Error al obtener cotización por ID'
      )
    })
  })

  describe('createCotizacion', () => {
    it('✅ debe crear cotización con código automático', async () => {
      const payload = {
        nombre: 'Nueva Cotización',
        clienteId: 'client-1',
        comercialId: 'comercial-1'
      }

      const mockCreatedCotizacion: Partial<Cotizacion> = {
        id: 'new-cot-1',
        codigo: 'GYS-1-25',
        numeroSecuencia: 1,
        ...payload,
        totalInterno: 0,
        totalCliente: 0,
        totalEquiposInterno: 0,
        totalEquiposCliente: 0,
        totalServiciosInterno: 0,
        totalServiciosCliente: 0,
        totalGastosInterno: 0,
        totalGastosCliente: 0,
        descuento: 0,
        grandTotal: 0,
        estado: 'borrador',
        createdAt: new Date(),
        updatedAt: new Date()
      }

      mockFetch.mockResolvedValue(createMockResponse(mockCreatedCotizacion))

      const result = await createCotizacion(payload)

      expect(result).toEqual(mockCreatedCotizacion)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/cotizacion',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        }
      )
    })

    it('❌ debe manejar error de cliente inexistente', async () => {
      const payload = {
        nombre: 'Nueva Cotización',
        clienteId: 'cliente-inexistente',
        comercialId: 'comercial-1'
      }

      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockRejectedValue(new Error('Foreign key constraint failed'))
      })

      await expect(createCotizacion(payload)).rejects.toThrow(
        'Error al crear cotización'
      )
    })
  })

  describe('updateCotizacion', () => {
    it('✅ debe actualizar cotización existente', async () => {
      const payload = {
        nombre: 'Cotización Actualizada',
        descuento: 500
      }

      const mockUpdatedCotizacion: Partial<Cotizacion> = {
        id: 'cot-1',
        codigo: 'GYS-1-25',
        numeroSecuencia: 1,
        nombre: 'Cotización Actualizada',
        descuento: 500,
        grandTotal: 9500
      }

      mockFetch.mockResolvedValue(createMockResponse(mockUpdatedCotizacion))

      const result = await updateCotizacion('cot-1', payload)

      expect(result).toEqual(mockUpdatedCotizacion)
      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/cotizacion/cot-1',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify(payload)
        }
      )
    })

    it('❌ debe manejar error de cotización inexistente', async () => {
      const payload = {
        nombre: 'Cotización Actualizada'
      }

      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockRejectedValue(new Error('Record to update not found'))
      })

      await expect(updateCotizacion('inexistente', payload)).rejects.toThrow(
        'Error al actualizar cotización'
      )
    })
  })

  describe('deleteCotizacion', () => {
    it('✅ debe eliminar cotización existente', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: jest.fn().mockResolvedValue({ success: true })
      })

      await deleteCotizacion('cot-1')

      expect(mockFetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/cotizacion/cot-1',
        {
          method: 'DELETE',
          credentials: 'include'
        }
      )
    })

    it('❌ debe manejar error de cotización inexistente', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        json: jest.fn().mockRejectedValue(new Error('Record to delete does not exist'))
      })

      await expect(deleteCotizacion('inexistente')).rejects.toThrow(
        'Error al eliminar cotización'
      )
    })
  })
})
