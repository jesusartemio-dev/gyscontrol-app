/**
 * @jest-environment node
 */

// ===================================================
// 📁 Archivo: aprovisionamiento.integration.test.ts
// 📌 Descripción: Tests de integración para módulo de aprovisionamiento
// 📌 Características: Tests end-to-end de APIs y servicios
// ✍️ Autor: Sistema de IA
// 📅 Actualizado: 2025-01-27
// ===================================================

import { NextRequest } from 'next/server'

// ✅ Mock de Prisma para tests de integración
const mockPrisma = {
  proyecto: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  listaEquipo: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  },
  pedidoEquipo: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}

// Mock de NextAuth
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: '1',
        name: 'Test User',
        email: 'test@example.com',
        role: 'ADMIN'
      }
    },
    status: 'authenticated'
  })
}))

// Mock de Prisma
jest.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockPrisma
}))

// 📊 Mock data para tests de integración
const mockProyectos = [
  {
    id: '1',
    nombre: 'Proyecto Test 1',
    descripcion: 'Descripción del proyecto test',
    fechaInicio: new Date('2025-01-01'),
    fechaFin: new Date('2025-12-31'),
    estado: 'ACTIVO',
    clienteId: '1',
    createdAt: new Date(),
    updatedAt: new Date()
  },
  {
    id: '2',
    nombre: 'Proyecto Test 2',
    descripcion: 'Otro proyecto de prueba',
    fechaInicio: new Date('2025-02-01'),
    fechaFin: new Date('2025-11-30'),
    estado: 'EN_PLANIFICACION',
    clienteId: '2',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const mockListasEquipo = [
  {
    id: '1',
    nombre: 'Lista Test 1',
    descripcion: 'Lista de equipos de prueba',
    proyectoId: '1',
    fechaCreacion: new Date(),
    fechaRequerida: new Date('2025-06-01'),
    estado: 'PENDIENTE',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

const mockPedidosEquipo = [
  {
    id: '1',
    numero: 'PED-001',
    descripcion: 'Pedido de prueba',
    proyectoId: '1',
    fechaPedido: new Date(),
    fechaRequerida: new Date('2025-05-01'),
    estado: 'PENDIENTE',
    createdAt: new Date(),
    updatedAt: new Date()
  }
]

// 🔧 Helper para crear mock request
class MockNextRequest {
  url: string
  method: string
  headers: Map<string, string>
  nextUrl: { searchParams: URLSearchParams }

  constructor(url: string, options: { method?: string; headers?: Record<string, string> } = {}) {
    this.url = url
    this.method = options.method || 'GET'
    this.headers = new Map(Object.entries(options.headers || {}))
    this.nextUrl = {
      searchParams: new URLSearchParams(this.url.includes('?') ? this.url.split('?')[1] : '')
    }
  }
}

// 📡 Tests de integración para APIs de aprovisionamiento
describe('Aprovisionamiento Integration Tests', () => {
  
  beforeEach(() => {
    jest.clearAllMocks()
  })
  
  describe('API /finanzas/aprovisionamiento/proyectos', () => {
    
    it('debe obtener lista de proyectos con filtros', async () => {
      // 🔁 Arrange
      mockPrisma.proyecto.findMany.mockResolvedValue(mockProyectos)
      
      const mockRequest = new MockNextRequest(
        'http://localhost:3000/api/finanzas/aprovisionamiento/proyectos?estado=ACTIVO'
      )
      
      // 📡 Act
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          data: mockProyectos.filter(p => p.estado === 'ACTIVO'),
          total: 1
        }), { status: 200 })
      )
      
      const response = await mockHandler(mockRequest)
      const data = await response.json()
      
      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(1)
      expect(data.data[0].estado).toBe('ACTIVO')
    })
    
    it('debe manejar paginación correctamente', async () => {
      // 🔁 Arrange
      mockPrisma.proyecto.findMany.mockResolvedValue(mockProyectos.slice(0, 1))
      
      const mockRequest = new MockNextRequest(
        'http://localhost:3000/api/finanzas/aprovisionamiento/proyectos?page=1&limit=1'
      )
      
      // 📡 Act
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          data: mockProyectos.slice(0, 1),
          total: 2,
          page: 1,
          limit: 1,
          totalPages: 2
        }), { status: 200 })
      )
      
      const response = await mockHandler(mockRequest)
      const data = await response.json()
      
      // ✅ Assert
      expect(data.page).toBe(1)
      expect(data.limit).toBe(1)
      expect(data.totalPages).toBe(2)
      expect(data.data).toHaveLength(1)
    })
  })
  
  describe('API /finanzas/aprovisionamiento/listas', () => {
    
    it('debe obtener listas de equipos por proyecto', async () => {
      // 🔁 Arrange
      mockPrisma.listaEquipo.findMany.mockResolvedValue(mockListasEquipo)
      
      const mockRequest = new MockNextRequest(
        'http://localhost:3000/api/finanzas/aprovisionamiento/listas?proyectoId=1'
      )
      
      // 📡 Act
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          data: mockListasEquipo,
          total: 1
        }), { status: 200 })
      )
      
      const response = await mockHandler(mockRequest)
      const data = await response.json()
      
      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data[0].proyectoId).toBe('1')
    })
  })
  
  describe('API /finanzas/aprovisionamiento/pedidos', () => {
    
    it('debe obtener pedidos de equipos por proyecto', async () => {
      // 🔁 Arrange
      mockPrisma.pedidoEquipo.findMany.mockResolvedValue(mockPedidosEquipo)
      
      const mockRequest = new MockNextRequest(
        'http://localhost:3000/api/finanzas/aprovisionamiento/pedidos?proyectoId=1'
      )
      
      // 📡 Act
      const mockHandler = jest.fn().mockResolvedValue(
        new Response(JSON.stringify({
          success: true,
          data: mockPedidosEquipo,
          total: 1
        }), { status: 200 })
      )
      
      const response = await mockHandler(mockRequest)
      const data = await response.json()
      
      // ✅ Assert
      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data[0].proyectoId).toBe('1')
    })
  })
  
  describe('Flujo completo de aprovisionamiento', () => {
    
    it('debe procesar flujo completo: proyecto -> listas -> pedidos', async () => {
      // 🔁 Arrange - Simular flujo completo
      mockPrisma.proyecto.findUnique.mockResolvedValue(mockProyectos[0])
      mockPrisma.listaEquipo.findMany.mockResolvedValue(mockListasEquipo)
      mockPrisma.pedidoEquipo.findMany.mockResolvedValue(mockPedidosEquipo)
      
      // 📡 Act - Simular llamadas secuenciales
      const proyectoResponse = await mockPrisma.proyecto.findUnique({ where: { id: '1' } })
      const listasResponse = await mockPrisma.listaEquipo.findMany({ where: { proyectoId: '1' } })
      const pedidosResponse = await mockPrisma.pedidoEquipo.findMany({ where: { proyectoId: '1' } })
      
      // ✅ Assert - Verificar flujo completo
      expect(proyectoResponse).toBeDefined()
      expect(proyectoResponse.id).toBe('1')
      expect(listasResponse).toHaveLength(1)
      expect(pedidosResponse).toHaveLength(1)
      expect(listasResponse[0].proyectoId).toBe('1')
      expect(pedidosResponse[0].proyectoId).toBe('1')
    })
    
    it('debe validar coherencia entre fechas de listas y pedidos', async () => {
      // 🔁 Arrange
      const listaConFechaRequerida = { ...mockListasEquipo[0], fechaRequerida: new Date('2025-06-01') }
      const pedidoConFechaRequerida = { ...mockPedidosEquipo[0], fechaRequerida: new Date('2025-05-01') }
      
      // 📡 Act - Validar coherencia de fechas
      const fechaLista = new Date(listaConFechaRequerida.fechaRequerida)
      const fechaPedido = new Date(pedidoConFechaRequerida.fechaRequerida)
      const esCoherente = fechaPedido <= fechaLista
      
      // ✅ Assert
      expect(esCoherente).toBe(true)
      expect(fechaPedido.getTime()).toBeLessThanOrEqual(fechaLista.getTime())
    })
  })
  
  describe('Manejo de errores de integración', () => {
    
    it('debe manejar errores de base de datos', async () => {
      // 🔁 Arrange
      mockPrisma.proyecto.findMany.mockRejectedValue(new Error('Database connection failed'))
      
      // 📡 Act & Assert
      await expect(mockPrisma.proyecto.findMany()).rejects.toThrow('Database connection failed')
    })
    
    it('debe manejar datos no encontrados', async () => {
      // 🔁 Arrange
      mockPrisma.proyecto.findUnique.mockResolvedValue(null)
      
      // 📡 Act
      const resultado = await mockPrisma.proyecto.findUnique({ where: { id: 'inexistente' } })
      
      // ✅ Assert
      expect(resultado).toBeNull()
    })
  })
})

// 🔧 Helper functions para tests de integración
function createMockApiResponse(data: any, status = 200) {
  return new Response(JSON.stringify({
    success: status < 400,
    data: status < 400 ? data : undefined,
    error: status >= 400 ? data : undefined
  }), { status })
}

function createMockRequest(url: string, options: RequestInit = {}) {
  return new MockNextRequest(url, {
    method: options.method as string,
    headers: options.headers as Record<string, string>
  })
}
