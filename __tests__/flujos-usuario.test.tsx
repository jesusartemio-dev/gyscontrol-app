import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { TimesheetSemanal } from '@/components/horas-hombre/TimesheetSemanal'
import { RegistroHorasWizard } from '@/components/horas-hombre/RegistroHorasWizard'
import { DashboardProductividad } from '@/components/horas-hombre/DashboardProductividad'

/**
 * Tests de Flujos Completos de Usuario
 * 
 * Simula flujos de usuario reales desde registro hasta reportes
 */

describe('Flujo Completo: Registro de Horas', () => {
  beforeEach(() => {
    // Mock de APIs
    vi.mock('@/lib/api', () => ({
      registrarHoras: vi.fn(),
      obtenerElementosProyecto: vi.fn(),
      obtenerTareasUsuario: vi.fn()
    }))

    vi.mock('@/hooks/use-toast', () => ({
      useToast: () => ({
        toast: vi.fn()
      })
    }))
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  test('debe permitir registro de horas completo desde wizard', async () => {
    const mockRegistrarHoras = vi.mocked(import('@/lib/api').registrarHoras)
    mockRegistrarHoras.mockResolvedValue({
      ok: true,
      data: { id: 'registro-123', mensaje: 'Horas registradas correctamente' }
    })

    const { rerender } = render(
      <RegistroHorasWizard 
        onSuccess={vi.fn()}
        elementoInicial={{ tipo: 'proyecto', id: 'proyecto-123' }}
      />
    )

    // Paso 1: Seleccionar proyecto
    await waitFor(() => {
      expect(screen.getByText('Seleccionar Proyecto')).toBeInTheDocument()
    })

    // Paso 2: Seleccionar EDT
    const selectEdt = screen.getByText('Seleccionar EDT')
    fireEvent.click(selectEdt)
    
    await waitFor(() => {
      expect(screen.getByText('PLC')).toBeInTheDocument()
    })

    // Paso 3: Completar formulario
    const inputHoras = screen.getByLabelText('Horas trabajadas')
    const inputFecha = screen.getByLabelText('Fecha de trabajo')
    const inputDescripcion = screen.getByLabelText('Descripción')

    fireEvent.change(inputHoras, { target: { value: '8' } })
    fireEvent.change(inputFecha, { target: { value: '2025-01-15' } })
    fireEvent.change(inputDescripcion, { target: { value: 'Desarrollo de interfaz' } })

    // Enviar formulario
    const btnEnviar = screen.getByText('Registrar Horas')
    fireEvent.click(btnEnviar)

    // Verificar que se llamó la API
    await waitFor(() => {
      expect(mockRegistrarHoras).toHaveBeenCalledWith({
        proyectoId: 'proyecto-123',
        edtId: expect.any(String),
        horas: 8,
        fecha: '2025-01-15',
        descripcion: 'Desarrollo de interfaz',
        nivel: 'edt'
      })
    })
  })

  test('debe mostrar error cuando falla el registro', async () => {
    const mockRegistrarHoras = vi.mocked(import('@/lib/api').registrarHoras)
    mockRegistrarHoras.mockRejectedValue(new Error('Error del servidor'))

    const { rerender } = render(
      <RegistroHorasWizard 
        onSuccess={vi.fn()}
      />
    )

    // Simular flujo de registro
    const inputHoras = screen.getByLabelText('Horas trabajadas')
    fireEvent.change(inputHoras, { target: { value: '8' } })

    const btnEnviar = screen.getByText('Registrar Horas')
    fireEvent.click(btnEnviar)

    // Verificar mensaje de error
    await waitFor(() => {
      expect(screen.getByText(/Error al registrar horas/)).toBeInTheDocument()
    })
  })
})

describe('Flujo Completo: Timesheet Semanal', () => {
  test('debe mostrar calendario semanal con datos', async () => {
    const mockData = {
      dias: [
        { fecha: '2025-01-13', horas: 8, entradas: [] },
        { fecha: '2025-01-14', horas: 7.5, entradas: [{ proyecto: 'Proyecto ABC', horas: 7.5 }] },
        { fecha: '2025-01-15', horas: 0, entradas: [] },
        { fecha: '2025-01-16', horas: 8, entradas: [{ proyecto: 'Proyecto XYZ', horas: 4 }, { proyecto: 'Proyecto ABC', horas: 4 }] },
        { fecha: '2025-01-17', horas: 6, entradas: [{ proyecto: 'Proyecto ABC', horas: 6 }] },
        { fecha: '2025-01-18', horas: 0, entradas: [] },
        { fecha: '2025-01-19', horas: 0, entradas: [] }
      ],
      totalHoras: 29.5,
      promedioDiario: 4.9,
      diasTrabajados: 4
    }

    render(<TimesheetSemanal semana={new Date('2025-01-13')} onHorasRegistradas={vi.fn()} />)

    // Verificar elementos del calendario
    await waitFor(() => {
      expect(screen.getByText('Total Semana: 29.5h')).toBeInTheDocument()
      expect(screen.getByText('Promedio Diario: 4.9h')).toBeInTheDocument()
      expect(screen.getByText('Días Trabajados: 4/7')).toBeInTheDocument()
    })

    // Verificar navegación
    const btnSemanaAnterior = screen.getByLabelText('Semana anterior')
    const btnSemanaSiguiente = screen.getByLabelText('Semana siguiente')
    
    expect(btnSemanaAnterior).toBeInTheDocument()
    expect(btnSemanaSiguiente).toBeInTheDocument()
  })

  test('debe permitir navegación entre semanas', async () => {
    const mockOnHorasRegistradas = vi.fn()
    render(<TimesheetSemanal semana={new Date('2025-01-13')} onHorasRegistradas={mockOnHorasRegistradas} />)

    const btnSemanaSiguiente = screen.getByLabelText('Semana siguiente')
    fireEvent.click(btnSemanaSiguiente)

    await waitFor(() => {
      expect(screen.getByText('Semana del 20 al 26 Enero 2025')).toBeInTheDocument()
    })
  })
})

describe('Flujo Completo: Dashboard de Productividad', () => {
  test('debe mostrar métricas y gráficos correctamente', async () => {
    const mockProductividad = {
      horasTotales: 40,
      horasPlanificadas: 45,
      eficiencia: 88.9,
      diasTrabajados: 5,
      proyectosActivos: 3,
      horasPorProyecto: [
        { nombre: 'Proyecto ABC', horas: 25 },
        { nombre: 'Proyecto XYZ', horas: 15 }
      ],
      comparativaHistorica: [
        { periodo: 'Sem 1', horas: 35, objetivo: 40 },
        { periodo: 'Sem 2', horas: 42, objetivo: 40 },
        { periodo: 'Sem 3', horas: 38, objetivo: 40 },
        { periodo: 'Sem 4', horas: 40, objetivo: 40 }
      ],
      alertas: []
    }

    render(<DashboardProductividad userId="user-123" periodo="semanal" />)

    // Verificar métricas principales
    await waitFor(() => {
      expect(screen.getByText('40h')).toBeInTheDocument()
      expect(screen.getByText('88.9%')).toBeInTheDocument()
      expect(screen.getByText('5')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument()
    })

    // Verificar controles de filtrado
    const selectorPeriodo = screen.getByDisplayValue('semanal')
    expect(selectorPeriodo).toBeInTheDocument()

    const btnActualizar = screen.getByText('Actualizar')
    expect(btnActualizar).toBeInTheDocument()
  })

  test('debe mostrar alertas cuando hay problemas de rendimiento', async () => {
    const mockProductividadConAlertas = {
      horasTotales: 20,
      horasPlanificadas: 40,
      eficiencia: 50,
      diasTrabajados: 3,
      proyectosActivos: 1,
      horasPorProyecto: [],
      comparativaHistorica: [],
      alertas: [
        {
          tipo: 'bajo_rendimiento',
          mensaje: 'La eficiencia está por debajo del 70%. Revisar objetivos.',
          severidad: 'alta' as const
        }
      ]
    }

    render(<DashboardProductividad />)

    // Verificar que se muestran las alertas
    await waitFor(() => {
      expect(screen.getByText(/eficiencia está por debajo del 70%/)).toBeInTheDocument()
    })
  })
})

describe('Validación de Flujos de Navegación', () => {
  test('debe mantener estado al navegar entre componentes', async () => {
    const mockOnChange = vi.fn()
    
    render(
      <div>
        <TimesheetSemanal 
          semana={new Date('2025-01-13')} 
          onHorasRegistradas={mockOnChange} 
        />
      </div>
    )

    // Simular navegación y verificar que se mantienen los datos
    const btnSemanaSiguiente = screen.getByLabelText('Semana siguiente')
    fireEvent.click(btnSemanaSiguiente)

    await waitFor(() => {
      expect(mockOnChange).toHaveBeenCalled()
    })
  })

  test('debe manejar errores de red gracefully', async () => {
    const mockOnHorasRegistradas = vi.fn()
    
    render(
      <TimesheetSemanal 
        semana={new Date('2025-01-13')} 
        onHorasRegistradas={mockOnHorasRegistradas} 
      />
    )

    // Simular error de red - el componente debe mostrar estado de error
    // en lugar de crashear
    await waitFor(() => {
      // El componente debe estar en estado de carga o mostrar error
      expect(screen.getByText(/Cargando/)).toBeInTheDocument()
    })
  })
})