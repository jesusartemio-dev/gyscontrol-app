/**
 * Test para verificar que numeroSecuencia se incluye correctamente
 * en la creación de PedidoEquipo
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

describe('POST /api/pedidos-equipo - numeroSecuencia field', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    
    // Mock authenticated session
    mockGetServerSession.mockResolvedValue({
      user: { id: 'user-1', name: 'Test User' }
    } as any)
  })

  // ✅ Test para verificar que numeroSecuencia se incluye en la creación
  test('should include numeroSecuencia in pedido creation', async () => {
    const requestBody = {
      proyectoId: 'proyecto-1',
      responsableId: 'user-1',
      fechaNecesaria: '2024-12-31T10:00:00.000Z',
      prioridad: 'alta',
      observacion: 'Test pedido'
    }

    // Mock proyecto exists
    mockPrisma.proyecto.findUnique.mockResolvedValue({
      id: 'proyecto-1',
      codigo: 'PROJ001'
    } as any)

    // Mock no previous pedidos (first pedido)
    mockPrisma.pedidoEquipo.findFirst.mockResolvedValue(null)

    // Mock successful creation
    const mockPedido = {
      id: 'pedido-1',
      codigo: 'PED-PROJ001-001',
      numeroSecuencia: 1,
      proyectoId: 'proyecto-1',
      responsableId: 'user-1',
      fechaNecesaria: new Date('2024-12-31T10:00:00.000Z'),
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
    
    // ✅ Verificar que numeroSecuencia se incluye en la creación
    expect(mockPrisma.pedidoEquipo.create).toHaveBeenCalledWith({
      data: {
        codigo: 'PED-PROJ001-001',
        numeroSecuencia: 1,
        proyectoId: 'proyecto-1',
        listaId: undefined,
        responsableId: 'user-1',
        fechaNecesaria: new Date('2024-12-31T10:00:00.000Z'),
        prioridad: 'alta',
        observacion: 'Test pedido',
        estado: 'borrador'
      },
      include: expect.any(Object)
    })
  })

  // ✅ Test para verificar secuencia incremental
  test('should increment numeroSecuencia when previous pedidos exist', async () => {
    const requestBody = {
      proyectoId: 'proyecto-1',
      responsableId: 'user-1',
      fechaNecesaria: '2024-12-31T10:00:00.000Z'
    }

    // Mock proyecto exists
    mockPrisma.proyecto.findUnique.mockResolvedValue({
      id: 'proyecto-1',
      codigo: 'PROJ001'
    } as any)

    // Mock existing pedido with sequence 5
    mockPrisma.pedidoEquipo.findFirst.mockResolvedValue({
      codigo: 'PED-PROJ001-005'
    } as any)

    mockPrisma.pedidoEquipo.create.mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/pedidos-equipo', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    await POST(request)

    // ✅ Verificar que numeroSecuencia se incrementa correctamente
    expect(mockPrisma.pedidoEquipo.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        codigo: 'PED-PROJ001-006',
        numeroSecuencia: 6
      }),
      include: expect.any(Object)
    })
  })

  // ✅ Test para verificar manejo de códigos sin número
  test('should handle pedidos without sequence number in codigo', async () => {
    const requestBody = {
      proyectoId: 'proyecto-1',
      responsableId: 'user-1',
      fechaNecesaria: '2024-12-31T10:00:00.000Z'
    }

    // Mock proyecto exists
    mockPrisma.proyecto.findUnique.mockResolvedValue({
      id: 'proyecto-1',
      codigo: 'PROJ001'
    } as any)

    // Mock existing pedido with malformed codigo
    mockPrisma.pedidoEquipo.findFirst.mockResolvedValue({
      codigo: 'PED-PROJ001-ABC'
    } as any)

    mockPrisma.pedidoEquipo.create.mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/pedidos-equipo', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    await POST(request)

    // ✅ Verificar que se usa numeroSecuencia 1 cuando no se puede parsear
    expect(mockPrisma.pedidoEquipo.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        codigo: 'PED-PROJ001-001',
        numeroSecuencia: 1
      }),
      include: expect.any(Object)
    })
  })

  // ✅ Test para verificar formato de código con padding
  test('should format codigo with proper padding', async () => {
    const requestBody = {
      proyectoId: 'proyecto-1',
      responsableId: 'user-1',
      fechaNecesaria: '2024-12-31T10:00:00.000Z'
    }

    // Mock proyecto exists
    mockPrisma.proyecto.findUnique.mockResolvedValue({
      id: 'proyecto-1',
      codigo: 'PROJ001'
    } as any)

    // Mock existing pedido with sequence 99
    mockPrisma.pedidoEquipo.findFirst.mockResolvedValue({
      codigo: 'PED-PROJ001-099'
    } as any)

    mockPrisma.pedidoEquipo.create.mockResolvedValue({} as any)

    const request = new NextRequest('http://localhost:3000/api/pedidos-equipo', {
      method: 'POST',
      body: JSON.stringify(requestBody),
      headers: {
        'Content-Type': 'application/json'
      }
    })

    await POST(request)

    // ✅ Verificar que el código se formatea con padding correcto
    expect(mockPrisma.pedidoEquipo.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        codigo: 'PED-PROJ001-100',
        numeroSecuencia: 100
      }),
      include: expect.any(Object)
    })
  })
})
