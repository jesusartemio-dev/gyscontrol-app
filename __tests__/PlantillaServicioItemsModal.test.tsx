// ===================================================
// 📁 Archivo: PlantillaServicioItemsModal.test.tsx
// 📌 Ubicación: __tests__/PlantillaServicioItemsModal.test.tsx
// 🔧 Descripción: Tests para el modal de agregar items de servicio desde catálogo
// 🧠 Uso: Verifica que los items se agreguen correctamente en lote
// ✍️ Autor: Asistente IA GYS
// 📅 Última actualización: 2025-01-23
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { toast } from 'sonner'
import PlantillaServicioItemsModal from '@/components/plantillas/PlantillaServicioItemsModal'
import { getCatalogoServiciosByCategoriaId } from '@/lib/services/catalogoServicio'
import { createPlantillaServicioItem } from '@/lib/services/plantillaServicioItem'
import { recalcularPlantillaDesdeAPI } from '@/lib/services/plantilla'
import type { CatalogoServicio, PlantillaServicioItem } from '@/types'

// Mock dependencies
jest.mock('@/lib/services/catalogoServicio')
jest.mock('@/lib/services/plantillaServicioItem')
jest.mock('@/lib/services/plantilla')
jest.mock('sonner')

const mockGetCatalogoServicios = getCatalogoServiciosByCategoriaId as jest.MockedFunction<typeof getCatalogoServiciosByCategoriaId>
const mockCreatePlantillaServicioItem = createPlantillaServicioItem as jest.MockedFunction<typeof createPlantillaServicioItem>
const mockRecalcularPlantilla = recalcularPlantillaDesdeAPI as jest.MockedFunction<typeof recalcularPlantillaDesdeAPI>
const mockToast = toast as jest.Mocked<typeof toast>

// Mock data
const mockCatalogoServicios: CatalogoServicio[] = [
  {
    id: 'servicio-1',
    nombre: 'Programación PLC',
    descripcion: 'Programación de lógica de control',
    categoriaId: 'cat-1',
    unidadServicioId: 'unidad-1',
    recursoId: 'recurso-1',
    categoria: { id: 'cat-1', nombre: 'PLC' },
    formula: 'Escalonada',
    cantidad: 1,
    horaBase: 5,
    horaRepetido: 0,
    horaUnidad: 8,
    horaFijo: 1,
    unidadServicio: { id: 'unidad-1', nombre: 'Motores' },
    recurso: { id: 'recurso-1', nombre: 'Programador Senior', costoHora: 30.50 },
    createdAt: '2025-01-23T10:00:00Z',
    updatedAt: '2025-01-23T10:00:00Z'
  },
  {
    id: 'servicio-2',
    nombre: 'Configuración HMI',
    descripcion: 'Configuración de interfaz humano-máquina',
    categoriaId: 'cat-1',
    unidadServicioId: 'unidad-2',
    recursoId: 'recurso-2',
    categoria: { id: 'cat-1', nombre: 'PLC' },
    formula: 'Fijo',
    cantidad: 1,
    horaBase: 0,
    horaRepetido: 0,
    horaUnidad: 0,
    horaFijo: 4,
    unidadServicio: { id: 'unidad-2', nombre: 'Interfaces' },
    recurso: { id: 'recurso-2', nombre: 'Técnico HMI', costoHora: 25.00 },
    createdAt: '2025-01-23T10:00:00Z',
    updatedAt: '2025-01-23T10:00:00Z'
  }
]

const mockCreatedItems: PlantillaServicioItem[] = [
  {
    id: 'item-1',
    plantillaServicioId: 'servicio-plantilla-1',
    catalogoServicioId: 'servicio-1',
    unidadServicioId: 'unidad-1',
    recursoId: 'recurso-1',
    nombre: 'Programación PLC',
    descripcion: 'Programación de lógica de control',
    categoria: 'PLC',
    formula: 'Escalonada',
    horaBase: 5,
    horaRepetido: 0,
    horaUnidad: 8,
    horaFijo: 1,
    unidadServicioNombre: 'Motores',
    recursoNombre: 'Programador Senior',
    costoHora: 30.50,
    cantidad: 2,
    horaTotal: 21,
    factorSeguridad: 1.0,
    costoInterno: 640.50,
    margen: 1.35,
    costoCliente: 864.68,
    unidadServicio: { id: 'unidad-1', nombre: 'Motores' },
    recurso: { id: 'recurso-1', nombre: 'Programador Senior', costoHora: 30.50 },
    createdAt: '2025-01-23T10:00:00Z',
    updatedAt: '2025-01-23T10:00:00Z'
  },
  {
    id: 'item-2',
    plantillaServicioId: 'servicio-plantilla-1',
    catalogoServicioId: 'servicio-2',
    unidadServicioId: 'unidad-2',
    recursoId: 'recurso-2',
    nombre: 'Configuración HMI',
    descripcion: 'Configuración de interfaz humano-máquina',
    categoria: 'PLC',
    formula: 'Fijo',
    horaBase: 0,
    horaRepetido: 0,
    horaUnidad: 0,
    horaFijo: 4,
    unidadServicioNombre: 'Interfaces',
    recursoNombre: 'Técnico HMI',
    costoHora: 25.00,
    cantidad: 1,
    horaTotal: 4,
    factorSeguridad: 1.0,
    costoInterno: 100.00,
    margen: 1.35,
    costoCliente: 135.00,
    unidadServicio: { id: 'unidad-2', nombre: 'Interfaces' },
    recurso: { id: 'recurso-2', nombre: 'Técnico HMI', costoHora: 25.00 },
    createdAt: '2025-01-23T10:00:00Z',
    updatedAt: '2025-01-23T10:00:00Z'
  }
]

describe('PlantillaServicioItemsModal', () => {
  const defaultProps = {
    open: true,
    onClose: jest.fn(),
    plantillaId: 'plantilla-1',
    plantillaServicioId: 'servicio-plantilla-1',
    categoriaNombre: 'PLC',
    onCreated: jest.fn()
  }

  beforeEach(() => {
    jest.clearAllMocks()
    mockGetCatalogoServicios.mockResolvedValue(mockCatalogoServicios)
    mockCreatePlantillaServicioItem.mockImplementation((payload) => 
      Promise.resolve(mockCreatedItems.find(item => item.catalogoServicioId === payload.catalogoServicioId)!)
    )
    mockRecalcularPlantilla.mockResolvedValue(undefined)
    mockToast.success = jest.fn()
    mockToast.error = jest.fn()
  })

  it('should render modal with catalog services', async () => {
    render(<PlantillaServicioItemsModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Items desde Catálogo')).toBeInTheDocument()
      expect(screen.getByText('PLC')).toBeInTheDocument()
      expect(screen.getByText('Programación PLC')).toBeInTheDocument()
      expect(screen.getByText('Configuración HMI')).toBeInTheDocument()
    })
  })

  it('should handle multiple item selection and creation correctly', async () => {
    render(<PlantillaServicioItemsModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Programación PLC')).toBeInTheDocument()
    })

    // Select both services
    const checkbox1 = screen.getByRole('checkbox', { name: /programación plc/i })
    const checkbox2 = screen.getByRole('checkbox', { name: /configuración hmi/i })
    
    fireEvent.click(checkbox1)
    fireEvent.click(checkbox2)

    // Set quantities
    const quantityInputs = screen.getAllByRole('spinbutton')
    fireEvent.change(quantityInputs[0], { target: { value: '2' } })
    fireEvent.change(quantityInputs[1], { target: { value: '1' } })

    // Click add button
    const addButton = screen.getByRole('button', { name: /agregar seleccionados/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      // Verify API calls
      expect(mockCreatePlantillaServicioItem).toHaveBeenCalledTimes(2)
      expect(mockRecalcularPlantilla).toHaveBeenCalledWith('plantilla-1')
      
      // Verify onCreated callback is called with array of items
      expect(defaultProps.onCreated).toHaveBeenCalledTimes(1)
      expect(defaultProps.onCreated).toHaveBeenCalledWith(mockCreatedItems)
      
      // Verify success toast
      expect(mockToast.success).toHaveBeenCalledWith('2 servicios agregados correctamente ✅')
      
      // Verify modal closes
      expect(defaultProps.onClose).toHaveBeenCalled()
    })
  })

  it('should handle single item selection correctly', async () => {
    render(<PlantillaServicioItemsModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Programación PLC')).toBeInTheDocument()
    })

    // Select only first service
    const checkbox1 = screen.getByRole('checkbox', { name: /programación plc/i })
    fireEvent.click(checkbox1)

    // Click add button
    const addButton = screen.getByRole('button', { name: /agregar seleccionados/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      // Verify API calls
      expect(mockCreatePlantillaServicioItem).toHaveBeenCalledTimes(1)
      
      // Verify onCreated callback is called with array containing single item
      expect(defaultProps.onCreated).toHaveBeenCalledWith([mockCreatedItems[0]])
      
      // Verify success toast for single item
      expect(mockToast.success).toHaveBeenCalledWith('1 servicio agregado correctamente ✅')
    })
  })

  it('should show error when no items are selected', async () => {
    render(<PlantillaServicioItemsModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Programación PLC')).toBeInTheDocument()
    })

    // Click add button without selecting any items
    const addButton = screen.getByRole('button', { name: /agregar seleccionados/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Selecciona al menos un servicio')
      expect(mockCreatePlantillaServicioItem).not.toHaveBeenCalled()
      expect(defaultProps.onCreated).not.toHaveBeenCalled()
    })
  })

  it('should handle API errors gracefully', async () => {
    mockCreatePlantillaServicioItem.mockRejectedValue(new Error('API Error'))
    
    render(<PlantillaServicioItemsModal {...defaultProps} />)

    await waitFor(() => {
      expect(screen.getByText('Programación PLC')).toBeInTheDocument()
    })

    // Select first service
    const checkbox1 = screen.getByRole('checkbox', { name: /programación plc/i })
    fireEvent.click(checkbox1)

    // Click add button
    const addButton = screen.getByRole('button', { name: /agregar seleccionados/i })
    fireEvent.click(addButton)

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith('Error al agregar servicios')
      expect(defaultProps.onCreated).not.toHaveBeenCalled()
      expect(defaultProps.onClose).not.toHaveBeenCalled()
    })
  })
})