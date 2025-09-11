// ===================================================
// 📁 Archivo: ModalAgregarItemCotizacionProveedor.test.tsx
// 📌 Descripción: Tests para el modal mejorado de agregar items
// 📌 Propósito: Verificar funcionalidad UX/UI y diferenciación visual
// ✍️ Autor: Sistema GYS
// 📅 Actualizado: 2025-01-27
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import ModalAgregarItemCotizacionProveedor from '@/components/logistica/ModalAgregarItemCotizacionProveedor'
import { getListaPorProyecto } from '@/lib/services/listaPorProyecto'
import { getListaEquipoItemsByLista } from '@/lib/services/listaEquipoItem'
import { createCotizacionProveedorItem } from '@/lib/services/cotizacionProveedorItem'

// 🎭 Mocks
jest.mock('sonner')
jest.mock('@/lib/services/listaPorProyecto')
jest.mock('@/lib/services/listaEquipoItem')
jest.mock('@/lib/services/cotizacionProveedorItem')
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

const mockGetListaPorProyecto = getListaPorProyecto as jest.MockedFunction<typeof getListaPorProyecto>
const mockGetListaEquipoItemsByLista = getListaEquipoItemsByLista as jest.MockedFunction<typeof getListaEquipoItemsByLista>
const mockCreateCotizacionProveedorItem = createCotizacionProveedorItem as jest.MockedFunction<typeof createCotizacionProveedorItem>
const mockToast = toast as jest.Mocked<typeof toast>

// 🧪 Data de prueba
const mockCotizacion = {
  id: 'cot-1',
  numero: 'COT-001',
  proveedor: {
    id: 'prov-1',
    nombre: 'Proveedor Test',
    ruc: '12345678901'
  },
  items: [
    {
      id: 'item-1',
      listaEquipoItemId: 'lei-1',
      cantidad: 5,
      precioUnitario: 100
    }
  ]
}

const mockListas = [
  {
    id: 'lista-1',
    codigo: 'LST-001',
    nombre: 'Lista Test 1'
  },
  {
    id: 'lista-2',
    codigo: 'LST-002',
    nombre: 'Lista Test 2'
  }
]

const mockItems = [
  {
    id: 'lei-1',
    codigo: 'ITEM-001',
    descripcion: 'Item ya agregado',
    unidad: 'UND',
    cantidad: 10,
    cotizaciones: [] // Sin cotizaciones
  },
  {
    id: 'lei-2',
    codigo: 'ITEM-002',
    descripcion: 'Item con cotización',
    unidad: 'UND',
    cantidad: 5,
    cotizaciones: [
      {
        id: 'cp-1',
        proveedorId: 'prov-2',
        precioUnitario: 150,
        estado: 'cotizado'
      }
    ]
  },
  {
    id: 'lei-3',
    codigo: 'ITEM-003',
    descripcion: 'Item sin cotización',
    unidad: 'KG',
    cantidad: 2,
    cotizaciones: [] // Sin cotizaciones
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
    mockCreateCotizacionProveedorItem.mockResolvedValue({ success: true })
  })

  // ✅ Test 1: Renderizado básico y header mejorado
  it('should render modal with improved header and provider info', async () => {
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    expect(screen.getByText('Agregar Ítems a Cotización')).toBeInTheDocument()
    expect(screen.getByText('Proveedor Test')).toBeInTheDocument()
    
    // Verificar que se muestran las estadísticas
    await waitFor(() => {
      expect(screen.getByText('Total Items')).toBeInTheDocument()
      expect(screen.getByText('Con Cotización')).toBeInTheDocument()
      expect(screen.getByText('Sin Cotización')).toBeInTheDocument()
    })
  })

  // ✅ Test 2: Carga de listas y auto-selección
  it('should load lists and auto-select when only one list exists', async () => {
    const singleListMock = [mockListas[0]]
    mockGetListaPorProyecto.mockResolvedValue(singleListMock)
    
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    await waitFor(() => {
      expect(mockGetListaPorProyecto).toHaveBeenCalledWith('proyecto-1')
      expect(mockGetListaEquipoItemsByLista).toHaveBeenCalledWith('lista-1')
    })
  })

  // ✅ Test 3: Estadísticas correctas
  it('should display correct statistics', async () => {
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    // Seleccionar lista para cargar items
    const selectTrigger = screen.getByRole('combobox')
    fireEvent.click(selectTrigger)
    
    const listaOption = await screen.findByText('LST-001 - Lista Test 1')
    fireEvent.click(listaOption)
    
    await waitFor(() => {
      // Total items: 3
      expect(screen.getByText('3')).toBeInTheDocument()
      // Con cotización: 1 (lei-2)
      expect(screen.getByText('1')).toBeInTheDocument()
      // Sin cotización: 2 (lei-1, lei-3)
      expect(screen.getByText('2')).toBeInTheDocument()
      // Ya agregados: 1 (lei-1)
      expect(screen.getByText('1')).toBeInTheDocument()
    })
  })

  // ✅ Test 4: Diferenciación visual por estado
  it('should apply correct visual styles based on item status', async () => {
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    // Seleccionar lista
    const selectTrigger = screen.getByRole('combobox')
    fireEvent.click(selectTrigger)
    const listaOption = await screen.findByText('LST-001 - Lista Test 1')
    fireEvent.click(listaOption)
    
    await waitFor(() => {
      // Verificar badges de estado
      expect(screen.getByText('Ya agregado')).toBeInTheDocument()
      expect(screen.getByText('Con cotización')).toBeInTheDocument()
      expect(screen.getAllByText('Sin cotización')).toHaveLength(2)
    })
  })

  // ✅ Test 5: Funcionalidad de búsqueda
  it('should filter items by search term', async () => {
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    // Seleccionar lista
    const selectTrigger = screen.getByRole('combobox')
    fireEvent.click(selectTrigger)
    const listaOption = await screen.findByText('LST-001 - Lista Test 1')
    fireEvent.click(listaOption)
    
    await waitFor(() => {
      expect(screen.getByText('Item con cotización')).toBeInTheDocument()
    })
    
    // Buscar por descripción
    const searchInput = screen.getByPlaceholderText('Buscar por descripción o código...')
    fireEvent.change(searchInput, { target: { value: 'con cotización' } })
    
    await waitFor(() => {
      expect(screen.getByText('Item con cotización')).toBeInTheDocument()
      expect(screen.queryByText('Item sin cotización')).not.toBeInTheDocument()
    })
  })

  // ✅ Test 6: Selección de items
  it('should allow selecting items and show selection summary', async () => {
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    // Seleccionar lista
    const selectTrigger = screen.getByRole('combobox')
    fireEvent.click(selectTrigger)
    const listaOption = await screen.findByText('LST-001 - Lista Test 1')
    fireEvent.click(listaOption)
    
    await waitFor(() => {
      expect(screen.getByText('Item con cotización')).toBeInTheDocument()
    })
    
    // Seleccionar un item (no el ya agregado)
    const checkboxes = screen.getAllByRole('checkbox')
    const availableCheckbox = checkboxes.find(cb => !cb.hasAttribute('disabled'))
    
    if (availableCheckbox) {
      fireEvent.click(availableCheckbox)
      
      await waitFor(() => {
        expect(screen.getByText(/Ítems Seleccionados \(1\)/)).toBeInTheDocument()
        expect(screen.getByText(/Agregar \(1\)/)).toBeInTheDocument()
      })
    }
  })

  // ✅ Test 7: Prevenir selección de items ya agregados
  it('should prevent selection of already added items', async () => {
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    // Seleccionar lista
    const selectTrigger = screen.getByRole('combobox')
    fireEvent.click(selectTrigger)
    const listaOption = await screen.findByText('LST-001 - Lista Test 1')
    fireEvent.click(listaOption)
    
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox')
      const disabledCheckbox = checkboxes.find(cb => cb.hasAttribute('disabled'))
      expect(disabledCheckbox).toBeInTheDocument()
    })
  })

  // ✅ Test 8: Agregar items seleccionados
  it('should add selected items successfully', async () => {
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    // Seleccionar lista
    const selectTrigger = screen.getByRole('combobox')
    fireEvent.click(selectTrigger)
    const listaOption = await screen.findByText('LST-001 - Lista Test 1')
    fireEvent.click(listaOption)
    
    await waitFor(() => {
      expect(screen.getByText('Item con cotización')).toBeInTheDocument()
    })
    
    // Seleccionar item disponible
    const checkboxes = screen.getAllByRole('checkbox')
    const availableCheckbox = checkboxes.find(cb => !cb.hasAttribute('disabled'))
    
    if (availableCheckbox) {
      fireEvent.click(availableCheckbox)
      
      // Hacer clic en agregar
      const addButton = await screen.findByText(/Agregar \(1\)/)
      fireEvent.click(addButton)
      
      await waitFor(() => {
        expect(mockCreateCotizacionProveedorItem).toHaveBeenCalled()
        expect(mockToast.success).toHaveBeenCalledWith('Ítems agregados exitosamente')
        expect(defaultProps.onAdded).toHaveBeenCalled()
        expect(defaultProps.onClose).toHaveBeenCalled()
      })
    }
  })

  // ✅ Test 9: Manejo de errores
  it('should handle errors when adding items', async () => {
    mockCreateCotizacionProveedorItem.mockRejectedValue(new Error('Error de red'))
    
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    // Seleccionar lista y item
    const selectTrigger = screen.getByRole('combobox')
    fireEvent.click(selectTrigger)
    const listaOption = await screen.findByText('LST-001 - Lista Test 1')
    fireEvent.click(listaOption)
    
    await waitFor(() => {
      const checkboxes = screen.getAllByRole('checkbox')
      const availableCheckbox = checkboxes.find(cb => !cb.hasAttribute('disabled'))
      if (availableCheckbox) {
        fireEvent.click(availableCheckbox)
      }
    })
    
    const addButton = await screen.findByText(/Agregar \(1\)/)
    fireEvent.click(addButton)
    
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Error al agregar ítems')
    })
  })

  // ✅ Test 10: Estados de carga
  it('should show loading states correctly', async () => {
    // Mock para simular carga lenta
    mockGetListaEquipoItemsByLista.mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve(mockItems), 100))
    )
    
    render(<ModalAgregarItemCotizacionProveedor {...defaultProps} />)
    
    // Seleccionar lista para activar carga de items
    const selectTrigger = screen.getByRole('combobox')
    fireEvent.click(selectTrigger)
    const listaOption = await screen.findByText('LST-001 - Lista Test 1')
    fireEvent.click(listaOption)
    
    // Verificar skeleton loading
    expect(screen.getAllByText('').some(el => 
      el.className.includes('animate-pulse')
    )).toBeTruthy()
    
    // Esperar a que termine la carga
    await waitFor(() => {
      expect(screen.getByText('Item con cotización')).toBeInTheDocument()
    })
  })
})
