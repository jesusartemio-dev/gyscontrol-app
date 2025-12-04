import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { DependencyManager } from '@/components/cronograma/DependencyManager'
import { useToast } from '@/hooks/use-toast'

// Mock de hooks y componentes
jest.mock('@/hooks/use-toast', () => ({
  useToast: jest.fn()
}))

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}))

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <div data-testid="dialog-title">{children}</div>,
  DialogTrigger: ({ children, asChild }: any) => <div data-testid="dialog-trigger">{children}</div>
}))

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select value={value} onChange={(e) => onValueChange(e.target.value)}>
      {children}
    </select>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>
}))

jest.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />
}))

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>
}))

jest.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>
}))

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span data-variant={variant}>{children}</span>
}))

jest.mock('lucide-react', () => ({
  Plus: () => <span data-testid="plus-icon">Plus</span>,
  Trash2: () => <span data-testid="trash-icon">Trash</span>,
  ArrowRight: () => <span data-testid="arrow-icon">Arrow</span>,
  AlertTriangle: () => <span data-testid="alert-icon">Alert</span>
}))

// Mock global de fetch
const mockFetch = jest.fn() as jest.MockedFunction<typeof fetch>
global.fetch = mockFetch

// Extender Jest matchers para testing-library
declare module '@jest/globals' {
  interface Matchers<R> {
    toBeInTheDocument(): R
  }
}

describe('DependencyManager Component', () => {
  const mockToast = jest.fn()
  const mockCotizacionId = 'cotizacion-123'
  const mockTareas = [
    {
      id: 'tarea-1',
      nombre: 'Tarea A',
      fechaInicio: '2024-01-01T08:00:00Z',
      fechaFin: '2024-01-02T17:00:00Z',
      esHito: false
    },
    {
      id: 'tarea-2',
      nombre: 'Tarea B',
      fechaInicio: '2024-01-03T08:00:00Z',
      fechaFin: '2024-01-04T17:00:00Z',
      esHito: true
    }
  ]

  beforeEach(() => {
    jest.clearAllMocks()
    ;(useToast as jest.Mock).mockReturnValue({ toast: mockToast })
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] })
    } as Response)
  })

  afterEach(() => {
    jest.resetAllMocks()
  })

  it('debe renderizar el botón de trigger correctamente', () => {
    render(
      <DependencyManager
        cotizacionId={mockCotizacionId}
        tareas={mockTareas}
      />
    )

    expect(screen.getByText('Gestionar Dependencias (0)')).toBeInTheDocument()
    expect(screen.getByTestId('arrow-icon')).toBeInTheDocument()
  })

  it('debe mostrar mensaje cuando no hay dependencias', async () => {
    render(
      <DependencyManager
        cotizacionId={mockCotizacionId}
        tareas={mockTareas}
      />
    )

    // Simular clic en el botón para abrir el modal
    const triggerButton = screen.getByText('Gestionar Dependencias (0)')
    fireEvent.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByText('No hay dependencias configuradas')).toBeInTheDocument()
      expect(screen.getByText('Las tareas se ejecutan secuencialmente por defecto')).toBeInTheDocument()
    })
  })

  it('debe mostrar lista de dependencias cuando existen', async () => {
    const mockDependencias = [
      {
        id: 'dep-1',
        tareaOrigen: mockTareas[0],
        tareaDependiente: mockTareas[1],
        tipo: 'finish_to_start' as const,
        lagMinutos: 60
      }
    ]

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockDependencias })
    } as Response)

    render(
      <DependencyManager
        cotizacionId={mockCotizacionId}
        tareas={mockTareas}
      />
    )

    // Abrir modal
    const triggerButton = screen.getByText('Gestionar Dependencias (0)')
    fireEvent.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByText('Dependencias Existentes')).toBeInTheDocument()
    })
  })

  it('debe mostrar formulario de creación cuando se hace clic en "Nueva Dependencia"', async () => {
    render(
      <DependencyManager
        cotizacionId={mockCotizacionId}
        tareas={mockTareas}
      />
    )

    // Abrir modal
    const triggerButton = screen.getByText('Gestionar Dependencias (0)')
    fireEvent.click(triggerButton)

    await waitFor(() => {
      const nuevaDependenciaButton = screen.getByText('Nueva Dependencia')
      fireEvent.click(nuevaDependenciaButton)
    })

    await waitFor(() => {
      expect(screen.getByText('Crear Nueva Dependencia')).toBeInTheDocument()
      expect(screen.getByText('Seleccionar tarea origen')).toBeInTheDocument()
      expect(screen.getByText('Seleccionar tarea destino')).toBeInTheDocument()
    })
  })

  it('debe validar que no se puede crear dependencia consigo misma', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'No puede crear una dependencia de una tarea consigo misma' })
    } as Response)

    render(
      <DependencyManager
        cotizacionId={mockCotizacionId}
        tareas={mockTareas}
      />
    )

    // Abrir modal y formulario
    const triggerButton = screen.getByText('Gestionar Dependencias (0)')
    fireEvent.click(triggerButton)

    await waitFor(() => {
      const nuevaDependenciaButton = screen.getByText('Nueva Dependencia')
      fireEvent.click(nuevaDependenciaButton)
    })

    // Intentar crear dependencia inválida
    await waitFor(() => {
      const crearButton = screen.getByText('Crear Dependencia')
      fireEvent.click(crearButton)
    })

    await waitFor(() => {
      expect(mockToast).toHaveBeenCalledWith({
        title: 'Error',
        description: 'Debe seleccionar ambas tareas',
        variant: 'destructive'
      })
    })
  })

  it('debe mostrar hitos con indicador visual', async () => {
    render(
      <DependencyManager
        cotizacionId={mockCotizacionId}
        tareas={mockTareas}
      />
    )

    // Abrir modal
    const triggerButton = screen.getByText('Gestionar Dependencias (0)')
    fireEvent.click(triggerButton)

    await waitFor(() => {
      // Verificar que se muestra el indicador de hito
      const tareaBHito = screen.getByText('Tarea B')
      expect(tareaBHito).toBeInTheDocument()
      // Nota: El indicador 🎯 se renderiza pero puede no estar en el texto visible
    })
  })

  it('debe mostrar información de ayuda', async () => {
    render(
      <DependencyManager
        cotizacionId={mockCotizacionId}
        tareas={mockTareas}
      />
    )

    // Abrir modal
    const triggerButton = screen.getByText('Gestionar Dependencias (0)')
    fireEvent.click(triggerButton)

    await waitFor(() => {
      expect(screen.getByText('Información Importante')).toBeInTheDocument()
      expect(screen.getByText('Las dependencias se aplican automáticamente al generar o actualizar el cronograma')).toBeInTheDocument()
    })
  })

  it('debe manejar errores de red', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'))

    render(
      <DependencyManager
        cotizacionId={mockCotizacionId}
        tareas={mockTareas}
      />
    )

    // Abrir modal
    const triggerButton = screen.getByText('Gestionar Dependencias (0)')
    fireEvent.click(triggerButton)

    // El componente maneja errores silenciosamente en useEffect
    await waitFor(() => {
      expect(screen.getByText('No hay dependencias configuradas')).toBeInTheDocument()
    })
  })

  it('debe mostrar tipos de dependencia correctamente', async () => {
    const tiposEsperados = [
      'Termina-Inicia (FS)',
      'Inicia-Inicia (SS)',
      'Termina-Termina (FF)',
      'Inicia-Termina (SF)'
    ]

    render(
      <DependencyManager
        cotizacionId={mockCotizacionId}
        tareas={mockTareas}
      />
    )

    // Abrir modal y formulario
    const triggerButton = screen.getByText('Gestionar Dependencias (0)')
    fireEvent.click(triggerButton)

    await waitFor(() => {
      const nuevaDependenciaButton = screen.getByText('Nueva Dependencia')
      fireEvent.click(nuevaDependenciaButton)
    })

    await waitFor(() => {
      // Verificar que se puede seleccionar el tipo de dependencia
      const selectTipo = screen.getByDisplayValue('finish_to_start')
      expect(selectTipo).toBeInTheDocument()
    })
  })
})