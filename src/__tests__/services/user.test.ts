// ===================================================
// 📁 Archivo: user.test.ts
// 📌 Ubicación: src/__tests__/services/
// 🔧 Descripción: Tests para servicios de usuarios
// 🧠 Uso: Testing de servicios de usuarios
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import {
  getUsers,
  getUserById
} from '@/lib/services/user'
import type { User } from '@/types'

// ✅ Mock fetch globally
global.fetch = jest.fn()

const mockUser: User = {
  id: '1',
  name: 'Usuario de prueba',
  email: 'test@example.com',
  role: 'COLABORADOR',
  image: null,
  emailVerified: null,
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Mock console.error to avoid noise in test output
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('getUsers', () => {
    it('should get all users successfully', async () => {
      const mockUsers = [mockUser]
      
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUsers
      } as Response)

      const result = await getUsers()

      expect(fetch).toHaveBeenCalledWith('/api/admin/usuarios', {
        cache: 'no-store'
      })
      expect(result).toEqual(mockUsers)
    })

    it('should return null when fetch fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      const result = await getUsers()

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith('❌ getUsers:', expect.any(Error))
    })

    it('should return null when network error occurs', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      const result = await getUsers()

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith('❌ getUsers:', expect.any(Error))
    })

    it('should return null when JSON parsing fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON') }
      } as Response)

      const result = await getUsers()

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith('❌ getUsers:', expect.any(Error))
    })
  })

  describe('getUserById', () => {
    it('should get user by id successfully', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockUser
      } as Response)

      const result = await getUserById('1')

      expect(fetch).toHaveBeenCalledWith('/api/admin/usuarios/1', {
        cache: 'no-store'
      })
      expect(result).toEqual(mockUser)
    })

    it('should return null when fetch fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      const result = await getUserById('1')

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith('❌ getUserById:', expect.any(Error))
    })

    it('should return null when network error occurs', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(new Error('Network error'))

      const result = await getUserById('1')

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith('❌ getUserById:', expect.any(Error))
    })

    it('should return null when JSON parsing fails', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => { throw new Error('Invalid JSON') }
      } as Response)

      const result = await getUserById('1')

      expect(result).toBeNull()
      expect(console.error).toHaveBeenCalledWith('❌ getUserById:', expect.any(Error))
    })
  })
})