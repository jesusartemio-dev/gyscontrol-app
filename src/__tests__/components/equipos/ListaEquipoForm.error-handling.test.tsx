/**
 * Test para el manejo de errores en ListaEquipoForm
 * Verifica que los errores se manejen correctamente en diferentes escenarios
 */

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'

// Mock all UI components to avoid dependency issues
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/input', () => ({
  Input: ({ onChange, ...props }: any) => (
    <input onChange={onChange} {...props} />
  )
}))

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>
}))

jest.mock('lucide-react', () => ({
  Plus: () => <span>Plus</span>,
  Loader2: () => <span>Loading</span>,
  FileText: () => <span>FileText</span>
}))

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  }
}))

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn()
  }
}))

// Get the mocked toast functions
const { toast: mockToast } = jest.requireMock('sonner')

jest.mock('@/lib/services/listas-equipo', () => ({
  createListaEquipo: jest.fn()
}))

// Import the component after mocking dependencies
import ListaEquipoForm from '../../../components/equipos/ListaEquipoForm'
import { createListaEquipo } from '@/lib/services/listas-equipo'

// Mock fetch globally
const mockFetch = jest.fn()
global.fetch = mockFetch

describe('ListaEquipoForm - Error Handling', () => {
  const mockOnCreated = jest.fn()
  const mockCreateListaEquipo = createListaEquipo as jest.MockedFunction<typeof createListaEquipo>
  
  const defaultProps = {
    proyectoId: 'test-project-id',
    onCreated: mockOnCreated
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockFetch.mockClear()
  })

  const fillAndSubmitForm = async () => {
    const nombreInput = screen.getByRole('textbox')
    const submitButton = screen.getByRole('button')

    fireEvent.change(nombreInput, { target: { value: 'Test Lista' } })
    fireEvent.click(submitButton)
  }

  describe('Network Errors', () => {
    it('should handle network failure gracefully', async () => {
      // Mock fetch to throw a network error
      mockFetch.mockRejectedValueOnce(new Error('Network error'))

      render(<ListaEquipoForm {...defaultProps} />)
      await fillAndSubmitForm()

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Network error')
      })
    })

    it('should handle service rejection with string error', async () => {
      mockFetch.mockRejectedValueOnce('Connection timeout')

      render(<ListaEquipoForm {...defaultProps} />)
      await fillAndSubmitForm()

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Connection timeout')
      })
    })
  })

  describe('HTTP Error Responses', () => {
    it('should handle 401 unauthorized error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValueOnce({ error: 'No tienes autorización. Por favor, inicia sesión nuevamente.' })
      })

      render(<ListaEquipoForm {...defaultProps} />)
      await fillAndSubmitForm()

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith(
          'No tienes autorización. Por favor, inicia sesión nuevamente.'
        )
      })
    })

    it('should handle server error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        headers: new Headers({ 'content-type': 'application/json' }),
        json: jest.fn().mockResolvedValueOnce({ error: 'Error interno del servidor' })
      })

      render(<ListaEquipoForm {...defaultProps} />)
      await fillAndSubmitForm()

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Error interno del servidor')
      })
    })

    it('should handle generic error', async () => {
      const error = new Error('Error al crear la lista')
      mockFetch.mockRejectedValueOnce(error)

      render(<ListaEquipoForm {...defaultProps} />)
      await fillAndSubmitForm()

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Error al crear la lista')
      })
    })
  })

  describe('Success Cases', () => {
    it('should handle successful creation without errors', async () => {
      const mockResponse = {
        id: 'lista-123',
        nombre: 'Test Lista',
        proyectoId: 'test-project-id'
      }

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: {
          get: jest.fn().mockReturnValue('application/json'),
          entries: jest.fn().mockReturnValue([])
        },
        json: jest.fn().mockResolvedValueOnce(mockResponse)
      })

      render(<ListaEquipoForm {...defaultProps} />)
      
      const nombreInput = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button')
      
      fireEvent.change(nombreInput, { target: { value: 'Test Lista' } })
      fireEvent.click(submitButton)

      // Wait for the request to complete
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/listas-equipo', expect.objectContaining({
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include'
        }))
      })
      
      // Ensure no error toast was called
      expect(mockToast.error).not.toHaveBeenCalled()
    })
  })

  describe('Form Validation', () => {
    it('should not call service when form is invalid', async () => {
      render(<ListaEquipoForm {...defaultProps} />)
      
      const submitButton = screen.getByRole('button')
      fireEvent.click(submitButton)

      // Wait a bit to ensure no service call is made
      await new Promise(resolve => setTimeout(resolve, 100))

      // Should not call fetch
      expect(mockFetch).not.toHaveBeenCalled()
    })

    it('should call fetch when form is valid', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: jest.fn().mockResolvedValueOnce({ id: 'test', nombre: 'Test Lista' })
      })
      
      render(<ListaEquipoForm {...defaultProps} />)
      
      const nombreInput = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button')
      
      // Fill form with valid data
      fireEvent.change(nombreInput, { target: { value: 'Test Lista' } })
      fireEvent.click(submitButton)
      
      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/listas-equipo', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            proyectoId: 'test-project-id',
            nombre: 'Test Lista'
          })
        })
      })
    })
  })

  describe('Loading States', () => {
    it('should show loading state during form submission', async () => {
      // Create a promise that we can control
      let resolvePromise: (value: any) => void
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })
      
      mockFetch.mockReturnValueOnce(pendingPromise)

      render(<ListaEquipoForm {...defaultProps} />)
      
      const nombreInput = screen.getByRole('textbox')
      const submitButton = screen.getByRole('button')

      fireEvent.change(nombreInput, { target: { value: 'Test Lista' } })
      fireEvent.click(submitButton)

      // Check that button is disabled during loading
      await waitFor(() => {
        expect(submitButton).toBeDisabled()
      })

      // Resolve the promise
      resolvePromise!({ id: 'test', nombre: 'Test Lista' })

      // Wait for loading to finish
      await waitFor(() => {
        expect(submitButton).not.toBeDisabled()
      })
    })
  })
})