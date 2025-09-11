// ===================================================
// 📁 Archivo: ProveedorModal.test.tsx
// 📌 Ubicación: src/components/logistica/__tests__/ProveedorModal.test.tsx
// 🔧 Descripción: Tests para el componente ProveedorModal
// 🧠 Uso: Testing con Jest y React Testing Library
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import ProveedorModal from '../ProveedorModal'

// ✅ Mock dependencies
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}))

// ✅ Mock fetch
global.fetch = jest.fn()

// ✅ Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
}))

describe('ProveedorModal', () => {
  const mockOnSaved = jest.fn()
  const mockOnOpenChange = jest.fn()

  const defaultProps = {
    open: true,
    onOpenChange: mockOnOpenChange,
    onSaved: mockOnSaved,
    initial: null,
  }

  beforeEach(() => {
    jest.clearAllMocks()
    ;(fetch as jest.Mock).mockClear()
  })

  describe('Rendering', () => {
    it('should render modal with correct title for new provider', () => {
      render(<ProveedorModal {...defaultProps} />)
      
      expect(screen.getByText('Nuevo Proveedor')).toBeInTheDocument()
      expect(screen.getByText('Completa los datos para registrar un nuevo proveedor')).toBeInTheDocument()
    })

    it('should render modal with correct title for editing provider', () => {
      const initialProvider = {
        id: '1',
        nombre: 'Proveedor Test',
        ruc: '12345678901',
        direccion: 'Dirección Test',
        telefono: '999888777',
        correo: 'test@test.com'
      }

      render(<ProveedorModal {...defaultProps} initial={initialProvider} />)
      
      expect(screen.getByText('Editar Proveedor')).toBeInTheDocument()
      expect(screen.getByText('Completa los datos para actualizar el proveedor')).toBeInTheDocument()
    })

    it('should render all form fields', () => {
      render(<ProveedorModal {...defaultProps} />)
      
      expect(screen.getByLabelText(/Nombre del Proveedor/)).toBeInTheDocument()
      expect(screen.getByLabelText(/RUC/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Dirección/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Teléfono/)).toBeInTheDocument()
      expect(screen.getByLabelText(/Correo Electrónico/)).toBeInTheDocument()
    })

    it('should render action buttons', () => {
      render(<ProveedorModal {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /Cancelar/ })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Crear Proveedor/ })).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should show validation error for empty nombre', async () => {
      const user = userEvent.setup()
      render(<ProveedorModal {...defaultProps} />)
      
      const submitButton = screen.getByRole('button', { name: /Crear Proveedor/ })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument()
      })
    })

    it('should show validation error for invalid RUC', async () => {
      const user = userEvent.setup()
      render(<ProveedorModal {...defaultProps} />)
      
      const rucInput = screen.getByLabelText(/RUC/)
      await user.type(rucInput, '123')
      
      await waitFor(() => {
        expect(screen.getByText('El RUC debe tener exactamente 11 dígitos')).toBeInTheDocument()
      })
    })

    it('should show validation error for invalid email', async () => {
      const user = userEvent.setup()
      render(<ProveedorModal {...defaultProps} />)
      
      const emailInput = screen.getByLabelText(/Correo Electrónico/)
      await user.type(emailInput, 'invalid-email')
      
      await waitFor(() => {
        expect(screen.getByText('El correo debe tener un formato válido')).toBeInTheDocument()
      })
    })

    it('should show validation error for invalid phone', async () => {
      const user = userEvent.setup()
      render(<ProveedorModal {...defaultProps} />)
      
      const phoneInput = screen.getByLabelText(/Teléfono/)
      await user.type(phoneInput, 'abc')
      
      await waitFor(() => {
        expect(screen.getByText('El teléfono debe tener un formato válido')).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should create new provider successfully', async () => {
      const user = userEvent.setup()
      const mockProvider = {
        id: '1',
        nombre: 'Nuevo Proveedor',
        ruc: '12345678901',
        direccion: 'Nueva Dirección',
        telefono: '999888777',
        correo: 'nuevo@test.com'
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockProvider,
      })

      render(<ProveedorModal {...defaultProps} />)
      
      // ✅ Fill form
      await user.type(screen.getByLabelText(/Nombre del Proveedor/), 'Nuevo Proveedor')
      await user.type(screen.getByLabelText(/RUC/), '12345678901')
      await user.type(screen.getByLabelText(/Dirección/), 'Nueva Dirección')
      await user.type(screen.getByLabelText(/Teléfono/), '999888777')
      await user.type(screen.getByLabelText(/Correo Electrónico/), 'nuevo@test.com')
      
      // ✅ Submit form
      const submitButton = screen.getByRole('button', { name: /Crear Proveedor/ })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/proveedor', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nombre: 'Nuevo Proveedor',
            ruc: '12345678901',
            direccion: 'Nueva Dirección',
            telefono: '999888777',
            correo: 'nuevo@test.com'
          }),
        })
      })

      expect(toast.success).toHaveBeenCalledWith('Proveedor creado exitosamente')
      expect(mockOnSaved).toHaveBeenCalledWith(mockProvider)
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should update existing provider successfully', async () => {
      const user = userEvent.setup()
      const initialProvider = {
        id: '1',
        nombre: 'Proveedor Existente',
        ruc: '12345678901',
        direccion: 'Dirección Existente',
        telefono: '999888777',
        correo: 'existente@test.com'
      }

      const updatedProvider = {
        ...initialProvider,
        nombre: 'Proveedor Actualizado'
      }

      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => updatedProvider,
      })

      render(<ProveedorModal {...defaultProps} initial={initialProvider} />)
      
      // ✅ Update name
      const nameInput = screen.getByDisplayValue('Proveedor Existente')
      await user.clear(nameInput)
      await user.type(nameInput, 'Proveedor Actualizado')
      
      // ✅ Submit form
      const submitButton = screen.getByRole('button', { name: /Actualizar Proveedor/ })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledWith('/api/proveedor/1', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nombre: 'Proveedor Actualizado',
            ruc: '12345678901',
            direccion: 'Dirección Existente',
            telefono: '999888777',
            correo: 'existente@test.com'
          }),
        })
      })

      expect(toast.success).toHaveBeenCalledWith('Proveedor actualizado exitosamente')
      expect(mockOnSaved).toHaveBeenCalledWith(updatedProvider)
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should handle API error', async () => {
      const user = userEvent.setup()
      
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Error del servidor' }),
      })

      render(<ProveedorModal {...defaultProps} />)
      
      // ✅ Fill required field
      await user.type(screen.getByLabelText(/Nombre del Proveedor/), 'Test Provider')
      
      // ✅ Submit form
      const submitButton = screen.getByRole('button', { name: /Crear Proveedor/ })
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Error al procesar proveedor', {
          description: 'Error del servidor'
        })
      })
    })
  })

  describe('Modal Interactions', () => {
    it('should close modal when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<ProveedorModal {...defaultProps} />)
      
      const cancelButton = screen.getByRole('button', { name: /Cancelar/ })
      await user.click(cancelButton)
      
      expect(mockOnOpenChange).toHaveBeenCalledWith(false)
    })

    it('should not render when open is false', () => {
      render(<ProveedorModal {...defaultProps} open={false} />)
      
      expect(screen.queryByText('Nuevo Proveedor')).not.toBeInTheDocument()
    })

    it('should reset form with initial data when modal opens for editing', async () => {
      const initialData = {
        id: '1',
        nombre: 'Proveedor Test',
        ruc: '12345678901',
        direccion: 'Av. Test 123',
        telefono: '+51 999 888 777',
        correo: 'test@proveedor.com'
      }
      
      const { rerender } = render(
        <ProveedorModal
          open={false}
          onOpenChange={mockOnOpenChange}
          onSaved={mockOnSaved}
          initial={null}
        />
      )
      
      // Open modal with initial data
      rerender(
        <ProveedorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSaved={mockOnSaved}
          initial={initialData}
        />
      )
      
      await waitFor(() => {
        expect(screen.getByDisplayValue('Proveedor Test')).toBeInTheDocument()
        expect(screen.getByDisplayValue('12345678901')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Av. Test 123')).toBeInTheDocument()
        expect(screen.getByDisplayValue('+51 999 888 777')).toBeInTheDocument()
        expect(screen.getByDisplayValue('test@proveedor.com')).toBeInTheDocument()
      })
    })
  })

  describe('Real-time Validation Feedback', () => {
    it('should show green checkmark for valid nombre', async () => {
      const user = userEvent.setup()
      render(<ProveedorModal {...defaultProps} />)
      
      const nameInput = screen.getByLabelText(/Nombre del Proveedor/)
      await user.type(nameInput, 'Valid Name')
      
      await waitFor(() => {
        const checkIcon = screen.getByTestId('check-circle') || document.querySelector('.text-green-500')
        expect(checkIcon).toBeInTheDocument()
      })
    })

    it('should show green checkmark for valid RUC', async () => {
      const user = userEvent.setup()
      render(<ProveedorModal {...defaultProps} />)
      
      const rucInput = screen.getByLabelText(/RUC/)
      await user.type(rucInput, '12345678901')
      
      await waitFor(() => {
        const checkIcon = screen.getByTestId('check-circle') || document.querySelector('.text-green-500')
        expect(checkIcon).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<ProveedorModal {...defaultProps} />)
      
      expect(screen.getByRole('dialog')).toBeInTheDocument()
      expect(screen.getByLabelText(/Nombre del Proveedor/)).toBeInTheDocument()
      expect(screen.getByLabelText(/RUC/)).toBeInTheDocument()
    })

    it('should focus on first input when modal opens', () => {
      render(<ProveedorModal {...defaultProps} />)
      
      const firstInput = screen.getByLabelText(/Nombre del Proveedor/)
      expect(document.activeElement).toBe(firstInput)
    })
  })

  describe('Modal State Management', () => {
    it('should close modal after successful save', async () => {
      const user = userEvent.setup()
      const mockOnOpenChange = jest.fn()
      const mockOnSaved = jest.fn()
      
      // Mock successful API response
      ;(fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: '1', nombre: 'Test Provider' })
      })

      render(
        <ProveedorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSaved={mockOnSaved}
          initial={null}
        />
      )

      // Fill required field and submit
      await user.type(screen.getByLabelText(/Nombre del Proveedor/), 'Test Provider')
      
      const submitButton = screen.getByRole('button', { name: /Crear Proveedor/ })
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockOnSaved).toHaveBeenCalledWith({ id: '1', nombre: 'Test Provider' })
        expect(mockOnOpenChange).toHaveBeenCalledWith(false)
      })
    })

    it('should prevent multiple submissions', async () => {
      const user = userEvent.setup()
      
      // Mock slow API response
      ;(fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve({
            ok: true,
            json: async () => ({ id: '1', nombre: 'Test Provider' })
          }), 100)
        )
      )

      render(
        <ProveedorModal
          open={true}
          onOpenChange={mockOnOpenChange}
          onSaved={mockOnSaved}
          initial={null}
        />
      )

      // Fill form
      await user.type(screen.getByLabelText(/Nombre del Proveedor/), 'Test Provider')
      
      const submitButton = screen.getByRole('button', { name: /Crear Proveedor/ })
      
      // Click submit multiple times quickly
      await user.click(submitButton)
      await user.click(submitButton)
      await user.click(submitButton)

      // Should only make one API call
      await waitFor(() => {
        expect(fetch).toHaveBeenCalledTimes(1)
      })
    })

    it('should populate form fields with initial data when editing', async () => {
      const mockProvider = {
        id: '1',
        nombre: 'Test Provider',
        ruc: '12345678901',
        direccion: 'Test Address',
        telefono: '123456789',
        correo: 'test@example.com'
      }

      const { rerender } = render(
        <ProveedorModal
          open={true}
          onOpenChange={jest.fn()}
          onSaved={jest.fn()}
          initial={null}
        />
      )

      // Rerender with initial data
      rerender(
        <ProveedorModal
          open={true}
          onOpenChange={jest.fn()}
          onSaved={jest.fn()}
          initial={mockProvider}
        />
      )

      await waitFor(() => {
        expect(screen.getByDisplayValue('Test Provider')).toBeInTheDocument()
        expect(screen.getByDisplayValue('12345678901')).toBeInTheDocument()
        expect(screen.getByDisplayValue('Test Address')).toBeInTheDocument()
        expect(screen.getByDisplayValue('123456789')).toBeInTheDocument()
        expect(screen.getByDisplayValue('test@example.com')).toBeInTheDocument()
      })
    })
  })
})
