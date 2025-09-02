import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import { toast } from 'sonner'
import ProveedorForm from '../ProveedorForm'
import type { ProveedorCreatePayload } from '@/types/proveedor'

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

describe('ProveedorForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  const defaultProps = {
    onSubmit: mockOnSubmit,
    onCancel: mockOnCancel,
    loading: false,
  }

  it('renders form with all required fields', () => {
    render(<ProveedorForm {...defaultProps} />)
    
    expect(screen.getByText('Nuevo Proveedor')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Nombre del proveedor')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('RUC (opcional)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /crear proveedor/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /cancelar/i })).toBeInTheDocument()
  })

  it('shows validation error when submitting empty form', async () => {
    render(<ProveedorForm {...defaultProps} />)
    
    const submitButton = screen.getByRole('button', { name: /crear proveedor/i })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument()
    })
    
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('shows validation error for invalid RUC format', async () => {
    render(<ProveedorForm {...defaultProps} />)
    
    const nombreInput = screen.getByPlaceholderText('Nombre del proveedor')
    const rucInput = screen.getByPlaceholderText('RUC (opcional)')
    const submitButton = screen.getByRole('button', { name: /crear proveedor/i })
    
    fireEvent.change(nombreInput, { target: { value: 'Test Provider' } })
    fireEvent.change(rucInput, { target: { value: '123' } }) // Invalid RUC
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('El RUC debe tener exactamente 11 dígitos')).toBeInTheDocument()
    })
    
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('submits form with valid data', async () => {
    const mockResolvedSubmit = vi.fn().mockResolvedValue(undefined)
    render(<ProveedorForm {...defaultProps} onSubmit={mockResolvedSubmit} />)
    
    const nombreInput = screen.getByPlaceholderText('Nombre del proveedor')
    const rucInput = screen.getByPlaceholderText('RUC (opcional)')
    const submitButton = screen.getByRole('button', { name: /crear proveedor/i })
    
    fireEvent.change(nombreInput, { target: { value: 'Test Provider' } })
    fireEvent.change(rucInput, { target: { value: '12345678901' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockResolvedSubmit).toHaveBeenCalledWith({
        nombre: 'Test Provider',
        ruc: '12345678901',
      })
    })
  })

  it('submits form without RUC when not provided', async () => {
    const mockResolvedSubmit = vi.fn().mockResolvedValue(undefined)
    render(<ProveedorForm {...defaultProps} onSubmit={mockResolvedSubmit} />)
    
    const nombreInput = screen.getByPlaceholderText('Nombre del proveedor')
    const submitButton = screen.getByRole('button', { name: /crear proveedor/i })
    
    fireEvent.change(nombreInput, { target: { value: 'Test Provider' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockResolvedSubmit).toHaveBeenCalledWith({
        nombre: 'Test Provider',
        ruc: undefined,
      })
    })
  })

  it('handles form submission error', async () => {
    const mockRejectedSubmit = vi.fn().mockRejectedValue(new Error('Server error'))
    render(<ProveedorForm {...defaultProps} onSubmit={mockRejectedSubmit} />)
    
    const nombreInput = screen.getByPlaceholderText('Nombre del proveedor')
    const submitButton = screen.getByRole('button', { name: /crear proveedor/i })
    
    fireEvent.change(nombreInput, { target: { value: 'Test Provider' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al crear proveedor')
    })
  })

  it('calls onCancel when cancel button is clicked', () => {
    render(<ProveedorForm {...defaultProps} />)
    
    const cancelButton = screen.getByRole('button', { name: /cancelar/i })
    fireEvent.click(cancelButton)
    
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('shows loading state when loading prop is true', () => {
    render(<ProveedorForm {...defaultProps} loading={true} />)
    
    const submitButton = screen.getByRole('button', { name: /creando/i })
    expect(submitButton).toBeDisabled()
  })

  it('trims whitespace from nombre input', async () => {
    const mockResolvedSubmit = vi.fn().mockResolvedValue(undefined)
    render(<ProveedorForm {...defaultProps} onSubmit={mockResolvedSubmit} />)
    
    const nombreInput = screen.getByPlaceholderText('Nombre del proveedor')
    const submitButton = screen.getByRole('button', { name: /crear proveedor/i })
    
    fireEvent.change(nombreInput, { target: { value: '  Test Provider  ' } })
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(mockResolvedSubmit).toHaveBeenCalledWith({
        nombre: 'Test Provider',
        ruc: undefined,
      })
    })
  })

  it('validates RUC contains only numbers', async () => {
    render(<ProveedorForm {...defaultProps} />)
    
    const nombreInput = screen.getByPlaceholderText('Nombre del proveedor')
    const rucInput = screen.getByPlaceholderText('RUC (opcional)')
    const submitButton = screen.getByRole('button', { name: /crear proveedor/i })
    
    fireEvent.change(nombreInput, { target: { value: 'Test Provider' } })
    fireEvent.change(rucInput, { target: { value: '1234567890a' } }) // Contains letter
    fireEvent.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText('El RUC debe contener solo números')).toBeInTheDocument()
    })
    
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })
})