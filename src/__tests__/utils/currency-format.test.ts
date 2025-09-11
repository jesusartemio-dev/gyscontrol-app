/**
 * Test para verificar que el formato de moneda esté configurado correctamente en USD
 * Autor: GYS Team
 * Fecha: 2025-01-27
 */

import { formatCurrency } from '@/lib/utils/currency'

describe('Currency Format Tests', () => {
  describe('formatCurrency', () => {
    it('should format currency in USD by default', () => {
      expect(formatCurrency(100)).toBe('$100.00')
      expect(formatCurrency(1234.56)).toBe('$1,234.56')
      expect(formatCurrency(0)).toBe('$0.00')
    })

    it('should handle negative amounts', () => {
      expect(formatCurrency(-100)).toBe('-$100.00')
      expect(formatCurrency(-1234.56)).toBe('-$1,234.56')
    })

    it('should handle decimal places correctly', () => {
      expect(formatCurrency(100.1)).toBe('$100.10')
      expect(formatCurrency(100.123)).toBe('$100.12')
      expect(formatCurrency(100.999)).toBe('$101.00')
    })

    it('should handle large numbers with proper formatting', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00')
      expect(formatCurrency(1234567.89)).toBe('$1,234,567.89')
    })

    it('should use USD currency by default', () => {
      const result = formatCurrency(100)
      expect(result).toContain('$')
      expect(result).not.toContain('S/')
      expect(result).not.toContain('PEN')
    })

    it('should allow custom currency options', () => {
      const result = formatCurrency(100, { currency: 'EUR' })
      expect(result).toContain('€')
    })
  })
})
