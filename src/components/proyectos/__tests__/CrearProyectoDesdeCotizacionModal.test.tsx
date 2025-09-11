// ===================================================
// 📁 Archivo: CrearProyectoDesdeCotizacionModal.test.tsx
// 📌 Ubicación: src/components/proyectos/__tests__/
// 🔧 Descripción: Tests unitarios para el modal de crear proyecto desde cotización
//    Verifica que los campos de fecha funcionan correctamente
//
// ✍️ Autor: Sistema GYS
// 📅 Última actualización: 2025-01-27
// ===================================================

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import CrearProyectoDesdeCotizacionModal from '../CrearProyectoDesdeCotizacionModal'
import { crearProyectoDesdeCotizacion } from '@/lib/services/proyecto'
import { toast } from 'sonner'
import type { Cotizacion } from '@/types'

// ✅ Mocks
jest.mock('next/navigation')
jest.mock('@/lib/services/proyecto')
jest.mock('sonner')

const mockRouter = {
  push: jest.fn(),
}

const mockCotizacion: Cotizacion = {
  id: 'cot-123',
  codigo: 'COT-001',
  nombre: 'Cotización Test',
  cliente: {
    id: 'cliente-123',
    nombre: 'Cliente Test',
    ruc: '12345678901',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  comercial: {
    id: 'comercial-123',
    name: 'Comercial Test',
    email: 'comercial@test.com',
    role: 'comercial',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  totalEquiposInterno: 1000,
  totalServiciosInterno: 500,
  totalGastosInterno: 200,
  totalInterno: 1700,
  totalCliente: 2000,
  descuento: 0,
  grandTotal: 2000,
  estado: 'aprobada',
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('CrearProyectoDesdeCotizacionModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(useRouter as jest.Mock).mockReturnValue(mockRouter)
    ;(crearProyectoDesdeCotizacion as jest.Mock).mockResolvedValue({
      id: 'proyecto-123',
      nombre: 'Proyecto Test',
    })
  })

  it('should render modal with date fields', () => {
    render(<CrearProyectoDesdeCotizacionModal cotizacion={mockCotizacion} />)
    
    // ✅ Verificar que el trigger button existe
    expect(screen.getByText('Crear Proyecto')).toBeInTheDocument()
    
    // ✅ Abrir modal
    fireEvent.click(screen.getByText('Crear Proyecto'))
    
    // ✅ Verificar campos del formulario
    expect(screen.getByLabelText('Nombre del proyecto *')).toBeInTheDocument()
    expect(screen.getByLabelText('Código del proyecto *')).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha de inicio *')).toBeInTheDocument()
    expect(screen.getByLabelText('Fecha de fin (opcional)')).toBeInTheDocument()
  })

  it('should validate required fields including start date', () => {
    render(<CrearProyectoDesdeCotizacionModal cotizacion={mockCotizacion} />)
    
    // ✅ Abrir modal
    fireEvent.click(screen.getByText('Crear Proyecto'))
    
    // ✅ El botón debe estar deshabilitado inicialmente
    const createButton = screen.getByRole('button', { name: /crear proyecto/i })
    expect(createButton).toBeDisabled()
    
    // ✅ Llenar solo nombre y código (sin fecha)
    fireEvent.change(screen.getByLabelText('Nombre del proyecto *'), {
      target: { value: 'Proyecto Test' }
    })
    fireEvent.change(screen.getByLabelText('Código del proyecto *'), {
      target: { value: 'PROJ-001' }
    })
    
    // ✅ Botón sigue deshabilitado sin fecha de inicio
    expect(createButton).toBeDisabled()
    
    // ✅ Agregar fecha de inicio
    fireEvent.change(screen.getByLabelText('Fecha de inicio *'), {
      target: { value: '2025-02-01' }
    })
    
    // ✅ Ahora el botón debe estar habilitado
    expect(createButton).not.toBeDisabled()
  })

  it('should create project with dates when form is submitted', async () => {
    render(<CrearProyectoDesdeCotizacionModal cotizacion={mockCotizacion} />)
    
    // ✅ Abrir modal
    fireEvent.click(screen.getByText('Crear Proyecto'))
    
    // ✅ Llenar formulario completo
    fireEvent.change(screen.getByLabelText('Nombre del proyecto *'), {
      target: { value: 'Proyecto Test' }
    })
    fireEvent.change(screen.getByLabelText('Código del proyecto *'), {
      target: { value: 'PROJ-001' }
    })
    fireEvent.change(screen.getByLabelText('Fecha de inicio *'), {
      target: { value: '2025-02-01' }
    })
    fireEvent.change(screen.getByLabelText('Fecha de fin (opcional)'), {
      target: { value: '2025-06-30' }
    })
    
    // ✅ Enviar formulario
    const createButton = screen.getByRole('button', { name: /crear proyecto/i })
    fireEvent.click(createButton)
    
    // ✅ Verificar que se llamó al servicio con las fechas correctas
    await waitFor(() => {
      expect(crearProyectoDesdeCotizacion).toHaveBeenCalledWith(
        mockCotizacion.id,
        expect.objectContaining({
          nombre: 'Proyecto Test',
          codigo: 'PROJ-001',
          fechaInicio: '2025-02-01T00:00:00.000Z',
          fechaFin: '2025-06-30T00:00:00.000Z',
        })
      )
    })
    
    // ✅ Verificar toast de éxito y redirección
    expect(toast.success).toHaveBeenCalledWith('Proyecto creado correctamente')
    expect(mockRouter.push).toHaveBeenCalledWith('/proyectos/proyecto-123')
  })

  it('should create project without end date when not provided', async () => {
    render(<CrearProyectoDesdeCotizacionModal cotizacion={mockCotizacion} />)
    
    // ✅ Abrir modal
    fireEvent.click(screen.getByText('Crear Proyecto'))
    
    // ✅ Llenar formulario sin fecha fin
    fireEvent.change(screen.getByLabelText('Nombre del proyecto *'), {
      target: { value: 'Proyecto Test' }
    })
    fireEvent.change(screen.getByLabelText('Código del proyecto *'), {
      target: { value: 'PROJ-001' }
    })
    fireEvent.change(screen.getByLabelText('Fecha de inicio *'), {
      target: { value: '2025-02-01' }
    })
    
    // ✅ Enviar formulario
    const createButton = screen.getByRole('button', { name: /crear proyecto/i })
    fireEvent.click(createButton)
    
    // ✅ Verificar que se llamó al servicio sin fecha fin
    await waitFor(() => {
      expect(crearProyectoDesdeCotizacion).toHaveBeenCalledWith(
        mockCotizacion.id,
        expect.objectContaining({
          nombre: 'Proyecto Test',
          codigo: 'PROJ-001',
          fechaInicio: '2025-02-01T00:00:00.000Z',
          fechaFin: undefined,
        })
      )
    })
  })

  it('should handle service errors gracefully', async () => {
    // ✅ Mock error del servicio
    ;(crearProyectoDesdeCotizacion as jest.Mock).mockRejectedValue(
      new Error('Error de red')
    )
    
    render(<CrearProyectoDesdeCotizacionModal cotizacion={mockCotizacion} />)
    
    // ✅ Abrir modal y llenar formulario
    fireEvent.click(screen.getByText('Crear Proyecto'))
    
    fireEvent.change(screen.getByLabelText('Nombre del proyecto *'), {
      target: { value: 'Proyecto Test' }
    })
    fireEvent.change(screen.getByLabelText('Código del proyecto *'), {
      target: { value: 'PROJ-001' }
    })
    fireEvent.change(screen.getByLabelText('Fecha de inicio *'), {
      target: { value: '2025-02-01' }
    })
    
    // ✅ Enviar formulario
    const createButton = screen.getByRole('button', { name: /crear proyecto/i })
    fireEvent.click(createButton)
    
    // ✅ Verificar toast de error
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith('Error al crear el proyecto')
    })
    
    // ✅ No debe redirigir en caso de error
    expect(mockRouter.push).not.toHaveBeenCalled()
  })

  it('should enforce end date not before start date', () => {
    render(<CrearProyectoDesdeCotizacionModal cotizacion={mockCotizacion} />)
    
    // ✅ Abrir modal
    fireEvent.click(screen.getByText('Crear Proyecto'))
    
    // ✅ Establecer fecha de inicio
    const startDateInput = screen.getByLabelText('Fecha de inicio *')
    fireEvent.change(startDateInput, {
      target: { value: '2025-02-01' }
    })
    
    // ✅ Verificar que el campo fecha fin tiene min igual a fecha inicio
    const endDateInput = screen.getByLabelText('Fecha de fin (opcional)')
    expect(endDateInput).toHaveAttribute('min', '2025-02-01')
  })
})
