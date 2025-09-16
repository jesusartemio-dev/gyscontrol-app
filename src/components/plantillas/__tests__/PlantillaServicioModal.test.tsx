// ===================================================
// 📁 Archivo: PlantillaServicioModal.test.tsx
// 📌 Ubicación: src/components/plantillas/__tests__/
// 🔧 Descripción: Tests para PlantillaServicioModal
//
// 🧠 Uso: Tests unitarios para el modal de creación de servicios
// ✍️ Autor: Jesús Artemio
// 📅 Última actualización: 2025-04-21
// ===================================================

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { toast } from 'sonner'
import PlantillaServicioModal from '../PlantillaServicioModal'
import { createPlantillaServicio } from '@/lib/services/plantillaServicio'
import { getCategoriasServicio } from '@/lib/services/categoriaServicio'
import type { CategoriaServicio } from '@/types'

// 🎭 Mocks
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
  },
}))

jest.mock('@/lib/services/plantillaServicio', () => ({
  createPlantillaServicio: jest.fn(),
}))

jest.mock('@/lib/services/categoriaServicio', () => ({
  getCategoriasServicio: jest.fn(),
}))

// Mock shadcn/ui components
jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => 
    open ? <div data-testid="modal" onClick={() => onOpenChange(false)}>{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="modal-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="modal-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h2 data-testid="modal-title">{children}</h2>,
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, type, variant, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      type={type} 
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  ),
}))

jest.mock('@/components/ui/input', () => ({
  Input: ({ ...props }: any) => <input {...props} />,
}))

jest.mock('@/components/ui/textarea', () => ({
  Textarea: ({ ...props }: any) => <textarea {...props} />,
}))

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}))

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value, disabled }: any) => (
    <select 
      value={value} 
      onChange={(e) => onValueChange?.(e.target.value)}
      disabled={disabled}
      data-testid="categoria-select"
    >
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}))

jest.mock('lucide-react', () => ({
  Loader2: () => <div data-testid="loader-icon" />,
}))

// 📋 Mock data
const mockCategorias: CategoriaServicio[] = [
  { id: 'cat1', nombre: 'PLC', descripcion: 'Programación PLC' },
  { id: 'cat2', nombre: 'HMI', descripcion: 'Interfaces HMI' },
  { id: 'cat3', nombre: 'SCADA', descripcion: 'Sistemas SCADA' },
]

const mockPlantillaServicio = {
  id: 'service1',
  plantillaId: 'plantilla1',
  nombre: 'Programación PLC',
  categoria: 'cat1',
  descripcion: 'Servicio de programación',
  subtotalInterno: 0,
  subtotalCliente: 0,
}

const defaultProps = {
  plantillaId: 'plantilla1',
  isOpen: true,
  onClose: jest.fn(),
  onCreated: jest.fn(),
}

describe('PlantillaServicioModal', () => {
  const mockCreatePlantillaServicio = createPlantillaServicio as jest.MockedFunction<typeof createPlantillaServicio>
  const mockGetCategoriasServicio = getCategoriasServicio as jest.MockedFunction<typeof getCategoriasServicio>
  const mockToast = toast as jest.Mocked<typeof toast>

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCategoriasServicio.mockResolvedValue(mockCategorias)
    mockCreatePlantillaServicio.mockResolvedValue(mockPlantillaServicio)
  })

  describe('Rendering', () => {
    it('should render modal when open', async () => {
      render(<PlantillaServicioModal {...defaultProps} />)
      
      expect(screen.getByTestId('modal')).toBeInTheDocument()
      expect(screen.getByTestId('modal-title')).toHaveTextContent('Nueva Sección de Servicio')
      expect(screen.getByLabelText('Nombre del Servicio *')).toBeInTheDocument()
      expect(screen.getByLabelText('Categoría *')).toBeInTheDocument()
      expect(screen.getByLabelText('Descripción (opcional)')).toBeInTheDocument()
    })

    it('should not render modal when closed', () => {
      render(<PlantillaServicioModal {...defaultProps} isOpen={false} />)
      
      expect(screen.queryByTestId('modal')).not.toBeInTheDocument()
    })

    it('should show loading state for categories', () => {
      mockGetCategoriasServicio.mockImplementation(() => new Promise(() => {}))
      
      render(<PlantillaServicioModal {...defaultProps} />)
      
      expect(screen.getByText('Cargando categorías...')).toBeInTheDocument()
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
    })
  })

  describe('Categories Loading', () => {
    it('should load categories when modal opens', async () => {
      render(<PlantillaServicioModal {...defaultProps} />)
      
      await waitFor(() => {
        expect(mockGetCategoriasServicio).toHaveBeenCalledTimes(1)
      })
    })

    it('should populate select with categories', async () => {
      render(<PlantillaServicioModal {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('categoria-select')).toBeInTheDocument()
      })

      const select = screen.getByTestId('categoria-select')
      expect(select).toHaveValue('cat1') // First category should be selected
    })

    it('should handle categories loading error', async () => {
      mockGetCategoriasServicio.mockRejectedValue(new Error('Network error'))
      
      render(<PlantillaServicioModal {...defaultProps} />)
      
      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Error al cargar categorías')
      })
    })
  })

  describe('Form Interaction', () => {
    it('should update form fields correctly', async () => {
      const user = userEvent.setup()
      render(<PlantillaServicioModal {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('categoria-select')).toBeInTheDocument()
      })

      const nombreInput = screen.getByLabelText('Nombre del Servicio *')
      const descripcionInput = screen.getByLabelText('Descripción (opcional)')
      const categoriaSelect = screen.getByTestId('categoria-select')

      await user.type(nombreInput, 'Nuevo Servicio')
      await user.type(descripcionInput, 'Descripción del servicio')
      await user.selectOptions(categoriaSelect, 'cat2')

      expect(nombreInput).toHaveValue('Nuevo Servicio')
      expect(descripcionInput).toHaveValue('Descripción del servicio')
      expect(categoriaSelect).toHaveValue('cat2')
    })

    it('should reset form when modal closes', async () => {
      const { rerender } = render(<PlantillaServicioModal {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('categoria-select')).toBeInTheDocument()
      })

      const nombreInput = screen.getByLabelText('Nombre del Servicio *')
      fireEvent.change(nombreInput, { target: { value: 'Test Service' } })
      expect(nombreInput).toHaveValue('Test Service')

      // Close modal
      rerender(<PlantillaServicioModal {...defaultProps} isOpen={false} />)
      // Reopen modal
      rerender(<PlantillaServicioModal {...defaultProps} isOpen={true} />)

      await waitFor(() => {
        const newNombreInput = screen.getByLabelText('Nombre del Servicio *')
        expect(newNombreInput).toHaveValue('')
      })
    })
  })

  describe('Form Validation', () => {
    it('should show error when nombre is empty', async () => {
      const user = userEvent.setup()
      render(<PlantillaServicioModal {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('categoria-select')).toBeInTheDocument()
      })

      const submitButton = screen.getByText('Crear Sección')
      await user.click(submitButton)

      expect(mockToast.error).toHaveBeenCalledWith('El nombre es obligatorio')
      expect(mockCreatePlantillaServicio).not.toHaveBeenCalled()
    })

    it('should show error when categoria is empty', async () => {
      const user = userEvent.setup()
      mockGetCategoriasServicio.mockResolvedValue([])
      
      render(<PlantillaServicioModal {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByLabelText('Nombre del Servicio *')).toBeInTheDocument()
      })

      const nombreInput = screen.getByLabelText('Nombre del Servicio *')
      await user.type(nombreInput, 'Test Service')

      const submitButton = screen.getByText('Crear Sección')
      await user.click(submitButton)

      expect(mockToast.error).toHaveBeenCalledWith('La categoría es obligatoria')
      expect(mockCreatePlantillaServicio).not.toHaveBeenCalled()
    })
  })

  describe('Form Submission', () => {
    it('should create service successfully', async () => {
      const user = userEvent.setup()
      render(<PlantillaServicioModal {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('categoria-select')).toBeInTheDocument()
      })

      const nombreInput = screen.getByLabelText('Nombre del Servicio *')
      const descripcionInput = screen.getByLabelText('Descripción (opcional)')
      
      await user.type(nombreInput, 'Programación PLC')
      await user.type(descripcionInput, 'Servicio de programación')

      const submitButton = screen.getByText('Crear Sección')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockCreatePlantillaServicio).toHaveBeenCalledWith({
          plantillaId: 'plantilla1',
          nombre: 'Programación PLC',
          categoria: 'cat1',
          descripcion: 'Servicio de programación',
          subtotalInterno: 0,
          subtotalCliente: 0,
        })
      })

      expect(defaultProps.onCreated).toHaveBeenCalledWith(mockPlantillaServicio)
      expect(defaultProps.onClose).toHaveBeenCalled()
      expect(mockToast.success).toHaveBeenCalledWith('Sección de servicio creada exitosamente')
    })

    it('should handle creation error', async () => {
      const user = userEvent.setup()
      mockCreatePlantillaServicio.mockRejectedValue(new Error('Error 400: Validation failed'))
      
      render(<PlantillaServicioModal {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('categoria-select')).toBeInTheDocument()
      })

      const nombreInput = screen.getByLabelText('Nombre del Servicio *')
      await user.type(nombreInput, 'Test Service')

      const submitButton = screen.getByText('Crear Sección')
      await user.click(submitButton)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Error al crear la sección de servicio')
      })

      expect(defaultProps.onCreated).not.toHaveBeenCalled()
      expect(defaultProps.onClose).not.toHaveBeenCalled()
    })

    it('should show loading state during submission', async () => {
      const user = userEvent.setup()
      mockCreatePlantillaServicio.mockImplementation(() => new Promise(() => {}))
      
      render(<PlantillaServicioModal {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('categoria-select')).toBeInTheDocument()
      })

      const nombreInput = screen.getByLabelText('Nombre del Servicio *')
      await user.type(nombreInput, 'Test Service')

      const submitButton = screen.getByText('Crear Sección')
      await user.click(submitButton)

      expect(screen.getByText('Creando...')).toBeInTheDocument()
      expect(screen.getByTestId('loader-icon')).toBeInTheDocument()
    })
  })

  describe('Modal Controls', () => {
    it('should close modal when cancel button is clicked', async () => {
      const user = userEvent.setup()
      render(<PlantillaServicioModal {...defaultProps} />)
      
      const cancelButton = screen.getByText('Cancelar')
      await user.click(cancelButton)

      expect(defaultProps.onClose).toHaveBeenCalled()
    })

    it('should disable form during loading', async () => {
      mockCreatePlantillaServicio.mockImplementation(() => new Promise(() => {}))
      const user = userEvent.setup()
      
      render(<PlantillaServicioModal {...defaultProps} />)
      
      await waitFor(() => {
        expect(screen.getByTestId('categoria-select')).toBeInTheDocument()
      })

      const nombreInput = screen.getByLabelText('Nombre del Servicio *')
      await user.type(nombreInput, 'Test Service')

      const submitButton = screen.getByText('Crear Sección')
      await user.click(submitButton)

      // Check that form elements are disabled during loading
      expect(screen.getByLabelText('Nombre del Servicio *')).toBeDisabled()
      expect(screen.getByTestId('categoria-select')).toBeDisabled()
      expect(screen.getByLabelText('Descripción (opcional)')).toBeDisabled()
      expect(screen.getByText('Cancelar')).toBeDisabled()
    })
  })
})