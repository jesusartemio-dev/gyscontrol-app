/**
 * Test para verificar la validación de fechaNecesaria en PedidoEquipo
 * después de corregir el error de tipo DateTime | null
 */

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/pedidos-equipo/route'
import { getServerSession } from 'next-auth'
import { prisma } from '@/lib/prisma'

// Mock dependencies
jest.mock('next-auth')
jest.mock('@/lib/prisma', () => ({
  prisma: {
    proyecto: {
      findUnique: jest.fn()
    },
    pedidoEquipo: {
      findFirst: jest.fn(),
      create: jest.fn()
    }
  }
}))

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>
const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('POST /api/pedidos-equipo - fechaNecesaria validation', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock authenticated session
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', name: 'Test User' }
    } as any)
  })

  // ✅ Test para verificar que fechaNecesaria es obligatoria
  test('should return 400 when fechaNecesaria is missing', async () => {
    const requestBody = {
      proyectoId: 'proyecto-1',
      responsableId: 'user-1',
      prioridad: 'alta'
      // fechaNecesaria is missing
    }

    const request = new NextRequest('http://localhost:3000/api/pedidos-equipo', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('La fecha necesaria es obligatoria')
  })

  // ✅ Test para verificar que fechaNecesaria null también falla
  test('should return 400 when fechaNecesaria is null', async () => {
    const requestBody = {
      proyectoId: 'proyecto-1',
      responsableId: 'user-1',
      fechaNecesaria: null,
      prioridad: 'alta'
    }

    const request = new NextRequest('http://localhost:3000/api/pedidos-equipo', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('La fecha necesaria es obligatoria')
  })

  // ✅ Test para verificar que fechaNecesaria vacía también falla
  test('should return 400 when fechaNecesaria is empty string', async () => {
    const requestBody = {
      proyectoId: 'proyecto-1',
      responsableId: 'user-1',
      fechaNecesaria: '',
      prioridad: 'alta'
    }

    const request = new NextRequest('http://localhost:3000/api/pedidos-equipo', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('La fecha necesaria es obligatoria')
  })

  // ✅ Test para verificar que con fechaNecesaria válida funciona
  test('should create pedido successfully with valid fechaNecesaria', async () => {
    const fechaNecesaria = '2024-12-31T10:00:00.000Z'
    const requestBody = {
      proyectoId: 'proyecto-1',
      responsableId: 'user-1',
      fechaNecesaria,
      prioridad: 'alta',
      observacion: 'Test pedido'
    }

    // Mock proyecto exists
    mockPrisma.proyecto.findUnique.mockResolvedValue({
      id: 'proyecto-1',
      codigo: 'PROJ001'
    } as any)

    // Mock no previous pedidos
    mockPrisma.pedidoEquipo.findFirst.mockResolvedValue(null)

    // Mock successful creation
    const mockPedido = {
      id: 'pedido-1',
      codigo: 'PED-PROJ001-001',
      proyectoId: 'proyecto-1',
      responsableId: 'user-1',
      fechaNecesaria: new Date(fechaNecesaria),
      prioridad: 'alta',
      observacion: 'Test pedido',
      estado: 'borrador',
      proyecto: {
        id: 'proyecto-1',
        nombre: 'Test Project',
        codigo: 'PROJ001'
      },
      responsable: {
        id: 'user-1',
        name: 'Test User'
      },
      lista: null
    }

    mockPrisma.pedidoEquipo.create.mockResolvedValue(mockPedido as any)

    const request = new NextRequest('http://localhost:3000/api/pedidos-equipo', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(201)
    expect(data.codigo).toBe('PED-PROJ001-001')
    expect(mockPrisma.pedidoEquipo.create).toHaveBeenCalledWith({
      data: {
        codigo: 'PED-PROJ001-001',
        proyectoId: 'proyecto-1',
        listaId: undefined,
        responsableId: 'user-1',
        fechaNecesaria: new Date(fechaNecesaria),
        prioridad: 'alta',
        observacion: 'Test pedido',
        estado: 'borrador'
      },
      include: expect.any(Object)
    })
  })

  // ✅ Test para verificar que fechaNecesaria se convierte correctamente a Date
  test('should convert fechaNecesaria string to Date object', async () => {
    const fechaNecesaria = '2024-12-31'
    const requestBody = {
      proyectoId: 'proyecto-1',
      responsableId: 'user-1',
      fechaNecesaria
    }

    // Mock proyecto exists
    mockPrisma.proyecto.findUnique.mockResolvedValue({
      id: 'proyecto-1',
      codigo: 'PROJ001'
    } as any)

    mockPrisma.pedidoEquipo.findFirst.mockResolvedValue(null)
    mockPrisma.pedidoEquipo.create.mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/pedidos-equipo', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    await POST(request)

    expect(mockPrisma.pedidoEquipo.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        fechaNecesaria: new Date(fechaNecesaria)
      }),
      include: expect.any(Object)
    })
  })
})
