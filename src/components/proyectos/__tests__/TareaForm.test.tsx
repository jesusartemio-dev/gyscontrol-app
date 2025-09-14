// ===================================================
// 📁 Archivo: TareaForm.test.tsx
// 📌 Descripción: Tests unitarios para componente TareaForm (CLIENT)
// 🧠 Uso: React Testing Library + JSDOM para componentes cliente
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'
import TareaForm from '../TareaForm'
import { EstadoTarea, PrioridadTarea } from '@prisma/client'
import type { Tarea } from '@/types/modelos'

// 🔧 Mock de servicios
jest.mock('@/lib/services/tareas', () => ({
  createTarea: jest.fn(),
  updateTarea: jest.fn(),
}))

jest.mock('@/lib/services/proyectos', () => ({
  getProyectos: jest.fn(),
}))

jest.mock('@/lib/services/usuarios', () => ({
  getUsuarios: jest.fn(),
}))

// 🔧 Mock de toast
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}))

// 🔧 Mock de framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  },
}))

// 🔧 Mock de componentes UI
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type, disabled, ...props }: any) => (
    <button onClick={onClick} type={type} disabled={disabled} {...props}>
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

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange, value }: any) => (
    <select value={value} onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}))

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
}))

// 📋 Mock data
const mockTarea: Tarea = {
  id: '1',
  titulo: 'Tarea de Prueba',
  descripcion: 'Descripción de la tarea',
  estado: EstadoTarea.pendiente,
  prioridad: PrioridadTarea.alta,
  fechaInicio: new Date('2024-01-15'),
  fechaFin: new Date('2024-01-30'),
  progreso: 0,
  proyectoId: 'proyecto-1',
  responsableId: 'user-1',
  createdAt: new Date('2024-01-10'),
  updatedAt: new Date('2024-01-10'),
  subtareas: [],
  dependenciasOrigen: [],
  dependenciasDestino: [],
  proyecto: {
    id: 'proyecto-1',
    nombre: 'Proyecto Test',
    descripcion: 'Descripción del proyecto',
    estado: 'activo',
    fechaInicio: new Date(),
    fechaFin: new Date(),
    presupuesto: 100000,
    comercialId: 'user-1',
    gestorId: 'user-2',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  responsable: {
    id: 'user-1',
    name: 'Usuario Test',
    email: 'test@example.com',
    role: 'proyectos',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
}

const mockProyectos = [
  {
    id: 'proyecto-1',
    nombre: 'Proyecto Test 1',
  },
  {
    id: 'proyecto-2',
    nombre: 'Proyecto Test 2',
  },
]

const mockUsuarios = [
  {
    id: 'user-1',
    name: 'Usuario Test 1',
    email: 'test1@example.com',
  },
  {
    id: 'user-2',
    name: 'Usuario Test 2',
    email: 'test2@example.com',
  },
]

const mockProps = {
  onSubmit: jest.fn(),
  onCancel: jest.fn(),
  isLoading: false,
}

describe('TareaForm Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock de servicios
    const { getProyectos } = require('@/lib/services/proyectos')
    const { getUsuarios } = require('@/lib/services/usuarios')
    const { createTarea, updateTarea } = require('@/lib/services/tareas')
    
    getProyectos.mockResolvedValue({ data: mockProyectos })
    getUsuarios.mockResolvedValue({ data: mockUsuarios })
    createTarea.mockResolvedValue({ success: true, data: mockTarea })
    updateTarea.mockResolvedValue({ success: true, data: mockTarea })
  })

  describe('Renderizado inicial', () => {
    it('debería renderizar el formulario de creación correctamente', async () => {
      // 🎯 Act
      render(<TareaForm {...mockProps} />)

      // ✅ Assert
      expect(screen.getByText('Nueva Tarea')).toBeInTheDocument()
      expect(screen.getByLabelText('Título')).toBeInTheDocument()
      expect(screen.getByLabelText('Descripción')).toBeInTheDocument()
      expect(screen.getByLabelText('Proyecto')).toBeInTheDocument()
      expect(screen.getByLabelText('Responsable')).toBeInTheDocument()
      expect(screen.getByLabelText('Estado')).toBeInTheDocument()
      expect(screen.getByLabelText('Prioridad')).toBeInTheDocument()
      expect(screen.getByLabelText('Fecha de Inicio')).toBeInTheDocument()
      expect(screen.getByLabelText('Fecha de Fin')).toBeInTheDocument()
      expect(screen.getByText('Crear Tarea')).toBeInTheDocument()
      expect(screen.getByText('Cancelar')).toBeInTheDocument()
    })

    it('debería renderizar el formulario de edición con datos precargados', async () => {
      // 🎯 Act
      render(<TareaForm {...mockProps} tarea={mockTarea} />)

      // ✅ Assert
      expect(screen.getByText('Editar Tarea')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Tarea de Prueba')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Descripción de la tarea')).toBeInTheDocument()
      expect(screen.getByText('Actualizar Tarea')).toBeInTheDocument()
    })

    it('debería cargar proyectos y usuarios al montar', async () => {
      // 🎯 Act
      render(<TareaForm {...mockProps} />)

      // ✅ Assert
      await waitFor(() => {
        const { getProyectos } = require('@/lib/services/proyectos')
        const { getUsuarios } = require('@/lib/services/usuarios')
        expect(getProyectos).toHaveBeenCalled()
        expect(getUsuarios).toHaveBeenCalled()
      })
    })
  })

  describe('Validación de formulario', () => {
    it('debería mostrar errores de validación para campos requeridos', async () => {
      // 🎯 Act
      render(<TareaForm {...mockProps} />)

      const submitButton = screen.getByText('Crear Tarea')
      await user.click(submitButton)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('El título es requerido')).toBeInTheDocument()
        expect(screen.getByText('El proyecto es requerido')).toBeInTheDocument()
        expect(screen.getByText('El responsable es requerido')).toBeInTheDocument()
      })
    })

    it('debería validar longitud mínima del título', async () => {
      // 🎯 Act
      render(<TareaForm {...mockProps} />)

      const tituloInput = screen.getByLabelText('Título')
      await user.type(tituloInput, 'Ab')

      const submitButton = screen.getByText('Crear Tarea')
      await user.click(submitButton)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('El título debe tener al menos 3 caracteres')).toBeInTheDocument()
      })
    })

    it('debería validar que fecha de fin sea posterior a fecha de inicio', async () => {
      // 🎯 Act
      render(<TareaForm {...mockProps} />)

      const fechaInicioInput = screen.getByLabelText('Fecha de Inicio')
      const fechaFinInput = screen.getByLabelText('Fecha de Fin')

      await user.type(fechaInicioInput, '2024-01-30')
      await user.type(fechaFinInput, '2024-01-15')

      const submitButton = screen.getByText('Crear Tarea')
      await user.click(submitButton)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('La fecha de fin debe ser posterior a la fecha de inicio')).toBeInTheDocument()
      })
    })

    it('debería validar progreso entre 0 y 100', async () => {
      // 🎯 Act
      render(<TareaForm {...mockProps} />)

      const progresoInput = screen.getByLabelText('Progreso (%)')
      await user.clear(progresoInput)
      await user.type(progresoInput, '150')

      const submitButton = screen.getByText('Crear Tarea')
      await user.click(submitButton)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('El progreso debe estar entre 0 y 100')).toBeInTheDocument()
      })
    })
  })

  describe('Interacciones del formulario', () => {
    it('debería actualizar campos de texto correctamente', async () => {
      // 🎯 Act
      render(<TareaForm {...mockProps} />)

      const tituloInput = screen.getByLabelText('Título')
      const descripcionInput = screen.getByLabelText('Descripción')

      await user.type(tituloInput, 'Nueva Tarea Test')
      await user.type(descripcionInput, 'Descripción de prueba')

      // ✅ Assert
      expect(tituloInput).toHaveValue('Nueva Tarea Test')
      expect(descripcionInput).toHaveValue('Descripción de prueba')
    })

    it('debería actualizar selects correctamente', async () => {
      // 🎯 Act
      render(<TareaForm {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Proyecto Test 1')).toBeInTheDocument()
      })

      const proyectoSelect = screen.getByLabelText('Proyecto')
      const estadoSelect = screen.getByLabelText('Estado')
      const prioridadSelect = screen.getByLabelText('Prioridad')

      fireEvent.change(proyectoSelect, { target: { value: 'proyecto-1' } })
      fireEvent.change(estadoSelect, { target: { value: EstadoTarea.en_progreso } })
      fireEvent.change(prioridadSelect, { target: { value: PrioridadTarea.alta } })

      // ✅ Assert
      expect(proyectoSelect).toHaveValue('proyecto-1')
      expect(estadoSelect).toHaveValue(EstadoTarea.en_progreso)
      expect(prioridadSelect).toHaveValue(PrioridadTarea.alta)
    })

    it('debería actualizar fechas correctamente', async () => {
      // 🎯 Act
      render(<TareaForm {...mockProps} />)

      const fechaInicioInput = screen.getByLabelText('Fecha de Inicio')
      const fechaFinInput = screen.getByLabelText('Fecha de Fin')

      await user.type(fechaInicioInput, '2024-01-15')
      await user.type(fechaFinInput, '2024-01-30')

      // ✅ Assert
      expect(fechaInicioInput).toHaveValue('2024-01-15')
      expect(fechaFinInput).toHaveValue('2024-01-30')
    })
  })

  describe('Envío del formulario', () => {
    it('debería crear una nueva tarea correctamente', async () => {
      // 🎯 Act
      render(<TareaForm {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Proyecto Test 1')).toBeInTheDocument()
      })

      // Llenar formulario
      await user.type(screen.getByLabelText('Título'), 'Nueva Tarea')
      await user.type(screen.getByLabelText('Descripción'), 'Descripción de prueba')
      
      const proyectoSelect = screen.getByLabelText('Proyecto')
      const responsableSelect = screen.getByLabelText('Responsable')
      
      fireEvent.change(proyectoSelect, { target: { value: 'proyecto-1' } })
      fireEvent.change(responsableSelect, { target: { value: 'user-1' } })

      await user.type(screen.getByLabelText('Fecha de Inicio'), '2024-01-15')
      await user.type(screen.getByLabelText('Fecha de Fin'), '2024-01-30')

      const submitButton = screen.getByText('Crear Tarea')
      await user.click(submitButton)

      // ✅ Assert
      await waitFor(() => {
        expect(mockProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            titulo: 'Nueva Tarea',
            descripcion: 'Descripción de prueba',
            proyectoId: 'proyecto-1',
            responsableId: 'user-1',
          })
        )
      })
    })

    it('debería actualizar una tarea existente correctamente', async () => {
      // 🎯 Act
      render(<TareaForm {...mockProps} tarea={mockTarea} />)

      const tituloInput = screen.getByDisplayValue('Tarea de Prueba')
      await user.clear(tituloInput)
      await user.type(tituloInput, 'Tarea Actualizada')

      const submitButton = screen.getByText('Actualizar Tarea')
      await user.click(submitButton)

      // ✅ Assert
      await waitFor(() => {
        expect(mockProps.onSubmit).toHaveBeenCalledWith(
          expect.objectContaining({
            id: '1',
            titulo: 'Tarea Actualizada',
          })
        )
      })
    })

    it('debería mostrar estado de carga durante el envío', async () => {
      // 🎯 Act
      render(<TareaForm {...mockProps} isLoading={true} />)

      // ✅ Assert
      const submitButton = screen.getByText('Creando...')
      expect(submitButton).toBeDisabled()
    })

    it('debería llamar onCancel al hacer clic en cancelar', async () => {
      // 🎯 Act
      render(<TareaForm {...mockProps} />)

      const cancelButton = screen.getByText('Cancelar')
      await user.click(cancelButton)

      // ✅ Assert
      expect(mockProps.onCancel).toHaveBeenCalled()
    })
  })

  describe('Estados de error', () => {
    it('debería mostrar error cuando falla la carga de proyectos', async () => {
      // 📋 Arrange
      const { getProyectos } = require('@/lib/services/proyectos')
      getProyectos.mockRejectedValue(new Error('Network error'))

      // 🎯 Act
      render(<TareaForm {...mockProps} />)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('Error al cargar proyectos')).toBeInTheDocument()
      })
    })

    it('debería mostrar error cuando falla la carga de usuarios', async () => {
      // 📋 Arrange
      const { getUsuarios } = require('@/lib/services/usuarios')
      getUsuarios.mockRejectedValue(new Error('Network error'))

      // 🎯 Act
      render(<TareaForm {...mockProps} />)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('Error al cargar usuarios')).toBeInTheDocument()
      })
    })

    it('debería manejar errores de envío del formulario', async () => {
      // 📋 Arrange
      const { createTarea } = require('@/lib/services/tareas')
      createTarea.mockRejectedValue(new Error('Server error'))
      const { toast } = require('@/components/ui/use-toast')

      // 🎯 Act
      render(<TareaForm {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Proyecto Test 1')).toBeInTheDocument()
      })

      // Llenar formulario mínimo
      await user.type(screen.getByLabelText('Título'), 'Nueva Tarea')
      
      const proyectoSelect = screen.getByLabelText('Proyecto')
      const responsableSelect = screen.getByLabelText('Responsable')
      
      fireEvent.change(proyectoSelect, { target: { value: 'proyecto-1' } })
      fireEvent.change(responsableSelect, { target: { value: 'user-1' } })

      const submitButton = screen.getByText('Crear Tarea')
      await user.click(submitButton)

      // ✅ Assert
      await waitFor(() => {
        expect(toast).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Error',
            description: 'Error al crear la tarea',
            variant: 'destructive',
          })
        )
      })
    })
  })

  describe('Accesibilidad', () => {
    it('debería tener etiquetas ARIA apropiadas', () => {
      // 🎯 Act
      render(<TareaForm {...mockProps} />)

      // ✅ Assert
      expect(screen.getByRole('form')).toBeInTheDocument()
      expect(screen.getByLabelText('Título')).toBeInTheDocument()
      expect(screen.getByLabelText('Descripción')).toBeInTheDocument()
      expect(screen.getByLabelText('Proyecto')).toBeInTheDocument()
      expect(screen.getByLabelText('Responsable')).toBeInTheDocument()
      expect(screen.getByLabelText('Estado')).toBeInTheDocument()
      expect(screen.getByLabelText('Prioridad')).toBeInTheDocument()
    })

    it('debería ser navegable por teclado', async () => {
      // 🎯 Act
      render(<TareaForm {...mockProps} />)

      // ✅ Assert
      const tituloInput = screen.getByLabelText('Título')
      const descripcionInput = screen.getByLabelText('Descripción')
      const submitButton = screen.getByText('Crear Tarea')
      const cancelButton = screen.getByText('Cancelar')

      expect(tituloInput).toHaveAttribute('tabIndex', '0')
      expect(descripcionInput).toHaveAttribute('tabIndex', '0')
      expect(submitButton).toHaveAttribute('tabIndex', '0')
      expect(cancelButton).toHaveAttribute('tabIndex', '0')
    })

    it('debería mostrar mensajes de error asociados a campos', async () => {
      // 🎯 Act
      render(<TareaForm {...mockProps} />)

      const submitButton = screen.getByText('Crear Tarea')
      await user.click(submitButton)

      // ✅ Assert
      await waitFor(() => {
        const tituloInput = screen.getByLabelText('Título')
        const errorMessage = screen.getByText('El título es requerido')
        
        expect(tituloInput).toHaveAttribute('aria-describedby')
        expect(errorMessage).toHaveAttribute('id')
      })
    })
  })

  describe('Integración con React Hook Form', () => {
    it('debería resetear el formulario después de envío exitoso', async () => {
      // 🎯 Act
      render(<TareaForm {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Proyecto Test 1')).toBeInTheDocument()
      })

      // Llenar formulario
      const tituloInput = screen.getByLabelText('Título')
      await user.type(tituloInput, 'Nueva Tarea')
      
      const proyectoSelect = screen.getByLabelText('Proyecto')
      const responsableSelect = screen.getByLabelText('Responsable')
      
      fireEvent.change(proyectoSelect, { target: { value: 'proyecto-1' } })
      fireEvent.change(responsableSelect, { target: { value: 'user-1' } })

      const submitButton = screen.getByText('Crear Tarea')
      await user.click(submitButton)

      // ✅ Assert
      await waitFor(() => {
        expect(tituloInput).toHaveValue('')
      })
    })

    it('debería mantener valores del formulario durante la edición', async () => {
      // 🎯 Act
      render(<TareaForm {...mockProps} tarea={mockTarea} />)

      // ✅ Assert
      expect(screen.getByDisplayValue('Tarea de Prueba')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Descripción de la tarea')).toBeInTheDocument()
    })
  })
})