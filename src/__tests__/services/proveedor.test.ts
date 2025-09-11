// ===================================================
// 📁 Archivo: proveedor.test.ts
// 📌 Ubicación: src/__tests__/services/
// 🔧 Descripción: Tests para servicios de proveedores
// 🧠 Uso: Testing de servicios CRUD de proveedores
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { createProveedor, updateProveedor, getProveedores, deleteProveedor } from '@/lib/services/proveedor'
import { Proveedor, ProveedorPayload, ProveedorUpdatePayload } from '@/types'

// ✅ Mock fetch globally
global.fetch = jest.fn()

const mockProveedor: Proveedor = {
  id: '1',
  nombre: 'Proveedor Test',
  ruc: '12345678901',
  direccion: 'Dirección Test',
  telefono: '999888777',
  correo: 'test@proveedor.com',
  createdAt: new Date(),
  updatedAt: new Date()
}

describe('Proveedor Service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('createProveedor', () => {
    it('should create proveedor successfully', async () => {
      const payload: ProveedorPayload = {
        nombre: 'Nuevo Proveedor',
        ruc: '12345678901',
        direccion: 'Nueva Dirección',
        telefono: '999888777',
        correo: 'nuevo@proveedor.com'
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProveedor
      } as Response)

      const result = await createProveedor(payload)

      expect(fetch).toHaveBeenCalledWith('/api/proveedor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      expect(result).toEqual(mockProveedor)
    })

    it('should return null on failure', async () => {
      const payload: ProveedorPayload = {
        nombre: 'Proveedor Fallido'
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      const result = await createProveedor(payload)

      expect(result).toBeNull()
    })
  })

  describe('updateProveedor', () => {
    it('should update proveedor successfully', async () => {
      const id = '1'
      const payload: ProveedorUpdatePayload = {
        nombre: 'Proveedor Actualizado',
        ruc: '12345678901'
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ ...mockProveedor, ...payload })
      } as Response)

      const result = await updateProveedor(id, payload)

      expect(fetch).toHaveBeenCalledWith('/api/proveedor/1', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      expect(result).toEqual({ ...mockProveedor, ...payload })
    })

    it('should return null on failure', async () => {
      const id = '1'
      const payload: ProveedorUpdatePayload = {
        nombre: 'Proveedor Fallido'
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      const result = await updateProveedor(id, payload)

      expect(result).toBeNull()
    })

    it('should use correct API endpoint with ID', async () => {
      const id = 'test-id-123'
      const payload: ProveedorUpdatePayload = {
        nombre: 'Test Update'
      }

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProveedor
      } as Response)

      await updateProveedor(id, payload)

      expect(fetch).toHaveBeenCalledWith('/api/proveedor/test-id-123', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
    })
  })

  describe('getProveedores', () => {
    it('should fetch proveedores successfully', async () => {
      const mockProveedores = [mockProveedor]

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProveedores
      } as Response)

      const result = await getProveedores()

      expect(fetch).toHaveBeenCalledWith('/api/proveedor')
      expect(result).toEqual(mockProveedores)
    })

    it('should return empty array on failure', async () => {
      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      const result = await getProveedores()

      expect(result).toEqual([])
    })
  })

  describe('deleteProveedor', () => {
    it('should delete proveedor successfully', async () => {
      const id = '1'

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'OK' })
      } as Response)

      const result = await deleteProveedor(id)

      expect(fetch).toHaveBeenCalledWith('/api/proveedor/1', {
        method: 'DELETE'
      })
      expect(result).toBe(true)
    })

    it('should return false on failure', async () => {
      const id = '1'

      ;(fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false
      } as Response)

      const result = await deleteProveedor(id)

      expect(result).toBe(false)
    })
  })
})
