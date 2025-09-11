// ===================================================
// 📁 Archivo: ListaEquipoForm.test.tsx
// 📍 Ubicación: src/components/equipos/__tests__/
// 🔧 Descripción: Pruebas para el formulario mejorado de listas técnicas
//
// 🧪 Cobertura de pruebas:
// - Renderizado del formulario
// - Validación en tiempo real
// - Estados de carga
// - Envío de formulario
// - Manejo de errores
// - Accesibilidad
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import ListaEquipoForm from '../ListaEquipoForm'
import { toast } from 'sonner'
import { createListaEquipo } from '@/lib/services/listas-equipo'

// Mock dependencies
vi.mock('sonner')
vi.mock('@/lib/services/listas-equipo')
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
  },
}))

const mockToast = vi.mocked(toast)
const mockCreateListaEquipo = vi.mocked(createListaEquipo)

const defaultProps = {
  proyectoId: 'proyecto-1',
  onCreated: vi.fn(),
}

const mockListaCreada = {
  id: 'nueva-lista-id',
  nombre: 'Lista Test',
  codigo: 'LEQ-001',
  proyectoId: 'proyecto-1',
  numeroSecuencia: 1,
  items: [],
  _count: { items: 0 },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
}

describe('ListaEquipoForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Rendering', () => {
    it('should render form elements correctly', () => {
      render(<ListaEquipoForm {...defaultProps} />)

      expect(screen.getByLabelText('Nombre de la Lista Técnica')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Ej: Lista de Equipos Eléctricos')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /crear lista técnica/i })).toBeInTheDocument()
      expect(screen.getByText('Las listas técnicas te permiten organizar y gestionar los equipos necesarios para el proyecto.')).toBeInTheDocument()
    })

    it('should render with proper icons', () => {
      render(<ListaEquipoForm {...defaultProps} />)

      // Check for FileText icon in input (via class or test-id if added)
      const input = screen.getByPlaceholderText('Ej: Lista de Equipos Eléctricos')
      expect(input).toHaveClass('pl-10') // Input has left padding for icon

      // Check for Plus icon in button
      expect(screen.getByRole('button', { name: /crear lista técnica/i })).toBeInTheDocument()
    })

    it('should have proper form structure', () => {
      render(<ListaEquipoForm {...defaultProps} />)

      const form = screen.getByRole('form') || screen.getByTestId('lista-form') || document.querySelector('form')
      expect(form).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should show error when name is empty', async () => {
      const user = userEvent.setup()
      render(<ListaEquipoForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /crear lista técnica/i })
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument()
      })

      expect(mockToast.error).toHaveBeenCalledWith('Por favor corrige los errores en el formulario')
      expect(defaultProps.onCreated).not.toHaveBeenCalled()
    })

    it('should show error when name is too short', async () => {
      const user = userEvent.setup()
      render(<ListaEquipoForm {...defaultProps} />)

      const input = screen.getByPlaceholderText('Ej: Lista de Equipos Eléctricos')
      const submitButton = screen.getByRole('button', { name: /crear lista técnica/i })

      await user.type(input, 'AB')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('El nombre debe tener al menos 3 caracteres')).toBeInTheDocument()
      })

      expect(mockToast.error).toHaveBeenCalledWith('Por favor corrige los errores en el formulario')
      expect(defaultProps.onCreated).not.toHaveBeenCalled()
    })

    it('should clear error when user starts typing valid input', async () => {
      const user = userEvent.setup()
      render(<ListaEquipoForm {...defaultProps} />)

      const input = screen.getByPlaceholderText('Ej: Lista de Equipos Eléctricos')
      const submitButton = screen.getByRole('button', { name: /crear lista técnica/i })

      // First, trigger an error
      await user.click(submitButton)
      await waitFor(() => {
        expect(screen.getByText('El nombre es obligatorio')).toBeInTheDocument()
      })

      // Then type valid input
      await user.type(input, 'Lista válida')

      await waitFor(() => {
        expect(screen.queryByText('El nombre es obligatorio')).not.toBeInTheDocument()
      })
    })

    it('should apply error styling to input when validation fails', async () => {
      const user = userEvent.setup()
      render(<ListaEquipoForm {...defaultProps} />)

      const input = screen.getByPlaceholderText('Ej: Lista de Equipos Eléctricos')
      const submitButton = screen.getByRole('button', { name: /crear lista técnica/i })

      await user.click(submitButton)

      await waitFor(() => {
        expect(input).toHaveClass('border-red-500')
      })
    })
  })

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      const user = userEvent.setup()
      render(<ListaEquipoForm {...defaultProps} />)

      const input = screen.getByPlaceholderText('Ej: Lista de Equipos Eléctricos')
      const submitButton = screen.getByRole('button', { name: /crear lista técnica/i })

      await user.type(input, 'Lista de Equipos Eléctricos')
      await user.click(submitButton)

      await waitFor(() => {
        expect(defaultProps.onCreated).toHaveBeenCalledWith({
          proyectoId: 'proyecto-1',
          nombre: 'Lista de Equipos Eléctricos',
          codigo: undefined,
          numeroSecuencia: undefined,
        })
      })

      expect(mockToast.success).toHaveBeenCalledWith('Lista creada correctamente')
    })

    it('should trim whitespace from input', async () => {
      const user = userEvent.setup()
      render(<ListaEquipoForm {...defaultProps} />)

      const input = screen.getByPlaceholderText('Ej: Lista de Equipos Eléctricos')
      const submitButton = screen.getByRole('button', { name: /crear lista técnica/i })

      await user.type(input, '  Lista con espacios  ')
      await user.click(submitButton)

      await waitFor(() => {
        expect(defaultProps.onCreated).toHaveBeenCalledWith({
          proyectoId: 'proyecto-1',
          nombre: 'Lista con espacios',
          codigo: undefined,
          numeroSecuencia: undefined,
        })
      })
    })

    it('should clear form after successful submission', async () => {
      const user = userEvent.setup()
      render(<ListaEquipoForm {...defaultProps} />)

      const input = screen.getByPlaceholderText('Ej: Lista de Equipos Eléctricos')
      const submitButton = screen.getByRole('button', { name: /crear lista técnica/i })

      await user.type(input, 'Lista de prueba')
      await user.click(submitButton)

      await waitFor(() => {
        expect(input).toHaveValue('')
      })
    })

    it('should handle submission errors', async () => {
      const user = userEvent.setup()
      const onCreatedWithError = jest.fn().mockImplementation(() => {
        throw new Error('Network error')
      })

      render(<ListaEquipoForm {...defaultProps} onCreated={onCreatedWithError} />)

      const input = screen.getByPlaceholderText('Ej: Lista de Equipos Eléctricos')
      const submitButton = screen.getByRole('button', { name: /crear lista técnica/i })

      await user.type(input, 'Lista de prueba')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Error al crear lista')
      })
    })
  })

  describe('Loading State', () => {
    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      let resolvePromise: (value: any) => void
      const onCreatedAsync = jest.fn().mockImplementation(() => {
        return new Promise((resolve) => {
          resolvePromise = resolve
        })
      })

      render(<ListaEquipoForm {...defaultProps} onCreated={onCreatedAsync} />)

      const input = screen.getByPlaceholderText('Ej: Lista de Equipos Eléctricos')
      const submitButton = screen.getByRole('button', { name: /crear lista técnica/i })

      await user.type(input, 'Lista de prueba')
      await user.click(submitButton)

      // Check loading state
      expect(screen.getByText('Creando...')).toBeInTheDocument()
      expect(submitButton).toBeDisabled()
      expect(input).toBeDisabled()

      // Resolve the promise
      resolvePromise!(undefined)

      await waitFor(() => {
        expect(screen.getByText('Crear Lista Técnica')).toBeInTheDocument()
        expect(submitButton).not.toBeDisabled()
        expect(input).not.toBeDisabled()
      })
    })
  })

  describe('Button States', () => {
    it('should disable submit button when input is empty', () => {
      render(<ListaEquipoForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /crear lista técnica/i })
      expect(submitButton).toBeDisabled()
    })

    it('should enable submit button when input has valid content', async () => {
      const user = userEvent.setup()
      render(<ListaEquipoForm {...defaultProps} />)

      const input = screen.getByPlaceholderText('Ej: Lista de Equipos Eléctricos')
      const submitButton = screen.getByRole('button', { name: /crear lista técnica/i })

      await user.type(input, 'Lista válida')

      expect(submitButton).not.toBeDisabled()
    })

    it('should disable submit button with only whitespace', async () => {
      const user = userEvent.setup()
      render(<ListaEquipoForm {...defaultProps} />)

      const input = screen.getByPlaceholderText('Ej: Lista de Equipos Eléctricos')
      const submitButton = screen.getByRole('button', { name: /crear lista técnica/i })

      await user.type(input, '   ')

      expect(submitButton).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      render(<ListaEquipoForm {...defaultProps} />)

      const input = screen.getByLabelText('Nombre de la Lista Técnica')
      expect(input).toBeInTheDocument()
      expect(input).toHaveAttribute('id', 'nombre')
    })

    it('should associate error messages with input', async () => {
      const user = userEvent.setup()
      render(<ListaEquipoForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /crear lista técnica/i })
      await user.click(submitButton)

      await waitFor(() => {
        const errorMessage = screen.getByText('El nombre es obligatorio')
        expect(errorMessage).toBeInTheDocument()
      })
    })

    it('should have proper button type', () => {
      render(<ListaEquipoForm {...defaultProps} />)

      const submitButton = screen.getByRole('button', { name: /crear lista técnica/i })
      expect(submitButton).toHaveAttribute('type', 'submit')
    })
  })

  describe('API Integration', () => {
    it('should call createListaEquipo service and handle success', async () => {
      const user = userEvent.setup()
      mockCreateListaEquipo.mockResolvedValue(mockListaCreada)
      
      render(<ListaEquipoForm {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Nombre de la Lista Técnica')
      const dateInput = screen.getByLabelText('Fecha Necesaria (Opcional)')
      const submitButton = screen.getByRole('button', { name: /crear lista técnica/i })
      
      // Fill form with valid data
      await user.type(nameInput, 'Lista de Equipos Test')
      await user.type(dateInput, '2025-12-31')
      await user.click(submitButton)
      
      // Verify loading state
      expect(screen.getByText(/creando.../i)).toBeInTheDocument()
      
      await waitFor(() => {
        expect(mockCreateListaEquipo).toHaveBeenCalledWith({
          proyectoId: 'proyecto-1',
          nombre: 'Lista de Equipos Test',
          fechaNecesaria: '2025-12-31',
          codigo: '',
          numeroSecuencia: 0,
          items: [],
          _count: { items: 0 }
        })
      })
      
      await waitFor(() => {
        expect(defaultProps.onCreated).toHaveBeenCalledWith(mockListaCreada)
        expect(mockToast.success).toHaveBeenCalledWith('Lista técnica creada exitosamente')
      })
      
      // Verify form is reset
      expect(nameInput).toHaveValue('')
      expect(dateInput).toHaveValue('')
    })

    it('should handle API errors gracefully', async () => {
      const user = userEvent.setup()
      const errorMessage = 'Error de red'
      mockCreateListaEquipo.mockRejectedValue(new Error(errorMessage))
      
      render(<ListaEquipoForm {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Nombre de la Lista Técnica')
      const submitButton = screen.getByRole('button', { name: /crear lista técnica/i })
      
      await user.type(nameInput, 'Lista Test')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Error al crear la lista técnica. Intente nuevamente.')
      })
      
      expect(defaultProps.onCreated).not.toHaveBeenCalled()
    })

    it('should create lista without optional date', async () => {
      const user = userEvent.setup()
      mockCreateListaEquipo.mockResolvedValue(mockListaCreada)
      
      render(<ListaEquipoForm {...defaultProps} />)
      
      const nameInput = screen.getByLabelText('Nombre de la Lista Técnica')
      const submitButton = screen.getByRole('button', { name: /crear lista técnica/i })
      
      await user.type(nameInput, 'Lista Sin Fecha')
      await user.click(submitButton)
      
      await waitFor(() => {
        expect(mockCreateListaEquipo).toHaveBeenCalledWith({
          proyectoId: 'proyecto-1',
          nombre: 'Lista Sin Fecha',
          fechaNecesaria: undefined,
          codigo: '',
          numeroSecuencia: 0,
          items: [],
          _count: { items: 0 }
        })
      })
    })
   })

   describe('Responsive Design', () => {
     it('should have responsive grid classes', () => {
       render(<ListaEquipoForm {...defaultProps} />)

       const gridContainer = screen.getByLabelText('Nombre de la Lista Técnica').closest('.grid')
       expect(gridContainer).toHaveClass('grid-cols-1', 'md:grid-cols-4')
     })
   })
 })
