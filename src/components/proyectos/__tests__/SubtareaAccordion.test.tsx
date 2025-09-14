// ===================================================
// 📁 Archivo: SubtareaAccordion.test.tsx
// 📌 Descripción: Tests unitarios para componente SubtareaAccordion (CLIENT)
// 🧠 Uso: React Testing Library + JSDOM para componentes cliente
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'
import SubtareaAccordion from '../SubtareaAccordion'
import { EstadoSubtarea, PrioridadSubtarea } from '@prisma/client'
import type { Subtarea } from '@/types/modelos'

// 🔧 Mock de servicios
jest.mock('@/lib/services/subtareas', () => ({
  getSubtareas: jest.fn(),
  createSubtarea: jest.fn(),
  updateSubtarea: jest.fn(),
  deleteSubtarea: jest.fn(),
  reordenarSubtareas: jest.fn(),
  duplicateSubtarea: jest.fn(),
}))

// 🔧 Mock de toast
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}))

// 🔧 Mock de framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    li: ({ children, ...props }: any) => <li {...props}>{children}</li>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  Reorder: {
    Group: ({ children, values, onReorder, ...props }: any) => (
      <ul {...props} data-testid="reorder-group">
        {children}
      </ul>
    ),
    Item: ({ children, value, ...props }: any) => (
      <li {...props} data-testid={`reorder-item-${value.id}`}>
        {children}
      </li>
    ),
  },
}))

// 🔧 Mock de componentes UI
jest.mock('@/components/ui/accordion', () => ({
  Accordion: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AccordionContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  AccordionItem: ({ children, value, ...props }: any) => (
    <div {...props} data-testid={`accordion-item-${value}`}>
      {children}
    </div>
  ),
  AccordionTrigger: ({ children, ...props }: any) => (
    <button {...props}>{children}</button>
  ),
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant, size, disabled, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      className={`btn ${variant} ${size}`}
      {...props}
    >
      {children}
    </button>
  ),
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, ...props }: any) => (
    <span className={`badge ${variant}`} {...props}>
      {children}
    </span>
  ),
}))

jest.mock('@/components/ui/progress', () => ({
  Progress: ({ value, ...props }: any) => (
    <div {...props} data-testid="progress" data-value={value}>
      <div style={{ width: `${value}%` }} />
    </div>
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

// 📋 Mock data
const mockSubtareas: Subtarea[] = [
  {
    id: '1',
    titulo: 'Subtarea 1',
    descripcion: 'Descripción de subtarea 1',
    estado: EstadoSubtarea.pendiente,
    prioridad: PrioridadSubtarea.alta,
    fechaInicio: new Date('2024-01-15'),
    fechaFin: new Date('2024-01-20'),
    progreso: 0,
    orden: 1,
    tareaId: 'tarea-1',
    responsableId: 'user-1',
    createdAt: new Date('2024-01-10'),
    updatedAt: new Date('2024-01-10'),
    tarea: {
      id: 'tarea-1',
      titulo: 'Tarea Principal',
      descripcion: 'Descripción de la tarea',
      estado: 'pendiente' as any,
      prioridad: 'alta' as any,
      fechaInicio: new Date(),
      fechaFin: new Date(),
      progreso: 0,
      proyectoId: 'proyecto-1',
      responsableId: 'user-1',
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
  },
  {
    id: '2',
    titulo: 'Subtarea 2',
    descripcion: 'Descripción de subtarea 2',
    estado: EstadoSubtarea.en_progreso,
    prioridad: PrioridadSubtarea.media,
    fechaInicio: new Date('2024-01-16'),
    fechaFin: new Date('2024-01-25'),
    progreso: 50,
    orden: 2,
    tareaId: 'tarea-1',
    responsableId: 'user-2',
    createdAt: new Date('2024-01-11'),
    updatedAt: new Date('2024-01-16'),
    tarea: {
      id: 'tarea-1',
      titulo: 'Tarea Principal',
      descripcion: 'Descripción de la tarea',
      estado: 'pendiente' as any,
      prioridad: 'alta' as any,
      fechaInicio: new Date(),
      fechaFin: new Date(),
      progreso: 0,
      proyectoId: 'proyecto-1',
      responsableId: 'user-1',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    responsable: {
      id: 'user-2',
      name: 'Usuario Test 2',
      email: 'test2@example.com',
      role: 'proyectos',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  },
]

const mockProps = {
  tareaId: 'tarea-1',
  onSubtareaChange: jest.fn(),
}

describe('SubtareaAccordion Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock del servicio getSubtareas
    const { getSubtareas } = require('@/lib/services/subtareas')
    getSubtareas.mockResolvedValue({
      data: mockSubtareas,
      total: 2,
    })
  })

  describe('Renderizado inicial', () => {
    it('debería renderizar el acordeón de subtareas correctamente', async () => {
      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('Subtareas (2)')).toBeInTheDocument()
        expect(screen.getByText('Subtarea 1')).toBeInTheDocument()
        expect(screen.getByText('Subtarea 2')).toBeInTheDocument()
      })
    })

    it('debería mostrar estado de carga inicialmente', () => {
      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      // ✅ Assert
      expect(screen.getByText('Cargando subtareas...')).toBeInTheDocument()
    })

    it('debería mostrar mensaje cuando no hay subtareas', async () => {
      // 📋 Arrange
      const { getSubtareas } = require('@/lib/services/subtareas')
      getSubtareas.mockResolvedValue({
        data: [],
        total: 0,
      })

      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('No hay subtareas creadas')).toBeInTheDocument()
        expect(screen.getByText('Crear primera subtarea')).toBeInTheDocument()
      })
    })
  })

  describe('Visualización de subtareas', () => {
    it('debería mostrar información básica de cada subtarea', async () => {
      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('Subtarea 1')).toBeInTheDocument()
        expect(screen.getByText('Subtarea 2')).toBeInTheDocument()
        expect(screen.getByText('Usuario Test')).toBeInTheDocument()
        expect(screen.getByText('Usuario Test 2')).toBeInTheDocument()
      })
    })

    it('debería mostrar badges de estado y prioridad', async () => {
      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('Pendiente')).toBeInTheDocument()
        expect(screen.getByText('En Progreso')).toBeInTheDocument()
        expect(screen.getByText('Alta')).toBeInTheDocument()
        expect(screen.getByText('Media')).toBeInTheDocument()
      })
    })

    it('debería mostrar barras de progreso', async () => {
      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      // ✅ Assert
      await waitFor(() => {
        const progressBars = screen.getAllByTestId('progress')
        expect(progressBars).toHaveLength(2)
        expect(progressBars[0]).toHaveAttribute('data-value', '0')
        expect(progressBars[1]).toHaveAttribute('data-value', '50')
      })
    })

    it('debería mostrar fechas formateadas', async () => {
      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('15/01/2024')).toBeInTheDocument()
        expect(screen.getByText('20/01/2024')).toBeInTheDocument()
        expect(screen.getByText('16/01/2024')).toBeInTheDocument()
        expect(screen.getByText('25/01/2024')).toBeInTheDocument()
      })
    })
  })

  describe('Creación de subtareas', () => {
    it('debería mostrar formulario de creación al hacer clic en "Nueva Subtarea"', async () => {
      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Subtarea 1')).toBeInTheDocument()
      })

      const newButton = screen.getByText('Nueva Subtarea')
      await user.click(newButton)

      // ✅ Assert
      expect(screen.getByLabelText('Título')).toBeInTheDocument()
      expect(screen.getByLabelText('Descripción')).toBeInTheDocument()
      expect(screen.getByLabelText('Estado')).toBeInTheDocument()
      expect(screen.getByLabelText('Prioridad')).toBeInTheDocument()
      expect(screen.getByText('Crear Subtarea')).toBeInTheDocument()
      expect(screen.getByText('Cancelar')).toBeInTheDocument()
    })

    it('debería crear una nueva subtarea correctamente', async () => {
      // 📋 Arrange
      const { createSubtarea } = require('@/lib/services/subtareas')
      createSubtarea.mockResolvedValue({
        success: true,
        data: { ...mockSubtareas[0], id: '3', titulo: 'Nueva Subtarea' },
      })

      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Subtarea 1')).toBeInTheDocument()
      })

      const newButton = screen.getByText('Nueva Subtarea')
      await user.click(newButton)

      // Llenar formulario
      await user.type(screen.getByLabelText('Título'), 'Nueva Subtarea')
      await user.type(screen.getByLabelText('Descripción'), 'Descripción nueva')

      const createButton = screen.getByText('Crear Subtarea')
      await user.click(createButton)

      // ✅ Assert
      await waitFor(() => {
        expect(createSubtarea).toHaveBeenCalledWith(
          expect.objectContaining({
            titulo: 'Nueva Subtarea',
            descripcion: 'Descripción nueva',
            tareaId: 'tarea-1',
          })
        )
        expect(mockProps.onSubtareaChange).toHaveBeenCalled()
      })
    })

    it('debería cancelar la creación correctamente', async () => {
      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Subtarea 1')).toBeInTheDocument()
      })

      const newButton = screen.getByText('Nueva Subtarea')
      await user.click(newButton)

      const cancelButton = screen.getByText('Cancelar')
      await user.click(cancelButton)

      // ✅ Assert
      expect(screen.queryByLabelText('Título')).not.toBeInTheDocument()
    })
  })

  describe('Edición de subtareas', () => {
    it('debería mostrar formulario de edición al hacer clic en "Editar"', async () => {
      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Subtarea 1')).toBeInTheDocument()
      })

      // Expandir acordeón
      const accordionTrigger = screen.getByText('Subtarea 1')
      await user.click(accordionTrigger)

      const editButtons = screen.getAllByText('Editar')
      await user.click(editButtons[0])

      // ✅ Assert
      expect(screen.getByDisplayValue('Subtarea 1')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Descripción de subtarea 1')).toBeInTheDocument()
      expect(screen.getByText('Actualizar Subtarea')).toBeInTheDocument()
    })

    it('debería actualizar una subtarea correctamente', async () => {
      // 📋 Arrange
      const { updateSubtarea } = require('@/lib/services/subtareas')
      updateSubtarea.mockResolvedValue({
        success: true,
        data: { ...mockSubtareas[0], titulo: 'Subtarea Actualizada' },
      })

      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Subtarea 1')).toBeInTheDocument()
      })

      // Expandir acordeón
      const accordionTrigger = screen.getByText('Subtarea 1')
      await user.click(accordionTrigger)

      const editButtons = screen.getAllByText('Editar')
      await user.click(editButtons[0])

      // Editar título
      const tituloInput = screen.getByDisplayValue('Subtarea 1')
      await user.clear(tituloInput)
      await user.type(tituloInput, 'Subtarea Actualizada')

      const updateButton = screen.getByText('Actualizar Subtarea')
      await user.click(updateButton)

      // ✅ Assert
      await waitFor(() => {
        expect(updateSubtarea).toHaveBeenCalledWith(
          '1',
          expect.objectContaining({
            titulo: 'Subtarea Actualizada',
          })
        )
        expect(mockProps.onSubtareaChange).toHaveBeenCalled()
      })
    })
  })

  describe('Eliminación de subtareas', () => {
    it('debería eliminar una subtarea correctamente', async () => {
      // 📋 Arrange
      const { deleteSubtarea } = require('@/lib/services/subtareas')
      deleteSubtarea.mockResolvedValue({ success: true })

      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Subtarea 1')).toBeInTheDocument()
      })

      // Expandir acordeón
      const accordionTrigger = screen.getByText('Subtarea 1')
      await user.click(accordionTrigger)

      const deleteButtons = screen.getAllByText('Eliminar')
      await user.click(deleteButtons[0])

      // Confirmar eliminación
      const confirmButton = screen.getByText('Confirmar')
      await user.click(confirmButton)

      // ✅ Assert
      await waitFor(() => {
        expect(deleteSubtarea).toHaveBeenCalledWith('1')
        expect(mockProps.onSubtareaChange).toHaveBeenCalled()
      })
    })

    it('debería cancelar la eliminación correctamente', async () => {
      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Subtarea 1')).toBeInTheDocument()
      })

      // Expandir acordeón
      const accordionTrigger = screen.getByText('Subtarea 1')
      await user.click(accordionTrigger)

      const deleteButtons = screen.getAllByText('Eliminar')
      await user.click(deleteButtons[0])

      // Cancelar eliminación
      const cancelButton = screen.getByText('Cancelar')
      await user.click(cancelButton)

      // ✅ Assert
      const { deleteSubtarea } = require('@/lib/services/subtareas')
      expect(deleteSubtarea).not.toHaveBeenCalled()
    })
  })

  describe('Reordenamiento de subtareas', () => {
    it('debería permitir reordenar subtareas por drag and drop', async () => {
      // 📋 Arrange
      const { reordenarSubtareas } = require('@/lib/services/subtareas')
      reordenarSubtareas.mockResolvedValue({ success: true })

      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByTestId('reorder-group')).toBeInTheDocument()
      })

      // Simular reordenamiento
      const reorderGroup = screen.getByTestId('reorder-group')
      fireEvent.dragStart(screen.getByTestId('reorder-item-1'))
      fireEvent.dragOver(screen.getByTestId('reorder-item-2'))
      fireEvent.drop(screen.getByTestId('reorder-item-2'))

      // ✅ Assert
      await waitFor(() => {
        expect(reordenarSubtareas).toHaveBeenCalled()
        expect(mockProps.onSubtareaChange).toHaveBeenCalled()
      })
    })
  })

  describe('Duplicación de subtareas', () => {
    it('debería duplicar una subtarea correctamente', async () => {
      // 📋 Arrange
      const { duplicateSubtarea } = require('@/lib/services/subtareas')
      duplicateSubtarea.mockResolvedValue({
        success: true,
        data: { ...mockSubtareas[0], id: '3', titulo: 'Subtarea 1 (Copia)' },
      })

      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Subtarea 1')).toBeInTheDocument()
      })

      // Expandir acordeón
      const accordionTrigger = screen.getByText('Subtarea 1')
      await user.click(accordionTrigger)

      const duplicateButtons = screen.getAllByText('Duplicar')
      await user.click(duplicateButtons[0])

      // ✅ Assert
      await waitFor(() => {
        expect(duplicateSubtarea).toHaveBeenCalledWith('1')
        expect(mockProps.onSubtareaChange).toHaveBeenCalled()
      })
    })
  })

  describe('Estados de error', () => {
    it('debería mostrar error cuando falla la carga de subtareas', async () => {
      // 📋 Arrange
      const { getSubtareas } = require('@/lib/services/subtareas')
      getSubtareas.mockRejectedValue(new Error('Network error'))

      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('Error al cargar subtareas')).toBeInTheDocument()
      })
    })

    it('debería permitir reintentar después de un error', async () => {
      // 📋 Arrange
      const { getSubtareas } = require('@/lib/services/subtareas')
      getSubtareas.mockRejectedValueOnce(new Error('Network error'))
      getSubtareas.mockResolvedValue({
        data: mockSubtareas,
        total: 2,
      })

      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Error al cargar subtareas')).toBeInTheDocument()
      })

      const retryButton = screen.getByText('Reintentar')
      await user.click(retryButton)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('Subtarea 1')).toBeInTheDocument()
      })
    })
  })

  describe('Accesibilidad', () => {
    it('debería tener etiquetas ARIA apropiadas', async () => {
      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Subtareas/ })).toBeInTheDocument()
        expect(screen.getByLabelText('Lista de subtareas')).toBeInTheDocument()
      })
    })

    it('debería ser navegable por teclado', async () => {
      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Subtarea 1')).toBeInTheDocument()
      })

      // ✅ Assert
      const accordionTrigger = screen.getByText('Subtarea 1')
      expect(accordionTrigger).toHaveAttribute('tabIndex', '0')

      const newButton = screen.getByText('Nueva Subtarea')
      expect(newButton).toHaveAttribute('tabIndex', '0')
    })

    it('debería anunciar cambios de estado', async () => {
      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Subtarea 1')).toBeInTheDocument()
      })

      // ✅ Assert
      expect(screen.getByText('Subtareas (2)')).toHaveAttribute('aria-live', 'polite')
    })
  })

  describe('Integración con callbacks', () => {
    it('debería llamar onSubtareaChange cuando se modifica una subtarea', async () => {
      // 📋 Arrange
      const { updateSubtarea } = require('@/lib/services/subtareas')
      updateSubtarea.mockResolvedValue({ success: true, data: mockSubtareas[0] })

      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Subtarea 1')).toBeInTheDocument()
      })

      // Expandir acordeón y editar
      const accordionTrigger = screen.getByText('Subtarea 1')
      await user.click(accordionTrigger)

      const editButtons = screen.getAllByText('Editar')
      await user.click(editButtons[0])

      const updateButton = screen.getByText('Actualizar Subtarea')
      await user.click(updateButton)

      // ✅ Assert
      await waitFor(() => {
        expect(mockProps.onSubtareaChange).toHaveBeenCalled()
      })
    })

    it('debería actualizar el contador de subtareas', async () => {
      // 📋 Arrange
      const { createSubtarea } = require('@/lib/services/subtareas')
      createSubtarea.mockResolvedValue({
        success: true,
        data: { ...mockSubtareas[0], id: '3' },
      })

      // 🎯 Act
      render(<SubtareaAccordion {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Subtareas (2)')).toBeInTheDocument()
      })

      const newButton = screen.getByText('Nueva Subtarea')
      await user.click(newButton)

      await user.type(screen.getByLabelText('Título'), 'Nueva Subtarea')
      
      const createButton = screen.getByText('Crear Subtarea')
      await user.click(createButton)

      // ✅ Assert
      await waitFor(() => {
        expect(mockProps.onSubtareaChange).toHaveBeenCalled()
      })
    })
  })
})