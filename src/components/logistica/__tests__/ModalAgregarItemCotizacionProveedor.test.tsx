// ===================================================
// 📁 Archivo: ModalAgregarItemCotizacionProveedor.test.tsx
// 📌 Descripción: Tests para el modal de agregar items con scroll optimizado
// 📌 Propósito: Verificar funcionalidad y UX del modal
// ✍️ Autor: Sistema GYS
// 📅 Actualizado: 2025-01-27
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import ModalAgregarItemCotizacionProveedor from '../ModalAgregarItemCotizacionProveedor'
import { getListaPorProyecto } from '@/lib/services/listaPorProyecto'
import { getListaEquipoItemsByLista } from '@/lib/services/listaEquipoItem'
import { createCotizacionProveedorItem } from '@/lib/services/cotizacionProveedorItem'
import type { CotizacionProveedor, ListaEquipo, ListaEquipoItem } from '@/types'

// 🎭 Mocks
jest.mock('sonner')
jest.mock('@/lib/services/listaPorProyecto')
jest.mock('@/lib/services/listaEquipoItem')
jest.mock('@/lib/services/cotizacionProveedorItem')

const mockGetListaPorProyecto = getListaPorProyecto as jest.MockedFunction<typeof getListaPorProyecto>
const mockGetListaEquipoItemsByLista = getListaEquipoItemsByLista as jest.MockedFunction<typeof getListaEquipoItemsByLista>
const mockCreateCotizacionProveedorItem = createCotizacionProveedorItem as jest.MockedFunction<typeof createCotizacionProveedorItem>
const mockToast = toast as jest.Mocked<typeof toast>

// 📋 Mock data
const mockCotizacion: CotizacionProveedor = {
  id: 'cot-1',
  numero: 'COT-001',
  fecha: new Date(),
  estado: 'BORRADOR',
  proveedorId: 'prov-1',
  proveedor: {
    id: 'prov-1',
    nombre: 'Proveedor Test',
    ruc: '12345678901',
    email: 'test@proveedor.com',
    telefono: '123456789',
    direccion: 'Dirección Test',
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  items: [],
  createdAt: new Date(),
  updatedAt: new Date()
}

const mockListas: ListaEquipo[] = [
  {
    id: 'lista-1',
    codigo: 'LST-001',
    nombre: 'Lista Test 1',
    descripcion: 'Descripción lista test',
    proyectoId: 'proyecto-1',
    responsableId: 'user-1',
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'lista-2',
    codigo: 'LST-002',
    nombre: 'Lista Test 2',
    descripcion: 'Descripción lista test 2',
    proyectoId: 'proyecto-1',
    responsableId: 'user-1',
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const mockItems: ListaEquipoItem[] = [
  {
    id: 'item-1',
    codigo: 'ITM-001',
    descripcion: 'Item Test 1',
    unidad: 'UND',
    cantidad: 10,
    listaId: 'lista-1',
    equipoId: 'equipo-1',
    activo: true,
    cotizaciones: [],
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: 'item-2',
    codigo: 'ITM-002',
    descripcion: 'Item Test 2',
    unidad: 'UND',
    cantidad: 5,
    listaId: 'lista-1',
    equipoId: 'equipo-2',
    activo: true,
    cotizaciones: [{ id: 'cot-other', proveedorId: 'prov-other' }],
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const defaultProps = {
  open: true,
  onClose: jest.fn(),
  cotizacion: mockCotizacion,
  proyectoId: 'proyecto-1',
  onAdded: jest.fn()
}

describe('ModalAgregarItemCotizacionProveedor', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetListaPorProyecto.mockResolvedValue(mockListas)
    mockGetListaEquipoItemsByLista.mockResolvedValue(mockItems)
    mockCreateCotizacionProveedorItem.mockResolvedValue({ id: 'new-item' } as any)
  })

  // ✅ Test: Renderizado inicial
  it('should render modal with correct title and provider info', async () => {
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    expect(screen.getByText('Agregar Ítems a Cotización')).toBeInTheDocument()
    expect(screen.getByText('Proveedor Test')).toBeInTheDocument()
    
    await waitFor(() => {
      expect(mockGetListaPorProyecto).toHaveBeenCalledWith('proyecto-1')
    })
  })

  // ✅ Test: Carga de listas
  it('should load and display lists correctly', async () => {
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('LST-001 - Lista Test 1')).toBeInTheDocument()
      expect(screen.getByText('LST-002 - Lista Test 2')).toBeInTheDocument()
    })
  })

  // ✅ Test: Auto-selección de lista única
  it('should auto-select list when only one exists', async () => {
    mockGetListaPorProyecto.mockResolvedValue([mockListas[0]])
    
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    await waitFor(() => {
      expect(mockGetListaEquipoItemsByLista).toHaveBeenCalledWith('lista-1')
    })
  })

  // ✅ Test: Carga de items y estados visuales
  it('should load items and show correct visual states', async () => {
    mockGetListaPorProyecto.mockResolvedValue([mockListas[0]])
    
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Item Test 1')).toBeInTheDocument()
      expect(screen.getByText('Item Test 2')).toBeInTheDocument()
      expect(screen.getByText('Sin cotización')).toBeInTheDocument()
      expect(screen.getByText('Con cotización')).toBeInTheDocument()
    })
  })

  // ✅ Test: Estadísticas
  it('should display correct statistics', async () => {
    mockGetListaPorProyecto.mockResolvedValue([mockListas[0]])
    
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument() // Total items
      expect(screen.getByText('1')).toBeInTheDocument() // Con cotización
      expect(screen.getByText('1')).toBeInTheDocument() // Sin cotización
    })
  })

  // ✅ Test: Búsqueda de items
  it('should filter items by search term', async () => {
    mockGetListaPorProyecto.mockResolvedValue([mockListas[0]])
    
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Item Test 1')).toBeInTheDocument()
    })

    const searchInput = screen.getByPlaceholderText('Buscar por descripción o código...')
    fireEvent.change(searchInput, { target: { value: 'Test 1' } })

    expect(screen.getByText('Item Test 1')).toBeInTheDocument()
    expect(screen.queryByText('Item Test 2')).not.toBeInTheDocument()
  })

  // ✅ Test: Selección de items
  it('should allow selecting items', async () => {
    mockGetListaPorProyecto.mockResolvedValue([mockListas[0]])
    
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Item Test 1')).toBeInTheDocument()
    })

    const checkbox = screen.getAllByRole('checkbox')[0]
    fireEvent.click(checkbox)

    await waitFor(() => {
      expect(screen.getByText('Ítems Seleccionados (1)')).toBeInTheDocument()
      expect(screen.getByText('Agregar (1)')).toBeInTheDocument()
    })
  })

  // ✅ Test: Agregar items
  it('should add selected items successfully', async () => {
    mockGetListaPorProyecto.mockResolvedValue([mockListas[0]])
    
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Item Test 1')).toBeInTheDocument()
    })

    // Seleccionar item
    const checkbox = screen.getAllByRole('checkbox')[0]
    fireEvent.click(checkbox)

    // Hacer clic en agregar
    const addButton = screen.getByText('Agregar (1)')
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(mockCreateCotizacionProveedorItem).toHaveBeenCalledWith({
        cotizacionId: 'cot-1',
        listaId: 'lista-1',
        listaEquipoItemId: 'item-1'
      })
      expect(mockToast.success).toHaveBeenCalledWith('✅ Ítems agregados correctamente')
      expect(defaultProps.onAdded).toHaveBeenCalled()
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  // ✅ Test: Manejo de errores
  it('should handle errors when adding items', async () => {
    mockGetListaPorProyecto.mockResolvedValue([mockListas[0]])
    mockCreateCotizacionProveedorItem.mockRejectedValue(new Error('Error test'))
    
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    await waitFor(() => {
      expect(screen.getByText('Item Test 1')).toBeInTheDocument()
    })

    // Seleccionar item
    const checkbox = screen.getAllByRole('checkbox')[0]
    fireEvent.click(checkbox)

    // Hacer clic en agregar
    const addButton = screen.getByText('Agregar (1)')
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('❌ Error al agregar ítems')
    })
  })

  // ✅ Test: Estados de carga
  it('should show loading states correctly', async () => {
    mockGetListaPorProyecto.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve(mockListas), 100)))
    
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    // Verificar que no hay contenido mientras carga
    expect(screen.queryByText('LST-001')).not.toBeInTheDocument()
    
    await waitFor(() => {
      expect(screen.getByText('LST-001 - Lista Test 1')).toBeInTheDocument()
    })
  })

  // ✅ Test: Scroll y estructura del modal
  it('should have proper scroll structure', async () => {
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    // Verificar que el modal tiene la estructura correcta para scroll
    const dialogContent = document.querySelector('[role="dialog"]')
    expect(dialogContent).toHaveClass('h-[90vh]', 'flex', 'flex-col')
    
    // Verificar que hay áreas de scroll apropiadas
    const scrollAreas = document.querySelectorAll('[data-radix-scroll-area-viewport]')
    expect(scrollAreas.length).toBeGreaterThan(0)
  })

  // ✅ Test: Cerrar modal
  it('should close modal when clicking cancel', () => {
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    const cancelButton = screen.getByText('Cancelar')
    fireEvent.click(cancelButton)
    
    expect(defaultProps.onClose).toHaveBeenCalled()
  })
})
