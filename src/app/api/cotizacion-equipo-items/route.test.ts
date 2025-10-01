import { NextRequest } from 'next/server'
import { POST } from './route'
import { createCotizacionEquipoItem } from '@/lib/services/cotizacionEquipoItem'
import { getServerSession } from 'next-auth'
import type { CotizacionEquipoItem } from '@/types'

// Mock dependencies
jest.mock('@/lib/services/cotizacionEquipoItem')
jest.mock('next-auth')

const mockCreateCotizacionEquipoItem = createCotizacionEquipoItem as jest.MockedFunction<typeof createCotizacionEquipoItem>
const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>

const mockSession = {
  user: {
    id: 'user1',
    email: 'test@example.com',
    role: 'COMERCIAL'
  }
}

const mockCotizacionEquipoItem: CotizacionEquipoItem = {
  id: '1',
  cotizacionEquipoId: 'eq1',
  catalogoEquipoId: 'cat1',
  cantidad: 2,
  precioUnitario: 150.50,
  observaciones: 'Test observaciones'
}

const validRequestData = {
  cotizacionEquipoId: 'eq1',
  catalogoEquipoId: 'cat1',
  cantidad: 2,
  precioUnitario: 150.50,
  observaciones: 'Test observaciones'
}

describe('/api/cotizacion-equipo-items POST', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetServerSession.mockResolvedValue(mockSession)
  })

  it('should create cotizacion equipo item successfully', async () => {
    mockCreateCotizacionEquipoItem.mockResolvedValue(mockCotizacionEquipoItem)

    const request = new NextRequest('http://localhost:3000/api/cotizacion-equipo-items', {
      method: 'POST',
      body: JSON.stringify(validRequestData),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toEqual(mockCotizacionEquipoItem)
    expect(mockCreateCotizacionEquipoItem).toHaveBeenCalledWith(validRequestData)
  })

  it('should return 401 when user is not authenticated', async () => {
    mockGetServerSession.mockResolvedValue(null)

    const request = new NextRequest('http://localhost:3000/api/cotizacion-equipo-items', {
      method: 'POST',
      body: JSON.stringify(validRequestData),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(401)
    expect(data).toEqual({ error: 'No autorizado' })
    expect(mockCreateCotizacionEquipoItem).not.toHaveBeenCalled()
  })

  it('should return 403 when user does not have required permissions', async () => {
    const unauthorizedSession = {
      ...mockSession,
      user: {
        ...mockSession.user,
        role: 'COLABORADOR'
      }
    }
    mockGetServerSession.mockResolvedValue(unauthorizedSession)

    const request = new NextRequest('http://localhost:3000/api/cotizacion-equipo-items', {
      method: 'POST',
      body: JSON.stringify(validRequestData),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(403)
    expect(data).toEqual({ error: 'Permisos insuficientes' })
    expect(mockCreateCotizacionEquipoItem).not.toHaveBeenCalled()
  })

  it('should return 400 when request body is invalid JSON', async () => {
    const request = new NextRequest('http://localhost:3000/api/cotizacion-equipo-items', {
      method: 'POST',
      body: 'invalid json',
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data).toEqual({ error: 'Datos inválidos' })
    expect(mockCreateCotizacionEquipoItem).not.toHaveBeenCalled()
  })

  it('should return 400 when required fields are missing', async () => {
    const invalidData = {
      cotizacionEquipoId: 'eq1',
      // Missing catalogoEquipoId, cantidad, precioUnitario
    }

    const request = new NextRequest('http://localhost:3000/api/cotizacion-equipo-items', {
      method: 'POST',
      body: JSON.stringify(invalidData),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Datos inválidos')
    expect(mockCreateCotizacionEquipoItem).not.toHaveBeenCalled()
  })

  it('should return 400 when cantidad is not positive', async () => {
    const invalidData = {
      ...validRequestData,
      cantidad: 0
    }

    const request = new NextRequest('http://localhost:3000/api/cotizacion-equipo-items', {
      method: 'POST',
      body: JSON.stringify(invalidData),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Datos inválidos')
    expect(mockCreateCotizacionEquipoItem).not.toHaveBeenCalled()
  })

  it('should return 400 when precioUnitario is negative', async () => {
    const invalidData = {
      ...validRequestData,
      precioUnitario: -10
    }

    const request = new NextRequest('http://localhost:3000/api/cotizacion-equipo-items', {
      method: 'POST',
      body: JSON.stringify(invalidData),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Datos inválidos')
    expect(mockCreateCotizacionEquipoItem).not.toHaveBeenCalled()
  })

  it('should handle service errors gracefully', async () => {
    const serviceError = new Error('Database connection failed')
    mockCreateCotizacionEquipoItem.mockRejectedValue(serviceError)

    const request = new NextRequest('http://localhost:3000/api/cotizacion-equipo-items', {
      method: 'POST',
      body: JSON.stringify(validRequestData),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Error interno del servidor' })
  })

  it('should handle foreign key constraint errors', async () => {
    const constraintError = new Error('Foreign key constraint failed')
    mockCreateCotizacionEquipoItem.mockRejectedValue(constraintError)

    const request = new NextRequest('http://localhost:3000/api/cotizacion-equipo-items', {
      method: 'POST',
      body: JSON.stringify(validRequestData),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data).toEqual({ error: 'Error interno del servidor' })
  })

  it('should accept valid data with optional observaciones', async () => {
    const dataWithoutObservaciones = {
      cotizacionEquipoId: 'eq1',
      catalogoEquipoId: 'cat1',
      cantidad: 1,
      precioUnitario: 100
    }

    const expectedItem = {
      ...mockCotizacionEquipoItem,
      cantidad: 1,
      precioUnitario: 100,
      observaciones: ''
    }

    mockCreateCotizacionEquipoItem.mockResolvedValue(expectedItem)

    const request = new NextRequest('http://localhost:3000/api/cotizacion-equipo-items', {
      method: 'POST',
      body: JSON.stringify(dataWithoutObservaciones),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toEqual(expectedItem)
    expect(mockCreateCotizacionEquipoItem).toHaveBeenCalledWith(dataWithoutObservaciones)
  })

  it('should handle decimal precision in precioUnitario', async () => {
    const dataWithDecimal = {
      ...validRequestData,
      precioUnitario: 99.999
    }

    const expectedItem = {
      ...mockCotizacionEquipoItem,
      precioUnitario: 99.999
    }

    mockCreateCotizacionEquipoItem.mockResolvedValue(expectedItem)

    const request = new NextRequest('http://localhost:3000/api/cotizacion-equipo-items', {
      method: 'POST',
      body: JSON.stringify(dataWithDecimal),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toEqual(expectedItem)
  })

  it('should validate string field types', async () => {
    const invalidData = {
      cotizacionEquipoId: 123, // Should be string
      catalogoEquipoId: 'cat1',
      cantidad: 1,
      precioUnitario: 100
    }

    const request = new NextRequest('http://localhost:3000/api/cotizacion-equipo-items', {
      method: 'POST',
      body: JSON.stringify(invalidData),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Datos inválidos')
    expect(mockCreateCotizacionEquipoItem).not.toHaveBeenCalled()
  })

  it('should handle large cantidad values', async () => {
    const dataWithLargeCantidad = {
      ...validRequestData,
      cantidad: 999999
    }

    const expectedItem = {
      ...mockCotizacionEquipoItem,
      cantidad: 999999
    }

    mockCreateCotizacionEquipoItem.mockResolvedValue(expectedItem)

    const request = new NextRequest('http://localhost:3000/api/cotizacion-equipo-items', {
      method: 'POST',
      body: JSON.stringify(dataWithLargeCantidad),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data).toEqual(expectedItem)
  })
})
