// ===================================================
// 📁 Archivo: ProveedorForm.test.tsx
// 📌 Ubicación: src/__tests__/components/logistica/
// 🔧 Descripción: Tests para el formulario de proveedores
//
// 🧠 Uso: Verificar funcionalidad del formulario con API real
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import ProveedorForm from '@/components/logistica/ProveedorForm'
import { Proveedor } from '@/types'

// Mock fetch globally
global.fetch = jest.fn()

// Mock toast
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  },
}))

describe('ProveedorForm', () => {
  const mockOnSaved = jest.fn()
  const mockOnCancel = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renders form fields correctly', () => {
    render(<ProveedorForm onSaved={mockOnSaved} />)
    
    expect(screen.getByLabelText(/nombre del proveedor/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/ruc/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /crear proveedor/i })).toBeInTheDocument()
  })

  it('validates required fields', async () => {
    render(<ProveedorForm onSaved={mockOnSaved} />)
    
    const submitButton = screen.getByRole('button', { name: /crear proveedor/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument()
    })
    
    expect(mockOnSaved).not.toHaveBeenCalled()
  })

  it('creates provider successfully', async () => {
    const mockProvider: Proveedor = {
      id: 'test-id',
      nombre: 'Test Provider',
      ruc: '12345678901',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: true,
      json: async () => mockProvider,
    })

    render(<ProveedorForm onSaved={mockOnSaved} />)
    
    const nombreInput = screen.getByLabelText(/nombre del proveedor/i)
    const rucInput = screen.getByLabelText(/ruc/i)
    const submitButton = screen.getByRole('button', { name: /crear proveedor/i })
    
    fireEvent.change(nombreInput, { target: { value: 'Test Provider' } })
    fireEvent.change(rucInput, { target: { value: '12345678901' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/proveedor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nombre: 'Test Provider',
          ruc: '12345678901',
        }),
      })
    })

    await waitFor(() => {
      expect(mockOnSaved).toHaveBeenCalledWith(mockProvider)
      expect(toast.success).toHaveBeenCalledWith('Proveedor creado exitosamente')
    })
  })

  it('handles API error', async () => {
    ;(fetch as jest.Mock).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Server error' }),
    })

    render(<ProveedorForm onSaved={mockOnSaved} />)
    
    const nombreInput = screen.getByLabelText(/nombre del proveedor/i)
    const submitButton = screen.getByRole('button', { name: /crear proveedor/i })
    
    fireEvent.change(nombreInput, { target: { value: 'Test Provider' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al procesar proveedor', {
        description: 'Server error'
      })
    })

    expect(mockOnSaved).not.toHaveBeenCalled()
  })
})
