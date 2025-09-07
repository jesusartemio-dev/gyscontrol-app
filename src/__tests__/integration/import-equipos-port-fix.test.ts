/**
 * Test de integración para verificar que la importación de equipos
 * funciona correctamente con la configuración de puerto corregida
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getCategoriasEquipo } from '@/lib/services/categoriaEquipo'
import { getUnidades } from '@/lib/services/unidad'
import { buildApiUrl } from '@/lib/utils'

// Mock fetch para simular respuestas exitosas
global.fetch = vi.fn()

describe('Import Equipos - Port Configuration Fix', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful responses
    ;(fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ([
        { id: '1', nombre: 'Test Category' },
        { id: '2', nombre: 'Test Unit' }
      ])
    } as Response)
  })

  describe('buildApiUrl function', () => {
    it('should return relative URLs in client environment', () => {
      // Simulate client environment
      Object.defineProperty(window, 'window', {
        value: {},
        writable: true
      })
      
      const url = buildApiUrl('/api/categoria-equipo')
      expect(url).toBe('/api/categoria-equipo')
    })

    it('should return absolute URLs in server environment', () => {
      // Simulate server environment
      const originalWindow = global.window
      delete (global as any).window
      
      // Mock environment variable
      process.env.NEXTAUTH_URL = 'http://localhost:3000'
      
      const url = buildApiUrl('/api/categoria-equipo')
      expect(url).toBe('http://localhost:3000/api/categoria-equipo')
      
      // Restore window
      global.window = originalWindow
    })
  })

  describe('API Services', () => {
    it('should call getCategoriasEquipo without port errors', async () => {
      await getCategoriasEquipo()
      
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Object)
      )
      
      // Verify the URL doesn't contain port 3001
      const fetchCall = (fetch as any).mock.calls[0]
      const url = fetchCall[0] as string
      expect(url).not.toContain('3001')
    })

    it('should call getUnidades without port errors', async () => {
      await getUnidades()
      
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ cache: 'no-store' })
      )
      
      // Verify the URL doesn't contain port 3001
      const fetchCall = (fetch as any).mock.calls[0]
      const url = fetchCall[0] as string
      expect(url).not.toContain('3001')
    })
  })

  describe('Import Process Simulation', () => {
    it('should handle import process without port-related errors', async () => {
      // Simulate the import process that was failing
      const handleImportar = async () => {
        try {
          const [categorias, unidades] = await Promise.all([
            getCategoriasEquipo(),
            getUnidades()
          ])
          
          return { categorias, unidades }
        } catch (error) {
          throw error
        }
      }

      const result = await handleImportar()
      
      expect(result.categorias).toBeDefined()
      expect(result.unidades).toBeDefined()
      expect(fetch).toHaveBeenCalledTimes(2)
    })
  })
})