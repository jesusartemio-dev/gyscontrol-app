// ===================================================
// 📁 Archivo: ProveedorForm.types.test.tsx
// 📌 Ubicación: src/components/logistica/__tests__/
// 🔧 Descripción: Test para verificar tipos correctos en ProveedorForm
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import ProveedorForm from '../ProveedorForm'
import type { Proveedor } from '@/types/modelos'

// Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock fetch
global.fetch = jest.fn()

const mockProveedor: Proveedor = {
  id: 'test-id',
  nombre: 'Proveedor Test',
  ruc: '12345678901',
  direccion: 'Dirección Test',
  telefono: '999888777',
  correo: 'test@test.com',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

describe('ProveedorForm Types', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('Type Safety', () => {
    it('should handle Proveedor type correctly when updating', async () => {
      const user = userEvent.setup()
      const mockOnSaved = jest.fn()
      
      // Mock successful API response
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProveedor,
      })

      render(
        <ProveedorForm 
          initial={mockProveedor} 
          onSaved={mockOnSaved}
        />
      )

      // Update name
      const nameInput = screen.getByDisplayValue('Proveedor Test')
      await user.clear(nameInput)
      await user.type(nameInput, 'Proveedor Actualizado')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /crear proveedor/i })
      await user.click(submitButton)

      await waitFor(() => {
        // Verify that onSaved receives a properly typed Proveedor object
        expect(mockOnSaved).toHaveBeenCalledWith(
          expect.objectContaining({
            id: expect.any(String),
            nombre: expect.any(String),
            createdAt: expect.any(String),
            updatedAt: expect.any(String),
          })
        )
      })
    })

    it('should create proper Proveedor object with all required properties', async () => {
      const user = userEvent.setup()
      const mockOnSaved = jest.fn()
      
      const newProveedor: Proveedor = {
        id: 'new-id',
        nombre: 'Nuevo Proveedor',
        ruc: '98765432109',
        direccion: 'Nueva Dirección',
        telefono: '111222333',
        correo: 'nuevo@test.com',
        createdAt: '2024-01-15T00:00:00.000Z',
        updatedAt: '2024-01-15T00:00:00.000Z',
      }

      // Mock successful API response for creation
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => newProveedor,
      })

      render(
        <ProveedorForm onSaved={mockOnSaved} />
      )

      // Fill form
      await user.type(screen.getByLabelText(/nombre/i), 'Nuevo Proveedor')
      await user.type(screen.getByLabelText(/ruc/i), '98765432109')
      await user.type(screen.getByLabelText(/dirección/i), 'Nueva Dirección')
      await user.type(screen.getByLabelText(/teléfono/i), '111222333')
      await user.type(screen.getByLabelText(/correo/i), 'nuevo@test.com')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /crear proveedor/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/proveedor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nombre: 'Nuevo Proveedor',
            ruc: '98765432109',
            direccion: 'Nueva Dirección',
            telefono: '111222333',
            correo: 'nuevo@test.com',
          }),
        })
      })

      expect(mockOnSaved).toHaveBeenCalledWith(newProveedor)
      expect(toast.success).toHaveBeenCalledWith('Proveedor creado exitosamente')
    })

    it('should handle update mode with proper type structure', () => {
      const mockOnSaved = jest.fn()
      
      render(
        <ProveedorForm 
          initial={mockProveedor} 
          onSaved={mockOnSaved}
        />
      )

      // Verify form is populated with initial data
      expect(screen.getByDisplayValue('Proveedor Test')).toBeInTheDocument()
      expect(screen.getByDisplayValue('12345678901')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Dirección Test')).toBeInTheDocument()
      expect(screen.getByDisplayValue('999888777')).toBeInTheDocument()
      expect(screen.getByDisplayValue('test@test.com')).toBeInTheDocument()
    })
  })

  describe('Payload Type Validation', () => {
    it('should handle optional fields correctly', async () => {
      const user = userEvent.setup()
      const mockOnSaved = jest.fn()
      
      const minimalProveedor: Proveedor = {
        id: 'minimal-id',
        nombre: 'Proveedor Mínimo',
        createdAt: '2024-01-15T00:00:00.000Z',
        updatedAt: '2024-01-15T00:00:00.000Z',
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => minimalProveedor,
      })

      render(
        <ProveedorForm onSaved={mockOnSaved} />
      )

      // Fill only required field
      await user.type(screen.getByLabelText(/nombre/i), 'Proveedor Mínimo')

      // Submit form
      const submitButton = screen.getByRole('button', { name: /crear proveedor/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/proveedor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nombre: 'Proveedor Mínimo',
            ruc: undefined,
            direccion: undefined,
            telefono: undefined,
            correo: undefined,
          }),
        })
      })

      expect(mockOnSaved).toHaveBeenCalledWith(minimalProveedor)
    })
  })
})
