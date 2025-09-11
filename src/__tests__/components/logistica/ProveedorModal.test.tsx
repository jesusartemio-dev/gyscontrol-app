// ===================================================
// 📁 Archivo: ProveedorModal.test.tsx
// 📌 Ubicación: src/__tests__/components/logistica/
// 🔧 Descripción: Tests para ProveedorModal simplificado
// 🧠 Uso: Testing de modal de proveedores con React Testing Library
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import ProveedorModal from '@/components/logistica/ProveedorModal'
import * as proveedorService from '@/lib/services/proveedor'
import { Proveedor } from '@/types'

// ✅ Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn()
  }
}))

jest.mock('@/lib/services/proveedor', () => ({
  createProveedor: jest.fn(),
  updateProveedor: jest.fn()
}))

jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <React.Fragment>{children}</React.Fragment>
}))

// Mock createPortal to render in the same container
jest.mock('react-dom', () => ({
  ...jest.requireActual('react-dom'),
  createPortal: (node: React.ReactNode) => node
}))

// Mock document.body for portal
Object.defineProperty(document, 'body', {
  value: document.createElement('body'),
  writable: true
})

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

describe('ProveedorModal', () => {
  const mockOnOpenChange = jest.fn()
  const mockOnSaved = jest.fn()

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders create mode correctly', () => {
    render(
      <ProveedorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaved={mockOnSaved}
      />
    )

    expect(screen.getByText('Nuevo Proveedor')).toBeInTheDocument()
    expect(screen.getByText('Completa los datos del nuevo proveedor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /crear/i })).toBeInTheDocument()
  })

  it('renders edit mode correctly', () => {
    render(
      <ProveedorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaved={mockOnSaved}
        proveedor={mockProveedor}
      />
    )

    expect(screen.getByText('Editar Proveedor')).toBeInTheDocument()
    expect(screen.getByText('Actualiza la información del proveedor')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /actualizar/i })).toBeInTheDocument()
    expect(screen.getByDisplayValue('Proveedor Test')).toBeInTheDocument()
  })

  it('handles form submission for create', async () => {
    const user = userEvent.setup()
    const mockCreateProveedor = proveedorService.createProveedor as jest.MockedFunction<typeof proveedorService.createProveedor>
    mockCreateProveedor.mockResolvedValue(mockProveedor)

    render(
      <ProveedorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaved={mockOnSaved}
      />
    )

    const nombreInput = screen.getByLabelText(/nombre/i)
    await user.type(nombreInput, 'Nuevo Proveedor')

    const submitButton = screen.getByRole('button', { name: /crear/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockCreateProveedor).toHaveBeenCalledWith({
        nombre: 'Nuevo Proveedor',
        ruc: undefined,
        direccion: undefined,
        telefono: undefined,
        correo: undefined
      })
    })

    expect(toast.success).toHaveBeenCalledWith('Proveedor creado exitosamente')
    expect(mockOnSaved).toHaveBeenCalledWith(mockProveedor)
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('handles form submission for update', async () => {
    const user = userEvent.setup()
    const mockUpdateProveedor = proveedorService.updateProveedor as jest.MockedFunction<typeof proveedorService.updateProveedor>
    mockUpdateProveedor.mockResolvedValue(mockProveedor)

    render(
      <ProveedorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaved={mockOnSaved}
        proveedor={mockProveedor}
      />
    )

    const nombreInput = screen.getByDisplayValue('Proveedor Test')
    await user.clear(nombreInput)
    await user.type(nombreInput, 'Proveedor Actualizado')

    const submitButton = screen.getByRole('button', { name: /actualizar/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(mockUpdateProveedor).toHaveBeenCalledWith('1', {
        nombre: 'Proveedor Actualizado',
        ruc: '12345678901',
        direccion: 'Dirección Test',
        telefono: '999888777',
        correo: 'test@proveedor.com'
      })
    })

    expect(toast.success).toHaveBeenCalledWith('Proveedor actualizado exitosamente')
    expect(mockOnSaved).toHaveBeenCalledWith(mockProveedor)
    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('shows validation errors', async () => {
    const user = userEvent.setup()

    render(
      <ProveedorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaved={mockOnSaved}
      />
    )

    const submitButton = screen.getByRole('button', { name: /crear/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument()
    })
  })

  it('handles API errors', async () => {
    const user = userEvent.setup()
    const mockCreateProveedor = proveedorService.createProveedor as jest.MockedFunction<typeof proveedorService.createProveedor>
    mockCreateProveedor.mockResolvedValue(null)

    render(
      <ProveedorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaved={mockOnSaved}
      />
    )

    const nombreInput = screen.getByLabelText(/nombre/i)
    await user.type(nombreInput, 'Nuevo Proveedor')

    const submitButton = screen.getByRole('button', { name: /crear/i })
    await user.click(submitButton)

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al procesar proveedor', {
        description: 'Error al crear proveedor'
      })
    })
  })

  it('closes modal when cancel button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <ProveedorModal
        open={true}
        onOpenChange={mockOnOpenChange}
        onSaved={mockOnSaved}
      />
    )

    const cancelButton = screen.getByRole('button', { name: /cancelar/i })
    await user.click(cancelButton)

    expect(mockOnOpenChange).toHaveBeenCalledWith(false)
  })

  it('does not render when closed', () => {
    render(
      <ProveedorModal
        open={false}
        onOpenChange={mockOnOpenChange}
        onSaved={mockOnSaved}
      />
    )

    expect(screen.queryByText('Nuevo Proveedor')).not.toBeInTheDocument()
  })
})
