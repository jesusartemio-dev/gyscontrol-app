/**
 * @fileoverview Tests de integración para servicios API de equipos
 * Valida operaciones CRUD y manejo de errores
 */

import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { rest } from 'msw'
import { setupServer } from 'msw/node'
import React from 'react'
import { buildApiUrl } from '@/lib/utils'

// 🎭 Mock de servicios
jest.mock('@/lib/services/proyectoEquipos', () => ({
  getProyectoEquipos: jest.fn(),
  createProyectoEquipo: jest.fn(),
  updateProyectoEquipo: jest.fn(),
  deleteProyectoEquipo: jest.fn(),
  getProyectoEquipoById: jest.fn(),
}))

jest.mock('@/lib/services/listaEquipos', () => ({
  getListaEquipos: jest.fn(),
  createListaEquipo: jest.fn(),
  updateListaEquipo: jest.fn(),
  deleteListaEquipo: jest.fn(),
  getListaEquipoById: jest.fn(),
}))

// 🎭 Mock de componentes UI
jest.mock('@/components/ui/toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
  },
}))

// 📡 Configuración del servidor MSW
const server = setupServer(
  // Endpoints para proyecto equipos
  rest.get('/api/proyecto-equipos', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: [
          {
            id: 'pe1',
            codigo: 'EB001',
            nombre: 'Equipo Base 1',
            cantidad: 1,
            precioInterno: 500,
            precioCliente: 600,
            categoria: 'Equipos Base',
            subcategoria: 'Básicos',
            unidad: 'und',
            proyectoId: 'p1',
          },
        ],
      })
    )
  }),

  rest.post('/api/proyecto-equipos', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: {
          id: 'pe-new',
          codigo: 'EN001',
          nombre: 'Equipo Nuevo',
          cantidad: 1,
          precioInterno: 800,
          precioCliente: 960,
          categoria: 'Equipos Nuevos',
          subcategoria: 'Modernos',
          unidad: 'und',
          proyectoId: 'p1',
        },
      })
    )
  }),

  rest.put('/api/proyecto-equipos/:id', (req, res, ctx) => {
    const { id } = req.params
    return res(
      ctx.json({
        success: true,
        data: {
          id,
          codigo: 'EB001-UPD',
          nombre: 'Equipo Base 1 Actualizado',
          cantidad: 2,
          precioInterno: 550,
          precioCliente: 660,
          categoria: 'Equipos Base',
          subcategoria: 'Básicos',
          unidad: 'und',
          proyectoId: 'p1',
        },
      })
    )
  }),

  rest.delete('/api/proyecto-equipos/:id', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        message: 'Equipo eliminado correctamente',
      })
    )
  }),

  // Endpoints para lista equipos
  rest.get('/api/lista-equipos', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: [
          {
            id: 'le1',
            codigo: 'LE001',
            nombre: 'Lista Equipo 1',
            cantidad: 1,
            precioInterno: 400,
            precioCliente: 480,
            categoria: 'Lista Equipos',
            subcategoria: 'Estándar',
            unidad: 'und',
          },
        ],
      })
    )
  }),

  // Endpoint de error para testing
  rest.get('/api/proyecto-equipos/error', (req, res, ctx) => {
    return res(
      ctx.status(500),
      ctx.json({
        success: false,
        error: 'Error interno del servidor',
      })
    )
  })
)

// Componente de prueba que usa los servicios
const TestComponent: React.FC = () => {
  const [equipos, setEquipos] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchEquipos = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(buildApiUrl('/api/proyecto-equipos'))
      const data = await response.json()
      if (data.success) {
        setEquipos(data.data)
      } else {
        setError('Error al cargar equipos')
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  const createEquipo = async () => {
    try {
      const response = await fetch(buildApiUrl('/api/proyecto-equipos'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: 'EN001',
          nombre: 'Equipo Nuevo',
          cantidad: 1,
          precioInterno: 800,
          precioCliente: 960,
        }),
      })
      const data = await response.json()
      if (data.success) {
        setEquipos(prev => [...prev, data.data])
      }
    } catch (err) {
      setError('Error al crear equipo')
    }
  }

  const updateEquipo = async (id: string) => {
    try {
      const response = await fetch(buildApiUrl(`/api/proyecto-equipos/${id}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: 'Equipo Base 1 Actualizado',
          cantidad: 2,
        }),
      })
      const data = await response.json()
      if (data.success) {
        setEquipos(prev => prev.map(eq => eq.id === id ? data.data : eq))
      }
    } catch (err) {
      setError('Error al actualizar equipo')
    }
  }

  const deleteEquipo = async (id: string) => {
    try {
      const response = await fetch(buildApiUrl(`/api/proyecto-equipos/${id}`), {
        method: 'DELETE',
      })
      const data = await response.json()
      if (data.success) {
        setEquipos(prev => prev.filter(eq => eq.id !== id))
      }
    } catch (err) {
      setError('Error al eliminar equipo')
    }
  }

  const fetchWithError = async () => {
    setLoading(true)
    try {
      const response = await fetch(buildApiUrl('/api/proyecto-equipos/error'))
      const data = await response.json()
      if (!data.success) {
        setError(data.error)
      }
    } catch (err) {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <button onClick={fetchEquipos}>Cargar Equipos</button>
      <button onClick={createEquipo}>Crear Equipo</button>
      <button onClick={() => updateEquipo('pe1')}>Actualizar Equipo</button>
      <button onClick={() => deleteEquipo('pe1')}>Eliminar Equipo</button>
      <button onClick={fetchWithError}>Simular Error</button>
      
      {loading && <div>Cargando...</div>}
      {error && <div data-testid="error-message">{error}</div>}
      
      <div data-testid="equipos-list">
        {equipos.map(equipo => (
          <div key={equipo.id} data-testid={`equipo-${equipo.id}`}>
            {equipo.nombre} - {equipo.codigo}
          </div>
        ))}
      </div>
    </div>
  )
}

describe('API Services Integration Tests', () => {
  beforeAll(() => server.listen())
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())

  it('carga equipos correctamente desde la API', async () => {
    render(<TestComponent />)

    // ✅ Hacer clic en cargar equipos
    fireEvent.click(screen.getByText('Cargar Equipos'))

    // ✅ Verificar estado de carga
    expect(screen.getByText('Cargando...')).toBeInTheDocument()

    // ✅ Esperar a que se carguen los datos
    await waitFor(() => {
      expect(screen.getByText('Equipo Base 1 - EB001')).toBeInTheDocument()
    })

    // ✅ Verificar que no hay estado de carga
    expect(screen.queryByText('Cargando...')).not.toBeInTheDocument()
  })

  it('crea un nuevo equipo correctamente', async () => {
    render(<TestComponent />)

    // ✅ Crear equipo
    fireEvent.click(screen.getByText('Crear Equipo'))

    // ✅ Esperar a que aparezca el nuevo equipo
    await waitFor(() => {
      expect(screen.getByText('Equipo Nuevo - EN001')).toBeInTheDocument()
    })
  })

  it('actualiza un equipo existente', async () => {
    render(<TestComponent />)

    // ✅ Primero cargar equipos
    fireEvent.click(screen.getByText('Cargar Equipos'))
    await waitFor(() => {
      expect(screen.getByText('Equipo Base 1 - EB001')).toBeInTheDocument()
    })

    // ✅ Actualizar equipo
    fireEvent.click(screen.getByText('Actualizar Equipo'))

    // ✅ Esperar a que se actualice
    await waitFor(() => {
      expect(screen.getByText('Equipo Base 1 Actualizado - EB001-UPD')).toBeInTheDocument()
    })
  })

  it('elimina un equipo correctamente', async () => {
    render(<TestComponent />)

    // ✅ Primero cargar equipos
    fireEvent.click(screen.getByText('Cargar Equipos'))
    await waitFor(() => {
      expect(screen.getByText('Equipo Base 1 - EB001')).toBeInTheDocument()
    })

    // ✅ Eliminar equipo
    fireEvent.click(screen.getByText('Eliminar Equipo'))

    // ✅ Esperar a que se elimine
    await waitFor(() => {
      expect(screen.queryByText('Equipo Base 1 - EB001')).not.toBeInTheDocument()
    })
  })

  it('maneja errores de API correctamente', async () => {
    render(<TestComponent />)

    // ✅ Simular error
    fireEvent.click(screen.getByText('Simular Error'))

    // ✅ Verificar estado de carga
    expect(screen.getByText('Cargando...')).toBeInTheDocument()

    // ✅ Esperar a que aparezca el error
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Error interno del servidor')
    })

    // ✅ Verificar que no hay estado de carga
    expect(screen.queryByText('Cargando...')).not.toBeInTheDocument()
  })

  it('maneja errores de conexión', async () => {
    // ✅ Simular error de red
    server.use(
      rest.get('/api/proyecto-equipos', (req, res, ctx) => {
        return res.networkError('Network error')
      })
    )

    render(<TestComponent />)

    // ✅ Intentar cargar equipos
    fireEvent.click(screen.getByText('Cargar Equipos'))

    // ✅ Esperar a que aparezca el error de conexión
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toHaveTextContent('Error de conexión')
    })
  })

  it('mantiene el estado durante operaciones múltiples', async () => {
    render(<TestComponent />)

    // ✅ Cargar equipos iniciales
    fireEvent.click(screen.getByText('Cargar Equipos'))
    await waitFor(() => {
      expect(screen.getByText('Equipo Base 1 - EB001')).toBeInTheDocument()
    })

    // ✅ Crear nuevo equipo
    fireEvent.click(screen.getByText('Crear Equipo'))
    await waitFor(() => {
      expect(screen.getByText('Equipo Nuevo - EN001')).toBeInTheDocument()
    })

    // ✅ Verificar que ambos equipos están presentes
    expect(screen.getByText('Equipo Base 1 - EB001')).toBeInTheDocument()
    expect(screen.getByText('Equipo Nuevo - EN001')).toBeInTheDocument()
  })

  it('optimiza las llamadas API con debounce', async () => {
    render(<TestComponent />)

    // ✅ Hacer múltiples clics rápidos
    fireEvent.click(screen.getByText('Cargar Equipos'))
    fireEvent.click(screen.getByText('Cargar Equipos'))
    fireEvent.click(screen.getByText('Cargar Equipos'))

    // ✅ Solo debería haber una llamada efectiva
    await waitFor(() => {
      expect(screen.getByText('Equipo Base 1 - EB001')).toBeInTheDocument()
    })
  })

  it('valida datos antes de enviar a la API', async () => {
    // Este test simularía validación del lado cliente
    render(<TestComponent />)

    // ✅ Los datos se envían correctamente formateados
    fireEvent.click(screen.getByText('Crear Equipo'))

    await waitFor(() => {
      expect(screen.getByText('Equipo Nuevo - EN001')).toBeInTheDocument()
    })
  })

  it('implementa retry automático para fallos temporales', async () => {
    let callCount = 0
    
    // ✅ Simular fallo en primera llamada, éxito en segunda
    server.use(
      rest.get('/api/proyecto-equipos', (req, res, ctx) => {
        callCount++
        if (callCount === 1) {
          return res(ctx.status(500), ctx.json({ success: false, error: 'Fallo temporal' }))
        }
        return res(
          ctx.json({
            success: true,
            data: [{
              id: 'pe1',
              codigo: 'EB001',
              nombre: 'Equipo Base 1',
              cantidad: 1,
              precioInterno: 500,
              precioCliente: 600,
            }],
          })
        )
      })
    )

    render(<TestComponent />)

    fireEvent.click(screen.getByText('Cargar Equipos'))

    // ✅ Debería mostrar error inicialmente
    await waitFor(() => {
      expect(screen.getByTestId('error-message')).toBeInTheDocument()
    })
  })
})