// ===================================================
// 📁 Archivo: ModalCrearCotizacionProveedor.test.tsx
// 📌 Pruebas para el modal de crear cotización de proveedor
// 🧠 Verifica que el selector de proveedores funcione correctamente
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-01-10
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import ModalCrearCotizacionProveedor from '@/components/logistica/ModalCrearCotizacionProveedor'
import { createCotizacionProveedor } from '@/lib/services/cotizacionProveedor'
import type { Proyecto, Proveedor } from '@/types'

// Mock de dependencias
jest.mock('sonner')
jest.mock('@/lib/services/cotizacionProveedor')

const mockToast = {
  error: jest.fn(),
  success: jest.fn(),
}
;(toast as any).error = mockToast.error
;(toast as any).success = mockToast.success

const mockCreateCotizacionProveedor = createCotizacionProveedor as jest.MockedFunction<typeof createCotizacionProveedor>

// Datos de prueba
const mockProyectos: Proyecto[] = [
  {
    id: 'proyecto-1',
    nombre: 'Proyecto Test 1',
    descripcion: 'Descripción del proyecto 1',
    clienteId: 'cliente-1',
    comercialId: 'comercial-1',
    gestorId: 'gestor-1',
    estado: 'activo',
    fechaInicio: new Date('2024-01-01'),
    fechaFin: new Date('2024-12-31'),
    presupuesto: 100000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'proyecto-2',
    nombre: 'Proyecto Test 2',
    descripcion: 'Descripción del proyecto 2',
    clienteId: 'cliente-2',
    comercialId: 'comercial-2',
    gestorId: 'gestor-2',
    estado: 'activo',
    fechaInicio: new Date('2024-01-01'),
    fechaFin: new Date('2024-12-31'),
    presupuesto: 200000,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const mockProveedores: Proveedor[] = [
  {
    id: 'proveedor-1',
    nombre: 'Ferretería Industrial SAC',
    ruc: '20123456789',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'proveedor-2',
    nombre: 'Equipos y Maquinarias EIRL',
    ruc: '20987654321',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'proveedor-3',
    nombre: 'Suministros Técnicos SA',
    ruc: '20555666777',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
]

const defaultProps = {
  open: true,
  onClose: jest.fn(),
  proyectos: mockProyectos,
  proveedores: mockProveedores,
  onCreated: jest.fn(),
}

describe('ModalCrearCotizacionProveedor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should render modal with title and form fields', () => {
    render(<ModalCrearCotizacionProveedor {...defaultProps} />)
    
    expect(screen.getByText('➕ Crear Cotización')).toBeInTheDocument()
    expect(screen.getByText('Proyecto')).toBeInTheDocument()
    expect(screen.getByText('Proveedor')).toBeInTheDocument()
    expect(screen.getByText('Seleccionar proyecto')).toBeInTheDocument()
    expect(screen.getByText('Seleccionar proveedor')).toBeInTheDocument()
  })

  it('should display all proyectos in the selector', async () => {
    render(<ModalCrearCotizacionProveedor {...defaultProps} />)
    
    const proyectoSelect = screen.getByText('Seleccionar proyecto')
    fireEvent.click(proyectoSelect)
    
    await waitFor(() => {
      expect(screen.getByText('Proyecto Test 1')).toBeInTheDocument()
      expect(screen.getByText('Proyecto Test 2')).toBeInTheDocument()
    })
  })

  it('should display all proveedores in the selector', async () => {
    render(<ModalCrearCotizacionProveedor {...defaultProps} />)
    
    const proveedorSelect = screen.getByText('Seleccionar proveedor')
    fireEvent.click(proveedorSelect)
    
    await waitFor(() => {
      expect(screen.getByText('Ferretería Industrial SAC')).toBeInTheDocument()
      expect(screen.getByText('Equipos y Maquinarias EIRL')).toBeInTheDocument()
      expect(screen.getByText('Suministros Técnicos SA')).toBeInTheDocument()
    })
  })

  it('should show error when trying to create without selecting proyecto and proveedor', async () => {
    render(<ModalCrearCotizacionProveedor {...defaultProps} />)
    
    const crearButton = screen.getByText('Crear')
    fireEvent.click(crearButton)
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Selecciona proyecto y proveedor')
    })
  })

  it('should create cotización successfully when all fields are selected', async () => {
    mockCreateCotizacionProveedor.mockResolvedValueOnce({
      id: 'cotizacion-1',
      proveedorId: 'proveedor-1',
      proyectoId: 'proyecto-1',
      codigo: 'COT-2024-001',
      numeroSecuencia: 1,
      estado: 'pendiente',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    render(<ModalCrearCotizacionProveedor {...defaultProps} />)
    
    // Seleccionar proyecto
    const proyectoSelect = screen.getByText('Seleccionar proyecto')
    fireEvent.click(proyectoSelect)
    await waitFor(() => {
      fireEvent.click(screen.getByText('Proyecto Test 1'))
    })
    
    // Seleccionar proveedor
    const proveedorSelect = screen.getByText('Seleccionar proveedor')
    fireEvent.click(proveedorSelect)
    await waitFor(() => {
      fireEvent.click(screen.getByText('Ferretería Industrial SAC'))
    })
    
    // Crear cotización
    const crearButton = screen.getByText('Crear')
    fireEvent.click(crearButton)
    
    await waitFor(() => {
      expect(mockCreateCotizacionProveedor).toHaveBeenCalledWith({
        proyectoId: 'proyecto-1',
        proveedorId: 'proveedor-1',
      })
      expect(mockToast.success).toHaveBeenCalledWith('✅ Cotización creada')
      expect(defaultProps.onClose).toHaveBeenCalled()
      expect(defaultProps.onCreated).toHaveBeenCalled()
    })
  })

  it('should handle creation error', async () => {
    mockCreateCotizacionProveedor.mockRejectedValueOnce(new Error('API Error'))

    render(<ModalCrearCotizacionProveedor {...defaultProps} />)
    
    // Seleccionar proyecto y proveedor
    const proyectoSelect = screen.getByText('Seleccionar proyecto')
    fireEvent.click(proyectoSelect)
    await waitFor(() => {
      fireEvent.click(screen.getByText('Proyecto Test 1'))
    })
    
    const proveedorSelect = screen.getByText('Seleccionar proveedor')
    fireEvent.click(proveedorSelect)
    await waitFor(() => {
      fireEvent.click(screen.getByText('Ferretería Industrial SAC'))
    })
    
    // Intentar crear cotización
    const crearButton = screen.getByText('Crear')
    fireEvent.click(crearButton)
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('❌ Error al crear cotización')
    })
  })

  it('should show empty state when no proveedores are provided', () => {
    render(
      <ModalCrearCotizacionProveedor 
        {...defaultProps} 
        proveedores={[]} 
      />
    )
    
    const proveedorSelect = screen.getByText('Seleccionar proveedor')
    fireEvent.click(proveedorSelect)
    
    // No debería mostrar ningún proveedor
    expect(screen.queryByText('Ferretería Industrial SAC')).not.toBeInTheDocument()
  })

  it('should disable create button when loading', async () => {
    // Mock para simular loading
    mockCreateCotizacionProveedor.mockImplementationOnce(
      () => new Promise(resolve => setTimeout(resolve, 1000))
    )

    render(<ModalCrearCotizacionProveedor {...defaultProps} />)
    
    // Seleccionar proyecto y proveedor
    const proyectoSelect = screen.getByText('Seleccionar proyecto')
    fireEvent.click(proyectoSelect)
    await waitFor(() => {
      fireEvent.click(screen.getByText('Proyecto Test 1'))
    })
    
    const proveedorSelect = screen.getByText('Seleccionar proveedor')
    fireEvent.click(proveedorSelect)
    await waitFor(() => {
      fireEvent.click(screen.getByText('Ferretería Industrial SAC'))
    })
    
    // Hacer clic en crear
    const crearButton = screen.getByText('Crear')
    fireEvent.click(crearButton)
    
    // Verificar que el botón muestra "Creando..." y está deshabilitado
    await waitFor(() => {
      expect(screen.getByText('Creando...')).toBeInTheDocument()
      expect(screen.getByText('Creando...')).toBeDisabled()
    })
  })
})