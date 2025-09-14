// ===================================================
// 📁 Archivo: valorizacion.test.ts
// 📌 Ubicación: src/__tests__/services/
// 🔧 Descripción: Tests para servicios de valorizaciones
// 🧠 Uso: Testing de servicios de valorizaciones
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import {
  getValorizaciones,
  getValorizacionById,
  createValorizacion,
  updateValorizacion,
  deleteValorizacion
} from '@/lib/services/valorizacion'
import type { Valorizacion, ValorizacionPayload } from '@/types'

// ✅ Mock fetch globally
global.fetch = jest.fn()

const mockValorizacion: Valorizacion = {
  id: '1',
  numero: 'VAL-001',
  fechaInicio: new Date('2024-01-01'),
  fechaFin: new Date('2024-01-31'),
  montoTotal: 10000,
  estado: 'PENDIENTE',
  observaciones: 'Valorización de prueba',
  proyectoId: 'proyecto-1',
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockValorizacionPayload: ValorizacionPayload = {
  numero: 'VAL-001',
  fechaInicio: new Date('2024-01-01'),
  fechaFin: new Date('2024-01-31'),
  montoTotal: 10000,
  estado: 'PENDIENTE',
  observaciones: 'Valorización de prueba',
  proyectoId: 'proyecto-1'
}

describe('Valorizacion Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock console.error to avoid noise in test output
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getValorizaciones', () => {
    it('should get all valorizaciones successfully', async () => {
      const mockValorizaciones = [mockValorizacion]
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockValorizaciones
      } as Response)

      const result = await getValorizaciones()

      expect(fetch).toHaveBeenCalledWith('/api/valorizacion')
      expect(result).toEqual(mockValorizaciones)
    })

    it('should return empty array when fetch fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      const result = await getValorizaciones()

      expect(result).toEqual([])
      expect(console.error).toHaveBeenCalledWith('getValorizaciones:', expect.any(Error))
    })

    it('should return empty array when network error occurs', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      const result = await getValorizaciones()

      expect(result).toEqual([])
      expect(console.error).toHaveBeenCalledWith('getValorizaciones:', expect.any(Error))
    })
  })

  describe('getValorizacionById', () => {
    it('should get valorizacion by id successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockValorizacion
      } as Response)

      const result = await getValorizacionById('1')

      expect(fetch).toHaveBeenCalledWith('/api/valorizacion/1')
      expect(result).toEqual(mockValorizacion)
    })

    it('should return null when fetch fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      const result = await getValorizacionById('1')

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith('getValorizacionById:', expect.any(Error))
    })

    it('should return null when network error occurs', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      const result = await getValorizacionById('1')

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith('getValorizacionById:', expect.any(Error))
    })
  })

  describe('createValorizacion', () => {
    it('should create valorizacion successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockValorizacion
      } as Response)

      const result = await createValorizacion(mockValorizacionPayload)

      expect(fetch).toHaveBeenCalledWith('/api/valorizacion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockValorizacionPayload)
      })
      expect(result).toEqual(mockValorizacion)
    })

    it('should return null when fetch fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      const result = await createValorizacion(mockValorizacionPayload)

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith('createValorizacion:', expect.any(Error))
    })

    it('should return null when network error occurs', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      const result = await createValorizacion(mockValorizacionPayload)

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith('createValorizacion:', expect.any(Error))
    })
  })

  describe('updateValorizacion', () => {
    it('should update valorizacion successfully', async () => {
      const updatePayload = { montoTotal: 15000 }
      const updatedValorizacion = { ...mockValorizacion, ...updatePayload }
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedValorizacion
      } as Response)

      const result = await updateValorizacion('1', updatePayload)

      expect(fetch).toHaveBeenCalledWith('/api/valorizacion/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
      })
      expect(result).toEqual(updatedValorizacion)
    })

    it('should return null when fetch fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      const result = await updateValorizacion('1', { montoTotal: 15000 })

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith('updateValorizacion:', expect.any(Error))
    })

    it('should return null when network error occurs', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      const result = await updateValorizacion('1', { montoTotal: 15000 })

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith('updateValorizacion:', expect.any(Error))
    })
  })

  describe('deleteValorizacion', () => {
    it('should delete valorizacion successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true
      } as Response)

      const result = await deleteValorizacion('1')

      expect(fetch).toHaveBeenCalledWith('/api/valorizacion/1', {
        method: 'DELETE'
      })
      expect(result).toBe(true)
    })

    it('should return false when fetch fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      const result = await deleteValorizacion('1')

      expect(result).toBe(false)
    })

    it('should return false when network error occurs', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      const result = await deleteValorizacion('1')

      expect(result).toBe(false)
      expect(console.error).toHaveBeenCalledWith('deleteValorizacion:', expect.any(Error))
    })
  })
})