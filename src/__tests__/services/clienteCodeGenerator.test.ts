/**
 * 🧪 Tests for Cliente Code Generator
 * 
 * Tests the automatic code generation for clients following the pattern CLI-XXXX-YY
 */

import { 
  getNextClienteSequence,
  generateClienteCode,
  generateNextClienteCode,
  validateClienteCode,
  parseClienteCode,
  getCurrentYearSuffix
} from '@/lib/utils/clienteCodeGenerator'
import { prisma } from '@/lib/prisma'

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    cliente: {
      findFirst: jest.fn()
    }
  }
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('Cliente Code Generator', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock console methods to avoid noise in tests
    jest.spyOn(console, 'log').mockImplementation()
    jest.spyOn(console, 'error').mockImplementation()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getNextClienteSequence', () => {
    it('should return 1 when no clients exist', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue(null)

      const result = await getNextClienteSequence()

      expect(result).toBe(1)
      expect(mockPrisma.cliente.findFirst).toHaveBeenCalledWith({
        orderBy: { numeroSecuencia: 'desc' },
        select: { numeroSecuencia: true }
      })
    })

    it('should return next sequence when client exists with valid numeroSecuencia', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue({
        numeroSecuencia: 5
      })

      const result = await getNextClienteSequence()

      expect(result).toBe(6)
    })

    it('should handle null numeroSecuencia correctly', async () => {
      // ✅ Test the null safety fix
      mockPrisma.cliente.findFirst.mockResolvedValue({
        numeroSecuencia: null
      })

      const result = await getNextClienteSequence()

      expect(result).toBe(1) // Should use (null ?? 0) + 1 = 1
    })

    it('should handle undefined numeroSecuencia correctly', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue({
        numeroSecuencia: undefined
      } as any)

      const result = await getNextClienteSequence()

      expect(result).toBe(1) // Should use (undefined ?? 0) + 1 = 1
    })

    it('should fallback to codigo pattern extraction on database error', async () => {
      // First call fails (main query)
      mockPrisma.cliente.findFirst
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({
          codigo: 'CLI-0025-25'
        })

      const result = await getNextClienteSequence()

      expect(result).toBe(26) // Should extract 25 from CLI-0025-25 and add 1
      expect(mockPrisma.cliente.findFirst).toHaveBeenCalledTimes(2)
    })

    it('should return 1 when fallback also fails', async () => {
      mockPrisma.cliente.findFirst
        .mockRejectedValueOnce(new Error('Database error'))
        .mockRejectedValueOnce(new Error('Fallback error'))

      const result = await getNextClienteSequence()

      expect(result).toBe(1)
    })
  })

  describe('generateClienteCode', () => {
    it('should generate correct code format with padding', () => {
      const testCases = [
        { input: 1, expected: 'CLI-0001-' },
        { input: 25, expected: 'CLI-0025-' },
        { input: 150, expected: 'CLI-0150-' },
        { input: 9999, expected: 'CLI-9999-' }
      ]

      testCases.forEach(({ input, expected }) => {
        const result = generateClienteCode(input)
        expect(result).toMatch(new RegExp(`^${expected}\\d{2}$`))
      })
    })

    it('should include current year suffix', () => {
      const currentYear = new Date().getFullYear()
      const expectedSuffix = currentYear.toString().slice(-2)
      
      const result = generateClienteCode(1)
      
      expect(result).toBe(`CLI-0001-${expectedSuffix}`)
    })
  })

  describe('getCurrentYearSuffix', () => {
    it('should return last two digits of current year', () => {
      const currentYear = new Date().getFullYear()
      const expected = currentYear.toString().slice(-2)
      
      const result = getCurrentYearSuffix()
      
      expect(result).toBe(expected)
      expect(result).toHaveLength(2)
    })
  })

  describe('generateNextClienteCode', () => {
    it('should generate complete code with sequence and year', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue({
        numeroSecuencia: 10
      })

      const result = await generateNextClienteCode()
      const currentYear = new Date().getFullYear().toString().slice(-2)

      expect(result).toEqual({
        codigo: `CLI-0011-${currentYear}`,
        numeroSecuencia: 11
      })
    })

    it('should handle errors gracefully and use fallback', async () => {
      // Mock both database calls to fail, but the function should still return a result
      mockPrisma.cliente.findFirst
        .mockRejectedValueOnce(new Error('Database error'))
        .mockRejectedValueOnce(new Error('Fallback error'))

      const result = await generateNextClienteCode()
      
      // Should return default values when all database calls fail
      expect(result).toEqual({
        codigo: 'CLI-0001-25',
        numeroSecuencia: 1
      })
    })
  })

  describe('validateClienteCode', () => {
    it('should validate correct code formats', () => {
      const validCodes = [
        'CLI-0001-25',
        'CLI-9999-99',
        'CLI-0150-24'
      ]

      validCodes.forEach(code => {
        expect(validateClienteCode(code)).toBe(true)
      })
    })

    it('should reject invalid code formats', () => {
      const invalidCodes = [
        'CLI-001-25',    // Wrong padding
        'CLI-0001-2025', // Wrong year format
        'ABC-0001-25',   // Wrong prefix
        'CLI-0001',      // Missing year
        'CLI-ABCD-25',   // Non-numeric sequence
        ''               // Empty string
      ]

      invalidCodes.forEach(code => {
        expect(validateClienteCode(code)).toBe(false)
      })
    })
  })

  describe('parseClienteCode', () => {
    it('should parse valid codes correctly', () => {
      const result = parseClienteCode('CLI-0150-25')

      expect(result).toEqual({
        clientCode: 'CLI',
        numeroSecuencia: 150,
        year: '25'
      })
    })

    it('should return null for invalid codes', () => {
      const invalidCodes = [
        'CLI-001-25',
        'ABC-0001-25',
        'invalid-code'
      ]

      invalidCodes.forEach(code => {
        expect(parseClienteCode(code)).toBeNull()
      })
    })
  })

  describe('Integration Tests', () => {
    it('should handle complete workflow with null numeroSecuencia', async () => {
      // ✅ Integration test for the null safety fix
      mockPrisma.cliente.findFirst.mockResolvedValue({
        numeroSecuencia: null
      })

      const { codigo, numeroSecuencia } = await generateNextClienteCode()
      const currentYear = new Date().getFullYear().toString().slice(-2)

      expect(numeroSecuencia).toBe(1)
      expect(codigo).toBe(`CLI-0001-${currentYear}`)
      expect(validateClienteCode(codigo)).toBe(true)

      const parsed = parseClienteCode(codigo)
      expect(parsed).toEqual({
        clientCode: 'CLI',
        numeroSecuencia: 1,
        year: currentYear
      })
    })

    it('should handle edge case with zero numeroSecuencia', async () => {
      mockPrisma.cliente.findFirst.mockResolvedValue({
        numeroSecuencia: 0
      })

      const result = await getNextClienteSequence()

      expect(result).toBe(1) // 0 + 1 = 1
    })
  })
})
