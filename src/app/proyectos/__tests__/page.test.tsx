// ===================================================
// 📁 Archivo: page.test.tsx
// 📌 Descripción: Tests para la página mejorada de proyectos
// 📌 Características: Tests para filtros, búsqueda, vistas y funcionalidades
// ✍️ Autor: Sistema de IA
// 📅 Creado: 2025-01-27
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import ProyectosPage from '../page'
import { getProyectos, createProyecto, deleteProyecto } from '@/lib/services/proyecto'
import { toast } from 'sonner'

// Mock dependencies
jest.mock('next-auth/react')
jest.mock('next/navigation')
jest.mock('@/lib/services/proyecto')
jest.mock('sonner')

const mockUseSession = useSession as jest.MockedFunction<typeof useSession>
const mockUseRouter = useRouter as jest.MockedFunction<typeof useRouter>
const mockGetProyectos = getProyectos as jest.MockedFunction<typeof getProyectos>
const mockCreateProyecto = createProyecto as jest.MockedFunction<typeof createProyecto>
const mockDeleteProyecto = deleteProyecto as jest.MockedFunction<typeof deleteProyecto>
const mockToast = toast as jest.Mocked<typeof toast>

const mockRouter = {
  push: jest.fn(),
  replace: jest.fn(),
  back: jest.fn(),
  forward: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
}

const mockProyectos = [
  {
    id: '1',
    codigo: 'PROJ-001',
    nombre: 'Proyecto Alpha',
    estado: 'activo',
    totalCliente: 50000,
    fechaInicio: '2024-01-15T00:00:00.000Z',
    cliente: { nombre: 'Cliente A' },
    comercial: { name: 'Juan Pérez' },
    clienteId: 'client1',
    comercialId: 'comercial1',
    gestorId: 'gestor1',
    totalInterno: 45000,
    totalEquiposInterno: 30000,
    totalServiciosInterno: 15000,
    totalGastosInterno: 0,
    descuento: 0,
    grandTotal: 50000,
  },
  {
    id: '2',
    codigo: 'PROJ-002',
    nombre: 'Proyecto Beta',
    estado: 'completado',
    totalCliente: 75000,
    fechaInicio: '2024-02-01T00:00:00.000Z',
    cliente: { nombre: 'Cliente B' },
    comercial: { name: 'María García' },
    clienteId: 'client2',
    comercialId: 'comercial2',
    gestorId: 'gestor2',
    totalInterno: 70000,
    totalEquiposInterno: 50000,
    totalServiciosInterno: 20000,
    totalGastosInterno: 0,
    descuento: 0,
    grandTotal: 75000,
  },
  {
    id: '3',
    codigo: 'PROJ-003',
    nombre: 'Proyecto Gamma',
    estado: 'pausado',
    totalCliente: 30000,
    fechaInicio: '2024-03-01T00:00:00.000Z',
    cliente: { nombre: 'Cliente C' },
    comercial: { name: 'Carlos López' },
    clienteId: 'client3',
    comercialId: 'comercial3',
    gestorId: 'gestor3',
    totalInterno: 28000,
    totalEquiposInterno: 20000,
    totalServiciosInterno: 8000,
    totalGastosInterno: 0,
    descuento: 0,
    grandTotal: 30000,
  },
]

describe('ProyectosPage', () => {
  beforeEach(() => {
    mockUseRouter.mockReturnValue(mockRouter)
    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user1',
          name: 'Test User',
          email: 'test@example.com',
          role: 'admin',
        },
      },
      status: 'authenticated',
    })
    mockGetProyectos.mockResolvedValue(mockProyectos)
    mockToast.success = jest.fn()
    mockToast.error = jest.fn()
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering and Initial State', () => {
    it('should render the page with header and statistics', async () => {
      render(<ProyectosPage />)
      
      expect(screen.getByText('Gestión de Proyectos')).toBeInTheDocument()
      expect(screen.getByText('Administra y supervisa todos los proyectos de la empresa')).toBeInTheDocument()
      
      await waitFor(() => {
        expect(screen.getByText('3')).toBeInTheDocument() // Total projects
        expect(screen.getByText('1')).toBeInTheDocument() // Active projects
        expect(screen.getByText('$ 155,000')).toBeInTheDocument() // Total value
      })
    })

    it('should load and display projects in cards view by default', async () => {
      render(<ProyectosPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Proyecto Alpha')).toBeInTheDocument()
        expect(screen.getByText('Proyecto Beta')).toBeInTheDocument()
        expect(screen.getByText('Proyecto Gamma')).toBeInTheDocument()
      })
    })

    it('should show empty state when no projects exist', async () => {
      mockGetProyectos.mockResolvedValue([])
      render(<ProyectosPage />)
      
      await waitFor(() => {
        expect(screen.getByText('No hay proyectos registrados')).toBeInTheDocument()
        expect(screen.getByText('Comienza creando tu primer proyecto')).toBeInTheDocument()
      })
    })
  })

  describe('Search and Filtering', () => {
    it('should filter projects by search term', async () => {
      render(<ProyectosPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Proyecto Alpha')).toBeInTheDocument()
      })
      
      const searchInput = screen.getByPlaceholderText('Buscar proyectos, códigos o clientes...')
      fireEvent.change(searchInput, { target: { value: 'Alpha' } })
      
      await waitFor(() => {
        expect(screen.getByText('Proyecto Alpha')).toBeInTheDocument()
        expect(screen.queryByText('Proyecto Beta')).not.toBeInTheDocument()
        expect(screen.queryByText('Proyecto Gamma')).not.toBeInTheDocument()
      })
    })

    it('should filter projects by status', async () => {
      render(<ProyectosPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Proyecto Alpha')).toBeInTheDocument()
      })
      
      // Open status filter
      const statusFilter = screen.getAllByRole('combobox')[0]
      fireEvent.click(statusFilter)
      
      // Select 'completado'
      const completedOption = screen.getByText('Completados')
      fireEvent.click(completedOption)
      
      await waitFor(() => {
        expect(screen.queryByText('Proyecto Alpha')).not.toBeInTheDocument()
        expect(screen.getByText('Proyecto Beta')).toBeInTheDocument()
        expect(screen.queryByText('Proyecto Gamma')).not.toBeInTheDocument()
      })
    })

    it('should show no results message when search yields no matches', async () => {
      render(<ProyectosPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Proyecto Alpha')).toBeInTheDocument()
      })
      
      const searchInput = screen.getByPlaceholderText('Buscar proyectos, códigos o clientes...')
      fireEvent.change(searchInput, { target: { value: 'NonExistent' } })
      
      await waitFor(() => {
        expect(screen.getByText('No se encontraron proyectos')).toBeInTheDocument()
        expect(screen.getByText('Intenta ajustar los filtros de búsqueda')).toBeInTheDocument()
      })
    })
  })

  describe('Sorting', () => {
    it('should sort projects by name', async () => {
      render(<ProyectosPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Proyecto Alpha')).toBeInTheDocument()
      })
      
      // Open sort dropdown
      const sortDropdown = screen.getAllByRole('combobox')[1]
      fireEvent.click(sortDropdown)
      
      // Select 'Por Nombre'
      const nameOption = screen.getByText('Por Nombre')
      fireEvent.click(nameOption)
      
      await waitFor(() => {
        const projectCards = screen.getAllByText(/Proyecto/)
        expect(projectCards[0]).toHaveTextContent('Proyecto Alpha')
        expect(projectCards[1]).toHaveTextContent('Proyecto Beta')
        expect(projectCards[2]).toHaveTextContent('Proyecto Gamma')
      })
    })

    it('should sort projects by total value', async () => {
      render(<ProyectosPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Proyecto Alpha')).toBeInTheDocument()
      })
      
      // Open sort dropdown
      const sortDropdown = screen.getAllByRole('combobox')[1]
      fireEvent.click(sortDropdown)
      
      // Select 'Por Valor'
      const valueOption = screen.getByText('Por Valor')
      fireEvent.click(valueOption)
      
      await waitFor(() => {
        const projectCards = screen.getAllByText(/Proyecto/)
        expect(projectCards[0]).toHaveTextContent('Proyecto Beta') // Highest value
      })
    })
  })

  describe('View Modes', () => {
    it('should switch between cards and table view', async () => {
      render(<ProyectosPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Proyecto Alpha')).toBeInTheDocument()
      })
      
      // Switch to table view
      const tableButton = screen.getByText('Tabla')
      fireEvent.click(tableButton)
      
      await waitFor(() => {
        expect(screen.getByText('Código')).toBeInTheDocument()
        expect(screen.getByText('PROJ-001')).toBeInTheDocument()
      })
      
      // Switch back to cards view
      const cardsButton = screen.getByText('Cards')
      fireEvent.click(cardsButton)
      
      await waitFor(() => {
        expect(screen.queryByText('Código')).not.toBeInTheDocument()
        expect(screen.getByText('Proyecto Alpha')).toBeInTheDocument()
      })
    })
  })

  describe('Project Creation', () => {
    it('should show create form when clicking new project button', async () => {
      render(<ProyectosPage />)
      
      const newProjectButton = screen.getByText('Nuevo Proyecto')
      fireEvent.click(newProjectButton)
      
      await waitFor(() => {
        expect(screen.getByText('Crear Nuevo Proyecto')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Ingresa el nombre del proyecto')).toBeInTheDocument()
        expect(screen.getByPlaceholderText('Código único del proyecto')).toBeInTheDocument()
      })
    })

    it('should create a new project successfully', async () => {
      const newProject = {
        id: '4',
        codigo: 'PROJ-004',
        nombre: 'Nuevo Proyecto',
        estado: 'activo',
        totalCliente: 0,
        fechaInicio: new Date().toISOString(),
        cliente: null,
        comercial: null,
        clienteId: '',
        comercialId: '',
        gestorId: '',
        totalInterno: 0,
        totalEquiposInterno: 0,
        totalServiciosInterno: 0,
        totalGastosInterno: 0,
        descuento: 0,
        grandTotal: 0,
      }
      
      mockCreateProyecto.mockResolvedValue(newProject)
      
      render(<ProyectosPage />)
      
      // Open create form
      const newProjectButton = screen.getByText('Nuevo Proyecto')
      fireEvent.click(newProjectButton)
      
      await waitFor(() => {
        expect(screen.getByText('Crear Nuevo Proyecto')).toBeInTheDocument()
      })
      
      // Fill form
      const nameInput = screen.getByPlaceholderText('Ingresa el nombre del proyecto')
      const codeInput = screen.getByPlaceholderText('Código único del proyecto')
      
      fireEvent.change(nameInput, { target: { value: 'Nuevo Proyecto' } })
      fireEvent.change(codeInput, { target: { value: 'PROJ-004' } })
      
      // Submit form
      const createButton = screen.getByText('Crear Proyecto')
      fireEvent.click(createButton)
      
      await waitFor(() => {
        expect(mockCreateProyecto).toHaveBeenCalledWith({
          clienteId: '',
          comercialId: '',
          gestorId: '',
          nombre: 'Nuevo Proyecto',
          codigo: 'PROJ-004',
          totalCliente: 0,
          totalInterno: 0,
          totalEquiposInterno: 0,
          totalServiciosInterno: 0,
          totalGastosInterno: 0,
          descuento: 0,
          grandTotal: 0,
          estado: 'activo',
          fechaInicio: expect.any(String),
        })
        expect(mockToast.success).toHaveBeenCalledWith('✅ Proyecto creado exitosamente')
      })
    })

    it('should show validation error for empty fields', async () => {
      render(<ProyectosPage />)
      
      // Open create form
      const newProjectButton = screen.getByText('Nuevo Proyecto')
      fireEvent.click(newProjectButton)
      
      await waitFor(() => {
        expect(screen.getByText('Crear Nuevo Proyecto')).toBeInTheDocument()
      })
      
      // Submit form without filling fields
      const createButton = screen.getByText('Crear Proyecto')
      fireEvent.click(createButton)
      
      await waitFor(() => {
        expect(screen.getByText('Todos los campos son obligatorios.')).toBeInTheDocument()
      })
    })
  })

  describe('Project Actions', () => {
    it('should navigate to project details when clicking view button', async () => {
      render(<ProyectosPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Proyecto Alpha')).toBeInTheDocument()
      })
      
      const viewButtons = screen.getAllByText('Ver Detalles')
      fireEvent.click(viewButtons[0])
      
      expect(mockRouter.push).toHaveBeenCalledWith('/proyectos/1')
    })

    it('should show delete confirmation dialog', async () => {
      render(<ProyectosPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Proyecto Alpha')).toBeInTheDocument()
      })
      
      // Find and click delete button (trash icon)
      const deleteButtons = screen.getAllByRole('button')
      const deleteButton = deleteButtons.find(button => 
        button.querySelector('svg') && 
        button.querySelector('svg')?.getAttribute('data-testid') === 'trash-2'
      )
      
      if (deleteButton) {
        fireEvent.click(deleteButton)
        
        await waitFor(() => {
          expect(screen.getByText('Eliminar Proyecto')).toBeInTheDocument()
          expect(screen.getByText(/¿Estás seguro de que deseas eliminar el proyecto/)).toBeInTheDocument()
        })
      }
    })

    it('should delete project when confirmed', async () => {
      mockDeleteProyecto.mockResolvedValue(undefined)
      
      render(<ProyectosPage />)
      
      await waitFor(() => {
        expect(screen.getByText('Proyecto Alpha')).toBeInTheDocument()
      })
      
      // Find and click delete button
      const deleteButtons = screen.getAllByRole('button')
      const deleteButton = deleteButtons.find(button => 
        button.querySelector('svg')
      )
      
      if (deleteButton) {
        fireEvent.click(deleteButton)
        
        await waitFor(() => {
          expect(screen.getByText('Eliminar Proyecto')).toBeInTheDocument()
        })
        
        // Confirm deletion
        const confirmButton = screen.getByText('Eliminar')
        fireEvent.click(confirmButton)
        
        await waitFor(() => {
          expect(mockDeleteProyecto).toHaveBeenCalledWith('1')
          expect(mockToast.success).toHaveBeenCalledWith('🗑️ Proyecto eliminado correctamente')
        })
      }
    })
  })

  describe('Badge Variants', () => {
    it('should display correct badge variants for different states', async () => {
      render(<ProyectosPage />)
      
      await waitFor(() => {
        const activeBadge = screen.getByText('activo')
        const completedBadge = screen.getByText('completado')
        const pausedBadge = screen.getByText('pausado')
        
        expect(activeBadge).toBeInTheDocument()
        expect(completedBadge).toBeInTheDocument()
        expect(pausedBadge).toBeInTheDocument()
      })
    })
  })

  describe('Access Control', () => {
    it('should redirect unauthorized users', () => {
      mockUseSession.mockReturnValue({
        data: {
          user: {
            id: 'user1',
            name: 'Test User',
            email: 'test@example.com',
            role: 'unauthorized',
          },
        },
        status: 'authenticated',
      })
      
      render(<ProyectosPage />)
      
      expect(mockRouter.replace).toHaveBeenCalledWith('/denied')
    })
  })
})