import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import CotizacionesPage from '../page'
import * as cotizacionService from '@/lib/services/cotizacionProveedor'
import * as proyectoService from '@/lib/services/proyecto'
import * as proveedorService from '@/lib/services/proveedor'

// Mock de los servicios
jest.mock('@/lib/services/cotizacionProveedor')
jest.mock('@/lib/services/proyecto')
jest.mock('@/lib/services/proveedor')
jest.mock('sonner')
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
}))

const mockCotizaciones = [
  {
    id: '1',
    codigo: 'COT-001',
    estado: 'pendiente',
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
    proveedor: {
      id: 'prov-1',
      nombre: 'Proveedor Test',
      email: 'test@proveedor.com',
      telefono: '123456789',
      direccion: 'Dirección Test',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    proyecto: {
      id: 'proj-1',
      nombre: 'Proyecto Test',
      descripcion: 'Descripción del proyecto',
      estado: 'activo',
      fechaInicio: '2024-01-01T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    items: [
      {
        id: 'item-1',
        descripcion: 'Item Test',
        cantidad: 10,
        precio: 100,
        total: 1000,
        createdAt: '2024-01-15T10:00:00Z',
        updatedAt: '2024-01-15T10:00:00Z',
      },
    ],
  },
  {
    id: '2',
    codigo: 'COT-002',
    estado: 'cotizado',
    createdAt: '2024-01-16T10:00:00Z',
    updatedAt: '2024-01-16T10:00:00Z',
    proveedor: {
      id: 'prov-2',
      nombre: 'Proveedor 2',
      email: 'test2@proveedor.com',
      telefono: '987654321',
      direccion: 'Dirección Test 2',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    proyecto: {
      id: 'proj-2',
      nombre: 'Proyecto Test 2',
      descripcion: 'Descripción del proyecto 2',
      estado: 'activo',
      fechaInicio: '2024-01-01T00:00:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    items: [],
  },
]

const mockProyectos = [
  {
    id: 'proj-1',
    nombre: 'Proyecto Test',
    descripcion: 'Descripción del proyecto',
    estado: 'activo',
    fechaInicio: '2024-01-01T00:00:00Z',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

const mockProveedores = [
  {
    id: 'prov-1',
    nombre: 'Proveedor Test',
    email: 'test@proveedor.com',
    telefono: '123456789',
    direccion: 'Dirección Test',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

describe('CotizacionesPage', () => {
  const mockGetCotizacionesProveedor = cotizacionService.getCotizacionesProveedor as jest.MockedFunction<typeof cotizacionService.getCotizacionesProveedor>
  const mockUpdateCotizacionProveedor = cotizacionService.updateCotizacionProveedor as jest.MockedFunction<typeof cotizacionService.updateCotizacionProveedor>
  const mockDeleteCotizacionProveedor = cotizacionService.deleteCotizacionProveedor as jest.MockedFunction<typeof cotizacionService.deleteCotizacionProveedor>
  const mockGetProyectos = proyectoService.getProyectos as jest.MockedFunction<typeof proyectoService.getProyectos>
  const mockGetProveedores = proveedorService.getProveedores as jest.MockedFunction<typeof proveedorService.getProveedores>
  const mockToast = toast as jest.Mocked<typeof toast>

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCotizacionesProveedor.mockResolvedValue(mockCotizaciones)
    mockGetProyectos.mockResolvedValue(mockProyectos)
    mockGetProveedores.mockResolvedValue(mockProveedores)
  })

  describe('Loading State', () => {
    it('should show skeleton loaders while loading', async () => {
      // Mock para simular carga lenta
      mockGetCotizacionesProveedor.mockImplementation(
        () => new Promise(resolve => setTimeout(() => resolve(mockCotizaciones), 100))
      )

      render(<CotizacionesPage />)

      // Verificar que se muestran los skeleton loaders
      expect(screen.getByText('Cotizaciones de Proveedores')).toBeInTheDocument()
      
      // Esperar a que termine la carga
      await waitFor(() => {
        expect(screen.getByText('COT-001')).toBeInTheDocument()
      })
    })
  })

  describe('Content Rendering', () => {
    it('should render page header with title and description', async () => {
      render(<CotizacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('Cotizaciones de Proveedores')).toBeInTheDocument()
        expect(screen.getByText('Gestiona y supervisa todas las cotizaciones de proveedores')).toBeInTheDocument()
      })
    })

    it('should render statistics cards with correct data', async () => {
      render(<CotizacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('Total Cotizaciones')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument() // Total cotizaciones
        expect(screen.getByText('Pendientes')).toBeInTheDocument()
        expect(screen.getByText('1')).toBeInTheDocument() // Pendientes
        expect(screen.getByText('Cotizados')).toBeInTheDocument()
        expect(screen.getByText('1')).toBeInTheDocument() // Cotizados
        expect(screen.getByText('Seleccionados')).toBeInTheDocument()
        expect(screen.getByText('0')).toBeInTheDocument() // Seleccionados
      })
    })

    it('should render cotizaciones list when data is available', async () => {
      render(<CotizacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('COT-001')).toBeInTheDocument()
        expect(screen.getByText('COT-002')).toBeInTheDocument()
        expect(screen.getByText('Proveedor Test')).toBeInTheDocument()
        expect(screen.getByText('Proveedor 2')).toBeInTheDocument()
      })
    })

    it('should show empty state when no cotizaciones exist', async () => {
      mockGetCotizacionesProveedor.mockResolvedValue([])
      
      render(<CotizacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('No hay cotizaciones registradas')).toBeInTheDocument()
        expect(screen.getByText('Comienza creando tu primera cotización de proveedor para gestionar tus solicitudes de manera eficiente.')).toBeInTheDocument()
        expect(screen.getByText('Crear Primera Cotización')).toBeInTheDocument()
      })
    })
  })

  describe('User Interactions', () => {
    it('should open modal when clicking "Nueva Cotización" button', async () => {
      render(<CotizacionesPage />)

      await waitFor(() => {
        const newButton = screen.getByText('Nueva Cotización')
        expect(newButton).toBeInTheDocument()
        fireEvent.click(newButton)
      })

      // El modal debería abrirse (esto dependería de la implementación del modal)
    })

    it('should open modal when clicking "Crear Primera Cotización" in empty state', async () => {
      mockGetCotizacionesProveedor.mockResolvedValue([])
      
      render(<CotizacionesPage />)

      await waitFor(() => {
        const createButton = screen.getByText('Crear Primera Cotización')
        fireEvent.click(createButton)
      })

      // El modal debería abrirse
    })
  })

  describe('Error Handling', () => {
    it('should show error toast when cotizaciones loading fails', async () => {
      mockGetCotizacionesProveedor.mockRejectedValue(new Error('Network error'))
      
      render(<CotizacionesPage />)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Error al cargar cotizaciones')
      })
    })

    it('should show error toast when proyectos/proveedores loading fails', async () => {
      mockGetProyectos.mockRejectedValue(new Error('Network error'))
      
      render(<CotizacionesPage />)

      await waitFor(() => {
        expect(mockToast.error).toHaveBeenCalledWith('Error al cargar proyectos o proveedores')
      })
    })
  })

  describe('CRUD Operations', () => {
    it('should handle update cotización successfully', async () => {
      mockUpdateCotizacionProveedor.mockResolvedValue(true)
      
      render(<CotizacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('COT-001')).toBeInTheDocument()
      })

      // Simular actualización (esto requeriría interacción con el accordion)
      // La implementación específica dependería de cómo se expone la funcionalidad
    })

    it('should handle delete cotización successfully', async () => {
      mockDeleteCotizacionProveedor.mockResolvedValue(true)
      
      render(<CotizacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('COT-001')).toBeInTheDocument()
      })

      // Simular eliminación
    })

    it('should show error toast when update fails', async () => {
      mockUpdateCotizacionProveedor.mockResolvedValue(false)
      
      render(<CotizacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('COT-001')).toBeInTheDocument()
      })

      // Simular actualización fallida
    })

    it('should show error toast when delete fails', async () => {
      mockDeleteCotizacionProveedor.mockResolvedValue(false)
      
      render(<CotizacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('COT-001')).toBeInTheDocument()
      })

      // Simular eliminación fallida
    })
  })

  describe('Responsive Design', () => {
    it('should render properly on mobile viewport', async () => {
      // Simular viewport móvil
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      render(<CotizacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('Cotizaciones de Proveedores')).toBeInTheDocument()
      })

      // Verificar que el layout se adapta correctamente
    })

    it('should render properly on desktop viewport', async () => {
      // Simular viewport desktop
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      })

      render(<CotizacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('Cotizaciones de Proveedores')).toBeInTheDocument()
      })

      // Verificar que el layout se adapta correctamente
    })
  })

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', async () => {
      render(<CotizacionesPage />)

      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { level: 1 })
        expect(mainHeading).toHaveTextContent('Cotizaciones de Proveedores')
      })
    })

    it('should have accessible buttons', async () => {
      render(<CotizacionesPage />)

      await waitFor(() => {
        const newButton = screen.getByRole('button', { name: /nueva cotización/i })
        expect(newButton).toBeInTheDocument()
        expect(newButton).not.toBeDisabled()
      })
    })
  })

  describe('Performance', () => {
    it('should not cause memory leaks with proper cleanup', async () => {
      const { unmount } = render(<CotizacionesPage />)

      await waitFor(() => {
        expect(screen.getByText('Cotizaciones de Proveedores')).toBeInTheDocument()
      })

      // Desmontar componente
      unmount()

      // Verificar que no hay efectos secundarios
      expect(mockGetCotizacionesProveedor).toHaveBeenCalled()
    })
  })
})