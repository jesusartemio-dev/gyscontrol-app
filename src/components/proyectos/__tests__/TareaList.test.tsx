// ===================================================
// 📁 Archivo: TareaList.test.tsx
// 📌 Descripción: Tests unitarios para componente TareaList (CLIENT)
// 🧠 Uso: React Testing Library + JSDOM para componentes cliente
// ✍️ Autor: Senior Fullstack Developer
// 📅 Última actualización: 2025-01-15
// ===================================================

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { jest } from '@jest/globals'
import TareaList from '../TareaList'
import { EstadoTarea, PrioridadTarea } from '@prisma/client'
import type { Tarea } from '@/types/modelos'

// 🔧 Mock de servicios
jest.mock('@/lib/services/tareas', () => ({
  getTareas: jest.fn(),
  deleteTarea: jest.fn(),
  updateTarea: jest.fn(),
}))

// 🔧 Mock de toast
jest.mock('@/components/ui/use-toast', () => ({
  toast: jest.fn(),
}))

// 🔧 Mock de framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }: any) => <tr {...props}>{children}</tr>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}))

// 🔧 Mock de componentes UI
jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>
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

jest.mock('@/components/ui/input', () => ({
  Input: ({ ...props }: any) => <input {...props} />,
}))

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, onValueChange }: any) => (
    <select onChange={(e) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <>{children}</>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <>{children}</>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}))

// 📋 Mock data
const mockTareas: Tarea[] = [
  {
    id: '1',
    titulo: 'Tarea de Prueba 1',
    descripcion: 'Descripción de la tarea 1',
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
  },
  {
    id: '2',
    titulo: 'Tarea de Prueba 2',
    descripcion: 'Descripción de la tarea 2',
    estado: EstadoTarea.en_progreso,
    prioridad: PrioridadTarea.media,
    fechaInicio: new Date('2024-01-20'),
    fechaFin: new Date('2024-02-05'),
    progreso: 50,
    proyectoId: 'proyecto-1',
    responsableId: 'user-2',
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-01-20'),
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
  proyectoId: 'proyecto-1',
  onEdit: jest.fn(),
  onDelete: jest.fn(),
  onSelect: jest.fn(),
}

describe('TareaList Component', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    jest.clearAllMocks()
    // Mock del servicio getTareas
    const { getTareas } = require('@/lib/services/tareas')
    getTareas.mockResolvedValue({
      data: mockTareas,
      total: 2,
      page: 1,
      limit: 10,
      totalPages: 1,
    })
  })

  describe('Renderizado inicial', () => {
    it('debería renderizar la lista de tareas correctamente', async () => {
      // 🎯 Act
      render(<TareaList {...mockProps} />)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('Tarea de Prueba 1')).toBeInTheDocument()
        expect(screen.getByText('Tarea de Prueba 2')).toBeInTheDocument()
      })

      expect(screen.getByText('Usuario Test')).toBeInTheDocument()
      expect(screen.getByText('Usuario Test 2')).toBeInTheDocument()
    })

    it('debería mostrar estados de carga inicialmente', () => {
      // 🎯 Act
      render(<TareaList {...mockProps} />)

      // ✅ Assert
      expect(screen.getByText('Cargando tareas...')).toBeInTheDocument()
    })

    it('debería mostrar mensaje cuando no hay tareas', async () => {
      // 📋 Arrange
      const { getTareas } = require('@/lib/services/tareas')
      getTareas.mockResolvedValue({
        data: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      })

      // 🎯 Act
      render(<TareaList {...mockProps} />)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('No se encontraron tareas')).toBeInTheDocument()
      })
    })
  })

  describe('Filtros y búsqueda', () => {
    it('debería filtrar por búsqueda de texto', async () => {
      // 🎯 Act
      render(<TareaList {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Tarea de Prueba 1')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Buscar tareas...')
      await user.type(searchInput, 'Prueba 1')

      // ✅ Assert
      await waitFor(() => {
        const { getTareas } = require('@/lib/services/tareas')
        expect(getTareas).toHaveBeenCalledWith(
          expect.objectContaining({
            search: 'Prueba 1',
          })
        )
      })
    })

    it('debería filtrar por estado', async () => {
      // 🎯 Act
      render(<TareaList {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Tarea de Prueba 1')).toBeInTheDocument()
      })

      const estadoSelect = screen.getByDisplayValue('Todos los estados')
      fireEvent.change(estadoSelect, { target: { value: EstadoTarea.pendiente } })

      // ✅ Assert
      await waitFor(() => {
        const { getTareas } = require('@/lib/services/tareas')
        expect(getTareas).toHaveBeenCalledWith(
          expect.objectContaining({
            estado: EstadoTarea.pendiente,
          })
        )
      })
    })

    it('debería filtrar por prioridad', async () => {
      // 🎯 Act
      render(<TareaList {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Tarea de Prueba 1')).toBeInTheDocument()
      })

      const prioridadSelect = screen.getByDisplayValue('Todas las prioridades')
      fireEvent.change(prioridadSelect, { target: { value: PrioridadTarea.alta } })

      // ✅ Assert
      await waitFor(() => {
        const { getTareas } = require('@/lib/services/tareas')
        expect(getTareas).toHaveBeenCalledWith(
          expect.objectContaining({
            prioridad: PrioridadTarea.alta,
          })
        )
      })
    })

    it('debería limpiar filtros correctamente', async () => {
      // 🎯 Act
      render(<TareaList {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Tarea de Prueba 1')).toBeInTheDocument()
      })

      // Aplicar filtros
      const searchInput = screen.getByPlaceholderText('Buscar tareas...')
      await user.type(searchInput, 'test')

      // Limpiar filtros
      const clearButton = screen.getByText('Limpiar filtros')
      await user.click(clearButton)

      // ✅ Assert
      expect(searchInput).toHaveValue('')
    })
  })

  describe('Acciones de tareas', () => {
    it('debería llamar onEdit cuando se hace clic en editar', async () => {
      // 🎯 Act
      render(<TareaList {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Tarea de Prueba 1')).toBeInTheDocument()
      })

      const editButtons = screen.getAllByText('Editar')
      await user.click(editButtons[0])

      // ✅ Assert
      expect(mockProps.onEdit).toHaveBeenCalledWith(mockTareas[0])
    })

    it('debería llamar onDelete cuando se confirma eliminación', async () => {
      // 🎯 Act
      render(<TareaList {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Tarea de Prueba 1')).toBeInTheDocument()
      })

      const deleteButtons = screen.getAllByText('Eliminar')
      await user.click(deleteButtons[0])

      // Confirmar eliminación
      const confirmButton = screen.getByText('Confirmar')
      await user.click(confirmButton)

      // ✅ Assert
      expect(mockProps.onDelete).toHaveBeenCalledWith('1')
    })

    it('debería llamar onSelect cuando se selecciona una tarea', async () => {
      // 🎯 Act
      render(<TareaList {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Tarea de Prueba 1')).toBeInTheDocument()
      })

      const tareaRow = screen.getByText('Tarea de Prueba 1').closest('tr')
      await user.click(tareaRow!)

      // ✅ Assert
      expect(mockProps.onSelect).toHaveBeenCalledWith(mockTareas[0])
    })
  })

  describe('Paginación', () => {
    it('debería manejar cambio de página', async () => {
      // 📋 Arrange
      const { getTareas } = require('@/lib/services/tareas')
      getTareas.mockResolvedValue({
        data: mockTareas,
        total: 25,
        page: 1,
        limit: 10,
        totalPages: 3,
      })

      // 🎯 Act
      render(<TareaList {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Tarea de Prueba 1')).toBeInTheDocument()
      })

      const nextButton = screen.getByText('Siguiente')
      await user.click(nextButton)

      // ✅ Assert
      await waitFor(() => {
        expect(getTareas).toHaveBeenCalledWith(
          expect.objectContaining({
            page: 2,
          })
        )
      })
    })

    it('debería mostrar información de paginación correcta', async () => {
      // 📋 Arrange
      const { getTareas } = require('@/lib/services/tareas')
      getTareas.mockResolvedValue({
        data: mockTareas,
        total: 25,
        page: 2,
        limit: 10,
        totalPages: 3,
      })

      // 🎯 Act
      render(<TareaList {...mockProps} />)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('Página 2 de 3')).toBeInTheDocument()
        expect(screen.getByText('Mostrando 11-20 de 25 tareas')).toBeInTheDocument()
      })
    })
  })

  describe('Ordenamiento', () => {
    it('debería ordenar por título', async () => {
      // 🎯 Act
      render(<TareaList {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Tarea de Prueba 1')).toBeInTheDocument()
      })

      const tituloHeader = screen.getByText('Título')
      await user.click(tituloHeader)

      // ✅ Assert
      await waitFor(() => {
        const { getTareas } = require('@/lib/services/tareas')
        expect(getTareas).toHaveBeenCalledWith(
          expect.objectContaining({
            sortBy: 'titulo',
            sortOrder: 'asc',
          })
        )
      })
    })

    it('debería cambiar dirección de ordenamiento en segundo clic', async () => {
      // 🎯 Act
      render(<TareaList {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Tarea de Prueba 1')).toBeInTheDocument()
      })

      const tituloHeader = screen.getByText('Título')
      await user.click(tituloHeader) // primer clic - asc
      await user.click(tituloHeader) // segundo clic - desc

      // ✅ Assert
      await waitFor(() => {
        const { getTareas } = require('@/lib/services/tareas')
        expect(getTareas).toHaveBeenLastCalledWith(
          expect.objectContaining({
            sortBy: 'titulo',
            sortOrder: 'desc',
          })
        )
      })
    })
  })

  describe('Estados de error', () => {
    it('debería mostrar mensaje de error cuando falla la carga', async () => {
      // 📋 Arrange
      const { getTareas } = require('@/lib/services/tareas')
      getTareas.mockRejectedValue(new Error('Network error'))

      // 🎯 Act
      render(<TareaList {...mockProps} />)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('Error al cargar las tareas')).toBeInTheDocument()
      })
    })

    it('debería permitir reintentar después de un error', async () => {
      // 📋 Arrange
      const { getTareas } = require('@/lib/services/tareas')
      getTareas.mockRejectedValueOnce(new Error('Network error'))
      getTareas.mockResolvedValue({
        data: mockTareas,
        total: 2,
        page: 1,
        limit: 10,
        totalPages: 1,
      })

      // 🎯 Act
      render(<TareaList {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Error al cargar las tareas')).toBeInTheDocument()
      })

      const retryButton = screen.getByText('Reintentar')
      await user.click(retryButton)

      // ✅ Assert
      await waitFor(() => {
        expect(screen.getByText('Tarea de Prueba 1')).toBeInTheDocument()
      })
    })
  })

  describe('Accesibilidad', () => {
    it('debería tener etiquetas ARIA apropiadas', async () => {
      // 🎯 Act
      render(<TareaList {...mockProps} />)

      // ✅ Assert
      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getByLabelText('Buscar tareas')).toBeInTheDocument()
      expect(screen.getByLabelText('Filtrar por estado')).toBeInTheDocument()
      expect(screen.getByLabelText('Filtrar por prioridad')).toBeInTheDocument()
    })

    it('debería ser navegable por teclado', async () => {
      // 🎯 Act
      render(<TareaList {...mockProps} />)

      await waitFor(() => {
        expect(screen.getByText('Tarea de Prueba 1')).toBeInTheDocument()
      })

      // ✅ Assert
      const searchInput = screen.getByPlaceholderText('Buscar tareas...')
      expect(searchInput).toHaveAttribute('tabIndex', '0')

      const editButtons = screen.getAllByText('Editar')
      editButtons.forEach(button => {
        expect(button).toHaveAttribute('tabIndex', '0')
      })
    })
  })
})