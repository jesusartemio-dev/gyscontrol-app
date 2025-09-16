/**
 * 🧪 Tests para CotizacionCodeGenerator
 * 
 * Pruebas unitarias para validar:
 * - Generación automática de códigos únicos
 * - Secuencia correcta por año
 * - Validación de formato
 * - Manejo de errores
 */

import { prismaMock } from '../../__mocks__/prisma'
import {
  generateNextCotizacionCode,
  getNextCotizacionSequence,
  validateCotizacionCode,
  parseCotizacionCode,
  generateCotizacionCode,
  getCurrentYearSuffix
} from '@/lib/utils/cotizacionCodeGenerator'

// ✅ Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: prismaMock
}))

describe('CotizacionCodeGenerator', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reset console methods
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getCurrentYearSuffix', () => {
    it('should return current year suffix', () => {
      const currentYear = new Date().getFullYear()
      const expectedSuffix = currentYear.toString().slice(-2)
      
      const result = getCurrentYearSuffix()
      
      expect(result).toBe(expectedSuffix)
      expect(result).toHaveLength(2)
    })
  })

  describe('generateCotizacionCode', () => {
    it('should generate code with correct format', () => {
      const numeroSecuencia = 1
      const currentYear = new Date().getFullYear()
      const yearSuffix = currentYear.toString().slice(-2)
      
      const result = generateCotizacionCode(numeroSecuencia)
      
      expect(result).toBe(`GYS-${numeroSecuencia}-${yearSuffix}`)
    })

    it('should handle large sequence numbers', () => {
      const numeroSecuencia = 9999
      const currentYear = new Date().getFullYear()
      const yearSuffix = currentYear.toString().slice(-2)
      
      const result = generateCotizacionCode(numeroSecuencia)
      
      expect(result).toBe(`GYS-${numeroSecuencia}-${yearSuffix}`)
    })
  })

  describe('validateCotizacionCode', () => {
    it('should validate correct code format', () => {
      const validCodes = [
        'GYS-1-24',
        'GYS-123-25',
        'GYS-9999-23'
      ]
      
      validCodes.forEach(code => {
        expect(validateCotizacionCode(code)).toBe(true)
      })
    })

    it('should reject invalid code formats', () => {
      const invalidCodes = [
        'GYS-1-2024', // Year too long
        'ABC-1-24',   // Wrong company code
        'GYS-A-24',   // Non-numeric sequence
        'GYS-1-2A',   // Non-numeric year
        'GYS-1',      // Missing year
        'GYS--24',    // Missing sequence
        ''
      ]
      
      invalidCodes.forEach(code => {
        expect(validateCotizacionCode(code)).toBe(false)
      })
    })
  })

  describe('parseCotizacionCode', () => {
    it('should parse valid code correctly', () => {
      const code = 'GYS-123-24'
      
      const result = parseCotizacionCode(code)
      
      expect(result).toEqual({
        companyCode: 'GYS',
        numeroSecuencia: 123,
        year: '24'
      })
    })

    it('should return null for invalid code', () => {
      const invalidCode = 'INVALID-CODE'
      
      const result = parseCotizacionCode(invalidCode)
      
      expect(result).toBeNull()
    })
  })

  describe('getNextCotizacionSequence', () => {
    it('should return 1 when no cotizaciones exist', async () => {
      prismaMock.cotizacion.findFirst.mockResolvedValue(null)
      
      const result = await getNextCotizacionSequence()
      
      expect(result).toBe(1)
      expect(prismaMock.cotizacion.findFirst).toHaveBeenCalledWith({
        orderBy: { numeroSecuencia: 'desc' },
        select: { numeroSecuencia: true }
      })
    })

    it('should return next sequence number when cotizaciones exist', async () => {
      const mockCotizacion = { numeroSecuencia: 5 }
      prismaMock.cotizacion.findFirst.mockResolvedValue(mockCotizacion)
      
      const result = await getNextCotizacionSequence()
      
      expect(result).toBe(6)
    })

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed')
      prismaMock.cotizacion.findFirst.mockRejectedValue(dbError)
      
      // Mock the fallback method
      prismaMock.cotizacion.findFirst
        .mockRejectedValueOnce(dbError)
        .mockResolvedValueOnce({ codigo: 'GYS-10-24' })
      
      const result = await getNextCotizacionSequence()
      
      expect(result).toBe(11) // 10 + 1
      expect(console.error).toHaveBeenCalledWith(
        '❌ Error getting next cotization sequence:',
        dbError
      )
    })
  })

  describe('generateNextCotizacionCode', () => {
    it('should generate complete code with sequence', async () => {
      const mockSequence = 42
      prismaMock.cotizacion.findFirst.mockResolvedValue({
        numeroSecuencia: mockSequence - 1
      })
      
      const result = await generateNextCotizacionCode()
      
      const currentYear = new Date().getFullYear()
      const yearSuffix = currentYear.toString().slice(-2)
      const expectedCode = `GYS-${mockSequence}-${yearSuffix}`
      
      expect(result).toEqual({
        codigo: expectedCode,
        numeroSecuencia: mockSequence
      })
    })

    it('should handle errors and throw meaningful message', async () => {
      const dbError = new Error('Database error')
      prismaMock.cotizacion.findFirst.mockRejectedValue(dbError)
      
      await expect(generateNextCotizacionCode()).rejects.toThrow(
        'Failed to generate cotization code'
      )
      
      expect(console.error).toHaveBeenCalledWith(
        '❌ Error generating cotization code:',
        dbError
      )
    })

    it('should generate sequential codes correctly', async () => {
      // First call
      prismaMock.cotizacion.findFirst.mockResolvedValueOnce(null)
      const result1 = await generateNextCotizacionCode()
      
      // Second call
      prismaMock.cotizacion.findFirst.mockResolvedValueOnce({
        numeroSecuencia: 1
      })
      const result2 = await generateNextCotizacionCode()
      
      expect(result1.numeroSecuencia).toBe(1)
      expect(result2.numeroSecuencia).toBe(2)
      expect(result1.codigo).toMatch(/^GYS-1-\d{2}$/)
      expect(result2.codigo).toMatch(/^GYS-2-\d{2}$/)
    })
  })

  describe('Integration scenarios', () => {
    it('should handle year transition correctly', async () => {
      // Mock current year as 2025
      const mockDate = new Date('2025-01-01')
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any)
      
      prismaMock.cotizacion.findFirst.mockResolvedValue(null)
      
      const result = await generateNextCotizacionCode()
      
      expect(result.codigo).toBe('GYS-1-25')
      expect(result.numeroSecuencia).toBe(1)
      
      jest.restoreAllMocks()
    })

    it('should validate generated codes', async () => {
      prismaMock.cotizacion.findFirst.mockResolvedValue({ numeroSecuencia: 100 })
      
      const result = await generateNextCotizacionCode()
      
      expect(validateCotizacionCode(result.codigo)).toBe(true)
      
      const parsed = parseCotizacionCode(result.codigo)
      expect(parsed).not.toBeNull()
      expect(parsed?.numeroSecuencia).toBe(101)
      expect(parsed?.companyCode).toBe('GYS')
    })
  })

  describe('Edge cases', () => {
    it('should handle very large sequence numbers', async () => {
      const largeSequence = 999999
      prismaMock.cotizacion.findFirst.mockResolvedValue({
        numeroSecuencia: largeSequence - 1
      })
      
      const result = await generateNextCotizacionCode()
      
      expect(result.numeroSecuencia).toBe(largeSequence)
      expect(result.codigo).toMatch(/^GYS-999999-\d{2}$/)
    })

    it('should handle empty database gracefully', async () => {
      prismaMock.cotizacion.findFirst.mockResolvedValue(null)
      
      const result = await generateNextCotizacionCode()
      
      expect(result.numeroSecuencia).toBe(1)
      expect(result.codigo).toMatch(/^GYS-1-\d{2}$/)
    })
  })
})